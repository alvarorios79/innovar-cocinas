import { getDb } from "./db";
import { quotations, projects } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Activar una versión anterior de cotización
 * Busca el proyecto asociado a cualquier versión del grupo y lo actualiza
 * @param quotationId - ID de la cotización a activar
 */
export async function setActiveQuotationVersion(
  quotationId: number
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verificar que la cotización existe
    const quotation = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, quotationId))
      .limit(1);

    if (!quotation.length) {
      throw new Error("Cotización no encontrada");
    }

    const selectedQuotation = quotation[0];
    
    // Obtener el baseQuotationId (la V1 del grupo)
    const baseId = selectedQuotation.baseQuotationId || selectedQuotation.id;

    // Obtener TODAS las versiones de este grupo
    const allVersions = await db
      .select({ id: quotations.id })
      .from(quotations)
      .where(eq(quotations.baseQuotationId, baseId));

    const versionIds = allVersions.map(v => v.id);

    if (versionIds.length === 0) {
      throw new Error("No se encontraron versiones de la cotización");
    }

    // Buscar el proyecto que use CUALQUIERA de estas versiones
    const projectsList = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(inArray(projects.quotationId, versionIds))
      .limit(1);

    if (!projectsList.length) {
      throw new Error("No se encontró proyecto para esta cotización");
    }

    const project = projectsList[0];

    // Verificar que la cotización pertenece al mismo cliente
    if (selectedQuotation.clientId !== project.clientId) {
      throw new Error(
        "La cotización no pertenece al cliente del proyecto"
      );
    }

    // Actualizar el proyecto para usar la versión seleccionada
    await db
      .update(projects)
      .set({
        quotationId: quotationId,
        totalAmount: selectedQuotation.total,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    // Marcar todas las versiones como históricas excepto la que se acaba de activar
    await db
      .update(quotations)
      .set({ isHistoricalCopy: 1 })
      .where(eq(quotations.baseQuotationId, baseId));

    // Marcar la versión activada como NO histórica
    await db
      .update(quotations)
      .set({ isHistoricalCopy: 0 })
      .where(eq(quotations.id, quotationId));

    return {
      success: true,
      message: `Versión activada correctamente. Nuevo monto: $${selectedQuotation.total}`,
      quotationId,
      projectId: project.id,
      newTotal: selectedQuotation.total,
    };
  } catch (error) {
    console.error("[setActiveQuotationVersion] Error:", error);
    throw error;
  }
}

/**
 * Obtener el historial de versiones de una cotización
 * @param baseQuotationId - ID de la cotización base (V1)
 */
export async function getQuotationVersionHistory(baseQuotationId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const versions = await db
      .select({
        id: quotations.id,
        versionNumber: quotations.versionNumber,
        quotationNumber: quotations.quotationNumber,
        total: quotations.total,
        createdAt: quotations.createdAt,
        status: quotations.status,
        isAdditional: quotations.isAdditional,
      })
      .from(quotations)
      .where(eq(quotations.baseQuotationId, baseQuotationId))
      .orderBy(quotations.versionNumber);

    return versions;
  } catch (error) {
    console.error("[getQuotationVersionHistory] Error:", error);
    throw error;
  }
}
