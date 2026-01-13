import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { isTimeSlotAvailable, getAvailableTimeSlots } from "./availability";

describe("Validación de disponibilidad horaria", () => {
  let testClientId: number;
  let testAppointmentId: number;

  beforeEach(async () => {
    // Crear cliente de prueba
    testClientId = await db.createClient({
      name: "Cliente Test Horario",
      whatsappPhone: "3001112222",
    });
  });

  it("debe permitir agendar cita en horario disponible", async () => {
    // Martes 20 de enero de 2026 a las 08:00
    const date = new Date(2026, 0, 20, 8, 0, 0, 0);
    const timeSlot = "08:00";

    const isAvailable = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailable).toBe(true);
  });

  it("debe bloquear horario después de agendar una cita", async () => {
    // Martes 20 de enero de 2026 a las 09:30
    const date = new Date(2026, 0, 20, 9, 30, 0, 0);
    const timeSlot = "09:30";

    // Verificar que está disponible
    const isAvailableBefore = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableBefore).toBe(true);

    // Agendar cita
    testAppointmentId = await db.createAppointment({
      clientId: testClientId,
      workType: "cocina",
      scheduledDate: date,
      notes: "Test horario ocupado",
    });

    // Verificar que ya no está disponible
    const isAvailableAfter = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableAfter).toBe(false);

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it("debe mostrar horario disponible después de cancelar cita", async () => {
    // Martes 20 de enero de 2026 a las 11:00
    const date = new Date(2026, 0, 20, 11, 0, 0, 0);
    const timeSlot = "11:00";

    // Agendar cita
    testAppointmentId = await db.createAppointment({
      clientId: testClientId,
      workType: "closet",
      scheduledDate: date,
      notes: "Test cancelación",
    });

    // Verificar que está ocupado
    const isAvailableOccupied = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableOccupied).toBe(false);

    // Cancelar cita
    await db.updateAppointment(testAppointmentId, {
      status: "cancelada",
    });

    // Verificar que vuelve a estar disponible
    const isAvailableAfterCancel = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableAfterCancel).toBe(true);

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it("debe retornar solo horarios disponibles para un día", async () => {
    // Martes 20 de enero de 2026
    const date = new Date(2026, 0, 20);

    // Obtener horarios disponibles antes de agendar
    const slotsBefore = await getAvailableTimeSlots(date);
    expect(slotsBefore.length).toBeGreaterThan(0);
    expect(slotsBefore).toContain("08:00");
    expect(slotsBefore).toContain("09:30");

    // Agendar cita a las 08:00
    const appointmentDate = new Date(2026, 0, 20, 8, 0, 0, 0);
    testAppointmentId = await db.createAppointment({
      clientId: testClientId,
      workType: "puertas",
      scheduledDate: appointmentDate,
      notes: "Test horarios disponibles",
    });

    // Obtener horarios disponibles después de agendar
    const slotsAfter = await getAvailableTimeSlots(date);
    expect(slotsAfter.length).toBe(slotsBefore.length - 1);
    expect(slotsAfter).not.toContain("08:00"); // Este ya está ocupado
    expect(slotsAfter).toContain("09:30"); // Este sigue disponible

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it("no debe permitir agendar en día no permitido (lunes)", async () => {
    // Lunes 19 de enero de 2026 a las 08:00
    const date = new Date(2026, 0, 19, 8, 0, 0, 0);
    const timeSlot = "08:00";

    const isAvailable = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailable).toBe(false);

    // Verificar que no hay horarios disponibles ese día
    const slots = await getAvailableTimeSlots(date);
    expect(slots.length).toBe(0);
  });

  it("no debe permitir agendar en horario no configurado", async () => {
    // Martes 20 de enero de 2026 a las 13:00 (no está en los slots configurados)
    const date = new Date(2026, 0, 20, 13, 0, 0, 0);
    const timeSlot = "13:00";

    const isAvailable = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailable).toBe(false);
  });
});
