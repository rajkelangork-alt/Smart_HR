-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "canAdminister" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDepartmentManager" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "employees_departmentId_isDepartmentManager_idx" ON "employees"("departmentId", "isDepartmentManager");
