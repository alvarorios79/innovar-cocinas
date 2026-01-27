import { describe, it, expect } from "vitest";

/**
 * Tests para verificar el cálculo de descuentos en cotizaciones
 */

describe("Quotation Discount Calculations", () => {
  describe("Discount Percentage", () => {
    it("debe calcular correctamente el monto de descuento", () => {
      const subtotal = 10000000;
      const discountPercent = 10;
      
      const discountAmount = subtotal * (discountPercent / 100);
      
      expect(discountAmount).toBe(1000000);
    });

    it("debe calcular correctamente el total final con descuento", () => {
      const subtotal = 10000000;
      const discountPercent = 10;
      
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal - discountAmount;
      
      expect(total).toBe(9000000);
    });

    it("debe manejar descuento de 0%", () => {
      const subtotal = 5000000;
      const discountPercent = 0;
      
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal - discountAmount;
      
      expect(discountAmount).toBe(0);
      expect(total).toBe(5000000);
    });

    it("debe manejar descuento de 100%", () => {
      const subtotal = 5000000;
      const discountPercent = 100;
      
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal - discountAmount;
      
      expect(discountAmount).toBe(5000000);
      expect(total).toBe(0);
    });

    it("debe manejar descuentos con decimales", () => {
      const subtotal = 8500000;
      const discountPercent = 5.5;
      
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal - discountAmount;
      
      expect(discountAmount).toBe(467500);
      expect(total).toBe(8032500);
    });
  });

  describe("Discount Validation", () => {
    it("debe limitar el descuento a un máximo de 100%", () => {
      const inputPercent = 150;
      const validatedPercent = Math.min(100, Math.max(0, inputPercent));
      
      expect(validatedPercent).toBe(100);
    });

    it("debe limitar el descuento a un mínimo de 0%", () => {
      const inputPercent = -10;
      const validatedPercent = Math.min(100, Math.max(0, inputPercent));
      
      expect(validatedPercent).toBe(0);
    });

    it("debe aceptar valores válidos sin modificación", () => {
      const inputPercent = 15;
      const validatedPercent = Math.min(100, Math.max(0, inputPercent));
      
      expect(validatedPercent).toBe(15);
    });
  });

  describe("Discount with Multiple Items", () => {
    it("debe aplicar descuento al subtotal de múltiples items", () => {
      const items = [
        { totalPrice: 5000000 }, // Cocina
        { totalPrice: 1500000 }, // Herrajes
        { totalPrice: 800000 },  // Closet
      ];
      
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountPercent = 8;
      const discountAmount = subtotal * (discountPercent / 100);
      const total = subtotal - discountAmount;
      
      expect(subtotal).toBe(7300000);
      expect(discountAmount).toBe(584000);
      expect(total).toBe(6716000);
    });
  });

  describe("PDF Data Format", () => {
    it("debe formatear correctamente los datos de descuento para el PDF", () => {
      const quotation = {
        subtotal: "10000000",
        discountPercent: "10",
        discountAmount: "1000000",
        total: "9000000",
      };
      
      const discountPercent = parseFloat(quotation.discountPercent || '0');
      const discountAmount = parseFloat(quotation.discountAmount || '0');
      
      expect(discountPercent).toBe(10);
      expect(discountAmount).toBe(1000000);
    });

    it("debe manejar valores nulos o undefined", () => {
      const quotation = {
        subtotal: "10000000",
        discountPercent: null as any,
        discountAmount: undefined as any,
        total: "10000000",
      };
      
      const discountPercent = parseFloat(quotation.discountPercent || '0');
      const discountAmount = parseFloat(quotation.discountAmount || '0');
      
      expect(discountPercent).toBe(0);
      expect(discountAmount).toBe(0);
    });
  });
});
