// @ts-nocheck
/**
 * Servicio de cálculo de días hábiles para Colombia
 * - Excluye sábados, domingos y festivos colombianos
 * - Los sábados no se cuentan porque solo se trabaja medio día
 */

import * as db from "./db";

// Festivos colombianos 2024-2026 (fechas fijas y móviles)
// Fuente: Ley 51 de 1983 y decretos reglamentarios
export const COLOMBIAN_HOLIDAYS: { date: string; name: string }[] = [
  // 2024
  { date: "2024-01-01", name: "Año Nuevo" },
  { date: "2024-01-08", name: "Día de los Reyes Magos" },
  { date: "2024-03-25", name: "Día de San José" },
  { date: "2024-03-28", name: "Jueves Santo" },
  { date: "2024-03-29", name: "Viernes Santo" },
  { date: "2024-05-01", name: "Día del Trabajo" },
  { date: "2024-05-13", name: "Ascensión del Señor" },
  { date: "2024-06-03", name: "Corpus Christi" },
  { date: "2024-06-10", name: "Sagrado Corazón de Jesús" },
  { date: "2024-07-01", name: "San Pedro y San Pablo" },
  { date: "2024-07-20", name: "Día de la Independencia" },
  { date: "2024-08-07", name: "Batalla de Boyacá" },
  { date: "2024-08-19", name: "Asunción de la Virgen" },
  { date: "2024-10-14", name: "Día de la Raza" },
  { date: "2024-11-04", name: "Todos los Santos" },
  { date: "2024-11-11", name: "Independencia de Cartagena" },
  { date: "2024-12-08", name: "Inmaculada Concepción" },
  { date: "2024-12-25", name: "Navidad" },
  
  // 2025
  { date: "2025-01-01", name: "Año Nuevo" },
  { date: "2025-01-06", name: "Día de los Reyes Magos" },
  { date: "2025-03-24", name: "Día de San José" },
  { date: "2025-04-17", name: "Jueves Santo" },
  { date: "2025-04-18", name: "Viernes Santo" },
  { date: "2025-05-01", name: "Día del Trabajo" },
  { date: "2025-06-02", name: "Ascensión del Señor" },
  { date: "2025-06-23", name: "Corpus Christi" },
  { date: "2025-06-30", name: "Sagrado Corazón de Jesús" },
  { date: "2025-06-30", name: "San Pedro y San Pablo" },
  { date: "2025-07-20", name: "Día de la Independencia" },
  { date: "2025-08-07", name: "Batalla de Boyacá" },
  { date: "2025-08-18", name: "Asunción de la Virgen" },
  { date: "2025-10-13", name: "Día de la Raza" },
  { date: "2025-11-03", name: "Todos los Santos" },
  { date: "2025-11-17", name: "Independencia de Cartagena" },
  { date: "2025-12-08", name: "Inmaculada Concepción" },
  { date: "2025-12-25", name: "Navidad" },
  
  // 2026
  { date: "2026-01-01", name: "Año Nuevo" },
  { date: "2026-01-12", name: "Día de los Reyes Magos" },
  { date: "2026-03-23", name: "Día de San José" },
  { date: "2026-04-02", name: "Jueves Santo" },
  { date: "2026-04-03", name: "Viernes Santo" },
  { date: "2026-05-01", name: "Día del Trabajo" },
  { date: "2026-05-18", name: "Ascensión del Señor" },
  { date: "2026-06-08", name: "Corpus Christi" },
  { date: "2026-06-15", name: "Sagrado Corazón de Jesús" },
  { date: "2026-06-29", name: "San Pedro y San Pablo" },
  { date: "2026-07-20", name: "Día de la Independencia" },
  { date: "2026-08-07", name: "Batalla de Boyacá" },
  { date: "2026-08-17", name: "Asunción de la Virgen" },
  { date: "2026-10-12", name: "Día de la Raza" },
  { date: "2026-11-02", name: "Todos los Santos" },
  { date: "2026-11-16", name: "Independencia de Cartagena" },
  { date: "2026-12-08", name: "Inmaculada Concepción" },
  { date: "2026-12-25", name: "Navidad" },
];

// Cache de festivos en memoria para evitar consultas repetidas a la BD
let holidaysCache: Set<string> | null = null;
let holidaysCacheYear: number | null = null;

/**
 * Obtener festivos del año actual y siguiente
 */
async function getHolidaysSet(): Promise<Set<string>> {
  const currentYear = new Date().getFullYear();
  
  // Si el cache es del año actual, usarlo
  if (holidaysCache && holidaysCacheYear === currentYear) {
    return holidaysCache;
  }
  
  // Intentar cargar de la base de datos
  try {
    const dbHolidays = await db.getColombianHolidays(currentYear, currentYear + 1);
    if (dbHolidays.length > 0) {
      holidaysCache = new Set(dbHolidays.map((h: { date: Date }) => formatDateKey(new Date(h.date))));
      holidaysCacheYear = currentYear;
      return holidaysCache;
    }
  } catch {
    // Si falla la BD, usar los festivos hardcodeados
  }
  
  // Usar festivos hardcodeados
  holidaysCache = new Set(COLOMBIAN_HOLIDAYS.map(h => h.date));
  holidaysCacheYear = currentYear;
  return holidaysCache;
}

/**
 * Formatear fecha como YYYY-MM-DD para comparación
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Verificar si una fecha es día hábil
 * - No es sábado (6)
 * - No es domingo (0)
 * - No es festivo colombiano
 */
