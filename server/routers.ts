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
import { prepareWhatsAppNotification } from "./whatsapp-notifications";
import { createRemindersForStatusChange } from "./reminders-service";
import { addBusinessDays, calculateEstimatedDeliveryDate } from "./business-days";

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

        // Crear sesión JWT usando el SDK (usa openId del usuario)
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "" });
        
        // Establecer cookie de sesión
        const cookieOptions = getSessionCookieOptions(ctx.req);
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

    // Registro público para clientes nuevos
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
        whatsappPhone: z.string().min(10, "Número de WhatsApp inválido"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar fortaleza de contraseña
        const { valid, errors } = validatePasswordStrength(input.password);
        if (!valid) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: errors.join(", ") 
          });
        }

        // Verificar que el email no esté duplicado
        const allUsers = await db.getAllUsers();
        const emailExists = allUsers.some(u => u.email?.toLowerCase() === input.email.toLowerCase());
        
        if (emailExists) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Ya existe una cuenta con este email. Por favor inicia sesión." 
          });
        }

        // Hash de contraseña
        const passwordHash = await hashPassword(input.password);

        // Crear usuario con rol "user" (cliente)
        const userId = await db.createUserExtended({
          name: input.name,
          email: input.email,
          role: "user",
          passwordHash,
        });

        // Crear registro de cliente asociado
        await db.createClient({
          userId,
          name: input.name,
          email: input.email,
          whatsappPhone: input.whatsappPhone,
        });

        // Obtener el usuario recién creado para crear la sesión
        const newUser = await db.getUserById(userId);
        if (!newUser) {
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Error al crear la cuenta" 
          });
        }

        // Crear sesión JWT
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(newUser.openId, { name: newUser.name || "" });
        
        // Establecer cookie de sesión
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { 
          success: true,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          }
        };
      }),
    // Solicitar recuperación de contraseña
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email("Email inválido"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        // Siempre retornar éxito para no revelar si el email existe
        if (!user) {
          return { 
            success: true,
            message: "Si el email existe, recibirás instrucciones para restablecer tu contraseña" 
          };
        }

        // Generar token de recuperación (expira en 1 hora)
        const resetToken = `reset-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // Guardar token en la base de datos
        await db.setPasswordResetToken(user.id, resetToken, resetExpires);

        // Obtener el cliente asociado para enviar WhatsApp
        const client = await db.getClientByUserId(user.id);
        
        // Generar enlace de recuperación
        const resetLink = `${process.env.VITE_APP_URL || 'https://innovarcitas.manus.space'}/reset-password?token=${resetToken}`;
        
        // Preparar mensaje de WhatsApp
        if (client?.whatsappPhone) {
          const message = `🔐 *Recuperación de Contraseña - INNOVAR Cocinas*\n\nHola ${user.name || 'Cliente'},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña:\n${resetLink}\n\nEste enlace expira en 1 hora.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`;
          
          return {
            success: true,
            message: "Se enviarán instrucciones a tu WhatsApp",
            whatsappLink: `https://wa.me/57${client.whatsappPhone}?text=${encodeURIComponent(message)}`,
            resetLink, // Para desarrollo/testing
          };
        }

        return { 
          success: true,
          message: "Si el email existe, recibirás instrucciones para restablecer tu contraseña",
          resetLink, // Para desarrollo/testing
        };
      }),

    // Restablecer contraseña con token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1, "Token requerido"),
        newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar fortaleza de contraseña
        const { valid, errors } = validatePasswordStrength(input.newPassword);
        if (!valid) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: errors.join(", ") 
          });
        }

        // Buscar usuario con el token
        const user = await db.getUserByResetToken(input.token);
        
        if (!user) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "El enlace de recuperación es inválido o ha expirado" 
          });
        }

        // Hash de nueva contraseña
        const passwordHash = await hashPassword(input.newPassword);

        // Actualizar contraseña y limpiar token
        await db.updateUserPassword(user.id, passwordHash);
        await db.clearPasswordResetToken(user.id);

        // Crear sesión automáticamente
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "" });
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { 
          success: true,
          message: "Contraseña actualizada exitosamente" 
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
        
        await db.deleteClient(input.id);
        return { success: true };
      }),
  }),

  // ============ APPOINTMENTS ============
  appointments: router({
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        workTypes: z.array(z.enum(["cocina", "closet", "puertas", "centro_tv"])),
        scheduledDateStr: z.string().optional(), // "YYYY-MM-DD"
        scheduledTimeStr: z.string().optional(), // "HH:MM"
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let scheduledDate: Date | undefined;
        
        // Validar disponibilidad si se proporciona fecha/hora
        if (input.scheduledDateStr && input.scheduledTimeStr) {
          // Usar los strings directamente para validar disponibilidad
          const isAvailable = await isTimeSlotAvailable(input.scheduledDateStr, input.scheduledTimeStr);
          
          if (!isAvailable) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este horario ya está ocupado. Por favor selecciona otro horario.",
            });
          }
          
          // Crear la fecha para guardar en BD en zona horaria de Colombia (UTC-5)
          const [year, month, day] = input.scheduledDateStr.split('-').map(Number);
          const [hours, minutes] = input.scheduledTimeStr.split(':').map(Number);
          // Crear fecha en UTC y luego ajustar a Colombia (UTC-5)
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`;
          scheduledDate = new Date(dateStr);
        }

        const appointmentId = await db.createAppointment({
          clientId: input.clientId,
          scheduledDate,
          notes: input.notes,
        });

        // Insertar los tipos de trabajo en la tabla appointmentWorkTypes
        for (const workType of input.workTypes) {
          await db.createAppointmentWorkType({
            appointmentId,
            workType,
          });
        }

        // Obtener datos del cliente para notificación
        const client = await db.getClientById(input.clientId);
        if (client) {
          const workTypesText = input.workTypes.map(wt => {
            const labels: Record<string, string> = {
              cocina: "Cocina Integral",
              closet: "Closet",
              puertas: "Puertas",
              centro_tv: "Centro de TV",
            };
            return labels[wt] || wt;
          }).join(", ");

          // Si el cliente tiene email pero no tiene userId, crear usuario automáticamente
          if (client.email && !client.userId) {
            try {
              // Verificar si ya existe un usuario con este email
              const existingUsers = await db.getAllUsers();
              const userExists = existingUsers.some(u => u.email?.toLowerCase() === client.email?.toLowerCase());
              
              if (!userExists) {
                const { generateTemporaryPassword } = await import("./password-generator");
                const { hashPassword } = await import("./password-auth");
                
                // Generar contraseña temporal
                const temporaryPassword = generateTemporaryPassword();
                const hashedPassword = await hashPassword(temporaryPassword);
                
                // Crear usuario
                const userId = await db.createUserExtended({
                  name: client.name,
                  email: client.email,
                  role: "user",
                  passwordHash: hashedPassword,
                });
                
                // Asociar cliente con usuario
                await db.updateClient(client.id, { userId });
                
                // Enviar email de bienvenida con credenciales
                try {
                  const { sendEmail } = await import("./email");
                  const { welcomeEmailTemplate } = await import("./email-templates");
                  const emailData = welcomeEmailTemplate({
                    userName: client.name,
                    email: client.email,
                    temporaryPassword,
                    portalUrl: `${process.env.VITE_APP_URL || ""}/portal`,
                  });
                  await sendEmail({
                    to: client.email,
                    subject: emailData.subject,
                    html: emailData.html,
                  });
                  console.log(`[Auto-registro] Usuario creado y email enviado a ${client.email}`);
                } catch (emailError) {
                  console.error("[Auto-registro] Error al enviar email de bienvenida:", emailError);
                  // No bloquear el proceso si falla el email
                }
              }
            } catch (error) {
              console.error("[Auto-registro] Error al crear usuario automáticamente:", error);
              // No bloquear el proceso si falla el registro automático
            }
          }

          // Enviar email de confirmación de cita si el cliente tiene email
          if (client.email && scheduledDate) {
            try {
              const { sendEmail } = await import("./email");
              const { appointmentConfirmedEmailTemplate } = await import("./email-templates");
              const emailData = appointmentConfirmedEmailTemplate({
                clientName: client.name,
                appointmentDate: scheduledDate,
                workTypes: input.workTypes,
                notes: input.notes,
                portalUrl: `${process.env.VITE_APP_URL || ""}/portal`,
              });
              await sendEmail({
                to: client.email,
                subject: emailData.subject,
                html: emailData.html,
              });
            } catch (emailError) {
              console.error("[Cita] Error al enviar email de confirmación:", emailError);
            }
          }

          const whatsappLink = whatsapp.notifyNewAppointment({
            clientName: client.name,
            clientPhone: client.whatsappPhone,
            clientEmail: client.email || undefined,
            clientAddress: client.address || undefined,
            workType: workTypesText,
            scheduledDate,
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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
    // Crear nueva cotización con items
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        vendorName: z.string(),
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "otro"]),
        items: z.array(z.object({
          itemNumber: z.number(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin y super_admin pueden crear cotizaciones
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear cotizaciones" });
        }

        // Obtener siguiente número de cotización
        const quotationNumber = await db.getNextQuotationNumber();

        // Verificar si algún item incluye costos fijos
        const hasFixedCostsInItems = input.items.some(item => item.includesFixedCosts === true);
        
        // Calcular subtotal y total
        const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
        // Solo agregar costos fijos si NO están incluidos en ningún item
        const transportCost = hasFixedCostsInItems ? 0 : 600000;
        const total = subtotal + transportCost;

        // Fecha de validez: 7 días desde hoy
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        // Crear cotización
        const quotationId = await db.createQuotation({
          quotationNumber,
          clientId: input.clientId,
          vendorName: input.vendorName,
          productType: input.productType,
          status: "draft",
          validUntil,
          subtotal: subtotal.toString(),
          transportCost: transportCost.toString(),
          total: total.toString(),
          createdBy: ctx.user.id,
        });

        // Crear items
        for (const item of input.items) {
          await db.createQuotationItem({
            quotationId,
            itemNumber: item.itemNumber,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice.toString(),
            includesFixedCosts: item.includesFixedCosts || false,
          });
        }

        return { success: true, quotationId, quotationNumber };
      }),

    // Actualizar cotización existente
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number().optional(),
        vendorName: z.string().optional(),
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "otro"]).optional(),
        items: z.array(z.object({
          itemNumber: z.number(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, items, ...quotationData } = input;

        // Si se actualizan items, recalcular totales
        if (items) {
          // Verificar si algún item incluye costos fijos
          const hasFixedCostsInItems = items.some(item => item.includesFixedCosts === true);
          
          const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
          // Solo agregar costos fijos si NO están incluidos en ningún item
          const transportCost = hasFixedCostsInItems ? 0 : 600000;
          const total = subtotal + transportCost;

          // Eliminar items antiguos
          await db.deleteQuotationItems(id);

          // Crear nuevos items
          for (const item of items) {
            await db.createQuotationItem({
              quotationId: id,
              itemNumber: item.itemNumber,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice.toString(),
              includesFixedCosts: item.includesFixedCosts || false,
            });
          }

          // Actualizar totales
          await db.updateQuotation(id, {
            ...quotationData,
            subtotal: subtotal.toString(),
            transportCost: transportCost.toString(),
            total: total.toString(),
          });
        } else {
          await db.updateQuotation(id, quotationData);
        }

        return { success: true };
      }),

    // Listar todas las cotizaciones (Admin)
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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

    // Obtener cotización por ID con items
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verificar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          const client = await db.getClientByUserId(ctx.user.id);
          if (!client || quotation.clientId !== client.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const client = await db.getClientById(quotation.clientId);
        const items = await db.getQuotationItems(input.id);

        return {
          ...quotation,
          client,
          items,
        };
      }),

    // Obtener mis cotizaciones (Cliente)
    getMyQuotations: protectedProcedure
      .query(async ({ ctx }) => {
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) return [];

        return await db.getQuotationsByClientId(client.id);
      }),

    // Cambiar estado de cotización
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "approved", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updateData: any = { status: input.status };
        
        // Si se envía, registrar fecha
        if (input.status === "sent") {
          updateData.sentAt = new Date();
        }

        await db.updateQuotation(input.id, updateData);
        return { success: true };
      }),

    // Eliminar cotización
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.deleteQuotation(input.id);
        return { success: true };
      }),

    // Generar PDF de cotización
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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

        const items = await db.getQuotationItems(input.id);

        // Preparar datos para el PDF
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO'),
          clientName: client.name,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO') : '',
          items: items.map(item => ({
            itemNumber: item.itemNumber,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice || '',
            totalPrice: item.totalPrice,
          })),
          subtotal: quotation.subtotal,
          transportCost: quotation.transportCost,
          total: quotation.total,
        };

        // Generar PDF usando módulo separado
        try {
          console.log('[PDF] Iniciando generación de PDF para cotización:', quotation.id);
          
          const { generateQuotationPDF } = await import('./quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          console.log('[PDF] PDF generado exitosamente en:', result.pdfPath);
          
          // Extraer solo el nombre del archivo
          const path = await import('path');
          const filename = path.basename(result.pdfPath);
          
          // Devolver URL de descarga
          const downloadUrl = `/api/pdf/${filename}`;
          console.log('[PDF] URL de descarga:', downloadUrl);
          
          return {
            success: true,
            downloadUrl,
            filename: result.filename,
          };
        } catch (error: any) {
          console.error('[PDF] Error generando PDF:', error);
          console.error('[PDF] Stack trace:', error.stack);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Error generando PDF: ${error.message}` 
          });
        }
      }),

    // Enviar cotización por email con PDF adjunto
    sendByEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const client = await db.getClientById(quotation.clientId);
        if (!client || !client.email) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente sin email" });
        }

        const items = await db.getQuotationItems(input.id);

        // Generar PDF
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO'),
          clientName: client.name,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO') : '',
          items: items.map(item => ({
            itemNumber: item.itemNumber,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice || '',
            totalPrice: item.totalPrice,
          })),
          subtotal: quotation.subtotal,
          transportCost: quotation.transportCost,
          total: quotation.total,
        };

        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const outputPath = `/tmp/quotation_${quotation.id}_${Date.now()}.pdf`;
        const jsonData = JSON.stringify(pdfData).replace(/'/g, "'\\''");

        try {
          await execAsync(`python3 /home/ubuntu/innovar_cocinas/server/generate_quotation_pdf.py '${jsonData}' ${outputPath}`);

          // Leer el PDF generado
          const fs = require('fs');
          const pdfBuffer = fs.readFileSync(outputPath);

          // Enviar email con Resend
          const { sendEmail } = await import('./email');
          await sendEmail({
            to: client.email,
            subject: `Cotización ${quotation.quotationNumber} - INNOVAR Cocinas`,
            html: `
              <h2>Hola ${client.name},</h2>
              <p>Adjunto encontrarás la cotización <strong>${quotation.quotationNumber}</strong> para tu proyecto de <strong>${quotation.productType}</strong>.</p>
              <p><strong>Total:</strong> ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(quotation.total))}</p>
              <p>Esta cotización tiene una validez de <strong>1 semana</strong>.</p>
              <br>
              <p>Quedamos atentos a cualquier consulta.</p>
              <p>Saludos cordiales,<br><strong>INNOVAR Cocinas Integrales</strong></p>
            `,
            attachments: [{
              filename: `${quotation.quotationNumber}.pdf`,
              content: pdfBuffer,
            }],
          });

          // Limpiar archivo temporal
          fs.unlinkSync(outputPath);

          // Actualizar estado a "sent"
          await db.updateQuotation(input.id, { status: "sent", sentAt: new Date() });

          return { success: true };
        } catch (error: any) {
          console.error('Error enviando cotización:', error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error enviando cotización" });
        }
      }),

    /*
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
          status: "draft",
        });

        return { id: quotationId, success: true };
      }),

    send: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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
          status: "sent",
          sentAt: new Date(),
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
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
    */
  }),

  // ============ AVAILABILITY ============
  availability: router({
    getConfig: publicProcedure.query(() => {
      return APPOINTMENT_CONFIG;
    }),
    getAvailableSlots: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        // Pasar la fecha como string directamente
        return await getAvailableTimeSlots(input.date);
      }),
    checkSlot: publicProcedure
      .input(z.object({ date: z.string(), timeSlot: z.string() }))
      .query(async ({ input }) => {
        // Pasar la fecha como string directamente
        return await isTimeSlotAvailable(input.date, input.timeSlot);
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

    resetPassword: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede resetear contraseñas
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden resetear contraseñas" 
          });
        }

        // No se puede resetear la propia contraseña por este método
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No puedes resetear tu propia contraseña por este método" 
          });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Generar contraseña temporal
        const tempPassword = "Innovar" + Math.floor(1000 + Math.random() * 9000) + "*";
        const hashedPassword = await hashPassword(tempPassword);

        // Actualizar contraseña en la base de datos
        await db.updateUserPassword(input.userId, hashedPassword);

        return { 
          success: true, 
          tempPassword,
          userName: targetUser.name,
          userEmail: targetUser.email
        };
      }),
  }),

  // ============ PROJECTS ============
  projects: router({
    // Crear proyecto (Admin/Comercial)
    create: protectedProcedure
      .input(z.object({
        quotationId: z.number().optional(),
        clientId: z.number(),
        name: z.string().min(1, "El nombre es requerido"),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        initialMeasurements: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin pueden crear proyectos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden crear proyectos" });
        }

        const projectId = await db.createProject({
          ...input,
          status: "cotizacion_enviada",
          quotationSentAt: new Date(),
          createdBy: ctx.user.id,
        });

        // Registrar en historial
        await db.createProjectStatusHistory({
          projectId,
          fromStatus: null,
          toStatus: "cotizacion_enviada",
          changedBy: ctx.user.id,
          notes: "Proyecto creado - Cotización enviada",
        });

        return { success: true, projectId };
      }),

    // Obtener todos los proyectos (filtrados por rol)
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        let projectsList;

        // Filtrar por estado si se proporciona
        if (input?.status) {
          projectsList = await db.getProjectsByStatus(input.status);
        } else {
          projectsList = await db.getAllProjects();
        }

        // Diseñador solo ve proyectos aprobados para diseño o en diseño
        if (role === "disenador") {
          projectsList = projectsList.filter(p => 
            ["aprobado_diseno", "en_diseno", "pendiente_cliente"].includes(p.status)
          );
        }

        // Jefe de taller y operario ven proyectos en producción
        if (role === "jefe_taller" || role === "operario") {
          projectsList = projectsList.filter(p => 
            ["corte", "enchape", "ensamble", "listo_instalacion"].includes(p.status)
          );
        }

        // Obtener info de clientes
        const allClients = await db.getAllClients();
        const clientMap = new Map(allClients.map(c => [c.id, c]));

        return projectsList.map(p => ({
          ...p,
          client: clientMap.get(p.clientId),
        }));
      }),

    // Obtener proyecto por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const client = await db.getClientById(project.clientId);
        const photos = await db.getProjectPhotosByProjectId(input.id);
        const details = await db.getProjectDetailsByProjectId(input.id);
        const history = await db.getProjectStatusHistoryByProjectId(input.id);
        const projectTasks = await db.getTasksByProjectId(input.id);

        return {
          ...project,
          client,
          photos,
          details,
          history,
          tasks: projectTasks,
        };
      }),

    // Obtener proyectos del cliente actual
    getMyProjects: protectedProcedure
      .query(async ({ ctx }) => {
        // Buscar cliente asociado al usuario
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) {
          return [];
        }

        const projectsList = await db.getProjectsByClientId(client.id);
        
        // Para cada proyecto, obtener fotos
        const projectsWithPhotos = await Promise.all(
          projectsList.map(async (p) => {
            const photos = await db.getProjectPhotosByProjectId(p.id);
            return { ...p, photos };
          })
        );

        return projectsWithPhotos;
      }),

    // Cambiar estado del proyecto
    updateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        newStatus: z.enum([
          "cotizacion_enviada", "cotizacion_aprobada", "adelanto_recibido",
          "en_diseno", "pendiente_cliente", "aprobacion_final",
          "despiece", "corte", "enchape", "ensamble", 
          "listo_instalacion", "instalacion_programada", "entregado"
        ]),
        notes: z.string().optional(),
        advanceAmount: z.number().optional(),
        selectedColors: z.string().optional(),
        selectedMaterials: z.string().optional(),
        scheduledInstallDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const role = ctx.user.role;
        const currentStatus = project.status;
        const newStatus = input.newStatus;

        // Validar permisos según el cambio de estado
        const canChangeStatus = validateStatusChange(role, currentStatus, newStatus);
        if (!canChangeStatus) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para realizar este cambio de estado" 
          });
        }

        // Registrar en historial
        await db.createProjectStatusHistory({
          projectId: input.projectId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy: ctx.user.id,
          notes: input.notes,
        });

        // Crear recordatorios automáticos según el nuevo estado
        await createRemindersForStatusChange(input.projectId, newStatus, {
          name: project.name,
          createdBy: project.createdBy,
          designerId: project.designerId,
          clientId: project.clientId,
        });

        // Actualizar fechas clave según el estado
        const updateData: Record<string, unknown> = { status: newStatus };
        
        if (newStatus === "cotizacion_enviada" && !project.quotationSentAt) {
          updateData.quotationSentAt = new Date();
        }
        if (newStatus === "cotizacion_aprobada" && !project.quotationApprovedAt) {
          updateData.quotationApprovedAt = new Date();
        }
        if (newStatus === "adelanto_recibido" && !project.advanceReceivedAt) {
          updateData.advanceReceivedAt = new Date();
          if (input.advanceAmount) {
            updateData.advanceAmount = input.advanceAmount;
          }
        }
        if (newStatus === "aprobacion_final" && !project.clientApprovedAt) {
          updateData.clientApprovedAt = new Date();
          // Calcular fecha estimada de instalación (25 días hábiles)
          updateData.estimatedInstallDate = await calculateEstimatedDeliveryDate(new Date());
          if (input.selectedColors) {
            updateData.selectedColors = input.selectedColors;
          }
          if (input.selectedMaterials) {
            updateData.selectedMaterials = input.selectedMaterials;
          }
        }
        if (newStatus === "instalacion_programada" && input.scheduledInstallDate) {
          updateData.scheduledInstallDate = input.scheduledInstallDate;
        }

        await db.updateProject(input.projectId, updateData);

        // Obtener datos del cliente para notificación WhatsApp
        const client = await db.getClientById(project.clientId);
        let whatsappNotification = null;
        
        if (client) {
          const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
          const projectWithClient = {
            id: project.id,
            name: project.name,
            status: newStatus,
            workType: project.workType,
            client: {
              name: client.name,
              whatsappPhone: client.whatsappPhone,
            },
          };
          whatsappNotification = prepareWhatsAppNotification(projectWithClient, baseUrl);
        }

        return { 
          success: true,
          whatsappNotification,
        };
      }),

    // Aprobar diseño (Cliente, Admin o Super Admin)
    approveDesign: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        approved: z.boolean(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar permisos: Admin, Super Admin, o el cliente dueño del proyecto
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
        let isOwner = false;
        
        if (!isAdmin) {
          const client = await db.getClientByUserId(ctx.user.id);
          isOwner = !!(client && client.id === project.clientId);
        }

        if (!isAdmin && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para aprobar este proyecto" });
        }

        if (project.status !== "pendiente_cliente") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto no está pendiente de aprobación" });
        }

        const approverLabel = isAdmin ? "Admin" : "Cliente";

        if (input.approved) {
          await db.updateProject(input.projectId, {
            status: "corte",
            clientApprovedAt: new Date(),
            clientApprovalNotes: input.notes,
          });

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: "pendiente_cliente",
            toStatus: "corte",
            changedBy: ctx.user.id,
            notes: `${approverLabel} aprobó el diseño: ${input.notes || ""}`,
          });
        } else {
          // Si rechaza, vuelve a diseño
          await db.updateProject(input.projectId, {
            status: "en_diseno",
            clientApprovalNotes: input.notes,
          });

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: "pendiente_cliente",
            toStatus: "en_diseno",
            changedBy: ctx.user.id,
            notes: `${approverLabel} rechazó el diseño: ${input.notes || ""}`,
          });
        }

        return { success: true };
      }),

    // Subir diseño 3D (Diseñador)
    uploadDesign: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        design3dFiles: z.string().optional(),
        despieceFiles: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "disenador" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo diseñadores pueden subir diseños" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        await db.updateProject(input.projectId, {
          design3dFiles: input.design3dFiles,
          despieceFiles: input.despieceFiles,
          designerId: ctx.user.id,
        });

        return { success: true };
      }),

    // Actualizar proyecto
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        initialMeasurements: z.string().optional(),
        estimatedInstallDate: z.date().optional(),
        scheduledInstallDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "jefe_taller") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores o jefe de taller pueden editar proyectos" });
        }

        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),

    // Actualizar fecha estimada de entrega
    updateEstimatedDate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        estimatedInstallDate: z.date(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["admin", "super_admin", "jefe_taller"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar la fecha estimada" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Registrar el cambio en el historial
        const oldDate = project.estimatedInstallDate;
        await db.createProjectStatusHistory({
          projectId: input.projectId,
          fromStatus: project.status,
          toStatus: project.status,
          changedBy: ctx.user.id,
          notes: `Fecha estimada cambiada de ${oldDate ? new Date(oldDate).toLocaleDateString('es-CO') : 'sin fecha'} a ${input.estimatedInstallDate.toLocaleDateString('es-CO')}${input.reason ? `. Motivo: ${input.reason}` : ''}`,
        });

        await db.updateProject(input.projectId, {
          estimatedInstallDate: input.estimatedInstallDate,
        });

        return { success: true };
      }),

    // Eliminar proyecto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar proyectos" });
        }

        await db.deleteProject(input.id);
        return { success: true };
      }),
  }),

  // ============ PROJECT PHOTOS ============
  projectPhotos: router({
    // Subir foto
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        stage: z.enum(["inicial", "diseno", "corte", "enchape", "ensamble", "final"]),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional().default("medidas"),
        subcategory: z.enum(["fotos_iniciales", "dibujo", "renders", "despieces", "detalles", "corte", "enchape", "armado", "proceso_instalacion", "fotos_finales", "documento_cotizacion"]).optional(),
        photoUrl: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const role = ctx.user.role;
        const stage = input.stage;

        // Validar permisos por etapa
        const canUpload = validatePhotoUploadPermission(role, stage);
        if (!canUpload) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para subir fotos en esta etapa" });
        }

        const photoId = await db.createProjectPhoto({
          ...input,
          uploadedBy: ctx.user.id,
        });

        return { success: true, photoId };
      }),

    // Obtener fotos por proyecto
    getByProject: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional(),
      }))
      .query(async ({ input }) => {
        if (input.category) {
          return await db.getProjectPhotosByCategory(input.projectId, input.category);
        }
        return await db.getProjectPhotosByProjectId(input.projectId);
      }),

    // Obtener fotos por etapa
    getByStage: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        stage: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getProjectPhotosByStage(input.projectId, input.stage);
      }),

    // Obtener fotos por categoría
    getByCategory: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]),
      }))
      .query(async ({ input }) => {
        return await db.getProjectPhotosByCategory(input.projectId, input.category);
      }),

    // Eliminar foto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar fotos" });
        }

        await db.deleteProjectPhoto(input.id);
        return { success: true };
      }),
  }),

  // ============ PROJECT DETAILS ============
  projectDetails: router({
    // Crear detalle
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["medida_especial", "nota_importante", "foto_referencia"]),
        title: z.string().min(1, "El título es requerido"),
        content: z.string().min(1, "El contenido es requerido"),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo diseñador, jefe_taller, operario, admin, super_admin pueden crear detalles
        const allowedRoles = ["disenador", "jefe_taller", "operario", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para agregar detalles" });
        }

        const detailId = await db.createProjectDetail({
          ...input,
          createdBy: ctx.user.id,
        });

        return { success: true, detailId };
      }),

    // Obtener detalles por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectDetailsByProjectId(input.projectId);
      }),

    // Actualizar detalle
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["disenador", "jefe_taller", "operario", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar detalles" });
        }

        const { id, ...data } = input;
        await db.updateProjectDetail(id, data);
        return { success: true };
      }),

    // Eliminar detalle
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["disenador", "jefe_taller", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar detalles" });
        }

        await db.deleteProjectDetail(input.id);
        return { success: true };
      }),
  }),

  // ============ TASKS ============
  tasks: router({
    // Crear tarea
    create: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        title: z.string().min(1, "El título es requerido"),
        description: z.string().optional(),
        priority: z.enum(["alta", "media", "baja"]).default("media"),
        dueDate: z.date().optional(),
        assignedTo: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar permisos de asignación
        const canAssign = validateTaskAssignmentPermission(ctx.user.role, input.assignedTo);
        if (!canAssign.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: canAssign.message });
        }

        const taskId = await db.createTask({
          ...input,
          assignedBy: ctx.user.id,
          status: "pendiente",
        });

        // Crear notificación para el usuario asignado
        const priorityLabels: Record<string, string> = {
          alta: "🔴 Alta",
          media: "🟡 Media",
          baja: "🟢 Baja",
        };
        
        let notificationBody = `${ctx.user.name || "Un administrador"} te ha asignado una nueva tarea: "${input.title}"`;
        notificationBody += `\nPrioridad: ${priorityLabels[input.priority] || input.priority}`;
        if (input.dueDate) {
          notificationBody += `\nFecha límite: ${new Date(input.dueDate).toLocaleDateString("es-CO")}`;
        }
        if (input.description) {
          notificationBody += `\n${input.description.substring(0, 100)}${input.description.length > 100 ? "..." : ""}`;
        }

        // Crear notificación en la base de datos
        await db.createNotification({
          userId: input.assignedTo,
          title: "📝 Nueva tarea asignada",
          body: notificationBody,
          type: "tarea",
          referenceId: taskId,
          referenceType: "task",
        });

        // Intentar enviar notificación push (no bloquea si falla)
        try {
          const { createAndSendNotification } = await import("./push-notifications");
          await createAndSendNotification(input.assignedTo, {
            title: "📝 Nueva tarea asignada",
            body: `${ctx.user.name || "Alguien"} te asignó: ${input.title}`,
            type: "tarea",
            url: "/tasks",
          });
        } catch (e) {
          // Silenciar error de push - la notificación en app ya se creó
          console.log("Push notification failed (non-blocking):", e);
        }

        // Enviar email de notificación de tarea (no bloquea si falla)
        try {
          const assignedUser = await db.getUserById(input.assignedTo);
          if (assignedUser?.email) {
            const { sendEmail } = await import("./email");
            const { taskAssignedEmailTemplate } = await import("./email-templates");
            const emailData = taskAssignedEmailTemplate({
              recipientName: assignedUser.name || "Usuario",
              taskTitle: input.title,
              taskDescription: input.description,
              priority: input.priority,
              dueDate: input.dueDate,
              assignedBy: ctx.user.name || "Un administrador",
              portalUrl: `${process.env.VITE_APP_URL || ""}/tasks`,
            });
            await sendEmail({
              to: assignedUser.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          }
        } catch (e) {
          // Silenciar error de email - la notificación en app ya se creó
          console.log("Email notification failed (non-blocking):", e);
        }

        return { success: true, taskId };
      }),

    // Obtener mis tareas
    getMyTasks: protectedProcedure
      .query(async ({ ctx }) => {
        const tasksList = await db.getTasksByAssignedTo(ctx.user.id);
        
        // Obtener info de proyectos asociados
        const projectIds = Array.from(new Set(tasksList.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(
          projectIds.map(id => db.getProjectById(id))
        );
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));

        // Obtener info de quién asignó
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        return tasksList.map(t => ({
          ...t,
          project: t.projectId ? projectMap.get(t.projectId) : null,
          assignedByUser: userMap.get(t.assignedBy),
        }));
      }),

    // Obtener todas las tareas (admin, super_admin, comercial)
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const canViewAll = ["admin", "super_admin", "comercial", "jefe_taller"];
        if (!canViewAll.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver todas las tareas" });
        }

        const tasksList = await db.getAllTasks();
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));
        
        // Obtener info de proyectos asociados
        const projectIds = Array.from(new Set(tasksList.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(
          projectIds.map(id => db.getProjectById(id))
        );
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));

        return tasksList.map(t => ({
          ...t,
          assignedToUser: userMap.get(t.assignedTo),
          assignedByUser: userMap.get(t.assignedBy),
          project: t.projectId ? projectMap.get(t.projectId) : null,
        }));
      }),

    // Obtener tareas por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByProjectId(input.projectId);
      }),

    // Actualizar estado de tarea
    updateStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pendiente", "en_progreso", "completada"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Solo el asignado o admin puede cambiar el estado
        if (task.assignedTo !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar esta tarea" });
        }

        const updateData: any = { status: input.status };
        if (input.status === "completada") {
          updateData.completedAt = new Date();
        }

        await db.updateTask(input.taskId, updateData);
        return { success: true };
      }),

    // Eliminar tarea
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Solo quien creó la tarea o admin puede eliminarla
        if (task.assignedBy !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar esta tarea" });
        }

        await db.deleteTask(input.id);
        return { success: true };
      }),

    // Obtener usuarios a los que puedo asignar tareas (solo equipo de trabajo)
    getAssignableUsers: protectedProcedure
      .query(async ({ ctx }) => {
        const allUsers = await db.getAllUsers();
        const myRole = ctx.user.role;
        
        // Roles que pueden recibir tareas (equipo de trabajo + super_admin para auto-asignación)
        const workTeamRoles = ["super_admin", "comercial", "disenador", "jefe_taller", "operario"];
        
        // Verificar si el usuario puede asignar tareas
        const canAssignRoles = ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"];
        if (!canAssignRoles.includes(myRole)) {
          return [];
        }

        // Filtrar solo equipo de trabajo
        return allUsers
          .filter(u => workTeamRoles.includes(u.role))
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          }));
      }),
  }),

  // ============ FILE UPLOAD ============
  upload: router({
    // Subir imagen a S3
    image: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        contentType: z.string().refine(
          (type) => type.startsWith("image/") || type === "application/pdf",
          { message: "Solo se permiten archivos de imagen o PDF" }
        ),
        projectId: z.number().optional(),
        stage: z.enum(["inicial", "diseno", "corte", "enchape", "ensamble", "final"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        
        // Validar permisos si es para un proyecto
        if (input.stage) {
          if (!validatePhotoUploadPermission(ctx.user.role, input.stage)) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "No tienes permisos para subir fotos en esta etapa" 
            });
          }
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = input.fileName.split(".").pop() || "jpg";
        const safeFileName = `${timestamp}-${randomSuffix}.${extension}`;
        
        // Construir la ruta en S3
        let filePath = `uploads/${ctx.user.id}`;
        if (input.projectId) {
          filePath = `projects/${input.projectId}`;
          if (input.stage) {
            filePath += `/${input.stage}`;
          }
        }
        const fileKey = `${filePath}/${safeFileName}`;

        // Decodificar base64 y subir
        const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Validar tamaño máximo (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (buffer.length > maxSize) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "El archivo es demasiado grande. Máximo 10MB." 
          });
        }

        try {
          const { url } = await storagePut(fileKey, buffer, input.contentType);
          return { success: true, url, key: fileKey };
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Error al subir el archivo" 
          });
        }
      }),

    // Subir múltiples imágenes
    multipleImages: protectedProcedure
      .input(z.object({
        files: z.array(z.object({
          fileName: z.string(),
          fileData: z.string(),
          contentType: z.string(),
        })).max(10, "Máximo 10 archivos a la vez"),
        projectId: z.number().optional(),
        stage: z.enum(["inicial", "diseno", "corte", "enchape", "ensamble", "final"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        
        // Validar permisos
        if (input.stage) {
          if (!validatePhotoUploadPermission(ctx.user.role, input.stage)) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "No tienes permisos para subir fotos en esta etapa" 
            });
          }
        }

        const results: { url: string; key: string; fileName: string }[] = [];
        const errors: { fileName: string; error: string }[] = [];

        for (const file of input.files) {
          try {
            // Validar tipo
            if (!file.contentType.startsWith("image/")) {
              errors.push({ fileName: file.fileName, error: "No es una imagen válida" });
              continue;
            }

            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const extension = file.fileName.split(".").pop() || "jpg";
            const safeFileName = `${timestamp}-${randomSuffix}.${extension}`;
            
            let filePath = `uploads/${ctx.user.id}`;
            if (input.projectId) {
              filePath = `projects/${input.projectId}`;
              if (input.stage) {
                filePath += `/${input.stage}`;
              }
            }
            const fileKey = `${filePath}/${safeFileName}`;

            const base64Data = file.fileData.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");

            // Validar tamaño
            const maxSize = 10 * 1024 * 1024;
            if (buffer.length > maxSize) {
              errors.push({ fileName: file.fileName, error: "Archivo muy grande (máx 10MB)" });
              continue;
            }

            const { url } = await storagePut(fileKey, buffer, file.contentType);
            results.push({ url, key: fileKey, fileName: file.fileName });
          } catch (error) {
            errors.push({ fileName: file.fileName, error: "Error al subir" });
          }
        }

        return { success: true, uploaded: results, errors };
      }),
  }),

  // ============ NOTIFICATIONS & PUSH ============
  notifications: router({
    // Obtener clave pública VAPID para suscripciones push
    getVapidPublicKey: publicProcedure
      .query(async () => {
        const { getVapidPublicKey } = await import("./push-notifications");
        return { publicKey: getVapidPublicKey() };
      }),

    // Registrar suscripción push
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subscriptionId = await db.createPushSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        });
        return { success: true, subscriptionId };
      }),

    // Cancelar suscripción push
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    // Obtener mis notificaciones
    getMyNotifications: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getNotificationsByUserId(ctx.user.id, input?.limit || 50);
      }),

    // Obtener contador de no leídas
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await db.getUnreadNotificationsCount(ctx.user.id);
        return { count };
      }),

    // Marcar notificación como leída
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Marcar todas como leídas
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),

    // Eliminar notificación
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteNotification(input.id);
        return { success: true };
      }),

    // Enviar notificación de prueba (solo admin)
    sendTest: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden enviar notificaciones de prueba" });
        }

        const { createAndSendNotification } = await import("./push-notifications");
        await createAndSendNotification(ctx.user.id, {
          title: "Notificación de Prueba",
          body: "¡Las notificaciones push están funcionando correctamente!",
          type: "sistema",
          url: "/",
        });

        return { success: true };
      }),
  }),

  // ============ PDF EXPORT ============
  pdf: router({
    // Generar reporte HTML del proyecto (para convertir a PDF en el cliente)
    generateProjectReport: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verificar que el usuario tenga acceso al proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar permisos: admin, super_admin, o cliente dueño del proyecto
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
        const isWorker = ["disenador", "jefe_taller", "operario"].includes(ctx.user.role);
        let isOwner = false;
        
        if (!isAdmin && !isWorker) {
          const client = await db.getClientByUserId(ctx.user.id);
          isOwner = !!(client && client.id === project.clientId);
        }

        if (!isAdmin && !isWorker && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
        }

        const { generateProjectReportHTML } = await import("./pdf-generator");
        const html = await generateProjectReportHTML(input.projectId);

        return { html, projectName: project.name };
      }),
  }),

  // ============ REMINDERS ============
  reminders: router({
    // Obtener mis recordatorios
    getMyReminders: protectedProcedure
      .query(async ({ ctx }) => {
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        
        // Enriquecer con información del proyecto y cliente
        const enrichedReminders = await Promise.all(
          reminders.map(async (reminder) => {
            const project = await db.getProjectById(reminder.projectId);
            let client = null;
            if (project?.clientId) {
              client = await db.getClientById(project.clientId);
            }
            return {
              ...reminder,
              project: project ? {
                id: project.id,
                name: project.name,
                status: project.status,
                client: client ? {
                  id: client.id,
                  name: client.name,
                  whatsappPhone: client.whatsappPhone,
                } : null,
              } : null,
            };
          })
        );
        
        return enrichedReminders;
      }),

    // Obtener recordatorios por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRemindersByProjectId(input.projectId);
      }),

    // Marcar recordatorio como completado
    complete: protectedProcedure
      .input(z.object({ reminderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el recordatorio pertenece al usuario o es admin
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        const reminder = reminders.find(r => r.id === input.reminderId);
        
        if (!reminder && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para completar este recordatorio" 
          });
        }
        
        await db.updateReminderStatus(input.reminderId, "completado");
        return { success: true };
      }),

    // Cancelar recordatorio
    cancel: protectedProcedure
      .input(z.object({ reminderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo administradores pueden cancelar recordatorios" 
          });
        }
        
        await db.updateReminderStatus(input.reminderId, "cancelado");
        return { success: true };
      }),

    // Obtener resumen de recordatorios (para dashboard)
    getSummary: protectedProcedure
      .query(async ({ ctx }) => {
        const reminders = await db.getRemindersByUserId(ctx.user.id);
        const now = new Date();
        
        const pending = reminders.filter(r => r.status === "pendiente" || r.status === "enviado");
        const overdue = pending.filter(r => new Date(r.dueDate) <= now);
        const upcoming = pending.filter(r => new Date(r.dueDate) > now);
        
        return {
          total: pending.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          byType: {
            cotizacion_sin_respuesta: pending.filter(r => r.type === "cotizacion_sin_respuesta").length,
            diseno_pendiente: pending.filter(r => r.type === "diseno_pendiente").length,
            aprobacion_pendiente: pending.filter(r => r.type === "aprobacion_pendiente").length,
            produccion_retrasada: pending.filter(r => r.type === "produccion_retrasada").length,
            instalacion_proxima: pending.filter(r => r.type === "instalacion_proxima").length,
          },
        };
      }),
  }),

  // ============ CATÁLOGO DE HERRAJES ============
  hardwareCatalog: router({
    list: protectedProcedure
      .input(z.object({
        category: z.enum(["cocinas", "closets", "puertas"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getHardwareCatalog(input?.category);
      }),

    create: protectedProcedure
      .input(z.object({
        category: z.enum(["cocinas", "closets", "puertas"]),
        name: z.string().min(1),
        description: z.string().optional(),
        options: z.string().optional(),
        photoUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        const id = await db.createHardwareItem(input);
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        options: z.string().optional(),
        photoUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        const { id, ...data } = input;
        await db.updateHardwareItem(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden gestionar el catálogo" });
        }
        await db.deleteHardwareItem(input.id);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        hardwareId: z.number(),
        photoData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden subir fotos" });
        }
        
        // Extraer datos base64
        const matches = input.photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de imagen inválido" });
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generar nombre único
        const ext = input.fileName.split(".").pop() || "jpg";
        const uniqueName = `hardware/${input.hardwareId}-${Date.now()}.${ext}`;
        
        // Subir a S3
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(uniqueName, buffer, contentType);
        
        // Actualizar en DB
        await db.updateHardwareItem(input.hardwareId, { photoUrl: url });
        
        return { success: true, url };
      }),
  }),

  // ============ MATERIALES DE PROYECTO ============
  projectMaterials: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectMaterials(input.projectId);
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        photoType: z.enum(["wood", "countertop", "sink"]),
        photoData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para subir fotos" });
        }
        
        // Extraer datos base64
        const matches = input.photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de imagen inválido" });
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generar nombre único
        const ext = input.fileName.split(".").pop() || "jpg";
        const uniqueName = `materials/${input.projectId}-${input.photoType}-${Date.now()}.${ext}`;
        
        // Subir a S3
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(uniqueName, buffer, contentType);
        
        return { success: true, url };
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        woodType: z.enum(["rh", "estandar"]).optional(),
        woodColor: z.string().optional(),
        woodPhotoUrl: z.string().optional(),
        countertopType: z.enum(["granito", "cuarzo", "sinterizado"]).optional(),
        countertopName: z.string().optional(),
        countertopPhotoUrl: z.string().optional(),
        sinkMeasure: z.string().optional(),
        sinkPhotoUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar materiales" });
        }
        const { projectId, ...data } = input;
        const id = await db.saveProjectMaterials(projectId, data, ctx.user.id);
        return { success: true, id };
      }),

    getSelectedHardware: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectHardwareSelections(input.projectId);
      }),

    selectHardware: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hardwareId: z.number(),
        selectedOption: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para seleccionar herrajes" });
        }
        const id = await db.addProjectHardwareSelection(input.projectId, input.hardwareId, input.selectedOption, input.notes, ctx.user.id);
        return { success: true, id };
      }),

    removeHardware: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hardwareId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar herrajes" });
        }
        await db.removeProjectHardwareSelection(input.projectId, input.hardwareId);
        return { success: true };
      }),
  }),
});

