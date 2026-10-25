import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

export interface UserScope {
  userId: string;
  email: string;
  employeeId?: string;
  departmentId?: string;
  departmentCode?: string;
  isSuperAdmin: boolean;
  isDepartmentManager: boolean;
  canAdminister: boolean;
  roleBadge: "SUPER_ADMIN" | "MANAGER_ADMIN" | "MANAGER" | "EMPLOYEE";
}

declare global {
  namespace Express {
    interface Request {
      scope?: UserScope;
    }
  }
}

export const resolveUserScope = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawUser = (req as any).user;
    if (!rawUser) {
      return next();
    }

    const userId = rawUser.id || rawUser.userId || "";
    const email = (rawUser.email || "").toLowerCase().trim();
    const isSuperAdmin = email === "admin@smarthr.local";

    // Locate matching employee
    let employee = null;
    if (userId) {
      employee = await prisma.employee.findFirst({
        where: { userId },
        include: { department: true, designation: true },
      });
    }

    if (!employee && email) {
      employee = await prisma.employee.findFirst({
        where: { personalEmail: email },
        include: { department: true, designation: true },
      });

      // Self-heal: Link userId if missing
      if (employee && userId && !employee.userId) {
        await prisma.employee
          .update({
            where: { id: employee.id },
            data: { userId },
          })
          .catch(() => null);
      }
    }

    const isDepartmentManager = Boolean(employee?.isDepartmentManager);
    const canAdminister = Boolean(employee?.canAdminister) || isSuperAdmin;

    let roleBadge: "SUPER_ADMIN" | "MANAGER_ADMIN" | "MANAGER" | "EMPLOYEE" =
      "EMPLOYEE";
    if (isSuperAdmin) {
      roleBadge = "SUPER_ADMIN";
    } else if (isDepartmentManager && canAdminister) {
      roleBadge = "MANAGER_ADMIN";
    } else if (isDepartmentManager) {
      roleBadge = "MANAGER";
    }

    req.scope = {
      userId,
      email,
      employeeId: employee?.id,
      departmentId: employee?.departmentId || undefined,
      departmentCode: employee?.department?.code || undefined,
      isSuperAdmin,
      isDepartmentManager,
      canAdminister,
      roleBadge,
    };

    next();
  } catch (err) {
    console.error("ScopeGuard Error (Non-blocking):", err);
    next();
  }
};

export default resolveUserScope;
