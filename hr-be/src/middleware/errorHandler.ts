import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ErrorCode } from "../utils/errorCodes";
import { logger } from "../config/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
  });

  // Handle Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Handle Prisma Database Exceptions
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: ErrorCode.CONFLICT,
          message: "A duplicate record already exists for this unique field.",
          details: err.meta,
        },
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: "Requested record does not exist.",
        },
      });
      return;
    }
  }

  // Fallback for unhandled internal exceptions
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message:
        env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  });
};
