import { Router } from "express";
import authRoutes from "./auth";
import employeeRoutes from "./employees";
import attendanceRoutes from "./attendance";
import leaveRoutes from "./leave";
import performanceRoutes from "./performance";
import departmentRoutes from "./departments";
import documentRoutes from "./documents";

const router = Router();

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leaves", leaveRoutes);
router.use("/performance", performanceRoutes);
router.use("/departments", departmentRoutes);
router.use("/documents", documentRoutes);

export default router;
