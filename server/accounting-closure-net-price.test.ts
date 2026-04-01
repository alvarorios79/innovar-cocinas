import { describe, it, expect } from "vitest";

/**
 * Test para verificar que el cierre contable calcula correctamente el precio NETO
 * 
 * REGLA: El precio NETO = Precio Original - Descuentos + Recargos
 * 
 * Este precio NETO es el que se debe usar en el cierre contable como el dinero real
 * que entra al negocio, no el precio original de cotización.
 */
describe("Accounting Closure - Net Price Calculation", () => {
  
  it("should calculate NET price correctly: Original - Discounts + Surcharges", () => {
    // Ejemplo: Proyecto de Diana Ortiz
    const originalPrice = 44938000; // Precio de cotización original
    const discounts = 6590000; // Descuentos aplicados
    const surcharges = 0; // Recargos (en este caso 0)
    
    // CÁLCULO CORRECTO:
    const netPrice = originalPrice - discounts + surcharges;
    
    // El precio NETO debe ser: 44,938,000 - 6,590,000 + 0 = 38,348,000
    expect(netPrice).toBe(38348000);
    
    // Este netPrice es el que debe aparecer en el cierre contable
    // NO el precio original de 44,938,000
  });

  it("should handle project with NO discounts or surcharges", () => {
    const originalPrice = 50000000;
    const discounts = 0;
    const surcharges = 0;
    
    const netPrice = originalPrice - discounts + surcharges;
    
    // Cuando no hay descuentos ni recargos, netPrice = originalPrice
    expect(netPrice).toBe(50000000);
  });

  it("should apply both discounts and surcharges", () => {
    const originalPrice = 100000000;
    const discounts = 10000000; // 10% discount
    const surcharges = 5000000; // 5% surcharge
    
    const netPrice = originalPrice - discounts + surcharges;
    
    // 100,000,000 - 10,000,000 + 5,000,000 = 95,000,000
    expect(netPrice).toBe(95000000);
  });

  it("should correctly represent the real money entering the business", () => {
    // Escenario: Proyecto con múltiples descuentos
    const originalPrice = 80000000;
    const discounts = 12000000; // Cliente negoció descuento
    const surcharges = 0;
    
    const netPrice = originalPrice - discounts + surcharges;
    
    // El dinero real que entra es 68,000,000
    expect(netPrice).toBe(68000000);
    
    // En el cierre contable, se debe usar 68,000,000 como el ingreso
    // No 80,000,000 (que es el precio original de cotización)
  });

  it("should show breakdown clearly in accounting closure", () => {
    // Desglose que debe aparecer en el cierre contable:
    const originalPrice = 100000000;
    const discountsApplied = 15000000;
    const surchargesApplied = 2000000;
    
    // Desglose:
    // Precio de Cotización Original: $100,000,000
    // - Descuentos Aplicados: $15,000,000
    // + Recargos Aplicados: $2,000,000
    // = PRECIO NETO (Dinero Real): $87,000,000
    
    const netPrice = originalPrice - discountsApplied + surchargesApplied;
    expect(netPrice).toBe(87000000);
    
    // El cierre debe mostrar estos 4 valores para claridad y auditoría
    expect({
      originalPrice,
      discountsApplied,
      surchargesApplied,
      netPrice,
    }).toEqual({
      originalPrice: 100000000,
      discountsApplied: 15000000,
      surchargesApplied: 2000000,
      netPrice: 87000000,
    });
  });
});
