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
 */
export function isAllowedDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return APPOINTMENT_CONFIG.allowedDays.includes(dayOfWeek);
}

/**
 * Obtiene todos los horarios disponibles para una fecha específica
 */
export async function getAvailableTimeSlots(date: Date): Promise<string[]> {
  // Verificar si es un día permitido
  if (!isAllowedDay(date)) {
    return [];
  }

  const db = await getDb();
  if (!db) {
    return APPOINTMENT_CONFIG.timeSlots.map(slot => slot.start);
  }

  // Obtener el inicio y fin del día
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

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

  // Obtener horarios ocupados
  const occupiedSlots = existingAppointments.map(apt => {
    if (!apt.scheduledDate) return null;
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
 */
export async function isTimeSlotAvailable(date: Date, timeSlot: string): Promise<boolean> {
  // Verificar si es un día permitido
  if (!isAllowedDay(date)) {
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

  // Crear fecha completa con el horario
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(hours, minutes, 0, 0);

  // Buscar si ya existe una cita en ese horario (que no esté cancelada)
  const existingAppointment = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.scheduledDate, appointmentDate),
        sql`${appointments.status} != 'cancelada'`
      )
    )
    .limit(1);

  return existingAppointment.length === 0;
}

/**
 * Obtiene el nombre del día en español
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek];
}
