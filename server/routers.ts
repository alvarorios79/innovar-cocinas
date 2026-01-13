import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as whatsapp from "./whatsapp";
import { TRPCError } from "@trpc/server";
import { getAvailableTimeSlots, isTimeSlotAvailable, APPOINTMENT_CONFIG } from "./availability";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ CLIENTS ============
  clients: router({
    getOrCreateByWhatsApp: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        whatsappPhone: z.string().min(10),
        address: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Buscar cliente existente por WhatsApp
        let client = await db.getClientByWhatsApp(input.whatsappPhone);
        
        if (!client) {
          // Crear nuevo cliente
          const clientId = await db.createClient({
            name: input.name,
            email: input.email,
            whatsappPhone: input.whatsappPhone,
            address: input.address,
          });
          client = await db.getClientById(clientId);
        }
        
        return client;
      }),

    getMyProfile: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        return client;
      }),

    updateMyProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
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
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAllClients();
      }),
  }),

  // ============ APPOINTMENTS ============
  appointments: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        scheduledDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const appointmentId = await db.createAppointment({
          clientId: input.clientId,
          workType: input.workType,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
          notes: input.notes,
        });

        // Obtener datos del cliente para notificación
        const client = await db.getClientById(input.clientId);
        if (client) {
          const whatsappLink = whatsapp.notifyNewAppointment({
            clientName: client.name,
            clientPhone: client.whatsappPhone,
            clientEmail: client.email || undefined,
            clientAddress: client.address || undefined,
            workType: input.workType,
            scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
            notes: input.notes,
          });
          
          return { id: appointmentId, success: true, whatsappLink };
        }
        
        return { id: appointmentId, success: true };
      }),

    getMyAppointments: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];
        
        return await db.getAppointmentsByClientId(client.id);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendiente", "confirmada", "completada", "cancelada"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateAppointment(input.id, { status: input.status });
        return { success: true };
      }),

    reschedule: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledDate: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        const appointment = await db.getAppointmentById(input.id);
        if (!appointment || appointment.clientId !== client.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.updateAppointment(input.id, {
          scheduledDate: new Date(input.scheduledDate),
        });

        return { success: true };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const appointments = await db.getAllAppointments();
        const clients = await db.getAllClients();
        
        // Combinar datos de citas con clientes
        return appointments.map(apt => {
          const client = clients.find(c => c.id === apt.clientId);
          return {
            ...apt,
            client,
          };
        });
      }),
  }),

  // ============ ADVISORY REQUESTS ============
  advisory: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const requestId = await db.createAdvisoryRequest({
          clientId: input.clientId,
          workType: input.workType,
          notes: input.notes,
        });

        // Obtener datos del cliente para notificación
        const client = await db.getClientById(input.clientId);
        if (client) {
          const whatsappLink = whatsapp.notifyNewAdvisoryRequest({
            clientName: client.name,
            clientPhone: client.whatsappPhone,
            clientEmail: client.email || undefined,
            workType: input.workType,
            notes: input.notes,
          });
          
          return { id: requestId, success: true, whatsappLink };
        }
        
        return { id: requestId, success: true };
      }),

    getMyRequests: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];
        
        return await db.getAdvisoryRequestsByClientId(client.id);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendiente", "contactado", "completado"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateAdvisoryRequest(input.id, { status: input.status });
        return { success: true };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const requests = await db.getAllAdvisoryRequests();
        const clients = await db.getAllClients();
        
        return requests.map(req => {
          const client = clients.find(c => c.id === req.clientId);
          return {
            ...req,
            client,
          };
        });
      }),
  }),

  // ============ PRIOR ESTIMATES ============
  estimates: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        length: z.string().optional(),
        width: z.string().optional(),
        height: z.string().optional(),
        counterTopType: z.enum(["cuarzo", "sinterizado"]).optional(),
        additionalDetails: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const estimateId = await db.createPriorEstimate({
          clientId: input.clientId,
          workType: input.workType,
          length: input.length,
          width: input.width,
          height: input.height,
          counterTopType: input.counterTopType,
          additionalDetails: input.additionalDetails,
        });

        // Obtener datos del cliente para notificación
        const client = await db.getClientById(input.clientId);
        if (client) {
          const whatsappLink = whatsapp.notifyNewEstimate({
            clientName: client.name,
            clientPhone: client.whatsappPhone,
            workType: input.workType,
            length: input.length,
            width: input.width,
            height: input.height,
            counterTopType: input.counterTopType,
            additionalDetails: input.additionalDetails,
          });
          
          return { id: estimateId, success: true, whatsappLink };
        }
        
        return { id: estimateId, success: true };
      }),

    getMyEstimates: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];
        
        return await db.getPriorEstimatesByClientId(client.id);
      }),
  }),

  // ============ QUOTATIONS ============
  quotations: router({
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        appointmentId: z.number().optional(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        description: z.string().min(1),
        materials: z.string().optional(),
        totalPrice: z.string(),
        validUntil: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotationId = await db.createQuotation({
          clientId: input.clientId,
          appointmentId: input.appointmentId,
          workType: input.workType,
          description: input.description,
          materials: input.materials,
          totalPrice: input.totalPrice,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          createdBy: ctx.user.id,
          status: "borrador",
        });

        return { id: quotationId, success: true };
      }),

    send: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }

        await db.updateQuotation(input.id, {
          status: "enviada",
          sentViaWhatsApp: true,
        });

        // Generar enlace de WhatsApp para enviar cotización
        const whatsappLink = whatsapp.sendQuotationToClient({
          clientName: client.name,
          clientPhone: client.whatsappPhone,
          workType: quotation.workType,
          description: quotation.description,
          totalPrice: quotation.totalPrice,
          validUntil: quotation.validUntil || undefined,
        });

        return { success: true, whatsappLink };
      }),

    getMyQuotations: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];
        
        return await db.getQuotationsByClientId(client.id);
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const quotations = await db.getAllQuotations();
        const clients = await db.getAllClients();
        
        return quotations.map(quot => {
          const client = clients.find(c => c.id === quot.clientId);
          return {
            ...quot,
            client,
          };
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Si no es admin, verificar que sea su cotización
        if (ctx.user.role !== "admin") {
          const client = await db.getClientByUserId(ctx.user.id);
          if (!client || quotation.clientId !== client.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const client = await db.getClientById(quotation.clientId);
        return {
          ...quotation,
          client,
        };
      }),
  }),

  // ============ AVAILABILITY ============
  availability: router({
    getConfig: publicProcedure.query(() => {
      return APPOINTMENT_CONFIG;
    }),
    getAvailableSlots: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        // Parsear fecha correctamente para evitar problemas de zona horaria
        const [year, month, day] = input.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return await getAvailableTimeSlots(date);
      }),
    checkSlot: publicProcedure
      .input(z.object({ date: z.string(), timeSlot: z.string() }))
      .query(async ({ input }) => {
        // Parsear fecha correctamente para evitar problemas de zona horaria
        const [year, month, day] = input.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return await isTimeSlotAvailable(date, input.timeSlot);
      }),
  }),

  // ============ USER MANAGEMENT ============
  userManagement: router({
    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden ver usuarios" });
        }
        return await db.getAllUsers();
      }),

    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden cambiar roles" });
        }

        // Prevenir que un admin se quite sus propios permisos
        if (ctx.user.id === input.userId && input.newRole === "user") {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No puedes quitarte tus propios permisos de administrador" 
          });
        }

        await db.updateUserRole(input.userId, input.newRole);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
