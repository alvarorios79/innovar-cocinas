#!/usr/bin/env node

/**
 * Script para reconstruir la tabla de cotizaciones desde PDFs en S3
 * 
 * Procedimiento:
 * 1. Leer quotations-found.json
 * 2. Para cada PDF, extraer metadatos
 * 3. Buscar cliente por nombre o crear uno genérico
 * 4. Crear registro de cotización
 * 5. Generar reporte de recuperación
 */

import fs from 'fs';
import mysql from 'mysql2/promise';

const ENV = {
  databaseUrl: process.env.DATABASE_URL || '',
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || '',
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || '',
};

if (!ENV.databaseUrl || !ENV.forgeApiUrl || !ENV.forgeApiKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, '');
const apiKey = ENV.forgeApiKey;

let pool = null;
const clientCache = {}; // Cache de clientes para evitar búsquedas repetidas

/**
 * Conectar a la base de datos
 */
async function connectDB() {
  if (pool) return pool;
  
  try {
    pool = mysql.createPool(ENV.databaseUrl);
    console.log('✅ Conectado a la base de datos\n');
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a BD:', error.message);
    process.exit(1);
  }
}

/**
 * Obtener URL de descarga para un archivo en S3
 */
async function getDownloadUrl(relKey) {
  try {
    const url = new URL('v1/storage/downloadUrl', baseUrl + '/');
    url.searchParams.set('path', relKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    return null;
  }
}

/**
 * Descargar PDF y extraer metadatos
 */
async function extractPDFMetadata(quotationNumber, downloadUrl) {
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return {
        quotationNumber,
        clientName: null,
        total: null,
        date: null,
      };
    }

    const buffer = await response.arrayBuffer();
    const text = Buffer.from(buffer).toString('utf-8', 0, Math.min(10000, buffer.byteLength));
    
    // Intentar extraer cliente
    let clientName = null;
    const clientMatch = text.match(/Cliente[:\s]+([^\n]+)/i) || 
                       text.match(/Client[:\s]+([^\n]+)/i);
    if (clientMatch) {
      clientName = clientMatch[1].trim().substring(0, 255);
    }

    // Intentar extraer total
    let total = null;
    const totalMatch = text.match(/Total[:\s]*\$?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      const totalStr = totalMatch[1].replace(/,/g, '');
      total = parseFloat(totalStr);
    }

    // Intentar extraer fecha
    let date = null;
    const dateMatch = text.match(/Fecha[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
                     text.match(/Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dateMatch) {
      date = dateMatch[1];
    }

    return {
      quotationNumber,
      clientName,
      total,
      date,
    };
  } catch (error) {
    return {
      quotationNumber,
      clientName: null,
      total: null,
      date: null,
    };
  }
}

/**
 * Obtener o crear cliente
 */
async function getOrCreateClient(clientName) {
  // Usar cliente genérico si no hay nombre
  if (!clientName || clientName === 'Desconocido') {
    // Buscar cliente genérico
    if (clientCache['GENERIC']) {
      return clientCache['GENERIC'];
    }
    
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query(
        'SELECT id FROM clients WHERE name = ? LIMIT 1',
        ['Cliente Recuperado']
      );
      connection.release();
      
      if (rows.length > 0) {
        clientCache['GENERIC'] = rows[0].id;
        return rows[0].id;
      }
    } catch (error) {
      console.error(`  ⚠️  Error buscando cliente genérico: ${error.message}`);
    }
    
    // Crear cliente genérico
    try {
      const connection = await pool.getConnection();
      const result = await connection.query(
        `INSERT INTO clients (name, whatsappPhone, dataOrigin) 
         VALUES (?, ?, ?)`,
        ['Cliente Recuperado', '0000000000', 'system']
      );
      connection.release();
      
      const clientId = result[0].insertId;
      clientCache['GENERIC'] = clientId;
      return clientId;
    } catch (error) {
      console.error(`  ⚠️  Error creando cliente genérico: ${error.message}`);
      return null;
    }
  }
  
  // Buscar cliente por nombre
  if (clientCache[clientName]) {
    return clientCache[clientName];
  }
  
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id FROM clients WHERE name = ? LIMIT 1',
      [clientName]
    );
    connection.release();
    
    if (rows.length > 0) {
      clientCache[clientName] = rows[0].id;
      return rows[0].id;
    }
  } catch (error) {
    console.error(`  ⚠️  Error buscando cliente: ${error.message}`);
  }
  
  // Crear cliente nuevo
  try {
    const connection = await pool.getConnection();
    const result = await connection.query(
      `INSERT INTO clients (name, whatsappPhone, dataOrigin) 
       VALUES (?, ?, ?)`,
      [clientName, '0000000000', 'system']
    );
    connection.release();
    
    const clientId = result[0].insertId;
    clientCache[clientName] = clientId;
    return clientId;
  } catch (error) {
    console.error(`  ⚠️  Error creando cliente: ${error.message}`);
    return null;
  }
}

/**
 * Verificar si una cotización ya existe
 */
