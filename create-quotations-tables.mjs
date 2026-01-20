#!/usr/bin/env node
/**
 * Script para crear tablas de cotizaciones directamente con SQL
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

async function createTables() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log('📝 Creando tabla quotations...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotationNumber VARCHAR(50) NOT NULL UNIQUE,
        clientId INT NOT NULL,
        vendorName VARCHAR(255) NOT NULL,
        workType TEXT NOT NULL,
        status ENUM('draft', 'sent', 'approved', 'rejected') DEFAULT 'draft' NOT NULL,
        validUntil TIMESTAMP NULL,
        subtotal DECIMAL(12, 2) NOT NULL,
        fixedCosts DECIMAL(12, 2) DEFAULT 600000 NOT NULL,
        total DECIMAL(12, 2) NOT NULL,
        pdfUrl TEXT NULL,
        sentAt TIMESTAMP NULL,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (clientId) REFERENCES clients(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ Tabla quotations creada');
    
    console.log('📝 Creando tabla quotationItems...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quotationItems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotationId INT NOT NULL,
        itemNumber INT NOT NULL,
        description TEXT NOT NULL,
        quantity VARCHAR(50) NOT NULL,
        unitPrice VARCHAR(50) NULL,
        totalPrice DECIMAL(12, 2) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ Tabla quotationItems creada');
    
    console.log('');
    console.log('🎉 Tablas de cotizaciones creadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTables()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Proceso fallido:', error);
    process.exit(1);
  });
