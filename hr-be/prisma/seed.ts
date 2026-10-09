import {
  PrismaClient,
  RoleName,
  EmploymentStatus,
  EmploymentType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Purging old mock records, attendance, and reviews...");

  const safeDelete = async (model: any) => {
    if (model && typeof model.deleteMany === "function") {
      try {
        await model.deleteMany({});
      } catch (e) {}
    }
  };

  await safeDelete(
    (prisma as any).leaveRequest || (prisma as any).leave_requests,
  );
  await safeDelete(
    (prisma as any).performanceReview || (prisma as any).performance_reviews,
  );
  await safeDelete(
    (prisma as any).onboardingTaskAssignment ||
      (prisma as any).onboarding_task_assignments,
  );
  await safeDelete((prisma as any).payslip || (prisma as any).payslips);
  await safeDelete(
    (prisma as any).salaryStructure || (prisma as any).salary_structures,
  );
  await safeDelete((prisma as any).goal || (prisma as any).goals);
  await safeDelete((prisma as any).feedback || (prisma as any).feedbacks);
  await safeDelete((prisma as any).auditLog || (prisma as any).audit_logs);
  await safeDelete((prisma as any).userRole || (prisma as any).user_roles);

  await prisma.employee.deleteMany({
    where: {
      personalEmail: { not: "admin@smarthr.local" },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: { not: "admin@smarthr.local" },
    },
  });

  console.log("🏢 Seeding standard Departments & Designations...");

  const execDept = await prisma.department.upsert({
    where: { name: "Executive" },
    update: {},
    create: { name: "Executive", code: "EXEC" },
  });

  await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", code: "ENG" },
  });

  await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: { name: "Human Resources", code: "HR" },
  });

  await prisma.department.upsert({
    where: { name: "Operations" },
    update: {},
    create: { name: "Operations", code: "OPS" },
  });

  const saDesig = await prisma.designation.upsert({
    where: { title: "Super Administrator" },
    update: {},
    create: { title: "Super Administrator", code: "SA" },
  });

  await prisma.designation.upsert({
    where: { title: "Department Manager" },
    update: {},
    create: { title: "Department Manager", code: "MGR" },
  });

  await prisma.designation.upsert({
    where: { title: "Full Stack Engineer" },
    update: {},
    create: { title: "Full Stack Engineer", code: "FSE" },
  });

  console.log("🛡️ Ensuring standard Roles (ADMIN, MANAGER, EMPLOYEE) exist...");

  const targetRoles = [RoleName.ADMIN, RoleName.MANAGER, RoleName.EMPLOYEE];

  for (const roleVal of targetRoles) {
    await prisma.role
      .upsert({
        where: { name: roleVal },
        update: {},
        create: {
          name: roleVal,
          description: `${roleVal} role with system privileges`,
        },
      })
      .catch(() => {});
  }

  const adminRole = await prisma.role.findFirst({
    where: { name: RoleName.ADMIN },
  });

  console.log("👤 Seeding root Super Admin account (admin@smarthr.local)...");
  const hashedPassword = await bcrypt.hash("Admin@12345", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@smarthr.local" },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      email: "admin@smarthr.local",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  if (adminRole) {
    await prisma.userRole
      .upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      })
      .catch(() => {});
  }

  const existingEmployee = await prisma.employee.findFirst({
    where: { personalEmail: "admin@smarthr.local" },
  });

  if (!existingEmployee) {
    await prisma.employee.create({
      data: {
        employeeNumber: "EMP-000",
        firstName: "Super",
        lastName: "Admin",
        personalEmail: "admin@smarthr.local",
        isDepartmentManager: true,
        canAdminister: true,
        employmentStatus: EmploymentStatus.ACTIVE,
        employmentType: EmploymentType.FULL_TIME,
        joiningDate: new Date(),
        users: { connect: { id: adminUser.id } },
        departments: { connect: { id: execDept.id } },
        designations: { connect: { id: saDesig.id } },
      },
    });
  }

  console.log("✅ Database seed complete. Super Admin created successfully.");
  console.log("🔑 Credentials: admin@smarthr.local | Admin@12345");
}

main()
  .catch((e) => {
    console.error("Seed execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
