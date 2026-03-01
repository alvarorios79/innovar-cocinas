import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('BÚSQUEDA: PROYECTOS "Orlando primacho" Y "Henry morales"');
    console.log('='.repeat(120) + '\n');

    // Buscar por nombre
    const [projects] = await connection.execute(`
      SELECT id, name, isArchived, deletedAt, createdAt, createdBy
      FROM projects
      WHERE name LIKE '%Orlando%' OR name LIKE '%Henry%' OR name LIKE '%primacho%' OR name LIKE '%morales%'
      ORDER BY id DESC
    `);

    if (projects.length === 0) {
      console.log('❌ NO SE ENCONTRARON PROYECTOS CON ESOS NOMBRES\n');
    } else {
      console.log(`ID | Name | isArchived | deletedAt | CreatedAt | CreatedBy`);
      console.log('-'.repeat(120));
      projects.forEach(p => {
        const createdDate = new Date(p.createdAt).toLocaleDateString('es-CO');
        const deletedStatus = p.deletedAt ? '✓ ELIMINADO' : 'Activo';
        const archivedStatus = p.isArchived === 1 ? 'Archivado' : 'No archivado';
        console.log(`${p.id} | ${p.name} | ${archivedStatus} | ${deletedStatus} | ${createdDate} | ${p.createdBy}`);
      });
    }

    console.log('\n' + '='.repeat(120) + '\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
