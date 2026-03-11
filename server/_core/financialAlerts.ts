/**
 * Financial Alerts Module
 * Handles detection and formatting of financial alert messages
 */

/**
 * FinancialMetrics Interface - Datos financieros reales del sistema
 * Basado en: getGlobalFinancialDashboard() que devuelve { totalRevenue, totalExpenses, balance }
 */
export interface FinancialMetrics {
  totalRevenue: number;    // SUM(payments.amount) WHERE movementType = 'payment'
  totalExpenses: number;   // SUM(expenses.amount)
  balance: number;         // totalRevenue - totalExpenses
}

/**
 * Format currency to Colombian peso format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage with one decimal place
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/**
 * Generate WhatsApp message for deliveredWithOutstanding alert
 */
export function generateDeliveredWithOutstandingMessage(metrics: FinancialMetrics): string {
  const outstandingRatio = metrics.totalRevenue > 0
    ? ((metrics.totalRevenue - metrics.balance) / metrics.totalRevenue * 100)
    : 0;
  return `⚠ ALERTA FINANCIERA – INNOVAR

Cartera pendiente: ${formatCurrency(metrics.totalRevenue - metrics.balance)}
Representa: ${formatPercentage(outstandingRatio)} del total facturado

Ingresos recibidos: ${formatCurrency(metrics.totalRevenue)}
Gastos totales: ${formatCurrency(metrics.totalExpenses)}

Revise el Panel CEO.`;
}

/**
 * Generate WhatsApp message for lowCollectionRate alert
 */
export function generateLowCollectionRateMessage(metrics: FinancialMetrics): string {
  const collectionRate = metrics.totalRevenue > 0
    ? (metrics.balance / metrics.totalRevenue * 100)
    : 0;
  return `⚠ ALERTA FINANCIERA – INNOVAR

Margen neto actual: ${formatPercentage(collectionRate)}

Total ingresos: ${formatCurrency(metrics.totalRevenue)}
Total gastos: ${formatCurrency(metrics.totalExpenses)}
Balance: ${formatCurrency(metrics.balance)}

Revise el Panel CEO.`;
}

/**
 * Determine which alerts should be triggered based on metrics and thresholds
 */
export function determineActiveAlerts(
  metrics: FinancialMetrics,
  thresholds?: {
    outstandingThresholdPercent: number;
    collectionThresholdPercent: number;
    lowProfitThresholdPercent: number;
  }
): {
  deliveredWithOutstanding: boolean;
  lowCollectionRate: boolean;
} {
  const collectionThreshold = thresholds?.collectionThresholdPercent ?? 70;

  // Tasa de margen: balance / totalRevenue * 100
  const marginRate = metrics.totalRevenue > 0
    ? (metrics.balance / metrics.totalRevenue * 100)
    : 0;

  // Ratio de cartera pendiente: (ingresos - gastos - balance) / ingresos
  const outstandingRatio = metrics.totalRevenue > 0
    ? ((metrics.totalRevenue - metrics.balance) / metrics.totalRevenue * 100)
    : 0;

  return {
    deliveredWithOutstanding: outstandingRatio > (thresholds?.outstandingThresholdPercent ?? 40),
    lowCollectionRate: marginRate < collectionThreshold,
  };
}

/**
 * Check if alert transitioned from false to true
 */
export function hasAlertTransitioned(
  previousState: boolean,
  currentState: boolean
): boolean {
  return !previousState && currentState;
}
