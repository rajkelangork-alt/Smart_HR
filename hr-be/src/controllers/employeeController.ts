import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/database";

export class EmployeeController {
  /**
   * Helper: Resolves real dynamic authenticator details (Name, Email, Role)
   */
  private static async resolveLineage(
    emp: any,
  ): Promise<{ name: string; email: string; role: string; label: string }> {
    const isRootAdmin =
      emp.personalEmail === "admin@smarthr.local" ||
      emp.employeeNumber === "EMP-000";

    if (isRootAdmin) {
      return {
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.personalEmail || "admin@smarthr.local",
        role: "SUPER_ADMIN",
        label: `${emp.firstName} ${emp.lastName} (${emp.personalEmail || "admin@smarthr.local"}) - SUPER_ADMIN`,
      };
    }

    // 1. Direct creator relation check
    if (emp.creatorId) {
      const creatorUser = await prisma.user.findUnique({
        where: { id: emp.creatorId },
        include: { employees: true },
      });

      if (creatorUser) {
        const isCreatorSuperAdmin =
          creatorUser.email.toLowerCase() === "admin@smarthr.local";
        const creatorName = creatorUser.employees
          ? `${creatorUser.employees.firstName} ${creatorUser.employees.lastName}`
          : isCreatorSuperAdmin
            ? "Super Admin"
            : "Department Manager";

        const role = isCreatorSuperAdmin ? "SUPER_ADMIN" : "MANAGER";
        return {
          name: creatorName,
          email: creatorUser.email,
          role,
          label: `${creatorName} (${creatorUser.email}) - ${role}`,
        };
      }
    }

    // 2. Department Manager Check
    if (emp.departmentId && !emp.isDepartmentManager) {
      const deptManager = await prisma.employee.findFirst({
        where: {
          departmentId: emp.departmentId,
          isDepartmentManager: true,
          id: { not: emp.id },
        },
      });

      if (deptManager) {
        const mgrEmail = deptManager.personalEmail || "";
        return {
          name: `${deptManager.firstName} ${deptManager.lastName}`,
          email: mgrEmail,
          role: "MANAGER",
          label: `${deptManager.firstName} ${deptManager.lastName} (${mgrEmail}) - MANAGER`,
        };
      }
    }

    // 3. Super Admin fallback
    const superAdminEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { personalEmail: "admin@smarthr.local" },
          { employeeNumber: "EMP-000" },
        ],
      },
    });

    const adminName = superAdminEmp
      ? `${superAdminEmp.firstName} ${superAdminEmp.lastName}`
      : "Super Admin";
    const adminEmail = superAdminEmp?.personalEmail || "admin@smarthr.local";

    return {
      name: adminName,
      email: adminEmail,
      role: "SUPER_ADMIN",
      label: `${adminName} (${adminEmail}) - SUPER_ADMIN`,
    };
  }

  /**
   * Helper: Extracts identity and roles resiliently across all auth tokens
   */
  private static parseUser(req: Request) {
    const authUser = (req as any).user;
    const currentUserId = authUser?.id || authUser?.userId || authUser?.sub;
    const userEmail = (authUser?.email || authUser?.user?.email || "")
      .toLowerCase()
      .trim();
    const rawRole = (
      authUser?.role ||
      authUser?.user?.role ||
      ""
    ).toUpperCase();

    const isSuperAdmin =
      userEmail === "admin@smarthr.local" ||
      rawRole === "SUPER_ADMIN" ||
      rawRole === "ADMIN" ||
      rawRole.includes("ADMIN");

    return { authUser, currentUserId, userEmail, rawRole, isSuperAdmin };
  }

  /**
   * GET /api/employees
   */
  public static async getAllEmployees(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { authUser, currentUserId, userEmail, rawRole, isSuperAdmin } =
        EmployeeController.parseUser(req);

      let employees: any[] = [];

      // If called without auth token (login screen roster) OR called by Super Admin, return all
      if (!authUser || isSuperAdmin) {
        employees = await prisma.employee.findMany({
          include: {
            departments: true,
            designations: true,
          },
          orderBy: { employeeNumber: "asc" },
        });
      } else {
        const currentEmp = await prisma.employee.findFirst({
          where: {
            OR: [
              ...(userEmail
                ? [
                    {
                      personalEmail: {
                        equals: userEmail,
                        mode: "insensitive" as const,
                      },
                    },
                  ]
                : []),
              ...(currentUserId ? [{ userId: currentUserId }] : []),
            ],
          },
          include: { departments: true, designations: true },
        });

        const isManager =
          rawRole === "MANAGER" ||
          rawRole.includes("MANAGER") ||
          Boolean(currentEmp?.isDepartmentManager);

        if (isManager && currentEmp?.departmentId) {
          employees = await prisma.employee.findMany({
            where: {
              departmentId: currentEmp.departmentId,
              personalEmail: { not: "admin@smarthr.local" },
              employeeNumber: { not: "EMP-000" },
            },
            include: {
              departments: true,
              designations: true,
            },
            orderBy: { employeeNumber: "asc" },
          });
        } else if (currentEmp) {
          employees = [currentEmp];
        }
      }

      const formatted = await Promise.all(
        employees.map(async (emp) => {
          const authDetails = await EmployeeController.resolveLineage(emp);
          return {
            ...emp,
            authenticatedBy: authDetails,
            createdByLabel: authDetails.label,
          };
        }),
      );

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error: any) {
      console.error("getAllEmployees error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch employees",
      });
    }
  }

  // Alias for backward compatibility with routes
  public static getEmployees = EmployeeController.getAllEmployees;

  /**
   * GET /api/employees/:id
   */
  public static async getEmployeeById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          departments: true,
          designations: true,
        },
      });

      if (!employee) {
        res.status(404).json({ success: false, error: "Employee not found" });
        return;
      }

      const authDetails = await EmployeeController.resolveLineage(employee);

      res.status(200).json({
        success: true,
        data: {
          ...employee,
          authenticatedBy: authDetails,
          createdByLabel: authDetails.label,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve employee",
      });
    }
  }

  /**
   * POST /api/employees
   */
  public static async createEmployee(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { currentUserId, userEmail, isSuperAdmin } =
        EmployeeController.parseUser(req);

      const {
        firstName,
        lastName,
        departmentName,
        departmentId,
        designationTitle,
        designationId,
        isDepartmentManager,
      } = req.body;

      if (!firstName || !lastName) {
        res
          .status(400)
          .json({
            success: false,
            error: "First name and last name are required.",
          });
        return;
      }

      // Rule: Strict 11-account ceiling
      const totalUserCount = await prisma.user.count();
      if (totalUserCount >= 11) {
        res.status(400).json({
          success: false,
          error:
            "Organization limit reached. SmartHR is restricted to a maximum of 11 accounts only.",
        });
        return;
      }

      const creatorEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            ...(userEmail
              ? [
                  {
                    personalEmail: {
                      equals: userEmail,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            ...(currentUserId ? [{ userId: currentUserId }] : []),
          ],
        },
        include: { departments: true },
      });

      let effectiveDeptName = departmentName;
      let effectiveDeptId = departmentId;
      let effectiveIsManager = isSuperAdmin
        ? Boolean(isDepartmentManager)
        : false;

      if (!isSuperAdmin) {
        if (!creatorEmployee || !creatorEmployee.departmentId) {
          res.status(403).json({
            success: false,
            error:
              "You do not have department authority to provision personnel.",
          });
          return;
        }
        effectiveDeptId = creatorEmployee.departmentId;
        effectiveDeptName = creatorEmployee.departments?.name;
      }

      let finalDeptId = effectiveDeptId;
      let deptKeyword = "";

      if (finalDeptId) {
        const existingDept = await prisma.department.findUnique({
          where: { id: finalDeptId },
        });
        if (existingDept) {
          deptKeyword = (existingDept.code || existingDept.name).toLowerCase();
        }
      } else if (effectiveDeptName) {
        const cleanName = effectiveDeptName.trim();
        const candidateCode = cleanName.slice(0, 4).toUpperCase();

        let foundDept = await prisma.department.findFirst({
          where: {
            OR: [
              { name: { equals: cleanName, mode: "insensitive" } },
              { name: { contains: cleanName, mode: "insensitive" } },
              { code: { equals: cleanName, mode: "insensitive" } },
              { code: { equals: candidateCode, mode: "insensitive" } },
            ],
          },
        });

        if (!foundDept) {
          const codeExists = await prisma.department.findFirst({
            where: { code: candidateCode },
          });

          const finalCode = codeExists
            ? `${candidateCode.slice(0, 2)}${Math.floor(10 + Math.random() * 90)}`
            : candidateCode;

          foundDept = await prisma.department.create({
            data: {
              name: cleanName,
              code: finalCode,
              updatedAt: new Date(),
            },
          });
        }

        finalDeptId = foundDept.id;
        deptKeyword = (foundDept.code || foundDept.name).toLowerCase();
      }

      if (!deptKeyword) {
        deptKeyword = "operations";
      }

      let resolvedDesignation = designationTitle
        ? designationTitle.trim()
        : "Specialist";
      if (
        !effectiveIsManager &&
        resolvedDesignation.toLowerCase().includes("lead")
      ) {
        resolvedDesignation = resolvedDesignation.replace(
          /lead/i,
          "Specialist",
        );
      }

      let finalDesigId = designationId;
      if (!finalDesigId && resolvedDesignation) {
        const cleanTitle = resolvedDesignation.trim();
        const candidateDesigCode = cleanTitle.slice(0, 4).toUpperCase();

        let foundDesig = await prisma.designation.findFirst({
          where: {
            OR: [
              { title: { equals: cleanTitle, mode: "insensitive" } },
              { title: { contains: cleanTitle, mode: "insensitive" } },
              { code: { equals: cleanTitle, mode: "insensitive" } },
              { code: { equals: candidateDesigCode, mode: "insensitive" } },
            ],
          },
        });

        if (!foundDesig) {
          const codeExists = await prisma.designation.findFirst({
            where: { code: candidateDesigCode },
          });

          const finalDesigCode = codeExists
            ? `${candidateDesigCode.slice(0, 2)}${Math.floor(10 + Math.random() * 90)}`
            : candidateDesigCode;

          foundDesig = await prisma.designation.create({
            data: {
              title: cleanTitle,
              code: finalDesigCode,
              updatedAt: new Date(),
            },
          });
        }

        finalDesigId = foundDesig.id;
      }

      const cleanFirst = firstName.trim().toLowerCase().replace(/\s+/g, "");
      const email =
        req.body.email || `${cleanFirst}_${deptKeyword}@smarthr.local`;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: `An account with email ${email} already exists.`,
        });
        return;
      }

      const defaultPasswordHash = await bcrypt.hash(`${cleanFirst}@12345`, 10);
      const count = await prisma.employee.count();
      const employeeNumber = `EMP-${String(count + 1).padStart(3, "0")}`;

      let creatorUserId: string | null = null;
      if (currentUserId) {
        const dbCreator = await prisma.user.findUnique({
          where: { id: currentUserId },
        });
        if (dbCreator) creatorUserId = dbCreator.id;
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPasswordHash,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      const roleName = effectiveIsManager ? "MANAGER" : "EMPLOYEE";
      try {
        const roleRecord = await prisma.role.findFirst({
          where: { name: roleName as any },
        });

        if (roleRecord) {
          await prisma.userRole.create({
            data: { userId: newUser.id, roleId: roleRecord.id },
          });
        }
      } catch {
        // Fallback silently
      }

      const newEmployee = await prisma.employee.create({
        data: {
          userId: newUser.id,
          employeeNumber,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          personalEmail: email,
          phone: "+1 555-0100",
          joiningDate: new Date(),
          departmentId: finalDeptId,
          designationId: finalDesigId,
          isDepartmentManager: effectiveIsManager,
          creatorId: creatorUserId,
          updatedAt: new Date(),
        },
        include: {
          departments: true,
          designations: true,
        },
      });

      const authDetails = await EmployeeController.resolveLineage(newEmployee);

      res.status(201).json({
        success: true,
        data: {
          ...newEmployee,
          authenticatedBy: authDetails,
          createdByLabel: authDetails.label,
        },
      });
    } catch (error: any) {
      console.error("createEmployee error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create employee",
      });
    }
  }

  /**
   * DELETE /api/employees/:id
   */
  public static async deleteEmployee(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { userEmail, isSuperAdmin } = EmployeeController.parseUser(req);
      const { id } = req.params;

      if (!isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: "Forbidden: Only Super Administrator can delete accounts.",
        });
        return;
      }

      const targetEmp = await prisma.employee.findUnique({ where: { id } });

      if (!targetEmp) {
        res.status(404).json({ success: false, error: "Employee not found." });
        return;
      }

      if (
        targetEmp.employeeNumber === "EMP-000" ||
        targetEmp.personalEmail === "admin@smarthr.local"
      ) {
        res.status(400).json({
          success: false,
          error:
            "The root Super Administrator account is permanent and cannot be deleted.",
        });
        return;
      }

      if (targetEmp.userId) {
        await prisma.user.delete({ where: { id: targetEmp.userId } });
      } else {
        await prisma.employee.delete({ where: { id: targetEmp.id } });
      }

      res.status(200).json({
        success: true,
        message: `Employee ${targetEmp.firstName} ${targetEmp.lastName} deleted successfully.`,
      });
    } catch (error: any) {
      console.error("deleteEmployee error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete employee",
      });
    }
  }
}

export default EmployeeController;
