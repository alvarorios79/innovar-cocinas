import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { quotations, isNull, eq, desc, and } from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function testGetAllQuotationsGroupedByBase() {
  console.log('\n=== TEST: getAllQuotationsGroupedByBase ===\n');
  
  try {
    const db = drizzle(DATABASE_URL);
    
    // Obtener todas las cotizaciones
    let whereConditions = and(isNull(quotations.deletedAt), eq(quotations.dataOrigin, 'manual'));
    
    const allQuotations = await db.select().from(quotations)
      .where(whereConditions)
      .orderBy(desc(quotations.quotationNumber), desc(quotations.createdAt));
    
    console.log(`✅ Total de cotizaciones en BD: ${allQuotations.length}`);
    console.log(`\nPrimeras 5 cotizaciones:`);
    allQuotations.slice(0, 5).forEach((q, i) => {
      console.log(`  ${i + 1}. ID: ${q.id}, Number: ${q.quotationNumber}, Client: ${q.clientId}`);
    });
    
    // Agrupar por número base
    const groupedMap = new Map();
    
    for (const quot of allQuotations) {
      const parts = quot.quotationNumber?.split('-') ?? [];
      const baseNumber = parts.length >= 2
        ? parts.slice(0, 2).join('-')
        : (quot.quotationNumber || `unknown-${quot.id}`);
      
      if (baseNumber && !groupedMap.has(baseNumber)) {
        groupedMap.set(baseNumber, {
          baseQuotationId: quot.id,
          quotationNumber: baseNumber,
          client: quot.client || null,
          status: quot.status,
          createdAt: quot.createdAt,
          activeVersion: quot,
          versions: [quot],
        });
      } else {
        const group = groupedMap.get(baseNumber);
        if (group.versions) {
          group.versions.push(quot);
        } else {
          group.versions = [quot];
        }
      }
    }
    
    const grouped = Array.from(groupedMap.values()).map(group => ({
      baseQuotationId: group.baseQuotationId ?? null,
      quotationNumber: group.quotationNumber ?? '',
      client: group.client ?? null,
      status: group.status ?? 'pendiente',
      createdAt: group.createdAt ?? new Date(),
      activeVersion: group.activeVersion ?? null,
      versions: group.versions ?? [],
    }));
    
    console.log(`\n✅ Total de grupos después de agrupar: ${grouped.length}`);
    console.log(`\nPrimeros 5 grupos:`);
    grouped.slice(0, 5).forEach((g, i) => {
      console.log(`  ${i + 1}. baseNumber: ${g.quotationNumber}, versions: ${g.versions.length}, client: ${g.client?.name || 'N/A'}`);
    });
    
    // Aplicar paginación
    const page = 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const paginatedQuotations = grouped.slice(offset, offset + limit);
    
    console.log(`\n✅ Página 1, Limit 50: ${paginatedQuotations.length} grupos`);
    console.log(`\nPrimeros 5 grupos paginados:`);
    paginatedQuotations.slice(0, 5).forEach((g, i) => {
      console.log(`  ${i + 1}. baseNumber: ${g.quotationNumber}, versions: ${g.versions.length}`);
    });
    
    console.log('\n=== FIN DEL TEST ===\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGetAllQuotationsGroupedByBase();
