import { Request, Response } from "express";
import { prisma } from "../config/database";

export class LeaveController {
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

  private static async resolveLeaveAuthenticator(
    leave: any,
  ): Promise<{ name: string; email: string; role: string }> {
    const superAdmin = await prisma.employee.findFirst({
      where: {
        OR: [
          { personalEmail: "admin@smarthr.local" },
          { employeeNumber: "EMP-000" },
        ],
      },
    });

    const superAdminResult = {
      name: superAdmin
        ? `${superAdmin.firstName} ${superAdmin.lastName}`
        : "Super Admin",
      email: superAdmin?.personalEmail || "admin@smarthr.local",
      role: "SUPER_ADMIN",
    };

    const applicant = leave.employees;
    if (!applicant) return superAdminResult;

    if (applicant.isDepartmentManager) {
      return superAdminResult;
    }

    if (applicant.departmentId) {
      const manager = await prisma.employee.findFirst({
        where: {
          departmentId: applicant.departmentId,
          isDepartmentManager: true,
          id: { not: applicant.id },
        },
      });

      if (manager) {
        return {
          name: `${manager.firstName} ${manager.lastName}`,
          email: manager.personalEmail || "",
          role: "MANAGER",
        };
      }
    }

    return superAdminResult;
  }

  /**
   * GET /api/leaves
   */
  public static async getLeaves(req: Request, res: Response): Promise<void> {
    try {
      const { currentUserId, userEmail, rawRole, isSuperAdmin } =
        LeaveController.parseUser(req);

      let leaves: any[] = [];

      if (isSuperAdmin) {
        leaves = await prisma.leaveRequest.findMany({
          include: {
            employees: {
              include: { departments: true },
            },
            leave_types: true,
          },
          orderBy: { createdAt: "desc" },
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
        });

        const isManager =
          rawRole === "MANAGER" ||
          rawRole.includes("MANAGER") ||
          Boolean(currentEmp?.isDepartmentManager);

        if (isManager && currentEmp?.departmentId) {
          leaves = await prisma.leaveRequest.findMany({
            where: {
              employees: {
                departmentId: currentEmp.departmentId,
              },
            },
            include: {
              employees: {
                include: { departments: true },
              },
              leave_types: true,
            },
            orderBy: { createdAt: "desc" },
          });
        } else if (currentEmp) {
          leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: currentEmp.id },
            include: {
              employees: {
                include: { departments: true },
              },
              leave_types: true,
            },
            orderBy: { createdAt: "desc" },
          });
        }
      }

      const formatted = await Promise.all(
        leaves.map(async (l) => {
          const authBy = await LeaveController.resolveLeaveAuthenticator(l);
          return {
            ...l,
            leaveType: l.leave_types?.name || "ANNUAL",
            authenticatedBy: authBy,
          };
        }),
      );

      res.status(200).json({ success: true, data: formatted });
    } catch (error: any) {
      console.error("getLeaves error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/leaves
   */
  public static async applyLeave(req: Request, res: Response): Promise<void> {
    try {
      const { currentUserId, userEmail } = LeaveController.parseUser(req);

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
      });

      if (!currentEmp) {
        res.status(404).json({ success: false, error: "Employee not found" });
        return;
      }

      const { leaveType, startDate, endDate, reason } = req.body;

      let typeRecord = await prisma.leave_types.findFirst({
        where: { name: { equals: leaveType || "ANNUAL", mode: "insensitive" } },
      });

      if (!typeRecord) {
        typeRecord = await prisma.leave_types.create({
          data: {
            id: `lt-${Date.now()}`,
            name: leaveType || "ANNUAL",
            daysAllowed: 20,
          } as any,
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1;

      const newLeave = await prisma.leaveRequest.create({
        data: {
          employeeId: currentEmp.id,
          leaveTypeId: typeRecord.id,
          startDate: start,
          endDate: end,
          daysCount,
          reason: reason || "Personal Leave",
          status: "PENDING",
          updatedAt: new Date(),
        },
      });

      res.status(201).json({ success: true, data: newLeave });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/leaves/:id/status
   */
  public static async updateLeaveStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { currentUserId, userEmail, isSuperAdmin } =
        LeaveController.parseUser(req);
      const { id } = req.params;
      const { status } = req.body;

      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employees: true },
      });

      if (!leave) {
        res
          .status(404)
          .json({ success: false, error: "Leave request not found." });
        return;
      }

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
      });

      if (!isSuperAdmin) {
        if (leave.employeeId === currentEmp?.id) {
          res
            .status(403)
            .json({
              success: false,
              error: "Managers cannot action their own leave requests.",
            });
          return;
        }
        if (leave.employees?.departmentId !== currentEmp?.departmentId) {
          res
            .status(403)
            .json({
              success: false,
              error:
                "You can only action leaves for your departmental subordinates.",
            });
          return;
        }
      }

      const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default LeaveController;
