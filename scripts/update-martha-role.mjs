import mysql from 'mysql2/promise';

async function updateMarthaRole() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar a Martha
    const [users] = await connection.execute(
      "SELECT id, name, email, role FROM users WHERE email = 'martha79s@hotmail.com'"
    );
    
    console.log('Usuario encontrado:', users);
    
    if (users.length > 0) {
      // Actualizar rol
      await connection.execute(
        "UPDATE users SET role = 'comercial' WHERE email = 'martha79s@hotmail.com'"
      );
      console.log('Rol actualizado a comercial');
      
      // Verificar
      const [updated] = await connection.execute(
        "SELECT id, name, email, role FROM users WHERE email = 'martha79s@hotmail.com'"
      );
      console.log('Usuario actualizado:', updated);
    } else {
      // Buscar por nombre
      const [byName] = await connection.execute(
        "SELECT id, name, email, role FROM users WHERE name LIKE '%Martha%' LIMIT 10"
      );
      console.log('Usuarios con Martha en el nombre:', byName);
    }
  } finally {
    await connection.end();
  }
}

updateMarthaRole().catch(console.error);
