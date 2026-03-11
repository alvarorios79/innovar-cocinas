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
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalExpenses');
      expect(result).toHaveProperty('balance');
      
      console.log('Total Revenue:', result.totalRevenue);
      console.log('Total Expenses:', result.totalExpenses);
      console.log('Balance:', result.balance);
      
    } catch (error) {
      console.error('Error executing test:', error);
      throw error;
    }
  });
});
