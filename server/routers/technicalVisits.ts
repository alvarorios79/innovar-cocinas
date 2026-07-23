import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  technicalVisits,
  technicalVisitPhotos,
  technicalVisitPdfs,
  appointments,
  clients,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

// Roles que pueden ver todos los levantamientos
const MANAGER_ROLES = ["super_admin", "admin", "comercial"];
// Roles que pueden ver levantamientos vinculados a proyectos (diseñador)
const PROJECT_ROLES = [...MANAGER_ROLES, "disenador"];

function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos para esta acción" });
  }
}

// ── Comprimir PDF con ghostscript (fallback: original) ──────────────────────
async function compressPdfBuffer(inputBuffer: Buffer): Promise<{ buffer: Buffer; savedPercent: number }> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `tv_input_${id}.pdf`);
  const outputPath = join(tmpdir(), `tv_output_${id}.pdf`);

  try {
    await writeFile(inputPath, inputBuffer);

    // ghostscript: /ebook = 150 DPI — buena calidad para planos GoodNotes
    await execAsync(
      `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook ` +
      `-dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`
    );

    const outputBuffer = await readFile(outputPath);
    const originalSize = inputBuffer.length;
    const compressedSize = outputBuffer.length;
    const savedPercent = compressedSize < originalSize
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

    return { buffer: outputBuffer, savedPercent };
  } catch {
    // Si ghostscript falla, retornar el original sin error
    return { buffer: inputBuffer, savedPercent: 0 };
  } finally {
    // Limpiar archivos temporales
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export const technicalVisitsRouter = router({

  // ── Listar visitas ─────────────────────────────────────────────────────────
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const role = ctx.user.role;
      const userId = ctx.user.id;

      let rows;
      if (MANAGER_ROLES.includes(role)) {
        // Admin / comercial / super_admin ven todos los levantamientos activos
        rows = await db
          .select()
          .from(technicalVisits)
          .where(isNull(technicalVisits.deletedAt))
          .orderBy(desc(technicalVisits.createdAt));
      } else if (role === "medidor") {
        // Medidor solo ve sus propias visitas
        rows = await db
          .select()
          .from(technicalVisits)
          .where(and(
            eq(technicalVisits.createdBy, userId),
            isNull(technicalVisits.deletedAt)
          ))
          .orderBy(desc(technicalVisits.createdAt));
      } else {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso a levantamientos" });
      }

      return rows.map(r => ({
        ...r,
        id: String(r.id),
      }));
    }),

  // ── Obtener por ID ──────────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ visitId: z.coerce.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const role = ctx.user.role;
      const userId = ctx.user.id;

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(and(
          eq(technicalVisits.id, input.visitId),
          isNull(technicalVisits.deletedAt)
        ));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });

      // Control de acceso
      if (role === "medidor" && visit.createdBy !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso a este levantamiento" });
      }
      if (role === "disenador" && !visit.projectId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso: levantamiento no vinculado a proyecto" });
      }
      if (!PROJECT_ROLES.includes(role) && role !== "medidor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const photos = await db
        .select()
        .from(technicalVisitPhotos)
        .where(eq(technicalVisitPhotos.visitId, input.visitId))
        .orderBy(technicalVisitPhotos.createdAt);

      const pdfs = await db
        .select()
        .from(technicalVisitPdfs)
        .where(eq(technicalVisitPdfs.visitId, input.visitId))
        .orderBy(technicalVisitPdfs.createdAt);

      return {
        ...visit,
        id: String(visit.id),
        geoLocation: (visit.latitude && visit.longitude) ? {
          latitude: parseFloat(String(visit.latitude)),
          longitude: parseFloat(String(visit.longitude)),
          timestamp: visit.createdAt,
        } : undefined,
        photos: photos.map(p => ({ ...p, id: String(p.id) })),
        pdfs: pdfs.map(p => ({ ...p, id: String(p.id), fileName: p.originalFileName })),
      };
    }),

  // ── Obtener por projectId (para el diseñador en ProjectDetail) ─────────────
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const role = ctx.user.role;
      if (!PROJECT_ROLES.includes(role) && role !== "medidor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(and(
          eq(technicalVisits.projectId, input.projectId),
          isNull(technicalVisits.deletedAt)
        ))
        .orderBy(desc(technicalVisits.createdAt));

      if (!visit) return null;

      const photos = await db
        .select()
        .from(technicalVisitPhotos)
        .where(eq(technicalVisitPhotos.visitId, visit.id))
        .orderBy(technicalVisitPhotos.createdAt);

      const pdfs = await db
        .select()
        .from(technicalVisitPdfs)
        .where(eq(technicalVisitPdfs.visitId, visit.id))
        .orderBy(technicalVisitPdfs.createdAt);

      return {
        ...visit,
        id: String(visit.id),
        geoLocation: (visit.latitude && visit.longitude) ? {
          latitude: parseFloat(String(visit.latitude)),
          longitude: parseFloat(String(visit.longitude)),
          timestamp: visit.createdAt,
        } : undefined,
        photos: photos.map(p => ({ ...p, id: String(p.id) })),
        pdfs: pdfs.map(p => ({ ...p, id: String(p.id), fileName: p.originalFileName })),
      };
    }),

  // ── Crear visita técnica ────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientPhone: z.string().optional(),
      clientAddress: z.string().optional(),
      visitCity: z.string().optional(),
      workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
      appointmentId: z.number().optional(),
      clientId: z.number().optional(),
      geoLocation: z.object({
        latitude: z.number(),
        longitude: z.number(),
        timestamp: z.string(),
      }).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const role = ctx.user.role;
      if (!["medidor", "admin", "super_admin"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el medidor puede crear levantamientos" });
      }

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

      const [created] = await db
        .insert(technicalVisits)
        .values({
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientAddress: input.clientAddress,
          visitCity: input.visitCity,
          workType: input.workType,
          appointmentId: input.appointmentId,
          clientId: input.clientId,
          createdBy: ctx.user.id,
          status: "borrador",
          latitude: input.geoLocation ? String(input.geoLocation.latitude) : undefined,
          longitude: input.geoLocation ? String(input.geoLocation.longitude) : undefined,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { id: String(created.id) };
    }),

  // ── Actualizar medidas, checklist, notas, evaluación y datos de cliente ─────
  update: protectedProcedure
    .input(z.object({
      visitId: z.coerce.number(),
      // Datos del cliente (editables en borrador)
      clientName: z.string().optional(),
      clientPhone: z.string().optional(),
      clientAddress: z.string().optional(),
      visitCity: z.string().optional(),
      // Contenido técnico
      measurements: z.record(z.string(), z.any()).optional(),
      checklist: z.record(z.string(), z.any()).optional(),
      technicalEvaluation: z.enum(["viable", "requiere_revision", "requiere_visita"]).optional().nullable(),
      criticalObservations: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, input.visitId));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });
      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se puede editar un levantamiento en borrador" });
      }
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      const updateData: Record<string, any> = { updatedAt: now };
      if (input.clientName !== undefined) updateData.clientName = input.clientName;
      if (input.clientPhone !== undefined) updateData.clientPhone = input.clientPhone;
      if (input.clientAddress !== undefined) updateData.clientAddress = input.clientAddress;
      if (input.visitCity !== undefined) updateData.visitCity = input.visitCity;
      if (input.measurements !== undefined) updateData.measurements = input.measurements;
      if (input.checklist !== undefined) updateData.checklist = input.checklist;
      if (input.technicalEvaluation !== undefined) updateData.technicalEvaluation = input.technicalEvaluation;
      if (input.criticalObservations !== undefined) updateData.criticalObservations = input.criticalObservations;
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db
        .update(technicalVisits)
        .set(updateData)
        .where(eq(technicalVisits.id, input.visitId));

      return { success: true };
    }),

  // ── Subir foto ─────────────────────────────────────────────────────────────
  addPhoto: protectedProcedure
    .input(z.object({
      visitId: z.coerce.number(),
      fileName: z.string(),
      fileData: z.string(), // base64
      contentType: z.string(),
      category: z.enum(["general", "ventana", "punto_hidraulico", "punto_gas", "tomacorrientes", "detalle_tecnico"]),
      caption: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, input.visitId));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });
      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se pueden agregar fotos a un levantamiento enviado" });
      }
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const { storagePut } = await import("../storage");

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = input.fileName.split(".").pop() || "jpg";
      const fileKey = `technical_visits/${input.visitId}/photos/${timestamp}-${randomSuffix}.${extension}`;

      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      let buffer = Buffer.from(base64Data, "base64");

      // Comprimir imagen
      if (input.contentType.startsWith("image/")) {
        try {
          const { compressImage } = await import("../image-utils");
          const compressed = await compressImage(buffer, { maxWidth: 1920, maxHeight: 1080, quality: 82, format: "jpeg" });
          buffer = Buffer.from(compressed.buffer);
        } catch {
          // fallback: usar original
        }
      }

      const { url } = await storagePut(fileKey, buffer, input.contentType.startsWith("image/") ? "image/jpeg" : input.contentType);

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      const [photo] = await db
        .insert(technicalVisitPhotos)
        .values({
          visitId: input.visitId,
          url,
          s3Key: fileKey,
          category: input.category,
          caption: input.caption,
          uploadedBy: ctx.user.id,
          createdAt: now,
        })
        .returning();

      // Actualizar updatedAt de la visita
      await db.update(technicalVisits).set({ updatedAt: now }).where(eq(technicalVisits.id, input.visitId));

      return { id: String(photo.id), url };
    }),

  // ── Eliminar foto ──────────────────────────────────────────────────────────
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.coerce.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [photo] = await db
        .select()
        .from(technicalVisitPhotos)
        .where(eq(technicalVisitPhotos.id, input.photoId));

      if (!photo) throw new TRPCError({ code: "NOT_FOUND", message: "Foto no encontrada" });

      // Verificar que la visita es del medidor
      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, photo.visitId));

      if (visit && ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      if (visit && visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede eliminar fotos de un levantamiento enviado" });
      }

      await db.delete(technicalVisitPhotos).where(eq(technicalVisitPhotos.id, input.photoId));

      return { success: true };
    }),

  // ── Comprimir y subir PDF (GoodNotes) ─────────────────────────────────────
  compressPdf: protectedProcedure
    .input(z.object({
      visitId: z.coerce.number(),
      fileName: z.string(),
      fileData: z.string(), // base64
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, input.visitId));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });
      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se pueden agregar PDFs a un levantamiento enviado" });
      }
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const { storagePut } = await import("../storage");

      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const originalBuffer = Buffer.from(base64Data, "base64");
      const originalSize = originalBuffer.length;

      // Comprimir con ghostscript
      const { buffer: compressedBuffer, savedPercent } = await compressPdfBuffer(originalBuffer);

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `technical_visits/${input.visitId}/pdfs/${timestamp}-${randomSuffix}.pdf`;

      const { url } = await storagePut(fileKey, compressedBuffer, "application/pdf");

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      const [pdf] = await db
        .insert(technicalVisitPdfs)
        .values({
          visitId: input.visitId,
          url,
          s3Key: fileKey,
          originalFileName: input.fileName,
          originalSizeBytes: originalSize,
          compressedSizeBytes: compressedBuffer.length,
          savedPercent,
          uploadedBy: ctx.user.id,
          createdAt: now,
        })
        .returning();

      await db.update(technicalVisits).set({ updatedAt: now }).where(eq(technicalVisits.id, input.visitId));

      return { id: String(pdf.id), url, savedPercent };
    }),

  // ── Guardar firma del cliente ───────────────────────────────────────────────
  saveSignature: protectedProcedure
    .input(z.object({
      visitId: z.coerce.number(),
      signature: z.string(), // base64 PNG
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, input.visitId));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });
      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede modificar un levantamiento enviado" });
      }
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      await db
        .update(technicalVisits)
        .set({
          clientSignature: input.signature,
          clientSignedAt: now,
          updatedAt: now,
        })
        .where(eq(technicalVisits.id, input.visitId));

      return { success: true };
    }),

  // ── Enviar levantamiento (borrador → enviada) ──────────────────────────────
  submit: protectedProcedure
    .input(z.object({ visitId: z.coerce.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [visit] = await db
        .select()
        .from(technicalVisits)
        .where(eq(technicalVisits.id, input.visitId));

      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Levantamiento no encontrado" });
      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El levantamiento ya fue enviado" });
      }
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }

      // Validar: fotos obligatorias
      const photos = await db
        .select()
        .from(technicalVisitPhotos)
        .where(eq(technicalVisitPhotos.visitId, input.visitId));

      if (photos.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes agregar al menos una foto del sitio antes de enviar",
        });
      }

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      await db
        .update(technicalVisits)
        .set({ status: "enviada", submittedAt: now, updatedAt: now })
        .where(eq(technicalVisits.id, input.visitId));

      // ── Notificar al equipo (admin, comercial, super_admin) ──────────────────
      try {
        const [admins, comerciales, superAdmins] = await Promise.all([
          getDb().then(d => d ? d.query?.users?.findMany?.({ where: (u: any, { eq: e }: any) => e(u.role, 'admin') }) : []),
          getDb().then(d => d ? d.query?.users?.findMany?.({ where: (u: any, { eq: e }: any) => e(u.role, 'comercial') }) : []),
          getDb().then(d => d ? d.query?.users?.findMany?.({ where: (u: any, { eq: e }: any) => e(u.role, 'super_admin') }) : []),
        ]);

        const { getUsersByRole, createNotification } = await import('../db');
        const [a, c, s] = await Promise.all([
          getUsersByRole('admin'),
          getUsersByRole('comercial'),
          getUsersByRole('super_admin'),
        ]);
        const teamUsers = [...a, ...c, ...s];

        const workLabels: Record<string, string> = {
          cocina: 'Cocina Integral', closet: 'Closet',
          puertas: 'Puertas', centro_tv: 'Centro de TV',
        };
        const tipoTrabajo = workLabels[visit.workType] || visit.workType;
        const direccion = visit.clientAddress || 'Sin dirección';

        for (const user of teamUsers) {
          // Campanilla
          await createNotification({
            userId: user.id,
            type: 'levantamiento',
            title: '📐 Levantamiento técnico enviado',
            body: ,
            referenceId: input.visitId,
          });

          // WhatsApp
          if (user.phone) {
            try {
              const wac = await import('../whatsapp-cloud');
              const msg =
                 +
                 +
                 +
                 +
                (visit.clientPhone ?  : '') +
                ;
              await wac.sendTextMessage(user.phone, msg);
            } catch (waErr) {
              console.error('[Levantamiento submit] Error WhatsApp:', waErr);
            }
          }
        }
      } catch (notifErr) {
        console.error('[Levantamiento submit] Error notificando equipo:', notifErr);
      }

      return { success: true };
    }),

  // ── Vincular levantamiento a proyecto (admin/comercial — post aprobación) ──
  linkToProject: protectedProcedure
    .input(z.object({
      visitId: z.coerce.number(),
      projectId: z.number(),
      quotationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      requireRole(ctx.user.role, MANAGER_ROLES);

      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      await db
        .update(technicalVisits)
        .set({
          projectId: input.projectId,
          quotationId: input.quotationId,
          status: "convertida",
          updatedAt: now,
        })
        .where(eq(technicalVisits.id, input.visitId));

      return { success: true };
    }),
});
