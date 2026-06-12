import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const SALT_ROUNDS = 12;
const ADMIN_EMAIL = 'admin@innovar.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'innovar_dev'
  });

  try {
    // Hashear contraseña
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    
    // Verificar si ya existe
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log('⚠️  El usuario admin ya existe con ID:', existing[0].id);
      console.log('Actualizando contraseña...');
      await connection.execute(
        'UPDATE users SET passwordHash = ?, role = ? WHERE email = ?',
        [passwordHash, 'admin', ADMIN_EMAIL]
      );
      console.log('✅ Contraseña actualizada');
    } else {
      // Crear usuario admin
      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, email, passwordHash, role, loginMethod, isTeamMember, dataOrigin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          ADMIN_NAME,
          ADMIN_EMAIL,
          passwordHash,
          'admin',
          'password',
          1,
          'system'
        ]
      );
      console.log('✅ Usuario admin creado con ID:', result.insertId);
    }

    console.log('\n📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Contraseña:', ADMIN_PASSWORD);
    console.log('\n⚠️  Cambia esta contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createAdmin();
