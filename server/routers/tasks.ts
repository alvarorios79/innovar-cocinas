import { validateTaskAssignmentPermission } from "./helpers";
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


export const tasksRouter = router({
    // Crear tarea
    create: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        title: z.string().min(1, "El título es requerido"),
        description: z.string().optional(),
        priority: z.enum(["alta", "media", "baja"]).default("media"),
        dueDate: z.date().optional(),
        assignedTo: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Obtener el usuario asignado para validar su rol
        const assignedUser = await db.getUserById(input.assignedTo);
        if (!assignedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Validar permisos de asignación según la matriz
        const canAssign = validateTaskAssignmentPermission(ctx.user.role, assignedUser.role);
        if (!canAssign.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: canAssign.message });
        }

        const taskId = await db.createTask({
          ...input,
          dueDate: input.dueDate ? input.dueDate.toISOString() : undefined,
          assignedBy: ctx.user.id,
          status: "pendiente",
        });

        // Crear notificación para el usuario asignado
        const priorityLabels: Record<string, string> = {
          alta: "🔴 Alta",
          media: "🟡 Media",
          baja: "🟢 Baja",
        };
        
        let notificationBody = `${ctx.user.name || "Un administrador"} te ha asignado una nueva tarea: "${input.title}"`;
        notificationBody += `\nPrioridad: ${priorityLabels[input.priority] || input.priority}`;
        if (input.dueDate) {
          notificationBody += `\nFecha límite: ${new Date(input.dueDate).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`;
        }
        if (input.description) {
          notificationBody += `\n${input.description.substring(0, 100)}${input.description.length > 100 ? "..." : ""}`;
        }

        // Crear notificación en la base de datos
        await db.createNotification({
          userId: input.assignedTo,
          title: "📝 Nueva tarea asignada",
          body: notificationBody,
          type: "tarea",
          referenceId: taskId,
          referenceType: "task",
        });

        // Intentar enviar notificación push (no bloquea si falla)
        try {
          const { createAndSendNotification } = await import("../push-notifications");
          await createAndSendNotification(input.assignedTo, {
            title: "📝 Nueva tarea asignada",
            body: `${ctx.user.name || "Alguien"} te asignó: ${input.title}`,
            type: "tarea",
            url: "/tasks",
          });
        } catch (e) {
          // Silenciar error de push - la notificación en app ya se creó

        }

        // Enviar email de notificación de tarea (no bloquea si falla)
        let assignedUserForEmail: any = null;
        try {
          assignedUserForEmail = await db.getUserById(input.assignedTo);
          if (assignedUserForEmail?.email) {
            const { sendEmail } = await import("../email");
            const { taskAssignedEmailTemplate } = await import("../email-templates");
            const emailData = taskAssignedEmailTemplate({
              recipientName: assignedUserForEmail.name || "Usuario",
              taskTitle: input.title,
              taskDescription: input.description,
              priority: input.priority,
              dueDate: input.dueDate,
              assignedBy: ctx.user.name || "Un administrador",
              portalUrl: `${process.env.VITE_APP_URL || ""}/tasks`,
            });
            await sendEmail({
              to: assignedUserForEmail.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          }
        } catch (e) {
          // Silenciar error de email - la notificación en app ya se creó
        }

        // Generar enlace de WhatsApp para el usuario asignado
        let whatsAppLink = null;
        if (assignedUser) {
          const companyPhone = "3136802025"; // Número de INNOVAR (fallback)
          const userPhone = assignedUser.phone?.replace(/\D/g, '') || companyPhone;
          const phoneWithCountry = userPhone.startsWith('57') ? userPhone : `57${userPhone}`;
          
          const whatsAppMessage = encodeURIComponent(
            `📝 *NUEVA TAREA ASIGNADA*\n\n` +
            `*Título:* ${input.title}\n` +
            `*Prioridad:* ${priorityLabels[input.priority] || input.priority}\n` +
            `*Asignado a:* ${assignedUser.name || "Usuario"}\n` +
            (input.dueDate ? `*Fecha límite:* ${new Date(input.dueDate).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}\n` : "") +
            (input.description ? `\n📝 *Descripción:*\n${input.description.substring(0, 200)}${input.description.length > 200 ? "..." : ""}\n` : "") +
            `\nPor favor revisa tus tareas pendientes.`
          );
          whatsAppLink = `https://wa.me/${phoneWithCountry}?text=${whatsAppMessage}`;
        }

        return { 
          success: true, 
          taskId,
          whatsAppLink,
          assignedUserName: assignedUser?.name || null,
          assignedUserPhone: assignedUser?.phone || null
        };
      }),

    // Obtener mis tareas
    getMyTasks: protectedProcedure
      .query(async ({ ctx }) => {
        const tasksList = await db.getTasksByAssignedTo(ctx.user.id);
        
        // Obtener info de proyectos asociados
        const projectIds = Array.from(new Set(tasksList.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(
          projectIds.map(id => db.getProjectById(id))
        );
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));

        // Obtener info de quién asignó y quién envió el último recordatorio
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        return tasksList.map(t => ({
          ...t,
          project: t.projectId ? projectMap.get(t.projectId) : null,
          assignedByUser: userMap.get(t.assignedBy),
          lastReminderSentByUser: t.lastReminderSentBy ? userMap.get(t.lastReminderSentBy) : null,
        }));
      }),

    // Obtener todas las tareas (admin, super_admin, comercial) o filtradas para jefe_taller
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const canViewAll = ["admin", "super_admin", "comercial"];
        const canViewFiltered = ["jefe_taller", "disenador"];

        if (!canViewAll.includes(ctx.user.role) && !canViewFiltered.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver todas las tareas" });
        }

        // Optimización: ejecutar consultas en paralelo
        const [tasksList, allUsers] = await Promise.all([
          db.getAllTasks(),
          db.getAllUsers(),
        ]);
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        // Jefe de taller y diseñador solo ven tareas asignadas a ellos o que ellos asignaron
        let filteredTasks = tasksList;
        if (ctx.user.role === "jefe_taller" || ctx.user.role === "disenador") {
          filteredTasks = tasksList.filter(t =>
            t.assignedTo === ctx.user.id || t.assignedBy === ctx.user.id
          );
        }
        
        // Obtener info de proyectos asociados
        const projectIds = Array.from(new Set(filteredTasks.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(
          projectIds.map(id => db.getProjectById(id))
        );
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));

        return filteredTasks.map(t => ({
          ...t,
          assignedToUser: userMap.get(t.assignedTo),
          assignedByUser: userMap.get(t.assignedBy),
          project: t.projectId ? projectMap.get(t.projectId) : null,
          lastReminderSentByUser: t.lastReminderSentBy ? userMap.get(t.lastReminderSentBy) : null,
        }));
      }),

    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        status: z.string().optional(),
        assignedTo: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const canViewAll = ["admin", "super_admin", "comercial"];
        const canViewFiltered = ["jefe_taller"];
        if (!canViewAll.includes(ctx.user.role) && !canViewFiltered.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await db.getAllTasksPaginated({
          page: input?.page,
          limit: input?.limit,
          status: input?.status,
          assignedTo: input?.assignedTo,
        });
        const allUsers = await db.getAllUsers();
        const userMap = new Map(allUsers.map(u => [u.id, u]));
        let filteredData = result.data;
        if (ctx.user.role === "jefe_taller") {
          filteredData = filteredData.filter(t => t.assignedTo === ctx.user.id || t.assignedBy === ctx.user.id);
        }
        const projectIds = Array.from(new Set(filteredData.filter(t => t.projectId).map(t => t.projectId!)));
        const projectsInfo = await Promise.all(projectIds.map(id => db.getProjectById(id)));
        const projectMap = new Map(projectsInfo.filter(Boolean).map(p => [p!.id, p]));
        return {
          ...result,
          data: filteredData.map(t => ({
            ...t,
            assignedToUser: userMap.get(t.assignedTo),
            assignedByUser: userMap.get(t.assignedBy),
            project: t.projectId ? projectMap.get(t.projectId) : null,
            lastReminderSentByUser: t.lastReminderSentBy ? userMap.get(t.lastReminderSentBy) : null,
          })),
        };
      }),

    // Obtener tareas por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByProjectId(input.projectId);
      }),

    // Actualizar estado de tarea
    updateStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pendiente", "en_progreso", "completada"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Solo el asignado, admin o comercial puede cambiar el estado
        if (task.assignedTo !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar esta tarea" });
        }

        const updateData: any = { status: input.status };
        if (input.status === "completada") {
          updateData.completedAt = new Date();
        }

        await db.updateTask(input.taskId, updateData);
        return { success: true };
      }),

    // Eliminar tarea
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Verificar permisos de eliminación
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
        const isCreator = task.assignedBy === ctx.user.id;
        const isJefeTaller = ctx.user.role === "jefe_taller";
        
        // Admin y super_admin pueden eliminar cualquier tarea
        // Otros usuarios solo pueden eliminar tareas que crearon
        if (!isAdmin && !isCreator) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar esta tarea" });
        }
        
        // Jefe de taller solo puede eliminar tareas completadas
        if (isJefeTaller && !isAdmin && task.status !== "completada") {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Solo puedes eliminar tareas que estén completadas" 
          });
        }

        await db.deleteTask(input.id);
        return { success: true };
      }),

    // Enviar recordatorio de tarea
    sendReminder: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getTaskById(input.taskId);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tarea no encontrada" });
        }

        // Solo quien creó la tarea, admin, super_admin o comercial puede enviar recordatorio
        if (task.assignedBy !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar recordatorio de esta tarea" });
        }

        // No enviar recordatorio si la tarea ya está completada
        if (task.status === "completada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se puede enviar recordatorio de una tarea completada" });
        }

        // Crear notificación de recordatorio
        const priorityLabels: Record<string, string> = {
          alta: "🔴 Alta",
          media: "🟡 Media",
          baja: "🟢 Baja",
        };

        let notificationBody = `${ctx.user.name || "Un administrador"} te envía un recordatorio sobre la tarea: "${task.title}"`;
        notificationBody += `\nPrioridad: ${priorityLabels[task.priority] || task.priority}`;
        notificationBody += `\nEstado actual: ${task.status === "pendiente" ? "Pendiente" : "En Progreso"}`;
        if (task.dueDate) {
          notificationBody += `\nFecha límite: ${new Date(task.dueDate).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`;
        }

        await db.createNotification({
          userId: task.assignedTo,
          title: "⏰ Recordatorio de tarea",
          body: notificationBody,
          type: "tarea",
          referenceId: task.id,
          referenceType: "task",
        });

        // Intentar enviar notificación push
        try {
          const { createAndSendNotification } = await import("../push-notifications");
          await createAndSendNotification(task.assignedTo, {
            title: "⏰ Recordatorio de tarea",
            body: `${ctx.user.name || "Alguien"} te recuerda: ${task.title}`,
            type: "tarea",
            url: "/tasks",
          });
        } catch (e) {
          // Silenciar error de push
        }

        // Actualizar historial de recordatorios en la tarea
        await db.updateTaskReminderHistory(input.taskId, ctx.user.id);

        // Generar enlace de WhatsApp para el usuario asignado
        let whatsAppLink = null;
        const assignedUser = await db.getUserById(task.assignedTo);
        if (assignedUser) {
          const companyPhone = "3136802025"; // Número de INNOVAR (fallback)
          const userPhone = assignedUser.phone?.replace(/\D/g, '') || companyPhone;
          const phoneWithCountry = userPhone.startsWith('57') ? userPhone : `57${userPhone}`;
          
          const whatsAppMessage = encodeURIComponent(
            `⏰ *RECORDATORIO DE TAREA*\n\n` +
            `Hola ${assignedUser.name || ""}, te recuerdo que tienes una tarea pendiente:\n\n` +
            `*Título:* ${task.title}\n` +
            `*Prioridad:* ${priorityLabels[task.priority] || task.priority}\n` +
            `*Estado:* ${task.status === "pendiente" ? "Pendiente" : "En Progreso"}\n` +
            (task.dueDate ? `*Fecha límite:* ${new Date(task.dueDate).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}\n` : "") +
            (task.description ? `\n📝 *Descripción:*\n${task.description.substring(0, 200)}${task.description.length > 200 ? "..." : ""}\n` : "") +
            `\nPor favor revisa tus tareas pendientes. 🙏`
          );
          whatsAppLink = `https://wa.me/${phoneWithCountry}?text=${whatsAppMessage}`;
        }

        return { 
          success: true,
          whatsAppLink,
          assignedUserName: assignedUser?.name || null
        };
      }),

    // Reasignar múltiples tareas a otro usuario
    bulkReassign: protectedProcedure
      .input(z.object({
        taskIds: z.array(z.number()).min(1, "Debes seleccionar al menos una tarea"),
        newAssignedTo: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que el usuario puede reasignar tareas
        const canReassignRoles = ["super_admin", "admin", "comercial", "jefe_taller"];
        if (!canReassignRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para reasignar tareas" });
        }

        // Verificar que el nuevo asignado es válido
        const newAssignee = await db.getUserById(input.newAssignedTo);
        if (!newAssignee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        // Verificar que el nuevo asignado es del equipo de trabajo
        const workTeamRoles = ["super_admin", "comercial", "disenador", "jefe_taller", "operario"];
        if (!workTeamRoles.includes(newAssignee.role)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo puedes reasignar tareas a miembros del equipo de trabajo" });
        }

        // Reasignar cada tarea
        let reassignedCount = 0;
        const errors: string[] = [];

        for (const taskId of input.taskIds) {
          try {
            const task = await db.getTaskById(taskId);
            if (!task) {
              errors.push(`Tarea ${taskId} no encontrada`);
              continue;
            }

            // No reasignar tareas completadas
            if (task.status === "completada") {
              errors.push(`Tarea "${task.title}" ya está completada`);
              continue;
            }

            // Actualizar la tarea
            await db.updateTask(taskId, {
              assignedTo: input.newAssignedTo,
            });

            reassignedCount++;

            // Crear notificación para el nuevo asignado
            await db.createNotification({
              userId: input.newAssignedTo,
              title: "📝 Nueva tarea asignada",
              body: `${ctx.user.name || "Un administrador"} te ha reasignado la tarea: "${task.title}"`,
              type: "tarea",
              referenceId: taskId,
              referenceType: "task",
            });

            // Intentar enviar notificación push
            try {
              const { createAndSendNotification } = await import("../push-notifications");
              await createAndSendNotification(input.newAssignedTo, {
                title: "📝 Nueva tarea asignada",
                body: `${ctx.user.name || "Alguien"} te ha reasignado: ${task.title}`,
                type: "tarea",
                url: "/tasks",
              });
            } catch (e) {
              // Silenciar error de push
            }
          } catch (e) {
            errors.push(`Error al reasignar tarea ${taskId}`);
          }
        }

        return {
          success: reassignedCount > 0,
          reassignedCount,
          totalRequested: input.taskIds.length,
          errors: errors.length > 0 ? errors : undefined,
          newAssigneeName: newAssignee.name,
        };
      }),

    // Obtener usuarios a los que puedo asignar tareas (solo equipo de trabajo)
    getAssignableUsers: protectedProcedure
      .query(async ({ ctx }) => {
        const allUsers = await db.getAllUsers();
        const myRole = ctx.user.role;
        
        // Matriz de permisos: quién puede asignar tareas a qué roles
        const permissionMatrix: Record<string, string[]> = {
          super_admin: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          admin: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          comercial: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          disenador: ["super_admin", "admin", "jefe_taller"],
          jefe_taller: ["super_admin", "admin", "comercial", "disenador", "operario"],
          operario: ["disenador", "jefe_taller"],
        };
        
        const allowedRoles = permissionMatrix[myRole];
        if (!allowedRoles) {
          return [];
        }

        // Filtrar usuarios cuyo rol está en la lista permitida
        return allUsers
          .filter(u => allowedRoles.includes(u.role))
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          }));
      }),
});

