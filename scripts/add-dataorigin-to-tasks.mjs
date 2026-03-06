import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function addDataOriginToTasks() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🔄 Agregando columna dataOrigin a tabla tasks...\n');
    
    // Check if column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'dataOrigin'`
    );
    
    if (columns.length > 0) {
      console.log('✓ La columna dataOrigin ya existe en la tabla tasks');
      return;
    }
    
    // Add the column
    await connection.execute(
      `ALTER TABLE tasks ADD COLUMN dataOrigin ENUM('manual', 'system') NOT NULL DEFAULT 'manual'`
    );
    
    console.log('✓ Columna dataOrigin agregada exitosamente a la tabla tasks');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addDataOriginToTasks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
