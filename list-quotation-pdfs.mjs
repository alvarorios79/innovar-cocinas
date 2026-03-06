#!/usr/bin/env node

/**
 * Script para listar todos los PDFs de cotizaciones disponibles en S3
 * Usa la API de Manus para acceder al almacenamiento
 */

import fs from 'fs';

// Cargar variables de entorno
const ENV = {
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || '',
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || '',
};

if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
  console.error('❌ Error: BUILT_IN_FORGE_API_URL y BUILT_IN_FORGE_API_KEY no están configuradas');
  process.exit(1);
}

const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, '');
const apiKey = ENV.forgeApiKey;

/**
 * Buscar archivos en S3 con un prefijo
 */
async function listS3Files(prefix) {
  try {
    const url = new URL('v1/storage/list', baseUrl + '/');
    url.searchParams.set('prefix', prefix);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Error en API: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error(`Error listando archivos: ${error.message}`);
    return [];
  }
}

/**
 * Extraer información del nombre del archivo
 */
function parseQuotationInfo(filename, key) {
  // Formato: quotations/COT-2026-XXX/v1.pdf
  const match = key.match(/quotations\/(COT-\d+-\d+)\/v(\d+)\.pdf/);
  if (!match) return null;

  const [, quotationNumber, version] = match;
  
  // Extraer nombre del cliente del filename
  // Formato: COT-2026-XXX_NombreCliente.pdf
  const clientMatch = filename.match(/^COT-\d+-\d+_(.+)\.pdf$/);
  const clientName = clientMatch ? clientMatch[1].replace(/_/g, ' ') : 'Desconocido';

  return {
    quotationNumber,
    version: parseInt(version),
    clientName,
    key,
    filename,
  };
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Buscando PDFs de cotizaciones en S3...\n');

  const files = await listS3Files('quotations/');
  
  if (files.length === 0) {
    console.log('❌ No se encontraron PDFs de cotizaciones');
    return;
  }

  console.log(`✅ Se encontraron ${files.length} archivos\n`);

  const quotations = {};

  for (const file of files) {
    if (!file.name.endsWith('.pdf')) continue;

    const info = parseQuotationInfo(file.name, file.key);
    if (!info) continue;

    if (!quotations[info.quotationNumber]) {
      quotations[info.quotationNumber] = {
        quotationNumber: info.quotationNumber,
        clientName: info.clientName,
        versions: [],
      };
    }

    quotations[info.quotationNumber].versions.push({
      version: info.version,
      key: info.key,
      filename: info.filename,
      size: file.size || 'Desconocido',
      lastModified: file.lastModified || 'Desconocido',
    });
  }

  // Ordenar versiones por número
  Object.values(quotations).forEach(q => {
    q.versions.sort((a, b) => a.version - b.version);
  });

  // Mostrar resultados
  console.log('📋 COTIZACIONES ENCONTRADAS:\n');
  console.log('═'.repeat(100));

  let totalQuotations = 0;
  let totalVersions = 0;

  for (const [cotNumber, data] of Object.entries(quotations).sort()) {
    totalQuotations++;
    console.log(`\n📄 ${data.quotationNumber}`);
    console.log(`   Cliente: ${data.clientName}`);
    console.log(`   Versiones: ${data.versions.length}`);
    
    for (const v of data.versions) {
      totalVersions++;
      console.log(`   └─ v${v.version}: ${v.filename}`);
      console.log(`      Ruta S3: ${v.key}`);
      console.log(`      Tamaño: ${v.size}`);
      console.log(`      Modificado: ${v.lastModified}`);
    }
  }

  console.log('\n' + '═'.repeat(100));
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total de cotizaciones: ${totalQuotations}`);
  console.log(`   Total de versiones: ${totalVersions}`);

  // Guardar reporte en archivo
  const report = {
    timestamp: new Date().toISOString(),
    totalQuotations,
    totalVersions,
    quotations: Object.values(quotations),
  };

  const reportPath = '/home/ubuntu/innovar_cocinas/quotation-pdfs-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Reporte guardado en: ${reportPath}`);
}

main().catch(console.error);
