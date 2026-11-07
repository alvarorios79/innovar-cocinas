/**
 * Configuración de las pruebas (vitest → setupFiles).
 *
 * Carga el .env para que las pruebas que usan la base de datos puedan conectarse,
 * PERO solo si la base es local (localhost / 127.0.0.1). Varias pruebas crean y borran
 * registros: nunca deben correr contra producción. Si DATABASE_URL no es local, se quita
 * y esas pruebas quedan sin base (fallan o se saltan) en vez de tocar datos reales.
 */
import "dotenv/config";

const url = process.env.DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
if (url && !isLocal) {
  console.warn("[tests] DATABASE_URL no apunta a una base local: las pruebas corren SIN base de datos.");
  delete process.env.DATABASE_URL;
}

// email.ts crea el cliente de Resend al cargarse y falla sin clave: en pruebas basta una ficticia
// (ninguna prueba envía correos reales).
process.env.RESEND_API_KEY ||= "re_test_dummy";
