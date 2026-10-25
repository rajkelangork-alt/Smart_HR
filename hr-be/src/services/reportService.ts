import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database";

export class ReportService {
  // 1. Executive Overview Stats
  public static async getExecutiveOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      pendingLeaves,
      todayAttendanceCount,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({
        where: {
          employmentStatus: { notIn: ["TERMINATED", "RESIGNED"] as any },
        },
      }),
      prisma.department.count(),
      prisma.leaveRequest.count({
        where: { status: "PENDING" as any },
      }),
      prisma.attendanceRecord.count({
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: AttendanceStatus.PRESENT,
        },
      }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      totalDepartments,
      pendingLeaves,
      todayPresent: todayAttendanceCount,
    };
  }

  // 2. Headcount Distribution by Department
  public static async getDepartmentHeadcount() {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return departments.map((dept) => ({
      departmentId: dept.id,
      name: dept.name,
      code: dept.code,
      headcount: dept._count.employees,
    }));
  }

  // 3. Monthly Payroll Expenditure Trends
  public static async getPayrollAnalytics(year: number) {
    const payrollRuns = await prisma.payrollRun.findMany({
      where: { year },
      orderBy: { month: "asc" },
      select: {
        id: true,
        month: true,
        year: true,
        totalGross: true,
        totalNet: true,
        totalDeductions: true,
        status: true,
        _count: {
          select: { payslips: true },
        },
      },
    });

    return payrollRuns.map((run) => ({
      id: run.id,
      month: run.month,
      year: run.year,
      totalGross: Number(run.totalGross),
      totalNet: Number(run.totalNet),
      totalDeductions: Number(run.totalDeductions),
      payslipCount: run._count.payslips,
      status: run.status,
    }));
  }

  // 4. Leave Utilization Analytics
  public static async getLeaveAnalytics() {
    const [leaveTypeStats, leaveStatusBreakdown] = await Promise.all([
      prisma.leaveBalance.groupBy({
        by: ["leaveTypeId"],
        _sum: {
          totalDays: true,
          usedDays: true,
        },
      }),
      prisma.leaveRequest.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      }),
    ]);

    const leaveTypes = await prisma.leaveType.findMany({
      select: { id: true, name: true, daysAllowed: true },
    });
    const typeMap = new Map(
      leaveTypes.map((t) => [
        t.id,
        { name: t.name, daysAllowed: t.daysAllowed },
      ]),
    );

    const utilizationByType = leaveTypeStats.map((stat) => {
      const typeInfo = typeMap.get(stat.leaveTypeId);
      const totalAllocated = stat._sum.totalDays || 0;
      const totalUsed = stat._sum.usedDays || 0;
      const utilizationRate =
        totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

      return {
        leaveTypeId: stat.leaveTypeId,
        name: typeInfo?.name || "Unknown",
        daysAllowed: typeInfo?.daysAllowed || 0,
        totalAllocated,
        totalUsed,
        utilizationRate,
      };
    });

    return {
      utilizationByType,
      requestsByStatus: leaveStatusBreakdown.map((b) => ({
        status: b.status,
        count: b._count.id,
      })),
    };
  }
}
