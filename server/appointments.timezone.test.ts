import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";

describe("Appointments Timezone", () => {
  let testClientId: number;

  beforeEach(async () => {
    // Crear un cliente de prueba
    testClientId = await db.createClient({
      name: "Cliente Timezone Test",
      whatsappPhone: "+573001234567",
      email: "timezone@test.com",
    });
  });

  it("should save and retrieve appointment time in Colombia timezone correctly", async () => {
    // Crear una cita con hora específica (8:00 AM Colombia)
    const scheduledDateStr = "2026-01-20";
    const scheduledTimeStr = "08:00";
    
    // Simular la creación de fecha como lo hace el endpoint
    const [year, month, day] = scheduledDateStr.split('-').map(Number);
    const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`;
    const scheduledDate = new Date(dateStr);

    const appointmentId = await db.createAppointment({
      clientId: testClientId,
      scheduledDate,
      notes: "Test timezone",
    });

    // Recuperar la cita
    const appointments = await db.getAllAppointments();
    const appointment = appointments.find(apt => apt.id === appointmentId);

    expect(appointment).toBeDefined();
    expect(appointment!.scheduledDate).toBeDefined();

    // Verificar que la hora se mantiene correcta en zona horaria de Colombia
    const retrievedDate = new Date(appointment!.scheduledDate!);
    const colombiaTimeString = retrievedDate.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
      hour12: false,
    });

    // Debería mostrar 08:00 (la hora original)
    expect(colombiaTimeString).toContain("08:00");
    expect(colombiaTimeString).toContain("20/01/2026");
  });

  it("should handle different times correctly", async () => {
    const testCases = [
      { time: "09:00", expected: "09:00" },
      { time: "14:30", expected: "14:30" },
      { time: "17:45", expected: "17:45" },
    ];

    for (const testCase of testCases) {
      const scheduledDateStr = "2026-01-20";
      const [year, month, day] = scheduledDateStr.split('-').map(Number);
      const [hours, minutes] = testCase.time.split(':').map(Number);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`;
      const scheduledDate = new Date(dateStr);

      const appointmentId = await db.createAppointment({
        clientId: testClientId,
        scheduledDate,
        notes: `Test ${testCase.time}`,
      });

      const appointments = await db.getAllAppointments();
      const appointment = appointments.find(apt => apt.id === appointmentId);

      const retrievedDate = new Date(appointment!.scheduledDate!);
      const colombiaTimeString = retrievedDate.toLocaleString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
        hour12: false,
      });

      expect(colombiaTimeString).toBe(testCase.expected);
    }
  });
});
