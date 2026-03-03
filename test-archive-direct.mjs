import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n=== ANTES DE ARCHIVAR ===\n');
    const [before] = await connection.execute(`
      SELECT id, name, status, isArchived
      FROM projects
      WHERE id = 540001
    `);
    console.log('Proyecto 540001:', before[0]);

    console.log('\n=== INTENTANDO ARCHIVAR ===\n');
    const [result] = await connection.execute(`
      UPDATE projects
      SET isArchived = 1
      WHERE id = 540001
    `);
    console.log('Resultado del UPDATE:', result);

    console.log('\n=== DESPUÉS DE ARCHIVAR ===\n');
    const [after] = await connection.execute(`
      SELECT id, name, status, isArchived
      FROM projects
      WHERE id = 540001
    `);
    console.log('Proyecto 540001:', after[0]);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
