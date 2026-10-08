import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthProvider, RoleName } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError, ErrorCode } from "../utils/errorCodes";
import { LdapService } from "./ldapService";

export class AuthService {
  public static generateTokens(payload: {
    userId: string;
    email: string;
    roles: RoleName[];
    employeeId?: string;
  }) {
    const accessToken = jwt.sign({ ...payload }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );

    return { accessToken, refreshToken };
  }

  public static async login(credentials: { email: string; password?: string }) {
    const { email, password } = credentials;
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(
        "Invalid credentials or account inactive",
        401,
        ErrorCode.UNAUTHORIZED,
      );
    }

    if (!user.passwordHash || !password) {
      throw new AppError(
        "Invalid email or password",
        401,
        ErrorCode.UNAUTHORIZED,
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(
        "Invalid email or password",
        401,
        ErrorCode.UNAUTHORIZED,
      );
    }

    const roles: RoleName[] = user.roles.map(
      (r: any) => r.role.name as RoleName,
    );
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      roles,
      employeeId: user.employee?.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        employee: user.employee,
      },
      ...tokens,
    };
  }

  public static async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          employee: {
            select: { id: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new AppError(
          "Session invalidated or account deactivated",
          401,
          ErrorCode.UNAUTHORIZED,
        );
      }

      const roles = user.roles.map((r: any) => r.role.name as RoleName);
      return this.generateTokens({
        userId: user.id,
        email: user.email,
        roles,
        employeeId: user.employee?.id,
      });
    } catch {
      throw new AppError(
        "Invalid or expired refresh token",
        401,
        ErrorCode.UNAUTHORIZED,
      );
    }
  }
}

export default AuthService;
