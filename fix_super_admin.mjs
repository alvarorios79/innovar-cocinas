import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function fixSuperAdmin() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Buscar todos los super_admin
    const superAdmins = await db.select().from(users).where(eq(users.role, 'super_admin'));
    console.log('Super admins encontrados:', superAdmins.length);
    console.log(superAdmins);

    if (superAdmins.length === 0) {
      console.log('No super_admin encontrado. Creando uno...');
      // Si no hay super_admin, actualizar el usuario actual a super_admin
      const result = await connection.execute(
        'UPDATE users SET role = ? WHERE email = ? LIMIT 1',
        ['super_admin', 'mcfy8jgnym@privaterelay.appleid.com']
      );
      console.log('Resultado:', result);
    } else {
      // Tomar el primer super_admin y cambiar su email/openId al usuario actual
      const superAdmin = superAdmins[0];
      console.log('Super admin a transferir:', superAdmin);
      
      // Actualizar el super_admin con los datos del usuario actual
      const result = await connection.execute(
        'UPDATE users SET email = ?, name = ? WHERE id = ?',
        ['mcfy8jgnym@privaterelay.appleid.com', 'Alvaro Rios', superAdmin.id]
      );
      console.log('Actualización completada:', result);
    }

    // Verificar el resultado
    const updated = await db.select().from(users).where(eq(users.email, 'mcfy8jgnym@privaterelay.appleid.com'));
    console.log('Usuario actualizado:', updated);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixSuperAdmin();
