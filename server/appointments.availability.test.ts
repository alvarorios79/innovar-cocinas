import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { isTimeSlotAvailable, getAvailableTimeSlots } from "./availability";

describe("Validación de disponibilidad horaria", () => {
  let testClientId: number;
  let testAppointmentId: number;

  beforeEach(async () => {
    // Crear cliente de prueba
    testClientId = await db.createClient({
      dataOrigin: 'system',
      name: "Cliente Test Horario",
      whatsappPhone: "3001112222",
    });
  });

  it("debe permitir agendar cita en horario disponible", async () => {
    // Limpiar citas residuales de otros tests para esta fecha
    const allAppointments = await db.getAllAppointments();
    for (const apt of allAppointments) {
      if (apt.scheduledDate) {
        const aptDate = new Date(apt.scheduledDate);
        if (aptDate.getFullYear() === 2026 && aptDate.getMonth() === 0 && aptDate.getDate() === 20) {
          await db.deleteAppointment(apt.id);
        }
      }
    }

    // Martes 20 de enero de 2026 a las 08:30 (slot configurado)
    const date = new Date(2026, 0, 20, 8, 30, 0, 0);
    const timeSlot = "08:30";

    const isAvailable = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailable).toBe(true);
  });

  it("debe bloquear horario después de agendar una cita", async () => {
    // Martes 20 de enero de 2026 a las 10:00 (slot configurado)
    const date = new Date(2026, 0, 20, 10, 0, 0, 0);
    const timeSlot = "10:00";

    // Verificar que está disponible
    const isAvailableBefore = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableBefore).toBe(true);

    // Agendar cita
    testAppointmentId = await db.createAppointment({
      dataOrigin: 'system',
      clientId: testClientId,
      workTypes: ["cocina"],
      scheduledDate: date,
      notes: "Test horario ocupado",
    });

    // Verificar que ya no está disponible
    const isAvailableAfter = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableAfter).toBe(false);

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it.skip("debe mostrar horario disponible después de cancelar cita", async () => {
    // Martes 20 de enero de 2026 a las 14:00 (slot configurado)
    const date = new Date(2026, 0, 20, 14, 0, 0, 0);
    const timeSlot = "14:00";

    // Agendar cita
    testAppointmentId = await db.createAppointment({
      dataOrigin: 'system',
      clientId: testClientId,
      workTypes: ["closet"],
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
    
    // Pequeño delay para asegurar que el cambio se propague
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verificar que vuelve a estar disponible
    const isAvailableAfterCancel = await isTimeSlotAvailable(date, timeSlot);
    expect(isAvailableAfterCancel).toBe(true);

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it("debe retornar solo horarios disponibles para un día", async () => {
    // Martes 20 de enero de 2026
    const date = new Date(2026, 0, 20);

    // Limpiar citas residuales de otros tests para esta fecha
    const allAppointments = await db.getAllAppointments();
    for (const apt of allAppointments) {
      if (apt.scheduledDate) {
        const aptDate = new Date(apt.scheduledDate);
        if (aptDate.getFullYear() === 2026 && aptDate.getMonth() === 0 && aptDate.getDate() === 20) {
          await db.deleteAppointment(apt.id);
        }
      }
    }

    // Obtener horarios disponibles antes de agendar
    const slotsBefore = await getAvailableTimeSlots(date);
    expect(slotsBefore.length).toBeGreaterThan(0);
    expect(slotsBefore).toContain("08:30");
    expect(slotsBefore).toContain("14:00");

    // Agendar cita a las 08:30 en zona horaria de Colombia
    const dateStr = `2026-01-20T08:30:00-05:00`;
    const appointmentDate = new Date(dateStr);
    testAppointmentId = await db.createAppointment({
      dataOrigin: 'system',
      clientId: testClientId,
      workTypes: ["puertas"],
      scheduledDate: appointmentDate,
      notes: "Test horarios disponibles",
    });

    // Obtener horarios disponibles después de agendar
    const slotsAfter = await getAvailableTimeSlots(date);
    expect(slotsAfter.length).toBe(slotsBefore.length - 1);
    expect(slotsAfter).not.toContain("08:30"); // Este ya está ocupado
    expect(slotsAfter).toContain("14:00"); // Este sigue disponible

    // Limpiar
    await db.deleteAppointment(testAppointmentId);
  });

  it("no debe permitir agendar en día no permitido (lunes)", async () => {
    // Lunes 19 de enero de 2026 a las 08:30
    const date = new Date(2026, 0, 19, 8, 30, 0, 0);
    const timeSlot = "08:30";

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
