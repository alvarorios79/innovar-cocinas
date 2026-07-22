/**
 * Runtime migrations — se ejecutan al arrancar el servidor.
 * Usan ADD COLUMN IF NOT EXISTS para ser idempotentes (seguro correrlas N veces).
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn("[migrations] No DB disponible — skipping migrations");
    return;
  }

  const migrations: { name: string; sql: string }[] = [
    {
      name: "technicalVisits_assignedTo",
      sql: `ALTER TABLE "technicalVisits" ADD COLUMN IF NOT EXISTS "assignedTo" integer REFERENCES users(id)`,
    },
    {
      name: "technicalVisits_scheduledDate",
      sql: `ALTER TABLE "technicalVisits" ADD COLUMN IF NOT EXISTS "scheduledDate" timestamp`,
    },
    {
      name: "users_isTeamMember",
      sql: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isTeamMember" integer NOT NULL DEFAULT 0`,
    },
  ];

  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m.sql));
      console.log(`[migrations] ✓ ${m.name}`);
    } catch (err) {
      console.error(`[migrations] ✗ ${m.name}:`, err);
    }
  }
}
