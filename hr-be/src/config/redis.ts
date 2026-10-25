import Redis, { RedisOptions } from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redisConfig: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Bull requires maxRetriesPerRequest to be null
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
};

// Singleton Redis Client for application-level caching
export const redisClient = new Redis(redisConfig);

redisClient.on("connect", () => {
  logger.info(" Connected to Redis server");
});

redisClient.on("error", (err) => {
  logger.error(" Redis client encountered an error:", err);
});

// Cache helper functions
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error reading cache key "${key}":`, error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds: number = 3600,
): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);
    await redisClient.set(key, serialized, "EX", ttlSeconds);
  } catch (error) {
    logger.error(`Error setting cache key "${key}":`, error);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Error deleting cache key "${key}":`, error);
  }
};
