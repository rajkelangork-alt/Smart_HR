import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { DepartmentService } from "../services/departmentService";

const createDepartmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  code: z.string().min(2, "Department code is required"),
  managerId: z.string().uuid().optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  managerId: z.string().uuid().nullable().optional(),
});

const createDesignationSchema = z.object({
  title: z.string().min(2, "Designation title must be at least 2 characters"),
  code: z.string().min(2, "Designation code is required"),
});

export class DepartmentController {
  // GET /api/v1/departments
  public static async getAllDepartments(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const departments = await DepartmentService.getDepartments();
      res.status(200).json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/departments/:id
  public static async getDepartmentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const department = await DepartmentService.getDepartmentById(
        req.params.id,
      );
      res.status(200).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/departments
  public static async createDepartment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = createDepartmentSchema.parse(req.body);
      const department = await DepartmentService.createDepartment(payload);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/departments/:id
  public static async updateDepartment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = updateDepartmentSchema.parse(req.body);
      const updated = await DepartmentService.updateDepartment(
        req.params.id,
        payload,
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/departments/:id
  public static async deleteDepartment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await DepartmentService.deleteDepartment(req.params.id);
      res
        .status(200)
        .json({ success: true, message: "Department successfully removed" });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/departments/designations/list
  public static async getDesignations(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const designations = await DepartmentService.getDesignations();
      res.status(200).json({ success: true, data: designations });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/departments/designations
  public static async createDesignation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = createDesignationSchema.parse(req.body);
      const designation = await DepartmentService.createDesignation(payload);
      res.status(201).json({ success: true, data: designation });
    } catch (error) {
      next(error);
    }
  }
}
