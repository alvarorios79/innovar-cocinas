import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(120));
    console.log('MARCAR CLUSTER DE PRUEBA COMO dataOrigin = "system"');
    console.log('='.repeat(120) + '\n');

    // PASO 1: Crear tabla temporal
    console.log('📋 PASO 1: Identificando usuarios de prueba...\n');
    
    await connection.execute(`
      CREATE TEMPORARY TABLE test_users AS
      SELECT id
      FROM users
      WHERE email LIKE '%test%'
         OR email LIKE '%manual%'
         OR email LIKE '%bulk%'
         OR email LIKE '%qvs%'
    `);

    const [countTestUsers] = await connection.execute(`SELECT COUNT(*) as count FROM test_users`);
    const testUserCount = countTestUsers[0].count;
    console.log(`✓ Usuarios de prueba identificados: ${testUserCount}\n`);

    // PASO 2: Marcar TODO como system
    console.log('📝 PASO 2: Marcando cluster como dataOrigin = "system"...\n');

    const [appointmentsResult] = await connection.execute(`
      UPDATE appointments
      SET dataOrigin = 'system'
      WHERE userId IN (SELECT id FROM test_users)
    `);
    console.log(`✓ Appointments actualizados: ${appointmentsResult.affectedRows}`);

    const [quotationsResult] = await connection.execute(`
      UPDATE quotations
      SET dataOrigin = 'system'
      WHERE userId IN (SELECT id FROM test_users)
    `);
    console.log(`✓ Quotations actualizadas: ${quotationsResult.affectedRows}`);

    const [projectsResult] = await connection.execute(`
      UPDATE projects
      SET dataOrigin = 'system'
      WHERE userId IN (SELECT id FROM test_users)
    `);
    console.log(`✓ Projects actualizados: ${projectsResult.affectedRows}`);

    const [clientsResult] = await connection.execute(`
      UPDATE clients
      SET dataOrigin = 'system'
      WHERE userId IN (SELECT id FROM test_users)
    `);
    console.log(`✓ Clients actualizados: ${clientsResult.affectedRows}`);

    const [usersResult] = await connection.execute(`
      UPDATE users
      SET dataOrigin = 'system'
      WHERE id IN (SELECT id FROM test_users)
    `);
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
