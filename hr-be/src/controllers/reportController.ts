import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

export class ReportController {
  // GET /api/v1/reports/overview
  public static async getOverview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalEmployees, presentToday, leaveRequestsCount] =
        await Promise.all([
          prisma.employee.count({
            where: { employmentStatus: "ACTIVE" },
          }),
          (prisma as any).attendanceRecord
            ? (prisma as any).attendanceRecord.count({
                where: {
                  date: { gte: today },
                  status: "PRESENT",
                },
              })
            : Promise.resolve(0),
          prisma.leaveRequest.count(),
        ]);

      res.status(200).json({
        success: true,
        data: {
          totalEmployees,
          presentToday,
          leaveRequestsCount,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/reports/export/headcount
  public static async exportHeadcountCSV(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employees = await prisma.employee.findMany({
        include: {
          department: true,
          designation: true,
        },
        orderBy: { employeeNumber: "asc" },
      });

      const headers =
        "Employee Number,Full Name,Email,Department,Designation,Status,Joining Date\n";
      const rows = employees
        .map((e) => {
          const name = `"${e.firstName} ${e.lastName}"`;
          const dept = `"${e.department?.name || "Unassigned"}"`;
          const desig = `"${e.designation?.title || "General"}"`;
          const date = e.joiningDate
            ? new Date(e.joiningDate).toISOString().split("T")[0]
            : "";
          return `${e.employeeNumber},${name},${e.personalEmail},${dept},${desig},${e.employmentStatus},${date}`;
        })
        .join("\n");

      const csvContent = headers + rows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="workforce_headcount_report.csv"',
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

// Named function exports for direct router compatibility
export const getOverview = ReportController.getOverview;
export const exportHeadcountCSV = ReportController.exportHeadcountCSV;
export default ReportController;
