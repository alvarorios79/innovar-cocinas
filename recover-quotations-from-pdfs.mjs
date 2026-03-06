#!/usr/bin/env node

/**
 * Script para recuperar información de cotizaciones desde PDFs almacenados en S3
 * 
 * Estrategia:
 * 1. Usar patrones conocidos de nombres de archivos
 * 2. Intentar acceder a URLs directas de S3
 * 3. Extraer metadatos de los PDFs
 * 4. Reconstruir registros de cotizaciones
 */

import fs from 'fs';
import path from 'path';

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
 * Generar números de cotización posibles basado en patrones
 * Formato: COT-YYYY-NNN
 */
function generatePossibleQuotationNumbers() {
  const numbers = [];
  const year = 2026;
  
  // Generar números del 1 al 999
  for (let i = 1; i <= 999; i++) {
    numbers.push(`COT-${year}-${String(i).padStart(3, '0')}`);
  }
  
  return numbers;
}

/**
 * Verificar si existe un PDF para una cotización
 */
async function checkQuotationPDF(quotationNumber) {
  // Intentar múltiples versiones
  for (let v = 1; v <= 10; v++) {
    const key = `quotations/${quotationNumber}/v${v}.pdf`;
    const downloadUrl = await getDownloadUrl(key);
    
    if (downloadUrl) {
      return {
        quotationNumber,
        version: v,
        key,
        downloadUrl,
      };
    }
  }
  
  return null;
}

/**
 * Descargar PDF y extraer metadatos básicos
 */
async function downloadAndAnalyzePDF(downloadUrl, quotationNumber) {
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const text = Buffer.from(buffer).toString('utf-8', 0, Math.min(5000, buffer.byteLength));
    
    // Intentar extraer información del texto del PDF
    const info = {
      quotationNumber,
      size: buffer.byteLength,
      hasContent: text.length > 100,
    };
    
    // Buscar patrones comunes en PDFs
    if (text.includes('Cliente') || text.includes('client')) {
      info.hasClientInfo = true;
    }
    if (text.includes('Total') || text.includes('total')) {
      info.hasPriceInfo = true;
    }
    if (text.includes('Fecha') || text.includes('Date')) {
      info.hasDateInfo = true;
    }
    
    return info;
  } catch (error) {
    return null;
  }
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Recuperando información de cotizaciones desde PDFs en S3...\n');
  
  const possibleNumbers = generatePossibleQuotationNumbers();
  console.log(`📋 Verificando ${possibleNumbers.length} números de cotización posibles...\n`);
  
  const foundQuotations = [];
  let checked = 0;
  let found = 0;

  for (const quotationNumber of possibleNumbers) {
    checked++;
    
    // Mostrar progreso cada 50 verificaciones
    if (checked % 50 === 0) {
      console.log(`   Verificadas: ${checked}/${possibleNumbers.length} (${found} encontradas)`);
    }

    const pdfInfo = await checkQuotationPDF(quotationNumber);
    
    if (pdfInfo) {
      found++;
      console.log(`\n✅ Encontrada: ${quotationNumber} (v${pdfInfo.version})`);
      
      // Intentar descargar y analizar
      const analysis = await downloadAndAnalyzePDF(pdfInfo.downloadUrl, quotationNumber);
      if (analysis) {
        foundQuotations.push({
          ...pdfInfo,
          analysis,
        });
        console.log(`   Tamaño: ${(pdfInfo.downloadUrl.length)} bytes`);
        console.log(`   Análisis: ${JSON.stringify(analysis)}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(100));
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total verificadas: ${checked}`);
  console.log(`   Cotizaciones encontradas: ${found}`);

  if (foundQuotations.length > 0) {
    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      totalFound: foundQuotations.length,
      quotations: foundQuotations,
    };

    const reportPath = '/home/ubuntu/innovar_cocinas/recovered-quotations.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Reporte guardado en: ${reportPath}`);
    
    // Mostrar lista de cotizaciones encontradas
    console.log('\n📄 COTIZACIONES RECUPERABLES:');
    for (const q of foundQuotations) {
      console.log(`   - ${q.quotationNumber} (v${q.version})`);
      console.log(`     Enlace: ${q.downloadUrl}`);
    }
  } else {
    console.log('\n❌ No se encontraron cotizaciones');
  }
}

main().catch(console.error);
