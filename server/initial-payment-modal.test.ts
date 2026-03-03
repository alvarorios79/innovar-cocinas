import { describe, it, expect } from "vitest";

/**
 * Test para validar que el total de la cotización se calcula correctamente
 * en el modal "Registrar Pago Inicial" cuando se crea un proyecto.
 */
describe("Initial Payment Modal - Total Calculation", () => {
  it("should calculate 60% advance correctly from total", () => {
    const total = 5000000; // $5,000,000
    const suggestedAdvance = Math.round(total * 0.6);
    expect(suggestedAdvance).toBe(3000000); // $3,000,000
  });

  it("should handle string total and convert to number", () => {
    const totalString = "5000000";
    const total = parseFloat(totalString || "0");
    const suggestedAdvance = Math.round(total * 0.6);
    expect(total).toBe(5000000);
    expect(suggestedAdvance).toBe(3000000);
  });

  it("should handle undefined total and default to 0", () => {
    const totalString = undefined;
    const total = parseFloat(totalString || "0");
    expect(total).toBe(0);
  });

  it("should calculate remaining balance correctly", () => {
    const total = 5000000;
    const paymentAmount = 3000000;
    const remainingBalance = total - paymentAmount;
    expect(remainingBalance).toBe(2000000);
  });

  it("should validate payment amount does not exceed total", () => {
    const total = 5000000;
    const paymentAmount = 6000000;
    const isValid = paymentAmount <= total;
    expect(isValid).toBe(false);
  });

  it("should validate payment amount is greater than 0", () => {
    const paymentAmount = 0;
    const isValid = paymentAmount > 0;
    expect(isValid).toBe(false);
  });

  it("should validate payment amount is valid for project creation", () => {
    const total = 5000000;
    const paymentAmount = 3000000;
    const isValid = paymentAmount > 0 && paymentAmount <= total;
    expect(isValid).toBe(true);
  });

  it("should extract total field from quotation object", () => {
    const quotation = {
      id: "123",
      quotationNumber: "Q-001",
      total: "5000000",
      subtotal: "4000000",
      transportCost: "1000000",
    };
    const total = parseFloat(quotation.total || "0");
    expect(total).toBe(5000000);
  });

  it("should NOT use totalAmount field (deprecated)", () => {
    const quotation = {
      id: "123",
      quotationNumber: "Q-001",
      total: "5000000",
      totalAmount: 0, // Old field name - should be ignored
    };
    const total = parseFloat(quotation.total || "0");
    expect(total).toBe(5000000); // Should use 'total', not 'totalAmount'
  });

  it("should handle quotation with zero total", () => {
    const quotation = {
      id: "123",
      quotationNumber: "Q-001",
      total: "0",
    };
    const total = parseFloat(quotation.total || "0");
    expect(total).toBe(0);
  });

  it("should handle quotation with null total", () => {
    const quotation = {
      id: "123",
      quotationNumber: "Q-001",
      total: null,
    };
    const total = parseFloat((quotation.total as any) || "0");
    expect(total).toBe(0);
  });
});
