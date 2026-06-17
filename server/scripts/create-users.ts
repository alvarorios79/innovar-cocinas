/**
 * Script para crear los 5 perfiles de usuario iniciales.
 * Ejecutar desde la raíz del proyecto:
 *   npx tsx server/scripts/create-users.ts
 */

import "dotenv/config";
import { hashPassword } from "../password-auth";
import { createUser } from "../db";
import { getUserByEmail } from "../db";

const PASSWORD = "Innovar2026#";

const USERS = [
  { email: "alejoile@gmail.com",              role: "disenador"   as const, name: "Alejo" },
  { email: "martha79s@hotmail.com",            role: "admin"       as const, name: "Martha" },
  { email: "jefetaller@innovarcocinas.com",    role: "jefe_taller" as const, name: "Jefe Taller" },
  { email: "operario@innovarcocinas.com",      role: "operario"    as const, name: "Operario" },
  { email: "comercial@innovarcocinas.com",     role: "comercial"   as const, name: "Comercial" },
];

async function main() {
  console.log("Creando usuarios...\n");

  const passwordHash = await hashPassword(PASSWORD);

  for (const u of USERS) {
    try {
      // Verificar si ya existe
      const existing = await getUserByEmail(u.email);
      if (existing) {
        console.log(`⚠️  Ya existe: ${u.email} (${u.role}) — omitido`);
        continue;
      }

      await createUser({
        email:        u.email,
        name:         u.name,
        role:         u.role,
        passwordHash: passwordHash,
      });

      console.log(`✅  Creado: ${u.email} → ${u.role}`);
    } catch (err: any) {
      console.error(`❌  Error con ${u.email}: ${err.message}`);
    }
  }

  console.log("\nListo.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
