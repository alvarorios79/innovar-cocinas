/**
 * Planos técnicos y detalles enviados al cliente (carpeta "detalles" del proyecto).
 *
 * - share: la oficina elige uno o varios archivos y se arma el WhatsApp al cliente con el enlace
 *   permanente del proyecto (`/gallery?project=X&token=Y&type=documentos`).
 * - El enlace muestra SOLO lo enviado (los detalles de armado internos no se ven) y un botón
 *   "Recibido" para que el cliente confirme con su nombre. Queda constancia: enviado, visto, recibido.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { projectDocShares, projectPhotos, projects } from "../../drizzle/schema";

/** Quién envía documentos al cliente (comunicación con el cliente = oficina). */
export const DOC_SHARE_ROLES = ["super_admin", "admin", "comercial"];
const VIEW_ROLES = ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"];

async function database() {
  const d = await db.getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  return d;
}

const isPdf = (url: string) => {
  let p = (url || "").split("?")[0];
  try { p = decodeURIComponent(p); } catch { /* deja la ruta */ }
  return p.toLowerCase().endsWith(".pdf");
};

/** Número para wa.me: con indicativo 57 si es un celular colombiano de 10 dígitos. */
export function waPhone(phone?: string | null): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.length > 10 ? digits : `57${digits}`;
}

/** Mensaje de WhatsApp al enviar planos/detalles. */
export function docsMessage(firstName: string, projectName: string, names: string[], link: string): string {
  const uno = names.length === 1;
  const lista = names.map((n) => `• ${n}`).join("\n");
  const hola = firstName ? `Hola ${firstName}!` : "Hola!";
  return (
    `📐 ${hola} Tu proyecto *"${projectName}"* sigue avanzando.\n\n` +
    `Te compartimos ${uno ? "el plano preparado" : "los planos preparados"} con mucho cuidado por nuestro equipo:\n` +
    `${lista}\n\n` +
    `Ahí encontrarás marcados todos los puntos para que la obra quede lista y tu espacio salga perfecto. Puedes ${uno ? "verlo y descargarlo" : "verlos y descargarlos"} aquí, y reenviar el enlace a tu maestro de obra, plomero o electricista:\n${link}\n\n` +
    `🙏 Cuando ${uno ? "lo" : "los"} revises, toca *Recibido* en el enlace; así sabemos que ${uno ? "te llegó" : "te llegaron"} bien.\n\n` +
    `Cualquier duda, con gusto te ayudamos al 313 680 2025.\n\n` +
    `— INNOVAR Cocinas de Diseño ✨`
  );
}

/** Proyecto + token válido (para las consultas públicas del enlace del cliente). */
async function projectByToken(projectId: number, token: string) {
  const project = await db.getProjectByIdPublic(projectId);
  if (!project || !project.publicToken || project.publicToken !== token) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Enlace inválido o expirado" });
  }
  return project;
}

/** Documentos que el cliente puede ver (enviados, no ocultos y que aún existen). */
async function visibleShares(d: any, projectId: number) {
  return d
    .select({
      id: projectDocShares.id, photoId: projectDocShares.photoId, fileName: projectDocShares.fileName,
      lastSentAt: projectDocShares.lastSentAt, viewedAt: projectDocShares.viewedAt,
      receivedAt: projectDocShares.receivedAt, receivedName: projectDocShares.receivedName,
      url: projectPhotos.photoUrl, description: projectPhotos.description,
    })
    .from(projectDocShares)
    .innerJoin(projectPhotos, eq(projectPhotos.id, projectDocShares.photoId))
    .where(and(eq(projectDocShares.projectId, projectId), isNull(projectDocShares.hiddenAt)))
    .orderBy(projectDocShares.lastSentAt);
}

