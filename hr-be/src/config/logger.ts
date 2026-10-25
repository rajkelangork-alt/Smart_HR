import path from "path";
import fs from "fs";
import winston from "winston";
import { env } from "./env";

// Ensure the logs directory exists
const logDirectory = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Custom log format for readable output
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console colorized output for local development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { service: "smart-hr-backend" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Combined application log file
    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Stream object for Morgan HTTP request logging integration
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
