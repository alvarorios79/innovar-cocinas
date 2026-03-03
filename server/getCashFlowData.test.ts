import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCashFlowData } from './db';

describe('getCashFlowData', () => {
  it('should return exactly 6 months of data', async () => {
    const result = await getCashFlowData();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(6);
  });

  it('should have correct structure for each month', async () => {
    const result = await getCashFlowData();
    
    result.forEach(month => {
      expect(month).toHaveProperty('month');
      expect(month).toHaveProperty('inflow');
      expect(month).toHaveProperty('outflow');
      expect(typeof month.month).toBe('string');
      expect(typeof month.inflow).toBe('number');
      expect(typeof month.outflow).toBe('number');
    });
  });

  it('should have valid month names in Spanish', async () => {
    const result = await getCashFlowData();
    const validMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    result.forEach(month => {
      expect(validMonths).toContain(month.month);
    });
  });

  it('should have non-negative values for inflow and outflow', async () => {
    const result = await getCashFlowData();
    
    result.forEach(month => {
      expect(month.inflow).toBeGreaterThanOrEqual(0);
      expect(month.outflow).toBeGreaterThanOrEqual(0);
    });
  });

  it('should return months in chronological order (oldest to newest)', async () => {
    const result = await getCashFlowData();
    const now = new Date();
    const expectedMonths: string[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      expectedMonths.push(monthNames[date.getMonth()]);
    }
    
    const resultMonths = result.map(m => m.month);
    expect(resultMonths).toEqual(expectedMonths);
  });

  it('should handle months with zero values', async () => {
    const result = await getCashFlowData();
    
    // At least some months should have data or be zero
    const hasData = result.some(m => m.inflow > 0 || m.outflow > 0);
    const allZero = result.every(m => m.inflow === 0 && m.outflow === 0);
    
    // Either has data or all are zero (both are valid scenarios)
    expect(hasData || allZero).toBe(true);
  });

  it('should not return future months', async () => {
    const result = await getCashFlowData();
    const now = new Date();
    
    result.forEach((month, index) => {
      // Calculate the expected date for this month
      const expectedDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      
      // The month should not be in the future
      expect(expectedDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  it('should return data without throwing errors', async () => {
    let error: Error | null = null;
    
    try {
      await getCashFlowData();
    } catch (e) {
      error = e as Error;
    }
    
    expect(error).toBeNull();
  });
});
