import path from "path";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./config/database";
import { logger } from "./config/logger";
import apiRouter from "./routes";
import { initializeCronJobs } from "./jobs";
import analyticsRoutes from "./routes/analyticsRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use("/api/v1", apiRouter);
app.use("/api/v1/analytics", analyticsRoutes);

// Serve uploaded documents locally
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Central API Router
app.use("/api/v1", apiRouter);

// Fallback 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "API route not found",
      details: null,
    },
  });
});

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info("Connected to PostgreSQL database");

    // Start background cron automations
    initializeCronJobs();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();

export default app;
