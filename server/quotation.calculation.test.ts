import { describe, it, expect } from "vitest";

/**
 * Test para verificar el cálculo correcto de cotizaciones de cocina
 * 
 * Lógica:
 * - 1 metro lineal de cocina = 2 metros (inferior + superior)
 * - Precio por metro: $900,000
 * - Ejemplo: 4.5ml × 2 = 9 metros × $900,000 = $8,100,000
 */

describe("Quotation Kitchen Calculation", () => {
  // Precios
  const MUEBLE_INFERIOR_ML = 900000;
  const MUEBLE_SUPERIOR_ML = 900000;
  const MESON_SINTERIZADO = 1100000;
  const MESON_RECARGO_FONDO = 0.30; // 30%

  /**
   * Función simulada del cálculo de cocina
   * Basada en calculateKitchenTotal() de Quotations.tsx
   */
  function calculateKitchenTotal(config: {
    shape: string;
    totalMeters: number;
    countertop?: { type?: string; depthSurcharge?: string };
    specialModules?: Record<string, boolean>;
  }): number {
    let total = 0;

    // 1. Calcular metraje resultante (descontar muebles especiales)
    let deductions = 0;
    const isSpecialShape = [
      "frente_pll",
      "solo_superiores",
      "solo_inferiores",
      "puertas_tapas",
      "solo_acabados",
    ].includes(config.shape);

    if (!isSpecialShape && config.specialModules) {
      if (config.specialModules.nichoNevecon) deductions += 1.0; // 100cm
      if (config.specialModules.nichoNevera) deductions += 0.75; // 75cm
      if (config.specialModules.alacenaEntrepanos) deductions += 0.5; // 50cm
      if (config.specialModules.alacenaHerraje) deductions += 0.5; // 50cm
      if (config.specialModules.torreHornos) deductions += 0.7; // 70cm
    }

    const resultingMeters = Math.max(0, config.totalMeters - deductions);

    // 2. Muebles lineales según forma
    if (config.shape === "frente_pll") {
      total += config.totalMeters * 900000; // COCINA_ML_FRENTE_PLL
    } else if (config.shape === "solo_superiores") {
      total += config.totalMeters * MUEBLE_SUPERIOR_ML;
    } else if (config.shape === "solo_inferiores") {
      total += config.totalMeters * MUEBLE_INFERIOR_ML;
    } else {
      // Cocinas completas (L, U, Lineal)
      total += resultingMeters * MUEBLE_INFERIOR_ML;
      total += resultingMeters * MUEBLE_SUPERIOR_ML;
    }

    // 3. Mesón (si aplica)
    if (
      config.shape !== "solo_superiores" &&
      config.shape !== "puertas_tapas" &&
      config.countertop?.type
    ) {
      const basePrice =
        config.countertop.type === "quarzone" ? 650000 : MESON_SINTERIZADO;
      let countertopPrice = basePrice;

      const surchargePercent = MESON_RECARGO_FONDO;
      if (config.countertop.depthSurcharge === "30percent") {
        countertopPrice = basePrice * (1 + surchargePercent);
      } else if (config.countertop.depthSurcharge === "double") {
        countertopPrice = basePrice * 2;
      }

      const metersForCountertop = isSpecialShape
        ? config.totalMeters
        : resultingMeters;
      total += metersForCountertop * countertopPrice;
    }

    return total;
  }

  // ============================================
  // TESTS
  // ============================================

  it("Cocina en L 4.5ml sin mesón = $8,100,000", () => {
    const result = calculateKitchenTotal({
      shape: "L",
      totalMeters: 4.5,
      specialModules: {},
    });

    // 4.5 × $900,000 (inferior) + 4.5 × $900,000 (superior) = $8,100,000
    expect(result).toBe(8100000);
  });

  it("Cocina en L 4.5ml con mesón sinterizado = $13,050,000", () => {
    const result = calculateKitchenTotal({
      shape: "L",
      totalMeters: 4.5,
      countertop: { type: "sinterizado", depthSurcharge: "none" },
      specialModules: {},
    });

    // Muebles: 4.5 × $900,000 × 2 = $8,100,000
    // Mesón: 4.5 × $1,100,000 = $4,950,000
    // Total: $13,050,000
    expect(result).toBe(13050000);
  });

  it("Cocina en L 4.5ml con mesón sinterizado + 30% recargo = $14,535,000", () => {
    const result = calculateKitchenTotal({
      shape: "L",
      totalMeters: 4.5,
      countertop: { type: "sinterizado", depthSurcharge: "30percent" },
      specialModules: {},
    });

    // Muebles: 4.5 × $900,000 × 2 = $8,100,000
    // Mesón: 4.5 × $1,100,000 × 1.30 = $6,435,000
    // Total: $14,535,000
    expect(result).toBe(14535000);
  });

  it("Cocina en L 4.5ml con mesón cuarzo = $11,025,000", () => {
    const result = calculateKitchenTotal({
      shape: "L",
      totalMeters: 4.5,
      countertop: { type: "quarzone", depthSurcharge: "none" },
      specialModules: {},
    });

    // Muebles: 4.5 × $900,000 × 2 = $8,100,000
    // Mesón: 4.5 × $650,000 = $2,925,000
    // Total: $11,025,000
    expect(result).toBe(11025000);
  });

  it("Solo muebles superiores 4.5ml = $4,050,000", () => {
    const result = calculateKitchenTotal({
      shape: "solo_superiores",
      totalMeters: 4.5,
      specialModules: {},
    });

    // 4.5 × $900,000 = $4,050,000
    expect(result).toBe(4050000);
  });

  it("Solo muebles inferiores 4.5ml = $4,050,000", () => {
    const result = calculateKitchenTotal({
      shape: "solo_inferiores",
      totalMeters: 4.5,
      specialModules: {},
    });

    // 4.5 × $900,000 = $4,050,000
    expect(result).toBe(4050000);
  });

  it("Frente PLL 4.5ml = $4,050,000", () => {
    const result = calculateKitchenTotal({
      shape: "frente_pll",
      totalMeters: 4.5,
      specialModules: {},
    });

    // 4.5 × $900,000 = $4,050,000
    expect(result).toBe(4050000);
  });

  it("Cocina en U 3ml con mesón sinterizado = $8,700,000", () => {
    const result = calculateKitchenTotal({
      shape: "U",
      totalMeters: 3,
      countertop: { type: "sinterizado", depthSurcharge: "none" },
      specialModules: {},
    });

    // Muebles: 3 × $900,000 × 2 = $5,400,000
    // Mesón: 3 × $1,100,000 = $3,300,000
    // Total: $8,700,000
    expect(result).toBe(8700000);
  });

  it("Cocina lineal 2.5ml sin mesón = $4,500,000", () => {
    const result = calculateKitchenTotal({
      shape: "lineal",
      totalMeters: 2.5,
      specialModules: {},
    });

    // 2.5 × $900,000 × 2 = $4,500,000
    expect(result).toBe(4500000);
  });

  it("Cocina en L 5ml con nicho nevecon (descuento 1ml) = $11,600,000", () => {
    const result = calculateKitchenTotal({
      shape: "L",
      totalMeters: 5,
      countertop: { type: "sinterizado", depthSurcharge: "none" },
      specialModules: { nichoNevecon: true },
    });

    // Metraje resultante: 5 - 1.0 = 4ml
    // Muebles: 4 × $900,000 × 2 = $7,200,000
    // Mesón: 4 × $1,100,000 = $4,400,000
    // Total: $11,600,000
    expect(result).toBe(11600000);
  });
});
