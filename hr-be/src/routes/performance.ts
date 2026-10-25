import { Router } from "express";
import * as perfCtrl from "../controllers/performanceController";
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

const ctrl: any = perfCtrl;
const getReviews =
  ctrl.getReviews || ctrl.getAllReviews || ctrl.default?.getReviews;
const createReview = ctrl.createReview || ctrl.default?.createReview;

if (typeof getReviews === "function") router.get("/", getReviews);
if (typeof createReview === "function") router.post("/", createReview);

export default router;
