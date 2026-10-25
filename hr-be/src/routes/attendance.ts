import { Router } from "express";
import * as attendanceCtrl from "../controllers/attendanceController";
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

const ctrl: any = attendanceCtrl;
const getRoster =
  ctrl.getWorkforceRoster ||
  ctrl.getAllAttendance ||
  ctrl.default?.getWorkforceRoster;
const punchIn = ctrl.punchIn || ctrl.clockIn || ctrl.default?.punchIn;
const punchOut = ctrl.punchOut || ctrl.clockOut || ctrl.default?.punchOut;
const getStats =
  ctrl.getMyAttendanceStats ||
  ctrl.getAttendanceStats ||
  ctrl.default?.getMyAttendanceStats;

if (typeof getRoster === "function") {
  router.get("/", getRoster);
  router.get("/workforce-roster", getRoster);
}

if (typeof getStats === "function") {
  router.get("/stats", getStats);
  router.get("/my-stats", getStats);
}

if (typeof punchIn === "function") {
  router.post("/punch-in", punchIn);
  router.post("/clock-in", punchIn);
}

if (typeof punchOut === "function") {
  router.post("/punch-out", punchOut);
  router.post("/clock-out", punchOut);
}

export default router;
