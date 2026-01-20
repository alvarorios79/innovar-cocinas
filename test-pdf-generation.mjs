import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Conectar a la base de datos
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Obtener la primera cotización
const quotations = await db.select().from(schema.quotations).limit(1);

if (quotations.length === 0) {
  console.log('No hay cotizaciones en la base de datos');
  process.exit(1);
}

const quotation = quotations[0];
console.log('Cotización encontrada:', quotation);

// Obtener cliente
const clients = await db.select().from(schema.clients).where(eq(schema.clients.id, quotation.clientId));
if (clients.length === 0) {
  console.log('Cliente no encontrado');
  process.exit(1);
}
const client = clients[0];

// Obtener items
const items = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quotation.id));
console.log('Items encontrados:', items.length);

// Preparar datos para el PDF
const pdfData = {
  quotationNumber: quotation.quotationNumber,
  date: new Date().toLocaleDateString('es-CO'),
  clientName: client.name,
  vendorName: quotation.vendorName,
  workType: quotation.workType,
  validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO') : '',
  items: items.map(item => ({
    itemNumber: item.itemNumber,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice || '',
    totalPrice: item.totalPrice,
  })),
  subtotal: quotation.subtotal,
  fixedCosts: quotation.fixedCosts,
  total: quotation.total,
};

console.log('Datos del PDF:', JSON.stringify(pdfData, null, 2));

// Intentar generar PDF
try {
  const { generateQuotationPDF } = await import('./server/quotation-pdf-generator.ts');
  const result = await generateQuotationPDF(pdfData, quotation.id);
  console.log('✅ PDF generado exitosamente:', result.filename);
} catch (error) {
  console.error('❌ Error generando PDF:', error);
  console.error('Stack:', error.stack);
}

await connection.end();
