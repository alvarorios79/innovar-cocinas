import { validatePhotoUploadPermission, validateStatusChange } from "./helpers";
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
import { eq, and, desc } from "drizzle-orm";
import { projects, projectDetails, projectPhotos } from "../../drizzle/schema";


export const projectsRouter = router({
    // Crear proyecto (Admin/Comercial)
    create: protectedProcedure
      .input(z.object({
        quotationId: z.number().optional(),
        clientId: z.number(),
        name: z.string().min(1, "El nombre es requerido"),
        workType: z.enum(["cocina", "closet", "puertas", "centro_tv"]),
        initialMeasurements: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin y comercial pueden crear proyectos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden crear proyectos" });
        }

        // Si se proporciona quotationId, obtener la última versión aprobada
        let finalQuotationId = input.quotationId;
        if (finalQuotationId) {
          const latestVersion = await db.getLatestApprovedQuotationVersion(finalQuotationId);
          if (latestVersion) {
            finalQuotationId = latestVersion.id;
          }
        }
        // Calcular fecha TENTATIVA de instalación: 25 días hábiles desde hoy
        const tentativeDate = await addBusinessDays(new Date(), 25);
        
        // Asignar automáticamente el diseñador con menos proyectos activos
        const autoAssignedDesignerId = await db.getDesignerWithLeastActiveProjects();
        
        const projectId = await db.createProject({
          quotationId: finalQuotationId,
          clientId: input.clientId,
          name: input.name,
          workType: input.workType,
          initialMeasurements: input.initialMeasurements,
          status: "cotizacion_enviada",
          quotationSentAt: new Date(),
          createdBy: ctx.user.id,
          tentativeInstallDate: tentativeDate,
          isInstallDateOfficial: false,
          designerId: autoAssignedDesignerId,
        });

        // Registrar en historial
        await db.createProjectStatusHistory({
          projectId,
          fromStatus: null,
          toStatus: "cotizacion_enviada",
          changedBy: ctx.user.id,
          notes: "Proyecto creado - Cotización enviada",
        });
        
        // Notificar al diseñador asignado
        if (autoAssignedDesignerId) {
          const clientData = await db.getClientById(input.clientId);
          await db.createNotification({
            userId: autoAssignedDesignerId,
            title: "🎨 Nuevo Proyecto Asignado",
            body: `Se te ha asignado automáticamente el proyecto "${input.name}" del cliente ${clientData?.name || "Cliente"}.`,
            type: "proyecto",
            referenceId: projectId,
            referenceType: "project",
          });
        }

        return { success: true, projectId };
      }),

    // Obtener todos los proyectos (filtrados por rol)
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        let projectsList;

        // Filtrar por estado si se proporciona
        if (input?.status) {
          projectsList = await db.getProjectsByStatus(input.status);
        } else {
          projectsList = await db.getAllProjects();
        }

        // Diseñador ve proyectos desde adelanto recibido hasta entregado
        // (necesita ver proyectos en producción para responder consultas del jefe de taller/operario)
        if (role === "disenador") {
          projectsList = projectsList.filter(p => 
            ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion", "entregado"].includes(p.status)
          );
        }

        // Jefe de taller ve proyectos desde diseño listo hasta entregado
        if (role === "jefe_taller") {
          projectsList = projectsList.filter(p => 
            ["pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion", "entregado"].includes(p.status)
          );
        }
        
        // Operario ve los mismos proyectos que el jefe de taller (desde diseño listo hasta entregado)
        if (role === "operario") {
          projectsList = projectsList.filter(p => 
            ["pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"].includes(p.status)
          );
        }

        // Obtener info de clientes
        const allClients = await db.getAllClients();
        const clientMap = new Map(allClients.map(c => [c.id, c]));

        return projectsList.map(p => ({
          ...p,
          client: clientMap.get(p.clientId),
        }));
      }),

    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        status: z.string().optional(),
        archived: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        const result = await db.getAllProjectsPaginated({
          page: input?.page,
          limit: input?.limit,
          status: input?.status,
          archived: input?.archived,
        });
        let filteredData = result.data;
        if (role === "disenador") {
          filteredData = filteredData.filter(p => 
            ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"].includes(p.status)
          );
        }
        if (role === "jefe_taller") {
          filteredData = filteredData.filter(p => 
            ["pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"].includes(p.status)
          );
        }
        if (role === "operario") {
          filteredData = filteredData.filter(p => 
            ["pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"].includes(p.status)
          );
        }
        const allClients = await db.getAllClients();
        const clientMap = new Map(allClients.map(c => [c.id, c]));
        return {
          ...result,
          data: filteredData.map(p => ({ ...p, client: clientMap.get(p.clientId) })),
        };
      }),

    // Obtener proyecto por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        console.log("[DEBUG getById] ID recibido:", input.id, "tipo:", typeof input.id);
        const project = await db.getProjectById(input.id);
        console.log("[DEBUG getById] Proyecto encontrado:", project ? `ID ${project.id}` : "NULL");
        if (!project) {
          console.log("[DEBUG getById] ERROR: Proyecto no encontrado para ID", input.id);
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Optimización: ejecutar consultas en paralelo
        const [client, photosRaw, details, history, projectTasks, quotation, payments, clientAppointments, clientRevisions, totalPaidFromPayments, projectBalance] = await Promise.all([
          db.getClientById(project.clientId),
          db.getProjectPhotosByProjectId(input.id),
          db.getProjectDetailsByProjectId(input.id),
          db.getProjectStatusHistoryByProjectId(input.id),
          db.getTasksByProjectId(input.id),
          project.quotationId ? db.getQuotationById(project.quotationId) : Promise.resolve(null),
          db.getPaymentsByProjectId(input.id),
          db.getAppointmentsByClientId(project.clientId),
          db.getClientRevisionsByProjectId(input.id),
          db.getTotalPaidByProjectId(input.id),
          db.calculateProjectBalance(input.id),
        ]);
        const totalPaid = totalPaidFromPayments || (payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0));
        
        // Usar las fotos con sus URLs originales
        const photos = photosRaw;
        
        // Calcular información financiera
        const quotationTotal = quotation?.total ? Number(quotation.total) : 0;
        const projectAdvance = project.advanceAmount ? Number(project.advanceAmount) : 0;
        const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
        const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
        // Usar total pagado si hay pagos registrados, sino usar el adelanto
        const actualPaid = totalPaid > 0 ? totalPaid : advanceAmount;
        const remainingAmount = totalAmount - actualPaid;

        // === HISTORIAL UNIFICADO ===
        // Combinar eventos de cliente, citas, cotización y proyecto en orden cronológico
        type UnifiedHistoryEvent = {
          id: number;
          type: 'client' | 'appointment' | 'quotation' | 'project';
          previousStatus: string | null;
          newStatus: string;
          notes: string | null;
          changedBy: string | null;
          createdAt: Date;
        };
        
        const unifiedHistory: UnifiedHistoryEvent[] = [];
        let eventId = 1;
        
        // 1. Evento de creación del cliente (contacto)
        if (client) {
          unifiedHistory.push({
            id: eventId++,
            type: 'client',
            previousStatus: null,
            newStatus: 'contacto',
            notes: `Cliente "${client.name}" creado en el sistema`,
            changedBy: null,
            createdAt: new Date(client.createdAt),
          });
        }
        
        // 2. Eventos de citas (contacto - visita de medidas)
        if (clientAppointments && clientAppointments.length > 0) {
          // Ordenar citas por fecha de creación
          const sortedAppointments = [...clientAppointments].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          for (const appointment of sortedAppointments) {
            // Evento de cita programada
            unifiedHistory.push({
              id: eventId++,
              type: 'appointment',
              previousStatus: 'contacto',
              newStatus: 'contacto',
              notes: `Cita programada para ${appointment.scheduledDate ? new Date(appointment.scheduledDate).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : 'fecha pendiente'}${appointment.notes ? ` - ${appointment.notes}` : ''}`,
              changedBy: null,
              createdAt: new Date(appointment.createdAt),
            });
            
            // Si la cita fue completada, agregar evento
            if (appointment.status === 'completada' && appointment.updatedAt) {
              unifiedHistory.push({
                id: eventId++,
                type: 'appointment',
                previousStatus: 'contacto',
                newStatus: 'contacto',
                notes: `Visita realizada - Cita completada`,
                changedBy: null,
                createdAt: new Date(appointment.updatedAt),
              });
            }
          }
        }
        
        // 3. Eventos de cotización
        if (quotation) {
          // Cotización creada
          unifiedHistory.push({
            id: eventId++,
            type: 'quotation',
            previousStatus: 'contacto',
            newStatus: 'cotizacion_enviada',
            notes: `Cotización ${quotation.quotationNumber} creada`,
            changedBy: null,
            createdAt: new Date(quotation.createdAt),
          });
          
          // Cotización enviada
          if (quotation.sentAt) {
            unifiedHistory.push({
              id: eventId++,
              type: 'quotation',
              previousStatus: 'cotizacion_enviada',
              newStatus: 'cotizacion_enviada',
              notes: `Cotización ${quotation.quotationNumber} enviada al cliente`,
              changedBy: null,
              createdAt: new Date(quotation.sentAt),
            });
          }
          
          // Cotización aprobada
          if (quotation.approvedAt) {
            unifiedHistory.push({
              id: eventId++,
              type: 'quotation',
              previousStatus: 'cotizacion_enviada',
              newStatus: 'cotizacion_aprobada',
              notes: `Cotización ${quotation.quotationNumber} aprobada por el cliente`,
              changedBy: null,
              createdAt: new Date(quotation.approvedAt),
            });
          }
          
          // Cotización rechazada
          if (quotation.status === 'rejected' && quotation.rejectionReason) {
            unifiedHistory.push({
              id: eventId++,
              type: 'quotation',
              previousStatus: 'cotizacion_enviada',
              newStatus: 'cotizacion_enviada',
              notes: `Cotización ${quotation.quotationNumber} rechazada: ${quotation.rejectionReason}`,
              changedBy: null,
              createdAt: new Date(quotation.updatedAt),
            });
          }
        }
        
        // 4. Historial del proyecto (ya existente)
        for (const h of history) {
          unifiedHistory.push({
            id: eventId++,
            type: 'project',
            previousStatus: h.fromStatus,
            newStatus: h.toStatus,
            notes: h.notes,
            changedBy: h.changedByUser?.name || null,
            createdAt: new Date(h.createdAt),
          });
        }
        
        // Ordenar todo por fecha
        unifiedHistory.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const result = {
          ...project,
          quotationId: project.quotationId,
          client,
          photos,
          details,
          history: unifiedHistory,
          tasks: projectTasks,
          quotation,
          payments,
          clientRevisions,
          financialInfo: {
            // Base project amount
            totalAmount: projectBalance?.totalProject || 0,
            
            // Financial movements (EXCLUSIVELY from movements table)
            totalCobrado: projectBalance?.payments || 0,           // Total collected (payments only)
            totalPaid: projectBalance?.payments || 0,              // Same as totalCobrado
            totalDiscounts: projectBalance?.discounts || 0,        // Total discounts applied
            totalSurcharges: projectBalance?.surcharges || 0,      // Total surcharges applied
            
            // Calculated values based on movements
            adjustedTotal: projectBalance?.adjustedTotal || 0,     // Base + Surcharges - Discounts
            balance: projectBalance?.balance || 0,                 // Adjusted Total - Payments (remaining to collect)
            dynamicBalance: projectBalance?.balance || 0,          // Same as balance (for compatibility)
            
            // Percentages based on adjusted total
            advanceAmount: projectBalance?.payments || 0,
            advancePercentage: (projectBalance?.adjustedTotal || 0) > 0 ? Math.round(((projectBalance?.payments || 0) / (projectBalance?.adjustedTotal || 0)) * 100) : 0,
            actualPaid: projectBalance?.payments || 0,
            remainingAmount: projectBalance?.balance || 0,
            remainingPercentage: (projectBalance?.adjustedTotal || 0) > 0 ? Math.round(((projectBalance?.balance || 0) / (projectBalance?.adjustedTotal || 0)) * 100) : 0,
            isPaid: (projectBalance?.balance || 0) <= 0,
            paymentProgress: (projectBalance?.adjustedTotal || 0) > 0 ? Math.round(((projectBalance?.payments || 0) / (projectBalance?.adjustedTotal || 0)) * 100) : 0,
            
            // Additional info for UI
            totalProjectAmount: projectBalance?.totalProject || 0,
            totalPayments: projectBalance?.payments || 0,
          }
        };
        

        return result;
      }),

    // Obtener proyectos del cliente actual
    getMyProjects: protectedProcedure
      .query(async ({ ctx }) => {
        // Buscar cliente asociado al usuario
        const client = await db.getClientByUserId(ctx.user.id);
        if (!client) {
          return [];
        }

        const projectsList = await db.getProjectsByClientId(client.id);
        
        // Para cada proyecto, obtener fotos
        const projectsWithPhotos = await Promise.all(
          projectsList.map(async (p) => {
            const photos = await db.getProjectPhotosByProjectId(p.id);
            return { ...p, photos };
          })
        );

        return projectsWithPhotos;
      }),

    // Obtener un proyecto específico por ID para el cliente (desde enlace de WhatsApp)
    getProjectForClient: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        // Obtener el proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar acceso:
        // 1. Si es admin/super_admin/comercial, puede ver cualquier proyecto
        // 2. Si es cliente, verificar que el proyecto pertenezca a su cliente
        const isAdmin = ["admin", "super_admin", "comercial"].includes(ctx.user.role);
        
        if (!isAdmin) {
          // Buscar cliente asociado al usuario
          const client = await db.getClientByUserId(ctx.user.id);
          if (!client || project.clientId !== client.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
          }
        }

        // Obtener fotos del proyecto
        const photos = await db.getProjectPhotosByProjectId(project.id);
        
        // Obtener datos del cliente
        const clientData = await db.getClientById(project.clientId);

        return {
          ...project,
          photos,
          client: clientData,
        };
      }),

    // Cambiar estado del proyecto
    updateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        newStatus: z.enum([
          "cotizacion_enviada", "cotizacion_aprobada", "adelanto_recibido",
          "en_diseno", "pendiente_render", "aprobacion_final",
          "despiece", "corte", "enchape", "ensamble", 
          "listo_instalacion", "listo_instalacion", "entregado"
        ]),
        notes: z.string().optional(),
        advanceAmount: z.number().optional(),
        selectedColors: z.string().optional(),
        selectedMaterials: z.string().optional(),
        scheduledInstallDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const role = ctx.user.role;
        const currentStatus = project.status;
        const newStatus = input.newStatus;

        // Validar permisos según el cambio de estado
        const canChangeStatus = validateStatusChange(role, currentStatus, newStatus);
        if (!canChangeStatus) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "No tienes permisos para realizar este cambio de estado" 
          });
        }

        // Validación general: Etapas productivas requieren fotos antes de avanzar
        const stagesRequiringPhotos = ["corte", "enchape", "ensamble", "listo_instalacion"];
        
        if (stagesRequiringPhotos.includes(currentStatus)) {
          try {
            const dbInstance = await db.getDb();
            if (!dbInstance) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Base de datos no disponible"
              });
            }

            // Mapear estado del proyecto a categoría de fotos
            let photoCategory = "avance"; // corte, enchape, ensamble usan "avance"
            if (currentStatus === "listo_instalacion") {
              photoCategory = "instalacion";
            }

            const stagePhotos = await dbInstance.select().from(projectPhotos)
              .where(and(
                eq(projectPhotos.projectId, input.projectId),
                eq(projectPhotos.category, photoCategory as any)
              ));

            if (stagePhotos.length === 0) {
              console.error({
                action: "VALIDATION_FAILED",
                entity: "project",
                id: input.projectId,
                reason: `No photos found for stage: ${currentStatus}`,
                user: ctx.user.id,
                timestamp: new Date()
              });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `No se puede avanzar desde "${currentStatus}" sin subir fotos de esta etapa.`
              });
            }
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            console.error("Error validating stage photos:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Error validando fotos de la etapa"
            });
          }
        }

        // Validación especial: Fotos de instalación requeridas antes de marcar como entregado
        if (currentStatus === "listo_instalacion" && newStatus === "entregado") {
          try {
            const dbInstance = await db.getDb();
            if (!dbInstance) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Base de datos no disponible"
              });
            }

            const installationPhotos = await dbInstance.select().from(projectPhotos)
              .where(and(
                eq(projectPhotos.projectId, input.projectId),
                eq(projectPhotos.category, "instalacion")
              ));

            if (installationPhotos.length === 0) {
              console.error({
                action: "VALIDATION_FAILED",
                entity: "project",
                id: input.projectId,
                reason: "No installation photos found",
                user: ctx.user.id,
                timestamp: new Date()
              });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "No se puede marcar como Entregado sin subir fotos de Instalacion."
              });
            }
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            console.error("Error validating installation photos:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Error validando fotos de instalación"
            });
          }
        }

        // Registrar en historial
        await db.createProjectStatusHistory({
          projectId: input.projectId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy: ctx.user.id,
          notes: input.notes ? sanitizeText(input.notes) : undefined,
        });

        // Crear recordatorios automáticos según el nuevo estado
        await createRemindersForStatusChange(input.projectId, newStatus, {
          name: project.name,
          createdBy: project.createdBy,
          designerId: project.designerId,
          clientId: project.clientId,
        });

        // Actualizar fechas clave según el estado
        const updateData: Record<string, unknown> = { status: newStatus };
        
        // Estado 'cotizacion_enviada' se registra en el historial, no necesita campo adicional
        if (newStatus === "cotizacion_aprobada" && !project.quotationApprovedAt) {
          updateData.quotationApprovedAt = new Date();
        }
        if (newStatus === "adelanto_recibido" && !project.advanceReceivedAt) {
          updateData.advanceReceivedAt = new Date();
          if (input.advanceAmount) {
            updateData.advanceAmount = input.advanceAmount;
          }
        }
        if (newStatus === "aprobacion_final" && !project.clientApprovedAt) {
          updateData.clientApprovedAt = new Date();
          // Calcular fecha estimada de instalación (25 días hábiles)
          updateData.estimatedInstallDate = await calculateEstimatedDeliveryDate(new Date());
          updateData.isInstallDateOfficial = true; // Marcar como fecha oficial
          if (input.selectedColors) {
            updateData.selectedColors = input.selectedColors;
          }
          if (input.selectedMaterials) {
            updateData.selectedMaterials = input.selectedMaterials;
          }
        }
        if (newStatus === "listo_instalacion" && input.scheduledInstallDate) {
          updateData.scheduledInstallDate = input.scheduledInstallDate;
        }
        if (newStatus === "entregado" && !project.deliveredAt) {
          updateData.deliveredAt = new Date();
        }

        // Sincronizar isArchived con status: solo archivado si es "entregado"
        if (newStatus === "entregado") {
          updateData.isArchived = 1;
        } else {
          updateData.isArchived = 0;
        }

        await db.updateProject(input.projectId, updateData);

        // Notificar al diseñador cuando el proyecto pasa a "Cliente Confirmado - Iniciar Diseño"
        if (newStatus === "adelanto_recibido" && project.designerId) {
          try {
            // Crear notificación en la base de datos
            await db.createNotification({
              userId: project.designerId,
              title: "✨ Cliente Confirmado - Iniciar Diseño",
              body: `¡Nuevo proyecto listo para diseñar! El proyecto "${project.name}" está confirmado. Tienes 3 días hábiles para entregar el modelado.`,
              type: "proyecto",
              referenceId: project.id,
              referenceType: "project",
            });
            
            // Intentar enviar notificación push
            try {
              const { createAndSendNotification } = await import("../push-notifications");
              await createAndSendNotification(project.designerId, {
                title: "✨ Nuevo Proyecto para Diseñar",
                body: `"${project.name}" está listo. ¡A diseñar!`,
                type: "proyecto",
                url: `/projects/${project.id}`,
              });
            } catch (e) {
              // Silenciar error de push
            }
          } catch (e) {
            // Silenciar error de notificación
            console.error("Error notificando al diseñador:", e);
          }
        }

        // Notificar al jefe de taller cuando el operario avanza una etapa de producción
        const productionStages = ["enchape", "ensamble", "listo_instalacion"];
        if (role === "operario" && productionStages.includes(newStatus)) {
          try {
            const allUsers = await db.getAllUsers();
            const jefesTaller = allUsers.filter(u => u.role === "jefe_taller");
            
            const stageLabels: Record<string, string> = {
              enchape: "Enchape",
              ensamble: "Ensamble",
              listo_instalacion: "Listo para Instalación",
            };
            
            for (const jefe of jefesTaller) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: jefe.id,
                title: `🛠️ Avance de Producción por Operario`,
                body: `El operario ${ctx.user.name} avanzó el proyecto "${project.name}" a ${stageLabels[newStatus]}.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("../push-notifications");
                await createAndSendNotification(jefe.id, {
                  title: `🛠️ Avance: ${project.name}`,
                  body: `Operario avanzó a ${stageLabels[newStatus]}`,
                  type: "proyecto",
                  url: "/projects",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            // Silenciar error de notificación
          }
        }

        // Notificar al comercial cuando el proyecto entra a ensamble (para coordinar instalación)
        if (newStatus === "ensamble") {
          try {
            const allUsers = await db.getAllUsers();
            const comerciales = allUsers.filter(u => u.role === "comercial");
            const clientData = await db.getClientById(project.clientId);
            
            for (const comercial of comerciales) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: comercial.id,
                title: `🔔 Coordinar Instalación`,
                body: `El proyecto "${project.name}" de ${clientData?.name || 'Cliente'} entró a ENSAMBLE. Coordina la fecha de instalación.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("../push-notifications");
                await createAndSendNotification(comercial.id, {
                  title: `🔔 Coordinar Instalación`,
                  body: `${project.name} en ENSAMBLE - Programa instalación`,
                  type: "proyecto",
                  url: "/comercial",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            console.error("Error notificando al comercial:", e);
          }
        }

        // Variable para guardar credenciales del cliente (para WhatsApp)
        let savedClientCredentials: { email: string; password: string } | null = null;
        
        // Notificar al cliente cuando el diseño está listo (pendiente_render)
        if (newStatus === "pendiente_render") {
          try {
            const clientData = await db.getClientById(project.clientId);
            
            // Si es gestión interna, no enviar notificaciones al cliente
            if (clientData && clientData.internalManagement) {
              // No hacer nada más para clientes con gestión interna
            } else if (clientData) {
              // Variables para credenciales
              let clientCredentials: { email: string; password: string } | null = null;
              let clientUserId = clientData.userId;
              
              // Si el cliente tiene email pero no tiene usuario, crear uno con contraseña temporal
              if (clientData.email && !clientData.userId) {
                try {
                  // Verificar si ya existe un usuario con ese email
                  const existingUsers = await db.getAllUsers();
                  const existingUser = existingUsers.find(u => u.email?.toLowerCase() === clientData.email?.toLowerCase());
                  
                  if (existingUser) {
                    // Asociar cliente con usuario existente
                    await db.updateClient(clientData.id, { userId: existingUser.id });
                    clientUserId = existingUser.id;
                    
                    // Generar nueva contraseña temporal para el usuario existente
                    const { generateTemporaryPassword } = await import("../password-generator");
                    const { hashPassword } = await import("../password-auth");
                    const temporaryPassword = generateTemporaryPassword();
                    const hashedPassword = await hashPassword(temporaryPassword);
                    await db.updateUserPassword(existingUser.id, hashedPassword);
                    
                    clientCredentials = {
                      email: clientData.email,
                      password: temporaryPassword
                    };
                  } else {
                    // Crear nuevo usuario con contraseña temporal
                    const { generateTemporaryPassword } = await import("../password-generator");
                    const { hashPassword } = await import("../password-auth");
                    const temporaryPassword = generateTemporaryPassword();
                    const hashedPassword = await hashPassword(temporaryPassword);
                    
                    const newUserId = await db.createUserExtended({
                      name: clientData.name,
                      email: clientData.email,
                      role: "user",
                      passwordHash: hashedPassword,
                    });
                    
                    // Asociar cliente con nuevo usuario
                    await db.updateClient(clientData.id, { userId: newUserId });
                    clientUserId = newUserId;
                    
                    clientCredentials = {
                      email: clientData.email,
                      password: temporaryPassword
                    };
                  }
                } catch (e) {
                  console.error("Error creando usuario para cliente:", e);
                }
              } else if (clientData.email && clientData.userId) {
                // El cliente ya tiene usuario, generar nueva contraseña temporal
                try {
                  const { generateTemporaryPassword } = await import("../password-generator");
                  const { hashPassword } = await import("../password-auth");
                  const temporaryPassword = generateTemporaryPassword();
                  const hashedPassword = await hashPassword(temporaryPassword);
                  await db.updateUserPassword(clientData.userId, hashedPassword);
                  
                  clientCredentials = {
                    email: clientData.email,
                    password: temporaryPassword
                  };
                } catch (e) {
                  console.error("Error actualizando contraseña del cliente:", e);
                }
              }
              
              // Si el cliente tiene userId, crear notificación en la base de datos
              if (clientUserId) {
                await db.createNotification({
                  userId: clientUserId,
                  title: "🎨 ¡Tu Diseño está Listo!",
                  body: `El diseño de tu proyecto "${project.name}" está listo para tu revisión. Ingresa al portal para verlo y aprobarlo.`,
                  type: "proyecto",
                  referenceId: project.id,
                  referenceType: "project",
                });
                
                // Intentar enviar notificación push al cliente
                try {
                  const { createAndSendNotification } = await import("../push-notifications");
                  await createAndSendNotification(clientUserId, {
                    title: "🎨 ¡Tu Diseño está Listo!",
                    body: `El diseño de "${project.name}" está listo para tu aprobación`,
                    type: "proyecto",
                    url: "/portal",
                  });
                } catch (e) {
                  // Silenciar error de push
                }
              }
              
              // Enviar email al cliente si tiene email
              if (clientData.email) {
                try {
                  const { sendEmail } = await import("../email");
                  const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
                  const portalUrl = `${baseUrl}/login`;
                  
                  // Construir sección de credenciales si existen
                  const credentialsSection = clientCredentials ? `
                          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                            <h3 style="margin-top: 0; color: #065f46;">🔐 Tus Credenciales de Acceso</h3>
                            <p style="color: #047857; margin-bottom: 10px;">Usa estos datos para ingresar al portal:</p>
                            <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
                              <strong>Correo:</strong> ${clientCredentials.email}
                            </p>
                            <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 5px 0;">
                              <strong>Contraseña:</strong> ${clientCredentials.password}
                            </p>
                            <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                              ⚠️ Por seguridad, te recomendamos guardar esta contraseña en un lugar seguro.
                            </p>
                          </div>
                  ` : '';
                  
                  await sendEmail({
                    to: clientData.email,
                    subject: `🎨 ¡Tu Diseño está Listo! - ${project.name}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #8B5CF6, #6366F1); padding: 30px; text-align: center;">
                          <h1 style="color: white; margin: 0;">🎨 ¡Tu Diseño está Listo!</h1>
                        </div>
                        <div style="padding: 30px; background: #f9fafb;">
                          <p style="font-size: 16px; color: #374151;">Hola <strong>${clientData.name}</strong>,</p>
                          <p style="font-size: 16px; color: #374151;">
                            Nos complace informarte que el diseño de tu proyecto <strong>"${project.name}"</strong> está listo para tu revisión.
                          </p>
                          <p style="font-size: 16px; color: #374151;">
                            Por favor ingresa a tu portal para ver los renders, despieces y detalles del diseño. Una vez que lo revises, podrás aprobarlo o solicitar cambios.
                          </p>
                          ${credentialsSection}
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${portalUrl}" style="background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                              Ingresar al Portal
                            </a>
                          </div>
                          <p style="font-size: 14px; color: #6B7280;">
                            Tienes 2 días para revisar y aprobar el diseño. Si tienes alguna pregunta, no dudes en contactarnos.
                          </p>
                        </div>
                        <div style="background: #1F2937; padding: 20px; text-align: center;">
                          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                            INNOVAR Cocinas Integrales | K9 vía Cerritos a Pereira | Tel: 313 680 2025
                          </p>
                        </div>
                      </div>
                    `,
                  });
                } catch (e) {
                  // Silenciar error de email
                  console.error("Error enviando email al cliente:", e);
                }
              }
              
              // Guardar credenciales para WhatsApp
              if (clientCredentials) {
                savedClientCredentials = clientCredentials;
              }
              
              // Notificar a super_admin, admin y comercial
              const allUsers = await db.getAllUsers();
              const notifyRoles = ["super_admin", "admin", "comercial"];
              const usersToNotify = allUsers.filter(u => notifyRoles.includes(u.role));
              
              // Obtener el nombre del diseñador asignado al proyecto
              let designerName = ctx.user.name; // Por defecto, quien ejecuta la acción
              if (project.designerId) {
                const designer = allUsers.find(u => u.id === project.designerId);
                if (designer) {
                  designerName = designer.name || ctx.user.name;
                }
              }
              
              for (const user of usersToNotify) {
                await db.createNotification({
                  userId: user.id,
                  title: "🎨 Diseño Entregado al Cliente",
                  body: `El diseñador ${designerName} ha entregado el diseño del proyecto "${project.name}" al cliente ${clientData.name}.`,
                  type: "proyecto",
                  referenceId: project.id,
                  referenceType: "project",
                });
              }
            }
          } catch (e) {
            // Silenciar error de notificación
            console.error("Error notificando al cliente:", e);
          }
        }

        // Notificar al jefe de taller cuando el proyecto pasa a despiece (producción)
        if (newStatus === "despiece") {
          try {
            const allUsers = await db.getAllUsers();
            const jefesTaller = allUsers.filter(u => u.role === "jefe_taller");
            
            for (const jefe of jefesTaller) {
              // Crear notificación en la base de datos
              await db.createNotification({
                userId: jefe.id,
                title: "🏭 Nuevo Proyecto en Producción",
                body: `El proyecto "${project.name}" está listo para producción. El diseñador ha completado el despiece.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
              
              // Intentar enviar notificación push
              try {
                const { createAndSendNotification } = await import("../push-notifications");
                await createAndSendNotification(jefe.id, {
                  title: "🏭 Nuevo Proyecto en Producción",
                  body: `"${project.name}" listo para producción`,
                  type: "proyecto",
                  url: "/projects",
                });
              } catch (e) {
                // Silenciar error de push
              }
            }
          } catch (e) {
            // Silenciar error de notificación
          }
        }

        // Obtener datos del cliente para notificación WhatsApp
        const client = await db.getClientById(project.clientId);
        let whatsappNotification = null;
        let paymentReminderWhatsApp = null;
        
        if (client) {
          const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
          const projectWithClient = {
            id: project.id,
            name: project.name,
            status: newStatus,
            workType: project.workType,
            client: {
              name: client.name,
              whatsappPhone: client.whatsappPhone,
            },
          };
          // Pasar credenciales si es estado pendiente_render
          whatsappNotification = prepareWhatsAppNotification(
            projectWithClient, 
            baseUrl,
            newStatus === "pendiente_render" ? savedClientCredentials || undefined : undefined
          );
          
          // Si el proyecto pasa a "entregado", enviar recordatorio del 40% pendiente
          if (newStatus === "entregado") {
            // Obtener la cotización asociada para calcular el saldo
            const quotation = project.quotationId ? await db.getQuotationById(project.quotationId) : null;
            const quotationTotal = quotation?.total ? Number(quotation.total) : 0;
            const projectAdvance = project.advanceAmount ? Number(project.advanceAmount) : 0;
            const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
            const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
            const remainingAmount = totalAmount - advanceAmount;
            
            const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
            
            // Crear notificaciones para admin/comercial sobre el pago pendiente
            const admins = await db.getAllUsers();
            const notifyRoles = ["super_admin", "admin", "comercial"];
            const usersToNotify = admins.filter(u => notifyRoles.includes(u.role));
            
            for (const user of usersToNotify) {
              await db.createNotification({
                userId: user.id,
                title: "💰 Recordatorio: Pago del 40% Pendiente",
                body: `El proyecto "${project.name}" ha sido entregado. Saldo pendiente por cobrar: ${formatCurrency(remainingAmount)}. Cliente: ${client.name}`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
              });
            }
            
            // Generar enlace de WhatsApp para recordar al cliente el pago
            const paymentMessage = `🎉 ¡Hola ${client.name}!

Nos complace informarte que tu proyecto "${project.name}" ha sido *entregado exitosamente*.

💳 *Recordatorio de Pago Final*
• Total del proyecto: ${formatCurrency(totalAmount)}
• Adelanto pagado (60%): ${formatCurrency(advanceAmount)}
• *Saldo pendiente (40%): ${formatCurrency(remainingAmount)}*

Por favor, realiza el pago del saldo restante para completar tu proyecto.

¡Gracias por confiar en INNOVAR Cocinas Integrales! 🙏`;
            
            const cleanPhone = client.whatsappPhone?.replace(/\D/g, '') || '';
            const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
            paymentReminderWhatsApp = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(paymentMessage)}`;
          }
        }

        // Enviar WhatsApp automático al cliente si está configurado
        let whatsappAutoSent = false;
        if (whatsappCloud.isWhatsAppCloudConfigured() && client?.whatsappPhone) {
          try {
            const baseUrl = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;
            const portalUrl = `${baseUrl}/portal?project=${project.id}`;
            const result = await whatsappCloud.sendProjectStatusUpdate(
              client.whatsappPhone,
              client.name,
              project.name,
              newStatus,
              portalUrl
            );
            whatsappAutoSent = result.success;
            if (!result.success) {
              console.error("[WhatsApp Cloud] Error enviando actualización de estado:", result.error);
            }
          } catch (error) {
            console.error("[WhatsApp Cloud] Error:", error);
          }
        }

        return { 
          success: true,
          whatsappNotification,
          paymentReminderWhatsApp,
          whatsappAutoSent,
        };
      }),

    // Aprobar diseño (Cliente, Admin o Super Admin)
    approveDesign: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        approved: z.boolean(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar permisos: Admin, Super Admin, Comercial, o el cliente dueño del proyecto
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin" || ctx.user.role === "comercial";
        let isOwner = false;
        
        if (!isAdmin) {
          const client = await db.getClientByUserId(ctx.user.id);
          isOwner = !!(client && client.id === project.clientId);
        }

        if (!isAdmin && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para aprobar este proyecto" });
        }

        // Verificar que el proyecto esté en un estado de diseño donde se puede aprobar
        // Admin/comercial puede aprobar en cualquier momento durante el proceso de diseño
        // (cuando el cliente confirma por teléfono/WhatsApp)
        const isInDesignPhase = ["en_diseno", "pendiente_modelado", "pendiente_render"].includes(project.status as string);
        const isPendingModelado = project.status === "pendiente_modelado" || project.status === "en_diseno";
        const isPendingRender = project.status === "pendiente_render";
        
        if (!isInDesignPhase) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto no está en fase de diseño" });
        }

        const approverLabel = isAdmin ? "Admin" : "Cliente";
        const tipoAprobacion = isPendingModelado ? "modelado 3D" : "renders";

        if (input.approved) {
          // Si aprueba modelado, pasa a pendiente_render (para que el diseñador suba los renders)
          // Si aprueba renders, pasa a aprobacion_final (para iniciar producción)
          const nextStatus = isPendingModelado ? "pendiente_render" : "aprobacion_final";
          
          const updateData: Record<string, unknown> = {
            status: nextStatus,
            clientApprovalNotes: input.notes,
          };
          
          if (isPendingModelado) {
            updateData.modeladoApprovedAt = new Date();
            updateData.modeladoApprovedBy = ctx.user.id;
          } else {
            updateData.clientApprovedAt = new Date();
            updateData.rendersApprovedAt = new Date();
            updateData.rendersApprovedBy = ctx.user.id;
            // Calcular fecha oficial de instalación (25 días hábiles desde la aprobación)
            updateData.estimatedInstallDate = await calculateEstimatedDeliveryDate(new Date());
            updateData.isInstallDateOfficial = true;
          }
          
          await db.updateProject(input.projectId, updateData);

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: project.status,
            toStatus: nextStatus,
            changedBy: ctx.user.id,
            notes: `${approverLabel} aprobó el ${tipoAprobacion}: ${input.notes || ""}`,
          });
        } else {
          // Si rechaza, vuelve a diseño
          await db.updateProject(input.projectId, {
            status: "en_diseno",
            clientApprovalNotes: input.notes,
            changesRequestedAt: new Date(), // Guardar fecha de solicitud de cambios
          });

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: project.status,
            toStatus: "en_diseno",
            changedBy: ctx.user.id,
            notes: `${approverLabel} rechazó el ${tipoAprobacion}: ${input.notes || ""}`,
          });

          // === NOTIFICACIONES AL DISEÑADOR ===
          let designerWhatsAppLink = null;
          let designerNotified = false;
          
          // Obtener el diseñador asignado al proyecto
          const designerId = project.designerId;
          let designer = null;
          
          if (designerId) {
            designer = await db.getUserById(designerId);
          }
          
          // Si no hay diseñador asignado, buscar uno disponible
          if (!designer) {
            const designers = await db.getUsersByRole('diseñador');
            if (designers.length > 0) {
              designer = designers[0];
            }
          }
          
          // Siempre generar enlace de WhatsApp (con o sin diseñador)
          const companyPhone = "3136802025"; // Número de INNOVAR (fallback)
          
          if (designer) {
            // 1. Crear tarea automática para el diseñador
            const taskTitle = `🔄 Cambios solicitados: ${project.name}`;
            const taskDescription = `El cliente ha solicitado cambios en el diseño del proyecto "${project.name}".

📝 **Cambios solicitados:**
${input.notes || "No se especificaron detalles"}

📅 Fecha de solicitud: ${new Date().toLocaleString('es-CO')}

⚠️ Por favor revisa los cambios y actualiza el diseño lo antes posible.`;
            
            await db.createTask({
              projectId: input.projectId,
              title: taskTitle,
              description: taskDescription,
              priority: "alta",
              assignedTo: designer.id,
              assignedBy: ctx.user.id,
              dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
            });
            
            // 2. Crear notificación interna para el diseñador
            await db.createNotification({
              userId: designer.id,
              type: "proyecto",
              title: `🔄 Cambios solicitados en ${project.name}`,
              body: `El cliente ha solicitado cambios: ${input.notes || "Ver detalles en el proyecto"}`,
              referenceId: input.projectId,
              referenceType: "project",
            });
            
            designerNotified = true;
            
            // Usar el teléfono del diseñador si está configurado
            const designerPhone = (designer as any).phone?.replace(/\D/g, '') || companyPhone;
            const phoneWithCountry = designerPhone.startsWith('57') ? designerPhone : `57${designerPhone}`;
            
            const whatsAppMessage = encodeURIComponent(
              `🔄 *CAMBIOS SOLICITADOS*\n\n` +
              `*Proyecto:* ${project.name}\n` +
              `*Diseñador:* ${designer.name || "Sin asignar"}\n\n` +
              `📝 *Cambios solicitados:*\n${input.notes || "No se especificaron detalles"}\n\n` +
              `Por favor revisa el proyecto y actualiza el diseño.`
            );
            designerWhatsAppLink = `https://wa.me/${phoneWithCountry}?text=${whatsAppMessage}`;
          } else {
            // Sin diseñador asignado, usar número de la empresa
            const phoneWithCountry = `57${companyPhone}`;
            const whatsAppMessage = encodeURIComponent(
              `🔄 *CAMBIOS SOLICITADOS*\n\n` +
              `*Proyecto:* ${project.name}\n` +
              `*Diseñador:* Sin asignar\n\n` +
              `📝 *Cambios solicitados:*\n${input.notes || "No se especificaron detalles"}\n\n` +
              `Por favor asigna un diseñador y revisa los cambios.`
            );
            designerWhatsAppLink = `https://wa.me/${phoneWithCountry}?text=${whatsAppMessage}`;
          }
          
          return { 
            success: true, 
            designerWhatsAppLink,
            designerNotified,
            designerName: designer?.name || null
          };
        }

        return { success: true, designerWhatsAppLink: null, designerNotified: false, designerName: null };
      }),

    // Subir diseño 3D (Diseñador)
    uploadDesign: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        design3dFiles: z.string().optional(),
        despieceFiles: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "disenador" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo diseñadores pueden subir diseños" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        await db.updateProject(input.projectId, {
          design3dFiles: input.design3dFiles,
          despieceFiles: input.despieceFiles,
          designerId: ctx.user.id,
        });

        return { success: true };
      }),

    // Actualizar proyecto
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        initialMeasurements: z.string().optional(),
        estimatedInstallDate: z.date().optional(),
        scheduledInstallDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "jefe_taller" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores o jefe de taller pueden editar proyectos" });
        }

        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),

    // Actualizar fecha estimada de entrega
    updateEstimatedDate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        estimatedInstallDate: z.date(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["admin", "super_admin", "jefe_taller", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar la fecha estimada" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Registrar cambio y actualizar en transacción
        const oldDate = project.estimatedInstallDate;
        await withTransaction(async (tx) => {
          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: project.status,
            toStatus: project.status,
            changedBy: ctx.user.id,
            notes: `Fecha estimada cambiada de ${oldDate ? new Date(oldDate).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : 'sin fecha'} a ${input.estimatedInstallDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}${input.reason ? `. Motivo: ${input.reason}` : ''}`,
          });

          await db.updateProject(input.projectId, {
            estimatedInstallDate: input.estimatedInstallDate,
          });
        });

        return { success: true };
      }),

    // Eliminar proyecto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "comercial") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden eliminar proyectos" });
        }

        await db.deleteProject(input.id);
        return { success: true };
      }),

    // Enviar notificacion de seccion por WhatsApp
    sendSectionNotification: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sectionKey: z.enum(['corte', 'enchape', 'armado', 'instalacion', 'entrega']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin' && ctx.user.role !== 'comercial') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permisos para enviar notificaciones' });
        }

        const project = await db.getProjectById(input.projectId);

        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }

        const client = await db.getClientById(project.clientId);

        if (!client || !client.whatsappPhone) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cliente no tiene numero de WhatsApp' });
        }

        const messages: Record<string, string> = {
          corte: `Hola ${client.name}, iniciamos el CORTE de tu cocina.`,
          enchape: `Hola ${client.name}, iniciamos el ENCHAPE de tu cocina.`,
          armado: `Hola ${client.name}, iniciamos el ARMADO de tu cocina.`,
          instalacion: `Hola ${client.name}, iniciamos la INSTALACION de tu cocina.`,
          entrega: `Hola ${client.name}, tu cocina esta LISTA!`,
        };

        const message = messages[input.sectionKey];

        const response = await whatsappCloud.sendTextMessage(client.whatsappPhone, message);

        return {
          success: true,
          messageId: response.messageId,
          message: `Notificacion de ${input.sectionKey} enviada por WhatsApp`,
        };
      }),

    // Retroceder estado del proyecto un paso atras
    revertStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // 1. Validar permisos
          if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para retroceder estados" });
          }

          // 2. Obtener proyecto
          const project = await db.getProjectById(input.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
          }

          // 3. Flujo inverso de estados
          const reverseFlow: Record<string, string | null> = {
            entregado: "listo_instalacion",
            listo_instalacion: "ensamble",
            ensamble: "enchape",
            enchape: "corte",
            corte: "despiece",
            despiece: "aprobacion_final",
            aprobacion_final: "pendiente_render",
            pendiente_render: "pendiente_modelado",
            pendiente_modelado: "en_diseno",
            en_diseno: "adelanto_recibido",
            adelanto_recibido: "cotizacion_aprobada",
            cotizacion_aprobada: "cotizacion_enviada",
            cotizacion_enviada: "contacto",
            contacto: null
          };

          const previousStatus = reverseFlow[project.status];

          if (!previousStatus) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `No se puede retroceder desde el estado ${project.status}.`
            });
          }

          // 4. Actualizar estado
          await db.updateProject(input.id, { status: previousStatus });

          // 5. Log de auditoria (opcional para auditoría futura)

          return { success: true, newStatus: previousStatus };
        } catch (error) {
          console.error("ERROR REVERTING PROJECT STATUS:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo retroceder el estado del proyecto"
          });
        }
      }),

    // Actualizar skipDesignProcess
    updateSkipDesignProcess: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        skipDesignProcess: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar permisos
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        await db.updateProject(input.projectId, {
          skipDesignProcess: input.skipDesignProcess ? 1 : 0,
        });

        return { success: true };
      }),

    // Enviar directamente a taller
    sendDirectlyToWorkshop: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar permisos
        if (![ "admin", "super_admin", "comercial"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Validar que skipDesignProcess esté habilitado
        if (!project.skipDesignProcess) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este proyecto requiere proceso de diseño. Marca 'Enviar directamente a taller' si deseas saltarlo.",
          });
        }

        // Validar estado
        if (!["cotizacion_aprobada", "adelanto_recibido"].includes(project.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El proyecto no está en estado válido para enviar a taller",
          });
        }

        // Cambiar estado a despiece
        await db.updateProject(input.projectId, {
          status: "despiece",
        });

        // Obtener datos para notificaciones
        const client = await db.getClientById(project.clientId);
        const workTypeLabel = project.workType || "Proyecto";

        // Crear notificación a Jefe de Taller
        try {
          const jefeTallerUsers = await db.getAllUsers();
          const jefeTaller = jefeTallerUsers.find(u => u.role === "jefe_taller");
          
          if (jefeTaller) {
            await db.createNotification({
              userId: jefeTaller.id,
              title: "📦 Nuevo proyecto en taller",
              body: `${project.name} - ${workTypeLabel}`,
              type: "proyecto",
              referenceId: project.id,
              referenceType: "project",
            });
          }
        } catch (error) {
          console.error("Error creating notification for jefe_taller:", error);
        }

        // Notificación a admin/comercial
        try {
          await db.createNotification({
            userId: ctx.user.id,
            title: "✅ Proyecto enviado a taller",
            body: `${project.name} fue enviado a taller exitosamente`,
            type: "proyecto",
            referenceId: project.id,
            referenceType: "project",
          });
        } catch (error) {
          console.error("Error creating notification for user:", error);
        }

        return { success: true, message: "Proyecto enviado a taller" };
      }),

    // Archivar proyecto (cualquier estado)
    archive: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para archivar proyectos" });
          }

          const project = await db.getProjectById(input.projectId);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
          }

          await db.updateProject(input.projectId, { isArchived: 1 });

          return { success: true, message: "Proyecto archivado correctamente" };
        } catch (error) {
          console.error("ERROR ARCHIVING PROJECT:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo archivar el proyecto"
          });
        }
      }),

    // Desarchivar proyecto
    unarchive: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para desarchivar proyectos" });
          }

          await db.updateProject(input.projectId, { isArchived: 0 });

          return { success: true, message: "Proyecto desarchivado correctamente" };
        } catch (error) {
          console.error("ERROR UNARCHIVING PROJECT:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo desarchivar el proyecto"
          });
        }
      }),
});


