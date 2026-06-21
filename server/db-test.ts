/**
 * Database initialization for Vitest
 * Provides explicit Drizzle connection for test files.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

let pool: pg.Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

export async function getTestDb() {
  if (testDb) return testDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  pool = new pg.Pool({ connectionString: databaseUrl });
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
