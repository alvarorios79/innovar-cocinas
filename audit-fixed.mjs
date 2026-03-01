import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('DEEP AUDIT: USUARIOS DE PRUEBA Y SUS RELACIONES');
    console.log('='.repeat(120) + '\n');

    // PASO 1: Contar usuarios de prueba
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM users
      WHERE email LIKE '%test%' OR email LIKE '%manual%' OR email LIKE '%bulk%' OR email LIKE '%qvs%'
    `);
    const totalTestUsers = countResult[0].total;

    console.log(`📊 RESUMEN GLOBAL\n`);
    console.log(`Total usuarios de prueba: ${totalTestUsers}\n`);

    // PASO 2: Contar relaciones
    const [relationsResult] = await connection.execute(`
      SELECT 
          SUM(CASE WHEN projects_count > 0 THEN 1 ELSE 0 END) AS users_with_projects,
          SUM(CASE WHEN quotations_count > 0 THEN 1 ELSE 0 END) AS users_with_quotations,
          SUM(CASE WHEN clients_count > 0 THEN 1 ELSE 0 END) AS users_with_clients,
          SUM(projects_count) AS total_projects,
          SUM(quotations_count) AS total_quotations,
          SUM(clients_count) AS total_clients
      FROM (
          SELECT 
              u.id,
              COUNT(DISTINCT p.id) AS projects_count,
              COUNT(DISTINCT q.id) AS quotations_count,
              COUNT(DISTINCT c.id) AS clients_count
          FROM users u
          LEFT JOIN projects p ON p.createdBy = u.id
          LEFT JOIN quotations q ON q.createdBy = u.id
          LEFT JOIN clients c ON c.userId = u.id
          WHERE u.email LIKE '%test%' OR u.email LIKE '%manual%' OR u.email LIKE '%bulk%' OR u.email LIKE '%qvs%'
          GROUP BY u.id
      ) audit
    `);

    const r = relationsResult[0];
    console.log(`Usuarios con relaciones:`);
    console.log(`  - Con proyectos: ${r.users_with_projects || 0} (total: ${r.total_projects || 0})`);
    console.log(`  - Con cotizaciones: ${r.users_with_quotations || 0} (total: ${r.total_quotations || 0})`);
    console.log(`  - Con clientes: ${r.users_with_clients || 0} (total: ${r.total_clients || 0})\n`);

    const usersWithRelations = Math.max(
      r.users_with_projects || 0,
      r.users_with_quotations || 0,
      r.users_with_clients || 0
    );

    console.log(`Usuarios sin relaciones (seguros de eliminar): ${totalTestUsers - usersWithRelations}\n`);

    // PASO 3: Mostrar usuarios con relaciones
    const [usersWithRel] = await connection.execute(`
      SELECT 
          u.id,
          u.email,
          u.role,
          COUNT(DISTINCT p.id) AS projects_count,
          COUNT(DISTINCT q.id) AS quotations_count,
          COUNT(DISTINCT c.id) AS clients_count
      FROM users u
      LEFT JOIN projects p ON p.createdBy = u.id
      LEFT JOIN quotations q ON q.createdBy = u.id
      LEFT JOIN clients c ON c.userId = u.id
      WHERE (u.email LIKE '%test%' OR u.email LIKE '%manual%' OR u.email LIKE '%bulk%' OR u.email LIKE '%qvs%')
        AND (p.id IS NOT NULL OR q.id IS NOT NULL OR c.id IS NOT NULL)
      GROUP BY u.id, u.email, u.role
      ORDER BY u.id DESC
    `);

    if (usersWithRel.length > 0) {
      console.log(`Usuarios con relaciones (primeros 20):\n`);
      console.log('ID | Email | Role | Projects | Quotations | Clients');
      console.log('-'.repeat(120));
      usersWithRel.slice(0, 20).forEach(u => {
        console.log(`${u.id} | ${u.email.substring(0, 40)} | ${u.role} | ${u.projects_count} | ${u.quotations_count} | ${u.clients_count}`);
      });
      console.log('...\n');
    }

    console.log('='.repeat(120) + '\n');
    console.log('⚠️  NOTA: Este es solo un AUDIT. No se modificó nada en la base de datos.\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
