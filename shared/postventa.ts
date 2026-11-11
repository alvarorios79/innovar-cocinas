/**
 * Postventa de Innovar — reglas y mensajes compartidos (CRM y servidor).
 *
 * Decisiones de Álvaro (10 nov 2026):
 * - Garantía: 6 meses para todo (madera y herrajes).
 * - A los 30 días: llamada de satisfacción (y pedir reseña en Google).
 * - Al año: regalar una revisión para venderle un mantenimiento.
 * - Las llamadas las hacen Martha (admin) y comercial; Álvaro también recibe los avisos,
 *   y cuando alguno lo hace, el aviso se le borra a todos.
 */
export const WARRANTY_DAYS = 180;
/** Días antes del vencimiento en que se avisa "próximo a vencer". */
export const WARRANTY_WARN_DAYS = 30;
/** Quiénes reciben los avisos de postventa. */
export const POSTVENTA_NOTIFY_ROLES = ["super_admin", "admin", "comercial"];
/** referenceType de los avisos (campanita) de postventa: referenceId = id de la reclamación/seguimiento. */
export const POSTVENTA_REF = "postventa";

export type WarrantyInfo = {
  status: "sin_fecha" | "vigente" | "por_vencer" | "vencida";
  label: string;
  daysElapsed: number;
  daysLeft: number;
  endsAt: Date | null;
};

export function warrantyInfo(deliveredAt: string | Date | null | undefined, now = new Date()): WarrantyInfo {
  if (!deliveredAt) return { status: "sin_fecha", label: "Sin fecha de entrega", daysElapsed: 0, daysLeft: 0, endsAt: null };
  const start = new Date(deliveredAt);
  const endsAt = new Date(start.getTime() + WARRANTY_DAYS * 86400000);
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86400000);
  const fecha = endsAt.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  if (daysLeft <= 0) return { status: "vencida", label: `Garantía vencida (${fecha})`, daysElapsed, daysLeft: 0, endsAt };
  if (daysLeft <= WARRANTY_WARN_DAYS) return { status: "por_vencer", label: `Garantía vence el ${fecha}`, daysElapsed, daysLeft, endsAt };
  return { status: "vigente", label: `En garantía hasta el ${fecha}`, daysElapsed, daysLeft, endsAt };
}

const firstName = (name?: string | null) => (name || "").trim().split(/\s+/)[0] || "";

/** WhatsApp a los 30 días: cómo le ha ido + reseña en Google. */
export function followUp30Message(clientName: string | null | undefined, reviewUrl: string): string {
  const n = firstName(clientName);
  return (
    `😊 ¡Hola${n ? ` ${n}` : ""}! Te saluda el equipo de INNOVAR Cocinas de Diseño.\n\n` +
    `Ya pasó un mes desde que entregamos tu proyecto y queremos saber cómo te ha ido. ¿Todo funciona bien? ¿Hay algún detalle que debamos ajustar? Estamos para servirte.\n\n` +
    `⭐ Si estás contento con el resultado, nos ayudarías muchísimo con tu opinión en Google (toma menos de un minuto):\n${reviewUrl}\n\n` +
    `¡Gracias por confiar en nosotros! ✨`
  );
}

/** WhatsApp al año: revisión de regalo (para ofrecer mantenimiento). */
export function annualReviewMessage(clientName: string | null | undefined): string {
  const n = firstName(clientName);
  return (
    `🎁 ¡Hola${n ? ` ${n}` : ""}! Hoy se cumple un año de tu proyecto con INNOVAR Cocinas de Diseño y queremos celebrarlo con un regalo:\n\n` +
    `*una revisión gratuita* de tus muebles: revisamos bisagras, correderas, puertas, cajones y acabados para que todo siga como el primer día.\n\n` +
    `¿Qué día te queda bien para visitarte? 🏠\n\n` +
    `— INNOVAR Cocinas de Diseño ✨`
  );
}

/** WhatsApp para responder un reporte de problema del cliente. */
export function claimReplyMessage(clientName: string | null | undefined, title: string): string {
  const n = firstName(clientName);
  return (
    `🛠️ ¡Hola${n ? ` ${n}` : ""}! Recibimos tu reporte: *${title}*.\n\n` +
    `Ya lo estamos revisando. ¿Qué día y a qué hora te queda bien que pasemos a revisarlo?\n\n` +
    `— INNOVAR Cocinas de Diseño ✨`
  );
}

/** Número para wa.me (10 dígitos → con 57). */
export function postventaWaPhone(phone?: string | null): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  return d.length > 10 ? d : `57${d}`;
}

/** Fotos que el cliente adjuntó al reporte (líneas "📷 url" al final de la descripción). */
export function splitClaimPhotos(description?: string | null): { text: string; photos: string[] } {
  const photos: string[] = [];
  const text = (description || "").split("\n").filter((l) => {
    const t = l.trim();
    const m = t.startsWith("\uD83D\uDCF7") ? t.slice(2).trim().match(/^(\S+)$/) : null;
    if (m) { photos.push(m[1]); return false; }
    return true;
  }).join("\n").trim();
  return { text, photos };
}
