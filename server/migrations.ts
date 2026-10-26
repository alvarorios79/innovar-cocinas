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
      sql: `ALTER TABLE "technical_visits" ADD COLUMN IF NOT EXISTS "assignedTo" integer REFERENCES users(id)`,
    },
    {
      name: "technicalVisits_scheduledDate",
      sql: `ALTER TABLE "technical_visits" ADD COLUMN IF NOT EXISTS "scheduledDate" timestamp`,
    },
    {
      name: "users_isTeamMember",
      sql: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isTeamMember" integer NOT NULL DEFAULT 0`,
    },
    {
      name: "quotations_includeIva",
      sql: `ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "includeIva" integer NOT NULL DEFAULT 0`,
    },
    {
      name: "projects_includeIva",
      sql: `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "includeIva" integer NOT NULL DEFAULT 0`,
    },
    {
      name: "user_role_daniel_operario_v2",
      sql: `UPDATE "users" SET "role" = 'operario' WHERE LOWER("email") = 'daniel07beltran11@gmail.com' AND "role" NOT IN ('admin', 'super_admin')`,
    },
    {
      name: "user_role_luis_jefe_taller_v2",
      sql: `UPDATE "users" SET "role" = 'jefe_taller' WHERE LOWER("email") = 'luis2019cardozo@gmail.com' AND "role" NOT IN ('admin', 'super_admin')`,
    },
    {
      name: "user_role_felipe_contador_v2",
      sql: `UPDATE "users" SET "role" = 'contador' WHERE LOWER("email") = 'pipeton015@hotmail.com' AND "role" NOT IN ('admin', 'super_admin')`,
    },
    {
      name: "user_role_medidor_v2",
      sql: `UPDATE "users" SET "role" = 'medidor' WHERE LOWER("email") = 'medidor@innovarcocinas.co' AND "role" NOT IN ('admin', 'super_admin')`,
    },
    {
      name: "quotationItems_bathroomConfig",
      sql: `ALTER TABLE "quotationItems" ADD COLUMN IF NOT EXISTS "bathroomConfig" json`,
    },
    {
      // Asegura que la columna exista en caso de que la migración Drizzle no se haya aplicado
      name: "projects_publicToken_column",
      sql: `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "publicToken" varchar(64)`,
    },
    {
      // Genera tokens únicos para todos los proyectos existentes que no tengan uno.
      // Idempotente: solo afecta filas con publicToken NULL.
      // md5 doble = 48 chars hex, único por fila gracias a random() + clock_timestamp() + id.
      name: "projects_publicToken_backfill",
      sql: `UPDATE "projects" SET "publicToken" = md5(random()::text || id::text || clock_timestamp()::text) || left(md5(random()::text || clock_timestamp()::text), 16) WHERE "publicToken" IS NULL`,
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
