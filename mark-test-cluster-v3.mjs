import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('MARCAR CLUSTER DE PRUEBA COMO dataOrigin = "system"');
    console.log('='.repeat(120) + '\n');

    // PASO 1: Identificar usuarios de prueba
    console.log('📋 PASO 1: Identificando usuarios de prueba...\n');
    
    const [testUsers] = await connection.execute(`
      SELECT id FROM users
      WHERE email LIKE '%test%'
         OR email LIKE '%manual%'
         OR email LIKE '%bulk%'
         OR email LIKE '%qvs%'
    `);

    const testUserIds = testUsers.map(u => u.id);
    console.log(`✓ Usuarios de prueba identificados: ${testUserIds.length}\n`);

    if (testUserIds.length === 0) {
      console.log('No hay usuarios de prueba para marcar.\n');
      await connection.end();
      return;
    }

    // PASO 2: Marcar TODO como system
    console.log('📝 PASO 2: Marcando cluster como dataOrigin = "system"...\n');

    const placeholders = testUserIds.map(() => '?').join(',');

    // Appointments: clientId -> clients -> userId
    const [appointmentsResult] = await connection.execute(`
      UPDATE appointments
      SET dataOrigin = 'system'
      WHERE clientId IN (
        SELECT id FROM clients WHERE userId IN (${placeholders})
      )
    `, testUserIds);
    console.log(`✓ Appointments actualizados: ${appointmentsResult.affectedRows}`);

    // Quotations: userId
    const [quotationsResult] = await connection.execute(`
      UPDATE quotations
      SET dataOrigin = 'system'
      WHERE userId IN (${placeholders})
    `, testUserIds);
    console.log(`✓ Quotations actualizadas: ${quotationsResult.affectedRows}`);

    // Projects: userId
    const [projectsResult] = await connection.execute(`
      UPDATE projects
      SET dataOrigin = 'system'
      WHERE userId IN (${placeholders})
    `, testUserIds);
    console.log(`✓ Projects actualizados: ${projectsResult.affectedRows}`);

    // Clients: userId
    const [clientsResult] = await connection.execute(`
      UPDATE clients
      SET dataOrigin = 'system'
      WHERE userId IN (${placeholders})
    `, testUserIds);
    console.log(`✓ Clients actualizados: ${clientsResult.affectedRows}`);

    // Users: id
    const [usersResult] = await connection.execute(`
      UPDATE users
      SET dataOrigin = 'system'
      WHERE id IN (${placeholders})
    `, testUserIds);
    console.log(`✓ Users actualizados: ${usersResult.affectedRows}\n`);

    // PASO 3: Verificación
    console.log('='.repeat(120));
    console.log('✅ PASO 3: VERIFICACIÓN\n');

    const [usersVerify] = await connection.execute(`
      SELECT dataOrigin, COUNT(*) as count FROM users GROUP BY dataOrigin
    `);
    console.log('📊 USERS:');
    usersVerify.forEach(row => {
      console.log(`   ${row.dataOrigin}: ${row.count}`);
    });

    const [clientsVerify] = await connection.execute(`
      SELECT dataOrigin, COUNT(*) as count FROM clients GROUP BY dataOrigin
    `);
    console.log('\n📊 CLIENTS:');
    clientsVerify.forEach(row => {
      console.log(`   ${row.dataOrigin}: ${row.count}`);
    });

    const [projectsVerify] = await connection.execute(`
      SELECT dataOrigin, COUNT(*) as count FROM projects GROUP BY dataOrigin
    `);
    console.log('\n📊 PROJECTS:');
    projectsVerify.forEach(row => {
      console.log(`   ${row.dataOrigin}: ${row.count}`);
    });

    const [quotationsVerify] = await connection.execute(`
      SELECT dataOrigin, COUNT(*) as count FROM quotations GROUP BY dataOrigin
    `);
    console.log('\n📊 QUOTATIONS:');
    quotationsVerify.forEach(row => {
      console.log(`   ${row.dataOrigin}: ${row.count}`);
    });

    console.log('\n' + '='.repeat(120) + '\n');
    console.log('✅ CLUSTER DE PRUEBA MARCADO COMO "system"\n');
    console.log('⚠️  El botón "Zona Crítica" ahora puede eliminar este cluster completo.\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
