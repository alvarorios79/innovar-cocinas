import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);

try {
  console.log("📊 VERIFICACIÓN DESPUÉS DE LIMPIEZA\n");

  // Query 1: Total users
  const [totalUsers] = await connection.execute("SELECT COUNT(*) AS total_users FROM users");
  console.log("=== QUERY 1: Total Users ===");
  console.log(JSON.stringify(totalUsers[0], null, 2));

  // Query 2: Distribution by dataOrigin
  const [byOrigin] = await connection.execute("SELECT dataOrigin, COUNT(*) AS count_by_origin FROM users GROUP BY dataOrigin");
  console.log("\n=== QUERY 2: Distribution by dataOrigin ===");
  console.log(JSON.stringify(byOrigin, null, 2));

  // Query 3: Verify only manual users remain
  const [manualOnly] = await connection.execute("SELECT COUNT(*) AS manual_users FROM users WHERE dataOrigin = 'manual'");
  console.log("\n=== QUERY 3: Manual Users Only ===");
  console.log(JSON.stringify(manualOnly[0], null, 2));

  // Query 4: Verify no system users
  const [systemUsers] = await connection.execute("SELECT COUNT(*) AS system_users FROM users WHERE dataOrigin = 'system'");
  console.log("\n=== QUERY 4: System Users (should be 0) ===");
  console.log(JSON.stringify(systemUsers[0], null, 2));

} finally {
  await connection.end();
}
