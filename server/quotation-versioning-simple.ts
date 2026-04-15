import { db } from "./db";
import { quotations, projects } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Activar una versión anterior de cotización
 * Cambia el proyecto para que use la versión seleccionada
 * @param quotationId - ID de la cotización a activar
 * @param projectId - ID del proyecto que usa esta cotización
 */
export async function setActiveQuotationVersion(
  quotationId: number,
  projectId: number
) {
  try {
    // Verificar que la cotización existe
    const quotation = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, quotationId))
      .limit(1);

    if (!quotation.length) {
      throw new Error("Cotización no encontrada");
    }

    // Verificar que el proyecto existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project.length) {
      throw new Error("Proyecto no encontrado");
    }

    // Verificar que la cotización pertenece al mismo cliente
    if (quotation[0].clientId !== project[0].clientId) {
      throw new Error(
        "La cotización no pertenece al cliente del proyecto"
      );
    }

    // Actualizar el proyecto para usar la nueva versión
    await db
      .update(projects)
      .set({
        quotationId: quotationId,
        totalAmount: quotation[0].total,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return {
      success: true,
      message: `Versión activada correctamente. Nuevo monto: $${quotation[0].total}`,
      quotationId,
      projectId,
      newTotal: quotation[0].total,
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
