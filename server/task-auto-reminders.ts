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
    // 3. La fecha límite es mañana o antes (pero no pasada hace más de 1 día)
    const tasksToRemind = allTasks.filter(task => {
      if (task.status === "completada" || !task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      const oneDayBefore = new Date(dueDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(0, 0, 0, 0);
      
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      // La tarea está próxima a vencer si:
      // - Hoy es el día anterior a la fecha límite
      // - O la fecha límite es hoy
      // - O la fecha límite ya pasó (pero no más de 3 días)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      return dueDate >= threeDaysAgo && dueDate <= tomorrow;
    });

    // Enviar recordatorios automáticos
    for (const task of tasksToRemind) {
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

      const notificationBody = `${urgencyText}\nTarea: "${task.title}"\nFecha límite: ${dueDate.toLocaleDateString("es-CO")}`;

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
