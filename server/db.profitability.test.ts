import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests para validar el cálculo de rentabilidad
 * 
 * Fórmula: rentabilidad = (margen / ingresosRecibidos) × 100
 * Donde: margen = ingresosRecibidos - gastos
 */

describe('Profitability Calculations', () => {
  
  describe('rentabilidad calculation', () => {
    
    it('should calculate 100% profitability when no expenses', () => {
      // Dado
      const ingresosRecibidos = 1000;
      const gastos = 0;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Entonces
      expect(rentabilidad).toBe(100);
    });

    it('should calculate 50% profitability when expenses are 50% of income', () => {
      // Dado
      const ingresosRecibidos = 1000;
      const gastos = 500;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Entonces
      expect(rentabilidad).toBe(50);
    });

    it('should calculate 0% profitability when expenses equal income', () => {
      // Dado
      const ingresosRecibidos = 1000;
      const gastos = 1000;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Entonces
      expect(rentabilidad).toBe(0);
    });

    it('should calculate negative profitability when expenses exceed income', () => {
      // Dado
      const ingresosRecibidos = 1000;
      const gastos = 1500;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Entonces
      expect(rentabilidad).toBe(-50);
    });

    it('should return 0 when no income received', () => {
      // Dado
      const ingresosRecibidos = 0;
      const gastos = 500;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Entonces
      expect(rentabilidad).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Dado
      const ingresosRecibidos = 1000;
      const gastos = 333;
      
      // Cuando
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      const redondeada = Math.round(rentabilidad * 100) / 100;
      
      // Entonces
      expect(redondeada).toBe(66.7);
    });
  });

  describe('profitability categorization', () => {
    
    const categorizeRentability = (rentabilidad: number) => {
      if (rentabilidad > 20) return 'healthy';
      if (rentabilidad >= 10 && rentabilidad <= 20) return 'moderate';
      if (rentabilidad >= 5 && rentabilidad < 10) return 'risk';
      return 'critical';
    };

    it('should categorize as healthy when rentabilidad > 20%', () => {
      expect(categorizeRentability(25)).toBe('healthy');
      expect(categorizeRentability(50)).toBe('healthy');
      expect(categorizeRentability(100)).toBe('healthy');
    });

    it('should categorize as moderate when 10% <= rentabilidad <= 20%', () => {
      expect(categorizeRentability(10)).toBe('moderate');
      expect(categorizeRentability(15)).toBe('moderate');
      expect(categorizeRentability(20)).toBe('moderate');
    });

    it('should categorize as risk when 5% <= rentabilidad < 10%', () => {
      expect(categorizeRentability(5)).toBe('risk');
      expect(categorizeRentability(7.5)).toBe('risk');
      expect(categorizeRentability(9.99)).toBe('risk');
    });

    it('should categorize as critical when rentabilidad < 5%', () => {
      expect(categorizeRentability(0)).toBe('critical');
      expect(categorizeRentability(4.99)).toBe('critical');
      expect(categorizeRentability(-10)).toBe('critical');
    });

    it('should correctly categorize boundary values', () => {
      // Límites exactos
      expect(categorizeRentability(20.01)).toBe('healthy');
      expect(categorizeRentability(20)).toBe('moderate');
      expect(categorizeRentability(10)).toBe('moderate');
      expect(categorizeRentability(9.99)).toBe('risk');
      expect(categorizeRentability(5)).toBe('risk');
      expect(categorizeRentability(4.99)).toBe('critical');
    });
  });

  describe('real-world scenarios', () => {
    
    it('should handle a typical kitchen project with 30% margin', () => {
      // Escenario: Proyecto de cocina por $3,400,000
      // Adelanto recibido: $2,040,000 (60%)
      // Gastos: $1,428,000 (42% del total)
      
      const ingresosRecibidos = 2040000;
      const gastos = 1428000;
      
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      const redondeada = Math.round(rentabilidad * 100) / 100;
      
      // Margen esperado: 2040000 - 1428000 = 612000
      // Rentabilidad esperada: (612000 / 2040000) * 100 = 30%
      expect(margen).toBe(612000);
      expect(redondeada).toBe(30);
    });

    it('should handle project with no expenses yet', () => {
      // Escenario: Proyecto recién iniciado con adelanto recibido
      const ingresosRecibidos = 2040000;
      const gastos = 0;
      
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Rentabilidad esperada: 100%
      expect(margen).toBe(2040000);
      expect(rentabilidad).toBe(100);
    });

    it('should handle project with high expenses', () => {
      // Escenario: Proyecto con gastos muy altos
      const ingresosRecibidos = 1000000;
      const gastos = 950000;
      
      const margen = ingresosRecibidos - gastos;
      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100 
        : 0;
      
      // Rentabilidad esperada: 5%
      expect(margen).toBe(50000);
      expect(rentabilidad).toBe(5);
    });
  });

  describe('distribution counting', () => {
    
    const countByCategory = (projects: Array<{ rentabilidad: number }>) => {
      return {
        healthy: projects.filter(p => p.rentabilidad > 20).length,
        moderate: projects.filter(p => p.rentabilidad >= 10 && p.rentabilidad <= 20).length,
        risk: projects.filter(p => p.rentabilidad >= 5 && p.rentabilidad < 10).length,
        critical: projects.filter(p => p.rentabilidad < 5).length,
      };
    };

    it('should correctly count projects in each category', () => {
      // Dado
      const projects = [
        { rentabilidad: 50 },   // healthy
        { rentabilidad: 30 },   // healthy
        { rentabilidad: 15 },   // moderate
        { rentabilidad: 8 },    // risk
        { rentabilidad: 3 },    // critical
        { rentabilidad: 0 },    // critical
      ];
      
      // Cuando
      const distribution = countByCategory(projects);
      
      // Entonces
      expect(distribution.healthy).toBe(2);
      expect(distribution.moderate).toBe(1);
      expect(distribution.risk).toBe(1);
      expect(distribution.critical).toBe(2);
    });

    it('should handle empty project list', () => {
      // Dado
      const projects: Array<{ rentabilidad: number }> = [];
      
      // Cuando
      const distribution = countByCategory(projects);
      
      // Entonces
      expect(distribution.healthy).toBe(0);
      expect(distribution.moderate).toBe(0);
      expect(distribution.risk).toBe(0);
      expect(distribution.critical).toBe(0);
    });

    it('should handle all projects in same category', () => {
      // Dado
      const projects = [
        { rentabilidad: 25 },
        { rentabilidad: 30 },
        { rentabilidad: 50 },
      ];
      
      // Cuando
      const distribution = countByCategory(projects);
      
      // Entonces
      expect(distribution.healthy).toBe(3);
      expect(distribution.moderate).toBe(0);
      expect(distribution.risk).toBe(0);
      expect(distribution.critical).toBe(0);
    });
  });
});
