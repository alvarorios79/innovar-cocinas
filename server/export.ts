import { getDb, getQuotationById, getLatestQuotationByBaseId } from './db';
import { projects, payments, expenses, clients, quotations } from '../drizzle/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export interface ProjectExportRow {
  'ID Proyecto': number;
  'Cotización': string;
  'Cliente': string;
  'Estado': string;
  'Monto Total': number;
  'Pagos Recibidos': number;
  'Por Cobrar': number;
  'Gastos': number;
  'Margen': number;
  'Rentabilidad %': number;
  'Fecha Creación': string;
  'Instalación Oficial': string;
}

export async function getProjectsForExport(archived?: boolean): Promise<ProjectExportRow[]> {
  const db = await getDb();
  if (!db) return [];

  let whereConditions = and(isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual'));

  if (archived !== undefined) {
    whereConditions = and(whereConditions, eq(projects.isArchived, archived ? 1 : 0));
  }

  const projectsList = await db.select().from(projects)
    .where(whereConditions)
    .orderBy(desc(projects.createdAt));

  const exportRows: ProjectExportRow[] = [];

  for (const project of projectsList) {
    try {
      // Obtener cliente
      const client = await db.select().from(clients)
        .where(eq(clients.id, project.clientId))
        .limit(1);
      const clientName = client[0]?.name || 'N/A';

      // Obtener cotización (ESTRATEGIA: obtener dinamicamente la ultima version)
      let quotationNumber = 'N/A';
      if (project.quotationId) {
        try {
          const originalQuotation = await getQuotationById(project.quotationId);
          if (originalQuotation?.baseQuotationId) {
            const latestQuotation = await getLatestQuotationByBaseId(originalQuotation.baseQuotationId);
            quotationNumber = latestQuotation?.quotationNumber || 'N/A';
          } else if (originalQuotation?.quotationNumber) {
            quotationNumber = originalQuotation.quotationNumber;
          }
        } catch (error) {
          console.error('[export] Error obteniendo ultima version:', error);
        }
      }

      // Obtener pagos del proyecto
      const projectPayments = await db.select().from(payments)
        .where(eq(payments.projectId, project.id));

      // Obtener gastos del proyecto
      const projectExpenses = await db.select().from(expenses)
        .where(and(eq(expenses.projectId, project.id), eq(expenses.dataOrigin, 'manual')));

      // Calcular métricas
      const totalAmount = Number(project.totalAmount || 0);
      
      const ingresosRecibidos = projectPayments
        .filter(p => p.movementType === 'payment')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const descuentos = projectPayments
        .filter(p => p.movementType === 'discount')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const porCobrar = totalAmount - ingresosRecibidos - descuentos;

      const gastos = projectExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const margen = ingresosRecibidos - gastos;

      const rentabilidad = ingresosRecibidos > 0 
        ? (margen / ingresosRecibidos) * 100
        : 0;

      const fechaCreacion = project.createdAt 
        ? new Date(project.createdAt).toLocaleDateString('es-CO')
        : 'N/A';

      const instalacionOficial = project.scheduledInstallDate
        ? new Date(project.scheduledInstallDate).toLocaleDateString('es-CO')
        : 'N/A';

      exportRows.push({
        'ID Proyecto': project.id,
        'Cotización': quotationNumber,
        'Cliente': clientName,
        'Estado': project.status || 'N/A',
        'Monto Total': totalAmount,
        'Pagos Recibidos': ingresosRecibidos,
        'Por Cobrar': porCobrar,
        'Gastos': gastos,
        'Margen': margen,
        'Rentabilidad %': Math.round(rentabilidad * 100) / 100,
        'Fecha Creación': fechaCreacion,
        'Instalación Oficial': instalacionOficial,
      });
    } catch (error) {
      console.error(`[getProjectsForExport] Error procesando proyecto ${project.id}:`, error);
    }
  }

  return exportRows;
}
