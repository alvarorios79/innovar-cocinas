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
import { ENV } from "../_core/env";


export const userManagementRouter = router({
    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden ver usuarios" });
        }
        return await db.getAllUsers();
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        role: z.enum(["user", "admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario", "medidor"]),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin, admin y comercial pueden crear usuarios
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden crear usuarios" });
        }

        // Solo super_admin puede crear otros admins o super_admins
        if ((input.role === "admin" || input.role === "super_admin") && ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden crear administradores" 
          });
        }

        // Solo super_admin, admin y comercial pueden crear usuarios con contraseña
        if (input.password && ctx.user.role !== "super_admin" && ctx.user.role !== "admin" && ctx.user.role !== "comercial") {
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
          name: sanitizeText(input.name),
          email: sanitizeEmail(input.email),
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden cambiar roles" });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Proteger al super_admin principal (lalismanqie@...)
        if (targetUser.email?.toLowerCase().includes('lalismanqie@') && input.newRole !== "super_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No se puede modificar el rol del super_admin principal"
          });
        }

        // Proteger al owner (super_admin principal) de ser degradado por nadie
        if (targetUser.openId === ENV.ownerOpenId && input.newRole !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "El rol del propietario del sistema no puede ser modificado" 
          });
        }

        // Proteger al owner de ser eliminado del rol super_admin incluso por sí mismo
        if (targetUser.role === "super_admin" && targetUser.openId === ENV.ownerOpenId && input.newRole !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "El super administrador principal no puede ser degradado" 
          });
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
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

    updatePhone: protectedProcedure
      .input(z.object({
        userId: z.number(),
        phone: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede actualizar teléfonos del equipo
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo super administradores pueden gestionar teléfonos del equipo" 
          });
        }

        // Obtener el usuario objetivo
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find(u => u.id === input.userId);
        
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Actualizar teléfono
        await db.updateUserPhone(input.userId, input.phone);

        return { success: true };
      }),
});

