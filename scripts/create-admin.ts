import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

async function main() {
  const email = 'admin@innovar.com';
  const password = 'Admin123!';
  
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    database: 'innovar_dev' 
  });
  
  const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
  
  if ((existing as any[]).length > 0) {
    console.log('️ El usuario ya existe. Actualizando contraseña...');
    const hash = await bcrypt.hash(password, 12);
    await conn.execute('UPDATE users SET passwordHash = ?, role = ? WHERE email = ?', [hash, 'admin', email]);
  } else {
    const hash = await bcrypt.hash(password, 12);
    await conn.execute(
      "INSERT INTO users (openId, name, email, passwordHash, role, loginMethod, isTeamMember, dataOrigin) VALUES (?, ?, ?, ?, 'admin', 'password', 1, 'system')",
      [randomUUID(), 'Administrador', email, hash]
    );
    console.log('✅ Admin creado exitosamente.');
  }
  
  console.log(`\n📧 Email: ${email}`);
  console.log(`🔑 Contraseña: ${password}\n`);
  await conn.end();
}

main().catch(console.error);
