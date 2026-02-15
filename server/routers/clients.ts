import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { systemRouter } from "../_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { withTransaction } from "../db";
import * as whatsapp from "../whatsapp";
import { TRPCError } from "@trpc/server";
import { getAvailableTimeSlots, isTimeSlotAvailable, APPOINTMENT_CONFIG } from "../availability";
import { hashPassword, validatePasswordStrength, authenticateWithPassword } from "../password-auth";
import { prepareWhatsAppNotification, generateTeamWhatsAppLink } from "../whatsapp-notifications";
import { createRemindersForStatusChange } from "../reminders-service";
import * as whatsappCloud from "../whatsapp-cloud";
import { addBusinessDays, calculateEstimatedDeliveryDate } from "../business-days";
import { sanitizeText, sanitizeHtml, sanitizeForEmail, sanitizePhone, sanitizeEmail } from "../sanitize";


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
          name: sanitizeText(input.name),
          email: input.email ? sanitizeEmail(input.email) : undefined,
          whatsappPhone: sanitizePhone(input.whatsappPhone),
          address: input.address ? sanitizeText(input.address) : undefined,
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAllClients();
      }),

    // Listar clientes con paginación
    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAllClientsPaginated({
          page: input?.page,
          limit: input?.limit,
          search: input?.search,
        });
      }),

    // Crear cliente rápido con usuario y contraseña generada
    createQuick: protectedProcedure
      .input(z.object({
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        email: z.string().email("Email inválido").optional().or(z.literal("")),
        whatsappPhone: z.string().min(10, "Número de WhatsApp inválido"),
        address: z.string().optional(),
        internalManagement: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin y comercial pueden crear clientes
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear clientes" });
        }

        // Verificar que el WhatsApp no esté duplicado
        const existingClient = await db.getClientByWhatsApp(input.whatsappPhone);
        if (existingClient) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Ya existe un cliente con este número de WhatsApp" 
          });
        }

        let userId: number | undefined = undefined;
        let temporaryPassword: string | undefined = undefined;
        let userEmail: string | undefined = undefined;

        // Si tiene email y NO es gestión interna, crear usuario con credenciales
        if (input.email && input.email.trim() !== "" && !input.internalManagement) {
          // Verificar que el email no esté duplicado
          const allUsers = await db.getAllUsers();
          const emailExists = allUsers.some(u => u.email?.toLowerCase() === input.email!.toLowerCase());
          
          if (emailExists) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Ya existe un usuario con este email" 
            });
          }

          // Generar contraseña temporal
          const { generateTemporaryPassword } = await import("../password-generator");
          temporaryPassword = generateTemporaryPassword();
          const passwordHash = await hashPassword(temporaryPassword);

          // Crear usuario con rol "user" (cliente)
          userId = await db.createUserExtended({
            name: sanitizeText(input.name),
            email: sanitizeEmail(input.email),
            role: "user",
            passwordHash,
          });
          userEmail = input.email;
        }

        // Crear cliente en transacción (si hay userId, ambos ya están vinculados)
        const clientId = await withTransaction(async (tx) => {
          const cid = await db.createClient({
            userId,
            name: sanitizeText(input.name),
            email: input.email ? sanitizeEmail(input.email) : undefined,
            whatsappPhone: sanitizePhone(input.whatsappPhone),
            address: input.address ? sanitizeText(input.address) : undefined,
            internalManagement: input.internalManagement,
          });
          return cid;
        });

        const client = await db.getClientById(clientId);

        return {
          success: true,
          client,
          credentials: temporaryPassword && userEmail ? {
            email: userEmail,
            password: temporaryPassword,
          } : null,
          isInternalManagement: input.internalManagement,
        };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        whatsappPhone: z.string().min(10).optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para actualizar clientes" });
        }
        
        const { id, ...updateData } = input;
        
        // Sanitizar datos
        const sanitizedData: any = {};
        if (updateData.name) sanitizedData.name = sanitizeText(updateData.name);
        if (updateData.email) sanitizedData.email = sanitizeEmail(updateData.email);
        if (updateData.whatsappPhone) sanitizedData.whatsappPhone = sanitizePhone(updateData.whatsappPhone);
        if (updateData.address) sanitizedData.address = sanitizeText(updateData.address);
        
        await db.updateClient(id, sanitizedData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar clientes" });
        }
        
        // Eliminar en cascada dentro de transacción para garantizar integridad
        await withTransaction(async (tx) => {
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
          
          // 3. Eliminar cotizaciones del cliente
          const quotations = await db.getQuotationsByClientId(input.id);
          for (const quotation of quotations) {
            await db.deleteQuotation(quotation.id);
          }
          
          // 4. Eliminar proyectos del cliente
          const projects = await db.getProjectsByClientId(input.id);
          for (const project of projects) {
            await db.deleteProject(project.id);
          }
          
          // 5. Finalmente eliminar el cliente
          await db.deleteClient(input.id);
        });
        return { success: true };
      }),
});

