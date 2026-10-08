import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RoleName } from "@prisma/client";
import { env } from "../config/env";
import { AppError, ErrorCode } from "../utils/errorCodes";
import { AuthenticatedUser } from "../types/express";

interface TokenPayload {
  userId: string;
  email: string;
  roles: RoleName[];
  employeeId?: string;
  iat: number;
  exp: number;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(
      "Authentication token missing or malformed",
      401,
      ErrorCode.UNAUTHORIZED,
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
      employeeId: decoded.employeeId,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Token has expired", 401, ErrorCode.UNAUTHORIZED);
    }
    throw new AppError(
      "Invalid authentication token",
      401,
      ErrorCode.UNAUTHORIZED,
    );
  }
};

export const authorize = (allowedRoles: RoleName[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("User context not found", 401, ErrorCode.UNAUTHORIZED);
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      throw new AppError(
        "Forbidden: Insufficient permissions to perform this action",
        403,
        ErrorCode.FORBIDDEN,
      );
    }

    next();
  };
};
