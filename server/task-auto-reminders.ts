/**
 * Sistema de recordatorios automáticos de tareas
 * Envía notificaciones automáticas cuando una tarea está próxima a vencer (1 día antes)
 */

import * as db from "./db";
import { createAndSendNotification } from "./push-notifications";

// Intervalo de verificación: cada hora
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hora en milisegundos

/**
 * Verifica las tareas próximas a vencer y envía recordatorios automáticos
 */
export async function checkAndSendAutoReminders() {
  try {
    const allTasks = await db.getAllTasks();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Filtrar tareas que:
    // 1. No están completadas
    // 2. Tienen fecha límite
    // 3. Vencen hoy o mañana (recordatorio previo)
    // 4. O vencieron ayer (máximo 1 día de retraso, 1 sola notificación de vencimiento)
    const tasksToRemind = allTasks.filter(task => {
      if (task.status === "completada" || !task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(23, 59, 59, 999);
      
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      // Solo recordar si:
      // - Vence hoy o mañana (recordatorio próxima a vencer)
      // - O venció ayer exactamente (1 sola notificación de tarea vencida)
      // Tareas con más de 1 día de retraso NO reciben más notificaciones automáticas
      return dueDate >= yesterdayStart && dueDate <= tomorrow;
    });

    // Obtener proyectos entregados para excluir sus tareas
    const allProjects = await db.getAllProjects();
    const deliveredProjectIds = new Set(
      allProjects.filter(p => p.status === "entregado" || p.deliveredAt).map(p => p.id)
    );

    // Enviar recordatorios automáticos
    for (const task of tasksToRemind) {
      // No recordar tareas de proyectos ya entregados
      if (task.projectId && deliveredProjectIds.has(task.projectId)) {
        continue;
      }

      // Cap: máximo 3 recordatorios automáticos por tarea.
      // Después de 3, la tarea sigue visible en el panel pero no genera más push ni campanilla.
      // Esto evita saturar la bandeja cuando una tarea manual no se marca completa a tiempo.
      if ((task.reminderCount ?? 0) >= 3) {
        continue;
      }

      // Verificar si ya se envió un recordatorio automático hoy
      if (task.lastReminderSentAt) {
        const lastReminder = new Date(task.lastReminderSentAt);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        // Si ya se envió un recordatorio hoy, saltar
        if (lastReminder >= todayStart) {
          continue;
        }
      }

      const dueDate = new Date(task.dueDate!);
      const isOverdue = dueDate < now;
      const isToday = dueDate.toDateString() === now.toDateString();
      
      let urgencyText = "";
      if (isOverdue) {
        urgencyText = "⚠️ VENCIDA";
      } else if (isToday) {
        urgencyText = "📅 Vence HOY";
      } else {
        urgencyText = "📅 Vence MAÑANA";
      }

      const notificationBody = `${urgencyText}\nTarea: "${task.title}"\nFecha límite: ${dueDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`;

      // Crear notificación en la app
      await db.createNotification({
        userId: task.assignedTo,
        title: "⏰ Recordatorio automático de tarea",
        body: notificationBody,
        type: "tarea",
        referenceId: task.id,
        referenceType: "task",
      });

      // Intentar enviar notificación push
      try {
        await createAndSendNotification(task.assignedTo, {
          title: `⏰ ${urgencyText}`,
          body: `Tarea: ${task.title}`,
          type: "tarea",
          url: "/tasks",
        });
      } catch (e) {
        // Silenciar error de push
      }

      // Actualizar historial de recordatorios (userId 0 indica recordatorio automático del sistema)
      await db.updateTaskReminderHistory(task.id, 0);
    }

    return { 
      checked: allTasks.length, 
      reminded: tasksToRemind.length 
    };
  } catch (error) {
    console.error("[AutoReminders] Error checking tasks:", error);
    return { checked: 0, reminded: 0, error: String(error) };
  }
}

/**
 * Inicia el sistema de recordatorios automáticos
 */
export function startAutoReminderSystem() {
  // Ejecutar verificación inicial después de 30 segundos (para dar tiempo a que el servidor inicie)
  setTimeout(() => {
    checkAndSendAutoReminders().then(result => {
      console.log(`[AutoReminders] Initial check: ${result.checked} tasks checked, ${result.reminded} reminders sent`);
    });
  }, 30000);

  // Configurar verificación periódica cada hora
  setInterval(() => {
    checkAndSendAutoReminders().then(result => {
      if (result.reminded > 0) {
        console.log(`[AutoReminders] Periodic check: ${result.reminded} reminders sent`);
      }
    });
  }, CHECK_INTERVAL);

  console.log("[AutoReminders] Auto-reminder system started (checking every hour)");
}
