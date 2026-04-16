import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";

export const debugSyncRouter = router({
  // Endpoint para verificar la sincronización de un proyecto específico
  checkProjectSync: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { error: "Database not available" };

        // Obtener el proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) return { error: `Project ${input.projectId} not found` };

        // Obtener la cotización vinculada
        const quotation = await db.getQuotationById(project.quotationId);
        if (!quotation) return { error: `Quotation ${project.quotationId} not found` };

        return {
          success: true,
          project: {
            id: project.id,
            quotationId: project.quotationId,
            totalAmount: project.totalAmount,
          },
          quotation: {
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            total: quotation.total,
            baseQuotationId: quotation.baseQuotationId,
            versionNumber: quotation.versionNumber,
          },
          match: project.totalAmount === quotation.total.toString(),
        };
      } catch (error) {
        return { error: String(error) };
      }
    }),

  // Endpoint para forzar la actualización manual
  forceUpdateProjectAmount: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { error: "Database not available" };

        // Obtener el proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) return { error: `Project ${input.projectId} not found` };

        // Obtener la cotización vinculada
        const quotation = await db.getQuotationById(project.quotationId);
        if (!quotation) return { error: `Quotation ${project.quotationId} not found` };

        // Actualizar el proyecto con el monto de la cotización
        await db.updateProject(input.projectId, {
          totalAmount: quotation.total.toString(),
        });

        return {
          success: true,
          message: `Project ${input.projectId} updated with quotation total: ${quotation.total}`,
        };
      } catch (error) {
        return { error: String(error) };
      }
    }),
});
