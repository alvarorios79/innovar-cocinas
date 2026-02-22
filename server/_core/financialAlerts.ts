/**
 * Financial Alerts Module
 * Handles detection and formatting of financial alert messages
 */

export interface FinancialMetrics {
  totalIngresos: number;
  totalPagosRecibidos: number;
  totalGastosProyectos: number;
  totalGastosOperativos: number;
  margenGlobal: number;
  rentabilidadPromedio: number;
  proyectosEnRiesgo: number;
  proyectosConSaldoVencido: number;
  totalProyectos: number;
  outstandingRatio: number;
  collectionRate: number;
  deliveredWithOutstanding: number;
  lowProfitProjectsCount: number;
  alerts: {
    highOutstanding: boolean;
    lowCollectionRate: boolean;
    deliveredWithOutstanding: boolean;
    lowProfitProjectsCount: boolean;
  };
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
  const totalOutstandingBalance = metrics.totalIngresos - metrics.totalPagosRecibidos;
  return `⚠ ALERTA FINANCIERA – INNOVAR

Cartera pendiente: ${formatCurrency(totalOutstandingBalance)}
Representa: ${formatPercentage(metrics.outstandingRatio)}%

Proyectos entregados con saldo: ${metrics.deliveredWithOutstanding}

Revise el Panel CEO.`;
}

/**
 * Generate WhatsApp message for lowCollectionRate alert
 */
export function generateLowCollectionRateMessage(metrics: FinancialMetrics): string {
  return `⚠ ALERTA FINANCIERA – INNOVAR

Tasa de cobranza actual: ${formatPercentage(metrics.collectionRate)}%

Total facturado: ${formatCurrency(metrics.totalIngresos)}
Total cobrado: ${formatCurrency(metrics.totalPagosRecibidos)}

Revise el Panel CEO.`;
}

/**
 * Determine which alerts should be triggered based on metrics
 */
export function determineActiveAlerts(metrics: FinancialMetrics): {
  deliveredWithOutstanding: boolean;
  lowCollectionRate: boolean;
} {
  return {
    deliveredWithOutstanding: metrics.deliveredWithOutstanding > 0,
    lowCollectionRate: metrics.collectionRate < 70,
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
