import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import path from "path";
import { DocumentService } from "../services/documentService";
import { AppError, ErrorCode } from "../utils/errorCodes";

const createDocMetaSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
  name: z.string().min(2, "Document name must be at least 2 characters"),
  category: z.string().min(2, "Document category is required"),
  expiryDate: z.string().optional(),
});

export class DocumentController {
  // POST /api/v1/documents/upload
  public static async upload(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError(
          "File payload missing from multipart form data",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const meta = createDocMetaSchema.parse(req.body);
      const relativePath = path.join("uploads", req.file.filename);

      const record = await DocumentService.uploadDocument({
        ...meta,
        fileUrl: relativePath,
      });

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/documents/employee/:employeeId
  public static async getByEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { employeeId } = req.params;
      const category = req.query.category as string | undefined;

      const documents = await DocumentService.getDocuments(
        employeeId,
        category,
      );
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/documents/:id/download
  public static async download(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const doc = await DocumentService.getDocumentById(req.params.id);
      const absolutePath = path.join(process.cwd(), doc.fileUrl);

      res.download(absolutePath, doc.name);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/documents/:id
  public static async delete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await DocumentService.deleteDocument(req.params.id);
      res
        .status(200)
        .json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
