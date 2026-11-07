/**
 * Aviso al dueño (Álvaro) — antes usaba el "Notification Service" de Manus (Forge), que ya no
 * existe: fallaba siempre ("Notification service URL is not configured") y no avisaba nada.
 * Ahora avisa a los super_admin por la campanita del CRM + notificación push.
 */
export type NotificationPayload = { title: string; content: string };

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const title = (payload?.title || "").trim().slice(0, 1200);
  const content = (payload?.content || "").trim().slice(0, 20000);
  if (!title || !content) return false;
  try {
    const db = await import("../db");
    const { createAndSendNotification } = await import("../push-notifications");
    const owners = await db.getUsersByRole("super_admin");
    for (const u of owners) {
      await createAndSendNotification(u.id, { title, body: content, type: "sistema", url: "/" });
    }
    return owners.length > 0;
  } catch (error) {
    console.warn("[notifyOwner] No se pudo avisar al dueño:", error);
    return false;
  }
}
