/**
 * Financial Alerts Module
 * Handles detection and formatting of financial alert messages
 */

/**
 * FinancialMetrics Interface - Datos financieros reales del sistema
 * Basado en: payments, expenses, projects
 */
export interface FinancialMetrics {
  // Ingresos
  totalIngresos: number;           // SUM(payments.amount) WHERE movementType = 'payment'
  totalPagosRecibidos: number;     // Alias para totalIngresos
  
  // Gastos
  totalGastosProyectos: number;    // SUM(expenses.amount) WHERE expenseType = 'materiales_proyecto'
  totalGastosOperativos: number;   // SUM(expenses.amount) WHERE expenseType = 'gasto_operativo'
  
  // Cálculos derivados
  margenGlobal: number;            // totalIngresos - (totalGastosProyectos + totalGastosOperativos)
  rentabilidadPromedio: number;    // (margenGlobal / totalIngresos) * 100
  
  // Cartera
  proyectosEnRiesgo: number;       // Proyectos con saldo vencido
  proyectosConSaldoVencido: number; // Alias para proyectosEnRiesgo
  totalProyectos: number;          // COUNT(projects) WHERE deletedAt IS NULL
  
  // Ratios
  outstandingRatio: number;        // (totalVendido - totalIngresos) / totalVendido * 100
  collectionRate: number;          // (totalIngresos / totalVendido) * 100
  
  // Alertas
  deliveredWithOutstanding: number; // COUNT(projects) WHERE status = 'entregado' AND saldoPendiente > 0
  lowProfitProjectsCount: number;   // COUNT(projects) WHERE rentabilidad < 15%
  
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
  // Use provided thresholds or defaults
  const outstandingThreshold = thresholds?.outstandingThresholdPercent ?? 40;
  const collectionThreshold = thresholds?.collectionThresholdPercent ?? 70;

  return {
    deliveredWithOutstanding: metrics.deliveredWithOutstanding > 0,
    lowCollectionRate: metrics.collectionRate < collectionThreshold,
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
