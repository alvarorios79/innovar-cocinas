#!/usr/bin/env node
/**
 * Script de migración para reestructurar tabla quotations
 * - Respalda datos existentes
 * - Elimina tabla antigua
 * - Crea nueva estructura
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    console.log('🔍 Verificando datos existentes en quotations...');
    
    // Verificar si hay datos
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM quotations');
    const count = rows[0].count;
    
    console.log(`📊 Encontradas ${count} cotizaciones existentes`);
    
    if (count > 0) {
      console.log('⚠️  ADVERTENCIA: Se encontraron cotizaciones existentes.');
      console.log('⚠️  Estas cotizaciones están en formato antiguo y no son compatibles con el nuevo sistema.');
      console.log('⚠️  Se eliminarán para crear la nueva estructura.');
      console.log('');
      console.log('💡 Si necesitas conservar estos datos, cancela ahora (Ctrl+C)');
      console.log('');
      
      // Esperar 5 segundos
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🗑️  Eliminando foreign key constraints...');
    // Intentar eliminar foreign keys (ignorar si no existen)
    try {
      await connection.query('ALTER TABLE projects DROP FOREIGN KEY projects_quotationId_quotations_id_fk');
    } catch (e) {
      // Ignorar si no existe
    }
    
    console.log('🗑️  Eliminando tablas antiguas...');
    // Primero eliminar quotation_items (tabla hija)
    await connection.query('DROP TABLE IF EXISTS quotation_items');
    await connection.query('DROP TABLE IF EXISTS quotationItems');
    // Luego eliminar quotations (tabla padre)
    await connection.query('DROP TABLE IF EXISTS quotations');
    
    console.log('✅ Tablas eliminadas exitosamente');
    console.log('');
    console.log('📝 Ahora ejecuta: pnpm db:push');
    console.log('   Esto creará las nuevas tablas con la estructura actualizada');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate()
  .then(() => {
    console.log('✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migración fallida:', error);
    process.exit(1);
  });
