import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(100));
    console.log('VERIFICACIÓN: PROYECTOS ARCHIVADOS EN BD');
    console.log('='.repeat(100) + '\n');

    // Query 1: Listar proyectos archivados
    console.log('📋 PROYECTOS CON isArchived = 1:\n');
    
    const [archivedProjects] = await connection.execute(`
      SELECT id, name, isArchived, createdAt
      FROM projects
      WHERE isArchived = 1
      ORDER BY id DESC
    `);

    if (archivedProjects.length === 0) {
      console.log('❌ NO HAY PROYECTOS ARCHIVADOS EN LA BD\n');
    } else {
      console.log(`ID | Name | isArchived | CreatedAt`);
      console.log('-'.repeat(100));
      archivedProjects.forEach(p => {
        const createdDate = new Date(p.createdAt).toLocaleDateString('es-CO');
        console.log(`${p.id} | ${p.name} | ${p.isArchived} | ${createdDate}`);
      });
      console.log();
    }

    // Query 2: Contar total
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total_archived FROM projects WHERE isArchived = 1
    `);
    
    console.log('='.repeat(100));
    console.log(`📊 TOTAL PROYECTOS ARCHIVADOS: ${countResult[0].total_archived}\n`);

    // Query 3: Distribución
    const [distribution] = await connection.execute(`
      SELECT isArchived, COUNT(*) as count FROM projects GROUP BY isArchived
    `);

    console.log('📊 DISTRIBUCIÓN:\n');
    distribution.forEach(row => {
      const status = row.isArchived === 0 ? 'Activos' : 'Archivados';
      console.log(`   ${status}: ${row.count}`);
    });

    console.log('\n' + '='.repeat(100) + '\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
