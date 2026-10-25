import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env relative to project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),

  // Database
  DATABASE_URL: z
    .string()
    .url({ message: "DATABASE_URL must be a valid connection URI" }),

  // Redis
  REDIS_HOST: z.string().min(1, { message: "REDIS_HOST is required" }),
  REDIS_PORT: z
    .string()
    .default("6379")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  REDIS_PASSWORD: z.string().optional().default(""),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(16, { message: "JWT_SECRET must be at least 16 characters long" }),
  JWT_EXPIRES_IN: z.string().default("1d"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, {
      message: "JWT_REFRESH_SECRET must be at least 16 characters long",
    }),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // LDAP / Active Directory
  LDAP_URL: z
    .string()
    .min(1, { message: "LDAP_URL is required (e.g. ldap://localhost:389)" }),
  LDAP_BIND_DN: z.string().min(1, { message: "LDAP_BIND_DN is required" }),
  LDAP_BIND_PASSWORD: z
    .string()
    .min(1, { message: "LDAP_BIND_PASSWORD is required" }),
  LDAP_SEARCH_BASE: z
    .string()
    .min(1, { message: "LDAP_SEARCH_BASE is required" }),

  // Upload Limits
  MAX_FILE_SIZE_MB: z
    .string()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  UPLOAD_DESTINATION: z.string().default("./uploads"),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment Variable Validation Errors:");
    const formattedErrors = result.error.format();
    Object.entries(formattedErrors).forEach(([key, value]) => {
      if (key !== "_errors" && value && "_errors" in value) {
        console.error(
          `  - ${key}: ${(value as { _errors: string[] })._errors.join(", ")}`,
        );
      }
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
