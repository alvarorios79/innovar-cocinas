import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock whatsapp-cloud
vi.mock("./whatsapp-cloud", () => ({
  isWhatsAppCloudConfigured: vi.fn().mockReturnValue(true),
  sendAppointmentReminder: vi.fn().mockResolvedValue({ success: true, messageId: "test-msg-id" }),
}));

// Mock db
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getAppointmentsByDate: vi.fn().mockResolvedValue([]),
  getClientById: vi.fn().mockResolvedValue(null),
  getAppointmentWorkTypes: vi.fn().mockResolvedValue([]),
}));

import * as whatsappCloud from "./whatsapp-cloud";
import * as db from "./db";
import { sendAppointmentReminders } from "./appointment-reminder-service";

describe("Servicio de Recordatorio de Citas por WhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe retornar 0 si WhatsApp no está configurado", async () => {
    vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(false);
    const result = await sendAppointmentReminders();
    expect(result.checked).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("debe retornar 0 si no hay citas para mañana", async () => {
    vi.mocked(whatsappCloud.isWhatsAppCloudConfigured).mockReturnValue(true);
    const result = await sendAppointmentReminders();
    expect(result.checked).toBe(0);
    expect(result.sent).toBe(0);
  });

  it("debe exportar startAppointmentReminderService como función", async () => {
    const mod = await import("./appointment-reminder-service");
    expect(typeof mod.startAppointmentReminderService).toBe("function");
  });

  it("debe exportar sendAppointmentReminders como función", async () => {
    const mod = await import("./appointment-reminder-service");
    expect(typeof mod.sendAppointmentReminders).toBe("function");
  });
});