export const projectPhotosRouter = router({
    // Subir foto
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        stage: z.enum(["inicial", "diseno", "corte", "enchape", "ensamble", "final"]),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional().default("medidas"),
        subcategory: z.enum(["fotos_iniciales", "dibujo", "renders", "despieces", "detalles", "modelado_3d", "corte", "enchape", "armado", "proceso_instalacion", "fotos_finales", "documento_cotizacion"]).optional(),
        photoUrl: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const role = ctx.user.role;
        const stage = input.stage;
        const category = input.category;
        const subcategory = input.subcategory;

        // Validar permisos por etapa y categoría
        const canUpload = validatePhotoUploadPermission(role, stage, category);
        if (!canUpload) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para subir fotos en esta categoría" });
        }

        // Obtener proyecto actual para verificar estado
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const photoId = await db.createProjectPhoto({
          projectId: input.projectId,
          photoUrl: input.photoUrl,
          stage: input.stage,
          category: input.category,
          subcategory: input.subcategory,
          description: input.description,
          uploadedBy: ctx.user.id,
        });

        // Cambiar estado del proyecto automáticamente según la subcategoría de foto subida
        // Solo cambiar si el proyecto está en un estado anterior o igual
        const statusOrder = ["contacto", "cotizacion_enviada", "cotizacion_aprobada", "adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"];
        const currentStatusIndex = statusOrder.indexOf(project.status);
        
        // Mapeo de subcategoría a estado de proyecto
        type ProjectStatus = "contacto" | "cotizacion_enviada" | "cotizacion_aprobada" | "adelanto_recibido" | "en_diseno" | "pendiente_modelado" | "pendiente_render" | "aprobacion_final" | "despiece" | "corte" | "enchape" | "ensamble" | "listo_instalacion" | "entregado";
        
        const subcategoryToStatus: Record<string, ProjectStatus> = {
          "despieces": "despiece",
          "corte": "corte",
          "enchape": "enchape",
          "armado": "ensamble",
          "proceso_instalacion": "listo_instalacion",
          "fotos_finales": "entregado",
        };

        if (subcategory && subcategoryToStatus[subcategory]) {
          const newStatus = subcategoryToStatus[subcategory];
          const newStatusIndex = statusOrder.indexOf(newStatus);
          
          // Solo avanzar el estado si el nuevo estado es posterior al actual
          if (newStatusIndex > currentStatusIndex) {
            await db.updateProject(input.projectId, { status: newStatus });
            
            // Registrar cambio de estado en historial
            await db.createProjectStatusHistory({
              projectId: input.projectId,
              fromStatus: project.status,
              toStatus: newStatus,
              changedBy: ctx.user.id,
              notes: `Estado actualizado automáticamente al subir foto de ${subcategory}`,
            });
          }
        }

        return { success: true, photoId };
      }),

    // Obtener fotos por proyecto
    getByProject: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]).optional(),
      }))
      .query(async ({ input }) => {
        if (input.category) {
          return await db.getProjectPhotosByCategory(input.projectId, input.category);
        }
        return await db.getProjectPhotosByProjectId(input.projectId);
      }),

    // Obtener fotos por etapa
    getByStage: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        stage: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getProjectPhotosByStage(input.projectId, input.stage);
      }),

    // Obtener fotos por categoría
    getByCategory: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.enum(["cotizacion", "medidas", "disenos", "avance", "instalacion", "entrega"]),
      }))
      .query(async ({ input }) => {
        return await db.getProjectPhotosByCategory(input.projectId, input.category);
      }),

    // Eliminar foto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Admins, comercial y diseñador pueden eliminar cualquier foto
        const canDeleteAny = ["admin", "super_admin", "comercial", "disenador"].includes(ctx.user.role);
        
        if (!canDeleteAny) {
          // Jefe de taller y operario solo pueden eliminar fotos que ellos subieron
          const photo = await db.getProjectPhotoById(input.id);
          if (!photo) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Foto no encontrada" });
          }
          
          const canDeleteOwn = ["jefe_taller", "operario"].includes(ctx.user.role) && photo.uploadedBy === ctx.user.id;
          
          if (!canDeleteOwn) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes eliminar fotos que tú subiste" });
          }
        }

        await db.deleteProjectPhoto(input.id);
        return { success: true };
      }),
});

