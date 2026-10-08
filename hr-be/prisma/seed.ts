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

  // 1. Clean child and dependent tables safely
  await prisma.attendanceRecord.deleteMany({}).catch(() => {});
  await prisma.leaveRequest.deleteMany({}).catch(() => {});
  await prisma.performanceReview.deleteMany({}).catch(() => {});
  await prisma.onboardingTaskAssignment.deleteMany({}).catch(() => {});
  await prisma.payslip.deleteMany({}).catch(() => {});
  await prisma.salaryStructure.deleteMany({}).catch(() => {});
  await prisma.goal.deleteMany({}).catch(() => {});
  await prisma.feedback.deleteMany({}).catch(() => {});
  await prisma.auditLog.deleteMany({}).catch(() => {});
  await prisma.userRole.deleteMany({}).catch(() => {});

  // 2. Remove all non-admin employees and users
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

  // The actual enum keys available in this schema:
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

  // 3. Upsert User
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

  // 4. Attach ADMIN role in user_roles
  if (adminRole) {
    await prisma.userRole
      .create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      })
      .catch(() => {});
  }

  // 5. Upsert Employee record using Prisma relation connection
  const existingEmployee = await prisma.employee.findFirst({
    where: { personalEmail: "admin@smarthr.local" },
  });

  if (!existingEmployee) {
    await prisma.employee.create({
      data: {
        user: { connect: { id: adminUser.id } },
        employeeNumber: "EMP-000",
        firstName: "Super",
        lastName: "Admin",
        personalEmail: "admin@smarthr.local",
        department: { connect: { id: execDept.id } },
        designation: { connect: { id: saDesig.id } },
        isDepartmentManager: true,
        canAdminister: true,
        employmentStatus: EmploymentStatus.ACTIVE,
        employmentType: EmploymentType.FULL_TIME,
        joiningDate: new Date(),
      } as any,
    });
  }

  console.log(
    "✅ Database reset complete. Zero old mock cache. Only admin@smarthr.local exists.",
  );
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
