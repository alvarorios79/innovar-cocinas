import { describe, it, expect } from "vitest";
import {
  isBusinessDay,
  addBusinessDays,
  calculateEstimatedDeliveryDate,
  COLOMBIAN_HOLIDAYS,
} from "./business-days";
import {
  REMINDER_CONFIG,
} from "./reminders-service";

describe("Ruta INNOVAR - Días Hábiles", () => {
  describe("isBusinessDay", () => {
    it("debe retornar true para un día de semana normal", async () => {
      // Miércoles 15 de enero 2025
      const date = new Date(2025, 0, 15);
      expect(await isBusinessDay(date)).toBe(true);
    });

    it("debe retornar false para un sábado", async () => {
      // Sábado 18 de enero 2025
      const date = new Date(2025, 0, 18);
      expect(await isBusinessDay(date)).toBe(false);
    });

    it("debe retornar false para un domingo", async () => {
      // Domingo 19 de enero 2025
      const date = new Date(2025, 0, 19);
      expect(await isBusinessDay(date)).toBe(false);
    });

    it("debe retornar false para un festivo colombiano", async () => {
      // 1 de enero 2025 (Año Nuevo)
      const date = new Date(2025, 0, 1);
      expect(await isBusinessDay(date)).toBe(false);
    });

    it("debe retornar false para el 20 de julio (festivo colombiano)", async () => {
      // 20 de julio 2025 (Día de la Independencia)
      const date = new Date(2025, 6, 20);
      expect(await isBusinessDay(date)).toBe(false);
    });
  });

  describe("addBusinessDays", () => {
    it("debe agregar días hábiles correctamente sin fines de semana", async () => {
      // Lunes 13 de enero 2025 + 5 días hábiles = Lunes 20 de enero 2025
      const start = new Date(2025, 0, 13);
      const result = await addBusinessDays(start, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0);
    });

    it("debe saltar fines de semana", async () => {
      // Viernes 17 de enero 2025 + 1 día hábil = Lunes 20 de enero 2025
      const start = new Date(2025, 0, 17);
      const result = await addBusinessDays(start, 1);
      expect(result.getDate()).toBe(20);
    });

    it("debe saltar festivos colombianos", async () => {
      // Si hay un festivo en el camino, debe saltarlo
      // 6 de enero 2025 es festivo (Epifanía)
      const start = new Date(2025, 0, 3); // Viernes
      const result = await addBusinessDays(start, 1);
      // Salta sábado 4, domingo 5, festivo 6, llega al martes 7
      expect(result.getDate()).toBe(7);
    });
  });

  describe("calculateEstimatedDeliveryDate", () => {
    it("debe calcular 25 días hábiles desde una fecha", async () => {
      const start = new Date(2025, 0, 13); // Lunes 13 de enero
      const result = await calculateEstimatedDeliveryDate(start);
      
      // 25 días hábiles desde el 13 de enero
      // Debe ser aproximadamente 5 semanas después (considerando fines de semana)
      expect(result.getMonth()).toBe(1); // Febrero
    });
  });

  describe("Festivos Colombianos", () => {
    it("debe tener festivos para 2025", () => {
      const holidays2025 = COLOMBIAN_HOLIDAYS.filter(h => h.date.startsWith("2025"));
      expect(holidays2025.length).toBeGreaterThan(15);
    });

    it("debe tener festivos para 2026", () => {
      const holidays2026 = COLOMBIAN_HOLIDAYS.filter(h => h.date.startsWith("2026"));
      expect(holidays2026.length).toBeGreaterThan(15);
    });

    it("debe incluir el 1 de enero como festivo", () => {
      const dates = COLOMBIAN_HOLIDAYS.map(h => h.date);
      expect(dates).toContain("2025-01-01");
      expect(dates).toContain("2026-01-01");
    });

    it("debe incluir el 25 de diciembre como festivo", () => {
      const dates = COLOMBIAN_HOLIDAYS.map(h => h.date);
      expect(dates).toContain("2025-12-25");
      expect(dates).toContain("2026-12-25");
    });
  });
});

describe("Ruta INNOVAR - Sistema de Recordatorios", () => {
  describe("REMINDER_CONFIG", () => {
    it("debe tener configuración para cotización sin respuesta", () => {
      expect(REMINDER_CONFIG.cotizacion_sin_respuesta).toBeDefined();
      expect(REMINDER_CONFIG.cotizacion_sin_respuesta.businessDays).toBe(2);
    });

    it("debe tener configuración para diseño pendiente", () => {
      expect(REMINDER_CONFIG.diseno_pendiente).toBeDefined();
      expect(REMINDER_CONFIG.diseno_pendiente.businessDays).toBe(3);
    });

    it("debe tener configuración para aprobación pendiente", () => {
      expect(REMINDER_CONFIG.aprobacion_pendiente).toBeDefined();
      expect(REMINDER_CONFIG.aprobacion_pendiente.businessDays).toBe(5);
    });

    it("debe tener configuración para instalación próxima", () => {
      expect(REMINDER_CONFIG.instalacion_proxima).toBeDefined();
      expect(REMINDER_CONFIG.instalacion_proxima.businessDays).toBe(-3); // 3 días antes
    });

    it("debe tener configuración para producción retrasada", () => {
      expect(REMINDER_CONFIG.produccion_retrasada).toBeDefined();
      expect(REMINDER_CONFIG.produccion_retrasada.businessDays).toBe(20);
    });

    it("debe tener rol objetivo para cada tipo de recordatorio", () => {
      expect(REMINDER_CONFIG.cotizacion_sin_respuesta.targetRole).toBe("admin");
      expect(REMINDER_CONFIG.diseno_pendiente.targetRole).toBe("disenador");
      expect(REMINDER_CONFIG.aprobacion_pendiente.targetRole).toBe("admin");
      expect(REMINDER_CONFIG.produccion_retrasada.targetRole).toBe("jefe_taller");
      expect(REMINDER_CONFIG.instalacion_proxima.targetRole).toBe("jefe_taller");
    });
  });
});

describe("Ruta INNOVAR - Flujo de Estados", () => {
  const VALID_STATUS_FLOW = [
    "cotizacion_enviada",
    "cotizacion_aprobada", 
    "adelanto_recibido",
    "en_diseno",
    "pendiente_cliente",
    "aprobacion_final",
    "corte",
    "enchape",
    "ensamble",
    "listo_instalacion",
    "instalacion_programada",
    "entregado",
  ];

  it("debe tener todos los estados en orden", () => {
    expect(VALID_STATUS_FLOW.length).toBe(12);
  });

  it("debe empezar con cotizacion_enviada", () => {
    expect(VALID_STATUS_FLOW[0]).toBe("cotizacion_enviada");
  });

  it("debe terminar con entregado", () => {
    expect(VALID_STATUS_FLOW[VALID_STATUS_FLOW.length - 1]).toBe("entregado");
  });

  it("debe tener las etapas de producción en orden correcto", () => {
    const corteIndex = VALID_STATUS_FLOW.indexOf("corte");
    const enchapeIndex = VALID_STATUS_FLOW.indexOf("enchape");
    const ensambleIndex = VALID_STATUS_FLOW.indexOf("ensamble");
    
    expect(corteIndex).toBeLessThan(enchapeIndex);
    expect(enchapeIndex).toBeLessThan(ensambleIndex);
  });
});
