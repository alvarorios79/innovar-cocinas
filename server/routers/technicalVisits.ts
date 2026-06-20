/**
 * Router de Visitas Técnicas — Portal del Medidor
 * Gestiona visitas de campo: medidas, fotos, PDFs anotados y envío a admin.
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

// ── Compresión PDF con MuPDF (WASM, sin dependencias de sistema) ──────────────

async function compressPdfWithMupdf(inputBuffer: Buffer, dpi = 100, jpegQuality = 75): Promise<Buffer> {
  const mupdf = (await import("mupdf")).default;

  const srcDoc = mupdf.Document.openDocument(inputBuffer, "application/pdf");
  const numPages = srcDoc.countPages();
  const outDoc = new mupdf.PDFDocument();
  const scale = dpi / 72;

  for (let i = 0; i < numPages; i++) {
    const page = srcDoc.loadPage(i);
    const [x0, y0, x1, y1] = page.getBounds();
    const w = x1 - x0;
    const h = y1 - y0;

    // Renderizar página a pixmap a DPI reducido
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(scale, scale),
      mupdf.ColorSpace.DeviceRGB,
      false,
      true
    );

    // Convertir a JPEG con compresión
    const jpegData = pixmap.asJPEG(jpegQuality, false);

    // Agregar imagen JPEG como recurso XObject del PDF de salida
    const imgBuf = new mupdf.Buffer();
    imgBuf.writeBuffer(jpegData);
    const pdfImage = outDoc.addImage(new mupdf.Image(imgBuf));

    const resources = outDoc.newDictionary();
    const xobjects = outDoc.newDictionary();
    xobjects.put("Im0", pdfImage);
    resources.put("XObject", xobjects);

    // Content stream que escala la imagen para ocupar toda la página
    const contentStream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;

    const pageRef = outDoc.addPage([0, 0, w, h], 0, resources, contentStream);
    outDoc.insertPage(-1, pageRef);
  }

  const result = outDoc.saveToBuffer("compress");
  return Buffer.from(result.asUint8Array());
}

const ALLOWED_ROLES = ["medidor", "admin", "super_admin", "comercial"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertMedidorOrAdmin(role: string) {
  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para visitas técnicas" });
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

export const technicalVisitsRouter = router({

  /** Crear nueva visita técnica */
  create: protectedProcedure
    .input(z.object({
      clientId:      z.number().optional(),
      clientName:    z.string().min(1),
      clientPhone:   z.string().optional(),
      clientAddress: z.string().optional(),
      workType:      z.enum(["cocina", "closet", "puertas", "centro_tv"]),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const id = await db.createTechnicalVisit({
        ...input,
        createdBy: ctx.user.id,
      });

      return { id };
    }),

  /** Actualizar medidas, notas o datos del cliente */
  update: protectedProcedure
    .input(z.object({
      visitId:       z.number(),
      clientName:    z.string().min(1).optional(),
      clientPhone:   z.string().optional(),
      clientAddress: z.string().optional(),
      workType:      z.enum(["cocina", "closet", "puertas", "centro_tv"]).optional(),
      measurements:  z.record(z.unknown()).optional(),
      notes:         z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      // Medidor solo puede editar sus propias visitas
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes editar esta visita" });
      }

      if (visit.status === "convertida") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta visita ya fue convertida en cotización" });
      }

      const { visitId, ...updateData } = input;
      await db.updateTechnicalVisit(visitId, updateData as any);

      return { success: true };
    }),

  /** Obtener visita con fotos */
  getById: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      // Medidor solo ve sus propias visitas
      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta visita" });
      }

      return visit;
    }),

  /** Listar visitas (medidor ve las suyas, admin/comercial ve todas) */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["borrador", "enviada", "convertida"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const filters: { createdBy?: number; status?: string } = {};

      if (ctx.user.role === "medidor") {
        filters.createdBy = ctx.user.id;
      }
      if (input?.status) {
        filters.status = input.status;
      }

      return await db.listTechnicalVisits(filters);
    }),

  /** Subir foto o PDF a una visita (base64 → S3) */
  addPhoto: protectedProcedure
    .input(z.object({
      visitId:     z.number(),
      fileName:    z.string(),
      fileData:    z.string(), // base64
      contentType: z.string(),
      category:    z.enum(["foto", "pdf_plano", "pdf_medidas", "firma", "foto_frontal", "foto_lateral", "foto_techo", "foto_electrico", "foto_plomeria"]).default("foto"),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes editar esta visita" });
      }

      // Validar tipo de archivo
      const isImage = input.contentType.startsWith("image/");
      const isPdf   = input.contentType === "application/pdf";
      if (!isImage && !isPdf) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se permiten imágenes y PDFs" });
      }

      // Validar tamaño (12MB)
      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > 12 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo supera el límite de 12MB" });
      }

      const timestamp = Date.now();
      const random    = Math.random().toString(36).substring(2, 8);
      const extension = input.fileName.split(".").pop() || "jpg";
      const fileKey   = `visits/${input.visitId}/${timestamp}-${random}.${extension}`;
      const { url }   = await storagePut(fileKey, buffer, input.contentType);

      const photoId = await db.createVisitPhoto({
        visitId:     input.visitId,
        photoUrl:    url,
        category:    input.category,
        description: input.description,
      });

      return { id: photoId, url };
    }),

  /** Eliminar foto de una visita */
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const photo = await db.getVisitPhotoById(input.photoId);
      if (!photo) throw new TRPCError({ code: "NOT_FOUND", message: "Foto no encontrada" });

      if (ctx.user.role === "medidor") {
        const visit = await db.getTechnicalVisitById(photo.visitId);
        if (!visit || visit.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar esta foto" });
        }
      }

      await db.deleteVisitPhoto(input.photoId);
      return { success: true };
    }),

  /**
   * Comprimir PDF usando Ghostscript y subirlo a S3.
   * Recibe base64, comprime con /ebook (150dpi), devuelve URL del PDF comprimido.
   */
  compressPdf: protectedProcedure
    .input(z.object({
      visitId:  z.number(),
      fileName: z.string(),
      fileData: z.string(), // base64 del PDF original
      category: z.enum(["pdf_plano", "pdf_medidas"]).default("pdf_plano"),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes editar esta visita" });
      }

      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const inputBuffer = Buffer.from(base64Data, "base64");

      if (inputBuffer.length > 50 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El PDF supera el límite de 50MB" });
      }

      const { writeFileSync, readFileSync, unlinkSync, existsSync } = await import("fs");
      const { execFileSync } = await import("child_process");
      const { join } = await import("path");
      const tmpId    = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const inputPath  = join("/tmp", `visit-input-${tmpId}.pdf`);
      const outputPath = join("/tmp", `visit-output-${tmpId}.pdf`);

      let outputBuffer: Buffer;

      try {
        // Intentar primero con Ghostscript (disponible en Docker/local)
        writeFileSync(inputPath, inputBuffer);
        execFileSync("gs", [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          "-dPDFSETTINGS=/ebook",
          "-dNOPAUSE",
          "-dBATCH",
          "-dQUIET",
          `-sOutputFile=${outputPath}`,
          inputPath,
        ], { timeout: 60000 });
        outputBuffer = existsSync(outputPath) ? readFileSync(outputPath) : inputBuffer;
        console.log("[compressPdf] Ghostscript OK");
      } catch (_gsErr) {
        // Ghostscript no disponible → usar MuPDF WASM (sin dependencias de sistema)
        console.log("[compressPdf] Ghostscript no disponible, usando MuPDF WASM...");
        try {
          outputBuffer = await compressPdfWithMupdf(inputBuffer, 120, 78);
          console.log("[compressPdf] MuPDF OK:", inputBuffer.length, "→", outputBuffer.length, "bytes");
        } catch (mupdfErr) {
          console.error("[compressPdf] MuPDF falló también:", mupdfErr);
          outputBuffer = inputBuffer; // último fallback: subir sin comprimir
        }
      } finally {
        try { if (existsSync(inputPath))  unlinkSync(inputPath);  } catch (_) {}
        try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch (_) {}
      }

      const originalKb   = Math.round(inputBuffer.length / 1024);
      const compressedKb = Math.round(outputBuffer.length / 1024);

      const timestamp = Date.now();
      const random    = Math.random().toString(36).substring(2, 8);
      const fileKey   = `visits/${input.visitId}/${timestamp}-${random}-compressed.pdf`;
      const { url }   = await storagePut(fileKey, outputBuffer, "application/pdf");

      const photoId = await db.createVisitPhoto({
        visitId:     input.visitId,
        photoUrl:    url,
        category:    input.category,
        description: input.description ?? `PDF comprimido (${originalKb}KB → ${compressedKb}KB)`,
      });

      return {
        id:           photoId,
        url,
        originalKb,
        compressedKb,
        savedPercent: Math.round((1 - compressedKb / originalKb) * 100),
      };
    }),

  /** Marcar visita como convertida en cotización */
  markConverted: protectedProcedure
    .input(z.object({
      visitId:     z.number(),
      quotationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["admin", "super_admin", "comercial"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin o comercial pueden convertir visitas" });
      }
      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      await db.updateTechnicalVisit(input.visitId, {
        status: "convertida" as any,
        ...(input.quotationId ? { quotationId: input.quotationId } : {}),
      });
      return { success: true };
    }),

  /** Listar visitas por clientId (para diseñador/admin que necesita ver datos de medición) */
  listByClientId: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const allowed = ["admin", "super_admin", "comercial", "disenador", "jefe_taller"];
      if (!allowed.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const all = await db.listTechnicalVisits({});
      const visits = all.filter((v: any) => v.clientId === input.clientId);
      // Adjuntar fotos a cada visita
      const withPhotos = await Promise.all(
        visits.map(async (v: any) => {
          // getTechnicalVisitById ya incluye las fotos
          const full = await db.getTechnicalVisitById(v.id);
          return full ?? v;
        })
      );
      return withPhotos;
    }),

  /** Enviar visita al admin para cotización */
  submit: protectedProcedure
    .input(z.object({ visitId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertMedidorOrAdmin(ctx.user.role);

      const visit = await db.getTechnicalVisitById(input.visitId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita no encontrada" });

      if (ctx.user.role === "medidor" && visit.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes enviar esta visita" });
      }

      if (visit.status !== "borrador") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta visita ya fue enviada" });
      }

      await db.updateTechnicalVisit(input.visitId, { status: "enviada" });

      // Notificar a admin y comerciales
      try {
        const { createAndSendNotification } = await import("../push-notifications");
        const admins     = await db.getUsersByRole("admin");
        const superAdmins = await db.getUsersByRole("super_admin");
        const comerciales = await db.getUsersByRole("comercial");
        const recipients = [...admins, ...superAdmins, ...comerciales];

        const workTypeLabel: Record<string, string> = {
          cocina:    "Cocina",
          closet:    "Closet",
          puertas:   "Puertas",
          centro_tv: "Centro TV",
        };

        for (const recipient of recipients) {
          await createAndSendNotification(recipient.id, {
            title: `📐 Nueva visita técnica: ${visit.clientName}`,
            body:  `${workTypeLabel[visit.workType] ?? visit.workType} — ${visit.clientAddress ?? "Sin dirección"}. Lista para cotizar.`,
            type:  "proyecto",
            url:   `/visitas-tecnicas`,
          });
        }
      } catch (err) {
        console.error("[technicalVisits.submit] Error enviando notificaciones:", err);
      }

      return { success: true };
    }),
});
