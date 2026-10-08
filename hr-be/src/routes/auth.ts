import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { login, refresh, logout } from "../controllers/authController";

const router = Router();
const prisma = new PrismaClient();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/roster", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
        employees: {
          include: {
            departments: true,
            designations: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedRoster = users.map((u) => {
      const cleanEmail = u.email.toLowerCase();
      const isRootAdmin =
        cleanEmail === "admin@smarthr.local" ||
        u.user_roles?.some(
          (ur) =>
            String(ur.roles?.name).toUpperCase() === "SUPER_ADMIN" ||
            String(ur.roles?.name).toUpperCase() === "ADMIN",
        );

      const isManager = Boolean(
        u.employees?.isDepartmentManager ||
        u.user_roles?.some(
          (ur) => String(ur.roles?.name).toUpperCase() === "MANAGER",
        ),
      );

      const roleDisplay = isRootAdmin
        ? "SUPER_ADMIN"
        : isManager
          ? "MANAGER"
          : "EMPLOYEE";

      const password = isRootAdmin
        ? "Admin@12345"
        : `${cleanEmail.split("@")[0]}@12345`;

      return {
        id: u.id,
        email: u.email,
        role: roleDisplay,
        firstName: u.employees?.firstName || cleanEmail.split("@")[0],
        lastName: u.employees?.lastName || "",
        department: u.employees?.departments?.name || "",
        password,
      };
    });

    return res.status(200).json({ success: true, data: formattedRoster });
  } catch (error) {
    console.error("Failed to load roster:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load roster" });
  }
});

export default router;
