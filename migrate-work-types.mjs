import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// Conectar a la base de datos
const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Iniciando migración de tipos de trabajo...');

try {
  // 1. Crear la tabla appointmentWorkTypes si no existe
  console.log('1. Creando tabla appointmentWorkTypes...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS appointmentWorkTypes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointmentId INT NOT NULL,
      workType ENUM('cocina', 'closet', 'puertas', 'centro_tv') NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
    )
  `);

  // 2. Migrar datos existentes
  console.log('2. Migrando datos existentes...');
  const [appointments] = await connection.query('SELECT id, workType FROM appointments WHERE workType IS NOT NULL');

  for (const appointment of appointments) {
    await connection.query(
      'INSERT INTO appointmentWorkTypes (appointmentId, workType) VALUES (?, ?)',
      [appointment.id, appointment.workType]
    );
    console.log(`   Migrado appointment ${appointment.id}: ${appointment.workType}`);
  }

  console.log(`   Total migrado: ${appointments.length} registros`);

  // 3. Eliminar la columna workType de appointments
  console.log('3. Eliminando columna workType de appointments...');
  await connection.query('ALTER TABLE appointments DROP COLUMN workType');

  console.log('✅ Migración completada exitosamente');
} catch (error) {
  console.error('❌ Error durante la migración:', error);
  throw error;
} finally {
  await connection.end();
}