export const projectDetailsRouter = router({
    // Crear detalle
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["medida_especial", "nota_importante", "foto_referencia"]),
        title: z.string().min(1, "El título es requerido"),
        content: z.string().min(1, "El contenido es requerido"),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo Super Admin, Admin, Comercial y Diseñador pueden crear detalles
        // Jefe de taller y Operario solo pueden ver (lectura)
        const allowedRoles = ["disenador", "comercial", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para agregar detalles" });
        }

        // Validar que el proyecto existe
        const projectExists = await db.getProjectById(input.projectId);
        if (!projectExists) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Insertar el detalle del proyecto directamente usando la función de db
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
        }

        await database.insert(projectDetails).values({
          projectId: input.projectId,
          type: input.type,
          title: input.title,
          content: input.content,
          photoUrl: input.photoUrl || null,
          createdBy: ctx.user.id,
        });

        return { success: true };
      }),

    // Obtener detalles por proyecto
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectDetailsByProjectId(input.projectId);
      }),

    // Actualizar detalle
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo Super Admin, Admin, Comercial y Diseñador pueden editar detalles
        const allowedRoles = ["disenador", "comercial", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar detalles" });
        }

        const { id, ...data } = input;
        await db.updateProjectDetail(id, data);
        return { success: true };
      }),

    // Eliminar detalle
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["disenador", "jefe_taller", "operario", "comercial", "admin", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar detalles" });
        }

        await db.deleteProjectDetail(input.id);
        return { success: true };
      }),
});

