import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as whatsapp from "./whatsapp";
import { TRPCError } from "@trpc/server";
import { getAvailableTimeSlots, isTimeSlotAvailable, APPOINTMENT_CONFIG } from "./availability";
import { hashPassword, validatePasswordStrength, authenticateWithPassword } from "./password-auth";

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
    loginWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "La contraseña es requerida"),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await authenticateWithPassword(input.email, input.password);
        
        if (!user) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "Email o contraseña incorrectos" 
          });
        }

        // Actualizar lastSignedIn
        await db.updateUserLastSignedIn(user.id);

        // Crear sesión (cookie)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const sessionToken = JSON.stringify({ userId: user.id });
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { 
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
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
        return client ?? null;
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
        
        await db.deleteClient(input.id);
        return { success: true };
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
        // Validar disponibilidad si se proporciona fecha/hora
        if (input.scheduledDate) {
          const requestedDate = new Date(input.scheduledDate);
          const hours = requestedDate.getHours().toString().padStart(2, '0');
          const minutes = requestedDate.getMinutes().toString().padStart(2, '0');
          const timeSlot = `${hours}:${minutes}`;
          
          const isAvailable = await isTimeSlotAvailable(requestedDate, timeSlot);
          
          if (!isAvailable) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este horario ya está ocupado. Por favor selecciona otro horario.",
            });
          }
        }

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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar citas" });
        }
        
        await db.deleteAppointment(input.id);
        return { success: true };
      }),

    getOccupiedSlots: publicProcedure
      .input(z.object({
        date: z.string(), // Fecha en formato ISO (YYYY-MM-DD)
      }))
      .query(async ({ input }) => {
        const date = new Date(input.date);
        const appointments = await db.getAppointmentsByDate(date);
        
        // Retornar solo las horas ocupadas (formato HH:mm)
        return appointments.map(apt => {
          if (!apt.scheduledDate) return null;
          const hours = apt.scheduledDate.getHours().toString().padStart(2, '0');
          const minutes = apt.scheduledDate.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }).filter(Boolean) as string[];
      }),
  }),

  // ============ ADVISORY REQUESTS ============
  advisory: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        preferredCallTime: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const requestId = await db.createAdvisoryRequest({
          clientId: input.clientId,
          workType: input.workType,
          preferredCallTime: input.preferredCallTime,
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
            preferredCallTime: input.preferredCallTime,
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar asesoramientos" });
        }
        
        await db.deleteAdvisoryRequest(input.id);
        return { success: true };
      }),
  }),

  // ============ PRIOR ESTIMATES ============
  estimates: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        kitchenShape: z.enum(["L", "U", "lineal"]).optional(),
        linearLength: z.number().optional(),
        height: z.number().optional(),
        materialType: z.enum(["quarzone", "sinterizado"]).optional(),
        additionalDetails: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const estimateId = await db.createPriorEstimate({
          clientId: input.clientId,
          workType: input.workType,
          kitchenShape: input.kitchenShape,
          linearLength: input.linearLength?.toString(),
          height: input.height?.toString(),
          materialType: input.materialType,
          additionalDetails: input.additionalDetails,
        });

        // Obtener datos del cliente para notificación
        const client = await db.getClientById(input.clientId);
        if (client) {
          const whatsappLink = whatsapp.notifyNewEstimate({
            clientName: client.name,
            clientPhone: client.whatsappPhone,
            workType: input.workType,
            kitchenShape: input.kitchenShape,
            linearLength: input.linearLength,
            height: input.height,
            materialType: input.materialType,
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
        kitchenShape: z.enum(["L", "U", "lineal"]).optional(),
        measurements: z.string().optional(),
        materialType: z.enum(["quarzone", "sinterizado"]).optional(),
        description: z.string().min(1),
        materials: z.string().optional(),
        totalPrice: z.string(),
        validUntil: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotationId = await db.createQuotation({
          clientId: input.clientId,
          appointmentId: input.appointmentId,
          workType: input.workType,
          kitchenShape: input.kitchenShape,
          measurements: input.measurements,
          materialType: input.materialType,
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar cotizaciones" });
        }
        
        await db.deleteQuotation(input.id);
        return { success: true };
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden ver usuarios" });
        }
        return await db.getAllUsers();
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        role: z.enum(["user", "admin", "super_admin"]),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin y admin pueden crear usuarios
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden crear usuarios" });
        }

        // Solo super_admin puede crear otros admins o super_admins
        if ((input.role === "admin" || input.role === "super_admin") && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden crear administradores" 
          });
        }

        // Solo super_admin y admin pueden crear usuarios con contraseña
        if (input.password && ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo administradores pueden crear usuarios con contraseña" 
          });
        }

        // Validar fortaleza de contraseña si se proporciona
        if (input.password) {
          const { valid, errors } = validatePasswordStrength(input.password);
          if (!valid) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: errors.join(", ") 
            });
          }
        }

        // Verificar que el email no esté duplicado
        const allUsers = await db.getAllUsers();
        const emailExists = allUsers.some(u => u.email?.toLowerCase() === input.email.toLowerCase());
        
        if (emailExists) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Ya existe un usuario con este email" 
          });
        }

        // Hash de contraseña si se proporciona
        let passwordHash: string | undefined;
        if (input.password) {
          passwordHash = await hashPassword(input.password);
        }

        await db.createUser({
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash,
        });
        
        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(["user", "admin", "super_admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden cambiar roles" });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Solo super_admin puede modificar roles de admin o super_admin
        if ((targetUser.role === "admin" || targetUser.role === "super_admin") && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden modificar roles de administradores" 
          });
        }

        // Solo super_admin puede asignar roles de admin o super_admin
        if ((input.newRole === "admin" || input.newRole === "super_admin") && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden asignar roles de administrador" 
          });
        }

        // Prevenir que un usuario se quite sus propios permisos
        if (ctx.user.id === input.userId && (input.newRole === "user" || input.newRole === "admin") && ctx.user.role === "super_admin") {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No puedes quitarte tus propios permisos de super administrador" 
          });
        }

        if (ctx.user.id === input.userId && input.newRole === "user" && ctx.user.role === "admin") {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No puedes quitarte tus propios permisos de administrador" 
          });
        }

        await db.updateUserRole(input.userId, input.newRole);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar usuarios" });
        }

        // No se puede eliminar a sí mismo
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No puedes eliminarte a ti mismo" 
          });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Solo super_admin puede eliminar admins o super_admins
        if ((targetUser.role === "admin" || targetUser.role === "super_admin") && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden eliminar administradores" 
          });
        }

        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
