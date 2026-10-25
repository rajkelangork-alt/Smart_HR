import { Router } from "express";
import * as leaveCtrl from "../controllers/leaveController";
import * as authModule from "../middleware/auth";

const router = Router();

const auth =
  (authModule as any).authenticate ||
  (authModule as any).authenticateToken ||
  (authModule as any).verifyToken ||
  (authModule as any).default;

if (typeof auth === "function") {
  router.use(auth);
}

const ctrl: any = leaveCtrl;
const getLeaves =
  ctrl.getLeaves || ctrl.getAllLeaves || ctrl.default?.getLeaves;
const applyLeave =
  ctrl.applyLeave || ctrl.createLeave || ctrl.default?.applyLeave;
const updateStatus = ctrl.updateLeaveStatus || ctrl.default?.updateLeaveStatus;

if (typeof getLeaves === "function") router.get("/", getLeaves);
if (typeof applyLeave === "function") router.post("/", applyLeave);
if (typeof updateStatus === "function")
  router.patch("/:id/status", updateStatus);
if (typeof updateStatus === "function") router.put("/:id", updateStatus);

export default router;