export const projectMaterialsRouter = router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectMaterials(input.projectId);
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        photoType: z.enum(["wood", "countertop", "sink"]),
        photoData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para subir fotos" });
        }
        
        // Extraer datos base64
        const matches = input.photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de imagen inválido" });
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generar nombre único
        const ext = input.fileName.split(".").pop() || "jpg";
        const uniqueName = `materials/${input.projectId}-${input.photoType}-${Date.now()}.${ext}`;
        
        // Subir a S3
        const { storagePut } = await import("../storage");
        const { url } = await storagePut(uniqueName, buffer, contentType);
        
        return { success: true, url };
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        woodType: z.enum(["rh", "estandar"]).optional(),
        woodColor: z.string().optional(),
        woodPhotoUrl: z.string().optional(),
        countertopType: z.enum(["granito", "cuarzo", "sinterizado"]).optional(),
        countertopName: z.string().optional(),
        countertopPhotoUrl: z.string().optional(),
        sinkMeasure: z.string().optional(),
        sinkPhotoUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar materiales" });
        }
        const { projectId, ...data } = input;
        const id = await db.saveProjectMaterials(projectId, data, ctx.user.id);
        return { success: true, id };
      }),

    getSelectedHardware: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectHardwareSelections(input.projectId);
      }),

    selectHardware: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hardwareId: z.number(),
        selectedOption: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para seleccionar herrajes" });
        }
        const id = await db.addProjectHardwareSelection(input.projectId, input.hardwareId, input.selectedOption, input.notes, ctx.user.id);
        return { success: true, id };
      }),

    removeHardware: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hardwareId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para modificar herrajes" });
        }
        await db.removeProjectHardwareSelection(input.projectId, input.hardwareId);
        return { success: true };
      }),

    // Get financial summary for a project
    getFinancialSummary: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        // Allow all roles except operario to view financial summary
        if (ctx.user.role === "operario") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver información financiera" });
        }
        // Use dynamic import to avoid TypeScript cache issues
        // @ts-ignore - Function exists but TypeScript cache issue
        const dbModule = await import("../db");
        // @ts-ignore - Function exists but TypeScript cache issue
        return await dbModule.getProjectFinancialSummary(input.projectId);
      }),
    
    // Test endpoint
    testEndpoint: publicProcedure
      .query(() => {
        return { message: "Test endpoint works!" };
      }),

    // Ping test para verificar alineación de tipos
    pingTest: publicProcedure
      .query(() => "pong"),



    // Get global financial dashboard (CEO/Admin only)
    getGlobalDashboard: protectedProcedure
      .query(async ({ ctx }) => {
        // Only super_admin and admin can view global dashboard
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para ver el dashboard financiero" });
        }
        const result = await db.getGlobalFinancialDashboard();
        return result;
      }),


});