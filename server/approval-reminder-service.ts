/**
 * Servicio de recordatorios de aprobación de diseño — INNOVAR
 *
 * Cuando un proyecto queda en "pendiente_modelado" o "pendiente_render",
 * este servicio envía recordatorios automáticos al cliente vía WhatsApp
 * y notifica al comercial si el cliente lleva varios días sin responder.
 *
 * Calendario:
 *   T+5h   → Recordatorio 1: WhatsApp al cliente (approvalReminderCount 0→1)
 *   T+48h  → Recordatorio 2: WhatsApp al cliente (approvalReminderCount 1→2)
 *   T+96h  → Alerta interna al comercial        (approvalReminderCount 2→3)
 *
 * T = momento en que se envió el diseño al cliente (último entry en historial
 *     con toStatus = status actual del proyecto).
 */

import * as db from "./db";
import * as whatsappCloud from "./whatsapp-cloud";

const BASE_URL = process.env.VITE_APP_URL || "https://innovarcitas.manus.space";

interface ReminderStep {
  minHours: number;
  action: "whatsapp" | "comercial_alert";
  label: string;
}

const REMINDER_STEPS: Record<number, ReminderStep> = {
  0: { minHours: 5,  action: "whatsapp",         label: "Recordatorio 1 (5h)" },
  1: { minHours: 48, action: "whatsapp",         label: "Recordatorio 2 (Día 2)" },
  2: { minHours: 96, action: "comercial_alert",  label: "Alerta comercial (Día 4)" },
};

async function runApprovalReminders(): Promise<void> {
  try {
    const pendingProjects = await db.getProjectsPendingApproval();

    for (const project of pendingProjects) {
      try {
        const reminderCount = (project as any).approvalReminderCount ?? 0;
        if (reminderCount >= 3) continue; // Ya se completaron todos los pasos

        const step = REMINDER_STEPS[reminderCount];
        if (!step) continue;

        // Buscar cuándo se envió el diseño al cliente (última entrada en historial
        // con toStatus igual al estado actual del proyecto)
        const history = await db.getProjectStatusHistory(project.id);
        const sentEntry = history.find((h: any) => h.toStatus === project.status);
        if (!sentEntry?.createdAt) continue;

        const sentAt = new Date(sentEntry.createdAt);
        const hoursElapsed = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed < step.minHours) continue; // Aún no es hora

        const client = project.clientId ? await db.getClientById(project.clientId) : null;

        if (step.action === "whatsapp") {
          if (!client?.whatsappPhone) {
            console.warn(`[ApprovalReminder] Proyecto ${project.id} sin teléfono de cliente, omitiendo WA`);
            continue;
          }

          const designType = project.status === "pendiente_modelado" ? "modelado_3d" : "renders";
          const designLabel = project.status === "pendiente_modelado" ? "Modelado 3D" : "Renders";
          const portalLink = `${BASE_URL}/gallery?project=${project.id}&token=${(project as any).publicToken ?? ""}&type=${designType}`;

          const isFirstReminder = reminderCount === 0;
          const message = isFirstReminder
            ? `🔔 *Recordatorio: ${designLabel} listo*\n\n` +
              `Hola ${client.name},\n\n` +
              `Te recordamos que tu ${designLabel.toLowerCase()} está esperando tu revisión y aprobación.\n\n` +
              `👉 ${portalLink}\n\n` +
              `Cualquier pregunta, con gusto te atendemos.\n\n` +
              `INNOVAR Cocinas Integrales`
            : `🔔 *Segundo recordatorio: ${designLabel}*\n\n` +
              `Hola ${client.name},\n\n` +
              `Aún estamos esperando tu aprobación del ${designLabel.toLowerCase()}. ` +
              `Por favor revísalo cuando puedas.\n\n` +
              `👉 ${portalLink}\n\n` +
              `Si tienes alguna duda, llámanos.\n\n` +
              `INNOVAR Cocinas Integrales`;

          const phone = client.whatsappPhone.replace(/\D/g, "");
          const phoneWithCountry = phone.startsWith("57") ? phone : `57${phone}`;

          await whatsappCloud.sendTextMessage(phoneWithCountry, message);
          console.log(`[ApprovalReminder] ${step.label} enviado — proyecto ${project.id} (${project.name})`);

        } else if (step.action === "comercial_alert") {
          // Notificar a todos los comerciales
          const { createAndSendNotification } = await import("./push-notifications");
          const comerciales = await db.getUsersByRole("comercial");
          const admins      = await db.getUsersByRole("admin");
          const recipients  = [...comerciales, ...admins];

          const clientName = client?.name ?? "El cliente";
          for (const user of recipients) {
            await createAndSendNotification(user.id, {
              title: `⏰ Sin respuesta: ${project.name}`,
              body: `${clientName} lleva más de 4 días sin aprobar el diseño. Contacto manual necesario.`,
              type: "proyecto",
              referenceId: project.id,
              referenceType: "project",
              url: `/projects/${project.id}`,
            });
          }
          console.log(`[ApprovalReminder] ${step.label} enviado a comerciales — proyecto ${project.id} (${project.name})`);
        }

        // Incrementar contador de recordatorios
        await db.updateProject(project.id, {
          approvalReminderCount: reminderCount + 1,
        } as any);

      } catch (projectErr) {
        console.error(`[ApprovalReminder] Error en proyecto ${project.id}:`, projectErr);
      }
    }
  } catch (err) {
    console.error("[ApprovalReminder] Error general:", err);
  }
}

export function startApprovalReminderService(): void {
  // Ejecutar cada hora
  setInterval(runApprovalReminders, 60 * 60 * 1000);

  // Ejecutar 1 minuto después de iniciar el servidor (para no bloquear el arranque)
  setTimeout(runApprovalReminders, 60 * 1000);

  console.log("[ApprovalReminder] Servicio de recordatorios de aprobación iniciado");
}
