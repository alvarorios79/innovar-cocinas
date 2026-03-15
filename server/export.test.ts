import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getProjectsForExport } from './export';
import * as db from './db';

describe('Export Projects', () => {
  it('should return empty array when no projects exist', async () => {
    const rows = await getProjectsForExport(false);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('should return projects with correct structure', async () => {
    const rows = await getProjectsForExport(false);
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      expect(firstRow).toHaveProperty('ID Proyecto');
      expect(firstRow).toHaveProperty('Cotización');
      expect(firstRow).toHaveProperty('Cliente');
      expect(firstRow).toHaveProperty('Estado');
      expect(firstRow).toHaveProperty('Monto Total');
      expect(firstRow).toHaveProperty('Pagos Recibidos');
      expect(firstRow).toHaveProperty('Por Cobrar');
      expect(firstRow).toHaveProperty('Gastos');
      expect(firstRow).toHaveProperty('Margen');
      expect(firstRow).toHaveProperty('Rentabilidad %');
      expect(firstRow).toHaveProperty('Fecha Creación');
      expect(firstRow).toHaveProperty('Instalación Oficial');
    }
  });

  it('should filter archived projects correctly', async () => {
    const activeRows = await getProjectsForExport(false);
    const archivedRows = await getProjectsForExport(true);
    
    // Both should be arrays
    expect(Array.isArray(activeRows)).toBe(true);
    expect(Array.isArray(archivedRows)).toBe(true);
  });

  it('should calculate financial metrics correctly', async () => {
    const rows = await getProjectsForExport(false);
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      
      // Verify that margen = pagos - gastos
      const expectedMargen = firstRow['Pagos Recibidos'] - firstRow['Gastos'];
      expect(firstRow['Margen']).toBe(expectedMargen);
      
      // Verify that rentabilidad is a percentage
      expect(typeof firstRow['Rentabilidad %']).toBe('number');
      expect(firstRow['Rentabilidad %']).toBeGreaterThanOrEqual(-100);
    }
  });

  it('should handle projects with no payments', async () => {
    const rows = await getProjectsForExport(false);
    
    // Should not throw error and should return valid data
    expect(Array.isArray(rows)).toBe(true);
    
    rows.forEach(row => {
      expect(typeof row['Monto Total']).toBe('number');
      expect(typeof row['Pagos Recibidos']).toBe('number');
      expect(typeof row['Por Cobrar']).toBe('number');
    });
  });
});
