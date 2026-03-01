import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

(async () => {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('\n' + '='.repeat(100));
    console.log('AUDIT: USUARIOS DE PRUEBA');
    console.log('='.repeat(100) + '\n');

    // Query 1: Contar usuarios de prueba
    const [countResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN dataOrigin = 'manual' THEN 1 ELSE 0 END) as manual_count,
        SUM(CASE WHEN dataOrigin = 'system' THEN 1 ELSE 0 END) as system_count
      FROM users
      WHERE email LIKE '%test%' 
         OR email LIKE '%manual%' 
         OR email LIKE '%bulk%' 
         OR email LIKE '%qvs%'
    `);

    const { total, manual_count, system_count } = countResult[0];
    
    console.log('📊 RESUMEN DE USUARIOS DE PRUEBA:\n');
    console.log(`Total usuarios de prueba: ${total}`);
    console.log(`  - Con dataOrigin "manual": ${manual_count}`);
    console.log(`  - Con dataOrigin "system": ${system_count}\n`);

    // Query 2: Listar primeros 10
    const [users] = await connection.execute(`
      SELECT id, email, name, dataOrigin
      FROM users
      WHERE email LIKE '%test%' 
         OR email LIKE '%manual%' 
         OR email LIKE '%bulk%' 
         OR email LIKE '%qvs%'
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log('📋 PRIMEROS 10 USUARIOS DE PRUEBA:\n');
    console.log('ID | Email | Name | dataOrigin');
    console.log('-'.repeat(100));
    users.forEach(u => {
      console.log(`${u.id} | ${u.email} | ${u.name} | ${u.dataOrigin}`);
    });

    console.log('\n' + '='.repeat(100) + '\n');
    console.log('⚠️  NOTA: Los usuarios con dataOrigin="manual" NO se eliminan con "Zona Crítica"');
    console.log('⚠️  NOTA: Los usuarios con dataOrigin="system" SÍ se eliminan con "Zona Crítica"\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
