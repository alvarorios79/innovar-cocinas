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
import { prepareWhatsAppNotification, generateTeamWhatsAppLink } from "./whatsapp-notifications";
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAllClients();
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
          const { generateTemporaryPassword } = await import("./password-generator");
          temporaryPassword = generateTemporaryPassword();
          const passwordHash = await hashPassword(temporaryPassword);

          // Crear usuario con rol "user" (cliente)
          userId = await db.createUserExtended({
            name: input.name,
            email: input.email,
            role: "user",
            passwordHash,
          });
          userEmail = input.email;
        }

        // Crear cliente (con o sin usuario asociado)
        const clientId = await db.createClient({
          userId,
          name: input.name,
          email: input.email || undefined,
          whatsappPhone: input.whatsappPhone,
          address: input.address,
          internalManagement: input.internalManagement,
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
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
        
        // Optimización: ejecutar consultas en paralelo
        const [appointments, clients] = await Promise.all([
          db.getAllAppointments(),
          db.getAllClients(),
        ]);
        
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
        
        // Optimización: ejecutar consultas en paralelo
        const [requests, clients] = await Promise.all([
          db.getAllAdvisoryRequests(),
          db.getAllClients(),
        ]);
        
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
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "herrajes", "mesones", "otro"]).optional(),
        discountPercent: z.number().min(0).max(100).optional().default(0),
        items: z.array(z.object({
          itemNumber: z.number(),
          itemType: z.string(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
          fixedCostsAmount: z.number().optional(),
          kitchenConfig: z.any().optional(),
          hardwareSelections: z.array(z.object({
            hardwareId: z.number(),
            name: z.string(),
            price: z.string(),
            quantity: z.number(),
            subtotal: z.number(),
          })).optional(),
          closetConfig: z.any().optional(),
          doorConfig: z.any().optional(),
          tvCenterConfig: z.any().optional(),
          countertopConfig: z.any().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Si no se especifica productType, usar el itemType del primer item
        const productType = input.productType || (input.items[0]?.itemType as any) || "otro";
        // Solo admin y super_admin pueden crear cotizaciones
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear cotizaciones" });
        }

        // Obtener siguiente número de cotización
        const quotationNumber = await db.getNextQuotationNumber();

        // Calcular subtotal (suma de todos los items)
        const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Calcular descuento
        const discountPercent = input.discountPercent || 0;
        const discountAmount = subtotal * (discountPercent / 100);
        
        // El transporte ya está incluido en el totalPrice de cada item si includesFixedCosts=true
        // Por lo tanto, el total es simplemente la suma de todos los items menos el descuento
        const transportCost = 0; // No agregar transporte adicional
        const total = subtotal - discountAmount;

        // Fecha de validez: 7 días desde hoy
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        // Crear cotización
        const quotationId = await db.createQuotation({
          quotationNumber,
          clientId: input.clientId,
          vendorName: input.vendorName,
          productType,
          status: "draft",
          validUntil,
          subtotal: subtotal.toString(),
          transportCost: transportCost.toString(),
          discountPercent: discountPercent.toString(),
          discountAmount: discountAmount.toString(),
          total: total.toString(),
          createdBy: ctx.user.id,
        });

        // Crear items
        for (const item of input.items) {
          await db.createQuotationItem({
            quotationId,
            itemNumber: item.itemNumber,
            itemType: item.itemType,
            description: item.description || "Item",
            quantity: item.quantity || "1",
            unitPrice: item.unitPrice || null,
            totalPrice: item.totalPrice.toString(),
            includesFixedCosts: item.includesFixedCosts || false,
            fixedCostsAmount: item.fixedCostsAmount || null,
            kitchenConfig: item.kitchenConfig ? JSON.stringify(item.kitchenConfig) : null,
            hardwareSelections: item.hardwareSelections ? JSON.stringify(item.hardwareSelections) : null,
            closetConfig: item.closetConfig ? JSON.stringify(item.closetConfig) : null,
            doorConfig: item.doorConfig ? JSON.stringify(item.doorConfig) : null,
            tvCenterConfig: item.tvCenterConfig ? JSON.stringify(item.tvCenterConfig) : null,
            countertopConfig: item.countertopConfig ? JSON.stringify(item.countertopConfig) : null,
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
        productType: z.enum(["cocina", "closet", "puerta", "centro_tv", "herrajes", "mesones", "otro"]).optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        customDescriptions: z.record(z.string(), z.string()).optional(),
        generalNotes: z.string().optional(),
        items: z.array(z.object({
          itemNumber: z.number(),
          itemType: z.string(),
          description: z.string(),
          quantity: z.string(),
          unitPrice: z.string().optional(),
          totalPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          includesFixedCosts: z.boolean().optional(),
          fixedCostsAmount: z.number().optional(),
          kitchenConfig: z.any().optional(),
          hardwareSelections: z.array(z.object({
            hardwareId: z.number(),
            name: z.string(),
            price: z.string(),
            quantity: z.number(),
            subtotal: z.number(),
          })).optional(),
          closetConfig: z.any().optional(),
          doorConfig: z.any().optional(),
          tvCenterConfig: z.any().optional(),
          countertopConfig: z.any().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, items, ...quotationData } = input;

        // Si se actualizan items, recalcular totales
        if (items) {
          // El totalPrice de cada item YA incluye todo (cocina + extras + transporte si aplica)
          // No necesitamos sumar nada adicional
          const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
          const transportCost = 0; // Ya incluido en totalPrice de items
          
          // Calcular descuento
          const discountPercent = input.discountPercent ?? 0;
          const discountAmount = subtotal * (discountPercent / 100);
          const total = subtotal - discountAmount;

          // Eliminar items antiguos
          await db.deleteQuotationItems(id);

          // Crear nuevos items
          for (const item of items) {
            await db.createQuotationItem({
              quotationId: id,
              itemNumber: item.itemNumber,
              itemType: item.itemType,
              description: item.description || "Item",
              quantity: item.quantity || "1",
              unitPrice: item.unitPrice || null,
              totalPrice: item.totalPrice.toString(),
              includesFixedCosts: item.includesFixedCosts || false,
              fixedCostsAmount: item.fixedCostsAmount || null,
              kitchenConfig: item.kitchenConfig ? JSON.stringify(item.kitchenConfig) : null,
              hardwareSelections: item.hardwareSelections ? JSON.stringify(item.hardwareSelections) : null,
              closetConfig: item.closetConfig ? JSON.stringify(item.closetConfig) : null,
              doorConfig: item.doorConfig ? JSON.stringify(item.doorConfig) : null,
              tvCenterConfig: item.tvCenterConfig ? JSON.stringify(item.tvCenterConfig) : null,
              countertopConfig: item.countertopConfig ? JSON.stringify(item.countertopConfig) : null,
            });
          }

          // Actualizar totales
          await db.updateQuotation(id, {
            ...quotationData,
            subtotal: subtotal.toString(),
            transportCost: transportCost.toString(),
            discountPercent: discountPercent.toString(),
            discountAmount: discountAmount.toString(),
            total: total.toString(),
          });
        } else if (input.discountPercent !== undefined) {
          // Si solo se actualiza el descuento sin cambiar items
          const existingQuotation = await db.getQuotationById(id);
          if (existingQuotation) {
            const subtotal = parseFloat(existingQuotation.subtotal);
            const discountPercent = input.discountPercent;
            const discountAmount = subtotal * (discountPercent / 100);
            const total = subtotal - discountAmount;
            
            await db.updateQuotation(id, {
              ...quotationData,
              discountPercent: discountPercent.toString(),
              discountAmount: discountAmount.toString(),
              total: total.toString(),
            });
          }
        } else {
          // Remover discountPercent del quotationData ya que es un número y la BD espera string
          const { discountPercent: _, ...safeQuotationData } = quotationData;
          await db.updateQuotation(id, safeQuotationData);
        }

        return { success: true };
      }),

    // Listar todas las cotizaciones (Admin)
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Optimización: ejecutar consultas en paralelo
        const [quotations, clients] = await Promise.all([
          db.getAllQuotations(),
          db.getAllClients(),
        ]);

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

        // Parsear kitchenConfig, hardwareSelections, closetConfig y doorConfig de string JSON a objeto
        const parsedItems = items.map(item => ({
          ...item,
          kitchenConfig: item.kitchenConfig && typeof item.kitchenConfig === 'string' 
            ? JSON.parse(item.kitchenConfig) 
            : item.kitchenConfig,
          hardwareSelections: item.hardwareSelections && typeof item.hardwareSelections === 'string'
            ? JSON.parse(item.hardwareSelections)
            : item.hardwareSelections,
          closetConfig: item.closetConfig && typeof item.closetConfig === 'string'
            ? JSON.parse(item.closetConfig)
            : item.closetConfig,
          doorConfig: item.doorConfig && typeof item.doorConfig === 'string'
            ? JSON.parse(item.doorConfig)
            : item.doorConfig,
          tvCenterConfig: item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
            ? JSON.parse(item.tvCenterConfig)
            : item.tvCenterConfig,
          countertopConfig: item.countertopConfig && typeof item.countertopConfig === 'string'
            ? JSON.parse(item.countertopConfig)
            : item.countertopConfig
        }));

        return {
          ...quotation,
          client,
          items: parsedItems,
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
          items: items.map(item => {
            let description = item.description;
            
            // Parsear hardwareSelections si es string JSON
            const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
              ? JSON.parse(item.hardwareSelections)
              : item.hardwareSelections;
            
            // Parsear closetConfig si es string JSON
            const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
              ? JSON.parse(item.closetConfig)
              : item.closetConfig;
            
            // Parsear doorConfig si es string JSON
            const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
              ? JSON.parse(item.doorConfig)
              : item.doorConfig;
            
            // Parsear tvCenterConfig si es string JSON
            const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
              ? JSON.parse(item.tvCenterConfig)
              : item.tvCenterConfig;
            
            // Si es closet y tiene closetConfig, generar descripción detallada
            if (item.itemType === 'closet' && closetConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'estandar': 'Closet Estándar',
                'especial': 'Closet Especial',
                'empotrado': 'Closet Empotrado'
              };
              const doorLabels: Record<string, string> = {
                'corredizas': 'Puertas Corredizas',
                'batientes': 'Puertas Batientes'
              };
              
              lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
              lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
              lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
              lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
              lines.push(`Precio por M²: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(closetConfig.pricePerSquareMeter)}`);
              lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Maletero');
              lines.push('• Divisor');
              lines.push('• Doble colgadero');
              lines.push('• Entrepaños');
              lines.push('• Doble cajonero');
              lines.push('• Zapatero');
              if (closetConfig.type === 'empotrado') {
                lines.push('• Espaldar y laterales completos');
              }
              
              // Agregar notas si existen
              if (closetConfig.notes && closetConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(closetConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es herrajes y tiene hardwareSelections, generar descripción detallada
            else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
              const lines: string[] = [];
              lines.push('HERRAJES SELECCIONADOS');
              lines.push('');
              
              hardwareSelections.forEach((hw: any) => {
                const price = parseFloat(hw.price || '0');
                const subtotal = hw.subtotal || (price * hw.quantity);
                lines.push(`• ${hw.name}`);
                lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)} | Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}`);
              });
              
              description = lines.join('\n');
            }
            // Si es puerta y tiene doorConfig, generar descripción detallada
            else if (item.itemType === 'puerta' && doorConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'batiente': 'Puerta Batiente',
                'corrediza': 'Puerta Corrediza'
              };
              const colorLabels: Record<string, string> = {
                'aluminio': 'Color Aluminio',
                'negro': 'Color Negro'
              };
              
              // Verificar si es estructura nueva (lista de puertas) o antigua (puerta única)
              if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
                // Nueva estructura: lista de puertas
                const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
                lines.push('PUERTAS - MADERA MACIZA TIPO RH');
                lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
                lines.push('');
                
                doorConfig.doors.forEach((door: any, idx: number) => {
                  const qty = door.quantity || 1;
                  const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
                  lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
                  lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
                  lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
                  lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
                  lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
                  if (door.location) {
                    lines.push(`  • Ubicación: ${door.location}`);
                  }
                  if (door.notes) {
                    lines.push(`  • Notas: ${door.notes}`);
                  }
                  lines.push(`  • Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
                  if (qty > 1) {
                    lines.push(`  • Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(lineTotal)}`);
                  }
                  if (idx < doorConfig.doors.length - 1) lines.push('');
                });
                
                lines.push('');
                lines.push('Todas incluyen:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push('• Instalación completa');
                
                // Transporte e imprevistos
                if (doorConfig.includeTransport && doorConfig.transportCost) {
                  lines.push('');
                  lines.push(`Transporte e Imprevistos: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.transportCost)}`);
                }
              } else {
                // Estructura antigua: puerta única (compatibilidad)
                lines.push(`${typeLabels[doorConfig.type] || doorConfig.type.toUpperCase()} - MADERA MACIZA TIPO RH`);
                lines.push(`Cantidad: ${doorConfig.quantity || 1} ${(doorConfig.quantity || 1) === 1 ? 'unidad' : 'unidades'}`);
                lines.push(`Ancho: ${doorConfig.width}cm (Rango: ${doorConfig.widthRange}cm)`);
                lines.push(`Altura: ${doorConfig.height}m (máx 2.40m)`);
                lines.push(`Precio por unidad: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.pricePerUnit)}`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push(`• Accesorios: ${colorLabels[doorConfig.hardwareColor] || doorConfig.hardwareColor}`);
                lines.push('• Instalación completa');
                
                if (doorConfig.type === 'corrediza') {
                  lines.push('• Sistema de riel incluido');
                }
              }
              
              // Agregar notas si existen
              if (doorConfig.notes && doorConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(doorConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
            else if (item.itemType === 'centro_tv' && tvCenterConfig) {
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
              lines.push(`Ancho: ${tvCenterConfig.width}m`);
              lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Mueble flotante');
              lines.push('• Panel para TV con alistonado');
              lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
              
              if (tvCenterConfig.hasHighGloss) {
                lines.push('• Acabado alto brillo');
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push('• Iluminación LED');
              }
              if (tvCenterConfig.equipmentSpaces > 0) {
                lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
              }
              
              lines.push('');
              lines.push('Desglose:');
              lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
              if (tvCenterConfig.hasHighGloss) {
                lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
              }
              if (tvCenterConfig.extraShelvesPrice > 0) {
                lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
              }
              if (tvCenterConfig.equipmentSpacesPrice > 0) {
                lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
              }
              if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
                lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
              }
              
              if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(tvCenterConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es mesones y tiene countertopConfig, generar descripción detallada
            else if (item.itemType === 'mesones' && item.countertopConfig) {
              const config = typeof item.countertopConfig === 'string' 
                ? JSON.parse(item.countertopConfig) 
                : item.countertopConfig;
              
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              // Verificar si es el nuevo formato con múltiples mesones
              if (config.mesones && Array.isArray(config.mesones)) {
                lines.push('MESONES EN PIEDRA');
                lines.push('');
                
                config.mesones.forEach((meson: any, index: number) => {
                  const tipoTexto = meson.tipo === 'meson' ? 'Mesón Estándar' : meson.tipo === 'isla' ? 'Isla' : 'Barra';
                  const materialTexto = meson.material === 'quarzo' ? 'Quarzo' : 'Sinterizado';
                  
                  lines.push(`${index + 1}. ${tipoTexto.toUpperCase()} EN ${materialTexto.toUpperCase()}`);
                  lines.push(`   ${meson.metrosLineales}ML x ${meson.fondo}cm de fondo`);
                  
                  // Incluidos según tipo
                  if (meson.tipo === 'meson') {
                    lines.push('   Incluye: Regrueso en el visto' + (meson.incluyeSalpicaderoAlto ? ', Salpicadero alto' : ', Salpicadero bajo 10cm'));
                    lines.push('   Pegado lavaplatos + Lavaplatos 45x37cm');
                  } else if (meson.tipo === 'isla') {
                    const extras = [];
                    extras.push('Regrueso en el visto');
                    if (meson.incluyeLaterales) extras.push('Laterales (1.8ML)');
                    if (meson.incluyeRegrueso) extras.push('Regrueso adicional (0.9ML)');
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  } else if (meson.tipo === 'barra') {
                    const extras = [];
                    extras.push('Regrueso en los vistos');
                    if (!meson.incluyeSalpicaderoAlto) extras.push('Salpicadero bajo 10cm');
                    else extras.push('Salpicadero alto');
                    if (meson.alturaLateral > 0) extras.push(`Lateral ${meson.alturaLateral}cm`);
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  }
                  
                  lines.push(`   Subtotal: ${formatCurrency(meson.subtotal)}`);
                  lines.push('');
                });
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas: ' + config.notes);
                }
              } else {
                // Formato antiguo (un solo mesón)
                const tipoTexto = config.tipo === 'meson' ? 'MESÓN' : config.tipo === 'isla' ? 'ISLA' : 'BARRA';
                const materialTexto = config.material === 'quarzo' ? 'QUARZO' : 'SINTERIZADO';
                
                lines.push(`${tipoTexto} EN ${materialTexto}`);
                lines.push(`Metros lineales: ${config.metrosLineales}ML`);
                lines.push(`Fondo: ${config.fondo}cm`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Regrueso en el visto');
                
                if (config.tipo === 'meson') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                  lines.push('• Pegado de lavaplatos (incluye lavaplatos 45x37cm)');
                } else if (config.tipo === 'barra') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                }
                
                if (config.tipo === 'isla' && config.incluyeLaterales) {
                  lines.push('• Laterales de isla (1.8ML)');
                }
                if (config.tipo === 'isla' && config.incluyeRegrueso) {
                  lines.push('• Regrueso de isla (0.9ML x 60cm)');
                }
                if (config.tipo === 'barra' && config.alturaLateral > 0) {
                  lines.push(`• Lateral de barra (${config.alturaLateral}cm)`);
                }
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`• Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas adicionales:');
                  lines.push(config.notes);
                }
              }
              
              description = lines.join('\n');
            }
            // Si es cocina y tiene kitchenConfig, generar descripción detallada
            else if (item.itemType === 'cocina' && item.kitchenConfig) {
              const config = typeof item.kitchenConfig === 'string' 
                ? JSON.parse(item.kitchenConfig) 
                : item.kitchenConfig;
              
              const lines: string[] = [];
              const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
              
              // Título según la forma
              const shapeLabels: Record<string, string> = {
                'L': 'en L',
                'U': 'en U',
                'lineal': 'Lineal',
                'frente_pll': 'Frente PLL (Solo Inferiores)',
                'solo_superiores': 'Solo Muebles Superiores',
                'solo_inferiores': 'Solo Muebles Inferiores',
                'puertas_tapas': 'Puertas y Tapas'
              };
              const shapeLabel = shapeLabels[config.shape] || config.shape;
              lines.push(`COCINA INTEGRAL - ${shapeLabel}`);
              lines.push(`Metraje total: ${config.totalMeters.toFixed(2)}ml`);
              lines.push('');
              
              // Calcular metraje resultante (solo para cocinas completas)
              let deductions = 0;
              if (!isSpecialShape) {
                if (config.specialModules?.nichoNevecon) deductions += 1.0;
                if (config.specialModules?.nichoNevera) deductions += 0.75;
                if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
                if (config.specialModules?.alacenaHerraje) deductions += 0.5;
                if (config.specialModules?.torreHornos) deductions += 0.7;
              }
              const resultingMeters = Math.max(0, config.totalMeters - deductions);
              
              // Muebles lineales según la forma
              if (config.shape === 'frente_pll') {
                lines.push(`• Muebles Inferiores (Frente PLL): ${config.totalMeters.toFixed(2)}ml`);
                if (config.includeUpperModule && config.upperModuleMeters > 0) {
                  lines.push(`• Muebles Superiores: ${config.upperModuleMeters.toFixed(2)}ml`);
                }
              } else if (config.shape === 'solo_superiores') {
                lines.push(`• Muebles Superiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'solo_inferiores') {
                lines.push(`• Muebles Inferiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'puertas_tapas') {
                const dc = config.doorsAndCovers || {};
                if (dc.upperDoors70 > 0) lines.push(`• Puertas superiores 70cm: ${dc.upperDoors70} und`);
                if (dc.upperDoors90 > 0) lines.push(`• Puertas superiores 90cm: ${dc.upperDoors90} und`);
                if (dc.upperDoors100 > 0) lines.push(`• Puertas superiores 100cm: ${dc.upperDoors100} und`);
                if (dc.lowerDoors > 0) lines.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
                if (dc.pantryDoors > 0) lines.push(`• Puertas alacena: ${dc.pantryDoors} und`);
                if (dc.drawerCovers > 0) lines.push(`• Tapas cajón: ${dc.drawerCovers} und`);
                if (dc.smallCovers > 0) lines.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
              } else {
                // Cocinas completas (L, U, Lineal)
                lines.push(`• Muebles Inferiores: ${resultingMeters.toFixed(2)}ml`);
                lines.push(`• Muebles Superiores: ${resultingMeters.toFixed(2)}ml`);
              }
              
              // Muebles especiales
              if (config.specialModules.nichoNevecon) {
                lines.push(`• Nicho para nevecon 100cm`);
              }
              if (config.specialModules.nichoNevera) {
                lines.push(`• Nicho nevera estándar 75cm`);
              }
              if (config.specialModules.alacenaEntrepanos) {
                lines.push(`• Alacena con entrepaños 50cm`);
              }
              if (config.specialModules.alacenaHerraje) {
                lines.push(`• Alacena para herraje 50cm`);
              }
              if (config.specialModules.torreHornos) {
                lines.push(`• Torre de hornos 70cm`);
              }
              
              // Mesón principal
              if (config.countertop.type) {
                const countertopType = config.countertop.type === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                let surchargeText = '';
                
                if (config.countertop.depthSurcharge === '30percent') {
                  surchargeText = ' (fondo 61-90cm)';
                } else if (config.countertop.depthSurcharge === 'double') {
                  surchargeText = ' (fondo 91-120cm)';
                }
                
                lines.push(`• Mesón ${countertopType}: ${resultingMeters.toFixed(2)}ml${surchargeText}`);
              }
              
              // Isla
              if (config.island.enabled && config.island.meters > 0) {
                const islandLines: string[] = [];
                islandLines.push(`${config.island.meters.toFixed(2)}ml muebles`);
                
                if (config.island.countertopType) {
                  const islandCountertopType = config.island.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  islandLines.push(`mesón ${islandCountertopType}`);
                }
                
                if (config.island.hasLaterals) {
                  islandLines.push('con laterales');
                }
                
                lines.push(`• Isla: ${islandLines.join(', ')}`);
              }
              
              // Barra
              if (config.bar.enabled && config.bar.meters > 0) {
                const barLines: string[] = [];
                barLines.push(`${config.bar.meters.toFixed(2)}ml muebles`);
                
                if (config.bar.countertopType) {
                  const barCountertopType = config.bar.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  barLines.push(`mesón ${barCountertopType}`);
                }
                
                if (config.bar.hasLateral) {
                  barLines.push('con lateral');
                }
                
                lines.push(`• Barra: ${barLines.join(', ')}`);
              }
              
              // LED
              if (config.ledLighting > 0) {
                lines.push(`• Luz LED: ${config.ledLighting.toFixed(2)}ml`);
              }
              
              description = lines.join('\n');
            }
            
            // Usar descripción personalizada si existe
            const customDescriptions = quotation.customDescriptions as Record<number, string> | null;
            const itemIndex = item.itemNumber - 1; // itemNumber es 1-based
            if (customDescriptions && customDescriptions[itemIndex]) {
              description = customDescriptions[itemIndex];
            }
            
            return {
              itemNumber: item.itemNumber,
              description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || '',
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: String(parseFloat(String(quotation.subtotal)) || 0),
          transportCost: String(parseFloat(String(quotation.transportCost)) || 0),
          discountPercent: String(parseFloat(String(quotation.discountPercent)) || 0),
          discountAmount: String(parseFloat(String(quotation.discountAmount)) || 0),
          total: String(parseFloat(String(quotation.total)) || 0),
          generalNotes: quotation.generalNotes || '',
        };

        // Generar PDF usando módulo separado
        try {
            const { generateQuotationPDF } = await import('./quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Extraer solo el nombre del archivo
          const path = await import('path');
          const filename = path.basename(result.pdfPath);
          
          // Devolver URL de descarga con nombre real como query param
          const downloadUrl = `/api/pdf/${filename}?name=${encodeURIComponent(result.filename)}`;
          
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

    // Vista previa del PDF (genera PDF temporal para preview)
    previewPDF: protectedProcedure
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

        // Preparar datos para el PDF (misma lógica que generatePDF)
        const pdfData = {
          quotationNumber: quotation.quotationNumber,
          date: new Date().toLocaleDateString('es-CO'),
          clientName: client.name,
          vendorName: quotation.vendorName,
          productType: quotation.productType,
          validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO') : '',
          items: items.map(item => {
            let description = item.description;
            
            // Parsear configs
            const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
              ? JSON.parse(item.hardwareSelections)
              : item.hardwareSelections;
            const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
              ? JSON.parse(item.closetConfig)
              : item.closetConfig;
            const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
              ? JSON.parse(item.doorConfig)
              : item.doorConfig;
            const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
              ? JSON.parse(item.tvCenterConfig)
              : item.tvCenterConfig;
            
            // Generar descripción según tipo (simplificado para preview)
            if (item.itemType === 'closet' && closetConfig) {
              description = `CLOSET ${closetConfig.type?.toUpperCase() || ''} - ${closetConfig.width}m x ${closetConfig.height}m`;
            } else if (item.itemType === 'herrajes' && hardwareSelections?.length > 0) {
              description = `HERRAJES - ${hardwareSelections.length} items seleccionados`;
            } else if (item.itemType === 'puerta' && doorConfig) {
              const totalDoors = doorConfig.doors?.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0) || 1;
              description = `PUERTAS - ${totalDoors} unidad(es)`;
            } else if (item.itemType === 'centro_tv' && tvCenterConfig) {
              description = `CENTRO DE TV - ${tvCenterConfig.width}m`;
            }
            
            // Usar descripción personalizada si existe
            const customDescriptions = quotation.customDescriptions as Record<number, string> | null;
            const itemIndex = item.itemNumber - 1;
            if (customDescriptions && customDescriptions[itemIndex]) {
              description = customDescriptions[itemIndex];
            }
            
            return {
              itemNumber: item.itemNumber,
              description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || undefined,
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: String(parseFloat(String(quotation.subtotal)) || 0),
          transportCost: String(parseFloat(String(quotation.transportCost)) || 0),
          discountPercent: String(parseFloat(String(quotation.discountPercent)) || 0),
          discountAmount: String(parseFloat(String(quotation.discountAmount)) || 0),
          total: String(parseFloat(String(quotation.total)) || 0),
          generalNotes: quotation.generalNotes || '',
        };

        try {
          const { generateQuotationPDF } = await import('./quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          const path = await import('path');
          const filename = path.basename(result.pdfPath);
          const downloadUrl = `/api/pdf/${filename}?name=${encodeURIComponent(result.filename)}`;
          
          return {
            success: true,
            downloadUrl,
            filename: result.filename,
          };
        } catch (error: any) {
          console.error('[PDF Preview] Error:', error);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Error generando vista previa: ${error.message}` 
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
          items: items.map(item => {
            let description = item.description;
            
            // Parsear hardwareSelections si es string JSON
            const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
              ? JSON.parse(item.hardwareSelections)
              : item.hardwareSelections;
            
            // Parsear closetConfig si es string JSON
            const closetConfig = item.closetConfig && typeof item.closetConfig === 'string'
              ? JSON.parse(item.closetConfig)
              : item.closetConfig;
            
            // Parsear doorConfig si es string JSON
            const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
              ? JSON.parse(item.doorConfig)
              : item.doorConfig;
            
            // Parsear tvCenterConfig si es string JSON
            const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
              ? JSON.parse(item.tvCenterConfig)
              : item.tvCenterConfig;
            
            // Si es closet y tiene closetConfig, generar descripción detallada
            if (item.itemType === 'closet' && closetConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'estandar': 'Closet Estándar',
                'especial': 'Closet Especial',
                'empotrado': 'Closet Empotrado'
              };
              const doorLabels: Record<string, string> = {
                'corredizas': 'Puertas Corredizas',
                'batientes': 'Puertas Batientes'
              };
              
              lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
              lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
              lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
              lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
              lines.push(`Precio por M²: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(closetConfig.pricePerSquareMeter)}`);
              lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Maletero');
              lines.push('• Divisor');
              lines.push('• Doble colgadero');
              lines.push('• Entrepaños');
              lines.push('• Doble cajonero');
              lines.push('• Zapatero');
              if (closetConfig.type === 'empotrado') {
                lines.push('• Espaldar y laterales completos');
              }
              
              // Agregar notas si existen
              if (closetConfig.notes && closetConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(closetConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es herrajes y tiene hardwareSelections, generar descripción detallada
            else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
              const lines: string[] = [];
              lines.push('HERRAJES SELECCIONADOS');
              lines.push('');
              
              hardwareSelections.forEach((hw: any) => {
                const price = parseFloat(hw.price || '0');
                const subtotal = hw.subtotal || (price * hw.quantity);
                lines.push(`• ${hw.name}`);
                lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)} | Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}`);
              });
              
              description = lines.join('\n');
            }
            // Si es puerta y tiene doorConfig, generar descripción detallada
            else if (item.itemType === 'puerta' && doorConfig) {
              const lines: string[] = [];
              const typeLabels: Record<string, string> = {
                'batiente': 'Puerta Batiente',
                'corrediza': 'Puerta Corrediza'
              };
              const colorLabels: Record<string, string> = {
                'aluminio': 'Color Aluminio',
                'negro': 'Color Negro'
              };
              
              // Verificar si es estructura nueva (lista de puertas) o antigua (puerta única)
              if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
                // Nueva estructura: lista de puertas
                const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
                lines.push('PUERTAS - MADERA MACIZA TIPO RH');
                lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
                lines.push('');
                
                doorConfig.doors.forEach((door: any, idx: number) => {
                  const qty = door.quantity || 1;
                  const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
                  lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
                  lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
                  lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
                  lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
                  lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
                  if (door.location) {
                    lines.push(`  • Ubicación: ${door.location}`);
                  }
                  if (door.notes) {
                    lines.push(`  • Notas: ${door.notes}`);
                  }
                  lines.push(`  • Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
                  if (qty > 1) {
                    lines.push(`  • Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(lineTotal)}`);
                  }
                  if (idx < doorConfig.doors.length - 1) lines.push('');
                });
                
                lines.push('');
                lines.push('Todas incluyen:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push('• Instalación completa');
                
                // Transporte e imprevistos
                if (doorConfig.includeTransport && doorConfig.transportCost) {
                  lines.push('');
                  lines.push(`Transporte e Imprevistos: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.transportCost)}`);
                }
              } else {
                // Estructura antigua: puerta única (compatibilidad)
                lines.push(`${typeLabels[doorConfig.type] || doorConfig.type.toUpperCase()} - MADERA MACIZA TIPO RH`);
                lines.push(`Cantidad: ${doorConfig.quantity || 1} ${(doorConfig.quantity || 1) === 1 ? 'unidad' : 'unidades'}`);
                lines.push(`Ancho: ${doorConfig.width}cm (Rango: ${doorConfig.widthRange}cm)`);
                lines.push(`Altura: ${doorConfig.height}m (máx 2.40m)`);
                lines.push(`Precio por unidad: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.pricePerUnit)}`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Marco RH');
                lines.push('• Chapa gama alta');
                lines.push('• Bisagras omega');
                lines.push('• Tope de puerta');
                lines.push(`• Accesorios: ${colorLabels[doorConfig.hardwareColor] || doorConfig.hardwareColor}`);
                lines.push('• Instalación completa');
                
                if (doorConfig.type === 'corrediza') {
                  lines.push('• Sistema de riel incluido');
                }
              }
              
              // Agregar notas si existen
              if (doorConfig.notes && doorConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(doorConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
            else if (item.itemType === 'centro_tv' && tvCenterConfig) {
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
              lines.push(`Ancho: ${tvCenterConfig.width}m`);
              lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
              lines.push('');
              lines.push('Incluye:');
              lines.push('• Mueble flotante');
              lines.push('• Panel para TV con alistonado');
              lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
              
              if (tvCenterConfig.hasHighGloss) {
                lines.push('• Acabado alto brillo');
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push('• Iluminación LED');
              }
              if (tvCenterConfig.equipmentSpaces > 0) {
                lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
              }
              
              lines.push('');
              lines.push('Desglose:');
              lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
              if (tvCenterConfig.hasHighGloss) {
                lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
              }
              if (tvCenterConfig.hasLedLights) {
                lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
              }
              if (tvCenterConfig.extraShelvesPrice > 0) {
                lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
              }
              if (tvCenterConfig.equipmentSpacesPrice > 0) {
                lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
              }
              if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
                lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
              }
              
              if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
                lines.push('');
                lines.push('Notas adicionales:');
                lines.push(tvCenterConfig.notes);
              }
              
              description = lines.join('\n');
            }
            // Si es mesones y tiene countertopConfig, generar descripción detallada
            else if (item.itemType === 'mesones' && item.countertopConfig) {
              const config = typeof item.countertopConfig === 'string' 
                ? JSON.parse(item.countertopConfig) 
                : item.countertopConfig;
              
              const lines: string[] = [];
              const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
              
              // Verificar si es el nuevo formato con múltiples mesones
              if (config.mesones && Array.isArray(config.mesones)) {
                lines.push('MESONES EN PIEDRA');
                lines.push('');
                
                config.mesones.forEach((meson: any, index: number) => {
                  const tipoTexto = meson.tipo === 'meson' ? 'Mesón Estándar' : meson.tipo === 'isla' ? 'Isla' : 'Barra';
                  const materialTexto = meson.material === 'quarzo' ? 'Quarzo' : 'Sinterizado';
                  
                  lines.push(`${index + 1}. ${tipoTexto.toUpperCase()} EN ${materialTexto.toUpperCase()}`);
                  lines.push(`   ${meson.metrosLineales}ML x ${meson.fondo}cm de fondo`);
                  
                  // Incluidos según tipo
                  if (meson.tipo === 'meson') {
                    lines.push('   Incluye: Regrueso en el visto' + (meson.incluyeSalpicaderoAlto ? ', Salpicadero alto' : ', Salpicadero bajo 10cm'));
                    lines.push('   Pegado lavaplatos + Lavaplatos 45x37cm');
                  } else if (meson.tipo === 'isla') {
                    const extras = [];
                    extras.push('Regrueso en el visto');
                    if (meson.incluyeLaterales) extras.push('Laterales (1.8ML)');
                    if (meson.incluyeRegrueso) extras.push('Regrueso adicional (0.9ML)');
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  } else if (meson.tipo === 'barra') {
                    const extras = [];
                    extras.push('Regrueso en los vistos');
                    if (!meson.incluyeSalpicaderoAlto) extras.push('Salpicadero bajo 10cm');
                    else extras.push('Salpicadero alto');
                    if (meson.alturaLateral > 0) extras.push(`Lateral ${meson.alturaLateral}cm`);
                    lines.push(`   Incluye: ${extras.join(', ')}`);
                  }
                  
                  lines.push(`   Subtotal: ${formatCurrency(meson.subtotal)}`);
                  lines.push('');
                });
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas: ' + config.notes);
                }
              } else {
                // Formato antiguo (un solo mesón)
                const tipoTexto = config.tipo === 'meson' ? 'MESÓN' : config.tipo === 'isla' ? 'ISLA' : 'BARRA';
                const materialTexto = config.material === 'quarzo' ? 'QUARZO' : 'SINTERIZADO';
                
                lines.push(`${tipoTexto} EN ${materialTexto}`);
                lines.push(`Metros lineales: ${config.metrosLineales}ML`);
                lines.push(`Fondo: ${config.fondo}cm`);
                lines.push('');
                lines.push('Incluye:');
                lines.push('• Regrueso en el visto');
                
                if (config.tipo === 'meson') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                  lines.push('• Pegado de lavaplatos (incluye lavaplatos 45x37cm)');
                } else if (config.tipo === 'barra') {
                  if (!config.incluyeSalpicaderoAlto) {
                    lines.push('• Salpicadero bajo 10cm');
                  } else {
                    lines.push('• Salpicadero alto (duplica metraje)');
                  }
                }
                
                if (config.tipo === 'isla' && config.incluyeLaterales) {
                  lines.push('• Laterales de isla (1.8ML)');
                }
                if (config.tipo === 'isla' && config.incluyeRegrueso) {
                  lines.push('• Regrueso de isla (0.9ML x 60cm)');
                }
                if (config.tipo === 'barra' && config.alturaLateral > 0) {
                  lines.push(`• Lateral de barra (${config.alturaLateral}cm)`);
                }
                
                if (config.includeTransport && config.transportCost) {
                  lines.push(`• Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
                }
                
                if (config.notes && config.notes.trim()) {
                  lines.push('');
                  lines.push('Notas adicionales:');
                  lines.push(config.notes);
                }
              }
              
              description = lines.join('\n');
            }
            // Si es cocina y tiene kitchenConfig, generar descripción detallada
            else if (item.itemType === 'cocina' && item.kitchenConfig) {
              const config = typeof item.kitchenConfig === 'string' 
                ? JSON.parse(item.kitchenConfig) 
                : item.kitchenConfig;
              
              const lines: string[] = [];
              const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
              
              // Título según la forma
              const shapeLabels: Record<string, string> = {
                'L': 'en L',
                'U': 'en U',
                'lineal': 'Lineal',
                'frente_pll': 'Frente PLL (Solo Inferiores)',
                'solo_superiores': 'Solo Muebles Superiores',
                'solo_inferiores': 'Solo Muebles Inferiores',
                'puertas_tapas': 'Puertas y Tapas'
              };
              const shapeLabel = shapeLabels[config.shape] || config.shape;
              lines.push(`COCINA INTEGRAL - ${shapeLabel}`);
              lines.push(`Metraje total: ${config.totalMeters.toFixed(2)}ml`);
              lines.push('');
              
              // Calcular metraje resultante (solo para cocinas completas)
              let deductions = 0;
              if (!isSpecialShape) {
                if (config.specialModules?.nichoNevecon) deductions += 1.0;
                if (config.specialModules?.nichoNevera) deductions += 0.75;
                if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
                if (config.specialModules?.alacenaHerraje) deductions += 0.5;
                if (config.specialModules?.torreHornos) deductions += 0.7;
              }
              const resultingMeters = Math.max(0, config.totalMeters - deductions);
              
              // Muebles lineales según la forma
              if (config.shape === 'frente_pll') {
                lines.push(`• Muebles Inferiores (Frente PLL): ${config.totalMeters.toFixed(2)}ml`);
                if (config.includeUpperModule && config.upperModuleMeters > 0) {
                  lines.push(`• Muebles Superiores: ${config.upperModuleMeters.toFixed(2)}ml`);
                }
              } else if (config.shape === 'solo_superiores') {
                lines.push(`• Muebles Superiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'solo_inferiores') {
                lines.push(`• Muebles Inferiores: ${config.totalMeters.toFixed(2)}ml`);
              } else if (config.shape === 'puertas_tapas') {
                const dc = config.doorsAndCovers || {};
                if (dc.upperDoors70 > 0) lines.push(`• Puertas superiores 70cm: ${dc.upperDoors70} und`);
                if (dc.upperDoors90 > 0) lines.push(`• Puertas superiores 90cm: ${dc.upperDoors90} und`);
                if (dc.upperDoors100 > 0) lines.push(`• Puertas superiores 100cm: ${dc.upperDoors100} und`);
                if (dc.lowerDoors > 0) lines.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
                if (dc.pantryDoors > 0) lines.push(`• Puertas alacena: ${dc.pantryDoors} und`);
                if (dc.drawerCovers > 0) lines.push(`• Tapas cajón: ${dc.drawerCovers} und`);
                if (dc.smallCovers > 0) lines.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
              } else {
                // Cocinas completas (L, U, Lineal)
                lines.push(`• Muebles Inferiores: ${resultingMeters.toFixed(2)}ml`);
                lines.push(`• Muebles Superiores: ${resultingMeters.toFixed(2)}ml`);
              }
              
              // Muebles especiales
              if (config.specialModules.nichoNevecon) {
                lines.push(`• Nicho para nevecon 100cm`);
              }
              if (config.specialModules.nichoNevera) {
                lines.push(`• Nicho nevera estándar 75cm`);
              }
              if (config.specialModules.alacenaEntrepanos) {
                lines.push(`• Alacena con entrepaños 50cm`);
              }
              if (config.specialModules.alacenaHerraje) {
                lines.push(`• Alacena para herraje 50cm`);
              }
              if (config.specialModules.torreHornos) {
                lines.push(`• Torre de hornos 70cm`);
              }
              
              // Mesón principal
              if (config.countertop.type) {
                const countertopType = config.countertop.type === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                let surchargeText = '';
                
                if (config.countertop.depthSurcharge === '30percent') {
                  surchargeText = ' (fondo 61-90cm)';
                } else if (config.countertop.depthSurcharge === 'double') {
                  surchargeText = ' (fondo 91-120cm)';
                }
                
                lines.push(`• Mesón ${countertopType}: ${resultingMeters.toFixed(2)}ml${surchargeText}`);
              }
              
              // Isla
              if (config.island.enabled && config.island.meters > 0) {
                const islandLines: string[] = [];
                islandLines.push(`${config.island.meters.toFixed(2)}ml muebles`);
                
                if (config.island.countertopType) {
                  const islandCountertopType = config.island.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  islandLines.push(`mesón ${islandCountertopType}`);
                }
                
                if (config.island.hasLaterals) {
                  islandLines.push('con laterales');
                }
                
                lines.push(`• Isla: ${islandLines.join(', ')}`);
              }
              
              // Barra
              if (config.bar.enabled && config.bar.meters > 0) {
                const barLines: string[] = [];
                barLines.push(`${config.bar.meters.toFixed(2)}ml muebles`);
                
                if (config.bar.countertopType) {
                  const barCountertopType = config.bar.countertopType === 'quarzone' ? 'Quarzone' : 'Sinterizado';
                  barLines.push(`mesón ${barCountertopType}`);
                }
                
                if (config.bar.hasLateral) {
                  barLines.push('con lateral');
                }
                
                lines.push(`• Barra: ${barLines.join(', ')}`);
              }
              
              // LED
              if (config.ledLighting > 0) {
                lines.push(`• Luz LED: ${config.ledLighting.toFixed(2)}ml`);
              }
              
              description = lines.join('\n');
            }
            
            return {
              itemNumber: item.itemNumber,
              description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || '',
              totalPrice: item.totalPrice,
            };
          }),
          subtotal: quotation.subtotal,
          transportCost: quotation.transportCost,
          total: quotation.total,
        };

        try {
          // Generar PDF usando el mismo módulo que el botón PDF
          const { generateQuotationPDF } = await import('./quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Leer el PDF generado
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(result.pdfPath);

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
          fs.unlinkSync(result.pdfPath);
          
          // Actualizar estado a "sent"
          await db.updateQuotation(input.id, { status: "sent", sentAt: new Date() });

          return { success: true };
        } catch (error: any) {
          console.error('Error enviando cotización:', error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error enviando cotización" });
        }
      }),

    // Aprobar cotización desde el portal del cliente
    clientApprove: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        receiptUrl: z.string().optional(),
        advanceAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario tiene un cliente asociado
        const client = await db.getClientByUserId(ctx.user.id);
        
        // Obtener la cotización
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }
        
        // Verificar que la cotización pertenece al cliente (o es admin)
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
        if (!isAdmin && (!client || quotation.clientId !== client.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para aprobar esta cotización" });
        }
        
        // Verificar que la cotización está en estado "sent" (enviada)
        if (quotation.status !== "sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden aprobar cotizaciones enviadas" });
        }
        
        // Actualizar estado a "approved"
        await db.updateQuotation(input.id, {
          status: "approved",
          approvedAt: new Date(),
        });
        
        // Obtener datos del cliente para la notificación
        const clientData = await db.getClientById(quotation.clientId);
        
        // GENERAR PDF DE LA COTIZACIÓN Y SUBIRLO A S3
        let quotationPdfUrl: string | null = null;
        try {
          const items = await db.getQuotationItems(input.id);
          
          // Preparar datos para el PDF
          const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
          
          const pdfData = {
            quotationNumber: quotation.quotationNumber,
            date: new Date().toLocaleDateString('es-CO'),
            clientName: clientData?.name || 'Cliente',
            vendorName: quotation.vendorName,
            productType: quotation.productType,
            validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO') : '',
            items: items.map(item => ({
              itemNumber: item.itemNumber,
              description: item.description,
              quantity: item.quantity.toString(),
              totalPrice: formatCurrency(Number(item.totalPrice)),
            })),
            subtotal: formatCurrency(Number(quotation.subtotal)),
            transportCost: formatCurrency(Number(quotation.transportCost || 0)),
            total: formatCurrency(Number(quotation.total)),
          };
          
          // Generar PDF
          const { generateQuotationPDF } = await import('./quotation-pdf-generator');
          const result = await generateQuotationPDF(pdfData, quotation.id);
          
          // Leer el PDF generado y subirlo a S3
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(result.pdfPath);
          const { storagePut } = await import('./storage');
          
          const pdfKey = `quotations/${quotation.quotationNumber}-${Date.now()}.pdf`;
          const { url } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');
          quotationPdfUrl = url;
          
          // Limpiar archivo temporal
          fs.unlinkSync(result.pdfPath);
          

        } catch (pdfError: any) {
          console.error('[PDF] Error generando PDF de cotización:', pdfError);
          // No fallar la aprobación si el PDF falla, solo loguear el error
        }
        
        // CREAR PROYECTO AUTOMÁTICAMENTE
        // Determinar el tipo de trabajo basado en productType de la cotización
        const workTypeMap: Record<string, "cocina" | "closet" | "puertas" | "centro_tv"> = {
          cocina: "cocina",
          closet: "closet",
          puerta: "puertas",
          centro_tv: "centro_tv",
          herrajes: "cocina", // Por defecto
          mesones: "cocina", // Por defecto
          otro: "cocina", // Por defecto
        };
        
        const workType = workTypeMap[quotation.productType] || "cocina";
        const projectName = `${clientData?.name || "Cliente"} - ${quotation.quotationNumber}`;
        
        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        const projectId = await db.createProject({
          quotationId: quotation.id,
          clientId: quotation.clientId,
          name: projectName,
          workType: workType,
          status: "cotizacion_aprobada",
          quotationApprovedAt: new Date(),
          createdBy: ctx.user.id,
          advanceReceiptUrl: input.receiptUrl || null,
          advanceAmount: input.advanceAmount ? input.advanceAmount.toString() : null,
          quotationPdfUrl: quotationPdfUrl,
          tentativeInstallDate: tentativeDate,
          isInstallDateOfficial: false,
        });
        
        // Crear historial de estado del proyecto
        await db.createProjectStatusHistory({
          projectId: projectId,
          fromStatus: "cotizacion_enviada",
          toStatus: "cotizacion_aprobada",
          changedBy: ctx.user.id,
          notes: `Proyecto creado automáticamente al aprobar cotización ${quotation.quotationNumber}${input.notes ? `. Notas del cliente: ${input.notes}` : ""}`,
        });
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin", "comercial"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "¡Cotización Aprobada - Proyecto Creado!",
            body: `El cliente ${clientData?.name || ""} ha aprobado la cotización ${quotation.quotationNumber}. Se ha creado el proyecto #${projectId} automáticamente.${input.notes ? ` Notas: ${input.notes}` : ""}`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        // Generar enlace de WhatsApp para notificar al comercial
        const whatsAppLink = whatsapp.notifyQuotationApproved({
          clientName: clientData?.name || "Cliente",
          clientPhone: clientData?.whatsappPhone || "",
          quotationNumber: quotation.quotationNumber,
          workType: quotation.productType,
          totalAmount: quotation.total,
          advanceAmount: input.advanceAmount?.toString(),
          portalUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL?.replace('/api', '') || ''}/proyectos`,
        });
        
        return { 
          success: true, 
          message: "Cotización aprobada y proyecto creado exitosamente",
          projectId: projectId,
          whatsAppLink: whatsAppLink,
        };
      }),

    // Rechazar cotización desde el portal del cliente
    clientReject: protectedProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1, "Debe indicar el motivo del rechazo"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario tiene un cliente asociado
        const client = await db.getClientByUserId(ctx.user.id);
        
        // Obtener la cotización
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }
        
        // Verificar que la cotización pertenece al cliente (o es admin)
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
        if (!isAdmin && (!client || quotation.clientId !== client.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para rechazar esta cotización" });
        }
        
        // Verificar que la cotización está en estado "sent" (enviada)
        if (quotation.status !== "sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden rechazar cotizaciones enviadas" });
        }
        
        // Actualizar estado a "rejected"
        await db.updateQuotation(input.id, {
          status: "rejected",
          rejectionReason: input.reason,
        });
        
        // Obtener datos del cliente para la notificación
        const clientData = await db.getClientById(quotation.clientId);
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "Cotización Rechazada",
            body: `El cliente ${clientData?.name || ""} ha rechazado la cotización ${quotation.quotationNumber}. Motivo: ${input.reason}`,
            type: "cotizacion",
            referenceId: input.id,
            referenceType: "quotation",
          });
        }
        
        return { success: true, message: "Cotización rechazada" };
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
        
        // Optimización: ejecutar consultas en paralelo
        const [quotations, clients] = await Promise.all([
          db.getAllQuotations(),
          db.getAllClients(),
        ]);
        
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

    // Crear proyecto manualmente desde cotización
    createProject: protectedProcedure
      .input(z.object({
        quotationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin y super_admin pueden crear proyectos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para crear proyectos" });
        }

        // Obtener la cotización
        const quotation = await db.getQuotationById(input.quotationId);
        if (!quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        }

        // Verificar que no exista ya un proyecto para esta cotización
        const existingProject = await db.getProjectByQuotationId(input.quotationId);
        if (existingProject) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya existe un proyecto para esta cotización" });
        }

        // Obtener datos del cliente
        const clientData = await db.getClientById(quotation.clientId);

        // Mapear tipo de producto a tipo de trabajo
        const workTypeMap: Record<string, "cocina" | "closet" | "puertas" | "centro_tv"> = {
          cocina: "cocina",
          closet: "closet",
          puertas: "puertas",
          centro_tv: "centro_tv",
          meson: "cocina",
          herrajes: "cocina",
          otro: "cocina",
        };
        
        const workType = workTypeMap[quotation.productType] || "cocina";
        const projectName = `${clientData?.name || "Cliente"} - ${quotation.quotationNumber}`;
        
        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        // Crear el proyecto con datos financieros de la cotización
        const projectId = await db.createProject({
          quotationId: quotation.id,
          clientId: quotation.clientId,
          name: projectName,
          workType: workType,
          status: "cotizacion_aprobada",
          quotationApprovedAt: new Date(),
          createdBy: ctx.user.id,
          tentativeInstallDate: tentativeDate,
          isInstallDateOfficial: false,
          totalAmount: quotation.total, // Precio total de la cotización
        });
        
        // Crear historial de estado del proyecto
        await db.createProjectStatusHistory({
          projectId: projectId,
          fromStatus: "cotizacion_enviada",
          toStatus: "cotizacion_aprobada",
          changedBy: ctx.user.id,
          notes: `Proyecto creado manualmente desde cotización ${quotation.quotationNumber}`,
        });

        // Actualizar el estado de la cotización a aprobada
        await db.updateQuotation(input.quotationId, {
          status: "approved",
        });
        
        // Notificar a super_admin, admin y comercial
        const admins = await db.getAllUsers();
        const notifyRoles = ["super_admin", "admin", "comercial"];
        const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
        
        for (const user of usersToNotify) {
          await db.createNotification({
            userId: user.id,
            title: "¡Proyecto Creado!",
            body: `Se ha creado el proyecto #${projectId} para ${clientData?.name || "Cliente"} desde la cotización ${quotation.quotationNumber}.`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }
        
        return { 
          success: true, 
          projectId,
          message: `Proyecto #${projectId} creado exitosamente`
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

    // Limpieza del sistema - eliminar todos los datos de prueba en cascada
    deleteTestUsers: protectedProcedure
      .input(z.object({
        userIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede eliminar datos masivamente
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden realizar limpieza del sistema" 
          });
        }

        // Equipo de trabajo real - no se pueden eliminar
        const realTeamEmails = [
          'mcfy8jgnym@privaterelay.appleid.com',
          'alejoile300@gmail.com',
          'martha79s@hotmail.com',
          'jefe.taller@innovar.temp',
          'operario@innovar.temp'
        ];

        // Clientes reales - no se pueden eliminar
        const realClientEmails = [
          'albetan1530@gmail.com',
          'alvarorios79@hotmail.com',
          'ruth@email.com' // Ruth Naranjo
        ];

        const allUsers = await db.getAllUsers();
        const allClients = await db.getAllClients();
        
        let deletedUsers = 0;
        let deletedClients = 0;
        let deletedAppointments = 0;
        let deletedQuotations = 0;
        let deletedProjects = 0;
        let skipped = 0;

        // Identificar usuarios de prueba
        const testUserIds = input.userIds.filter(userId => {
          const user = allUsers.find(u => u.id === userId);
          if (!user) return false;
          if (realTeamEmails.includes(user.email?.toLowerCase() || '')) return false;
          if (user.id === ctx.user.id) return false;
          return true;
        });

        // Identificar clientes de prueba (por email o por userId)
        const testClientIds = allClients
          .filter(c => {
            const email = (c.email || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            // No eliminar clientes reales
            if (realClientEmails.includes(email)) return false;
            // Detectar clientes de prueba
            const isTest = email.includes('test') || email.includes('example') ||
                          name.includes('test') || name.includes('cliente timezone') ||
                          name.includes('prueba cliente') || name.includes('new client');
            // O si su usuario es de prueba
            const userIsTest = c.userId && testUserIds.includes(c.userId);
            return isTest || userIsTest;
          })
          .map(c => c.id);

        console.log(`[Limpieza] Usuarios de prueba: ${testUserIds.length}, Clientes de prueba: ${testClientIds.length}`);

        // 1. Eliminar citas de clientes de prueba
        for (const clientId of testClientIds) {
          try {
            const appointments = await db.getAppointmentsByClientId(clientId);
            for (const apt of appointments) {
              await db.deleteAppointment(apt.id);
              deletedAppointments++;
            }
          } catch (error) {
            console.error(`Error eliminando citas del cliente ${clientId}:`, error);
          }
        }

        // 2. Eliminar cotizaciones de clientes de prueba
        for (const clientId of testClientIds) {
          try {
            const quotations = await db.getQuotationsByClientId(clientId);
            for (const quot of quotations) {
              // Primero eliminar items de la cotización
              await db.deleteQuotationItems(quot.id);
              await db.deleteQuotation(quot.id);
              deletedQuotations++;
            }
          } catch (error) {
            console.error(`Error eliminando cotizaciones del cliente ${clientId}:`, error);
          }
        }

        // 3. Eliminar proyectos de clientes de prueba
        for (const clientId of testClientIds) {
          try {
            const projects = await db.getProjectsByClientId(clientId);
            for (const proj of projects) {
              // Eliminar fotos, tareas, historial, etc.
              await db.deleteProjectPhotos(proj.id);
              await db.deleteProjectTasks(proj.id);
              await db.deleteProjectStatusHistory(proj.id);
              await db.deleteProjectMaterials(proj.id);
              await db.deleteProject(proj.id);
              deletedProjects++;
            }
          } catch (error) {
            console.error(`Error eliminando proyectos del cliente ${clientId}:`, error);
          }
        }

        // 4. Eliminar clientes de prueba
        for (const clientId of testClientIds) {
          try {
            // Eliminar estimados previos
            await db.deletePriorEstimatesByClientId(clientId);
            // Eliminar solicitudes de asesoría
            await db.deleteAdvisoryRequestsByClientId(clientId);
            // Eliminar cliente
            await db.deleteClient(clientId);
            deletedClients++;
          } catch (error) {
            console.error(`Error eliminando cliente ${clientId}:`, error);
          }
        }

        // 5. Eliminar usuarios de prueba (sin afectar datos reales)
        for (const userId of testUserIds) {
          try {
            // Verificar si el usuario tiene dependencias en datos reales
            const userDependencies = await db.checkUserDependencies(userId);
            
            if (userDependencies.hasRealDependencies) {
              console.log(`[Limpieza] Usuario ${userId} tiene dependencias reales, saltando...`);
              skipped++;
              continue;
            }
            
            // Eliminar solo dependencias de prueba
            // 5.1 Eliminar suscripciones push
            await db.deletePushSubscriptionsByUserId(userId);
            
            // 5.2 Eliminar notificaciones del usuario (son de prueba)
            await db.deleteNotificationsByUserId(userId);
            
            // Finalmente eliminar el usuario
            await db.deleteUser(userId);
            deletedUsers++;
            console.log(`[Limpieza] Usuario ${userId} eliminado exitosamente`);
          } catch (error) {
            console.error(`Error eliminando usuario ${userId}:`, error);
            skipped++;
          }
        }

        return { 
          success: true, 
          deleted: deletedUsers,
          deletedUsers,
          deletedClients,
          deletedAppointments,
          deletedQuotations,
          deletedProjects,
          skipped 
        };
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

    updateBirthDate: protectedProcedure
      .input(z.object({
        userId: z.number(),
        birthDate: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede actualizar fechas de cumpleaños
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden gestionar fechas de cumpleaños" 
          });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Actualizar fecha de cumpleaños
        await db.updateUserBirthDate(input.userId, input.birthDate);

        return { success: true };
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

        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        const projectId = await db.createProject({
          ...input,
          status: "cotizacion_enviada",
          quotationSentAt: new Date(),
          createdBy: ctx.user.id,
          tentativeInstallDate: tentativeDate,
          isInstallDateOfficial: false,
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

        // Diseñador solo ve proyectos desde adelanto recibido hasta aprobación final
        if (role === "disenador") {
          projectsList = projectsList.filter(p => 
            ["adelanto_recibido", "en_diseno", "pendiente_cliente", "aprobacion_final"].includes(p.status)
          );
        }

        // Jefe de taller ve proyectos desde diseño listo hasta entregado
        if (role === "jefe_taller") {
          projectsList = projectsList.filter(p => 
            ["pendiente_cliente", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "instalacion_programada", "entregado"].includes(p.status)
          );
        }
        
        // Operario ve proyectos en producción activa (corte a listo_instalacion)
        if (role === "operario") {
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
        console.log('[DEBUG] Project quotationId:', project?.quotationId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Optimización: ejecutar consultas en paralelo
        const [client, photos, details, history, projectTasks, quotation, payments] = await Promise.all([
          db.getClientById(project.clientId),
          db.getProjectPhotosByProjectId(input.id),
          db.getProjectDetailsByProjectId(input.id),
          db.getProjectStatusHistoryByProjectId(input.id),
          db.getTasksByProjectId(input.id),
          project.quotationId ? db.getQuotationById(project.quotationId) : Promise.resolve(null),
          db.getProjectPaymentsByProjectId(input.id),
        ]);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        // Calcular información financiera
        const quotationTotal = quotation?.total ? Number(quotation.total) : 0;
        const projectAdvance = project.advanceAmount ? Number(project.advanceAmount) : 0;
        const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
        const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
        // Usar total pagado si hay pagos registrados, sino usar el adelanto
        const actualPaid = totalPaid > 0 ? totalPaid : advanceAmount;
        const remainingAmount = totalAmount - actualPaid;

        console.log('[DEBUG] Building result with quotationId:', project.quotationId, 'quotation:', quotation?.id);
        const result = {
          ...project,
          quotationId: project.quotationId,
          client,
          photos,
          details,
          history,
          tasks: projectTasks,
          quotation,
          payments,
          financialInfo: {
            totalAmount,
            advanceAmount,
            advancePercentage: 60,
            actualPaid,
            remainingAmount,
            remainingPercentage: totalAmount > 0 ? Math.round((remainingAmount / totalAmount) * 100) : 40,
            isPaid: remainingAmount <= 0,
            paymentProgress: totalAmount > 0 ? Math.round((actualPaid / totalAmount) * 100) : 0,
          },
        };
        

        console.log('[DEBUG] Final result quotationId:', result.quotationId, 'quotation:', JSON.stringify(result.quotation));
        return result;
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
        if (newStatus === "entregado" && !project.deliveredAt) {
          updateData.deliveredAt = new Date();
        }

        await db.updateProject(input.projectId, updateData);

        // Notificar al diseñador cuando el proyecto pasa a "Cliente Confirmado - Iniciar Diseño"
        if (newStatus === "adelanto_recibido" && project.designerId) {
          try {
            // Crear notificación en la base de datos
            await db.createNotification({
              userId: project.designerId,
              title: "✨ Cliente Confirmado - Iniciar Diseño",
              body: `¡Nuevo proyecto listo para diseñar! El proyecto "${project.name}" está confirmado. Tienes 3 días hábiles para entregar el modelado.`,
              type: "proyecto",
              referenceId: project.id,
              referenceType: "project",
            });
            
            // Intentar enviar notificación push
            try {
              const { createAndSendNotification } = await import("./push-notifications");
              await createAndSendNotification(project.designerId, {
                title: "✨ Nuevo Proyecto para Diseñar",
                body: `"${project.name}" está listo. ¡A diseñar!`,
                type: "proyecto",
                url: `/projects/${project.id}`,
              });
            } catch (e) {
              // Silenciar error de push
            }
          } catch (e) {
            // Silenciar error de notificación
            console.error("Error notificando al diseñador:", e);
          }
        }

        // Notificar al jefe de taller cuando el operario avanza una etapa de producción
        const productionStages = ["enchape", "ensamble", "listo_instalacion"];
        if (role === "operario" && productionStages.includes(newStatus)) {
          try {
            const allUsers = await db.getAllUsers();
            const jefesTaller = allUsers.filter(u => u.role === "jefe_taller");
            
            const stageLabels: Record<string, string> = {
              enchape: "Enchape",
              ensamble: "Ensamble",
              listo_instalacion: "Listo para Instalación",
            };
            
            for (const jefe of jefesTaller) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: jefe.id,
                title: `🛠️ Avance de Producción por Operario`,
                body: `El operario ${ctx.user.name} avanzó el proyecto "${project.name}" a ${stageLabels[newStatus]}.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("./push-notifications");
                await createAndSendNotification(jefe.id, {
                  title: `🛠️ Avance: ${project.name}`,
                  body: `Operario avanzó a ${stageLabels[newStatus]}`,
                  type: "proyecto",
                  url: "/projects",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            // Silenciar error de notificación
          }
        }

        // Notificar al comercial cuando el proyecto entra a ensamble (para coordinar instalación)
        if (newStatus === "ensamble") {
          try {
            const allUsers = await db.getAllUsers();
            const comerciales = allUsers.filter(u => u.role === "comercial");
            const clientData = await db.getClientById(project.clientId);
            
            for (const comercial of comerciales) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: comercial.id,
                title: `🔔 Coordinar Instalación`,
                body: `El proyecto "${project.name}" de ${clientData?.name || 'Cliente'} entró a ENSAMBLE. Coordina la fecha de instalación.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("./push-notifications");
                await createAndSendNotification(comercial.id, {
                  title: `🔔 Coordinar Instalación`,
                  body: `${project.name} en ENSAMBLE - Programa instalación`,
                  type: "proyecto",
                  url: "/comercial",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            console.error("Error notificando al comercial:", e);
          }
        }

        // Variable para guardar credenciales del cliente (para WhatsApp)
        let savedClientCredentials: { email: string; password: string } | null = null;
        
        // Notificar al cliente cuando el diseño está listo (pendiente_cliente)
        if (newStatus === "pendiente_cliente") {
          try {
            const clientData = await db.getClientById(project.clientId);
            
            // Si es gestión interna, no enviar notificaciones al cliente
            if (clientData && clientData.internalManagement) {
              console.log(`[Gestión Interna] Cliente ${clientData.name} - No se envían notificaciones automáticas`);
              // No hacer nada más para clientes con gestión interna
            } else if (clientData) {
              // Variables para credenciales
              let clientCredentials: { email: string; password: string } | null = null;
              let clientUserId = clientData.userId;
              
              // Si el cliente tiene email pero no tiene usuario, crear uno con contraseña temporal
              if (clientData.email && !clientData.userId) {
                try {
                  // Verificar si ya existe un usuario con ese email
                  const existingUsers = await db.getAllUsers();
                  const existingUser = existingUsers.find(u => u.email?.toLowerCase() === clientData.email?.toLowerCase());
                  
                  if (existingUser) {
                    // Asociar cliente con usuario existente
                    await db.updateClient(clientData.id, { userId: existingUser.id });
                    clientUserId = existingUser.id;
                    
                    // Generar nueva contraseña temporal para el usuario existente
                    const { generateTemporaryPassword } = await import("./password-generator");
                    const { hashPassword } = await import("./password-auth");
                    const temporaryPassword = generateTemporaryPassword();
                    const hashedPassword = await hashPassword(temporaryPassword);
                    await db.updateUserPassword(existingUser.id, hashedPassword);
                    
                    clientCredentials = {
                      email: clientData.email,
                      password: temporaryPassword
                    };
                  } else {
                    // Crear nuevo usuario con contraseña temporal
                    const { generateTemporaryPassword } = await import("./password-generator");
                    const { hashPassword } = await import("./password-auth");
                    const temporaryPassword = generateTemporaryPassword();
                    const hashedPassword = await hashPassword(temporaryPassword);
                    
                    const newUserId = await db.createUserExtended({
                      name: clientData.name,
                      email: clientData.email,
                      role: "user",
                      passwordHash: hashedPassword,
                    });
                    
                    // Asociar cliente con nuevo usuario
                    await db.updateClient(clientData.id, { userId: newUserId });
                    clientUserId = newUserId;
                    
                    clientCredentials = {
                      email: clientData.email,
                      password: temporaryPassword
                    };
                  }
                } catch (e) {
                  console.error("Error creando usuario para cliente:", e);
                }
              } else if (clientData.email && clientData.userId) {
                // El cliente ya tiene usuario, generar nueva contraseña temporal
                try {
                  const { generateTemporaryPassword } = await import("./password-generator");
                  const { hashPassword } = await import("./password-auth");
                  const temporaryPassword = generateTemporaryPassword();
                  const hashedPassword = await hashPassword(temporaryPassword);
                  await db.updateUserPassword(clientData.userId, hashedPassword);
                  
                  clientCredentials = {
                    email: clientData.email,
                    password: temporaryPassword
                  };
                } catch (e) {
                  console.error("Error actualizando contraseña del cliente:", e);
                }
              }
              
              // Si el cliente tiene userId, crear notificación en la base de datos
              if (clientUserId) {
                await db.createNotification({
                  userId: clientUserId,
                  title: "🎨 ¡Tu Diseño está Listo!",
                  body: `El diseño de tu proyecto "${project.name}" está listo para tu revisión. Ingresa al portal para verlo y aprobarlo.`,
                  type: "proyecto",
                  referenceId: project.id,
                  referenceType: "project",
                });
                
                // Intentar enviar notificación push al cliente
                try {
                  const { createAndSendNotification } = await import("./push-notifications");
                  await createAndSendNotification(clientUserId, {
                    title: "🎨 ¡Tu Diseño está Listo!",
                    body: `El diseño de "${project.name}" está listo para tu aprobación`,
                    type: "proyecto",
                    url: "/portal",
                  });
                } catch (e) {
                  // Silenciar error de push
                }
              }
              
              // Enviar email al cliente si tiene email
              if (clientData.email) {
                try {
                  const { sendEmail } = await import("./email");
                  const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
                  const portalUrl = `${baseUrl}/login`;
                  
                  // Construir sección de credenciales si existen
                  const credentialsSection = clientCredentials ? `
                          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                            <h3 style="margin-top: 0; color: #065f46;">🔐 Tus Credenciales de Acceso</h3>
                            <p style="color: #047857; margin-bottom: 10px;">Usa estos datos para ingresar al portal:</p>
                            <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
                              <strong>Correo:</strong> ${clientCredentials.email}
                            </p>
                            <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
                              <strong>Contraseña:</strong> ${clientCredentials.password}
                            </p>
                            <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                              ⚠️ Por seguridad, te recomendamos guardar esta contraseña en un lugar seguro.
                            </p>
                          </div>
                  ` : '';
                  
                  await sendEmail({
                    to: clientData.email,
                    subject: `🎨 ¡Tu Diseño está Listo! - ${project.name}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #8B5CF6, #6366F1); padding: 30px; text-align: center;">
                          <h1 style="color: white; margin: 0;">🎨 ¡Tu Diseño está Listo!</h1>
                        </div>
                        <div style="padding: 30px; background: #f9fafb;">
                          <p style="font-size: 16px; color: #374151;">Hola <strong>${clientData.name}</strong>,</p>
                          <p style="font-size: 16px; color: #374151;">
                            Nos complace informarte que el diseño de tu proyecto <strong>"${project.name}"</strong> está listo para tu revisión.
                          </p>
                          <p style="font-size: 16px; color: #374151;">
                            Por favor ingresa a tu portal para ver los renders, despieces y detalles del diseño. Una vez que lo revises, podrás aprobarlo o solicitar cambios.
                          </p>
                          ${credentialsSection}
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${portalUrl}" style="background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                              Ingresar al Portal
                            </a>
                          </div>
                          <p style="font-size: 14px; color: #6B7280;">
                            Tienes 2 días para revisar y aprobar el diseño. Si tienes alguna pregunta, no dudes en contactarnos.
                          </p>
                        </div>
                        <div style="background: #1F2937; padding: 20px; text-align: center;">
                          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                            INNOVAR Cocinas Integrales | K9 vía Cerritos a Pereira | Tel: 313 680 2025
                          </p>
                        </div>
                      </div>
                    `,
                  });
                } catch (e) {
                  // Silenciar error de email
                  console.error("Error enviando email al cliente:", e);
                }
              }
              
              // Guardar credenciales para WhatsApp
              if (clientCredentials) {
                savedClientCredentials = clientCredentials;
              }
              
              // Notificar a super_admin, admin y comercial
              const allUsers = await db.getAllUsers();
              const notifyRoles = ["super_admin", "admin", "comercial"];
              const usersToNotify = allUsers.filter(u => notifyRoles.includes(u.role));
              
              for (const user of usersToNotify) {
                await db.createNotification({
                  userId: user.id,
                  title: "🎨 Diseño Entregado al Cliente",
                  body: `El diseñador ${ctx.user.name} ha entregado el diseño del proyecto "${project.name}" al cliente ${clientData.name}.`,
                  type: "proyecto",
                  referenceId: project.id,
                  referenceType: "project",
                });
              }
            }
          } catch (e) {
            // Silenciar error de notificación
            console.error("Error notificando al cliente:", e);
          }
        }

        // Notificar al jefe de taller cuando el proyecto pasa a despiece (producción)
        if (newStatus === "despiece") {
          try {
            const allUsers = await db.getAllUsers();
            const jefesTaller = allUsers.filter(u => u.role === "jefe_taller");
            
            for (const jefe of jefesTaller) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: jefe.id,
                title: "🏭 Nuevo Proyecto en Producción",
                body: `El proyecto "${project.name}" está listo para producción. El diseñador ha completado el despiece.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("./push-notifications");
                await createAndSendNotification(jefe.id, {
                  title: "🏭 Nuevo Proyecto en Producción",
                  body: `"${project.name}" listo para producción`,
                  type: "proyecto",
                  url: "/projects",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            // Silenciar error de notificación
          }
        }

        // Obtener datos del cliente para notificación WhatsApp
        const client = await db.getClientById(project.clientId);
        let whatsappNotification = null;
        let paymentReminderWhatsApp = null;
        
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
          // Pasar credenciales si es estado pendiente_cliente
          whatsappNotification = prepareWhatsAppNotification(
            projectWithClient, 
            baseUrl,
            newStatus === "pendiente_cliente" ? savedClientCredentials || undefined : undefined
          );
          
          // Si el proyecto pasa a "entregado", enviar recordatorio del 40% pendiente
          if (newStatus === "entregado") {
            // Obtener la cotización asociada para calcular el saldo
            const quotation = project.quotationId ? await db.getQuotationById(project.quotationId) : null;
            const quotationTotal = quotation?.total ? Number(quotation.total) : 0;
            const projectAdvance = project.advanceAmount ? Number(project.advanceAmount) : 0;
            const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
            const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
            const remainingAmount = totalAmount - advanceAmount;
            
            const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
            
            // Crear notificaciones para admin/comercial sobre el pago pendiente
            const admins = await db.getAllUsers();
            const notifyRoles = ["super_admin", "admin", "comercial"];
            const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
            
            for (const user of usersToNotify) {
              await db.createNotification({
                userId: user.id,
                title: "💰 Recordatorio: Pago del 40% Pendiente",
                body: `El proyecto "${project.name}" ha sido entregado. Saldo pendiente por cobrar: ${formatCurrency(remainingAmount)}. Cliente: ${client.name}`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
            }
            
            // Generar enlace de WhatsApp para recordar al cliente el pago
            const paymentMessage = `🎉 ¡Hola ${client.name}!

Nos complace informarte que tu proyecto "${project.name}" ha sido *entregado exitosamente*.

💳 *Recordatorio de Pago Final*
• Total del proyecto: ${formatCurrency(totalAmount)}
• Adelanto pagado (60%): ${formatCurrency(advanceAmount)}
• *Saldo pendiente (40%): ${formatCurrency(remainingAmount)}*

Por favor, realiza el pago del saldo restante para completar tu proyecto.

¡Gracias por confiar en INNOVAR Cocinas Integrales! 🙏`;
            
            const cleanPhone = client.whatsappPhone?.replace(/\D/g, '') || '';
            const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
            paymentReminderWhatsApp = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(paymentMessage)}`;
          }
        }

        return { 
          success: true,
          whatsappNotification,
          paymentReminderWhatsApp,
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

        // Verificar permisos: Admin, Super Admin, Comercial, o el cliente dueño del proyecto
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
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

  // ============ PROJECT PAYMENTS ============
  projectPayments: router({
    // Registrar pago
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["adelanto", "saldo_final", "abono", "otro"]),
        amount: z.number().positive("El monto debe ser positivo"),
        paymentDate: z.date(),
        receiptUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin y super_admin pueden registrar pagos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden registrar pagos" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const paymentId = await db.createProjectPayment({
          projectId: input.projectId,
          type: input.type,
          amount: input.amount.toString(),
          paymentDate: input.paymentDate,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
          registeredBy: ctx.user.id,
        });

        // Registrar en historial del proyecto
        const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
        const typeLabels: Record<string, string> = {
          adelanto: "Adelanto (60%)",
          saldo_final: "Saldo Final (40%)",
          abono: "Abono",
          otro: "Otro",
        };

        await db.createProjectStatusHistory({
          projectId: input.projectId,
          fromStatus: project.status,
          toStatus: project.status,
          changedBy: ctx.user.id,
          notes: `💰 Pago registrado: ${typeLabels[input.type]} - ${formatCurrency(input.amount)}${input.notes ? `. Nota: ${input.notes}` : ''}`,
        });

        return { success: true, paymentId };
      }),

    // Obtener pagos de un proyecto
    getByProjectId: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Diseñador no puede ver pagos
        if (ctx.user.role === "disenador") {
          return [];
        }

        return await db.getProjectPaymentsByProjectId(input.projectId);
      }),

    // Eliminar pago
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar pagos" });
        }

        const payment = await db.getProjectPaymentById(input.id);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
        }

        // Registrar eliminación en historial
        const project = await db.getProjectById(payment.projectId);
        if (project) {
          const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
          await db.createProjectStatusHistory({
            projectId: payment.projectId,
            fromStatus: project.status,
            toStatus: project.status,
            changedBy: ctx.user.id,
            notes: `❌ Pago eliminado: ${formatCurrency(Number(payment.amount))}`,
          });
        }

        await db.deleteProjectPayment(input.id);
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
        subcategory: z.enum(["fotos_iniciales", "dibujo", "renders", "despieces", "detalles", "modelado", "corte", "enchape", "armado", "proceso_instalacion", "fotos_finales", "documento_cotizacion"]).optional(),
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

        // Obtener info de quién asignó y quién envió el último recordatorio
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        return tasksList.map(t => ({
          ...t,
          project: t.projectId ? projectMap.get(t.projectId) : null,
          assignedByUser: userMap.get(t.assignedBy),
          lastReminderSentByUser: t.lastReminderSentBy ? userMap.get(t.lastReminderSentBy) : null,
        }));
      }),

    // Obtener todas las tareas (admin, super_admin, comercial) o filtradas para jefe_taller
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const canViewAll = ["admin", "super_admin", "comercial"];
        const canViewFiltered = ["jefe_taller"];
        
        if (!canViewAll.includes(ctx.user.role) && !canViewFiltered.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver todas las tareas" });
        }

        // Optimización: ejecutar consultas en paralelo
        const [tasksList, allUsers] = await Promise.all([
          db.getAllTasks(),
          db.getAllUsers(),
        ]);
        const userMap = new Map(allUsers.map(u => [u.id, u]));
        
        // Jefe de taller solo ve tareas asignadas a él o que él asignó
        let filteredTasks = tasksList;
        if (ctx.user.role === "jefe_taller") {
          filteredTasks = tasksList.filter(t => 
            t.assignedTo === ctx.user.id || t.assignedBy === ctx.user.id
          );
        }
        
        // Obtener info de proyectos asociados
        const projectIds = Array.from(new Set(filteredTasks.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(
          projectIds.map(id => db.getProjectById(id))
        );
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));

        return filteredTasks.map(t => ({
          ...t,
          assignedToUser: userMap.get(t.assignedTo),
          assignedByUser: userMap.get(t.assignedBy),
          project: t.projectId ? projectMap.get(t.projectId) : null,
          lastReminderSentByUser: t.lastReminderSentBy ? userMap.get(t.lastReminderSentBy) : null,
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

        // Verificar permisos de eliminación
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
        const isCreator = task.assignedBy === ctx.user.id;
        const isJefeTaller = ctx.user.role === "jefe_taller";
        
        // Admin y super_admin pueden eliminar cualquier tarea
        // Otros usuarios solo pueden eliminar tareas que crearon
        if (!isAdmin && !isCreator) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar esta tarea" });
        }
        
        // Jefe de taller solo puede eliminar tareas completadas
        if (isJefeTaller && !isAdmin && task.status !== "completada") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo puedes eliminar tareas que estén completadas" 
          });
        }

        await db.deleteTask(input.id);
        return { success: true };
      }),

    // Enviar recordatorio de tarea
    sendReminder: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Solo quien creó la tarea, admin o super_admin puede enviar recordatorio
        if (task.assignedBy !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar recordatorio de esta tarea" });
        }

        // No enviar recordatorio si la tarea ya está completada
        if (task.status === "completada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede enviar recordatorio de una tarea completada" });
        }

        // Crear notificación de recordatorio
        const priorityLabels: Record<string, string> = {
          alta: "🔴 Alta",
          media: "🟡 Media",
          baja: "🟢 Baja",
        };

        let notificationBody = `${ctx.user.name || "Un administrador"} te envía un recordatorio sobre la tarea: "${task.title}"`;
        notificationBody += `\nPrioridad: ${priorityLabels[task.priority] || task.priority}`;
        notificationBody += `\nEstado actual: ${task.status === "pendiente" ? "Pendiente" : "En Progreso"}`;
        if (task.dueDate) {
          notificationBody += `\nFecha límite: ${new Date(task.dueDate).toLocaleDateString("es-CO")}`;
        }

        await db.createNotification({
          userId: task.assignedTo,
          title: "⏰ Recordatorio de tarea",
          body: notificationBody,
          type: "tarea",
          referenceId: task.id,
          referenceType: "task",
        });

        // Intentar enviar notificación push
        try {
          const { createAndSendNotification } = await import("./push-notifications");
          await createAndSendNotification(task.assignedTo, {
            title: "⏰ Recordatorio de tarea",
            body: `${ctx.user.name || "Alguien"} te recuerda: ${task.title}`,
            type: "tarea",
            url: "/tasks",
          });
        } catch (e) {
          // Silenciar error de push
        }

        // Actualizar historial de recordatorios en la tarea
        await db.updateTaskReminderHistory(input.taskId, ctx.user.id);

        return { success: true };
      }),

    // Reasignar múltiples tareas a otro usuario
    bulkReassign: protectedProcedure
      .input(z.object({
        taskIds: z.array(z.number()).min(1, "Debes seleccionar al menos una tarea"),
        newAssignedTo: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario puede reasignar tareas
        const canReassignRoles = ["super_admin", "admin", "comercial", "jefe_taller"];
        if (!canReassignRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para reasignar tareas" });
        }

        // Verificar que el nuevo asignado es válido
        const newAssignee = await db.getUserById(input.newAssignedTo);
        if (!newAssignee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Verificar que el nuevo asignado es del equipo de trabajo
        const workTeamRoles = ["super_admin", "comercial", "disenador", "jefe_taller", "operario"];
        if (!workTeamRoles.includes(newAssignee.role)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo puedes reasignar tareas a miembros del equipo de trabajo" });
        }

        // Reasignar cada tarea
        let reassignedCount = 0;
        const errors: string[] = [];

        for (const taskId of input.taskIds) {
          try {
            const task = await db.getTaskById(taskId);
            if (!task) {
              errors.push(`Tarea ${taskId} no encontrada`);
              continue;
            }

            // No reasignar tareas completadas
            if (task.status === "completada") {
              errors.push(`Tarea "${task.title}" ya está completada`);
              continue;
            }

            // Actualizar la tarea
            await db.updateTask(taskId, {
              assignedTo: input.newAssignedTo,
            });

            reassignedCount++;

            // Crear notificación para el nuevo asignado
            await db.createNotification({
              userId: input.newAssignedTo,
              title: "📝 Nueva tarea asignada",
              body: `${ctx.user.name || "Un administrador"} te ha reasignado la tarea: "${task.title}"`,
              type: "tarea",
              referenceId: taskId,
              referenceType: "task",
            });

            // Intentar enviar notificación push
            try {
              const { createAndSendNotification } = await import("./push-notifications");
              await createAndSendNotification(input.newAssignedTo, {
                title: "📝 Nueva tarea asignada",
                body: `${ctx.user.name || "Alguien"} te ha reasignado: ${task.title}`,
                type: "tarea",
                url: "/tasks",
              });
            } catch (e) {
              // Silenciar error de push
            }
          } catch (e) {
            errors.push(`Error al reasignar tarea ${taskId}`);
          }
        }

        return {
          success: reassignedCount > 0,
          reassignedCount,
          totalRequested: input.taskIds.length,
          errors: errors.length > 0 ? errors : undefined,
          newAssigneeName: newAssignee.name,
        };
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
        let buffer = Buffer.from(base64Data, "base64");

        // Validar tamaño máximo (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (buffer.length > maxSize) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "El archivo es demasiado grande. Máximo 10MB." 
          });
        }

        // Comprimir imagen si es una imagen
        let finalContentType = input.contentType;
        if (input.contentType.startsWith('image/')) {
          try {
            const { compressImage, generateThumbnail } = await import('./image-utils');
            const compressed = await compressImage(buffer, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 80,
              format: 'jpeg'
            });
            buffer = Buffer.from(compressed.buffer);
            finalContentType = compressed.mimeType;
            
            // Generar thumbnail para vistas previas
            const thumbnail = await generateThumbnail(buffer, 300);
            const thumbKey = fileKey.replace(/\.[^.]+$/, '-thumb.jpg');
            await storagePut(thumbKey, thumbnail.buffer, thumbnail.mimeType);
          } catch (compressionError) {
            // Si falla la compresión, continuar con la imagen original
            console.warn('Error comprimiendo imagen, usando original:', compressionError);
          }
        }

        try {
          const { url } = await storagePut(fileKey, buffer, finalContentType);
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
            let buffer = Buffer.from(base64Data, "base64");

            // Validar tamaño
            const maxSize = 10 * 1024 * 1024;
            if (buffer.length > maxSize) {
              errors.push({ fileName: file.fileName, error: "Archivo muy grande (máx 10MB)" });
              continue;
            }

            // Comprimir imagen
            let finalContentType = file.contentType;
            try {
              const { compressImage, generateThumbnail } = await import('./image-utils');
              const compressed = await compressImage(buffer, {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 80,
                format: 'jpeg'
              });
              buffer = Buffer.from(compressed.buffer);
              finalContentType = compressed.mimeType;
              
              // Generar thumbnail
              const thumbnail = await generateThumbnail(buffer, 300);
              const thumbKey = fileKey.replace(/\.[^.]+$/, '-thumb.jpg');
              await storagePut(thumbKey, thumbnail.buffer, thumbnail.mimeType);
            } catch (compressionError) {
              console.warn('Error comprimiendo imagen, usando original:', compressionError);
            }

            const { url } = await storagePut(fileKey, buffer, finalContentType);
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
        price: z.number().optional(),
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
        price: z.number().optional(),
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

  // ============ GALERÍA PÚBLICA PARA CLIENTES ============
  publicGallery: router({
    // Obtener fotos del proyecto para compartir con clientes (sin autenticación)
    getProjectPhotos: publicProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["modelado", "renders"]).optional(),
      }))
      .query(async ({ input }) => {
        // Obtener proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Obtener cliente
        const client = project.clientId ? await db.getClientById(project.clientId) : null;

        // Obtener fotos según el tipo solicitado
        const allPhotos = await db.getProjectPhotosByProjectId(input.projectId);
        let photos = allPhotos;
        
        if (input.type) {
          photos = allPhotos.filter(p => p.subcategory === input.type);
        } else {
          // Por defecto, mostrar modelado y renders
          photos = allPhotos.filter(p => p.subcategory === "modelado" || p.subcategory === "renders");
        }

        return {
          project: {
            id: project.id,
            name: project.name,
            workType: project.workType,
          },
          client: client ? {
            name: client.name,
          } : null,
          photos: photos.map(p => ({
            id: p.id,
            photoUrl: p.photoUrl,
            subcategory: p.subcategory,
            description: p.description,
            createdAt: p.createdAt,
          })),
          totalModelado: allPhotos.filter(p => p.subcategory === "modelado").length,
          totalRenders: allPhotos.filter(p => p.subcategory === "renders").length,
        };
      }),

    // Aprobar diseño desde la galería pública (sin autenticación)
    approveDesign: publicProcedure
      .input(z.object({
        projectId: z.number(),
        clientName: z.string().min(1, "El nombre es requerido"),
        type: z.enum(["modelado", "renders"]),
      }))
      .mutation(async ({ input }) => {
        // Obtener proyecto con cliente
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const now = new Date();
        
        // Guardar la aprobación según el tipo
        if (input.type === "modelado") {
          await db.updateProject(input.projectId, {
            modeladoApprovedAt: now,
            modeladoApprovedBy: input.clientName,
          });
        } else {
          // Aprobación de renders = aprobación final
          await db.updateProject(input.projectId, {
            rendersApprovedAt: now,
            rendersApprovedBy: input.clientName,
            status: "aprobacion_final",
          });
        }

        // Obtener datos del cliente para el mensaje
        const client = await db.getClientById(project.clientId);
        
        // Crear tarea de notificación para el equipo
        const tipoTexto = input.type === "modelado" ? "Modelado 3D" : "Renders";
        const taskTitle = `✅ Cliente aprobó ${tipoTexto}: ${project.name}`;
        const taskDescription = `El cliente ${input.clientName} ha aprobado el ${tipoTexto.toLowerCase()} del proyecto "${project.name}" desde la galería pública.\n\nFecha: ${now.toLocaleString('es-CO')}\n\n${input.type === "modelado" ? "Siguiente paso: Preparar y enviar los renders finales." : "Siguiente paso: Iniciar producción del proyecto."}`;
        
        // Notificar al diseñador asignado o al admin
        const assignTo = project.designerId || (await db.getUsersByRole('admin'))[0]?.id || (await db.getUsersByRole('super_admin'))[0]?.id;
        
        if (assignTo) {
          await db.createTask({
            projectId: input.projectId,
            title: taskTitle,
            description: taskDescription,
            priority: "alta",
            assignedTo: assignTo,
            assignedBy: assignTo, // Auto-asignada por el sistema
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
          });
        }

        // Generar enlace de WhatsApp para notificar al equipo
        const teamWhatsAppLink = generateTeamWhatsAppLink("approval", {
          clientName: input.clientName,
          projectName: project.name,
          projectId: input.projectId,
          designType: input.type,
        });

        // Enviar notificaciones push al equipo (diseñador, admin, comercial)
        try {
          const { createAndSendNotification, sendPushToRole } = await import("./push-notifications");
          const tipoTexto = input.type === "modelado" ? "Modelado 3D" : "Renders";
          
          // Notificar al diseñador asignado
          if (project.designerId) {
            await createAndSendNotification(project.designerId, {
              title: `✅ Cliente aprobó ${tipoTexto}`,
              body: `${input.clientName} aprobó el ${tipoTexto.toLowerCase()} de "${project.name}"`,
              type: "proyecto",
              referenceId: input.projectId,
              referenceType: "project",
              url: `/projects/${input.projectId}`,
            });
          }
          
          // Notificar a todos los admins y comerciales
          const admins = await db.getUsersByRole('admin');
          const superAdmins = await db.getUsersByRole('super_admin');
          const comerciales = await db.getUsersByRole('comercial');
          const allTeam = [...admins, ...superAdmins, ...comerciales];
          
          for (const user of allTeam) {
            // Evitar duplicar notificación al diseñador si también es admin
            if (user.id !== project.designerId) {
              await createAndSendNotification(user.id, {
                title: `✅ Cliente aprobó ${tipoTexto}`,
                body: `${input.clientName} aprobó el ${tipoTexto.toLowerCase()} de "${project.name}"`,
                type: "proyecto",
                referenceId: input.projectId,
                referenceType: "project",
                url: `/projects/${input.projectId}`,
              });
            }
          }
        } catch (pushError) {
          console.error("Error enviando notificaciones push:", pushError);
        }

        return { 
          success: true, 
          message: input.type === "modelado" 
            ? "¡Gracias! Hemos registrado su aprobación del modelado. Pronto le enviaremos los renders finales."
            : "¡Gracias! Su proyecto ha sido aprobado. Pronto nos pondremos en contacto para coordinar los siguientes pasos.",
          teamWhatsAppLink, // Enlace para notificar al equipo por WhatsApp
        };
      }),

    // Solicitar cambios desde la galería pública (sin autenticación)
    requestChanges: publicProcedure
      .input(z.object({
        projectId: z.number(),
        clientName: z.string().min(1, "El nombre es requerido"),
        type: z.enum(["modelado", "renders"]),
        changes: z.string().min(10, "Por favor describe los cambios que necesitas (mínimo 10 caracteres)"),
      }))
      .mutation(async ({ input }) => {
        // Obtener proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Actualizar estado del proyecto si está pendiente de cliente
        if (project.status === "pendiente_cliente") {
          await db.updateProject(input.projectId, {
            status: "en_diseno",
          });
        }

        // Crear tarea de notificación para el equipo
        const tipoTexto = input.type === "modelado" ? "Modelado 3D" : "Renders";
        const taskTitle = `📝 Cliente solicitó cambios en ${tipoTexto}: ${project.name}`;
        const taskDescription = `El cliente ${input.clientName} ha solicitado cambios en el ${tipoTexto.toLowerCase()} del proyecto "${project.name}".\n\n**Cambios solicitados:**\n${input.changes}\n\nFecha: ${new Date().toLocaleString('es-CO')}`;
        
        // Notificar al diseñador asignado o al admin
        const assignTo = project.designerId || (await db.getUsersByRole('admin'))[0]?.id || (await db.getUsersByRole('super_admin'))[0]?.id;
        
        if (assignTo) {
          await db.createTask({
            projectId: input.projectId,
            title: taskTitle,
            description: taskDescription,
            priority: "alta",
            assignedTo: assignTo,
            assignedBy: assignTo, // Auto-asignada por el sistema
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
          });
        }

        // Generar enlace de WhatsApp para notificar al equipo
        const teamWhatsAppLink = generateTeamWhatsAppLink("changes", {
          clientName: input.clientName,
          projectName: project.name,
          projectId: input.projectId,
          designType: input.type,
          changes: input.changes,
        });

        // Enviar notificaciones push al equipo (diseñador, admin, comercial)
        try {
          const { createAndSendNotification } = await import("./push-notifications");
          const tipoTexto = input.type === "modelado" ? "Modelado 3D" : "Renders";
          const cambiosCortos = input.changes.length > 50 ? input.changes.substring(0, 50) + "..." : input.changes;
          
          // Notificar al diseñador asignado
          if (project.designerId) {
            await createAndSendNotification(project.designerId, {
              title: `📝 Cambios solicitados en ${tipoTexto}`,
              body: `${input.clientName} solicitó cambios: "${cambiosCortos}"`,
              type: "proyecto",
              referenceId: input.projectId,
              referenceType: "project",
              url: `/projects/${input.projectId}`,
            });
          }
          
          // Notificar a todos los admins y comerciales
          const admins = await db.getUsersByRole('admin');
          const superAdmins = await db.getUsersByRole('super_admin');
          const comerciales = await db.getUsersByRole('comercial');
          const allTeam = [...admins, ...superAdmins, ...comerciales];
          
          for (const user of allTeam) {
            // Evitar duplicar notificación al diseñador si también es admin
            if (user.id !== project.designerId) {
              await createAndSendNotification(user.id, {
                title: `📝 Cambios solicitados en ${tipoTexto}`,
                body: `${input.clientName} solicitó cambios en "${project.name}"`,
                type: "proyecto",
                referenceId: input.projectId,
                referenceType: "project",
                url: `/projects/${input.projectId}`,
              });
            }
          }
        } catch (pushError) {
          console.error("Error enviando notificaciones push:", pushError);
        }

        return { 
          success: true, 
          message: "¡Gracias! Hemos registrado sus comentarios. Nuestro equipo de diseño revisará los cambios solicitados y se pondrá en contacto pronto.",
          teamWhatsAppLink, // Enlace para notificar al equipo por WhatsApp
        };
      }),

    // Obtener estado de aprobación del proyecto
    getApprovalStatus: publicProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          return { modeladoApproved: false, rendersApproved: false };
        }
        
        return {
          modeladoApproved: !!project.modeladoApprovedAt,
          modeladoApprovedAt: project.modeladoApprovedAt,
          modeladoApprovedBy: project.modeladoApprovedBy,
          rendersApproved: !!project.rendersApprovedAt,
          rendersApprovedAt: project.rendersApprovedAt,
          rendersApprovedBy: project.rendersApprovedBy,
        };
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

  // ============ PRICING CONFIG ============
  pricing: router({
    // Obtener todos los precios configurables
    getAll: protectedProcedure.query(async ({ ctx }) => {
      // Solo super_admin puede ver la configuración de precios
      if (ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de precios" });
      }
      return await db.getAllPricingConfig();
    }),

    // Obtener precios por categoría
    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver la configuración de precios" });
        }
        return await db.getPricingByCategory(input.category);
      }),

    // Obtener precio por código (para uso interno en cálculos)
    getByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const pricing = await db.getPricingByCode(input.code);
        return pricing ? { value: Number(pricing.value), unit: pricing.unit } : null;
      }),

    // Obtener todos los precios para cálculos (público para el sistema de cotizaciones)
    getAllForCalculations: publicProcedure.query(async () => {
      const allPricing = await db.getAllPricingConfig();
      // Convertir a un objeto indexado por código para fácil acceso
      const pricingMap: Record<string, { value: number; unit: string | null }> = {};
      for (const p of allPricing) {
        pricingMap[p.code] = { value: Number(p.value), unit: p.unit };
      }
      return pricingMap;
    }),

    // Actualizar un precio
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede modificar precios" });
        }
        await db.updatePricingConfig(input.id, input.value, ctx.user.id, input.reason);
        return { success: true };
      }),

    // Crear nuevo precio
    create: protectedProcedure
      .input(z.object({
        category: z.string(),
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        value: z.number().min(0),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede crear precios" });
        }
        const id = await db.createPricingConfig(input);
        return { success: true, id };
      }),

    // Obtener historial de cambios de un precio
    getHistory: protectedProcedure
      .input(z.object({ pricingConfigId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getPricingHistory(input.pricingConfigId);
      }),

    // Obtener historial general de cambios
    getAllHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el historial de precios" });
        }
        return await db.getAllPricingHistory(input.limit || 50);
      }),

    // Eliminar precio (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super administrador puede eliminar precios" });
        }
        await db.deletePricingConfig(input.id);
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

  // Operario puede: corte -> enchape -> ensamble -> listo_instalacion
  // Ayuda al jefe de taller con el avance de producción
  if (role === "operario") {
    const operarioFlow = ["corte", "enchape", "ensamble", "listo_instalacion"];
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
