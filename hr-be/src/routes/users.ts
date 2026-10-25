import { Router } from "express";
import { RoleName } from "@prisma/client";
import { UserController } from "../controllers/userController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize([RoleName.ADMIN]));

router.get("/roles", UserController.getRoles);
router.get("/", UserController.getAllUsers);
router.get("/:id", UserController.getUserById);
router.patch("/:id/status", UserController.updateStatus);
router.post("/:id/roles", UserController.assignRole);
router.delete("/:id/roles/:roleName", UserController.revokeRole);
router.post("/:id/reset-password", UserController.resetPassword);

export default router;