// ============ HELPER FUNCTIONS ============

// Validar cambio de estado según rol - RUTA INNOVAR
function validateStatusChange(role: string, currentStatus: string, newStatus: string): boolean {
  // Super admin y admin pueden hacer cualquier cambio
  if (role === "super_admin" || role === "admin") return true;

  // Diseñador puede:
  // - adelanto_recibido -> en_diseno (empezar a diseñar)
  // - en_diseno -> pendiente_cliente (entregar diseño)
  // - aprobacion_final -> despiece (hacer despiece)
  if (role === "disenador") {
    if (currentStatus === "adelanto_recibido" && newStatus === "en_diseno") return true;
    if (currentStatus === "en_diseno" && newStatus === "pendiente_cliente") return true;
    if (currentStatus === "aprobacion_final" && newStatus === "despiece") return true;
    return false;
  }

  // Jefe de taller puede:
  // - despiece -> corte (pasar a producción)
  // - corte -> enchape -> ensamble -> listo_instalacion
  // - listo_instalacion -> instalacion_programada
  if (role === "jefe_taller") {
    if (currentStatus === "despiece" && newStatus === "corte") return true;
    const productionFlow = ["corte", "enchape", "ensamble", "listo_instalacion", "instalacion_programada"];
    const currentIndex = productionFlow.indexOf(currentStatus);
    const newIndex = productionFlow.indexOf(newStatus);
    if (currentIndex >= 0 && newIndex === currentIndex + 1) return true;
    return false;
  }

  // Operario puede: corte -> enchape -> ensamble (no puede marcar como listo)
  if (role === "operario") {
    const operarioFlow = ["corte", "enchape", "ensamble"];
    const currentIndex = operarioFlow.indexOf(currentStatus);
    const newIndex = operarioFlow.indexOf(newStatus);
    if (currentIndex >= 0 && newIndex === currentIndex + 1) return true;
    return false;
  }

  return false;
}

// Validar permisos de subida de fotos
function validatePhotoUploadPermission(role: string, stage: string): boolean {
  if (role === "super_admin" || role === "admin") return true;

  if (role === "disenador") {
    return ["inicial", "diseno"].includes(stage);
  }

  if (role === "jefe_taller" || role === "operario") {
    return ["corte", "enchape", "ensamble", "final"].includes(stage);
  }

  return false;
}

// Validar permisos de asignación de tareas
function validateTaskAssignmentPermission(assignerRole: string, assignedToId: number): { allowed: boolean; message: string } {
  // Por ahora, validamos que el rol tenga permisos generales de asignar
  // La validación específica del usuario asignado se hace en getAssignableUsers
  const canAssignRoles = ["super_admin", "admin", "disenador", "jefe_taller", "operario"];
  
  if (!canAssignRoles.includes(assignerRole)) {
    return { allowed: false, message: "No tienes permisos para asignar tareas" };
  }

  return { allowed: true, message: "" };
}

export type AppRouter = typeof appRouter;
