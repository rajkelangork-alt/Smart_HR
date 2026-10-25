import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface CreateTaskDTO {
  title: string;
  description?: string;
}

export interface AssignTasksDTO {
  employeeId: string;
  taskIds: string[];
}

export class OnboardingService {
  // 1. Task Catalog Management
  public static async createTask(dto: CreateTaskDTO) {
    return prisma.onboardingTask.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  public static async getAllTasks() {
    return prisma.onboardingTask.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  // 2. Assign Tasks to an Employee
  public static async assignTasks(dto: AssignTasksDTO) {
    const employee = await prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new AppError("Employee record not found", 404, ErrorCode.NOT_FOUND);
    }

    const data = dto.taskIds.map((taskId) => ({
      employeeId: dto.employeeId,
      taskId,
    }));

    await prisma.onboardingTaskAssignment.createMany({
      data,
      skipDuplicates: true,
    });

    return this.getEmployeeAssignments(dto.employeeId);
  }

  // 3. Get Employee's Checklist and Progress
  public static async getEmployeeAssignments(employeeId: string) {
    const assignments = await prisma.onboardingTaskAssignment.findMany({
      where: { employeeId },
      include: {
        task: true,
      },
      orderBy: { id: "asc" },
    });

    const total = assignments.length;
    const completed = assignments.filter((a) => a.isCompleted).length;
    const progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      progressPercent,
      assignments,
    };
  }

  // 4. Complete / Toggle Checklist Task
  public static async updateTaskStatus(
    assignmentId: string,
    isCompleted: boolean,
  ) {
    const assignment = await prisma.onboardingTaskAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new AppError(
        "Onboarding task assignment not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    return prisma.onboardingTaskAssignment.update({
      where: { id: assignmentId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      include: {
        task: true,
      },
    });
  }
}
