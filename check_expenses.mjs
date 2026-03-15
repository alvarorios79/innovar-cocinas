import { getDb } from "./server/db.js";
import { expenses } from "./drizzle/schema.js";

const db = await getDb();
if (!db) {
  console.log("Database not available");
  process.exit(1);
}

const allExpenses = await db.select({
  id: expenses.id,
  description: expenses.description,
  amount: expenses.amount,
  expenseDate: expenses.expenseDate,
  createdAt: expenses.createdAt,
  expenseType: expenses.expenseType,
}).from(expenses);

console.log("\n=== ANÁLISIS DE FECHAS DE GASTOS ===\n");
console.log(`Total de gastos: ${allExpenses.length}\n`);

// Agrupar por tipo
const byType = {};
allExpenses.forEach(e => {
  if (!byType[e.expenseType]) byType[e.expenseType] = [];
  byType[e.expenseType].push(e);
});

for (const [type, items] of Object.entries(byType)) {
  console.log(`\n📊 ${type.toUpperCase()} (${items.length} items)`);
  console.log("─".repeat(100));
  
  items.forEach(e => {
    const expDate = new Date(e.expenseDate);
    const creDate = new Date(e.createdAt);
    const match = expDate.toDateString() === creDate.toDateString() ? "✅" : "⚠️";
    
    console.log(`${match} ID: ${e.id}`);
    console.log(`   Descripción: ${e.description}`);
    console.log(`   Monto: $${parseFloat(e.amount)}`);
    console.log(`   Fecha del Gasto: ${expDate.toLocaleDateString('es-CO')}`);
    console.log(`   Fecha de Creación: ${creDate.toLocaleDateString('es-CO')}`);
    console.log(`   Diferencia: ${Math.floor((creDate - expDate) / (1000 * 60 * 60 * 24))} días`);
    console.log("");
  });
}

// Resumen por mes
console.log("\n📅 RESUMEN POR MES (expenseDate)\n");
const byMonth = {};
allExpenses.forEach(e => {
  const date = new Date(e.expenseDate);
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
  byMonth[month].count++;
  byMonth[month].total += parseFloat(e.amount);
});

Object.entries(byMonth).sort().forEach(([month, data]) => {
  console.log(`${month}: ${data.count} gastos, Total: $${data.total.toLocaleString('es-CO')}`);
});

process.exit(0);
