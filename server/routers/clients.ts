import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const clientsRouter = router({
  getOrCreateByWhatsApp: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      whatsappPhone: z.string().min(10),
      address: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar cliente existente por WhatsApp
      let client = await db.getClientByWhatsApp(input.whatsappPhone);
      
      if (!client) {
        // Crear nuevo cliente, asociando con usuario si está autenticado
        const clientId = await db.createClient({
          userId: ctx.user?.id, // Asociar con usuario autenticado si existe
          name: input.name,
          email: input.email,
          whatsappPhone: input.whatsappPhone,
          address: input.address,
        });
        client = await db.getClientById(clientId);
      } else if (ctx.user && !client.userId) {
        // Si el cliente ya existe pero no tiene userId, asociarlo con el usuario autenticado
        await db.updateClient(client.id, { userId: ctx.user.id });
        client = await db.getClientById(client.id);
      }
      
      return client;
    }),

  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const client = await db.getClientByUserId(ctx.user.id);
      return client ?? null;
    }),

  updateMyProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await db.getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }
      
      await db.updateClient(client.id, input);
      return { success: true };
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getAllClients();
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar clientes" });
      }
      
      // Eliminar en cascada: primero eliminar todos los registros relacionados
      // 1. Eliminar citas del cliente
      const appointments = await db.getAppointmentsByClientId(input.id);
      for (const appointment of appointments) {
        await db.deleteAppointment(appointment.id);
      }
      
      // 2. Eliminar asesorías del cliente
      const advisoryRequests = await db.getAdvisoryRequestsByClientId(input.id);
      for (const advisory of advisoryRequests) {
        await db.deleteAdvisoryRequest(advisory.id);
      }
      
      // 3. Eliminar cotizaciones del cliente (esto también elimina quotationItems)
      const quotations = await db.getQuotationsByClientId(input.id);
      for (const quotation of quotations) {
        await db.deleteQuotation(quotation.id);
      }
      
      // 4. Eliminar proyectos del cliente (esto también elimina projectPhotos, projectDetails, tasks, etc.)
      const projects = await db.getProjectsByClientId(input.id);
      for (const project of projects) {
        await db.deleteProject(project.id);
      }
      
      // 5. Finalmente eliminar el cliente
      await db.deleteClient(input.id);
      return { success: true };
    }),
});
