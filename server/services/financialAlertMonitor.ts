/**
 * Financial Alert Monitor Service
 * Independent service for monitoring financial metrics and sending alerts
 * Executes asynchronously without blocking main operations
 */

import {
  getGlobalFinancialDashboard,
  getFinancialAlertByType,
  updateFinancialAlert,
  getUsersByRole,
  getFinancialSettings,
} from '../db';
import {
  generateDeliveredWithOutstandingMessage,
  generateLowCollectionRateMessage,
  determineActiveAlerts,
  hasAlertTransitioned,
  FinancialMetrics,
} from '../_core/financialAlerts';
import { sendWhatsAppMessage } from '../_core/whatsapp';

/**
 * Evaluate financial metrics and send alerts if thresholds are breached
 * Runs asynchronously without blocking the main operation
 */
export async function evaluateFinancialAlerts(): Promise<void> {
  try {
    // Get current financial metrics
    const metrics = await getGlobalFinancialDashboard();

    if (!metrics) {
      console.log('[FinancialAlertMonitor] No metrics available');
      return;
    }

    // Get financial settings (thresholds)
    let settings;
    try {
      settings = await getFinancialSettings();
    } catch (error) {
      console.warn('[FinancialAlertMonitor] Failed to get financial settings, using defaults:', error);
      settings = {
        outstandingThresholdPercent: 40,
        collectionThresholdPercent: 70,
        lowProfitThresholdPercent: 10,
      };
    }

    // Adaptar el objeto del dashboard al tipo FinancialMetrics esperado
    const adaptedMetrics: FinancialMetrics = {
      totalIngresos: (metrics as any).totalRevenue ?? 0,
      totalPagosRecibidos: (metrics as any).totalRevenue ?? 0,
      totalGastosProyectos: (metrics as any).totalExpenses ?? 0,
      totalGastosOperativos: 0,
      margenGlobal: (metrics as any).balance ?? 0,
      rentabilidadPromedio: (metrics as any).totalRevenue > 0
        ? (((metrics as any).balance ?? 0) / (metrics as any).totalRevenue) * 100
        : 0,
      proyectosEnRiesgo: 0,
      proyectosConSaldoVencido: 0,
      totalProyectos: 0,
      outstandingRatio: 0,
      collectionRate: (metrics as any).totalRevenue > 0 ? 100 : 0,
      deliveredWithOutstanding: 0,
      lowProfitProjectsCount: 0,
      alerts: {
        highOutstanding: false,
        lowCollectionRate: false,
        deliveredWithOutstanding: false,
        lowProfitProjectsCount: false,
      },
    };

    // Determine which alerts should be active
    const currentAlerts = determineActiveAlerts(adaptedMetrics, settings);

    // Get super_admin user for WhatsApp notifications
    const superAdmins = await getUsersByRole('super_admin');
    if (!superAdmins || superAdmins.length === 0) {
      console.log('[FinancialAlertMonitor] No super_admin found for notifications');
      return;
    }

    const superAdmin = superAdmins[0];
    const superAdminPhone = superAdmin.phone;

    if (!superAdminPhone) {
      console.log('[FinancialAlertMonitor] Super admin has no phone number');
      return;
    }

    // Process deliveredWithOutstanding alert
    await processAlert(
      'deliveredWithOutstanding',
      currentAlerts.deliveredWithOutstanding,
      superAdminPhone,
      () => generateDeliveredWithOutstandingMessage(adaptedMetrics)
    );

    // Process lowCollectionRate alert
    await processAlert(
      'lowCollectionRate',
      currentAlerts.lowCollectionRate,
      superAdminPhone,
      () => generateLowCollectionRateMessage(adaptedMetrics)
    );
  } catch (error) {
    console.error('[FinancialAlertMonitor] Error evaluating alerts:', error);
    // Don't throw - this is a background service
  }
}

/**
 * Process a single alert: check for transition and send message if needed
 */
async function processAlert(
  alertType: 'deliveredWithOutstanding' | 'lowCollectionRate',
  isCurrentlyActive: boolean,
  phoneNumber: string,
  messageGenerator: () => string
): Promise<void> {
  try {
    // Get previous alert state
    const previousAlert = await getFinancialAlertByType(alertType);
    const wasPreviouslyActive = previousAlert ? previousAlert.isActive === 1 : false;

    // Check if there's a transition from false to true
    if (hasAlertTransitioned(wasPreviouslyActive, isCurrentlyActive)) {
      // Generate and send message
      const message = messageGenerator();

      console.log(`[FinancialAlertMonitor] Sending ${alertType} alert to ${phoneNumber}`);
      console.log(`[FinancialAlertMonitor] Message: ${message}`);

      // Send WhatsApp message
      await sendWhatsAppMessage(phoneNumber, message);

      // Update alert state
      await updateFinancialAlert(alertType, {
        isActive: 1,
        lastTriggeredAt: new Date().toISOString(),
        lastMessageSentAt: new Date().toISOString(),
      });

      console.log(`[FinancialAlertMonitor] ${alertType} alert sent successfully`);
    } else if (!isCurrentlyActive && wasPreviouslyActive) {
      // Alert was deactivated - update state
      await updateFinancialAlert(alertType, {
        isActive: 0,
        lastTriggeredAt: new Date().toISOString(),
      });

      console.log(`[FinancialAlertMonitor] ${alertType} alert deactivated`);
    }
  } catch (error) {
    console.error(`[FinancialAlertMonitor] Error processing ${alertType} alert:`, error);
    // Don't throw - continue with other alerts
  }
}

/**
 * Trigger alert evaluation asynchronously (fire and forget)
 * Safe to call from any operation without blocking
 */
export function triggerAlertEvaluation(): void {
  // Execute asynchronously without awaiting
  evaluateFinancialAlerts().catch((error) => {
    console.error('[FinancialAlertMonitor] Unhandled error in async evaluation:', error);
  });
}
