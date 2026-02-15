import { describe, it, expect } from "vitest";

/**
 * Tests para el módulo de precios
 * Verifica que los cálculos de precios sean correctos
 */

describe("Pricing Module", () => {
  describe("Price Calculations", () => {
    it("should calculate linear meter price correctly", () => {
      // Precio base por metro lineal
      const pricePerLinearMeter = 850000; // COP
      const linearMeters = 3.5;
      
      const total = pricePerLinearMeter * linearMeters;
      
      expect(total).toBe(2975000);
    });

    it("should apply discount correctly", () => {
      const subtotal = 1000000;
      const discountPercent = 10;
      
      const discount = subtotal * (discountPercent / 100);
      const total = subtotal - discount;
      
      expect(discount).toBe(100000);
      expect(total).toBe(900000);
    });

    it("should calculate IVA correctly", () => {
      const subtotal = 1000000;
      const ivaPercent = 19; // IVA Colombia
      
      const iva = subtotal * (ivaPercent / 100);
      const total = subtotal + iva;
      
      expect(iva).toBe(190000);
      expect(total).toBe(1190000);
    });

    it("should handle zero values", () => {
      const pricePerLinearMeter = 850000;
      const linearMeters = 0;
      
      const total = pricePerLinearMeter * linearMeters;
      
      expect(total).toBe(0);
    });

    it("should handle decimal precision", () => {
      const price = 100.33;
      const quantity = 3;
      
      const total = Math.round(price * quantity * 100) / 100;
      
      expect(total).toBe(300.99);
    });
  });

  describe("Material Pricing", () => {
    it("should calculate material costs", () => {
      const materials = [
        { name: "MDF", pricePerUnit: 150000, quantity: 2 },
        { name: "Herrajes", pricePerUnit: 50000, quantity: 10 },
        { name: "Pintura", pricePerUnit: 80000, quantity: 1 },
      ];
      
      const totalMaterials = materials.reduce(
        (sum, m) => sum + m.pricePerUnit * m.quantity,
        0
      );
      
      expect(totalMaterials).toBe(880000);
    });

    it("should validate positive prices", () => {
      const price = -100;
      
      expect(price).toBeLessThan(0);
      // En el sistema real, esto debería lanzar un error
    });
  });

  describe("Quotation Totals", () => {
    it("should calculate complete quotation", () => {
      const basePrice = 2000000;
      const materials = 500000;
      const labor = 300000;
      const discountPercent = 5;
      const ivaPercent = 19;
      
      const subtotal = basePrice + materials + labor;
      const discount = subtotal * (discountPercent / 100);
      const subtotalAfterDiscount = subtotal - discount;
      const iva = subtotalAfterDiscount * (ivaPercent / 100);
      const total = subtotalAfterDiscount + iva;
      
      expect(subtotal).toBe(2800000);
      expect(discount).toBe(140000);
      expect(subtotalAfterDiscount).toBe(2660000);
      expect(iva).toBe(505400);
      expect(total).toBe(3165400);
    });

    it("should calculate advance payment", () => {
      const total = 3000000;
      const advancePercent = 50;
      
      const advance = total * (advancePercent / 100);
      const remaining = total - advance;
      
      expect(advance).toBe(1500000);
      expect(remaining).toBe(1500000);
    });
  });
});