export const projectDocsRouter = router({
  /** Estado de envío de los archivos del proyecto (para mostrar "Enviado · Visto · Recibido"). */
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!VIEW_ROLES.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      const d = await database();
      return d.select().from(projectDocShares).where(eq(projectDocShares.projectId, input.projectId));
    }),

  /** Enviar al cliente uno o varios archivos: registra el envío y devuelve el WhatsApp listo. */
  share: protectedProcedure
    .input(z.object({ projectId: z.number(), photoIds: z.array(z.number()).min(1).max(30) }))
    .mutation(async ({ ctx, input }) => {
      if (!DOC_SHARE_ROLES.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo la oficina envía documentos al cliente" });
      }
      const d = await database();
      const project = await db.getProjectByIdPublic(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      const files = await d.select({ id: projectPhotos.id, description: projectPhotos.description, url: projectPhotos.photoUrl })
        .from(projectPhotos)
        .where(and(eq(projectPhotos.projectId, input.projectId), inArray(projectPhotos.id, input.photoIds)));
      if (!files.length) throw new TRPCError({ code: "NOT_FOUND", message: "Esos archivos no están en el proyecto" });

      for (const f of files as any[]) {
        const name = f.description || (isPdf(f.url) ? "Plano" : "Imagen");
        await d.insert(projectDocShares)
          .values({ projectId: input.projectId, photoId: f.id, fileName: name, sentBy: ctx.user.id })
          .onConflictDoUpdate({
            target: projectDocShares.photoId,
            set: {
              lastSentAt: sql`now()`, sendCount: sql`${projectDocShares.sendCount} + 1`,
              hiddenAt: null, fileName: name, sentBy: ctx.user.id,
            },
          });
      }

      let token = project.publicToken;
      if (!token) {
        token = randomBytes(24).toString("hex");
        await db.updateProject(input.projectId, { publicToken: token });
      }
      const baseUrl = process.env.VITE_APP_URL || "https://innovar-cocinas.onrender.com";
      const link = `${baseUrl}/gallery?project=${input.projectId}&token=${token}&type=documentos`;
      const client = project.clientId ? await db.getClientById(project.clientId) : null;
      const firstName = (client?.name || "").trim().split(/\s+/)[0] || "";
      const names = (files as any[]).map((f) => f.description || (isPdf(f.url) ? "Plano" : "Imagen"));
      const message = docsMessage(firstName, project.name, names, link);
      const phone = waPhone((client as any)?.whatsappPhone);
      console.log(`[Documentos] ${files.length} archivo(s) enviados al cliente del proyecto ${input.projectId} por ${ctx.user.id}`);
      return {
        sent: files.length,
        link,
        whatsAppLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
        message,
      };
    }),

  /** Dejar de mostrar un archivo al cliente (p. ej. un plano reemplazado). La constancia queda. */
  unshare: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!DOC_SHARE_ROLES.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos" });
      const d = await database();
      await d.update(projectDocShares).set({ hiddenAt: sql`now()` }).where(eq(projectDocShares.photoId, input.photoId));
      return { success: true };
    }),

  // ── Enlace del cliente (sin login: el token es la autenticación) ──────────

  /** Cuántos documentos tiene el cliente (para mostrar el acceso en el portal completo; NO marca "Visto"). */
  publicCount: publicProcedure
    .input(z.object({ projectId: z.number(), token: z.string().min(1) }))
    .query(async ({ input }) => {
      await projectByToken(input.projectId, input.token);
      const d = await database();
      const rows = await visibleShares(d, input.projectId);
      return { count: rows.length, pending: (rows as any[]).filter((r) => !r.receivedAt).length };
    }),

  /** Documentos enviados al cliente. Al abrirlos queda marcado "Visto". */
  publicList: publicProcedure
    .input(z.object({ projectId: z.number(), token: z.string().min(1) }))
    .query(async ({ input }) => {
      const project = await projectByToken(input.projectId, input.token);
      const d = await database();
      const rows = await visibleShares(d, input.projectId);
      const notSeen = (rows as any[]).filter((r) => !r.viewedAt).map((r) => r.id);
      if (notSeen.length) await d.update(projectDocShares).set({ viewedAt: sql`now()` }).where(inArray(projectDocShares.id, notSeen));
      const client = project.clientId ? await db.getClientById(project.clientId) : null;
      return {
        projectName: project.name,
        clientFirstName: (client?.name || "").trim().split(/\s+/)[0] || "",
        docs: (rows as any[]).map((r) => ({
          id: r.photoId,
          name: r.description || r.fileName || "Documento",
          isPdf: isPdf(r.url),
          url: r.url,
          sentAt: r.lastSentAt,
          receivedAt: r.receivedAt,
          receivedName: r.receivedName,
        })),
      };
    }),

  /** El cliente confirma "Recibido" (con su nombre). Avisa a la oficina. */
  confirmReceived: publicProcedure
    .input(z.object({ projectId: z.number(), token: z.string().min(1), name: z.string().trim().min(2, "Escribe tu nombre").max(120) }))
    .mutation(async ({ input }) => {
      const project = await projectByToken(input.projectId, input.token);
      const d = await database();
      const pending = (await visibleShares(d, input.projectId) as any[]).filter((r) => !r.receivedAt);
      if (pending.length) {
        await d.update(projectDocShares)
          .set({ receivedAt: sql`now()`, receivedName: input.name })
          .where(inArray(projectDocShares.id, pending.map((r) => r.id)));
        try {
          const { createAndSendNotification } = await import("../push-notifications");
          const ids = new Set<number>();
          for (const role of DOC_SHARE_ROLES) for (const u of await db.getUsersByRole(role)) ids.add(u.id);
          for (const userId of Array.from(ids)) {
            await createAndSendNotification(userId, {
              title: "✅ Documentos recibidos",
              body: `${input.name} confirmó que recibió ${pending.length === 1 ? `"${pending[0].description || pending[0].fileName}"` : `${pending.length} documentos`} del proyecto "${project.name}".`,
              type: "proyecto",
              referenceId: input.projectId,
              referenceType: "documentos",
              url: `/projects/${input.projectId}`,
            });
          }
        } catch (err) {
          console.error("[Documentos] No se pudo avisar la confirmación:", err);
        }
      }
      return { confirmed: pending.length };
    }),
});
