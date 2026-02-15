import { validatePhotoUploadPermission } from "./helpers";
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


export const uploadRouter = router({
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
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("../storage");
        
        // Validar permisos si es para un proyecto
        if (input.stage) {
          if (!validatePhotoUploadPermission(ctx.user.role, input.stage, input.category)) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "No tienes permisos para subir fotos en esta categoría" 
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
            const { compressImage, generateThumbnail } = await import('../image-utils');
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
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("../storage");
        
        // Validar permisos
        if (input.stage) {
          if (!validatePhotoUploadPermission(ctx.user.role, input.stage, input.category)) {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "No tienes permisos para subir fotos en esta categoría" 
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
              const { compressImage, generateThumbnail } = await import('../image-utils');
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
});

