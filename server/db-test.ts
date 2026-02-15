/**
 * Database initialization for Vitest
 * Provides explicit Drizzle connection for test files.
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

export async function getTestDb() {
  if (testDb) return testDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  pool = mysql.createPool(databaseUrl);
  testDb = drizzle(pool);
  return testDb;
}

export async function closeTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
    testDb = null;
  }
}
