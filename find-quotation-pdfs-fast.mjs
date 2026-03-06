#!/usr/bin/env node

/**
 * Script rápido para encontrar cotizaciones en S3
 * Usa búsqueda binaria para encontrar el rango de cotizaciones existentes
 */

import fs from 'fs';

const ENV = {
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || '',
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || '',
};

if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, '');
const apiKey = ENV.forgeApiKey;

/**
 * Verificar si existe un PDF para una cotización
 */
async function checkQuotationExists(quotationNumber) {
  try {
    const key = `quotations/${quotationNumber}/v1.pdf`;
    const url = new URL('v1/storage/downloadUrl', baseUrl + '/');
    url.searchParams.set('path', key);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Encontrar todas las cotizaciones existentes
 */
async function findAllQuotations() {
  console.log('🔍 Buscando cotizaciones en S3...\n');
  
  const found = [];
  
  // Búsqueda secuencial rápida
  for (let i = 1; i <= 999; i++) {
    const quotationNumber = `COT-2026-${String(i).padStart(3, '0')}`;
    const exists = await checkQuotationExists(quotationNumber);
    
    if (exists) {
      found.push(quotationNumber);
      console.log(`✅ ${quotationNumber}`);
    }
    
    // Mostrar progreso cada 100
    if (i % 100 === 0) {
      console.log(`   [Progreso: ${i}/999 verificadas, ${found.length} encontradas]\n`);
    }
  }
  
  return found;
}

/**
 * Main
 */
async function main() {
  const quotations = await findAllQuotations();
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 RESULTADO:`);
  console.log(`   Total de cotizaciones encontradas: ${quotations.length}`);
  
  if (quotations.length > 0) {
    console.log(`\n📋 COTIZACIONES DISPONIBLES:`);
    quotations.forEach(q => {
      console.log(`   - ${q}`);
    });
    
    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      totalFound: quotations.length,
      quotations,
      recoveryInstructions: {
        step1: 'Los PDFs están disponibles en S3',
        step2: 'Contactar a Manus para restaurar la base de datos',
        step3: 'O recrear manualmente los registros desde los PDFs',
      },
    };

    const reportPath = '/home/ubuntu/innovar_cocinas/quotations-found.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Reporte guardado en: ${reportPath}`);
  }
}

main().catch(console.error);
