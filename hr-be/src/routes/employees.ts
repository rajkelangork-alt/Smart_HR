import { Router } from "express";
import * as employeeCtrl from "../controllers/employeeController";
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

const ctrl: any = employeeCtrl;
const getAll = ctrl.getAllEmployees || ctrl.default?.getAllEmployees;
const getById = ctrl.getEmployeeById || ctrl.default?.getEmployeeById;
const create = ctrl.createEmployee || ctrl.default?.createEmployee;
const update = ctrl.updateEmployee || ctrl.default?.updateEmployee;
const remove = ctrl.deleteEmployee || ctrl.default?.deleteEmployee;

if (typeof getAll === "function") router.get("/", getAll);
if (typeof getById === "function") router.get("/:id", getById);
if (typeof create === "function") router.post("/", create);
if (typeof update === "function") router.put("/:id", update);
if (typeof remove === "function") router.delete("/:id", remove);

export default router;
