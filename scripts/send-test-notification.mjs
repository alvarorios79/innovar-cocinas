import mysql from 'mysql2/promise';

// Conectar a la base de datos
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'gateway.manus.computer',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Buscar el ID del diseñador
const [users] = await connection.execute(
  "SELECT id, name, email, role FROM users WHERE email = 'alejoile300@gmail.com'"
);

if (users.length === 0) {
  console.log('Usuario no encontrado');
  process.exit(1);
}

const designer = users[0];
console.log('Diseñador encontrado:', designer);

// Insertar notificación de prueba
const [result] = await connection.execute(
  `INSERT INTO notifications (userId, title, body, type, isRead, createdAt) 
   VALUES (?, ?, ?, ?, ?, NOW())`,
  [
    designer.id,
    '🎨 Mensaje de Prueba',
    '¡Hola Alejo! Este es un mensaje de prueba del sistema de notificaciones de INNOVAR Cocinas. Si puedes ver esto, las notificaciones funcionan correctamente.',
    'sistema',
    false
  ]
);

console.log('Notificación creada con ID:', result.insertId);

await connection.end();
console.log('¡Notificación enviada exitosamente!');
