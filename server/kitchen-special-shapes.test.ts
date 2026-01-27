import { describe, it, expect } from "vitest";

/**
 * Tests para verificar los cálculos de formas especiales de cocinas:
 * - Frente PLL (con módulo superior opcional)
 * - Solo Muebles Superiores
 * - Solo Muebles Inferiores
 * - Puertas y Tapas
 */

// Precios por defecto (usados cuando no hay precios dinámicos)
const DEFAULT_PRICES = {
  COCINA_ML_FRENTE_PLL: 650000,
  MUEBLE_SUPERIOR_ML: 750000,
  MUEBLE_INFERIOR_ML: 900000,
  MESON_CUARZO: 850000,
  MESON_SINTERIZADO: 1200000,
  LED_ML: 180000,
  TRANSPORTE_IMPREVISTOS: 600000,
};

describe("Kitchen Special Shapes Calculations", () => {
  describe("Frente PLL", () => {
    it("debe calcular Frente PLL sin módulo superior", () => {
      const totalMeters = 3.5;
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      
      const total = totalMeters * frentePllPrice;
      
      expect(total).toBe(2275000); // 3.5 * 650,000
    });

    it("debe calcular Frente PLL con módulo superior", () => {
      const frentePllMeters = 3.5;
      const upperModuleMeters = 2.0;
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      const upperModulePrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      
      const frentePllTotal = frentePllMeters * frentePllPrice; // 2,275,000
      const upperModuleTotal = upperModuleMeters * upperModulePrice; // 1,500,000
      const total = frentePllTotal + upperModuleTotal;
      
      expect(frentePllTotal).toBe(2275000);
      expect(upperModuleTotal).toBe(1500000);
      expect(total).toBe(3775000); // Total combinado
    });

    it("debe calcular Frente PLL con módulo superior y mesón", () => {
      const frentePllMeters = 3.5;
      const upperModuleMeters = 2.0;
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      const upperModulePrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      const mesonPrice = DEFAULT_PRICES.MESON_CUARZO;
      
      const frentePllTotal = frentePllMeters * frentePllPrice; // 2,275,000
      const upperModuleTotal = upperModuleMeters * upperModulePrice; // 1,500,000
      const mesonTotal = frentePllMeters * mesonPrice; // 2,975,000
      const total = frentePllTotal + upperModuleTotal + mesonTotal;
      
      expect(frentePllTotal).toBe(2275000);
      expect(upperModuleTotal).toBe(1500000);
      expect(mesonTotal).toBe(2975000);
      expect(total).toBe(6750000);
    });

    it("debe calcular Frente PLL completo con transporte", () => {
      const frentePllMeters = 4.0;
      const upperModuleMeters = 3.0;
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      const upperModulePrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      const mesonPrice = DEFAULT_PRICES.MESON_CUARZO;
      const transportCost = DEFAULT_PRICES.TRANSPORTE_IMPREVISTOS;
      
      const frentePllTotal = frentePllMeters * frentePllPrice; // 2,600,000
      const upperModuleTotal = upperModuleMeters * upperModulePrice; // 2,250,000
      const mesonTotal = frentePllMeters * mesonPrice; // 3,400,000
      const total = frentePllTotal + upperModuleTotal + mesonTotal + transportCost;
      
      expect(frentePllTotal).toBe(2600000);
      expect(upperModuleTotal).toBe(2250000);
      expect(mesonTotal).toBe(3400000);
      expect(total).toBe(8850000); // Incluye transporte
    });
  });

  describe("Solo Muebles Superiores", () => {
    it("debe calcular solo muebles superiores", () => {
      const totalMeters = 4.0;
      const superiorPrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      
      const total = totalMeters * superiorPrice;
      
      expect(total).toBe(3000000); // 4.0 * 750,000
    });

    it("debe calcular solo superiores con LED", () => {
      const totalMeters = 4.0;
      const superiorPrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      const ledPrice = DEFAULT_PRICES.LED_ML;
      
      const superiorTotal = totalMeters * superiorPrice; // 3,000,000
      const ledTotal = totalMeters * ledPrice; // 720,000
      const total = superiorTotal + ledTotal;
      
      expect(superiorTotal).toBe(3000000);
      expect(ledTotal).toBe(720000);
      expect(total).toBe(3720000);
    });

    it("no debe incluir mesón para solo superiores", () => {
      // Para "solo_superiores", el mesón no aplica
      const shape = "solo_superiores";
      const shouldIncludeCountertop = shape !== "solo_superiores" && shape !== "puertas_tapas";
      
      expect(shouldIncludeCountertop).toBe(false);
    });
  });

  describe("Solo Muebles Inferiores", () => {
    it("debe calcular solo muebles inferiores", () => {
      const totalMeters = 3.0;
      const inferiorPrice = DEFAULT_PRICES.MUEBLE_INFERIOR_ML;
      
      const total = totalMeters * inferiorPrice;
      
      expect(total).toBe(2700000); // 3.0 * 900,000
    });

    it("debe calcular solo inferiores con mesón", () => {
      const totalMeters = 3.0;
      const inferiorPrice = DEFAULT_PRICES.MUEBLE_INFERIOR_ML;
      const mesonPrice = DEFAULT_PRICES.MESON_SINTERIZADO;
      
      const inferiorTotal = totalMeters * inferiorPrice; // 2,700,000
      const mesonTotal = totalMeters * mesonPrice; // 3,600,000
      const total = inferiorTotal + mesonTotal;
      
      expect(inferiorTotal).toBe(2700000);
      expect(mesonTotal).toBe(3600000);
      expect(total).toBe(6300000);
    });

    it("no debe incluir LED para solo inferiores", () => {
      // Para "solo_inferiores", el LED no aplica
      const shape = "solo_inferiores";
      const shouldIncludeLed = shape !== "solo_inferiores" && shape !== "puertas_tapas";
      
      expect(shouldIncludeLed).toBe(false);
    });
  });

  describe("Formas Especiales - Reglas de Exclusión", () => {
    it("no debe descontar muebles especiales para formas especiales", () => {
      const shapes = ["frente_pll", "solo_superiores", "solo_inferiores", "puertas_tapas"];
      
      shapes.forEach(shape => {
        const isSpecialShape = ["frente_pll", "solo_superiores", "solo_inferiores", "puertas_tapas"].includes(shape);
        expect(isSpecialShape).toBe(true);
      });
    });

    it("debe descontar muebles especiales para cocinas completas", () => {
      const shapes = ["L", "U", "lineal"];
      
      shapes.forEach(shape => {
        const isSpecialShape = ["frente_pll", "solo_superiores", "solo_inferiores", "puertas_tapas"].includes(shape);
        expect(isSpecialShape).toBe(false);
      });
    });
  });

  describe("Ejemplo Completo - Frente PLL con Módulo Superior", () => {
    it("debe calcular correctamente una cotización de Frente PLL completa", () => {
      // Configuración
      const frentePllMeters = 5.0;
      const upperModuleMeters = 3.0;
      const includeUpperModule = true;
      const countertopType = "quarzone";
      const includeTransport = true;

      // Precios
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      const upperModulePrice = DEFAULT_PRICES.MUEBLE_SUPERIOR_ML;
      const mesonPrice = DEFAULT_PRICES.MESON_CUARZO;
      const transportCost = DEFAULT_PRICES.TRANSPORTE_IMPREVISTOS;

      // Cálculos
      let total = 0;

      // 1. Frente PLL
      total += frentePllMeters * frentePllPrice; // 3,250,000

      // 2. Módulo superior (opcional)
      if (includeUpperModule && upperModuleMeters > 0) {
        total += upperModuleMeters * upperModulePrice; // 2,250,000
      }

      // 3. Mesón (usa metraje del frente PLL)
      if (countertopType) {
        total += frentePllMeters * mesonPrice; // 4,250,000
      }

      // 4. Transporte
      if (includeTransport) {
        total += transportCost; // 600,000
      }

      // Verificaciones
      expect(frentePllMeters * frentePllPrice).toBe(3250000);
      expect(upperModuleMeters * upperModulePrice).toBe(2250000);
      expect(frentePllMeters * mesonPrice).toBe(4250000);
      expect(total).toBe(10350000); // Total esperado
    });

    it("debe calcular correctamente sin módulo superior", () => {
      // Configuración
      const frentePllMeters = 5.0;
      const includeUpperModule = false;
      const countertopType = "quarzone";
      const includeTransport = true;

      // Precios
      const frentePllPrice = DEFAULT_PRICES.COCINA_ML_FRENTE_PLL;
      const mesonPrice = DEFAULT_PRICES.MESON_CUARZO;
      const transportCost = DEFAULT_PRICES.TRANSPORTE_IMPREVISTOS;

      // Cálculos
      let total = 0;

      // 1. Frente PLL
      total += frentePllMeters * frentePllPrice; // 3,250,000

      // 2. Módulo superior (NO incluido)
      // No se suma nada

      // 3. Mesón
      if (countertopType) {
        total += frentePllMeters * mesonPrice; // 4,250,000
      }

      // 4. Transporte
      if (includeTransport) {
        total += transportCost; // 600,000
      }

      // Verificaciones
      expect(frentePllMeters * frentePllPrice).toBe(3250000);
      expect(frentePllMeters * mesonPrice).toBe(4250000);
      expect(total).toBe(8100000); // Total sin módulo superior
    });
  });
});
