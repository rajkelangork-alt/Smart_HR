import fs from "fs";
import path from "path";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface CreateDocumentDTO {
  employeeId: string;
  name: string;
  category: string;
  fileUrl: string;
  expiryDate?: string;
}

export class DocumentService {
  // 1. Save uploaded document record
  public static async uploadDocument(dto: CreateDocumentDTO) {
    const employee = await prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new AppError(
        "Employee profile not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    return prisma.employeeDocument.create({
      data: {
        employeeId: dto.employeeId,
        name: dto.name.trim(),
        category: dto.category.trim().toUpperCase(),
        fileUrl: dto.fileUrl,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
      include: {
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
  }

  // 2. Retrieve documents with optional category/employee filtering
  public static async getDocuments(employeeId: string, category?: string) {
    return prisma.employeeDocument.findMany({
      where: {
        employeeId,
        ...(category && { category: category.trim().toUpperCase() }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // 3. Get single document by ID
  public static async getDocumentById(id: string) {
    const doc = await prisma.employeeDocument.findUnique({
      where: { id },
      include: {
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

    if (!doc) {
      throw new AppError("Document record not found", 404, ErrorCode.NOT_FOUND);
    }

    return doc;
  }

  // 4. Delete document and remove physical file from disk
  public static async deleteDocument(id: string) {
    const doc = await prisma.employeeDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new AppError("Document record not found", 404, ErrorCode.NOT_FOUND);
    }

    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to unlink local file:", err);
      }
    }

    return prisma.employeeDocument.delete({ where: { id } });
  }
}
