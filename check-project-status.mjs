import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('ESTADO DE PROYECTOS: Orlando Primacho Y Henry Morales');
    console.log('='.repeat(120) + '\n');

    const [projects] = await connection.execute(`
      SELECT id, name, status, isArchived, createdAt
      FROM projects
      WHERE name LIKE '%Orlando%' OR name LIKE '%Henry%'
      ORDER BY id DESC
    `);

    if (projects.length === 0) {
      console.log('❌ NO SE ENCONTRARON PROYECTOS\n');
    } else {
      console.log(`ID | Name | Status | isArchived | CreatedAt`);
      console.log('-'.repeat(120));
      projects.forEach(p => {
        const createdDate = new Date(p.createdAt).toLocaleDateString('es-CO');
        console.log(`${p.id} | ${p.name} | ${p.status} | ${p.isArchived} | ${createdDate}`);
      });
    }

    console.log('\n' + '='.repeat(120) + '\n');
    console.log('NOTA: Para archivar, el estado debe ser "entregado"\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
