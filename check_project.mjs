import { getDb } from './server/db.ts';
import { projects, payments } from './drizzle/schema.ts';
import { eq, like } from 'drizzle-orm';

const db = await getDb();

// Buscar proyecto
const projectList = await db.select()
  .from(projects)
  .where(like(projects.name, '%COT-2026-1772833387890-1825427%'))
  .limit(1);

if (projectList.length === 0) {
  console.log('❌ Proyecto no encontrado');
  process.exit(1);
}

const project = projectList[0];
console.log('✅ PROYECTO ENCONTRADO');
console.log('ID:', project.id);
console.log('Nombre:', project.name);
console.log('Precio Original (totalAmount):', project.totalAmount);
console.log('Archivado:', project.isArchived);
console.log('Status:', project.status);

// Obtener pagos
const paymentsList = await db.select()
  .from(payments)
  .where(eq(payments.projectId, project.id));

console.log('\n📊 PAGOS Y MOVIMIENTOS:');
let totalPayments = 0;
let totalDiscounts = 0;
let totalSurcharges = 0;

paymentsList.forEach(p => {
  console.log(`  ${p.movementType.toUpperCase()}: $${p.amount}`);
  if (p.movementType === 'payment') totalPayments += parseFloat(p.amount);
  if (p.movementType === 'discount') totalDiscounts += parseFloat(p.amount);
  if (p.movementType === 'surcharge') totalSurcharges += parseFloat(p.amount);
});

console.log('\n💰 TOTALES:');
console.log('  Total Pagos:', totalPayments);
console.log('  Total Descuentos:', totalDiscounts);
console.log('  Total Recargos:', totalSurcharges);
console.log('  Precio Original:', project.totalAmount);
console.log('  Precio Neto (Original - Descuentos):', 
  parseFloat(project.totalAmount) - totalDiscounts + totalSurcharges);

process.exit(0);
