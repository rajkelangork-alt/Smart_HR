import bcrypt from "bcrypt";
import { RoleName } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface UpdateUserStatusDTO {
  isActive: boolean;
}

export interface AssignRoleDTO {
  userId: string;
  roleName: RoleName;
}

export interface ResetPasswordDTO {
  newPassword: string;
}

export class UserService {
  // 1. List Users with Assigned Roles and Employee Profile
  public static async getAllUsers(params?: {
    search?: string;
    role?: RoleName;
    isActive?: boolean;
  }) {
    return prisma.user.findMany({
      where: {
        ...(params?.search && {
          email: { contains: params.search, mode: "insensitive" },
        }),
        ...(params?.isActive !== undefined && { isActive: params.isActive }),
        ...(params?.role && {
          roles: {
            some: {
              role: { name: params.role },
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        provider: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: { id: true, name: true, description: true },
            },
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // 2. Get Single User Details
  public static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        provider: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: {
                  select: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);
    }

    return user;
  }

  // 3. Update User Status (Activate / Deactivate Account)
  public static async updateUserStatus(id: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);
    }

    return prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true, updatedAt: true },
    });
  }

  // 4. Assign Role to User
  public static async assignRole(dto: AssignRoleDTO) {
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);
    }

    const role = await prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!role) {
      throw new AppError(
        `Role '${dto.roleName}' not found`,
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: dto.userId,
          roleId: role.id,
        },
      },
    });

    if (existingUserRole) {
      throw new AppError(
        "User already possesses this role",
        409,
        ErrorCode.CONFLICT,
      );
    }

    await prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: role.id,
      },
    });

    return this.getUserById(dto.userId);
  }

  // 5. Revoke Role from User
  public static async revokeRole(userId: string, roleName: RoleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new AppError(
        `Role '${roleName}' not found`,
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });

    return this.getUserById(userId);
  }

  // 6. Administrative Password Reset
  public static async resetPassword(id: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: "User password reset successfully" };
  }

  // 7. Get All System Roles & Permissions
  public static async getRoles() {
    return prisma.role.findMany({
      include: {
        permissions: {
          select: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });
  }
}
