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
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isDepartmentManager: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: departments });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch departments",
    });
  }
});

export default router;
