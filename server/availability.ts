import { getDb } from "./db";
import { appointments } from "../drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

/**
 * Configuración de horarios de citas
 */
export const APPOINTMENT_CONFIG = {
  // Días permitidos (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  allowedDays: [2, 4, 5], // Martes, Jueves, Viernes
  
  // Duración de cada cita en minutos
  durationMinutes: 90, // 1.5 horas
  
  // Horarios disponibles
  timeSlots: [
    { start: "08:30", end: "10:00" }, // Primera cita de la mañana
    { start: "10:00", end: "11:30" }, // Segunda cita de la mañana
    { start: "14:00", end: "15:30" }, // Primera cita de la tarde
    { start: "15:30", end: "17:00" }, // Segunda cita de la tarde
  ],
};

/**
 * Verifica si una fecha es un día permitido
 * @param dayOfWeek - Día de la semana (0-6)
 */
export function isAllowedDay(dayOfWeek: number): boolean {
  return APPOINTMENT_CONFIG.allowedDays.includes(dayOfWeek);
}

/**
 * Obtiene todos los horarios disponibles para una fecha específica
 * @param dateStr - Fecha en formato "YYYY-MM-DD"
 */
export async function getAvailableTimeSlots(dateStr: string | Date): Promise<string[]> {
  // Parsear la fecha directamente sin conversión de zona horaria
  let year: number, month: number, day: number;
  let date: Date;
  
  if (dateStr instanceof Date) {
    date = dateStr;
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  } else {
    [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
  }
  
  // Verificar si es un día permitido
  const dayOfWeek = date.getDay();
  if (!isAllowedDay(dayOfWeek)) {
    return [];
  }

  const db = await getDb();
  if (!db) {
    return APPOINTMENT_CONFIG.timeSlots.map(slot => slot.start);
  }

  // Obtener el inicio y fin del día
  // Crear fechas en UTC para comparar correctamente con las fechas de la BD
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  // Buscar citas existentes para ese día (que no estén canceladas)
  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.scheduledDate, startOfDay),
        lte(appointments.scheduledDate, endOfDay),
        sql`${appointments.status} != 'cancelada'`
      )
    );

  // Obtener horarios ocupados - convertir a zona horaria de Colombia
  const occupiedSlots = existingAppointments.map(apt => {
    if (!apt.scheduledDate) return null;
    // Convertir la fecha a zona horaria de Colombia
    const colombiaTime = new Date(apt.scheduledDate).toLocaleString("en-US", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return colombiaTime;
  }).filter(Boolean) as string[];

  // Filtrar horarios disponibles
  const availableSlots = APPOINTMENT_CONFIG.timeSlots
    .filter(slot => !occupiedSlots.includes(slot.start))
    .map(slot => slot.start);

  return availableSlots;
}

/**
 * Verifica si un horario específico está disponible
 * @param dateStr - Fecha en formato "YYYY-MM-DD"
 * @param timeSlot - Horario en formato "HH:MM"
 */
export async function isTimeSlotAvailable(dateStr: string | Date, timeSlot: string, excludeAppointmentId?: number): Promise<boolean> {
  // Parsear la fecha directamente sin conversión de zona horaria
  let date: Date;
  let year: number, month: number, day: number;
  
  if (dateStr instanceof Date) {
    date = dateStr;
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  } else {
    [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas
  }
  
  // Verificar si es un día permitido
  const dayOfWeek = date.getDay();
  if (!isAllowedDay(dayOfWeek)) {
    return false;
  }

  // Verificar si el horario está en los slots permitidos
  const isValidSlot = APPOINTMENT_CONFIG.timeSlots.some(slot => slot.start === timeSlot);
  if (!isValidSlot) {
    return false;
  }

  const db = await getDb();
  if (!db) {
    return true;
  }

  // Buscar citas existentes para ese día
  // Crear fechas en UTC para comparar correctamente con las fechas de la BD
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  // Buscar si ya existe una cita en ese horario (que no esté cancelada)
  // Si se proporciona excludeAppointmentId, excluir esa cita de la búsqueda (para edición)
  const whereConditions = [
    gte(appointments.scheduledDate, startOfDay),
    lte(appointments.scheduledDate, endOfDay),
    sql`${appointments.status} != 'cancelada'`
  ];
  
  if (excludeAppointmentId) {
    whereConditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
  }
  
  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(and(...whereConditions));

  // Verificar si alguna cita existente tiene el mismo horario
  for (const apt of existingAppointments) {
    if (apt.scheduledDate) {
      // Convertir la fecha a zona horaria de Colombia
      const colombiaTime = new Date(apt.scheduledDate).toLocaleString("en-US", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (colombiaTime === timeSlot) {
        return false; // Horario ocupado
      }
    }
  }

  return true;
}

/**
 * Obtiene el nombre del día en español
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek];
}
