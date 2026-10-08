import { ComponentType, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface SetSalaryStructureDTO {
  employeeId: string;
  baseSalary: number;
  effectiveDate?: string;
  breakdown?: Record<string, number>;
}

export interface CreateSalaryComponentDTO {
  name: string;
  type: ComponentType;
  isTaxable?: boolean;
}

export class PayrollService {
  // 1. Manage Salary Components
  public static async createComponent(dto: CreateSalaryComponentDTO) {
    const existing = await prisma.salaryComponent.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new AppError(
        "A salary component with this name already exists",
        409,
        ErrorCode.CONFLICT,
      );
    }

    return prisma.salaryComponent.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        isTaxable: dto.isTaxable ?? true,
      },
    });
  }

  public static async getComponents() {
    return prisma.salaryComponent.findMany({
      orderBy: { name: "asc" },
    });
  }

  // 2. Assign / Update Employee Salary Structure
  public static async setSalaryStructure(dto: SetSalaryStructureDTO) {
    const employee = await prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new AppError("Employee record not found", 404, ErrorCode.NOT_FOUND);
    }

    const effectiveDate = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : new Date();
    const breakdown = dto.breakdown || {};

    const existingStructure = await prisma.salaryStructure.findFirst({
      where: { employeeId: dto.employeeId },
    });

    if (existingStructure) {
      return prisma.salaryStructure.update({
        where: { id: existingStructure.id },
        data: {
          baseSalary: new Prisma.Decimal(dto.baseSalary),
          effectiveDate,
          breakdown: breakdown as Prisma.InputJsonValue,
        },
      });
    }

    return prisma.salaryStructure.create({
      data: {
        employeeId: dto.employeeId,
        baseSalary: new Prisma.Decimal(dto.baseSalary),
        effectiveDate,
        breakdown: breakdown as Prisma.InputJsonValue,
      },
    });
  }

  public static async getSalaryStructure(employeeId: string) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    if (!structure) {
      throw new AppError(
        "Salary structure has not been set for this employee",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    return structure;
  }

  // 3. Process Monthly Payroll Run
  public static async runMonthlyPayroll(month: number, year: number) {
    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        month_year: { month, year },
      },
    });

    if (existingRun && existingRun.status === "CLOSED") {
      throw new AppError(
        `Payroll run for ${month}/${year} has been permanently closed`,
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const employees = await prisma.employee.findMany();
    const components = await prisma.salaryComponent.findMany();
    const earningsNames = new Set(
      components
        .filter((c) => c.type === ComponentType.EARNING)
        .map((c) => c.name),
    );
    const deductionNames = new Set(
      components
        .filter((c) => c.type === ComponentType.DEDUCTION)
        .map((c) => c.name),
    );

    return prisma.$transaction(async (tx) => {
      let run = existingRun;

      if (!run) {
        run = await tx.payrollRun.create({
          data: {
            month,
            year,
            totalGross: new Prisma.Decimal(0),
            totalNet: new Prisma.Decimal(0),
            totalDeductions: new Prisma.Decimal(0),
            status: "PROCESSING",
          },
        });
      } else {
        await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });
      }

      let runGross = 0;
      let runDeductions = 0;
      let runNet = 0;

      for (const emp of employees) {
        const structure = await tx.salaryStructure.findFirst({
          where: { employeeId: emp.id },
        });

        const base = structure ? Number(structure.baseSalary) : 30000;
        const breakdownObj =
          (structure?.breakdown as Record<string, number>) || {};

        let additionalEarnings = 0;
        let empDeductions = 0;

        for (const [key, val] of Object.entries(breakdownObj)) {
          const amount = Number(val) || 0;
          if (deductionNames.has(key)) {
            empDeductions += amount;
          } else if (earningsNames.has(key)) {
            additionalEarnings += amount;
          }
        }

        const gross = base + additionalEarnings;
        const net = Math.max(0, gross - empDeductions);

        runGross += gross;
        runDeductions += empDeductions;
        runNet += net;

        await tx.payslip.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            basicSalary: new Prisma.Decimal(base),
            grossSalary: new Prisma.Decimal(gross),
            deductions: new Prisma.Decimal(empDeductions),
            netSalary: new Prisma.Decimal(net),
            details: {
              baseSalary: base,
              breakdown: breakdownObj,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return tx.payrollRun.update({
        where: { id: run.id },
        data: {
          totalGross: new Prisma.Decimal(runGross),
          totalDeductions: new Prisma.Decimal(runDeductions),
          totalNet: new Prisma.Decimal(runNet),
          status: "COMPLETED",
        },
        include: {
          payslips: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // 4. Retrieve Payslips
  public static async getPayslips(params: {
    employeeId?: string;
    month?: number;
    year?: number;
  }) {
    return prisma.payslip.findMany({
      where: {
        ...(params.employeeId && { employeeId: params.employeeId }),
        ...(params.month || params.year
          ? {
              payrollRun: {
                ...(params.month && { month: params.month }),
                ...(params.year && { year: params.year }),
              },
            }
          : {}),
      },
      include: {
        payrollRun: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public static async getPayslipById(id: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        payrollRun: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    if (!payslip) {
      throw new AppError("Payslip not found", 404, ErrorCode.NOT_FOUND);
    }

    return payslip;
  }
}
