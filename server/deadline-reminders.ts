/**
 * Sistema de Recordatorios de Plazos - INNOVAR Cocinas
 * 
 * Este módulo gestiona los recordatorios automáticos para:
 * - Diseñador: 3 días para entregar modelado
 * - Diseñador: 2 días para cambios en renders
 * - Jefe de taller/Operario: 25 días hábiles para entrega de obra
 * - Citas: Recordatorio previo a la cita
 */

import { getDb } from "./db";
import { projects, users, notifications, appointments, clients } from "../drizzle/schema";
import { eq, and, lte, gte, isNull, or, sql } from "drizzle-orm";

// Función para calcular días hábiles (excluyendo fines de semana)
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Excluir sábado (6) y domingo (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

// Función para calcular días hábiles restantes
export function getBusinessDaysRemaining(deadline: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  
  if (target <= today) return 0;
  
  let businessDays = 0;
  const current = new Date(today);
  
  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  return businessDays;
}

// Crear notificación para un usuario
async function createNotification(
  userId: number,
  title: string,
  body: string,
  notificationType: "proyecto" | "tarea" | "cita" | "cotizacion" | "sistema" = "sistema"
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(notifications).values({
      userId,
      title,
      body,
      type: notificationType,
      read: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Obtener usuarios por rol
async function getUsersByRole(roles: string[]): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.role} IN (${sql.join(roles.map(r => sql`${r}`), sql`, `)})`);
  
  return result.map((u: { id: number }) => u.id);
}

/**
 * Verificar recordatorios de diseño (3 días para entregar modelado)
 * Se ejecuta cuando un proyecto recibe el adelanto
 */
export async function checkDesignDeadlineReminders() {
  const db = await getDb();
  if (!db) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Buscar proyectos en estado "adelanto_recibido" o "en_diseno" con deadline próximo
  const projectsWithDeadline = await db
    .select()
    .from(projects)
    .where(
      and(
        or(
          eq(projects.status, "adelanto_recibido"),
          eq(projects.status, "en_diseno")
        ),
        isNull(projects.designDeliveredAt)
      )
    );
  
  for (const project of projectsWithDeadline) {
    if (!project.designDeadline) continue;
    
    const daysRemaining = getBusinessDaysRemaining(new Date(project.designDeadline));
    
    // Notificar si quedan 1 día o menos
    if (daysRemaining <= 1 && project.designerId) {
      await createNotification(
        project.designerId,
        `⚠️ Plazo de diseño próximo a vencer`,
        `El proyecto "${project.name}" tiene ${daysRemaining === 0 ? "HOY" : "1 día"} para entregar el modelado 3D.`,
        "proyecto"
      );
      
      // También notificar a admins
      const admins = await getUsersByRole(["super_admin", "admin"]);
      for (const adminId of admins) {
        await createNotification(
          adminId,
          `⚠️ Plazo de diseño próximo - ${project.name}`,
          `El diseñador tiene ${daysRemaining === 0 ? "HOY" : "1 día"} para entregar el modelado del proyecto "${project.name}".`,
          "proyecto"
        );
      }
    }
  }
}

/**
 * Verificar recordatorios de cambios en renders (2 días)
 * Se ejecuta cuando el cliente solicita cambios
 */
export async function checkRenderChangesReminders() {
  const db = await getDb();
  if (!db) return;
  // Buscar proyectos en estado "pendiente_cliente" que requieren cambios
  const projectsWithChanges = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "en_diseno"));
  
  for (const project of projectsWithChanges) {
    // Si tiene notas de aprobación (indica que el cliente solicitó cambios)
    if (project.clientApprovalNotes && project.designerId) {
      // Calcular días desde la última actualización
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Si han pasado más de 1 día, recordar
      if (daysSinceUpdate >= 1) {
        await createNotification(
          project.designerId,
          `⏰ Cambios pendientes en renders`,
          `El proyecto "${project.name}" tiene cambios solicitados por el cliente. Plazo: 2 días hábiles.`,
          "proyecto"
        );
      }
    }
  }
}

/**
 * Verificar recordatorios de 25 días hábiles para entrega
 * Se ejecuta cuando el cliente aprueba el diseño final
 */
export async function checkDeliveryDeadlineReminders() {
  const db = await getDb();
  if (!db) return;
  const today = new Date();
  
  // Buscar proyectos en producción con fecha estimada de instalación
  const projectsInProduction = await db
    .select()
    .from(projects)
    .where(
      and(
        or(
          eq(projects.status, "aprobacion_final"),
          eq(projects.status, "despiece"),
          eq(projects.status, "corte"),
          eq(projects.status, "enchape"),
          eq(projects.status, "ensamble"),
          eq(projects.status, "listo_instalacion")
        ),
        isNull(projects.deliveredAt)
      )
    );
  
  for (const project of projectsInProduction) {
    if (!project.estimatedInstallDate) continue;
    
    const daysRemaining = getBusinessDaysRemaining(new Date(project.estimatedInstallDate));
    
    // Notificar en diferentes momentos: 10 días, 5 días, 3 días, 1 día
    const notifyDays = [10, 5, 3, 1];
    
    if (notifyDays.includes(daysRemaining)) {
      // Notificar a jefe de taller y operarios
      const productionTeam = await getUsersByRole(["jefe_taller", "operario"]);
      
      for (const userId of productionTeam) {
        await createNotification(
          userId,
          `📅 Plazo de entrega: ${daysRemaining} días`,
          `El proyecto "${project.name}" debe entregarse en ${daysRemaining} días hábiles. Estado actual: ${getStatusLabel(project.status)}.`,
          "proyecto"
        );
      }
      
      // También notificar a admins
      const admins = await getUsersByRole(["super_admin", "admin"]);
      for (const adminId of admins) {
        await createNotification(
          adminId,
          `📅 Plazo de entrega: ${daysRemaining} días - ${project.name}`,
          `Quedan ${daysRemaining} días hábiles para entregar el proyecto. Estado: ${getStatusLabel(project.status)}.`,
          "proyecto"
        );
      }
    }
  }
}

/**
 * Verificar recordatorios de citas
 * Notifica 1 día antes de la cita
 */
export async function checkAppointmentReminders() {
  const db = await getDb();
  if (!db) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  
  // Buscar citas programadas para mañana
  const upcomingAppointments = await db
    .select({
      appointment: appointments,
      client: clients,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .where(
      and(
        or(
          eq(appointments.status, "pendiente"),
          eq(appointments.status, "confirmada")
        ),
        gte(appointments.scheduledDate, tomorrow),
        lte(appointments.scheduledDate, dayAfterTomorrow)
      )
    );
  
  for (const { appointment, client } of upcomingAppointments) {
    // Notificar a admins y comerciales
    const team = await getUsersByRole(["super_admin", "admin"]);
    
    for (const userId of team) {
      await createNotification(
        userId,
        `📆 Cita mañana: ${client.name}`,
        `Recordatorio: Cita programada para mañana con ${client.name}. ${appointment.notes || ""}`,
        "cita"
      );
    }
    
    // Notificar al cliente si tiene usuario
    if (client.userId) {
      await createNotification(
        client.userId,
        `📆 Recordatorio de cita`,
        `Tu cita con INNOVAR Cocinas está programada para mañana. ¡Te esperamos!`,
        "cita"
      );
    }
  }
}

/**
 * Calcular y establecer fechas límite al cambiar estado del proyecto
 */
export async function setProjectDeadlines(projectId: number, newStatus: string) {
  const db = await getDb();
  if (!db) return;
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return;
  
  const now = new Date();
  
  switch (newStatus) {
    case "adelanto_recibido":
      // Establecer deadline de diseño: 3 días hábiles
      const designDeadline = addBusinessDays(now, 3);
      await db
        .update(projects)
        .set({
          advanceReceivedAt: now,
          designDeadline: designDeadline,
        })
        .where(eq(projects.id, projectId));
      break;
      
    case "aprobacion_final":
      // Establecer fecha estimada de instalación: 25 días hábiles
      const estimatedInstall = addBusinessDays(now, 25);
      await db
        .update(projects)
        .set({
          clientApprovedAt: now,
          estimatedInstallDate: estimatedInstall,
        })
        .where(eq(projects.id, projectId));
      break;
      
    case "entregado":
      await db
        .update(projects)
        .set({
          deliveredAt: now,
        })
        .where(eq(projects.id, projectId));
      break;
  }
}

/**
 * Ejecutar todas las verificaciones de recordatorios
 * Esta función debe llamarse periódicamente (ej: cada hora o diariamente)
 */
export async function runAllReminders() {
  console.log("[Reminders] Running deadline checks...");
  
  try {
    await checkDesignDeadlineReminders();
    await checkRenderChangesReminders();
    await checkDeliveryDeadlineReminders();
    await checkAppointmentReminders();
    
    console.log("[Reminders] All checks completed successfully");
  } catch (error) {
    console.error("[Reminders] Error running checks:", error);
  }
}

// Helper para obtener etiqueta de estado
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    cotizacion_enviada: "Cotización Enviada",
    cotizacion_aprobada: "Cotización Aprobada",
    adelanto_recibido: "Cliente Confirmado - Iniciar Diseño",
    en_diseno: "En Diseño",
    pendiente_cliente: "Pendiente Cliente",
    aprobacion_final: "Aprobación Final",
    despiece: "Despiece",
    corte: "Corte",
    enchape: "Enchape",
    ensamble: "Ensamble",
    listo_instalacion: "Listo para Instalación",
    instalacion_programada: "Instalación Programada",
    entregado: "Entregado",
  };
  return labels[status] || status;
}
