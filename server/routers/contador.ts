import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { taxObligations, taxDocuments, projects, clients, quotations } from "../../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const ALLOWED_ROLES = ["super_admin", "admin", "contador"];

function requireContador(role: string) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acceso solo para contador y administradores" });
  }
}

// ── Derrotero: obligaciones tributarias Colombia (persona natural obligada a facturar)
// SS mensual, Retención mensual, ICA bimestral, IVA cuatrimestral
const OBLIGATION_TYPES = [
  {
    type: "seguridad_social",
    label: "Seguridad Social",
    periodType: "mensual" as const,
    description: "Aportes mensuales a salud y pensión (PILA)",
    dueDate: "último día hábil del mes siguiente",
  },
  {
    type: "retencion",
    label: "Retención en la Fuente",
    periodType: "mensual" as const,
    description: "Declaración y pago mensual de retenciones practicadas",
    dueDate: "según calendario DIAN",
  },
  {
    type: "ica",
    label: "ICA",
    periodType: "bimestral" as const,
    description: "Impuesto de Industria y Comercio bimestral — Pereira",
    dueDate: "según calendario municipio",
  },
  {
    type: "iva",
    label: "IVA",
    periodType: "cuatrimestral" as const,
    description: "Declaración de IVA cuatrimestral",
    dueDate: "enero, mayo, septiembre",
  },
];

function getPeriodLabel(type: string, period: number, year: number): string {
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if (type === "seguridad_social" || type === "retencion") {
    return `${months[period - 1]} ${year}`;
  }
  if (type === "ica") {
    const starts = [1, 3, 5, 7, 9, 11];
    const ends   = [2, 4, 6, 8, 10, 12];
    return `${months[starts[period-1]-1]}–${months[ends[period-1]-1]} ${year}`;
  }
  if (type === "iva") {
    const labels = ["Ene–Abr","May–Ago","Sep–Dic"];
    return `${labels[period-1]} ${year}`;
  }
  return `Período ${period} — ${year}`;
}

