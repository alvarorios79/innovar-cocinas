// @ts-nocheck
/**
 * Servicio de notificaciones automáticas para cambios pendientes vencidos
 * Notifica al administrador cuando un proyecto lleva más de 48 horas
 * con cambios solicitados sin atender
 */

import * as db from "./db";
import { createAndSendNotification } from "./push-notifications";

// Intervalo de verificación: cada 4 horas
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

// Umbral de tiempo: 48 horas en milisegundos
const OVERDUE_THRESHOLD = 48 * 60 * 60 * 1000;

// Registro de proyectos ya notificados para evitar duplicados
// Se limpia cada 24 horas
const notifiedProjects = new Set<number>();
let lastCleanup = Date.now();

/**
 * Limpia el registro de proyectos notificados cada 24 horas
 */
function cleanupNotifiedProjects() {
  const now = Date.now();
  if (now - lastCleanup > 24 * 60 * 60 * 1000) {
    notifiedProjects.clear();
    lastCleanup = now;
    console.log("[OverdueChanges] Registro de notificaciones limpiado");
  }
}

/**
 * Verifica proyectos con cambios pendientes vencidos y notifica al admin
 */
export async function checkOverdueChanges(): Promise<{
  checked: number;
  overdue: number;
  notified: number;
}> {
  let checked = 0;
  let overdue = 0;
  let notified = 0;

  try {
    cleanupNotifiedProjects();

    // Obtener todos los proyectos en estado "en_diseno" con cambios solicitados
    const allProjects = await db.getAllProjects();
    const projectsWithChanges = allProjects.filter(
      (p) => p.status === "en_diseno" && p.changesRequestedAt
    );

    checked = projectsWithChanges.length;
    const now = Date.now();

    for (const project of projectsWithChanges) {
      const changesDate = new Date(project.changesRequestedAt as Date).getTime();
      const timeSinceChanges = now - changesDate;

      // Verificar si supera las 48 horas
      if (timeSinceChanges > OVERDUE_THRESHOLD) {
        overdue++;

        // Solo notificar si no se ha notificado antes
        if (!notifiedProjects.has(project.id)) {
          try {
            // Obtener administradores y super admins
            const admins = await db.getUsersByRole("admin");
            const superAdmins = await db.getUsersByRole("super_admin");
            const allAdmins = [...admins, ...superAdmins];

            // Calcular días transcurridos
            const daysOverdue = Math.floor(timeSinceChanges / (24 * 60 * 60 * 1000));
            const hoursOverdue = Math.floor((timeSinceChanges % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

            // Obtener nombre del diseñador asignado
            let designerName = "Sin asignar";
            if (project.designerId) {
              const designer = await db.getUserById(project.designerId);
              if (designer) {
                designerName = designer.name || "Diseñador";
              }
            }

            // Notificar a cada admin
            for (const admin of allAdmins) {
              await createAndSendNotification(admin.id, {
                title: `⚠️ Cambios pendientes > 48h: ${project.name}`,
                body: `El proyecto "${project.name}" lleva ${daysOverdue} día(s) y ${hoursOverdue} hora(s) con cambios solicitados sin atender. Diseñador: ${designerName}. Por favor hacer seguimiento.`,
                type: "proyecto",
                referenceId: project.id,
                referenceType: "project",
                url: `/projects/${project.id}`,
              });
            }

            // También crear una tarea urgente si no existe una similar
            const existingTasks = await db.getTasksByProjectId(project.id);
            const hasOverdueTask = existingTasks.some(
              (t) => t.title.includes("URGENTE") && t.title.includes("48h") && t.status !== "completada"
            );

            if (!hasOverdueTask && allAdmins.length > 0) {
              await db.createTask({
                projectId: project.id,
                title: `🚨 URGENTE: Cambios pendientes > 48h - ${project.name}`,
                description: `El proyecto "${project.name}" lleva más de 48 horas con cambios solicitados por el cliente sin atender.\n\n` +
                  `📅 Fecha de solicitud: ${new Date(project.changesRequestedAt as Date).toLocaleString('es-CO')}\n` +
                  `⏰ Tiempo transcurrido: ${daysOverdue} día(s) y ${hoursOverdue} hora(s)\n` +
                  `👤 Diseñador asignado: ${designerName}\n\n` +
                  `📝 Cambios solicitados:\n${project.clientApprovalNotes || "No especificados"}\n\n` +
                  `⚠️ Por favor hacer seguimiento con el diseñador para resolver los cambios lo antes posible.`,
                priority: "alta",
                assignedTo: allAdmins[0].id,
                assignedBy: allAdmins[0].id,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
              });
            }

            notifiedProjects.add(project.id);
            notified++;

            console.log(
              `[OverdueChanges] Notificación enviada para proyecto ${project.id} (${project.name}) - ${daysOverdue}d ${hoursOverdue}h pendiente`
            );
          } catch (error) {
            console.error(
              `[OverdueChanges] Error notificando proyecto ${project.id}:`,
              error
            );
          }
        }
      }
    }

    if (overdue > 0) {
      console.log(
        `[OverdueChanges] Verificación completada: ${checked} proyectos revisados, ${overdue} vencidos, ${notified} notificados`
      );
    }
  } catch (error) {
    console.error("[OverdueChanges] Error en verificación:", error);
  }

  return { checked, overdue, notified };
}

/**
 * Inicia el sistema de verificación de cambios pendientes vencidos
 */
export function startOverdueChangesService(): void {
  // Verificación inicial después de 1 minuto
  setTimeout(() => {
    checkOverdueChanges().then((result) => {
      console.log(
        `[OverdueChanges] Verificación inicial: ${result.checked} proyectos, ${result.overdue} vencidos, ${result.notified} notificados`
      );
    });
  }, 60000);

  // Verificación periódica cada 4 horas
  setInterval(() => {
    checkOverdueChanges().then((result) => {
      if (result.overdue > 0) {
        console.log(
          `[OverdueChanges] Verificación periódica: ${result.overdue} proyectos vencidos, ${result.notified} notificados`
        );
      }
    });
  }, CHECK_INTERVAL);

  console.log(
    "[OverdueChanges] Servicio de cambios pendientes vencidos iniciado (verificación cada 4 horas)"
  );
}

/**
 * Limpiar un proyecto del registro de notificados
 * (llamar cuando se resuelvan los cambios)
 */
export function clearProjectFromNotified(projectId: number): void {
  notifiedProjects.delete(projectId);
}
