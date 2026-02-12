import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as whatsapp from "../whatsapp";
import { TRPCError } from "@trpc/server";
import { isTimeSlotAvailable } from "../availability";

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
                passwordHash: hashedPassword,
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
      scheduledDateStr: z.string(), // "YYYY-MM-DD"
      scheduledTimeStr: z.string(), // "HH:MM"
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

      // Validar disponibilidad del nuevo horario
      const isAvailable = await isTimeSlotAvailable(input.scheduledDateStr, input.scheduledTimeStr, input.id);
      if (!isAvailable) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este horario no está disponible. Por favor selecciona otro horario.",
        });
      }

      // Crear la fecha para guardar en BD en zona horaria de Colombia (UTC-5)
      const [year, month, day] = input.scheduledDateStr.split('-').map(Number);
      const [hours, minutes] = input.scheduledTimeStr.split(':').map(Number);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`;
      const scheduledDate = new Date(dateStr);

      await db.updateAppointment(input.id, {
        scheduledDate,
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
});
