import { prisma } from "../config/database";
import { logger } from "../config/logger";

export class LeaveRolloverJob {
  /**
   * Rollover leave balances on year-end.
   * If carryForward is true on LeaveType, unused days carry over up to daysAllowed limit.
   */
  public static async executeYearlyRollover(fromYear: number, toYear: number) {
    logger.info(
      `[Cron:LeaveRollover] Processing leave rollover from ${fromYear} to ${toYear}`,
    );

    try {
      const leaveTypes = await prisma.leaveType.findMany();
      const employees = await prisma.employee.findMany({
        where: {
          employmentStatus: { notIn: ["TERMINATED", "RESIGNED"] as any },
        },
        select: { id: true },
      });

      let updatedCount = 0;

      for (const emp of employees) {
        for (const type of leaveTypes) {
          // Retrieve previous year balance
          const previousBalance = await prisma.leaveBalance.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: fromYear,
              },
            },
          });

          let carriedOver = 0;
          if (type.carryForward && previousBalance) {
            const remaining = Math.max(
              0,
              previousBalance.totalDays - previousBalance.usedDays,
            );
            carriedOver = Math.min(remaining, type.daysAllowed);
          }

          const newTotal = type.daysAllowed + carriedOver;

          // Upsert balance for the incoming target year
          await prisma.leaveBalance.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: type.id,
                year: toYear,
              },
            },
            update: {
              totalDays: newTotal,
            },
            create: {
              employeeId: emp.id,
              leaveTypeId: type.id,
              year: toYear,
              totalDays: newTotal,
              usedDays: 0,
            },
          });

          updatedCount++;
        }
      }

      logger.info(
        `[Cron:LeaveRollover] Completed rollover for ${updatedCount} balance records.`,
      );
      return { updatedCount };
    } catch (error) {
      logger.error(
        "[Cron:LeaveRollover] Error during leave rollover execution:",
        error,
      );
      throw error;
    }
  }
}
