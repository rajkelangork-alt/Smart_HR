import {
  PrismaClient,
  RoleName,
  EmploymentStatus,
  EmploymentType,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🔌 Verifying database connection...");
  await prisma.$connect();
  console.log(" Connected to Supabase PostgreSQL.");

  console.log("🧹 Clearing old records and resetting database...");

  // Nullify self-referential relations first to prevent foreign key errors
  await prisma.employee.updateMany({
    data: {
      managerId: null,
      creatorId: null,
    },
  });

  // Clean dependent tables in strict dependency order
  await prisma.attendanceRecord.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.performanceReview.deleteMany({});
  await prisma.onboardingTaskAssignment.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.designation.deleteMany({});

  console.log("🛡️ Initializing core RBAC security roles...");
  const targetRoles = [RoleName.ADMIN, RoleName.MANAGER, RoleName.EMPLOYEE];
  const roleMap: Record<string, string> = {};

  for (const roleVal of targetRoles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: roleVal },
      update: {},
      create: {
        name: roleVal,
        description: `${roleVal} role with system privileges`,
      },
    });
    roleMap[roleVal] = roleRecord.id;
  }

  console.log("👤 Provisioning root Super Admin (admin@smarthr.local)...");
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

  // Assign ADMIN role
  if (roleMap[RoleName.ADMIN]) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: roleMap[RoleName.ADMIN],
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: roleMap[RoleName.ADMIN],
      },
    });
  }

  // Create Super Admin Employee record without pre-assigned department
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {
      firstName: "Super",
      lastName: "Admin",
      personalEmail: "admin@smarthr.local",
      isDepartmentManager: true,
      canAdminister: true,
    },
    create: {
      employeeNumber: "EMP-001",
      firstName: "Super",
      lastName: "Admin",
      personalEmail: "admin@smarthr.local",
      isDepartmentManager: true,
      canAdminister: true,
      employmentStatus: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      joiningDate: new Date(),
      userId: adminUser.id,
    },
  });

  console.log("🌴 Initializing standard leave types...");
  await prisma.leaveType.upsert({
    where: { name: "ANNUAL" },
    update: {},
    create: { name: "ANNUAL", daysAllowed: 20, carryForward: true },
  });

  await prisma.leaveType.upsert({
    where: { name: "SICK" },
    update: {},
    create: { name: "SICK", daysAllowed: 12, carryForward: false },
  });

  console.log("✅ Seed completed successfully!");
  console.log("🔑 Default Login: admin@smarthr.local | Admin@12345");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
