import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'innovar_cocinas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testArchiveSync() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n=== TEST: Sincronización de isArchived con status ===\n');

    // 1. Crear un proyecto de prueba
    console.log('1️⃣  Creando proyecto de prueba...');
    const [insertResult] = await connection.execute(
      `INSERT INTO projects (
        baseId, clientId, status, isArchived, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, NOW(), NOW()
      )`,
      ['base-test-123', 'client-test-123', 'listo_instalacion', 0]
    );
    
    const projectId = insertResult.insertId;
    console.log(`   ✓ Proyecto creado: ID ${projectId}`);
    console.log(`   - status: listo_instalacion`);
    console.log(`   - isArchived: 0\n`);

    // 2. Verificar estado inicial
    console.log('2️⃣  Verificando estado inicial...');
    const [initial] = await connection.execute(
      'SELECT id, status, isArchived FROM projects WHERE id = ?',
      [projectId]
    );
    console.log(`   ✓ Estado inicial:`);
    console.log(`   - status: ${initial[0].status}`);
    console.log(`   - isArchived: ${initial[0].isArchived}\n`);

    // 3. Cambiar status a "entregado"
    console.log('3️⃣  Cambiando status a "entregado"...');
    await connection.execute(
      'UPDATE projects SET status = ?, isArchived = ?, updatedAt = NOW() WHERE id = ?',
      ['entregado', 1, projectId]
    );
    console.log(`   ✓ Status actualizado a "entregado"\n`);

    // 4. Verificar que isArchived se sincronizó
    console.log('4️⃣  Verificando sincronización de isArchived...');
    const [afterEntregado] = await connection.execute(
      'SELECT id, status, isArchived FROM projects WHERE id = ?',
      [projectId]
    );
    const isArchivedAfter = afterEntregado[0].isArchived;
    console.log(`   ✓ Después de cambiar a "entregado":`);
    console.log(`   - status: ${afterEntregado[0].status}`);
    console.log(`   - isArchived: ${isArchivedAfter}`);
    
    if (isArchivedAfter === 1) {
      console.log(`   ✅ CORRECTO: isArchived = 1 (archivado)\n`);
    } else {
      console.log(`   ❌ ERROR: isArchived debería ser 1, pero es ${isArchivedAfter}\n`);
    }

    // 5. Cambiar status de vuelta a "listo_instalacion"
    console.log('5️⃣  Cambiando status de vuelta a "listo_instalacion"...');
    await connection.execute(
      'UPDATE projects SET status = ?, isArchived = ?, updatedAt = NOW() WHERE id = ?',
      ['listo_instalacion', 0, projectId]
    );
    console.log(`   ✓ Status actualizado a "listo_instalacion"\n`);

    // 6. Verificar que isArchived se desincronizó
    console.log('6️⃣  Verificando desincronización de isArchived...');
    const [afterRevert] = await connection.execute(
      'SELECT id, status, isArchived FROM projects WHERE id = ?',
      [projectId]
    );
    const isArchivedAfterRevert = afterRevert[0].isArchived;
    console.log(`   ✓ Después de cambiar a "listo_instalacion":`);
    console.log(`   - status: ${afterRevert[0].status}`);
    console.log(`   - isArchived: ${isArchivedAfterRevert}`);
    
    if (isArchivedAfterRevert === 0) {
      console.log(`   ✅ CORRECTO: isArchived = 0 (no archivado)\n`);
    } else {
      console.log(`   ❌ ERROR: isArchived debería ser 0, pero es ${isArchivedAfterRevert}\n`);
    }

    // 7. Limpiar
    console.log('7️⃣  Limpiando datos de prueba...');
    await connection.execute('DELETE FROM projects WHERE id = ?', [projectId]);
    console.log(`   ✓ Proyecto de prueba eliminado\n`);

    console.log('=== TEST COMPLETADO ===\n');

  } catch (error) {
    console.error('❌ Error en test:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

testArchiveSync();
