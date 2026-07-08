/**
 * Database initialization for Vitest
 * Provides explicit Drizzle connection for test files.
 */

import { drizzle } from "drizzle-orm/node-postgres";

let testDb: ReturnType<typeof drizzle> | null = null;

export async function getTestDb() {
  if (testDb) return testDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  testDb = drizzle(databaseUrl);
  return testDb;
}

export async function closeTestDb() {
  testDb = null;
}
