import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);

try {
  // Query 1: Total users
  const [totalUsers] = await connection.execute("SELECT COUNT(*) AS total_users FROM users");
  console.log("\n=== QUERY 1: Total Users ===");
  console.log(JSON.stringify(totalUsers[0], null, 2));

  // Query 2: Distribution by dataOrigin
  const [byOrigin] = await connection.execute("SELECT dataOrigin, COUNT(*) AS count_by_origin FROM users GROUP BY dataOrigin");
  console.log("\n=== QUERY 2: Distribution by dataOrigin ===");
  console.log(JSON.stringify(byOrigin, null, 2));

  // Query 3: System users
  const [systemUsers] = await connection.execute("SELECT COUNT(*) AS total_system_users FROM users WHERE dataOrigin = 'system'");
  console.log("\n=== QUERY 3: System Users ===");
  console.log(JSON.stringify(systemUsers[0], null, 2));

  // Query 4: Test pattern users
  const [testUsers] = await connection.execute("SELECT COUNT(*) AS test_pattern_users FROM users WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%bulk%'");
  console.log("\n=== QUERY 4: Test Pattern Users ===");
  console.log(JSON.stringify(testUsers[0], null, 2));

  // Query 5: Database name
  const [dbName] = await connection.execute("SELECT DATABASE() AS current_database");
  console.log("\n=== QUERY 5: Current Database ===");
  console.log(JSON.stringify(dbName[0], null, 2));

} finally {
  await connection.end();
}
