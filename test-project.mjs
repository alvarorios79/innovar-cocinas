import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar el proyecto directamente
const [projects] = await conn.execute('SELECT id, name, quotationId FROM projects WHERE id = 390003');
console.log('Project from DB:', projects[0]);

// Verificar la cotización
if (projects[0]?.quotationId) {
  const [quotations] = await conn.execute('SELECT id, createdAt, validUntil FROM quotations WHERE id = ?', [projects[0].quotationId]);
  console.log('Quotation from DB:', quotations[0]);
}

await conn.end();
