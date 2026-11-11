import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { randomBytes } from "crypto";
import { storagePut } from "../storage";
import { clearPostventaNotifications, notifyPostventa } from "../postventa-reminders";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

const ADMIN_ROLES = ["admin", "super_admin", "comercial"] as const;

// Límite contra abuso del reporte público: 3 por hora por IP y proyecto
const reportHits = new Map<string, number[]>();
function allowReport(key: string): boolean {
  const now = Date.now(), win = 60 * 60 * 1000;
  const hits = (reportHits.get(key) || []).filter((t) => now - t < win);
  if (hits.length >= 3) { reportHits.set(key, hits); return false; }
  hits.push(now); reportHits.set(key, hits);
  if (reportHits.size > 5000) reportHits.clear();
  return true;
}
const READ_ROLES = [...ADMIN_ROLES, "jefe_taller"] as const;

export const postventaRouter = router({

  // ── Lista todas las reclamaciones (con datos del proyecto y cliente) ─────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      type: z.enum(["reclamacion", "seguimiento_30d", "revision_anual"]).optional(),
      status: z.enum(["pendiente", "en_revision", "resuelto", "no_procede"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const role = ctx.user.role;
      if (!READ_ROLES.includes(role as any)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso a postventa" });
      }

      let items = input?.projectId
        ? await db.getReclamacionesByProject(input.projectId)
        : await db.getAllReclamaciones();

      // jefe_taller solo ve reclamaciones de proyectos que tiene asignados
      if (role === "jefe_taller" && !input?.projectId) {
        const allProjects = await db.getAllProjects();
        const myProjectIds = new Set(
          allProjects
            .filter((p: any) => ["despiece","corte","enchape","ensamble","listo_instalacion","entregado"].includes(p.status))
            .map((p: any) => p.id)
        );
        items = items.filter(i => myProjectIds.has(i.projectId));
      }

      if (input?.type) items = items.filter(i => i.type === input.type);
      if (input?.status) items = items.filter(i => i.status === input.status);

      // Enriquecer con datos de proyecto y cliente
      const allProjects = await db.getAllProjects();
      const allClients = await db.getAllClients();
      const allUsers = await db.getAllUsers();
      const projectMap = new Map(allProjects.map(p => [p.id, p]));
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      return items.map(item => ({
        ...item,
        project: projectMap.get(item.projectId),
        client: (() => {
          const project = projectMap.get(item.projectId);
          return project ? clientMap.get(project.clientId) : null;
        })(),
        assignedToUser: item.assignedTo ? userMap.get(item.assignedTo) : null,
        createdByUser: userMap.get(item.createdBy),
        resolvedByUser: item.resolvedBy ? userMap.get(item.resolvedBy) : null,
      }));
    }),

  // ── Reclamaciones de un proyecto específico (para ProjectDetail) ──────────
  byProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = ctx.user.role;
      if (!ADMIN_ROLES.includes(role as any)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const items = await db.getReclamacionesByProject(input.projectId);
      const allUsers = await db.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      return items.map(item => ({
        ...item,
        assignedToUser: item.assignedTo ? userMap.get(item.assignedTo) : null,
        createdByUser: userMap.get(item.createdBy),
        resolvedByUser: item.resolvedBy ? userMap.get(item.resolvedBy) : null,
      }));
    }),

  // ── Estadísticas generales ────────────────────────────────────────────────
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!READ_ROLES.includes(ctx.user.role as any)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getReclamacionesStats();
    }),

  // ── Crear reclamación manual ──────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["reclamacion", "seguimiento_30d", "revision_anual"]).default("reclamacion"),
      priority: z.enum(["alta", "media", "baja"]).default("media"),
      assignedTo: z.number().optional(),
      scheduledFor: z.string().optional(), // ISO date
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.user.role as any)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await db.createReclamacion({
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority,
        assignedTo: input.assignedTo,
        scheduledFor: input.scheduledFor,
        createdBy: ctx.user.id,
        status: "pendiente",
      });

      // Notificar al asignado si hay uno
      if (input.assignedTo) {
        const project = await db.getProjectById(input.projectId);
        await db.createNotification({
          userId: input.assignedTo,
          title: `🔧 Nueva reclamación asignada`,
          body: `"${input.title}" — Proyecto: ${project?.name || input.projectId}`,
          type: "proyecto",
          referenceId: input.projectId,
          referenceType: "project",
        });
      }

      return { success: true, id };
    }),

  // ── Actualizar estado / resolución ────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendiente", "en_revision", "resuelto", "no_procede"]).optional(),
      assignedTo: z.number().optional().nullable(),
      priority: z.enum(["alta", "media", "baja"]).optional(),
      resolvedNotes: z.string().optional(),
      scheduledFor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.user.role as any)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };

      if (input.status === "resuelto") {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = ctx.user.id;

        // Notificar al cliente si el proyecto está disponible
        try {
          const reclamacion = await db.getReclamacionById(id);
          if (reclamacion) {
            const project = await db.getProjectById(reclamacion.projectId);
            const client = project ? await db.getClientById(project.clientId) : null;

            if (client) {
              // Notificación interna para admins
              const allUsers = await db.getAllUsers();
              const admins = allUsers.filter(u => ADMIN_ROLES.includes(u.role as any));
              for (const admin of admins) {
                if (admin.id !== ctx.user.id) {
                  await db.createNotification({
                    userId: admin.id,
                    title: "✅ Reclamación resuelta",
                    body: `"${reclamacion.title}" del proyecto "${project?.name}" marcada como resuelta.`,
                    type: "proyecto",
                    referenceId: reclamacion.projectId,
                    referenceType: "project",
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Error notificando resolución:", e);
        }
      }

      await db.updateReclamacion(id, updateData as any);
      // Alguien ya lo está atendiendo o lo cerró: se borra el aviso a todo el equipo (también a Álvaro)
      if (input.status && input.status !== "pendiente") {
        try { await clearPostventaNotifications(id); } catch (e) { console.error("[Postventa] No se pudo borrar el aviso:", e); }
      }
      return { success: true };
    }),

  // ── El cliente reporta un problema desde su enlace de entrega (sin login: el token es la autenticación) ──
  publicReport: publicProcedure
    .input(z.object({
      projectId: z.number(),
      token: z.string().min(1),
      name: z.string().trim().min(2, "Escribe tu nombre").max(120),
      description: z.string().trim().min(5, "Cuéntanos qué pasó").max(1500),
      /** Fotos ya reducidas en el navegador (JPEG en base64, data URL). */
      photos: z.array(z.string().max(6_000_000)).max(3).default([]),
      website: z.string().optional(), // trampa para robots
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.website) return { success: true };
      const ip = String((ctx.req as any)?.ip || "desconocida");
      if (!allowReport(`${ip}:${input.projectId}`)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Ya recibimos tu reporte. Si es urgente, escríbenos al WhatsApp 313 680 2025." });
      }
      const project = await db.getProjectByIdPublic(input.projectId);
      if (!project || !project.publicToken || project.publicToken !== input.token) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Enlace inválido" });
      }
      const urls: string[] = [];
      for (const p of input.photos) {
        const m = p.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
        if (!m) continue;
        const buf = Buffer.from(m[2], "base64");
        if (buf.length > 4_500_000) continue;
        const { url } = await storagePut(`postventa/${input.projectId}/${Date.now()}-${randomBytes(4).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`, buf, `image/${m[1]}`);
        urls.push(url);
      }
      const owner = (await db.getUsersByRole("super_admin"))[0];
      if (!owner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No disponible" });
      const firstLine = input.description.split("\n")[0].slice(0, 80);
      const id = await db.createReclamacion({
        projectId: input.projectId,
        title: `Reporte del cliente: ${firstLine}`,
        description: [`Reportado por ${input.name} desde su enlace.`, "", input.description, ...urls.map((u) => `📷 ${u}`)].join("\n"),
        type: "reclamacion",
        priority: "alta",
        status: "pendiente",
        createdBy: owner.id,
      } as any);
      try {
        await notifyPostventa(Number(id), `🛠️ ${input.name} reportó un problema`, `Proyecto "${project.name}": ${firstLine}`);
      } catch (e) { console.error("[Postventa] No se pudo avisar el reporte:", e); }
      console.log(`[Postventa] Reporte del cliente en el proyecto ${input.projectId} (${urls.length} foto(s))`);
      return { success: true };
    }),

  // ── Pending scheduled (para dashboard / badge) ────────────────────────────
  pendingScheduled: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ADMIN_ROLES.includes(ctx.user.role as any)) return [];
      return db.getPendingScheduledReclamaciones();
    }),
});
