import { EmploymentStatus, EmploymentType, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface CreateEmployeeDTO {
  email: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dob?: string;
  phone?: string;
  personalEmail?: string;
  nationalId?: string;
  joiningDate: string;
  employmentType?: EmploymentType;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
}

export class EmployeeService {
  // Generate next sequential employee ID (e.g. EMP-0002)
  private static async generateEmployeeNumber(): Promise<string> {
    const count = await prisma.employee.count();
    const nextNumber = (count + 1).toString().padStart(4, "0");
    return `EMP-${nextNumber}`;
  }

  // Create an employee along with their base user record
  public static async createEmployee(dto: CreateEmployeeDTO) {
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError(
        "A user with this email already exists",
        409,
        ErrorCode.CONFLICT,
      );
    }

    const employeeRole = await prisma.role.findFirst({
      where: { name: "EMPLOYEE" },
    });

    if (!employeeRole) {
      throw new AppError(
        "Default EMPLOYEE role not found in system",
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }

    const employeeNumber = await this.generateEmployeeNumber();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          isActive: true,
          roles: {
            create: { roleId: employeeRole.id },
          },
        },
      });

      const employee = await tx.employee.create({
        data: {
          employeeNumber,
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          phone: dto.phone,
          personalEmail: dto.personalEmail,
          nationalId: dto.nationalId,
          joiningDate: new Date(dto.joiningDate),
          employmentType: dto.employmentType || EmploymentType.FULL_TIME,
          employmentStatus: EmploymentStatus.PROBATION,
          departmentId: dto.departmentId,
          designationId: dto.designationId,
          managerId: dto.managerId,
        },
        include: {
          department: true,
          designation: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
            },
          },
        },
      });

      return employee;
    });
  }

  // Get paginated employee roster with multi-criteria filters
  public static async getEmployees(params: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    status?: EmploymentStatus;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.status) {
      where.employmentStatus = params.status;
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { employeeNumber: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          designation: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get employee profile with relational documents and addresses
  public static async getEmployeeById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            roles: { include: { role: true } },
          },
        },
        department: true,
        designation: true,
        manager: true,
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        addresses: true,
        emergencyContacts: true,
        bankAccount: true,
      },
    });

    if (!employee) {
      throw new AppError("Employee record not found", 404, ErrorCode.NOT_FOUND);
    }

    return employee;
  }

  // Get organizational hierarchy tree
  public static async getOrgChart() {
    return prisma.employee.findMany({
      where: {
        employmentStatus: {
          in: [EmploymentStatus.ACTIVE, EmploymentStatus.PROBATION],
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        managerId: true,
        designation: { select: { title: true } },
        department: { select: { name: true } },
      },
    });
  }
}
