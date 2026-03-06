import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function createTestRecords() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🔄 Creando registros de prueba con dataOrigin = "system"...\n');
    
    // 1. Create test user
    console.log('📝 Creando usuario de prueba...');
    const testUserOpenId = `system-test-user-${Date.now()}`;
    
    await connection.execute(
      `INSERT INTO users (openId, name, email, role, dataOrigin, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [testUserOpenId, 'Usuario Prueba Sistema', 'test-system@example.com', 'user', 'system']
    );
    console.log(`✓ Usuario creado: ${testUserOpenId}`);
    
    // Get the created user ID
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE openId = ? LIMIT 1',
      [testUserOpenId]
    );
    const userId = users[0].id;
    
    // 2. Create test client
    console.log('📝 Creando cliente de prueba...');
    const testClientName = `Cliente Prueba ${Date.now()}`;
    
    await connection.execute(
      `INSERT INTO clients (name, email, whatsappPhone, address, dataOrigin, userId, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [testClientName, 'test-client@example.com', '+573001234567', 'Calle Prueba 123', 'system', userId]
    );
    console.log(`✓ Cliente creado: ${testClientName}`);
    
    // Get the created client ID
    const [clients] = await connection.execute(
      'SELECT id FROM clients WHERE name = ? LIMIT 1',
      [testClientName]
    );
    const clientId = clients[0].id;
    
    // 3. Create test project
    console.log('📝 Creando proyecto de prueba...');
    const testProjectName = `Proyecto Prueba ${Date.now()}`;
    
    await connection.execute(
      `INSERT INTO projects (
        name, clientId, workType, status, dataOrigin, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [testProjectName, clientId, 'cocina', 'contacto', 'system', userId]
    );
    console.log(`✓ Proyecto creado: ${testProjectName}`);
    
    // Get the created project ID
    const [projects] = await connection.execute(
      'SELECT id FROM projects WHERE name = ? LIMIT 1',
      [testProjectName]
    );
    const projectId = projects[0].id;
    
    // 4. Create test quotation
    console.log('📝 Creando cotización de prueba...');
    const quotationNumber = `COT/TEST-${Date.now()}`;
    
    await connection.execute(
      `INSERT INTO quotations (
        quotationNumber, clientId, vendorName, productType, status, subtotal, transportCost, total, dataOrigin, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [quotationNumber, clientId, 'Innovar Cocinas', 'cocina', 'draft', 1000000, 600000, 1600000, 'system', userId]
    );
    console.log(`✓ Cotización creada: ${quotationNumber}`);
    
    // 5. Create test task
    console.log('📝 Creando tarea de prueba...');
    const testTaskName = `Tarea Prueba ${Date.now()}`;
    
    await connection.execute(
      `INSERT INTO tasks (
        title, projectId, status, dataOrigin, assignedTo, assignedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [testTaskName, projectId, 'pendiente', 'system', userId, userId]
    );
    console.log(`✓ Tarea creada: ${testTaskName}`);
    
    // 6. Create test appointment
    console.log('📝 Creando cita de prueba...');
    const testAppointmentDate = new Date();
    testAppointmentDate.setDate(testAppointmentDate.getDate() + 1);
    
    await connection.execute(
      `INSERT INTO appointments (
        clientId, scheduledDate, status, dataOrigin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [clientId, testAppointmentDate, 'pendiente', 'system']
    );
    console.log(`✓ Cita creada para: ${testAppointmentDate.toLocaleDateString()}`);
    
    console.log('\n✅ Todos los registros de prueba han sido creados exitosamente!\n');
    console.log('📊 Resumen de registros creados:');
    console.log(`   • Usuario: ${testUserOpenId}`);
    console.log(`   • Cliente: ${testClientName}`);
    console.log(`   • Proyecto: ${testProjectName}`);
    console.log(`   • Cotización: ${quotationNumber}`);
    console.log(`   • Tarea: ${testTaskName}`);
    console.log(`   • Cita: ${testAppointmentDate.toLocaleDateString()}`);
    console.log('\n💡 Estos registros aparecerán SOLO en el módulo "LIMPIEZA DE SISTEMA"');
    console.log('💡 No aparecerán en los dashboards operacionales normales\n');
    
  } catch (error) {
    console.error('❌ Error al crear registros de prueba:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

createTestRecords().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
