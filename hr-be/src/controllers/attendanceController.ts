import { Request, Response } from "express";
import { prisma } from "../config/database";

export class AttendanceController {
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

  private static async resolveAttendanceAuthenticator(
    emp: any,
  ): Promise<{ name: string; email: string; role: string }> {
    const isRootAdmin =
      emp.personalEmail === "admin@smarthr.local" ||
      emp.employeeNumber === "EMP-000";

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

    if (isRootAdmin || emp.isDepartmentManager) {
      return superAdminResult;
    }

    if (emp.departmentId) {
      const manager = await prisma.employee.findFirst({
        where: {
          departmentId: emp.departmentId,
          isDepartmentManager: true,
          id: { not: emp.id },
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

  private static getTodayBounds() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }

  /**
   * GET /api/attendance/workforce-roster or /api/attendance/
   */
  public static async getWorkforceRoster(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { currentUserId, userEmail, rawRole, isSuperAdmin } =
        AttendanceController.parseUser(req);

      let employees: any[] = [];

      if (isSuperAdmin) {
        employees = await prisma.employee.findMany({
          include: { departments: true },
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
              ...(currentUserId ? [{ id: currentUserId }] : []),
            ],
          },
          include: { departments: true },
        });

        const isManager =
          rawRole === "MANAGER" ||
          rawRole.includes("MANAGER") ||
          Boolean(currentEmp?.isDepartmentManager);

        if (isManager && currentEmp?.departmentId) {
          employees = await prisma.employee.findMany({
            where: {
              departmentId: currentEmp.departmentId,
            },
            include: { departments: true },
            orderBy: { employeeNumber: "asc" },
          });
        } else if (currentEmp) {
          employees = [currentEmp];
        }
      }

      const { startOfDay, endOfDay } = AttendanceController.getTodayBounds();

      const rosterData = await Promise.all(
        employees.map(async (emp) => {
          const todayAttendance = await prisma.attendanceRecord.findFirst({
            where: {
              employeeId: emp.id,
              OR: [
                { checkIn: { gte: startOfDay, lte: endOfDay } },
                { createdAt: { gte: startOfDay, lte: endOfDay } },
              ],
            },
            orderBy: { createdAt: "desc" },
          });

          const authBy =
            await AttendanceController.resolveAttendanceAuthenticator(emp);

          let shiftStatus = "NOT MARKED";
          let clockInStr = "--";
          let clockOutStr = "--";

          if (todayAttendance) {
            if (todayAttendance.checkIn) {
              clockInStr = new Date(todayAttendance.checkIn).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );
              shiftStatus = "PRESENT";
            }
            if (todayAttendance.checkOut) {
              clockOutStr = new Date(
                todayAttendance.checkOut,
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              shiftStatus = "COMPLETED";
            }
          }

          return {
            id: emp.id,
            employeeNumber: emp.employeeNumber,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.personalEmail || "",
            department: emp.departments?.name || "Operations",
            isDepartmentManager: emp.isDepartmentManager,
            clockIn: clockInStr,
            clockOut: clockOutStr,
            shiftStatus,
            authenticatedBy: authBy,
          };
        }),
      );

      res.status(200).json({
        success: true,
        data: rosterData,
      });
    } catch (error: any) {
      console.error("getWorkforceRoster error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch workforce roster",
      });
    }
  }

  /**
   * GET /api/attendance/stats or /api/attendance/my-stats
   */
  public static async getMyAttendanceStats(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { startOfDay, endOfDay } = AttendanceController.getTodayBounds();

      const presentCount = await prisma.attendanceRecord.count({
        where: {
          OR: [
            { checkIn: { gte: startOfDay, lte: endOfDay } },
            { createdAt: { gte: startOfDay, lte: endOfDay } },
          ],
          checkIn: { not: null },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          presentToday: presentCount,
          workingDays: 22,
          lateArrivals: 0,
        },
      });
    } catch (error: any) {
      console.error("getMyAttendanceStats error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/attendance/punch-in or /clock-in
   */
  public static async punchIn(req: Request, res: Response): Promise<void> {
    try {
      const { currentUserId, userEmail } = AttendanceController.parseUser(req);

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
            ...(currentUserId ? [{ id: currentUserId }] : []),
          ],
        },
      });

      if (!currentEmp) {
        res
          .status(404)
          .json({ success: false, error: "Employee record not found." });
        return;
      }

      const { startOfDay, endOfDay } = AttendanceController.getTodayBounds();

      let record = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: currentEmp.id,
          OR: [
            { checkIn: { gte: startOfDay, lte: endOfDay } },
            { createdAt: { gte: startOfDay, lte: endOfDay } },
          ],
        },
      });

      if (record && record.checkIn) {
        res
          .status(400)
          .json({ success: false, error: "Already clocked in for today." });
        return;
      }

      const now = new Date();
      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);

      if (!record) {
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: currentEmp.id,
            date: todayDate,
            checkIn: now,
            status: "PRESENT",
            updatedAt: now,
          },
        });
      } else {
        record = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkIn: now,
            status: "PRESENT",
            updatedAt: now,
          },
        });
      }

      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      console.error("punchIn error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/attendance/punch-out or /clock-out
   */
  public static async punchOut(req: Request, res: Response): Promise<void> {
    try {
      const { currentUserId, userEmail } = AttendanceController.parseUser(req);

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
            ...(currentUserId ? [{ id: currentUserId }] : []),
          ],
        },
      });

      if (!currentEmp) {
        res
          .status(404)
          .json({ success: false, error: "Employee record not found." });
        return;
      }

      const { startOfDay, endOfDay } = AttendanceController.getTodayBounds();

      const record = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: currentEmp.id,
          OR: [
            { checkIn: { gte: startOfDay, lte: endOfDay } },
            { createdAt: { gte: startOfDay, lte: endOfDay } },
          ],
        },
      });

      if (!record || !record.checkIn) {
        res
          .status(400)
          .json({
            success: false,
            error: "You have not clocked in today yet.",
          });
        return;
      }

      if (record.checkOut) {
        res
          .status(400)
          .json({ success: false, error: "Already clocked out for today." });
        return;
      }

      const now = new Date();
      const checkInTime = new Date(record.checkIn).getTime();
      const checkOutTime = now.getTime();
      const workingHours = parseFloat(
        ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2),
      );

      const updated = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOut: now,
          workingHours,
          updatedAt: now,
        },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("punchOut error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// -------------------------------------------------------------
// Direct exports matching all variants required by attendance.ts
// -------------------------------------------------------------
export const getWorkforceRoster = AttendanceController.getWorkforceRoster;
export const getAllAttendance = AttendanceController.getWorkforceRoster;

export const getMyAttendanceStats = AttendanceController.getMyAttendanceStats;
export const getAttendanceStats = AttendanceController.getMyAttendanceStats;
export const getStats = AttendanceController.getMyAttendanceStats;

export const punchIn = AttendanceController.punchIn;
export const clockIn = AttendanceController.punchIn;

export const punchOut = AttendanceController.punchOut;
export const clockOut = AttendanceController.punchOut;

export default {
  getWorkforceRoster,
  getAllAttendance,
  getMyAttendanceStats,
  getAttendanceStats,
  getStats,
  punchIn,
  clockIn,
  punchOut,
  clockOut,
};
