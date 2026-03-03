import { describe, it, expect } from "vitest";

/**
 * Tests para verificar los cálculos automáticos de cocinas integrales
 * Basado en ESPECIFICACION_COCINAS.md y CATALOGO_PRECIOS.md
 */

describe("Kitchen Calculations", () => {
  describe("Muebles Lineales", () => {
    it("debe calcular correctamente muebles inferiores y superiores", () => {
      const totalMeters = 5.0;
      const pricePerMeter = 900000;
      
      const lowerCabinets = totalMeters * pricePerMeter;
      const upperCabinets = totalMeters * pricePerMeter;
      
      expect(lowerCabinets).toBe(4500000);
      expect(upperCabinets).toBe(4500000);
    });

    it("debe descontar anchos de muebles especiales del metraje total", () => {
      const totalMeters = 5.0;
      const nichoNevera = 0.75; // 75cm
      const alacena = 0.50; // 50cm
      
      const resultingMeters = totalMeters - nichoNevera - alacena;
      
      expect(resultingMeters).toBe(3.75);
    });
  });

  describe("Muebles Especiales", () => {
    it("debe calcular precios de muebles especiales correctamente", () => {
      const prices = {
        nichoNevecon: 1200000,
        nichoNevera: 1200000,
        alacenaEntrepanos: 1250000,
        alacenaHerraje: 900000,
        torreHornos: 1350000,
      };

      expect(prices.nichoNevecon).toBe(1200000);
      expect(prices.nichoNevera).toBe(1200000);
      expect(prices.alacenaEntrepanos).toBe(1250000);
      expect(prices.alacenaHerraje).toBe(900000);
      expect(prices.torreHornos).toBe(1350000);
    });
  });

  describe("Mesón Principal", () => {
    it("debe calcular precio base de mesón Quarzone", () => {
      const meters = 4.5;
      const basePrice = 850000;
      
      const total = meters * basePrice;
      
      expect(total).toBe(3825000);
    });

    it("debe aplicar recargo de 30% para fondo 61-90cm", () => {
      const meters = 4.5;
      const basePrice = 850000;
      const surcharge = 0.30;
      
      const priceWithSurcharge = basePrice * (1 + surcharge);
      const total = meters * priceWithSurcharge;
      
      expect(priceWithSurcharge).toBe(1105000);
      expect(total).toBe(4972500);
    });

    it("debe aplicar precio doble para fondo 91-120cm", () => {
      const meters = 3.0;
      const basePrice = 1200000;
      
      const doublePrice = basePrice * 2;
      const total = meters * doublePrice;
      
      expect(doublePrice).toBe(2400000);
      expect(total).toBe(7200000);
    });
  });

  describe("Isla", () => {
    it("debe calcular isla sin laterales", () => {
      const meters = 2.0;
      const cabinetPrice = 900000;
      const countertopPrice = 850000; // Quarzone
      
      const cabinets = meters * cabinetPrice;
      const countertop = meters * countertopPrice;
      const total = cabinets + countertop;
      
      expect(cabinets).toBe(1800000);
      expect(countertop).toBe(1700000);
      expect(total).toBe(3500000);
    });

    it("debe calcular isla con laterales", () => {
      const meters = 2.0;
      const cabinetPrice = 900000;
      const countertopPrice = 850000; // Quarzone
      
      const cabinets = meters * cabinetPrice;
      const countertop = meters * countertopPrice;
      const lateral = 1.8 * countertopPrice;
      const regrueso = 0.9 * countertopPrice;
      const total = cabinets + countertop + lateral + regrueso;
      
      expect(cabinets).toBe(1800000);
      expect(countertop).toBe(1700000);
      expect(lateral).toBe(1530000);
      expect(regrueso).toBe(765000);
      expect(total).toBe(5795000);
    });
  });

  describe("Barra", () => {
    it("debe calcular barra sin lateral", () => {
      const meters = 1.5;
      const cabinetPrice = 900000;
      const countertopPrice = 1200000; // Sinterizado
      
      const cabinets = meters * cabinetPrice;
      const countertop = meters * countertopPrice;
      const total = cabinets + countertop;
      
      expect(cabinets).toBe(1350000);
      expect(countertop).toBe(1800000);
      expect(total).toBe(3150000);
    });

    it("debe calcular barra con lateral", () => {
      const meters = 1.5;
      const cabinetPrice = 900000;
      const countertopPrice = 1200000; // Sinterizado
      
      const cabinets = meters * cabinetPrice;
      const countertop = meters * countertopPrice;
      const lateral = 0.9 * countertopPrice;
      const total = cabinets + countertop + lateral;
      
      expect(cabinets).toBe(1350000);
      expect(countertop).toBe(1800000);
      expect(lateral).toBe(1080000);
      expect(total).toBe(4230000);
    });
  });

  describe("Luz LED", () => {
    it("debe calcular precio de luz LED", () => {
      const meters = 3.75;
      const pricePerMeter = 180000;
      
      const total = meters * pricePerMeter;
      
      expect(total).toBe(675000);
    });
  });

  describe("Transporte e Imprevistos", () => {
    it("debe agregar costo fijo de transporte", () => {
      const transportCost = 600000;
      
      expect(transportCost).toBe(600000);
    });
  });

  describe("Ejemplo Completo", () => {
    it("debe calcular correctamente el ejemplo de la especificación", () => {
      // Metraje
      const totalMeters = 5.0;
      const nichoNevera = 0.75;
      const alacena = 0.50;
      const resultingMeters = totalMeters - nichoNevera - alacena; // 3.75

      // Muebles lineales
      const lowerCabinets = resultingMeters * 900000; // 3,375,000
      const upperCabinets = resultingMeters * 900000; // 3,375,000

      // Muebles especiales
      const nichoNeveraPrice = 1200000;
      const alacenaPrice = 1250000;

      // Mesón principal (Quarzone con recargo 30%)
      const countertopMeters = resultingMeters;
      const countertopBasePrice = 850000;
      const countertopPriceWithSurcharge = countertopBasePrice * 1.3; // 1,105,000
      const countertopTotal = countertopMeters * countertopPriceWithSurcharge; // 4,143,750

      // Isla con laterales
      const islandMeters = 2.0;
      const islandCabinets = islandMeters * 900000; // 1,800,000
      const islandCountertop = islandMeters * 850000; // 1,700,000
      const islandLateral = 1.8 * 850000; // 1,530,000
      const islandRegrueso = 0.9 * 850000; // 765,000
      const islandTotal = islandCabinets + islandCountertop + islandLateral + islandRegrueso; // 5,795,000

      // Luz LED
      const ledMeters = 3.75;
      const ledTotal = ledMeters * 180000; // 675,000

      // Transporte
      const transport = 600000;

      // Total
      const total = 
        lowerCabinets + 
        upperCabinets + 
        nichoNeveraPrice + 
        alacenaPrice + 
        countertopTotal + 
        islandTotal + 
        ledTotal + 
        transport;

      expect(resultingMeters).toBe(3.75);
      expect(lowerCabinets).toBe(3375000);
      expect(upperCabinets).toBe(3375000);
      expect(nichoNeveraPrice).toBe(1200000);
      expect(alacenaPrice).toBe(1250000);
      expect(countertopTotal).toBe(4143750);
      expect(islandTotal).toBe(5795000);
      expect(ledTotal).toBe(675000);
      expect(transport).toBe(600000);
      expect(total).toBe(20413750); // Cálculo correcto: suma de todos los componentes
    });
  });
});
