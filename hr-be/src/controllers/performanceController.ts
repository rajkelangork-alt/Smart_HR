import { Request, Response, NextFunction } from "express";
import { PrismaClient, ReviewCycle } from "@prisma/client";

const prisma = new PrismaClient();

export class PerformanceController {
  public static async getReviews(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authUser = (req as any).user;
      const cleanEmail = (authUser?.email || "").toLowerCase();
      const roles: string[] = (authUser?.roles || []).map((r: any) =>
        String(r?.role?.name || r?.name || r || "").toUpperCase(),
      );

      const isSuperAdmin =
        cleanEmail === "admin@smarthr.local" ||
        roles.includes("SUPER_ADMIN") ||
        roles.includes("ADMIN");

      const requesterEmp = await prisma.employee.findUnique({
        where: { userId: authUser.userId },
        include: { departments: true },
      });
      const isManager = Boolean(
        requesterEmp?.isDepartmentManager || roles.includes("MANAGER"),
      );

      // Matches exact relation names from introspected schema
      const reviews = await prisma.performanceReview.findMany({
        include: {
          employees_performance_reviews_revieweeIdToemployees: {
            include: { users: true, departments: true, designations: true },
          },
          employees_performance_reviews_reviewerIdToemployees: {
            include: { users: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const normalized = reviews.map((r) => ({
        id: r.id,
        revieweeId: r.revieweeId,
        reviewerId: r.reviewerId,
        rating: r.rating,
        feedback: r.feedback,
        year: r.year,
        cycle: r.cycle,
        createdAt: r.createdAt,
        employee: r.employees_performance_reviews_revieweeIdToemployees,
        reviewer: r.employees_performance_reviews_reviewerIdToemployees,
      }));

      let scoped = normalized;
      if (isSuperAdmin) {
        // Super Admin views all
      } else if (isManager) {
        scoped = normalized.filter((r) => {
          const isReviewer = r.reviewerId === requesterEmp?.id;
          const isSubordinate = r.employee?.creatorId === authUser.userId;
          return isReviewer || isSubordinate;
        });
      } else {
        scoped = normalized.filter(
          (r) => r.employee?.userId === authUser.userId,
        );
      }

      res.status(200).json({ success: true, data: scoped });
    } catch (error) {
      next(error);
    }
  }

  public static async createReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authUser = (req as any).user;
      const { employeeId, revieweeId, rating, feedback, cycle } = req.body;
      const targetRevieweeId = revieweeId || employeeId;

      const reviewerEmp = await prisma.employee.findUnique({
        where: { userId: authUser.userId },
      });

      if (!reviewerEmp) {
        res
          .status(404)
          .json({ success: false, error: "Reviewer profile not found" });
        return;
      }

      if (targetRevieweeId === reviewerEmp.id) {
        res
          .status(400)
          .json({
            success: false,
            error: "Self-appraisal is strictly forbidden.",
          });
        return;
      }

      const review = await prisma.performanceReview.create({
        data: {
          revieweeId: targetRevieweeId,
          reviewerId: reviewerEmp.id,
          rating: rating ? parseFloat(String(rating)) : null,
          feedback: feedback || "",
          cycle: (cycle as ReviewCycle) || ReviewCycle.ANNUAL,
          year: new Date().getFullYear(),
        },
        include: {
          employees_performance_reviews_revieweeIdToemployees: {
            include: { users: true, departments: true, designations: true },
          },
          employees_performance_reviews_reviewerIdToemployees: {
            include: { users: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: review.id,
          rating: review.rating,
          feedback: review.feedback,
          year: review.year,
          cycle: review.cycle,
          employee: review.employees_performance_reviews_revieweeIdToemployees,
          reviewer: review.employees_performance_reviews_reviewerIdToemployees,
        },
      });
    } catch (error: any) {
      console.error("Create review error:", error);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to submit appraisal",
        });
    }
  }
}

export const getReviews = PerformanceController.getReviews;
export const createReview = PerformanceController.createReview;
export default PerformanceController;
