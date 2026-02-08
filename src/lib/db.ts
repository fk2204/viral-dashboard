/**
 * Database Client - PostgreSQL with Prisma
 *
 * Connection pooling and edge-compatible client for Neon serverless
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

/**
 * Graceful shutdown handler
 */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect();
}

/**
 * Health check - verify database connection
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
