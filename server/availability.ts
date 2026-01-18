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
    { start: "08:00", end: "09:30" },
    { start: "09:30", end: "11:00" },
    { start: "11:00", end: "12:30" }, // Última de la mañana (termina a 12:30, dentro del rango)
    { start: "14:00", end: "15:30" },
    { start: "15:30", end: "17:00" }, // Última de la tarde (termina a 5pm)
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
export async function getAvailableTimeSlots(dateStr: string): Promise<string[]> {
  // Parsear la fecha directamente sin conversión de zona horaria
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
  
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
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

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

  // Obtener horarios ocupados - usar la hora local almacenada
  const occupiedSlots = existingAppointments.map(apt => {
    if (!apt.scheduledDate) return null;
    // La fecha en la BD ya está en hora local de Colombia
    const hours = apt.scheduledDate.getHours().toString().padStart(2, '0');
    const minutes = apt.scheduledDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
export async function isTimeSlotAvailable(dateStr: string, timeSlot: string): Promise<boolean> {
  // Parsear la fecha directamente sin conversión de zona horaria
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas
  
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
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

  // Buscar si ya existe una cita en ese horario (que no esté cancelada)
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

  // Verificar si alguna cita existente tiene el mismo horario
  const [hours, minutes] = timeSlot.split(':').map(Number);
  
  for (const apt of existingAppointments) {
    if (apt.scheduledDate) {
      const aptHours = apt.scheduledDate.getHours();
      const aptMinutes = apt.scheduledDate.getMinutes();
      if (aptHours === hours && aptMinutes === minutes) {
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
