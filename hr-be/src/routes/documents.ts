import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as authModule from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const auth =
  (authModule as any).authenticate ||
  (authModule as any).authenticateToken ||
  (authModule as any).verifyToken ||
  (authModule as any).default;

if (typeof auth === "function") {
  router.use(auth);
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const emp = await prisma.employee.findUnique({
      where: { userId: authUser?.userId },
    });

    const docs = await prisma.employee_documents.findMany({
      where: emp ? { employeeId: emp.id } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data: docs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load documents",
    });
  }
});

export default router;
