import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, name FROM projects LIMIT 5');
console.log('Projects:', JSON.stringify(rows, null, 2));

const [photos] = await conn.execute('SELECT id, projectId, subcategory FROM projectPhotos WHERE subcategory = "modelado" LIMIT 5');
console.log('Modelado photos:', JSON.stringify(photos, null, 2));

await conn.end();
