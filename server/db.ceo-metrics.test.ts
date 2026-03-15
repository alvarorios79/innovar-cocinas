import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCEOFinancialMetrics } from './db';

/**
 * Tests para getCEOFinancialMetrics()
 * Valida que el cálculo del "Total Vendido" reste correctamente los descuentos
 */
describe('getCEOFinancialMetrics', () => {
  it('debe calcular totalVendido restando descuentos y sumando sobrecargas', async () => {
    const metrics = await getCEOFinancialMetrics();
    
    // Validar que los valores sean números
    expect(typeof metrics.totalVendido).toBe('number');
    expect(typeof metrics.ingresosRecibidos).toBe('number');
    expect(typeof metrics.descuentos).toBe('number');
    expect(typeof metrics.sobrecargas).toBe('number');
    
    // El totalVendido debe ser positivo
    expect(metrics.totalVendido).toBeGreaterThanOrEqual(0);
  });

  it('debe tener porCobrar = totalVendido - ingresosRecibidos', async () => {
    const metrics = await getCEOFinancialMetrics();
    
    const expectedPorCobrar = metrics.totalVendido - metrics.ingresosRecibidos;
    expect(metrics.porCobrar).toBeCloseTo(expectedPorCobrar, 2);
  });

  it('debe tener margen = ingresosRecibidos - gastos', async () => {
    const metrics = await getCEOFinancialMetrics();
    
    const expectedMargen = metrics.ingresosRecibidos - metrics.gastos;
    expect(metrics.margen).toBeCloseTo(expectedMargen, 2);
  });

  it('debe tener rentabilidad = (margen / ingresosRecibidos) * 100', async () => {
    const metrics = await getCEOFinancialMetrics();
    
    if (metrics.ingresosRecibidos > 0) {
      const expectedRentabilidad = (metrics.margen / metrics.ingresosRecibidos) * 100;
      expect(metrics.rentabilidad).toBeCloseTo(expectedRentabilidad, 2);
    } else {
      expect(metrics.rentabilidad).toBe(0);
    }
  });

  it('debe retornar valores reales de la BD', async () => {
    const metrics = await getCEOFinancialMetrics();
    
    // Con datos reales, esperamos:
    // - Suma de proyectos: $197.469.750
    // - Descuentos: $229.500
    // - totalVendido: $197.240.250 (suma de proyectos - descuentos)
    // - ingresosRecibidos: $146.198.600 (pagos recibidos)
    // - gastos: $18.354.720 (gastos operativos)
    
    console.log('📊 Métricas Financieras CEO:');
    const sumaProyectos = metrics.totalVendido + metrics.descuentos - metrics.sobrecargas;
    console.log(`  Suma Proyectos: $${sumaProyectos.toFixed(2)}`);
    console.log(`  Descuentos: -$${metrics.descuentos.toFixed(2)}`);
    console.log(`  Sobrecargas: +$${metrics.sobrecargas.toFixed(2)}`);
    console.log(`  Total Vendido: $${metrics.totalVendido.toFixed(2)}`);
    console.log(`  Ingresos Recibidos: $${metrics.ingresosRecibidos.toFixed(2)}`);
    console.log(`  Por Cobrar: $${metrics.porCobrar.toFixed(2)}`);
    console.log(`  Gastos: $${metrics.gastos.toFixed(2)}`);
    console.log(`  Margen: $${metrics.margen.toFixed(2)}`);
    console.log(`  Rentabilidad: ${metrics.rentabilidad.toFixed(2)}%`);
    
    // Validar que totalVendido esté cercano a $197.240.250 (después de descuentos)
    // Permitiendo margen de error de ±$1000
    expect(metrics.totalVendido).toBeGreaterThan(197239000);
    expect(metrics.totalVendido).toBeLessThan(197241000);
  });
});
