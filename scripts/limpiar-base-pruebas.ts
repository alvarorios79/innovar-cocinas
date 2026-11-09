/**
 * Limpia COMPLETAMENTE la base de pruebas local (la de este computador): deja solo la configuración
 * (precios, herrajes, gastos fijos) y los usuarios fijos de prueba. Nunca toca producción.
 *
 * Uso:  npm run db:limpiar-pruebas
 */
import "dotenv/config";
import { isLocalDatabase, purgeTestDataSince } from "../server/test-cleanup";

const url = process.env.DATABASE_URL || "";
if (!isLocalDatabase(url)) {
  console.error("La base configurada NO es local. No se limpia nada.");
  process.exit(1);
}

const deleted = await purgeTestDataSince(url, "1970-01-01");
const total = Object.values(deleted).reduce((a, b) => a + b, 0);
console.log(`Base de pruebas limpia: ${total} registros borrados.`);
for (const [t, n] of Object.entries(deleted).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);
