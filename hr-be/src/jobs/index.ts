import cron from "node-cron";
import { AttendanceJob } from "./attendanceJob";
import { LeaveRolloverJob } from "./leaveRolloverJob";
import { logger } from "../config/logger";

export const initializeCronJobs = (): void => {
  logger.info("Initializing background automated cron jobs...");

  // 1. Daily at 23:55 PM: Mark absentees for the current day
  cron.schedule("55 23 * * 1-5", async () => {
    logger.info("Triggering scheduled absentee auto-mark job...");
    await AttendanceJob.markDailyAbsentees();
  });

  // 2. Midnight on January 1st: Yearly leave allocation and rollover
  cron.schedule("0 0 1 1 *", async () => {
    logger.info("Triggering scheduled yearly leave rollover job...");
    const now = new Date();
    await LeaveRolloverJob.executeYearlyRollover(
      now.getFullYear() - 1,
      now.getFullYear(),
    );
  });

  logger.info(
    "Cron jobs scheduled successfully: [Daily Absentee at 23:55, Yearly Leave Rollover on Jan 1]",
  );
};