async function quotationExists(quotationNumber) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id FROM quotations WHERE quotationNumber = ?',
      [quotationNumber]
    );
    connection.release();
    return rows.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Crear nuevo registro de cotización
 */
async function createQuotation(metadata, pdfUrl, clientId) {
  try {
    const connection = await pool.getConnection();
    
    // Usar valores por defecto para campos requeridos
    const subtotal = metadata.total || 0;
    const total = metadata.total || 0;
    const createdAt = new Date().toISOString();
    const createdBy = 1; // Usuario por defecto (super_admin)
    
    await connection.query(
      `INSERT INTO quotations (
        quotationNumber, clientId, vendorName, productType, status, subtotal, 
        transportCost, total, pdfUrl, createdBy, createdAt, updatedAt,
        dataOrigin, versionNumber
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metadata.quotationNumber,
        clientId,
        'INNOVAR Cocinas Integrales',
        'otro',
        'draft',
        subtotal,
        600000, // transportCost por defecto
        total,
        pdfUrl,
        createdBy,
        createdAt,
        createdAt,
        'system', // Marcar como recuperado del sistema
        1, // versionNumber
      ]
    );
    
    connection.release();
    return true;
  } catch (error) {
    console.error(`  ❌ Error creando cotización: ${error.message}`);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  console.log('🔄 Reconstruyendo tabla de cotizaciones desde PDFs...\n');
  
  // Conectar a BD
  await connectDB();
  
  // Leer lista de cotizaciones
  const quotationsFile = '/home/ubuntu/innovar_cocinas/quotations-found.json';
  if (!fs.existsSync(quotationsFile)) {
    console.error('❌ No se encontró quotations-found.json');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(quotationsFile, 'utf-8'));
  const quotationNumbers = data.quotations;
  
  console.log(`📋 Procesando ${quotationNumbers.length} cotizaciones...\n`);
  
  const report = {
    timestamp: new Date().toISOString(),
    totalProcessed: 0,
    restored: 0,
    duplicates: 0,
    errors: 0,
    incompleteData: 0,
    details: [],
  };
  
  for (let i = 0; i < quotationNumbers.length; i++) {
    const quotationNumber = quotationNumbers[i];
    
    // Mostrar progreso cada 100
    if ((i + 1) % 100 === 0) {
      console.log(`   [${i + 1}/${quotationNumbers.length}] Restauradas: ${report.restored}, Duplicadas: ${report.duplicates}`);
    }
    
    report.totalProcessed++;
    
    try {
      // Verificar si ya existe
      const exists = await quotationExists(quotationNumber);
      if (exists) {
        report.duplicates++;
        report.details.push({
          quotationNumber,
          status: 'duplicate',
          reason: 'Ya existe en la base de datos',
        });
        continue;
      }
      
      // Obtener URL del PDF
      const pdfKey = `quotations/${quotationNumber}/v1.pdf`;
      const pdfUrl = await getDownloadUrl(pdfKey);
      
      if (!pdfUrl) {
        report.errors++;
        report.details.push({
          quotationNumber,
          status: 'error',
          reason: 'No se pudo obtener URL del PDF',
        });
        continue;
      }
      
      // Extraer metadatos del PDF
      const metadata = await extractPDFMetadata(quotationNumber, pdfUrl);
      
      // Obtener o crear cliente
      const clientId = await getOrCreateClient(metadata.clientName);
      if (!clientId) {
        report.errors++;
        report.details.push({
          quotationNumber,
          status: 'error',
          reason: 'No se pudo obtener o crear cliente',
        });
        continue;
      }
      
      // Crear registro
      const success = await createQuotation(metadata, pdfUrl, clientId);
      
      if (success) {
        report.restored++;
        const hasIncomplete = !metadata.clientName || !metadata.total;
        if (hasIncomplete) {
          report.incompleteData++;
        }
        report.details.push({
          quotationNumber,
          status: 'restored',
          clientName: metadata.clientName,
          total: metadata.total,
          hasIncompleteData: hasIncomplete,
        });
      } else {
        report.errors++;
        report.details.push({
          quotationNumber,
          status: 'error',
          reason: 'Error creando registro',
        });
      }
    } catch (error) {
      report.errors++;
      report.details.push({
        quotationNumber,
        status: 'error',
        reason: error.message,
      });
    }
  }
  
  // Mostrar resumen
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 REPORTE DE RECONSTRUCCIÓN:\n');
  console.log(`   Total procesadas: ${report.totalProcessed}`);
  console.log(`   ✅ Restauradas: ${report.restored}`);
  console.log(`   ⚠️  Duplicadas: ${report.duplicates}`);
  console.log(`   ❌ Errores: ${report.errors}`);
  console.log(`   📝 Con datos incompletos: ${report.incompleteData}`);
  
  // Guardar reporte detallado
  const reportPath = '/home/ubuntu/innovar_cocinas/reconstruction-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Reporte detallado guardado en: ${reportPath}`);
  
  // Cerrar conexión
  if (pool) {
    await pool.end();
  }
  
  console.log('\n✅ Reconstrucción completada');
}

main().catch(error => {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
});
