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


export const authRouter = router({
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
        const { sdk } = await import("../_core/sdk");
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

        // Crear usuario y cliente en transacción para garantizar integridad
        const userId = await withTransaction(async (tx) => {
          const uid = await db.createUserExtended({
            name: sanitizeText(input.name),
            email: sanitizeEmail(input.email),
            role: "user",
            password: passwordHash,
          });

          await db.createClient({
            userId: uid,
            name: sanitizeText(input.name),
            email: sanitizeEmail(input.email),
            whatsappPhone: sanitizePhone(input.whatsappPhone),
          });

          return uid;
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
        const { sdk } = await import("../_core/sdk");
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
        const { sdk } = await import("../_core/sdk");
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "" });
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { 
          success: true,
          message: "Contraseña actualizada exitosamente" 
        };
      }),
});

