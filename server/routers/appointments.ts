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


export const appointmentsRouter = router({
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
          scheduledDate = new Date(dateStr).toISOString() as any;
        }

        const appointmentId = await db.createAppointment({
          clientId: input.clientId,
          scheduledDate: scheduledDate as any,
          notes: input.notes ? sanitizeText(input.notes) : undefined,
        });

        // Insertar los tipos de trabajo en la tabla appointmentWorkTypes
        for (const workType of input.workTypes) {
          await db.createAppointmentWorkType({
            appointmentId,
            workType,
          });
        }

        // Auto-crear visita técnica vinculada al cliente
        // La cita ES la visita técnica: queda pendiente de asignar medidor
        try {
          const clientForVisit = await db.getClientById(input.clientId);
          if (clientForVisit) {
            // Buscar un super_admin o admin como createdBy de sistema
            const [admins, superAdmins] = await Promise.all([
              db.getUsersByRole("admin"),
              db.getUsersByRole("super_admin"),
            ]);
            const systemUser = [...superAdmins, ...admins][0];
            if (systemUser) {
              const visitNotes = input.notes
                ? `Cita agendada online. ${sanitizeText(input.notes)}`
                : "Cita agendada desde portal público. Pendiente de asignar medidor.";

              // Si hay varios tipos de trabajo, guardarlos todos en measurements._workTypes
              const visitMeasurements = input.workTypes.length > 1
                ? { _workTypes: input.workTypes }
                : undefined;

              await db.createTechnicalVisit({
                clientId:      input.clientId,
                clientName:    clientForVisit.name,
                clientPhone:   clientForVisit.whatsappPhone ?? undefined,
                clientAddress: clientForVisit.address ?? undefined,
                workType:      input.workTypes[0] as any,
                measurements:  visitMeasurements,
                notes:         visitNotes,
                scheduledDate: scheduledDate ? new Date(scheduledDate as any).toISOString() : undefined,
                createdBy:     systemUser.id,
                // assignedTo = null: pendiente de asignar por admin/comercial
              });

              // Notificar a admin y comerciales que hay visita pendiente de asignar
              const { createAndSendNotification } = await import("../push-notifications");
              const comerciales = await db.getUsersByRole("comercial");
              const recipients = [...superAdmins, ...admins, ...comerciales];
              for (const recipient of recipients) {
                await createAndSendNotification(recipient.id, {
                  title: `📅 Nueva visita técnica pendiente`,
                  body:  `${clientForVisit.name} agendó cita. Asigna un medidor en Visitas Técnicas.`,
                  type:  "proyecto",
                  url:   `/visitas-tecnicas`,
                });
              }
            }
          }
        } catch (visitErr) {
          console.error("[appointments.create] Error creando visita técnica automática:", visitErr);
          // No bloquear la cita si falla la visita
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
                const { generateTemporaryPassword } = await import("../password-generator");
                const { hashPassword } = await import("../password-auth");
                
                // Generar contraseña temporal
                const temporaryPassword = generateTemporaryPassword();
                const hashedPassword = await hashPassword(temporaryPassword);
                
                // Crear usuario
                const userId = await db.createUserExtended({
                  name: client.name,
                  email: client.email,
                  role: "user",
                  password: hashedPassword,
                });
                
                // Asociar cliente con usuario
                await db.updateClient(client.id, { userId });
                
                // Enviar email de bienvenida con credenciales
                try {
                  const { sendEmail } = await import("../email");
                  const { welcomeEmailTemplate } = await import("../email-templates");
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
              const { sendEmail } = await import("../email");
              const { appointmentConfirmedEmailTemplate } = await import("../email-templates");
              const emailData = appointmentConfirmedEmailTemplate({
                clientName: client.name,
                appointmentDate: scheduledDate,
                workTypes: input.workTypes,
                notes: input.notes ? sanitizeText(input.notes) : undefined,
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
            notes: input.notes ? sanitizeText(input.notes) : undefined,
          });

          // Notificación en campanilla para el cliente (si tiene userId)
          const updatedClient = await db.getClientById(client.id);
          if (updatedClient?.userId && scheduledDate) {
            try {
              const dateFormatted = scheduledDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' });
              const timeFormatted = scheduledDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
              await db.createNotification({
                userId: updatedClient.userId,
                type: 'cita',
                title: '📅 ¡Cita Agendada!',
                body: `Tu cita ha sido agendada para el ${dateFormatted} a las ${timeFormatted}. Tipo: ${workTypesText}.`,
                referenceId: appointmentId,
              });
            } catch (notifError) {
              console.error('[Cita] Error al crear notificación en campanilla:', notifError);
            }
          }

          // Enviar WhatsApp automático al cliente si está configurado
          let whatsappAutoSent = false;
          if (whatsappCloud.isWhatsAppCloudConfigured() && client.whatsappPhone && scheduledDate) {
            try {
              const result = await whatsappCloud.sendAppointmentConfirmation(
                client.whatsappPhone,
                client.name,
                scheduledDate,
                input.workTypes[0] || "cocina"
              );
              whatsappAutoSent = result.success;
              if (!result.success) {
                console.error("[WhatsApp Cloud] Error enviando confirmación:", result.error);
              }
            } catch (error) {
              console.error("[WhatsApp Cloud] Error:", error);
            }
          }
          
          return { id: appointmentId, success: true, whatsappLink, whatsappAutoSent };
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
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

        const newDate = new Date(input.scheduledDate);
        await db.updateAppointment(input.id, {
          scheduledDate: newDate.toISOString(),
        });

        // Notificación en campanilla para el cliente
        const dateFormatted = newDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' });
        const timeFormatted = newDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
        if (client.userId) {
          try {
            await db.createNotification({
              userId: client.userId,
              type: 'cita',
              title: '🔄 Cita Reagendada',
              body: `Tu cita ha sido reagendada para el ${dateFormatted} a las ${timeFormatted}.`,
              referenceId: input.id,
            });
          } catch (notifError) {
            console.error('[Reagendar] Error al crear notificación cliente:', notifError);
          }
        }

        // Notificación en campanilla + email + WhatsApp para el equipo (admin, comercial, super_admin)
        try {
          const [admins, comerciales, superAdmins] = await Promise.all([
            db.getUsersByRole('admin'),
            db.getUsersByRole('comercial'),
            db.getUsersByRole('super_admin'),
          ]);
          const teamUsers = [...admins, ...comerciales, ...superAdmins];
          // Obtener tipos de trabajo de la cita
          let tipoTrabajo = 'No especificado';
          try {
            const { appointmentWorkTypes } = await import('../../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            const { getDb } = await import('../db');
            const dbConn = await getDb();
            if (dbConn) {
              const workTypes = await dbConn.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, input.id));
              if (workTypes.length > 0) {
                const labels: Record<string, string> = { cocina: 'Cocina Integral', closet: 'Closet', puertas: 'Puertas', centro_tv: 'Centro de TV' };
                tipoTrabajo = workTypes.map(wt => labels[wt.workType] || wt.workType).join(', ');
              }
            }
          } catch (e) { /* ignorar */ }

          for (const user of teamUsers) {
            // Campanilla
            await db.createNotification({
              userId: user.id,
              type: 'cita',
              title: '🔄 Cliente Reagendó Cita',
              body: `${client.name} reagendó su cita para el ${dateFormatted} a las ${timeFormatted}.`,
              referenceId: input.id,
            });

            // Email al equipo
            if (user.email) {
              try {
                const { sendEmail, generateEmailHTML } = await import('../email');
                const emailHtml = generateEmailHTML(`
                  <h2 style="color: #2a9d8f;">🔄 Cita Reagendada por Cliente</h2>
                  <p>El cliente <strong>${client.name}</strong> ha reagendado su cita.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cliente</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${client.name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">WhatsApp</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${client.whatsappPhone}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tipo de Trabajo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${tipoTrabajo}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nueva Fecha</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dateFormatted}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Nueva Hora</td><td style="padding: 8px;">${timeFormatted}</td></tr>
                  </table>
                  <p style="color: #666;">Revisa el calendario de citas para más detalles.</p>
                `, 'Cita Reagendada por Cliente');
                await sendEmail({
                  to: user.email,
                  subject: `🔄 ${client.name} reagendó su cita - ${dateFormatted}`,
                  html: emailHtml,
                });
              } catch (emailErr) {
                console.error(`[Reagendar] Error email a ${user.email}:`, emailErr);
              }
            }

            // WhatsApp al equipo
            if (user.phone) {
              try {
                const whatsappCloud = await import('../whatsapp-cloud');
                const mensaje = `🔄 *Cita Reagendada por Cliente*\n\n` +
                  `El cliente *${client.name}* reagendó su cita.\n\n` +
                  `📅 *Nueva fecha:* ${dateFormatted}\n` +
                  `⏰ *Nueva hora:* ${timeFormatted}\n` +
                  `🛠️ *Tipo:* ${tipoTrabajo}\n` +
                  `📱 *WhatsApp cliente:* ${client.whatsappPhone}`;
                await whatsappCloud.sendTextMessage(user.phone, mensaje);
              } catch (waErr) {
                console.error(`[Reagendar] Error WhatsApp a ${user.phone}:`, waErr);
              }
            }
          }
        } catch (notifError) {
          console.error('[Reagendar] Error al notificar equipo:', notifError);
        }

        return { success: true };
      }),

    cancelByClient: protectedProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
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

        if (appointment.status === 'cancelada') {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La cita ya está cancelada" });
        }

        if (appointment.status === 'completada') {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede cancelar una cita completada" });
        }

        // Cambiar estado a cancelada (libera el horario automáticamente)
        await db.updateAppointment(input.id, {
          status: 'cancelada',
          notes: input.reason ? `Cancelada por cliente: ${sanitizeText(input.reason)}` : 'Cancelada por el cliente desde el portal',
        });

        const scheduledDate = appointment.scheduledDate ? new Date(appointment.scheduledDate) : new Date();
        const dateFormatted = scheduledDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' });
        const timeFormatted = scheduledDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });

        // Obtener tipo de trabajo
        let tipoTrabajo = 'No especificado';
        try {
          const { appointmentWorkTypes } = await import('../../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const { getDb } = await import('../db');
          const dbConn = await getDb();
          if (dbConn) {
            const workTypes = await dbConn.select().from(appointmentWorkTypes).where(eq(appointmentWorkTypes.appointmentId, input.id));
            if (workTypes.length > 0) {
              const labels: Record<string, string> = { cocina: 'Cocina Integral', closet: 'Closet', puertas: 'Puertas', centro_tv: 'Centro de TV' };
              tipoTrabajo = workTypes.map(wt => labels[wt.workType] || wt.workType).join(', ');
            }
          }
        } catch (e) { /* ignorar */ }

        const motivoCancelacion = input.reason || 'No especificado';

        // Notificación en campanilla para el cliente
        if (client.userId) {
          try {
            await db.createNotification({
              userId: client.userId,
              type: 'cita',
              title: '❌ Cita Cancelada',
              body: `Tu cita del ${dateFormatted} a las ${timeFormatted} ha sido cancelada. El horario queda disponible para reagendar.`,
              referenceId: input.id,
            });
          } catch (notifError) {
            console.error('[CancelarCita] Error notificación cliente:', notifError);
          }
        }

        // Notificaciones al equipo (campanilla + email + WhatsApp)
        try {
          const [admins, comerciales, superAdmins] = await Promise.all([
            db.getUsersByRole('admin'),
            db.getUsersByRole('comercial'),
            db.getUsersByRole('super_admin'),
          ]);
          const teamUsers = [...admins, ...comerciales, ...superAdmins];

          for (const user of teamUsers) {
            // Campanilla
            await db.createNotification({
              userId: user.id,
              type: 'cita',
              title: '❌ Cliente Canceló Cita',
              body: `${client.name} canceló su cita del ${dateFormatted} a las ${timeFormatted}. Motivo: ${motivoCancelacion}. El horario quedó libre.`,
              referenceId: input.id,
            });

            // Email al equipo
            if (user.email) {
              try {
                const { sendEmail, generateEmailHTML } = await import('../email');
                const emailHtml = generateEmailHTML(`
                  <h2 style="color: #e74c3c;">❌ Cita Cancelada por Cliente</h2>
                  <p>El cliente <strong>${client.name}</strong> ha cancelado su cita.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cliente</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${client.name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">WhatsApp</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${client.whatsappPhone}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tipo de Trabajo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${tipoTrabajo}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha Cancelada</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dateFormatted}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Hora</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${timeFormatted}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Motivo</td><td style="padding: 8px;">${motivoCancelacion}</td></tr>
                  </table>
                  <p style="color: #27ae60; font-weight: bold;">✅ El horario ha quedado libre para otro cliente.</p>
                `, 'Cita Cancelada por Cliente');
                await sendEmail({
                  to: user.email,
                  subject: `❌ ${client.name} canceló su cita - ${dateFormatted}`,
                  html: emailHtml,
                });
              } catch (emailErr) {
                console.error(`[CancelarCita] Error email a ${user.email}:`, emailErr);
              }
            }

            // WhatsApp al equipo
            if (user.phone) {
              try {
                const whatsappCloud = await import('../whatsapp-cloud');
                const mensaje = `❌ *Cita Cancelada por Cliente*\n\n` +
                  `El cliente *${client.name}* canceló su cita.\n\n` +
                  `📅 *Fecha:* ${dateFormatted}\n` +
                  `⏰ *Hora:* ${timeFormatted}\n` +
                  `🛠️ *Tipo:* ${tipoTrabajo}\n` +
                  `📝 *Motivo:* ${motivoCancelacion}\n` +
                  `📱 *WhatsApp cliente:* ${client.whatsappPhone}\n\n` +
                  `✅ El horario ha quedado libre para otro cliente.`;
                await whatsappCloud.sendTextMessage(user.phone, mensaje);
              } catch (waErr) {
                console.error(`[CancelarCita] Error WhatsApp a ${user.phone}:`, waErr);
              }
            }
          }
        } catch (notifError) {
          console.error('[CancelarCita] Error al notificar equipo:', notifError);
        }

        return { success: true };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
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

    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await db.getAllAppointmentsPaginated({
          page: input?.page,
          limit: input?.limit,
          status: input?.status,
        });
        const allClients = await db.getAllClients();
        const clientMap = new Map(allClients.map(c => [c.id, c]));
        return {
          ...result,
          data: result.data.map(apt => ({ ...apt, client: clientMap.get(apt.clientId) })),
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar citas" });
        }
        
        await db.deleteAppointment(input.id);
        return { success: true };
      }),

    // Endpoint para que admin/super_admin editen fecha y hora de citas
    updateDate: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledDateStr: z.string(), // "YYYY-MM-DD"
        scheduledTimeStr: z.string(), // "HH:MM"
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar fechas de citas" });
        }
        
        // Validar disponibilidad del nuevo horario
        const isAvailable = await isTimeSlotAvailable(input.scheduledDateStr, input.scheduledTimeStr, input.id);
        if (!isAvailable) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este horario ya está ocupado. Por favor selecciona otro horario.",
          });
        }
        
        // Crear la fecha en zona horaria de Colombia (UTC-5)
        const [year, month, day] = input.scheduledDateStr.split('-').map(Number);
        const [hours, minutes] = input.scheduledTimeStr.split(':').map(Number);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`;
        const scheduledDate = new Date(dateStr);
        
        await db.updateAppointment(input.id, { scheduledDate: scheduledDate.toISOString() });

        // Notificación en campanilla para el cliente
        try {
          const appointment = await db.getAppointmentById(input.id);
          if (appointment) {
            const client = await db.getClientById(appointment.clientId);
            if (client?.userId) {
              const dateFormatted = scheduledDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' });
              const timeFormatted = scheduledDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
              await db.createNotification({
                userId: client.userId,
                type: 'cita',
                title: '🔄 Cita Reagendada',
                body: `Tu cita ha sido reagendada para el ${dateFormatted} a las ${timeFormatted}.`,
                referenceId: input.id,
              });
            }
          }
        } catch (notifError) {
          console.error('[UpdateDate] Error al crear notificación en campanilla:', notifError);
        }

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
    // @ts-ignore
          const hours = apt.scheduledDate.getHours().toString().padStart(2, '0');
    // @ts-ignore
          const minutes = apt.scheduledDate.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }).filter(Boolean) as string[];
      }),
});

export const availabilityRouter = router({
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
});

