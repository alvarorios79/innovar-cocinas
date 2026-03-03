import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);

try {
  console.log("🚀 Iniciando limpieza de datos system (versión corregida)...\n");

  // Ejecutar limpieza en transacción
  await connection.beginTransaction();

  // Contar antes de eliminar
  const [beforeCounts] = await connection.execute(`
    SELECT 
      (SELECT COUNT(*) FROM appointments WHERE dataOrigin = 'system') as appointments,
      (SELECT COUNT(*) FROM quotations WHERE dataOrigin = 'system') as quotations,
      (SELECT COUNT(*) FROM projects WHERE dataOrigin = 'system') as projects,
      (SELECT COUNT(*) FROM clients WHERE dataOrigin = 'system') as clients,
      (SELECT COUNT(*) FROM users WHERE dataOrigin = 'system') as users
  `);
  
  console.log("📊 ANTES DE LIMPIEZA:");
  console.log(JSON.stringify(beforeCounts[0], null, 2));

  // Eliminar en orden correcto
  const [appointmentsResult] = await connection.execute("DELETE FROM appointments WHERE dataOrigin = 'system'");
  console.log(`\n✅ Appointments eliminadas: ${appointmentsResult.affectedRows}`);

  const [quotationsResult] = await connection.execute("DELETE FROM quotations WHERE dataOrigin = 'system'");
  console.log(`✅ Quotations eliminadas: ${quotationsResult.affectedRows}`);

  const [projectsResult] = await connection.execute("DELETE FROM projects WHERE dataOrigin = 'system'");
  console.log(`✅ Projects eliminadas: ${projectsResult.affectedRows}`);

  // Eliminar clientes que pertenecen a usuarios system
  const [clientsResult] = await connection.execute(`
    DELETE FROM clients 
    WHERE userId IN (SELECT id FROM users WHERE dataOrigin = 'system')
  `);
  console.log(`✅ Clients eliminados: ${clientsResult.affectedRows}`);

  const [usersResult] = await connection.execute("DELETE FROM users WHERE dataOrigin = 'system'");
  console.log(`✅ Users eliminados: ${usersResult.affectedRows}`);

  await connection.commit();
  console.log("\n✅ Transacción completada exitosamente");

} catch (error) {
  await connection.rollback();
  console.error("❌ Error durante limpieza:", error.message);
  process.exit(1);
} finally {
  await connection.end();
}
