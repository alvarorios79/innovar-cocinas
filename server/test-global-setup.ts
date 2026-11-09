/**
 * vitest globalSetup: al EMPEZAR anota la hora de la base de pruebas y al TERMINAR borra todo lo que
 * las pruebas crearon desde esa hora. Solo actúa si la base es local (este computador).
 */
import "dotenv/config";
import { databaseNow, isLocalDatabase, purgeTestDataSince } from "./test-cleanup";

export default async function setup() {
  const url = process.env.DATABASE_URL || "";
  if (!isLocalDatabase(url)) return;

  let since: string | null = null;
  try {
    since = await databaseNow(url);
  } catch {
    return; // sin base local disponible: nada que limpiar
  }

  return async function teardown() {
    if (!since || process.env.KEEP_TEST_DATA === "1") return;
    try {
      const deleted = await purgeTestDataSince(url, since);
      const total = Object.values(deleted).reduce((a, b) => a + b, 0);
      if (total > 0) console.log(`[pruebas] Limpieza de la base de pruebas: ${total} registros creados por las pruebas fueron borrados.`);
    } catch (err: any) {
      console.warn("[pruebas] No se pudo limpiar la base de pruebas:", err?.message || err);
    }
  };
}
