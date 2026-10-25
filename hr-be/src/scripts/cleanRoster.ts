import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning and normalizing system roster...");

  // 1. Clear dependent operational records first
  try {
    if ((prisma as any).attendanceRecord)
      await (prisma as any).attendanceRecord.deleteMany({});
    if ((prisma as any).leaveRequest)
      await (prisma as any).leaveRequest.deleteMany({});
    if ((prisma as any).performanceReview)
      await (prisma as any).performanceReview.deleteMany({});
    if ((prisma as any).payrollRecord)
      await (prisma as any).payrollRecord.deleteMany({});
    if ((prisma as any).userRole) await (prisma as any).userRole.deleteMany({});
  } catch (e) {
    console.warn("Table cleanup notice:", e);
  }

  // 2. Clear employees and users
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});

  // 3. Ensure required Roles exist
  const rolesList = [
    "ADMIN",
    "HR_MANAGER",
    "MANAGER",
    "EMPLOYEE",
    "ACCOUNTANT",
  ];
  const roleMap: Record<string, string> = {};

  for (const rName of rolesList) {
    let r = await (prisma as any).role.findFirst({
      where: { name: rName },
    });
    if (!r) {
      r = await (prisma as any).role.create({
        data: { name: rName, description: `${rName} Role` },
      });
    }
    roleMap[rName] = r.id;
  }

  // 4. Ensure required Departments exist
  const deptDefs = [
    { name: "Finance", code: "FIN" },
    { name: "Technology", code: "TECH" },
    { name: "Human Resources", code: "HR" },
    { name: "Manager", code: "MGR" },
  ];

  const deptMap: Record<string, string> = {};

  for (const d of deptDefs) {
    let existing = await prisma.department.findFirst({
      where: { name: d.name },
    });
    if (!existing) {
      existing = await prisma.department.create({
        data: {
          name: d.name,
          code: d.code,
        } as any,
      });
    }
    deptMap[d.name] = existing.id;
  }

  // 5. Ensure required Designations exist
  const desigDefs = [
    { title: "System Administrator", code: "SYS_ADMIN" },
    { title: "HR Specialist", code: "HR_SPEC" },
    { title: "Full Stack Engineer", code: "FS_ENG" },
    { title: "Accountant", code: "ACCT" },
  ];

  const desigMap: Record<string, string> = {};

  for (const des of desigDefs) {
    let existing = await prisma.designation.findFirst({
      where: {
        OR: [{ title: des.title }, { code: des.code }],
      },
    });

    if (!existing) {
      existing = await prisma.designation.create({
        data: {
          title: des.title,
          code: des.code,
        } as any,
      });
    }
    desigMap[des.title] = existing.id;
  }

  // 6. Fixed system accounts
  const fixedAccounts = [
    {
      email: "admin@smarthr.local",
      password: await bcrypt.hash("Admin@123456", 10),
      role: "ADMIN",
      firstName: "System",
      lastName: "Admin",
      empNo: "EMP-001",
      dept: "Manager",
      designation: "System Administrator",
    },
    {
      email: "hr@smarthr.local",
      password: await bcrypt.hash("Hr@123456", 10),
      role: "HR_MANAGER",
      firstName: "Sarah",
      lastName: "Miller",
      empNo: "EMP-002",
      dept: "Human Resources",
      designation: "HR Specialist",
    },
    {
      email: "manager@smarthr.local",
      password: await bcrypt.hash("Manager@123456", 10),
      role: "MANAGER",
      firstName: "David",
      lastName: "Kim",
      empNo: "EMP-003",
      dept: "Manager",
      designation: "System Administrator",
    },
    {
      email: "tech@smarthr.local",
      password: await bcrypt.hash("Employee@123456", 10),
      role: "EMPLOYEE",
      firstName: "Alex",
      lastName: "Chen",
      empNo: "EMP-004",
      dept: "Technology",
      designation: "Full Stack Engineer",
    },
    {
      email: "finance@smarthr.local",
      password: await bcrypt.hash("Finance@123456", 10),
      role: "ACCOUNTANT",
      firstName: "Michael",
      lastName: "Scott",
      empNo: "EMP-005",
      dept: "Finance",
      designation: "Accountant",
    },
  ];

  for (const acc of fixedAccounts) {
    const targetRoleId = roleMap[acc.role];

    // Create user with nested UserRole relation
    const user = await prisma.user.create({
      data: {
        email: acc.email,
        passwordHash: acc.password,
        roles: {
          create: {
            roleId: targetRoleId,
          },
        },
      } as any,
    });

    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeNumber: acc.empNo,
        firstName: acc.firstName,
        lastName: acc.lastName,
        personalEmail: acc.email,
        departmentId: deptMap[acc.dept],
        designationId: desigMap[acc.designation],
        employmentStatus: "ACTIVE",
        joiningDate: new Date(),
      } as any,
    });
  }

  console.log("System roster successfully initialized with 5 fixed profiles.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
