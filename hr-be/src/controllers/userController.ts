import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RoleName } from "@prisma/client";
import { UserService } from "../services/userService";

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

const assignRoleSchema = z.object({
  roleName: z.nativeEnum(RoleName),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must contain at least 6 characters"),
});

export class UserController {
  // GET /api/v1/users
  public static async getAllUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const role = req.query.role as RoleName | undefined;
      const isActive =
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined;

      const users = await UserService.getAllUsers({ search, role, isActive });
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/users/roles
  public static async getRoles(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const roles = await UserService.getRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/users/:id
  public static async getUserById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/users/:id/status
  public static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { isActive } = updateStatusSchema.parse(req.body);
      const updated = await UserService.updateUserStatus(
        req.params.id,
        isActive,
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/users/:id/roles
  public static async assignRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { roleName } = assignRoleSchema.parse(req.body);
      const updated = await UserService.assignRole({
        userId: req.params.id,
        roleName,
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/users/:id/roles/:roleName
  public static async revokeRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const roleName = req.params.roleName as RoleName;
      const updated = await UserService.revokeRole(req.params.id, roleName);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/users/:id/reset-password
  public static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { newPassword } = resetPasswordSchema.parse(req.body);
      const result = await UserService.resetPassword(
        req.params.id,
        newPassword,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
