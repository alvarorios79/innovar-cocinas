import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function createWorkUsers() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  const users = [
    {
      name: "Luis Cardoso",
      email: "jefe.taller@innovar.temp",
      role: "jefe_taller",
      password: "Innovar2024*"
    },
    {
      name: "Daniel Beltran", 
      email: "operario@innovar.temp",
      role: "operario",
      password: "Innovar2024*"
    }
  ];

  console.log("Creando usuarios de trabajo...\n");

  for (const user of users) {
    try {
      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Verificar si el usuario ya existe
      const [existing] = await connection.execute(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );

      if (existing.length > 0) {
        console.log(`⚠️  Usuario ${user.email} ya existe, actualizando...`);
        await connection.execute(
          "UPDATE users SET name = ?, role = ?, passwordHash = ? WHERE email = ?",
          [user.name, user.role, passwordHash, user.email]
        );
      } else {
        // Generar openId único
        const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // Insertar nuevo usuario
        await connection.execute(
          "INSERT INTO users (openId, name, email, role, passwordHash, loginMethod, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, 'password', NOW(), NOW(), NOW())",
          [openId, user.name, user.email, user.role, passwordHash]
        );
      }

      console.log(`✅ ${user.name}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Contraseña: ${user.password}`);
      console.log("");
    } catch (error) {
      console.error(`❌ Error creando ${user.name}:`, error.message);
    }
  }

  console.log("\n========================================");
  console.log("CREDENCIALES DE ACCESO");
  console.log("========================================\n");
  
  console.log("JEFE DE TALLER:");
  console.log("  Nombre: Luis Cardoso");
  console.log("  Email: jefe.taller@innovar.temp");
  console.log("  Contraseña: Innovar2024*");
  console.log("");
  
  console.log("OPERARIO:");
  console.log("  Nombre: Daniel Beltran");
  console.log("  Email: operario@innovar.temp");
  console.log("  Contraseña: Innovar2024*");
  console.log("");
  
  console.log("========================================");
  console.log("Guarda estas credenciales en un lugar seguro.");
  console.log("Los correos se pueden cambiar después desde");
  console.log("Panel Admin → Usuarios o contactando soporte.");
  console.log("========================================\n");

  await connection.end();
}

createWorkUsers().catch(console.error);
