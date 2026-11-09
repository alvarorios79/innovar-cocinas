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
    // Portafolio y Redes (8 nov 2026): tablas nuevas, no tocan las existentes
    {
      name: "portafolio_redes_1",
      sql: `CREATE TABLE IF NOT EXISTS "portfolioStars" ( "id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "source" varchar(20) NOT NULL, "mediaId" integer NOT NULL, "createdBy" integer NOT NULL REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now() )`,
    },
    {
      name: "portafolio_redes_2",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "portfolioStars_source_media_uq" ON "portfolioStars" ("source", "mediaId")`,
    },
    {
      name: "portafolio_redes_3",
      sql: `CREATE INDEX IF NOT EXISTS "portfolioStars_projectId_idx" ON "portfolioStars" ("projectId")`,
    },
    {
      name: "portafolio_redes_4",
      sql: `CREATE TABLE IF NOT EXISTS "projectVideos" ( "id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "url" text NOT NULL, "storageKey" text, "fileName" text, "sizeBytes" bigint, "contentType" varchar(100), "uploadedBy" integer NOT NULL REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now(), "deletedAt" timestamp )`,
    },
    {
      name: "portafolio_redes_5",
      sql: `CREATE INDEX IF NOT EXISTS "projectVideos_projectId_idx" ON "projectVideos" ("projectId")`,
    },
    {
      name: "portafolio_redes_6",
      sql: `CREATE TABLE IF NOT EXISTS "socialPublications" ( "id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "postType" varchar(30) NOT NULL, "network" varchar(20) NOT NULL, "publishedBy" integer NOT NULL REFERENCES "users"("id"), "publishedAt" timestamp NOT NULL DEFAULT now(), "createdAt" timestamp NOT NULL DEFAULT now() )`,
    },
    {
      name: "portafolio_redes_7",
      sql: `CREATE INDEX IF NOT EXISTS "socialPublications_projectId_idx" ON "socialPublications" ("projectId")`,
    },
    {
      name: "portafolio_redes_8",
      sql: `CREATE INDEX IF NOT EXISTS "socialPublications_publishedAt_idx" ON "socialPublications" ("publishedAt")`,
    },
    // Galerías quitadas del Portafolio (8 nov 2026)
    {
      name: "portafolio_eliminadas_1",
      sql: `CREATE TABLE IF NOT EXISTS "portfolioHidden" ("id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "hiddenBy" integer NOT NULL REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now())`,
    },
    {
      name: "portafolio_eliminadas_2",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "portfolioHidden_projectId_uq" ON "portfolioHidden" ("projectId")`,
    },
    // Papelera de fotos del Portafolio (9 nov 2026)
    {
      name: "papelera_fotos_1",
      sql: `CREATE TABLE IF NOT EXISTS "photoTrash" ("id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "source" varchar(20) NOT NULL, "originalId" integer NOT NULL, "data" json NOT NULL, "deletedBy" integer NOT NULL REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now())`,
    },
    {
      name: "papelera_fotos_2",
      sql: `CREATE INDEX IF NOT EXISTS "photoTrash_projectId_idx" ON "photoTrash" ("projectId")`,
    },
    // Trabajos históricos del Portafolio (9 nov 2026)
    {
      name: "portafolio_historicos_1",
      sql: `CREATE TABLE IF NOT EXISTS "portfolioHistoric" ("projectId" integer PRIMARY KEY REFERENCES "projects"("id"), "workKind" varchar(30) NOT NULL, "createdBy" integer NOT NULL REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now())`,
    },
    // Históricos con varios trabajos ("cocina,closet"): más espacio para la lista
    {
      name: "portafolio_historicos_2",
      sql: `ALTER TABLE "portfolioHistoric" ALTER COLUMN "workKind" TYPE varchar(200)`,
    },
    // Planos técnicos y detalles enviados al cliente (9 nov 2026)
    {
      name: "documentos_enviados_1",
      sql: `CREATE TABLE IF NOT EXISTS "projectDocShares" ( "id" serial PRIMARY KEY, "projectId" integer NOT NULL REFERENCES "projects"("id"), "photoId" integer NOT NULL, "fileName" text, "sentBy" integer NOT NULL REFERENCES "users"("id"), "firstSentAt" timestamp NOT NULL DEFAULT now(), "lastSentAt" timestamp NOT NULL DEFAULT now(), "sendCount" integer NOT NULL DEFAULT 1, "hiddenAt" timestamp, "viewedAt" timestamp, "receivedAt" timestamp, "receivedName" varchar(120), "createdAt" timestamp NOT NULL DEFAULT now() )`,
    },
    {
      name: "documentos_enviados_2",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "projectDocShares_photoId_uq" ON "projectDocShares" ("photoId")`,
    },
    {
      name: "documentos_enviados_3",
      sql: `CREATE INDEX IF NOT EXISTS "projectDocShares_projectId_idx" ON "projectDocShares" ("projectId")`,
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
