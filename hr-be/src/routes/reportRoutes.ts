import { Router } from "express";
import { exportHeadcountCSV } from "../controllers/reportController";

const router = Router();
router.get("/export/headcount", exportHeadcountCSV);

export default router;
