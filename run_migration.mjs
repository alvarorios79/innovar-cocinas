import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const urlObj = new URL(dbUrl);
const config = {
  host: urlObj.hostname,
  user: urlObj.username,
  password: urlObj.password,
  database: urlObj.pathname.slice(1),
  port: urlObj.port || 3306,
  ssl: 'amazon',
};

try {
  const connection = await mysql.createConnection(config);
  
  console.log('Ejecutando migraciones...');
  
  const migrations = [
    "ALTER TABLE `accountingClosureProjects` ADD COLUMN `originalPrice` decimal(15,2) DEFAULT '0' NOT NULL;",
    "ALTER TABLE `accountingClosureProjects` ADD COLUMN `discountsApplied` decimal(15,2) DEFAULT '0' NOT NULL;",
    "ALTER TABLE `accountingClosureProjects` ADD COLUMN `surchargesApplied` decimal(15,2) DEFAULT '0' NOT NULL;",
    "ALTER TABLE `accountingClosureProjects` ADD COLUMN `netPrice` decimal(15,2) DEFAULT '0' NOT NULL;",
  ];
  
  for (const migration of migrations) {
    try {
      await connection.execute(migration);
      console.log('✅', migration.substring(0, 50) + '...');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo ya existe:', migration.substring(0, 50) + '...');
      } else {
        throw error;
      }
    }
  }
  
  console.log('\n✅ Migraciones completadas');
  await connection.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
