import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

export class AnalyticsController {
  // GET /api/v1/analytics/dashboard
  public static async getDashboardMetrics(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const scope = (req as any).scope;

      // 1. Scoped employee filter
      let empWhere: any = { employmentStatus: "ACTIVE" };

      if (!scope?.isSuperAdmin) {
        if (scope?.departmentId) {
          empWhere = {
            ...empWhere,
            departmentId: scope.departmentId,
            NOT: { personalEmail: "admin@smarthr.local" },
          };
        } else {
          empWhere = {
            ...empWhere,
            id: scope?.employeeId || "none",
          };
        }
      }

      // Count scoped employees
      const totalEmployees = await prisma.employee.count({
        where: empWhere,
      });

      // 2. Count checked-in employees for today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const presentToday = await prisma.attendanceRecord.count({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { in: ["PRESENT", "HALF_DAY"] },
          employee: empWhere,
        },
      });

      // 3. Count employees currently on leave
      const today = new Date();
      const onLeaveCount = await (prisma as any).leaveRequest.count({
        where: {
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
          employee: empWhere,
        },
      });

      // 4. Department breakdown scoped
      const departments = await prisma.department.findMany({
        where: scope?.isSuperAdmin ? {} : { id: scope?.departmentId || "none" },
        include: {
          employees: {
            where: { employmentStatus: "ACTIVE" },
          },
        },
      });

      let departmentBreakdown = departments.map((d) => ({
        name: d.name,
        count: d.employees.length,
        percentage:
          totalEmployees > 0
            ? Math.round((d.employees.length / totalEmployees) * 100)
            : 0,
      }));

      if (departmentBreakdown.length === 0) {
        departmentBreakdown = [
          {
            name: scope?.departmentCode || "Operations",
            count: totalEmployees,
            percentage: 100,
          },
        ];
      }

      res.status(200).json({
        success: true,
        data: {
          totalEmployees,
          presentToday,
          onLeave: onLeaveCount,
          payrollStatus: "Ready",
          departmentBreakdown,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/analytics/headcount
  public static async getHeadcountAnalytics(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: departments.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          count: d._count.employees,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const getDashboardMetrics = AnalyticsController.getDashboardMetrics;
export const getHeadcountAnalytics = AnalyticsController.getHeadcountAnalytics;
export default AnalyticsController;
