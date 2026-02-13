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


export const expensesRouter = router({
    // Crear un nuevo gasto
    create: protectedProcedure
      .input(z.object({
        expenseType: z.enum(["materiales_proyecto", "gasto_operativo"]),
        projectId: z.number().optional(),
        projectClientName: z.string().optional(),
        generalCategory: z.enum(["materiales", "mano_de_obra", "alquiler", "servicios", "transporte", "mantenimiento", "otros"]),
        subcategory: z.string().optional(),
        operativeCategory: z.enum([
          "arriendo", "energia", "agua", "internet", "mantenimiento",
          "herramientas", "jardineria", "reparaciones", "transporte",
          "papeleria", "aseo", "otro"
        ]).optional(),
        description: z.string().min(1, "La descripción es requerida"),
        amount: z.number().positive("El valor debe ser mayor a 0"),
        expenseDate: z.string(), // ISO date string
        supportUrl: z.string().optional(),
        supportFileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin y comercial pueden registrar gastos
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para registrar gastos" 
          });
        }

        // Validar que si es gasto de materiales, tenga proyecto o nombre de cliente
        if (input.expenseType === "materiales_proyecto" && !input.projectId && !input.projectClientName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debe especificar el proyecto o cliente para gastos de materiales"
          });
        }

        // Validar que si es gasto operativo, tenga categoría
        if (input.expenseType === "gasto_operativo" && !input.operativeCategory) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debe especificar la categoría para gastos operativos"
          });
        }

        const expenseId = await db.createExpense({
          expenseType: input.expenseType,
          projectId: input.projectId || null,
          projectClientName: input.projectClientName || null,
          generalCategory: input.generalCategory,
          subcategory: input.subcategory || null,
          operativeCategory: input.operativeCategory || null,
          description: sanitizeText(input.description),
          amount: input.amount.toString(),
          expenseDate: new Date(input.expenseDate),
          supportUrl: input.supportUrl || null,
          supportFileName: input.supportFileName || null,
          createdBy: ctx.user.id,
        });

        return { success: true, expenseId };
      }),

    // Obtener todos los gastos
    getAll: protectedProcedure
      .input(z.object({
        type: z.enum(["all", "materiales_proyecto", "gasto_operativo"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para ver gastos" 
          });
        }

        let expenses;
        
        if (input?.startDate && input?.endDate) {
          expenses = await db.getExpensesByDateRange(
            new Date(input.startDate),
            new Date(input.endDate)
          );
        } else if (input?.type && input.type !== "all") {
          expenses = await db.getExpensesByType(input.type);
        } else {
          expenses = await db.getAllExpenses();
        }

        // Obtener información de usuarios que crearon los gastos
        const userIdsSet = new Set<number>();
        expenses.forEach(e => userIdsSet.add(e.createdBy));
        const userIds: number[] = [];
        userIdsSet.forEach(id => userIds.push(id));
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        return expenses.map(expense => ({
          ...expense,
          amount: parseFloat(expense.amount as string),
          createdByUser: userMap.get(expense.createdBy) || null,
        }));
      }),

    getAllPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        expenseType: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await db.getAllExpensesPaginated({
          page: input?.page,
          limit: input?.limit,
          expenseType: input?.expenseType,
        });
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));
        return {
          ...result,
          data: result.data.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount as string),
            createdByUser: userMap.get(expense.createdBy) || null,
          })),
        };
      }),

    // Obtener gasto por ID
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para ver gastos" 
          });
        }

        const expense = await db.getExpenseById(input);
        if (!expense) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Gasto no encontrado" });
        }

        return {
          ...expense,
          amount: parseFloat(expense.amount as string),
        };
      }),

    // Obtener gastos por proyecto
    getByProject: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para ver gastos" 
          });
        }

        const expenses = await db.getExpensesByProjectId(input);
        return expenses.map(e => ({
          ...e,
          amount: parseFloat(e.amount as string),
        }));
      }),

    // Actualizar gasto
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        amount: z.number().positive().optional(),
        expenseDate: z.string().optional(),
        supportUrl: z.string().optional(),
        supportFileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para editar gastos" 
          });
        }

        const { id, ...data } = input;
        const updateData: any = {};
        
        if (data.description) updateData.description = data.description;
        if (data.amount) updateData.amount = data.amount.toString();
        if (data.expenseDate) updateData.expenseDate = new Date(data.expenseDate);
        if (data.supportUrl !== undefined) updateData.supportUrl = data.supportUrl;
        if (data.supportFileName !== undefined) updateData.supportFileName = data.supportFileName;

        await db.updateExpense(id, updateData);
        return { success: true };
      }),

    // Eliminar gasto
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin puede eliminar gastos
        if (ctx.user.role !== "super_admin") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo el super administrador puede eliminar gastos" 
          });
        }

        await db.deleteExpense(input);
        return { success: true };
      }),

    // Obtener resumen de gastos
    getSummary: protectedProcedure
      .query(async ({ ctx }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para ver el resumen de gastos" 
          });
        }

        const [byType, byCategory, byProject, byGeneralCategory] = await Promise.all([
          db.getExpensesSummaryByType(),
          db.getOperativeExpensesSummaryByCategory(),
          db.getProjectExpensesSummary(),
          db.getExpensesSummaryByGeneralCategory(),
        ]);

        return {
          byType: byType.map(t => ({
            ...t,
            total: parseFloat(t.total),
          })),
          byCategory: byCategory.map(c => ({
            ...c,
            total: parseFloat(c.total),
          })),
          byProject: byProject.map(p => ({
            ...p,
            total: parseFloat(p.total),
          })),
          byGeneralCategory: byGeneralCategory.map(g => ({
            ...g,
            total: parseFloat(g.total),
          })),
        };
      }),

    // Obtener lista de proyectos para selector
    getProjectsForSelect: protectedProcedure
      .query(async ({ ctx }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos" 
          });
        }

        const projects = await db.getAllProjects();
        const clients = await db.getAllClients();
        const clientMap = new Map(clients.map(c => [c.id, c]));

        return projects.map(p => ({
          id: p.id,
          name: p.name,
          clientName: clientMap.get(p.clientId)?.name || "Sin cliente",
        }));
      }),

    // Subir soporte de gasto
    uploadSupport: protectedProcedure
      .input(z.object({
        photoData: z.string(), // Base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para subir soportes" 
          });
        }

        // Extraer el contenido base64 (remover el prefijo data:...)
        const base64Content = input.photoData.split(",")[1] || input.photoData;
        const buffer = Buffer.from(base64Content, "base64");
        
        // Determinar el tipo MIME
        const mimeMatch = input.photoData.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        
        // Generar key único
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = input.fileName.split(".").pop() || "jpg";
        const key = `gastos/${timestamp}-${randomSuffix}.${extension}`;
        
        // Subir a S3
        const { storagePut } = await import("../storage");
        const result = await storagePut(key, buffer, mimeType);
        
        return {
          url: result.url,
          fileName: input.fileName,
        };
      }),
});

