import { createConnection } from 'mysql2/promise';
import { writeFileSync } from 'fs';

// Las variables de entorno ya están inyectadas en el proceso del servidor
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL no disponible. Ejecutar con: pnpm tsx analyze_clients.mjs');
  process.exit(1);
}

const conn = await createConnection(dbUrl);

const [conDatos] = await conn.execute(`
  SELECT c.id, c.name, c.email, c.dataOrigin,
         COUNT(DISTINCT q.id) as cotizaciones,
         COUNT(DISTINCT p.id) as proyectos
  FROM clients c
  LEFT JOIN quotations q ON q.clientId = c.id AND q.deletedAt IS NULL
  LEFT JOIN projects p ON p.clientId = c.id AND p.deletedAt IS NULL
  WHERE c.deletedAt IS NULL
  GROUP BY c.id, c.name, c.email, c.dataOrigin
  HAVING (COUNT(DISTINCT q.id) + COUNT(DISTINCT p.id)) > 0
  ORDER BY c.name
`);

const [sinDatos] = await conn.execute(`
  SELECT c.id, c.name, c.email, c.dataOrigin
  FROM clients c
  LEFT JOIN quotations q ON q.clientId = c.id AND q.deletedAt IS NULL
  LEFT JOIN projects p ON p.clientId = c.id AND p.deletedAt IS NULL
  WHERE c.deletedAt IS NULL
  GROUP BY c.id, c.name, c.email, c.dataOrigin
  HAVING (COUNT(DISTINCT q.id) + COUNT(DISTINCT p.id)) = 0
  ORDER BY c.dataOrigin, c.name
`);

let output = '';
output += `=== CLIENTES CON COTIZACIONES O PROYECTOS (${conDatos.length}) ===\n`;
for (const c of conDatos) {
  output += `  [${c.dataOrigin}] ${c.name} | ${c.email || 'sin email'} | cot:${c.cotizaciones} proy:${c.proyectos}\n`;
}

const manual = sinDatos.filter(c => c.dataOrigin === 'manual');
const system = sinDatos.filter(c => c.dataOrigin !== 'manual');

output += `\n=== SIN COTIZACIONES NI PROYECTOS - dataOrigin=manual (${manual.length}) ===\n`;
output += `  (Posiblemente clientes reales sin actividad aun - CONFIRMAR antes de eliminar)\n`;
for (const c of manual) {
  output += `  ${c.name} | ${c.email || 'sin email'}\n`;
}

output += `\n=== SIN COTIZACIONES NI PROYECTOS - dataOrigin=system/test (${system.length}) ===\n`;
output += `  (Son de prueba - se eliminan con el boton de limpieza)\n`;
for (const c of system) {
  output += `  ${c.name} | ${c.email || 'sin email'}\n`;
}

console.log(output);
writeFileSync('/home/ubuntu/reporte_clientes.txt', output);
console.log('Reporte guardado en /home/ubuntu/reporte_clientes.txt');

await conn.end();
