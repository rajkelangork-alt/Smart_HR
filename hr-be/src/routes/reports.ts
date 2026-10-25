import { Router } from "express";
import * as ReportControllerModule from "../controllers/reportController";

const router = Router();

// Handle both named and class-based default exports cleanly
const controller =
  (ReportControllerModule as any).ReportController || ReportControllerModule;

router.get("/overview", (req, res, next) => {
  if (typeof controller.getOverview === "function") {
    return controller.getOverview(req, res, next);
  }
  return res.status(200).json({ success: true, data: {} });
});

router.get("/export/headcount", (req, res, next) => {
  if (typeof controller.exportHeadcountCSV === "function") {
    return controller.exportHeadcountCSV(req, res, next);
  }
  return res.status(200).send("No report export available");
});

export default router;