export const contadorRouter = router({

  // ── Derrotero: obtener obligaciones del año/mes ──────────────────────────
  getDerrotero: protectedProcedure
    .input(z.object({ year: z.number().min(2020).max(2100) }))
    .query(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const rows = await db
        .select()
        .from(taxObligations)
        .where(eq(taxObligations.year, input.year))
        .orderBy(asc(taxObligations.type), asc(taxObligations.period));

      // Construir derrotero completo (todas las obligaciones del año aunque no existan en DB)
      const derrotero: any[] = [];

      for (const oblType of OBLIGATION_TYPES) {
        const maxPeriod = oblType.periodType === "mensual" ? 12
                        : oblType.periodType === "bimestral" ? 6
                        : 3;
        for (let p = 1; p <= maxPeriod; p++) {
          const existing = rows.find(r => r.type === oblType.type && r.period === p);
          derrotero.push({
            id: existing?.id ?? null,
            type: oblType.type,
            label: oblType.label,
            description: oblType.description,
            periodType: oblType.periodType,
            period: p,
            periodLabel: getPeriodLabel(oblType.type, p, input.year),
            year: input.year,
            status: existing?.status ?? "pendiente",
            amount: existing?.amount ?? null,
            notes: existing?.notes ?? null,
            dueDate: existing?.dueDate ?? null,
            completedAt: existing?.completedAt ?? null,
          });
        }
      }

      return derrotero;
    }),

  // ── Marcar obligación como pagada/declarada ──────────────────────────────
  markObligation: protectedProcedure
    .input(z.object({
      type: z.enum(["seguridad_social", "retencion", "ica", "iva"]),
      year: z.number(),
      period: z.number(),
      status: z.enum(["pendiente", "pagado", "declarado"]),
      amount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const oblMeta = OBLIGATION_TYPES.find(o => o.type === input.type)!;
      const now = new Date().toISOString();

      const existing = await db
        .select()
        .from(taxObligations)
        .where(and(
          eq(taxObligations.type, input.type),
          eq(taxObligations.year, input.year),
          eq(taxObligations.period, input.period),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(taxObligations)
          .set({
            status: input.status,
            amount: input.amount ? String(input.amount) : existing[0].amount,
            notes: input.notes ?? existing[0].notes,
            completedAt: input.status !== "pendiente" ? now : null,
            completedBy: input.status !== "pendiente" ? ctx.user.id : null,
            updatedAt: now,
          })
          .where(eq(taxObligations.id, existing[0].id));
        return { success: true, id: existing[0].id };
      } else {
        const [inserted] = await db.insert(taxObligations).values({
          type: input.type,
          year: input.year,
          period: input.period,
          periodType: oblMeta.periodType,
          status: input.status,
          amount: input.amount ? String(input.amount) : undefined,
          notes: input.notes,
          completedAt: input.status !== "pendiente" ? now : undefined,
          completedBy: input.status !== "pendiente" ? ctx.user.id : undefined,
          createdAt: now,
          updatedAt: now,
        }).returning({ id: taxObligations.id });
        return { success: true, id: inserted.id };
      }
    }),

  // ── Documentos: listar por año/mes opcional ──────────────────────────────
  listDocuments: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.number().min(1).max(12).optional(),
      obligationType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      let query = db.select().from(taxDocuments);
      const conditions = [];
      if (input.year) conditions.push(eq(taxDocuments.year, input.year));
      if (input.month) conditions.push(eq(taxDocuments.month, input.month));
      if (input.obligationType) conditions.push(eq(taxDocuments.obligationType, input.obligationType));

      const rows = conditions.length
        ? await db.select().from(taxDocuments).where(and(...conditions)).orderBy(desc(taxDocuments.createdAt))
        : await db.select().from(taxDocuments).orderBy(desc(taxDocuments.createdAt));

      return rows;
    }),

  // ── Documentos: registrar documento subido ──────────────────────────────
  addDocument: protectedProcedure
    .input(z.object({
      obligationType: z.enum(["seguridad_social", "retencion", "ica", "iva", "nomina", "otro"]),
      year: z.number(),
      month: z.number().min(1).max(12),
      fileName: z.string(),
      fileData: z.string(), // base64
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { storagePut } = await import("../storage");
      const timestamp = Date.now();
      const ext = input.fileName.split(".").pop() || "pdf";
      const key = `contador/${input.year}/${input.month}/${input.obligationType}_${timestamp}.${ext}`;

      // Decodificar base64 y subir a S3
      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileUrl = await storagePut(key, buffer, "application/pdf");

      const now = new Date().toISOString();
      const [doc] = await db.insert(taxDocuments).values({
        obligationType: input.obligationType,
        year: input.year,
        month: input.month,
        fileName: input.fileName,
        fileUrl,
        description: input.description,
        uploadedBy: ctx.user.id,
        createdAt: now,
      }).returning();

      return { success: true, id: doc.id, fileUrl };
    }),

  // ── Proyectos para DIAN: datos de facturación electrónica ───────────────
  getProjectsDIAN: protectedProcedure
    .input(z.object({
      status: z.string().optional(), // filtrar por estado
    }))
    .query(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Traer proyectos con datos del cliente
      const rows = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectStatus: projects.status,
          projectTotal: projects.totalAmount,
          projectCreatedAt: projects.createdAt,
          clientName: clients.name,
          clientDocType: clients.documentType,
          clientDocNumber: clients.documentNumber,
          clientEmail: clients.email,
          clientPhone: clients.phone,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(input.status ? eq(projects.status, input.status) : undefined)
        .orderBy(desc(projects.createdAt))
        .limit(200);

      return rows;
    }),

  // ── Eliminar documento ───────────────────────────────────────────────────
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireContador(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db.delete(taxDocuments).where(eq(taxDocuments.id, input.id));
      return { success: true };
    }),
});
