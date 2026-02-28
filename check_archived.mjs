import { getDb } from './server/db.ts';
import { quotations } from './drizzle/schema.ts';
import { isNull } from 'drizzle-orm';

async function checkArchived() {
  const db = await getDb();
  if (!db) {
    console.log('Database not available');
    process.exit(1);
  }

  const result = await db
    .select({
      id: quotations.id,
      quotationNumber: quotations.quotationNumber,
      isArchived: quotations.isArchived,
    })
    .from(quotations)
    .where(isNull(quotations.deletedAt))
    .orderBy(quotations.id)
    .limit(20);

  console.log('\n=== VALORES REALES EN LA BASE DE DATOS ===\n');
  console.table(result);
  
  const archived = result.filter(q => q.isArchived === 1);
  const active = result.filter(q => q.isArchived === 0);
  
  console.log(`\nArchivadas (isArchived = 1): ${archived.length}`);
  console.log(`Activas (isArchived = 0): ${active.length}`);
  
  if (archived.length > 0) {
    console.log('\nCotizaciones ARCHIVADAS:');
    archived.forEach(q => {
      console.log(`  - ${q.quotationNumber} (id: ${q.id}, isArchived: ${q.isArchived})`);
    });
  }
}

checkArchived().catch(console.error);
