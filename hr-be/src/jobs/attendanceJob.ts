import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export class AttendanceJob {
  /**
   * Scans active employees without a punch-in for the day and records them as ABSENT,
   * unless they have an approved leave spanning the current date.
   */
  public static async markDailyAbsentees(targetDate: Date = new Date()) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    logger.info(
      `[Cron:Attendance] Running daily absentee scan for ${startOfDay.toISOString().slice(0, 10)}`,
    );

    try {
      const activeEmployees = await prisma.employee.findMany({
        where: {
          employmentStatus: { notIn: ["TERMINATED", "RESIGNED"] as any },
        },
        select: { id: true },
      });

      const [existingRecords, approvedLeaves] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
          select: { employeeId: true },
        }),
        prisma.leaveRequest.findMany({
          where: {
            status: "APPROVED" as any,
            startDate: { lte: endOfDay },
            endDate: { gte: startOfDay },
          },
          select: { employeeId: true },
        }),
      ]);

      const recordedEmployeeIds = new Set(
        existingRecords.map((r) => r.employeeId),
      );
      const onLeaveEmployeeIds = new Set(
        approvedLeaves.map((l) => l.employeeId),
      );

      const unrecordedEmployees = activeEmployees.filter(
        (emp) =>
          !recordedEmployeeIds.has(emp.id) && !onLeaveEmployeeIds.has(emp.id),
      );

      if (unrecordedEmployees.length === 0) {
        logger.info("[Cron:Attendance] No unrecorded active employees found.");
        return { markedAbsent: 0 };
      }

      const absenteeData = unrecordedEmployees.map((emp) => ({
        employeeId: emp.id,
        date: startOfDay,
        status: AttendanceStatus.ABSENT,
        notes: "System auto-marked absent at end of day",
      }));

      const result = await prisma.attendanceRecord.createMany({
        data: absenteeData,
        skipDuplicates: true,
      });

      logger.info(
        `[Cron:Attendance] Marked ${result.count} employees as ABSENT.`,
      );
      return { markedAbsent: result.count };
    } catch (error) {
      logger.error("[Cron:Attendance] Error marking daily absentees:", error);
      throw error;
    }
  }
}
