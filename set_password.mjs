import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const password = 'Alejo3107Jero';
const email = 'martha79s@hotmail.com';

async function setPassword() {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [result] = await connection.execute(
    'UPDATE user SET password = ? WHERE email = ?',
    [hashedPassword, email]
  );
  
  console.log('Filas actualizadas:', result.affectedRows);
  
  if (result.affectedRows > 0) {
    console.log('✅ Contraseña asignada correctamente a Martha');
  } else {
    console.log('❌ No se encontró el usuario con ese email');
  }
  
  await connection.end();
}

setPassword().catch(console.error);
