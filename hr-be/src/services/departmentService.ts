import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface CreateDepartmentDTO {
  name: string;
  code: string;
  managerId?: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  code?: string;
  managerId?: string | null;
}

export interface CreateDesignationDTO {
  title: string;
  code: string;
}

export class DepartmentService {
  // 1. Departments CRUD
  public static async createDepartment(dto: CreateDepartmentDTO) {
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: dto.name.trim() },
          { code: dto.code.trim().toUpperCase() },
        ],
      },
    });

    if (existing) {
      throw new AppError(
        "A department with this name or code already exists",
        409,
        ErrorCode.CONFLICT,
      );
    }

    return prisma.department.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        managerId: dto.managerId || null,
      },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  public static async getDepartments() {
    return prisma.department.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  public static async getDepartmentById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            employmentStatus: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      throw new AppError(
        "Department record not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    return department;
  }

  public static async updateDepartment(id: string, dto: UpdateDepartmentDTO) {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new AppError(
        "Department record not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    return prisma.department.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
      },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  public static async deleteDepartment(id: string) {
    const employeeCount = await prisma.employee.count({
      where: { departmentId: id },
    });
    if (employeeCount > 0) {
      throw new AppError(
        `Cannot delete department containing ${employeeCount} active employee record(s). Reassign them first.`,
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    return prisma.department.delete({ where: { id } });
  }

  // 2. Designations CRUD
  public static async createDesignation(dto: CreateDesignationDTO) {
    const existing = await prisma.designation.findFirst({
      where: {
        OR: [
          { title: dto.title.trim() },
          { code: dto.code.trim().toUpperCase() },
        ],
      },
    });

    if (existing) {
      throw new AppError(
        "A designation with this title or code already exists",
        409,
        ErrorCode.CONFLICT,
      );
    }

    return prisma.designation.create({
      data: {
        title: dto.title.trim(),
        code: dto.code.trim().toUpperCase(),
      },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  public static async getDesignations() {
    return prisma.designation.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { title: "asc" },
    });
  }
}
