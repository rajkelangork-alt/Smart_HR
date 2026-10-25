import { LeaveRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, ErrorCode } from "../utils/errorCodes";

export interface ApplyLeaveDTO {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export class LeaveService {
  private static calculateDays(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // 1. Initialize employee leave balances for a calendar year
  public static async initializeBalances(
    employeeId: string,
    year: number = new Date().getFullYear(),
  ) {
    const leaveTypes = await prisma.leaveType.findMany();

    const operations = leaveTypes.map((type) =>
      prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: type.id,
            year,
          },
        },
        update: {},
        create: {
          employeeId,
          leaveTypeId: type.id,
          year,
          totalDays: type.daysAllowed,
          usedDays: 0,
        },
      }),
    );

    return prisma.$transaction(operations);
  }

  // 2. Fetch employee leave balances for current year
  public static async getBalances(
    employeeId: string,
    year: number = new Date().getFullYear(),
  ) {
    let balances = await prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });

    if (balances.length === 0) {
      await this.initializeBalances(employeeId, year);
      balances = await prisma.leaveBalance.findMany({
        where: { employeeId, year },
        include: { leaveType: true },
      });
    }

    return balances.map((b) => ({
      id: b.id,
      leaveType: b.leaveType.name,
      totalDays: b.totalDays,
      usedDays: b.usedDays,
      remaining: b.totalDays - b.usedDays,
      year: b.year,
    }));
  }

  // 3. Submit Leave Application
  public static async applyLeave(dto: ApplyLeaveDTO) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new AppError(
        "End date cannot be prior to start date",
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const requested = this.calculateDays(start, end);
    const year = start.getFullYear();

    let balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year,
        },
      },
    });

    if (!balance) {
      await this.initializeBalances(dto.employeeId, year);
      balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: dto.employeeId,
            leaveTypeId: dto.leaveTypeId,
            year,
          },
        },
      });
    }

    const available = balance ? balance.totalDays - balance.usedDays : 0;
    if (available < requested) {
      throw new AppError(
        `Insufficient leave balance. Available: ${available}, Requested: ${requested}`,
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    return prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        daysCount: requested,
        reason: dto.reason,
        status: LeaveRequestStatus.PENDING,
      },
      include: {
        leaveType: true,
      },
    });
  }

  // 4. Approve or Reject Leave Application
  public static async updateLeaveStatus(
    requestId: string,
    action: "APPROVE" | "REJECT",
    approverId: string,
    actionReason?: string,
  ) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!leaveRequest) {
      throw new AppError(
        "Leave application record not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new AppError(
        `Leave request has already been ${leaveRequest.status.toLowerCase()}`,
        400,
        ErrorCode.BAD_REQUEST,
      );
    }

    const targetStatus =
      action === "APPROVE"
        ? LeaveRequestStatus.APPROVED
        : LeaveRequestStatus.REJECTED;
    const days = this.calculateDays(
      leaveRequest.startDate,
      leaveRequest.endDate,
    );

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          actionedBy: approverId,
          actionReason,
        },
      });

      if (targetStatus === LeaveRequestStatus.APPROVED) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: leaveRequest.employeeId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year: leaveRequest.startDate.getFullYear(),
            },
          },
          data: {
            usedDays: { increment: leaveRequest.daysCount },
          },
        });
      }

      return updated;
    });
  }

  // 5. Query leave requests with status filtering
  public static async getLeaveRequests(params: {
    employeeId?: string;
    status?: LeaveRequestStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = {};
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;

    const [total, requests] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          leaveType: true,
          employee: {
            select: { firstName: true, lastName: true, employeeNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 6. Get Available Leave Types
  public static async getLeaveTypes() {
    return prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  }
}
