import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { OnboardingService } from "../services/onboardingService";
import { AppError, ErrorCode } from "../utils/errorCodes";

const createTaskSchema = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
});

const assignTasksSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
  taskIds: z
    .array(z.string().uuid("Invalid task ID"))
    .min(1, "At least one task must be selected"),
});

const updateStatusSchema = z.object({
  isCompleted: z.boolean(),
});

export class OnboardingController {
  // GET /api/v1/onboarding/tasks
  public static async getAllTasks(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const tasks = await OnboardingService.getAllTasks();
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/onboarding/tasks
  public static async createTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = createTaskSchema.parse(req.body);
      const task = await OnboardingService.createTask(payload);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/onboarding/assign
  public static async assignTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = assignTasksSchema.parse(req.body);
      const result = await OnboardingService.assignTasks(payload);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/onboarding/my-tasks
  public static async getMyTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        throw new AppError(
          "No employee profile associated with this account",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const progress =
        await OnboardingService.getEmployeeAssignments(employeeId);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/onboarding/employee/:employeeId
  public static async getEmployeeTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const progress = await OnboardingService.getEmployeeAssignments(
        req.params.employeeId,
      );
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/onboarding/assignments/:id
  public static async updateAssignmentStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isCompleted } = updateStatusSchema.parse(req.body);
      const updated = await OnboardingService.updateTaskStatus(
        req.params.id,
        isCompleted,
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
