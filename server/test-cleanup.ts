/**
 * Limpieza de la base de PRUEBAS (solo la local de este computador; nunca producción).
 *
 * - `purgeTestDataSince(desde)`: borra todo lo creado desde esa fecha (lo que creó una ronda de pruebas).
 * - Se usa en `test-global-setup.ts` (al terminar cada `npm test`) y en `scripts/limpiar-base-pruebas.ts`.
 *
 * Se conservan siempre: la configuración (precios, herrajes, gastos fijos) y los usuarios fijos de
 * prueba que se usan para revisar pantallas (ver FIXED_TEST_USERS).
 */
import pg from "pg";

/** Usuarios de prueba fijos (claves en _archivos-negocio/documentos/ACCESO_CRM_LOCAL.md). */
export const FIXED_TEST_USERS = [
  "alvaro@prueba.test",
  "taller@prueba.test",
  "operario@prueba.test",
  "disenador@prueba.test",
];

/** Tablas de configuración que nunca se borran. */
const KEEP_TABLES = new Set([
  "pricingConfig",
  "pricingHistory",
  "hardwareCatalog",
  "financialSettings",
  "fixedExpenseConfig",
]);

/** Solo se permite una base en este computador. */
export function isLocalDatabase(url?: string | null) {
  return !!url && /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
}

/**
 * Borra de la base local todo lo creado desde `since` (incluido).
 * Como las tablas se referencian entre sí, repite pasadas hasta que no quede nada por borrar.
 */
export async function purgeTestDataSince(databaseUrl: string, since: Date | string) {
  if (!isLocalDatabase(databaseUrl)) throw new Error("Limpieza de pruebas: la base NO es local; no se toca.");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const deleted: Record<string, number> = {};
  try {
    const { rows } = await client.query(
      `select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'createdAt'`
    );
    const tables = rows.map((r: any) => r.table_name as string).filter((t) => !KEEP_TABLES.has(t));

    for (let pass = 0; pass < 25; pass++) {
      let progress = 0;
      let blocked = 0;
      for (const t of tables) {
        const isUsers = t === "users";
        const sql = isUsers
          ? `delete from "users" where "createdAt" >= $1 and coalesce(email, '') <> all($2::text[])`
          : `delete from "${t}" where "createdAt" >= $1`;
        try {
          const res = await client.query(sql, isUsers ? [since, FIXED_TEST_USERS] : [since]);
          if (res.rowCount) {
            progress += res.rowCount;
            deleted[t] = (deleted[t] || 0) + res.rowCount;
          }
        } catch (err: any) {
          // 23503 = otra fila todavía la usa; se intenta en la siguiente pasada
          if (err?.code === "23503") blocked++;
          else throw err;
        }
      }
      if (progress === 0) break;
      if (blocked === 0 && progress === 0) break;
    }
  } finally {
    await client.end();
  }
  return deleted;
}

/** Hora actual según la base (para no depender del reloj ni de la zona horaria). */
export async function databaseNow(databaseUrl: string): Promise<string> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(`select now()::timestamp::text as t`);
    return rows[0].t;
  } finally {
    await client.end();
  }
}
