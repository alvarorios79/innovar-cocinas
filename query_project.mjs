import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'innovar',
});

// Buscar proyecto por nombre
const [projects] = await connection.execute(
  "SELECT id, name, totalAmount, clientId, isArchived, status FROM projects WHERE name LIKE ? LIMIT 1",
  ['%COT-2026-1772833387890-1825427%']
);

if (projects.length === 0) {
  console.log('Proyecto no encontrado');
  process.exit(1);
}

const project = projects[0];
console.log('=== PROYECTO ENCONTRADO ===');
console.log('ID:', project.id);
console.log('Nombre:', project.name);
console.log('Precio Original (totalAmount):', project.totalAmount);
console.log('Cliente ID:', project.clientId);
console.log('Archivado:', project.isArchived);
console.log('Status:', project.status);

// Obtener pagos
const [payments] = await connection.execute(
  "SELECT id, amount, movementType, receivedAt FROM payments WHERE projectId = ? ORDER BY receivedAt DESC",
  [project.id]
);

console.log('\n=== PAGOS Y MOVIMIENTOS ===');
let totalPayments = 0;
let totalDiscounts = 0;
let totalSurcharges = 0;

payments.forEach(p => {
  console.log(`${p.movementType.toUpperCase()}: $${p.amount} (${p.receivedAt})`);
  if (p.movementType === 'payment') totalPayments += parseFloat(p.amount);
  if (p.movementType === 'discount') totalDiscounts += parseFloat(p.amount);
  if (p.movementType === 'surcharge') totalSurcharges += parseFloat(p.amount);
});

console.log('\n=== TOTALES ===');
console.log('Total Pagos:', totalPayments);
console.log('Total Descuentos:', totalDiscounts);
console.log('Total Recargos:', totalSurcharges);
console.log('Precio Original:', project.totalAmount);
console.log('Precio Neto (Original - Descuentos + Recargos):', 
  parseFloat(project.totalAmount) - totalDiscounts + totalSurcharges);

// Buscar en cierre contable
const [closureProjects] = await connection.execute(
  "SELECT closureId, projectValue, totalPaid, totalExpenses, profit FROM accountingClosureProjects WHERE projectId = ?",
  [project.id]
);

if (closureProjects.length > 0) {
  console.log('\n=== EN CIERRE CONTABLE ===');
  closureProjects.forEach(cp => {
    console.log('Cierre ID:', cp.closureId);
    console.log('projectValue (usado en cierre):', cp.projectValue);
    console.log('totalPaid (usado en cierre):', cp.totalPaid);
    console.log('totalExpenses:', cp.totalExpenses);
    console.log('profit:', cp.profit);
  });
} else {
  console.log('\n⚠️ Este proyecto NO está en ningún cierre contable aún');
}

await connection.end();