export async function isBusinessDay(date: Date): Promise<boolean> {
  const dayOfWeek = date.getDay();
  
  // Sábado (6) o Domingo (0) no son días hábiles
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Verificar si es festivo
  const holidays = await getHolidaysSet();
  const dateKey = formatDateKey(date);
  
  return !holidays.has(dateKey);
}

/**
 * Verificar si una fecha es día hábil (versión síncrona con festivos precargados)
 */
export function isBusinessDaySync(date: Date, holidays: Set<string>): boolean {
  const dayOfWeek = date.getDay();
  
  // Sábado (6) o Domingo (0) no son días hábiles
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Verificar si es festivo
  const dateKey = formatDateKey(date);
  return !holidays.has(dateKey);
}

/**
 * Agregar días hábiles a una fecha
 * @param startDate Fecha de inicio
 * @param businessDays Número de días hábiles a agregar
 * @returns Fecha resultante
 */
export async function addBusinessDays(startDate: Date, businessDays: number): Promise<Date> {
  const holidays = await getHolidaysSet();
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    
    if (isBusinessDaySync(result, holidays)) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Calcular días hábiles entre dos fechas
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @returns Número de días hábiles
 */
export async function countBusinessDays(startDate: Date, endDate: Date): Promise<number> {
  const holidays = await getHolidaysSet();
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isBusinessDaySync(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcular fecha de entrega estimada (25 días hábiles desde aprobación)
 */
export async function calculateEstimatedDeliveryDate(approvalDate: Date): Promise<Date> {
  return addBusinessDays(approvalDate, 25);
}

/**
 * Calcular fecha límite de diseño (3 días hábiles desde adelanto)
 */
export async function calculateDesignDeadline(advanceDate: Date): Promise<Date> {
  return addBusinessDays(advanceDate, 3);
}

/**
 * Obtener información de un festivo específico
 */
export function getHolidayInfo(date: Date): { isHoliday: boolean; name?: string } {
  const dateKey = formatDateKey(date);
  const holiday = COLOMBIAN_HOLIDAYS.find(h => h.date === dateKey);
  
  if (holiday) {
    return { isHoliday: true, name: holiday.name };
  }
  
  return { isHoliday: false };
}

/**
 * Obtener próximos días hábiles disponibles para instalación
 * @param fromDate Fecha desde la cual buscar
 * @param count Cantidad de días a retornar
 * @returns Array de fechas disponibles
 */
export async function getAvailableInstallationDates(fromDate: Date, count: number = 10): Promise<Date[]> {
  const holidays = await getHolidaysSet();
  const availableDates: Date[] = [];
  const current = new Date(fromDate);
  
  while (availableDates.length < count) {
    current.setDate(current.getDate() + 1);
    
    if (isBusinessDaySync(current, holidays)) {
      availableDates.push(new Date(current));
    }
  }
  
  return availableDates;
}

/**
 * Verificar si una fecha está dentro del rango de días hábiles
 * @param targetDate Fecha a verificar
 * @param startDate Fecha de inicio
 * @param maxBusinessDays Máximo de días hábiles permitidos
 */
export async function isWithinBusinessDays(
  targetDate: Date,
  startDate: Date,
  maxBusinessDays: number
): Promise<boolean> {
  const businessDays = await countBusinessDays(startDate, targetDate);
  return businessDays <= maxBusinessDays;
}

/**
 * Calcular días hábiles restantes hasta una fecha
 */
export async function getRemainingBusinessDays(targetDate: Date): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (targetDate <= today) {
    return 0;
  }
  
  return countBusinessDays(today, targetDate);
}

/**
 * Inicializar festivos en la base de datos
 */
export async function initializeHolidays(): Promise<void> {
  const currentYear = new Date().getFullYear();
  
  // Verificar si ya hay festivos cargados
  const existingHolidays = await db.getColombianHolidays(currentYear, currentYear);
  if (existingHolidays.length > 0) {
    return; // Ya están cargados
  }
  
  // Cargar festivos del año actual y siguientes
  for (const holiday of COLOMBIAN_HOLIDAYS) {
    const date = new Date(holiday.date);
    const year = date.getFullYear();
    
    if (year >= currentYear) {
      await db.createColombianHoliday({
        date,
        name: holiday.name,
        year,
      });
    }
  }
}

/**
 * Obtener resumen de fechas clave de un proyecto
 */
export async function getProjectDatesSummary(project: {
  advanceReceivedAt?: Date | null;
  clientApprovedAt?: Date | null;
  estimatedInstallDate?: Date | null;
  scheduledInstallDate?: Date | null;
}): Promise<{
  designDeadline?: Date;
  estimatedDelivery?: Date;
  daysUntilDelivery?: number;
  isOverdue?: boolean;
}> {
  const summary: {
    designDeadline?: Date;
    estimatedDelivery?: Date;
    daysUntilDelivery?: number;
    isOverdue?: boolean;
  } = {};
  
  // Calcular fecha límite de diseño
  if (project.advanceReceivedAt) {
    summary.designDeadline = await calculateDesignDeadline(new Date(project.advanceReceivedAt));
  }
  
  // Calcular fecha estimada de entrega
  if (project.clientApprovedAt) {
    summary.estimatedDelivery = await calculateEstimatedDeliveryDate(new Date(project.clientApprovedAt));
    summary.daysUntilDelivery = await getRemainingBusinessDays(summary.estimatedDelivery);
    summary.isOverdue = summary.daysUntilDelivery <= 0;
  }
  
  return summary;
}
