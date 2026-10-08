import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export class AttendanceService {
  // Normalize date to UTC midnight for unique constraint (employeeId + date)
  private static getMidnightDate(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  // Calculate working hours difference in decimal hours
  private static calculateHours(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
  }

  // 1. Clock In
  public static async clockIn(
    employeeId: string,
    isWorkFromHome: boolean = false,
    notes?: string,
  ) {
    const today = this.getMidnightDate();
    const now = new Date();

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing && existing.checkIn) {
      throw new AppError(
        "Employee has already clocked in for today",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    // Default shift start is 09:00 with 15-minute grace period
    const isLate =
      now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const status = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    return prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status,
        isWorkFromHome,
        notes,
      },
      create: {
        employeeId,
        date: today,
        checkIn: now,
        status,
        isWorkFromHome,
        notes,
      },
    });
  }

  // 2. Clock Out & Compute Hours
  public static async clockOut(employeeId: string) {
    const today = this.getMidnightDate();
    const now = new Date();

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (!record || !record.checkIn) {
      throw new AppError(
        "No check-in record found for today. Cannot clock out.",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    if (record.checkOut) {
      throw new AppError(
        "Employee has already clocked out for today",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const workingHours = this.calculateHours(record.checkIn, now);
    const overtimeHours = Math.max(
      0,
      Math.round((workingHours - 8) * 100) / 100,
    );

    return prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        workingHours,
        overtimeHours,
      },
    });
  }

  // 3. Month-wise Attendance Calendar View for Employee
  public static async getMonthlyAttendance(
    employeeId: string,
    year: number,
    month: number,
  ) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const records = await prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    const summary = records.reduce(
      (acc, r) => {
        acc.totalHours += r.workingHours;
        acc.totalOvertime += r.overtimeHours;
        if (r.status === AttendanceStatus.PRESENT) acc.presentDays++;
        if (r.status === AttendanceStatus.LATE) acc.lateDays++;
        if (r.status === AttendanceStatus.ABSENT) acc.absentDays++;
        return acc;
      },
      {
        totalHours: 0,
        totalOvertime: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
      },
    );

    return { records, summary };
  }

  // 4. Department Attendance Daily Summary
  public static async getDailyDepartmentSummary(
    departmentId: string,
    targetDate: Date = new Date(),
  ) {
    const date = this.getMidnightDate(targetDate);

    const employees = await prisma.employee.findMany({
      where: { departmentId },
      include: {
        attendanceRecords: {
          where: { date },
        },
      },
    });

    return employees.map((emp) => ({
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      name: `${emp.firstName} ${emp.lastName}`,
      attendance: emp.attendanceRecords[0] || {
        status: AttendanceStatus.ABSENT,
        date,
      },
    }));
  }
}
