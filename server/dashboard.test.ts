import { describe, it, expect } from 'vitest';
import { getGlobalFinancialDashboard } from './db';

describe('getGlobalFinancialDashboard', () => {
  it('should return financial dashboard data', async () => {
    try {
      const result = await getGlobalFinancialDashboard();
      
      console.log('=== DASHBOARD RESULT ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('========================');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalIngresos');
      expect(result).toHaveProperty('totalPagosRecibidos');
      expect(result).toHaveProperty('carteraPendiente');
      
      console.log('Total Ingresos:', result.totalIngresos);
      console.log('Total Pagos Recibidos:', result.totalPagosRecibidos);
      console.log('Cartera Pendiente:', result.carteraPendiente);
      
    } catch (error) {
      console.error('Error executing test:', error);
      throw error;
    }
  });
});
