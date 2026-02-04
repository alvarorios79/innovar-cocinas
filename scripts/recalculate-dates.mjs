/**
 * Script para recalcular las fechas de instalación de todos los proyectos
 * usando 25 días hábiles (sin sábados, domingos ni festivos colombianos)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Festivos colombianos 2026
const COLOMBIAN_HOLIDAYS_2026 = [
  "2026-01-01", // Año Nuevo
  "2026-01-12", // Reyes Magos
  "2026-03-23", // San José
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo
  "2026-05-18", // Ascensión del Señor
  "2026-06-08", // Corpus Christi
  "2026-06-15", // Sagrado Corazón
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-20", // Independencia
  "2026-08-07", // Batalla de Boyacá
  "2026-08-17", // Asunción de la Virgen
  "2026-10-12", // Día de la Raza
  "2026-11-02", // Todos los Santos
  "2026-11-16", // Independencia de Cartagena
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
];

const holidaysSet = new Set(COLOMBIAN_HOLIDAYS_2026);

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBusinessDay(date) {
  const dayOfWeek = date.getDay();
  // Sábado (6) o Domingo (0) no son días hábiles
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  // Verificar si es festivo
  const dateKey = formatDateKey(date);
  return !holidaysSet.has(dateKey);
}

function addBusinessDays(startDate, businessDays) {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      daysAdded++;
    }
  }
  
  return result;
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("Conectado a la base de datos");
  
  // Obtener todos los proyectos
  const [projects] = await connection.execute(
    `SELECT id, name, createdAt, rendersApprovedAt, tentativeInstallDate, estimatedInstallDate 
     FROM projects`
  );
  
  console.log(`Encontrados ${projects.length} proyectos`);
  
  for (const project of projects) {
    const updates = {};
    
    // Calcular fecha tentativa (25 días hábiles desde creación)
    if (project.createdAt) {
      const tentativeDate = addBusinessDays(new Date(project.createdAt), 25);
      updates.tentativeInstallDate = formatDateKey(tentativeDate);
      console.log(`Proyecto ${project.id} (${project.name}): Tentativa = ${updates.tentativeInstallDate}`);
    }
    
    // Calcular fecha oficial (25 días hábiles desde aprobación de renders)
    if (project.rendersApprovedAt) {
      const officialDate = addBusinessDays(new Date(project.rendersApprovedAt), 25);
      updates.estimatedInstallDate = formatDateKey(officialDate);
      updates.isInstallDateOfficial = 1;
      console.log(`Proyecto ${project.id} (${project.name}): Oficial = ${updates.estimatedInstallDate}`);
    }
    
    // Actualizar el proyecto
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), project.id];
      
      await connection.execute(
        `UPDATE projects SET ${setClauses} WHERE id = ?`,
        values
      );
      console.log(`Proyecto ${project.id} actualizado`);
    }
  }
  
  console.log("Recálculo completado");
  await connection.end();
}

main().catch(console.error);
