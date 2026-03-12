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


export const publicGalleryRouter = router({
    // Obtener fotos del proyecto para compartir con clientes (sin autenticación)
    getProjectPhotos: publicProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["modelado_3d", "renders"]).optional(),
      }))
      .query(async ({ input }) => {
        // Obtener proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Obtener cliente
        const client = project.clientId ? await db.getClientById(project.clientId) : null;

        // Obtener fotos según el tipo solicitado
        const allPhotos = await db.getProjectPhotosByProjectId(input.projectId);
        let photos = allPhotos;
        
        if (input.type) {
          photos = allPhotos.filter(p => p.subcategory === input.type);
        } else {
          // Por defecto, mostrar modelado y renders
          photos = allPhotos.filter(p => p.subcategory === "modelado_3d" || p.subcategory === "renders");
        }

        return {
          project: {
            id: project.id,
            name: project.name,
            workType: project.workType,
          },
          client: client ? {
            name: client.name,
          } : null,
          photos: photos.map(p => ({
            id: p.id,
            photoUrl: p.photoUrl,
            subcategory: p.subcategory,
            description: p.description,
            createdAt: p.createdAt,
          })),
          totalModelado: allPhotos.filter(p => p.subcategory === "modelado_3d").length,
          totalRenders: allPhotos.filter(p => p.subcategory === "renders").length,
        };
      }),

    // Aprobar diseño desde la galería pública (sin autenticación)
    approveDesign: publicProcedure
      .input(z.object({
        projectId: z.number(),
        clientName: z.string().min(1, "El nombre es requerido"),
        type: z.enum(["modelado_3d", "renders"]),
      }))
      .mutation(async ({ input }) => {
        // Obtener proyecto con cliente
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        const now = new Date();
        
        // Guardar la aprobación según el tipo
        if (input.type === "modelado_3d") {
          await db.updateProject(input.projectId, {
            modeladoApprovedAt: now.toISOString(),
            modeladoApprovedBy: input.clientName,
          });
        } else {
          // Aprobación de renders = aprobación final
          // Calcular fecha definitiva de instalación (25 días hábiles desde hoy)
          const fechaDefinitiva = await calculateEstimatedDeliveryDate(now);
          
          await db.updateProject(input.projectId, {
            rendersApprovedAt: now.toISOString(),
            rendersApprovedBy: input.clientName,
            status: "aprobacion_final",
            clientApprovedAt: now.toISOString(),
            estimatedInstallDate: fechaDefinitiva instanceof Date ? fechaDefinitiva.toISOString() : fechaDefinitiva,
            isInstallDateOfficial: 1 as any,
          });
        }

        // Obtener datos del cliente para el mensaje
        const client = await db.getClientById(project.clientId);
        
        // Crear tarea de notificación para el equipo
        const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
        const taskTitle = `✅ Cliente aprobó ${tipoTexto}: ${project.name}`;
        const taskDescription = `El cliente ${input.clientName} ha aprobado el ${tipoTexto.toLowerCase()} del proyecto "${project.name}" desde la galería pública.\n\nFecha: ${now.toLocaleString('es-CO')}\n\n${input.type === "modelado_3d" ? "Siguiente paso: Preparar y enviar los renders finales." : "Siguiente paso: Iniciar producción del proyecto."}`;
        
        // Notificar al diseñador asignado o al admin
        const assignTo = project.designerId || (await db.getUsersByRole('admin'))[0]?.id || (await db.getUsersByRole('super_admin'))[0]?.id;
        
        if (assignTo) {
          await db.createTask({
            projectId: input.projectId,
            title: taskTitle,
            description: taskDescription,
            priority: "alta",
            assignedTo: assignTo,
            assignedBy: assignTo, // Auto-asignada por el sistema
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
          });
        }

        // Generar enlace de WhatsApp para notificar al equipo
        const teamWhatsAppLink = generateTeamWhatsAppLink("approval", {
          clientName: input.clientName,
          projectName: project.name,
          projectId: input.projectId,
          designType: input.type,
        });

        // Enviar notificaciones push al equipo (diseñador, admin, comercial)
        try {
          const { createAndSendNotification, sendPushToRole } = await import("../push-notifications");
          const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
          
          // Notificar al diseñador asignado
          if (project.designerId) {
            await createAndSendNotification(project.designerId, {
              title: `✅ Cliente aprobó ${tipoTexto}`,
              body: `${input.clientName} aprobó el ${tipoTexto.toLowerCase()} de "${project.name}"`,
              type: "proyecto",
              referenceId: input.projectId,
              referenceType: "project",
              url: `/projects/${input.projectId}`,
            });
          }
          
          // Notificar a todos los admins y comerciales
          const admins = await db.getUsersByRole('admin');
          const superAdmins = await db.getUsersByRole('super_admin');
          const comerciales = await db.getUsersByRole('comercial');
          const allTeam = [...admins, ...superAdmins, ...comerciales];
          
          for (const user of allTeam) {
            // Evitar duplicar notificación al diseñador si también es admin
            if (user.id !== project.designerId) {
              await createAndSendNotification(user.id, {
                title: `✅ Cliente aprobó ${tipoTexto}`,
                body: `${input.clientName} aprobó el ${tipoTexto.toLowerCase()} de "${project.name}"`,
                type: "proyecto",
                referenceId: input.projectId,
                referenceType: "project",
                url: `/projects/${input.projectId}`,
              });
            }
          }
          
          // Si es aprobación de renders (diseño final), notificar al jefe de taller para iniciar producción
          if (input.type === "renders") {
            const jefesTaller = await db.getUsersByRole('jefe_taller');
            for (const jefe of jefesTaller) {
              // Crear notificación push
              await createAndSendNotification(jefe.id, {
                title: `🏭 Nuevo proyecto listo para producción`,
                body: `"${project.name}" fue aprobado por el cliente. ¡Listo para iniciar producción!`,
                type: "proyecto",
                referenceId: input.projectId,
                referenceType: "project",
                url: `/projects/${input.projectId}`,
              });
              
              // Crear tarea para el jefe de taller
              await db.createTask({
                projectId: input.projectId,
                title: `🏭 Iniciar producción: ${project.name}`,
                description: `El cliente ${input.clientName} ha aprobado el diseño final del proyecto "${project.name}".\n\n¡El proyecto está listo para iniciar producción!\n\nPróximos pasos:\n1. Revisar despieces y materiales\n2. Programar corte\n3. Coordinar con operarios`,
                priority: "alta",
                assignedTo: jefe.id,
                assignedBy: jefe.id, // Auto-asignada por el sistema
                dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
              });
            }
          }
        } catch (pushError) {
          console.error("Error enviando notificaciones push:", pushError);
        }
        
        // Generar enlace de WhatsApp para notificar al jefe de taller (solo si es aprobación de renders)
        let jefeTallerWhatsAppLink = null;
        if (input.type === "renders") {
          const jefesTaller = await db.getUsersByRole('jefe_taller');
          if (jefesTaller.length > 0) {
            const jefePhone = (jefesTaller[0] as any).phone;
            const phoneToUse = jefePhone ? (jefePhone.startsWith('57') ? jefePhone : `57${jefePhone}`) : '573136802025';
            const message = encodeURIComponent(`🏭 *NUEVO PROYECTO LISTO PARA PRODUCCIÓN*\n\nHola, te informo que el proyecto "${project.name}" ha sido aprobado por el cliente ${input.clientName}.\n\n✅ El diseño fue aprobado y está listo para iniciar producción.\n\nPor favor revisa los despieces y materiales para programar el corte.\n\nVer proyecto: https://innovarcitas.manus.space/projects/${input.projectId}`);
            jefeTallerWhatsAppLink = `https://wa.me/${phoneToUse}?text=${message}`;
          }
        }

        return { 
          success: true, 
          message: input.type === "modelado_3d" 
            ? "¡Gracias! Hemos registrado su aprobación del modelado. Pronto le enviaremos los renders finales."
            : "¡Gracias! Su proyecto ha sido aprobado. Pronto nos pondremos en contacto para coordinar los siguientes pasos.",
          teamWhatsAppLink, // Enlace para notificar al equipo por WhatsApp
          jefeTallerWhatsAppLink, // Enlace para notificar al jefe de taller (solo renders)
        };
      }),

    // Solicitar cambios desde la galería pública (sin autenticación)
    requestChanges: publicProcedure
      .input(z.object({
        projectId: z.number(),
        clientName: z.string().min(1, "El nombre es requerido"),
        type: z.enum(["modelado_3d", "renders"]),
        changes: z.string().min(10, "Por favor describe los cambios que necesitas (mínimo 10 caracteres)"),
      }))
      .mutation(async ({ input }) => {
        // Obtener proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Determinar el número de revisión actual
        const revisionNumber = input.type === "modelado_3d" 
          ? (project.modeladoRevisionNumber || 1)
          : (project.renderRevisionNumber || 1);

        // Guardar revisión, actualizar estado y crear tarea en transacción
        const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
        const taskTitle = `📝 Cliente solicitó cambios en ${tipoTexto}: ${project.name}`;
        const taskDescription = `El cliente ${input.clientName} ha solicitado cambios en el ${tipoTexto.toLowerCase()} del proyecto "${project.name}".\n\n**Cambios solicitados:**\n${input.changes}\n\nFecha: ${new Date().toLocaleString('es-CO')}`;
        const assignTo = project.designerId || (await db.getUsersByRole('admin'))[0]?.id || (await db.getUsersByRole('super_admin'))[0]?.id;

        await withTransaction(async (tx) => {
          await db.createClientRevision({
            projectId: input.projectId,
            type: input.type,
            revisionNumber,
            clientName: input.clientName,
            changes: input.changes,
          });

          if ((project.status as string) === "pendiente_render" || (project.status as string) === "pendiente_modelado") {
            await db.updateProject(input.projectId, {
              status: "en_diseno",
              clientApprovalNotes: input.changes,
              changesRequestedAt: new Date().toISOString(),
            });
          }

          if (assignTo) {
            await db.createTask({
              projectId: input.projectId,
              title: taskTitle,
              description: taskDescription,
              priority: "alta",
              assignedTo: assignTo,
              assignedBy: assignTo,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
          }
        });

        // Generar enlace de WhatsApp para notificar al equipo
        const teamWhatsAppLink = generateTeamWhatsAppLink("changes", {
          clientName: input.clientName,
          projectName: project.name,
          projectId: input.projectId,
          designType: input.type,
          changes: input.changes,
        });

        // Enviar email al diseñador asignado
        let designerWhatsAppLink: string | null = null;
        try {
          const { sendEmail, generateEmailHTML } = await import("../email");
          
          // Obtener información del diseñador
          if (project.designerId) {
            const designer = await db.getUserById(project.designerId);
            if (designer?.email) {
              const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
              const emailContent = `
                <div style="padding: 20px;">
                  <h2 style="color: #f97316; margin-bottom: 20px;">📝 Cambios Solicitados por el Cliente</h2>
                  
                  <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; font-weight: bold;">Proyecto: ${project.name}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">Tipo: ${tipoTexto}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">Cliente: ${input.clientName}</p>
                  </div>
                  
                  <h3 style="color: #333; margin-bottom: 10px;">Cambios solicitados:</h3>
                  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; white-space: pre-wrap;">${input.changes}</p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">Fecha de solicitud: ${new Date().toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  
                  <div style="margin-top: 25px; text-align: center;">
                    <a href="https://innovarcitas.manus.space/projects/${input.projectId}" 
                       style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Ver Proyecto
                    </a>
                  </div>
                </div>
              `;
              
              await sendEmail({
                to: designer.email,
                subject: `📝 Cambios solicitados en ${tipoTexto}: ${project.name}`,
                html: generateEmailHTML(emailContent, `Cambios Solicitados - ${project.name}`),
              });
            }
            
            // Generar enlace de WhatsApp para contactar al diseñador
            const designerUser = await db.getUserById(project.designerId);
            if (designerUser?.phone) {
              const phoneToUse = designerUser.phone.startsWith('57') ? designerUser.phone : `57${designerUser.phone}`;
              const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
              const message = encodeURIComponent(`📝 *CAMBIOS SOLICITADOS POR CLIENTE*\n\nHola ${designerUser.name}, el cliente ${input.clientName} ha solicitado cambios en el ${tipoTexto.toLowerCase()} del proyecto "${project.name}".\n\n*Cambios solicitados:*\n${input.changes}\n\nPor favor revisa el proyecto: https://innovarcitas.manus.space/projects/${input.projectId}`);
              designerWhatsAppLink = `https://wa.me/${phoneToUse}?text=${message}`;
            }
          }
        } catch (emailError) {
          console.error("Error enviando email al diseñador:", emailError);
        }

        // Enviar notificaciones push al equipo (diseñador, admin, comercial)
        try {
          const { createAndSendNotification } = await import("../push-notifications");
          const tipoTexto = input.type === "modelado_3d" ? "Modelado 3D" : "Renders";
          const cambiosCortos = input.changes.length > 50 ? input.changes.substring(0, 50) + "..." : input.changes;
          
          // Notificar al diseñador asignado
          if (project.designerId) {
            await createAndSendNotification(project.designerId, {
              title: `📝 Cambios solicitados en ${tipoTexto}`,
              body: `${input.clientName} solicitó cambios: "${cambiosCortos}"`,
              type: "proyecto",
              referenceId: input.projectId,
              referenceType: "project",
              url: `/projects/${input.projectId}`,
            });
          }
          
          // Notificar a todos los admins y comerciales
          const admins = await db.getUsersByRole('admin');
          const superAdmins = await db.getUsersByRole('super_admin');
          const comerciales = await db.getUsersByRole('comercial');
          const allTeam = [...admins, ...superAdmins, ...comerciales];
          
          for (const user of allTeam) {
            // Evitar duplicar notificación al diseñador si también es admin
            if (user.id !== project.designerId) {
              await createAndSendNotification(user.id, {
                title: `📝 Cambios solicitados en ${tipoTexto}`,
                body: `${input.clientName} solicitó cambios en "${project.name}"`,
                type: "proyecto",
                referenceId: input.projectId,
                referenceType: "project",
                url: `/projects/${input.projectId}`,
              });
            }
          }
        } catch (pushError) {
          console.error("Error enviando notificaciones push:", pushError);
        }

        return { 
          success: true, 
          message: "¡Gracias! Hemos registrado sus comentarios. Nuestro equipo de diseño revisará los cambios solicitados y se pondrá en contacto pronto.",
          teamWhatsAppLink, // Enlace para notificar al equipo por WhatsApp
          designerWhatsAppLink, // Enlace para notificar al diseñador directamente por WhatsApp
        };
      }),

    // Obtener estado de aprobación del proyecto
    getApprovalStatus: publicProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          return { modeladoApproved: false, rendersApproved: false };
        }
        
        return {
          modeladoApproved: !!project.modeladoApprovedAt,
          modeladoApprovedAt: project.modeladoApprovedAt,
          modeladoApprovedBy: project.modeladoApprovedBy,
          rendersApproved: !!project.rendersApprovedAt,
          rendersApprovedAt: project.rendersApprovedAt,
          rendersApprovedBy: project.rendersApprovedBy,
        };
      }),

    // Reiniciar aprobación de renders para solicitar nueva aprobación
    resetRendersApproval: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        notifyClient: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin y admin pueden reiniciar aprobación
        if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden solicitar nueva aprobación" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Incrementar contador de revisiones de renders
        const currentRevision = (project as any).renderRevisionNumber || 0;
        const newRevision = currentRevision + 1;
        
        // Reiniciar campos de aprobación de renders y actualizar contador
        // También limpiar fecha de cambios solicitados y notas para reiniciar el contador
        // Actualizar proyecto y registrar historial en transacción
        await withTransaction(async (tx) => {
          await db.updateProject(input.projectId, {
            rendersApprovedAt: null,
            rendersApprovedBy: null,
            renderRevisionNumber: newRevision,
            status: "pendiente_render",
            changesRequestedAt: null,
            clientApprovalNotes: null,
          });

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: project.status,
            toStatus: "pendiente_render",
            changedBy: ctx.user.id,
            notes: `Nueva aprobación de renders solicitada (Revisión #${newRevision})`,
          });
        });
        
        // Limpiar proyecto del registro de notificados de cambios vencidos
        try {
          const { clearProjectFromNotified } = await import("../overdue-changes-service");
          clearProjectFromNotified(input.projectId);
        } catch (e) {
          // Ignorar si el servicio no está disponible
        }

        // Obtener cliente para notificación
        const client = project.clientId ? await db.getClientById(project.clientId) : null;
        
        // Generar enlace de la galería pública (sin login)
        const baseUrl = process.env.VITE_APP_URL || "https://innovarcitas.manus.space";
        const portalLink = `${baseUrl}/gallery?project=${input.projectId}&type=renders`;

        // Generar enlace de WhatsApp si se debe notificar
        let whatsAppLink = null;
        if (input.notifyClient && client?.whatsappPhone) {
          const phone = client.whatsappPhone.replace(/\D/g, '');
          const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
          const message = encodeURIComponent(
            `¡Hola ${client.name}! 👋\n\n` +
            `Hemos actualizado los renders de tu proyecto "${project.name}" con los cambios que solicitaste.\n\n` +
            `Por favor revisa los nuevos diseños y apruébalos cuando estés satisfecho:\n` +
            `${portalLink}\n\n` +
            `¡Gracias por tu confianza en INNOVAR Cocinas! 🏠`
          );
          whatsAppLink = `https://wa.me/${phoneWithCountry}?text=${message}`;
        }

        return {
          success: true,
          message: `Aprobación de renders reiniciada (Revisión #${newRevision}). El cliente puede aprobar la nueva versión.`,
          portalLink,
          whatsAppLink,
          clientName: client?.name,
          revisionNumber: newRevision,
        };
      }),

    // Reiniciar aprobación de modelado 3D para solicitar nueva aprobación
    resetModeladoApproval: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        notifyClient: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo super_admin, admin y comercial pueden reiniciar aprobación
        const allowedRoles = ["super_admin", "admin", "comercial"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden solicitar nueva aprobación" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Incrementar el contador de revisiones de modelado
        const currentRevision = (project as any).modeladoRevisionNumber || 0;
        const newRevision = currentRevision + 1;

        // Reiniciar campos de aprobación de modelado y actualizar contador
        // También limpiar fecha de cambios solicitados y notas para reiniciar el contador
        // Actualizar proyecto y registrar historial en transacción
        await withTransaction(async (tx) => {
          await db.updateProject(input.projectId, {
            modeladoApprovedAt: null,
            modeladoApprovedBy: null,
            status: "pendiente_modelado",
            modeladoRevisionNumber: newRevision,
            changesRequestedAt: null,
            clientApprovalNotes: null,
          });

          await db.createProjectStatusHistory({
            projectId: input.projectId,
            fromStatus: project.status,
            toStatus: "pendiente_modelado",
            changedBy: ctx.user.id,
            notes: `Nueva aprobación de modelado solicitada (Revisión #${newRevision})`,
          });
        });
        
        // Limpiar proyecto del registro de notificados de cambios vencidos
        try {
          const { clearProjectFromNotified } = await import("../overdue-changes-service");
          clearProjectFromNotified(input.projectId);
        } catch (e) {
          // Ignorar si el servicio no está disponible
        }

        // Obtener cliente para notificación
        const client = project.clientId ? await db.getClientById(project.clientId) : null;
        
        // Generar enlace de la galería pública (sin login)
        const baseUrl = process.env.VITE_APP_URL || "https://innovarcitas.manus.space";
        const portalLink = `${baseUrl}/gallery?project=${input.projectId}&type=modelado_3d`;

        // Generar enlace de WhatsApp si se debe notificar
        let whatsAppLink = null;
        if (input.notifyClient && client?.whatsappPhone) {
          const phone = client.whatsappPhone.replace(/\D/g, '');
          const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
          const message = encodeURIComponent(
            `¡Hola ${client.name}! 👋\n\n` +
            `Hemos actualizado el modelado 3D de tu proyecto "${project.name}" con los cambios que solicitaste.\n\n` +
            `Por favor revisa el nuevo diseño y apruébalo cuando estés satisfecho:\n` +
            `${portalLink}\n\n` +
            `¡Gracias por tu confianza en INNOVAR Cocinas! 🏠`
          );
          whatsAppLink = `https://wa.me/${phoneWithCountry}?text=${message}`;
        }

        return {
          success: true,
          message: `Nueva aprobación de modelado solicitada (Revisión #${newRevision})`,
          portalLink,
          whatsAppLink,
          clientName: client?.name,
          revisionNumber: newRevision,
        };
      }),

    // Enviar modelado al cliente por WhatsApp Cloud API (cambia estado a pendiente_modelado)
    sendModeladoToClient: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin, comercial y diseñador pueden enviar modelado
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar modelado" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar que hay modelado para enviar
        const photos = await db.getProjectPhotosByProjectId(input.projectId);
        const modeladoPhotos = photos.filter((p: any) => p.subcategory === "modelado_3d");
        if (modeladoPhotos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No hay modelado para enviar" });
        }

        // Obtener cliente
        const client = project.clientId ? await db.getClientById(project.clientId) : null;
        if (!client?.whatsappPhone) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El cliente no tiene número de WhatsApp registrado" });
        }

        // Determinar el número de revisión
        const currentRevision = (project as any).modeladoRevisionNumber || 0;
        const newRevision = currentRevision === 0 ? 1 : currentRevision;
        
        // Solo cambiar estado si no está ya en pendiente_modelado
        if (project.status !== "pendiente_modelado") {
          await withTransaction(async (tx) => {
            await db.updateProject(input.projectId, {
              status: "pendiente_modelado",
              modeladoRevisionNumber: newRevision,
            });
            
            await db.createProjectStatusHistory({
              projectId: input.projectId,
              fromStatus: project.status,
              toStatus: "pendiente_modelado",
              changedBy: ctx.user.id,
              notes: `Modelado 3D enviado al cliente por WhatsApp (Revisión #${newRevision})`,
            });
          });
        }

        // Construir URL de galería pública
        const baseUrl = process.env.VITE_APP_URL || "https://innovarcitas.manus.space";
        const portalLink = `${baseUrl}/gallery?project=${input.projectId}&type=modelado_3d`;

        // Construir mensaje de WhatsApp
        const message = 
          `📐 *Modelado 3D de tu proyecto*\n\n` +
          `Hola ${client.name},\n\n` +
          `Ya puedes revisar el modelado 3D aquí:\n` +
          `${portalLink}\n\n` +
          `Por favor déjanos tus comentarios o aprobación.\n\n` +
          `INNOVAR Cocinas Integrales`;

        // Enviar por WhatsApp Cloud API
        const phone = client.whatsappPhone.replace(/\D/g, '');
        const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
        
        try {
          const result = await whatsappCloud.sendTextMessage(phoneWithCountry, message);
        } catch (error) {
          console.error(`[MODELADO] Error enviando mensaje:`, error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar mensaje por WhatsApp" });
        }

        return {
          success: true,
          message: `Modelado 3D enviado al cliente por WhatsApp (Revisión #${newRevision})`,
          portalLink,
          clientName: client?.name,
          revisionNumber: newRevision,
        };
      }),

    // Enviar renders al cliente por WhatsApp Cloud API (cambia estado a pendiente_render)
    sendRendersToClient: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin, super_admin, comercial y diseñador pueden enviar renders
        const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar renders" });
        }

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar que hay renders para enviar
        const photos = await db.getProjectPhotosByProjectId(input.projectId);
        const renderPhotos = photos.filter((p: any) => p.subcategory === "renders");
        if (renderPhotos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No hay renders para enviar" });
        }

        // Obtener cliente
        const client = project.clientId ? await db.getClientById(project.clientId) : null;
        if (!client?.whatsappPhone) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El cliente no tiene número de WhatsApp registrado" });
        }

        // Determinar el número de revisión
        const currentRevision = (project as any).renderRevisionNumber || 0;
        const newRevision = currentRevision === 0 ? 1 : currentRevision;
        
        // Solo cambiar estado si no está ya en pendiente_render
        if (project.status !== "pendiente_render") {
          await withTransaction(async (tx) => {
            await db.updateProject(input.projectId, {
              status: "pendiente_render",
              renderRevisionNumber: newRevision,
            });
            
            await db.createProjectStatusHistory({
              projectId: input.projectId,
              fromStatus: project.status,
              toStatus: "pendiente_render",
              changedBy: ctx.user.id,
              notes: `Renders enviados al cliente por WhatsApp (Revisión #${newRevision})`,
            });
          });
        }

        // Construir URL de galería pública
        const baseUrl = process.env.VITE_APP_URL || "https://innovarcitas.manus.space";
        const portalLink = `${baseUrl}/gallery?project=${input.projectId}&type=renders`;

        // Construir mensaje de WhatsApp
        const message = 
          `🗸️ *Renders de tu proyecto*\n\n` +
          `Hola ${client.name},\n\n` +
          `Tus renders están listos.\n` +
          `Puedes verlos aquí:\n` +
          `${portalLink}\n\n` +
          `Quedamos atentos a tu aprobación.\n\n` +
          `INNOVAR Cocinas Integrales`;

        // Enviar por WhatsApp Cloud API
        const phone = client.whatsappPhone.replace(/\D/g, '');
        const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
        
        try {
          const result = await whatsappCloud.sendTextMessage(phoneWithCountry, message);
        } catch (error) {
          console.error(`[RENDERS] Error enviando mensaje:`, error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al enviar mensaje por WhatsApp" });
        }

        return {
          success: true,
          message: `Renders enviados al cliente por WhatsApp (Revisión #${newRevision})`,
          portalLink,
          clientName: client?.name,
          revisionNumber: newRevision,
        };
      }),
});

