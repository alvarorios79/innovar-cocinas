import mysql from 'mysql2/promise';

try {
  // Parsear DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('❌ DATABASE_URL no configurada');
    process.exit(1);
  }

  // Formato: mysql://user:password@host:port/database
  const urlObj = new URL(dbUrl);
  const config = {
    host: urlObj.hostname,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1),
    port: urlObj.port || 3306,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  };

  console.log('Conectando a BD:', config.host, config.database);
  const connection = await mysql.createConnection(config);

  // Buscar proyecto de Diana Ortiz
  const [projects] = await connection.execute(
    `SELECT id, name, totalAmount, clientId, isArchived, status 
     FROM projects 
     WHERE name LIKE ? 
     LIMIT 1`,
    ['%COT-2026-1772833387890-1825427%']
  );

  if (projects.length === 0) {
    console.log('❌ Proyecto no encontrado con ese nombre');
    
    // Intentar buscar por cliente
    const [clients] = await connection.execute(
      'SELECT id FROM clients WHERE name LIKE ? LIMIT 1',
      ['%Diana Ortiz%']
    );
    
    if (clients.length > 0) {
      const [projByClient] = await connection.execute(
        'SELECT id, name, totalAmount FROM projects WHERE clientId = ? AND isArchived = 1 ORDER BY createdAt DESC LIMIT 1',
        [clients[0].id]
      );
      
      if (projByClient.length > 0) {
        console.log('✅ Proyecto encontrado por cliente Diana Ortiz:');
        console.log('Nombre:', projByClient[0].name);
        console.log('Precio Original:', projByClient[0].totalAmount);
      }
    }
    
    await connection.end();
    process.exit(1);
  }

  const project = projects[0];
  console.log('\n✅ PROYECTO ENCONTRADO');
  console.log('ID:', project.id);
  console.log('Nombre:', project.name);
  console.log('Precio Original (totalAmount):', project.totalAmount);
  console.log('Archivado:', project.isArchived);
  console.log('Status:', project.status);

  // Obtener pagos
  const [payments] = await connection.execute(
    `SELECT id, amount, movementType, receivedAt 
     FROM payments 
     WHERE projectId = ? 
     ORDER BY receivedAt DESC`,
    [project.id]
  );

  console.log('\n📊 PAGOS Y MOVIMIENTOS:');
  let totalPayments = 0;
  let totalDiscounts = 0;
  let totalSurcharges = 0;

  payments.forEach(p => {
    console.log(`  ${p.movementType.toUpperCase()}: $${p.amount}`);
    if (p.movementType === 'payment') totalPayments += parseFloat(p.amount);
    if (p.movementType === 'discount') totalDiscounts += parseFloat(p.amount);
    if (p.movementType === 'surcharge') totalSurcharges += parseFloat(p.amount);
  });

  console.log('\n💰 RESUMEN FINANCIERO:');
  console.log('  Precio Original:', parseFloat(project.totalAmount));
  console.log('  - Descuentos:', totalDiscounts);
  console.log('  + Recargos:', totalSurcharges);
  console.log('  = Precio Neto:', parseFloat(project.totalAmount) - totalDiscounts + totalSurcharges);
  console.log('  Total Pagos:', totalPayments);

  // Buscar en cierre contable
  const [closureProjects] = await connection.execute(
    `SELECT closureId, projectValue, totalPaid, totalExpenses, profit 
     FROM accountingClosureProjects 
     WHERE projectId = ?`,
    [project.id]
  );

  if (closureProjects.length > 0) {
    console.log('\n📋 EN CIERRE CONTABLE:');
    closureProjects.forEach(cp => {
      console.log('  Cierre ID:', cp.closureId);
      console.log('  projectValue (usado):', cp.projectValue);
      console.log('  totalPaid (usado):', cp.totalPaid);
      console.log('  totalExpenses:', cp.totalExpenses);
      console.log('  profit:', cp.profit);
    });
  } else {
    console.log('\n⚠️  Este proyecto NO está en ningún cierre contable aún');
  }

  await connection.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
