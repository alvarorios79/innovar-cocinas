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
    {
      // La etapa "Instalando" existía en el CRM pero no en la BD: pasar un proyecto a ella fallaba al guardar (10 nov 2026)
      name: "project_status_trabajando_instalacion",
      sql: `ALTER TYPE "project_status" ADD VALUE IF NOT EXISTS 'trabajando_instalacion' AFTER 'listo_instalacion'`,
    },
    {
      // Tareas de una sola vez (p. ej. reprogramación de postventa): la fila marca que ya se hizo
      name: "app_flags",
      sql: `CREATE TABLE IF NOT EXISTS "appFlags" ( "name" varchar(100) PRIMARY KEY, "doneAt" timestamp NOT NULL DEFAULT now() )`,
    },
    {
      // Planos técnicos: carpeta nueva "Medidas electrodomésticos" (fichas técnicas para el diseñador; no se envían al cliente)
      name: "photo_subcategory_medidas_electrodomesticos",
      sql: `ALTER TYPE "photo_subcategory" ADD VALUE IF NOT EXISTS 'medidas_electrodomesticos' AFTER 'detalles'`,
    },
    {
      // «Conocimiento de Elena»: temas que Álvaro edita desde el CRM y que la asistente de la página lee (14 nov 2026)
      name: "elena_conocimiento_1",
      sql: `CREATE TABLE IF NOT EXISTS "elenaConocimiento" ("id" serial PRIMARY KEY, "titulo" varchar(200) NOT NULL, "categoria" varchar(40) NOT NULL DEFAULT 'info', "contenido" text NOT NULL, "activo" integer NOT NULL DEFAULT 1, "updatedBy" integer REFERENCES "users"("id"), "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now())`,
    },
    {
      // Mesones y barras (17 nov 2026). SOLO agrega precios que no existen y ajusta UNA vez el granito a $750.000 (decisión de Álvaro).
      // Nunca pisa un precio que Álvaro edite después: el cambio del granito queda marcado en appFlags.
      name: "meson_precios_17nov2026",
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM "appFlags" WHERE "name" = 'meson_granito_750') THEN
          UPDATE "pricingConfig" SET "value" = 750000, "updatedAt" = now() WHERE "code" = 'MESON_GRANITO' AND "value" = 700000;
          INSERT INTO "appFlags" ("name") VALUES ('meson_granito_750');
        END IF;
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'mesones', 'LAVAPLATOS_SENCILLO', 'Lavaplatos sencillo (incluye pegado)', 'Lavaplatos sencillo con pegado en mesones de piedra.', 180000, 'unidad', 20
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'LAVAPLATOS_SENCILLO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'mesones', 'LAVAPLATOS_DOBLE', 'Lavaplatos doble (incluye pegado)', 'Lavaplatos doble con pegado en mesones de piedra.', 700000, 'unidad', 21
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'LAVAPLATOS_DOBLE');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'BARRA_PEDESTAL', 'Pedestal de barra (pata metálica)', 'Por unidad. Con pedestal la barra lleva solo el mesón superior.', COALESCE((SELECT "value" FROM "pricingConfig" WHERE "code" = 'PIEZA_BARRA_PEDESTAL' LIMIT 1), 250000), 'unidad', 22
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BARRA_PEDESTAL');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'BARRA_HERRAJE', 'Herraje de barra (armazón de hierro) para 1,20 m', 'Se cobra proporcional al largo de la barra. Con herraje la piedra lleva lateral y regrueso interior.', COALESCE((SELECT "value" FROM "pricingConfig" WHERE "code" = 'PIEZA_BARRA_HERRAJE' LIMIT 1), 380000), 'unidad', 23
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BARRA_HERRAJE');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'RECARGO_PIEZA_SUELTA', 'Recargo por mueble suelto (solo superiores / inferiores y Piezas de cocina)', 'Porcentaje sobre el precio por ml de la categoría de la cocina cuando el mueble alto o bajo se vende solo.', 15, '%', 90
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'RECARGO_PIEZA_SUELTA');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'RECARGO_PIEZA_FIJA', 'Recargo por nicho / alacena / torre vendidos como pieza sola', 'Porcentaje sobre el precio que tienen dentro de la cocina.', 10, '%', 91
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'RECARGO_PIEZA_FIJA');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'cocina_base', 'PIEZA_ISLA_MADERA_ML', 'Isla: madera por ml (lleva cajoneras)', 'Madera de la isla, dentro de la cocina y como pieza.', 1200000, 'ml', 30
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'PIEZA_ISLA_MADERA_ML');
      END $$`,
    },
    {
      // Closets: precios por m² Premium y Deluxe en el Motor (antes estaban escritos en el código). Solo agrega si no existen; no pisa nada.
      name: "closet_precios_17nov2026",
      sql: `DO $$ BEGIN
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'closets', 'CLOSET_PREMIUM_M2', 'Closet Premium (por m²)', 'Con espaldar y laterales — gama alta.', 900000, 'm2', 11
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'CLOSET_PREMIUM_M2');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'closets', 'CLOSET_DELUXE_M2', 'Closet Deluxe (por m²)', 'Máxima calidad, acabados exclusivos.', 1100000, 'm2', 12
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'CLOSET_DELUXE_M2');
      END $$`,
    },
    {
      // Muebles de baño y desmontes: el cotizador los cobraba con valores de respaldo porque NO estaban en el Motor. Se crean con esos mismos valores (no cambia ningún total).
      name: "bano_desmonte_precios_17nov2026",
      sql: `DO $$ BEGIN
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_50_60', 'Mueble de baño 50–60 cm', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 750000, 'unidad', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_50_60');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_60_80', 'Mueble de baño 60–80 cm', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 900000, 'unidad', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_60_80');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_80_100', 'Mueble de baño 80–100 cm', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1200000, 'unidad', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_80_100');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_100_120', 'Mueble de baño 100–120 cm (más de 120: proporcional)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1400000, 'unidad', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_100_120');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_EXCAVADO_GRANITO', 'Baño: lavamanos excavado en granito (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1200000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_EXCAVADO_GRANITO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_EXCAVADO_CUARZO', 'Baño: lavamanos excavado en cuarzo (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1500000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_EXCAVADO_CUARZO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_EXCAVADO_SINTERIZADO', 'Baño: lavamanos excavado en sinterizado (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 2100000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_EXCAVADO_SINTERIZADO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_MESON_GRANITO', 'Baño: mesón en granito (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 820000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_MESON_GRANITO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_MESON_CUARZO', 'Baño: mesón en cuarzo (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1000000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_MESON_CUARZO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'otros', 'BANO_MESON_SINTERIZADO', 'Baño: mesón en sinterizado (por ml de ancho)', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 1400000, 'ml', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'BANO_MESON_SINTERIZADO');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'DESMONTE_COCINA', 'Desmonte de cocina existente', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 300000, 'servicio', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'DESMONTE_COCINA');
        INSERT INTO "pricingConfig" ("category", "code", "name", "description", "value", "unit", "sortOrder")
          SELECT 'extras', 'DESMONTE_CLOSET', 'Desmonte de closet existente', 'Valor que el cotizador ya usaba como respaldo; ahora editable en el Motor.', 250000, 'servicio', 40
          WHERE NOT EXISTS (SELECT 1 FROM "pricingConfig" WHERE "code" = 'DESMONTE_CLOSET');
      END $$`,
    },
    {
      // Cotización de Adriana Abonce (la última hecha, aún sin enviar): pasa al número corto igual que las nuevas. Solo si sigue en borrador, sin enviar y con su número largo original.
      name: "cotizacion_140_numero_corto",
      sql: `UPDATE "quotations" SET "quotationNumber" = 'COT-2026-0140'
            WHERE "id" = 140 AND "quotationNumber" = 'COT-2026-1795139468378-2090886' AND "status" = 'draft' AND "sentAt" IS NULL
              AND NOT EXISTS (SELECT 1 FROM "quotations" WHERE "quotationNumber" = 'COT-2026-0140')`,
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
