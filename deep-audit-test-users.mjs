import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('DEEP AUDIT: USUARIOS DE PRUEBA Y SUS RELACIONES');
    console.log('='.repeat(120) + '\n');

    // PASO 1: Identificar usuarios de prueba
    console.log('📋 PASO 1: USUARIOS DE PRUEBA IDENTIFICADOS\n');
    
    const [testUsers] = await connection.execute(`
      SELECT id, email, role, dataOrigin
      FROM users
      WHERE email LIKE '%test%'
         OR email LIKE '%manual%'
         OR email LIKE '%bulk%'
         OR email LIKE '%qvs%'
      ORDER BY id DESC
    `);

    console.log(`Total usuarios de prueba: ${testUsers.length}\n`);
    
    // Mostrar primeros 20
    console.log('Primeros 20 usuarios de prueba:\n');
    console.log('ID | Email | Role | dataOrigin');
    console.log('-'.repeat(120));
    testUsers.slice(0, 20).forEach(u => {
      console.log(`${u.id} | ${u.email.substring(0, 40)} | ${u.role} | ${u.dataOrigin}`);
    });
    console.log('...\n');

    // PASO 2: Contar relaciones por usuario
    console.log('='.repeat(120));
    console.log('📊 PASO 2: RELACIONES DE USUARIOS DE PRUEBA\n');
    
    const [userRelations] = await connection.execute(`
      SELECT 
          u.id,
          u.email,
          u.role,
          u.dataOrigin,
          COUNT(DISTINCT p.id) AS projects_count,
          COUNT(DISTINCT q.id) AS quotations_count,
          COUNT(DISTINCT c.id) AS clients_count,
          COUNT(DISTINCT a.id) AS appointments_count
      FROM users u
      LEFT JOIN projects p ON p.createdBy = u.id
      LEFT JOIN quotations q ON q.createdBy = u.id
      LEFT JOIN clients c ON c.userId = u.id
      LEFT JOIN appointments a ON a.createdBy = u.id
      WHERE u.email LIKE '%test%'
         OR u.email LIKE '%manual%'
         OR u.email LIKE '%bulk%'
         OR u.email LIKE '%qvs%'
      GROUP BY u.id, u.email, u.role, u.dataOrigin
      ORDER BY u.id DESC
    `);

    console.log(`Usuarios con relaciones:\n`);
    console.log('ID | Email | Role | Projects | Quotations | Clients | Appointments | Total');
    console.log('-'.repeat(120));
    
    let usersWithRelations = 0;
    let totalProjects = 0;
    let totalQuotations = 0;
    let totalClients = 0;
    let totalAppointments = 0;

    userRelations.forEach(ur => {
      const total = ur.projects_count + ur.quotations_count + ur.clients_count + ur.appointments_count;
      if (total > 0) {
        console.log(`${ur.id} | ${ur.email.substring(0, 30)} | ${ur.role} | ${ur.projects_count} | ${ur.quotations_count} | ${ur.clients_count} | ${ur.appointments_count} | ${total}`);
        usersWithRelations++;
      }
      totalProjects += ur.projects_count;
      totalQuotations += ur.quotations_count;
      totalClients += ur.clients_count;
      totalAppointments += ur.appointments_count;
    });

    console.log('-'.repeat(120));
    console.log(`TOTALES: ${totalProjects} proyectos | ${totalQuotations} cotizaciones | ${totalClientes} clientes | ${totalAppointments} citas\n`);

    // PASO 3: Resumen global
    console.log('='.repeat(120));
    console.log('📈 PASO 3: RESUMEN GLOBAL\n');

    const [summary] = await connection.execute(`
      SELECT 
          COUNT(*) AS total_test_users,
          SUM(CASE WHEN projects_count > 0 THEN 1 ELSE 0 END) AS users_with_projects,
          SUM(CASE WHEN quotations_count > 0 THEN 1 ELSE 0 END) AS users_with_quotations,
          SUM(CASE WHEN clients_count > 0 THEN 1 ELSE 0 END) AS users_with_clients,
          SUM(CASE WHEN appointments_count > 0 THEN 1 ELSE 0 END) AS users_with_appointments
      FROM (
          SELECT 
              u.id,
              COUNT(DISTINCT p.id) AS projects_count,
              COUNT(DISTINCT q.id) AS quotations_count,
              COUNT(DISTINCT c.id) AS clients_count,
              COUNT(DISTINCT a.id) AS appointments_count
          FROM users u
          LEFT JOIN projects p ON p.createdBy = u.id
          LEFT JOIN quotations q ON q.createdBy = u.id
          LEFT JOIN clients c ON c.userId = u.id
          LEFT JOIN appointments a ON a.createdBy = u.id
          WHERE u.email LIKE '%test%'
             OR u.email LIKE '%manual%'
             OR u.email LIKE '%bulk%'
             OR u.email LIKE '%qvs%'
          GROUP BY u.id
      ) audit
    `);

    const s = summary[0];
    console.log(`Total usuarios de prueba: ${s.total_test_users}`);
    console.log(`  - Con proyectos: ${s.users_with_projects}`);
    console.log(`  - Con cotizaciones: ${s.users_with_quotations}`);
    console.log(`  - Con clientes: ${s.users_with_clients}`);
    console.log(`  - Con citas: ${s.users_with_appointments}`);
    console.log(`  - Sin relaciones (seguros de eliminar): ${s.total_test_users - Math.max(s.users_with_projects, s.users_with_quotations, s.users_with_clients, s.users_with_appointments)}\n`);

    console.log('='.repeat(120) + '\n');
    console.log('⚠️  NOTA: Este es solo un AUDIT. No se modificó nada en la base de datos.\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
