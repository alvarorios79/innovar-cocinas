/**
 * Utilidad para enviar notificaciones por WhatsApp Business
 * Número de WhatsApp Business: 3136802025
 */

const WHATSAPP_BUSINESS = "573136802025"; // Formato internacional

export interface WhatsAppMessage {
  to: string;
  message: string;
}

/**
 * Envía un mensaje de WhatsApp usando la API de WhatsApp Business
 * Por ahora, genera el enlace de WhatsApp Web para envío manual
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Limpiar el número de teléfono
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Asegurar que tenga el código de país (57 para Colombia)
  const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
  
  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message);
  
  // Generar enlace de WhatsApp
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
}

/**
 * Notifica al WhatsApp Business sobre una nueva cita agendada
 */
export function notifyNewAppointment(data: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  workType: string;
  scheduledDate?: Date;
  notes?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const dateStr = data.scheduledDate
    ? new Date(data.scheduledDate).toLocaleString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No especificada";

  let message = `🔔 *NUEVA CITA AGENDADA*\n\n`;
  message += `👤 *Cliente:* ${data.clientName}\n`;
  message += `📱 *WhatsApp:* ${data.clientPhone}\n`;
  if (data.clientEmail) message += `📧 *Email:* ${data.clientEmail}\n`;
  if (data.clientAddress) message += `📍 *Dirección:* ${data.clientAddress}\n`;
  message += `🛠️ *Tipo de trabajo:* ${workTypeLabels[data.workType] || data.workType}\n`;
  message += `📅 *Fecha preferida:* ${dateStr}\n`;
  if (data.notes) message += `📝 *Notas:* ${data.notes}\n`;

  return generateWhatsAppLink(WHATSAPP_BUSINESS, message);
}

/**
 * Notifica al WhatsApp Business sobre una solicitud de asesoramiento
 */
export function notifyNewAdvisoryRequest(data: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  workType: string;
  notes?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  let message = `📞 *SOLICITUD DE ASESORAMIENTO*\n\n`;
  message += `👤 *Cliente:* ${data.clientName}\n`;
  message += `📱 *WhatsApp:* ${data.clientPhone}\n`;
  if (data.clientEmail) message += `📧 *Email:* ${data.clientEmail}\n`;
  message += `🛠️ *Tipo de trabajo:* ${workTypeLabels[data.workType] || data.workType}\n`;
  if (data.notes) message += `💬 *Consulta:* ${data.notes}\n`;
  message += `\n⚠️ *El cliente solicita asesoramiento telefónico*`;

  return generateWhatsAppLink(WHATSAPP_BUSINESS, message);
}

/**
 * Envía una cotización al cliente por WhatsApp
 */
export function sendQuotationToClient(data: {
  clientName: string;
  clientPhone: string;
  workType: string;
  description: string;
  totalPrice: string;
  validUntil?: Date;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const priceFormatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(data.totalPrice));

  const validUntilStr = data.validUntil
    ? new Date(data.validUntil).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  let message = `✨ *COTIZACIÓN - INNOVAR Cocinas Integrales*\n\n`;
  message += `Hola ${data.clientName},\n\n`;
  message += `Te enviamos la cotización para tu proyecto:\n\n`;
  message += `🛠️ *Tipo:* ${workTypeLabels[data.workType] || data.workType}\n`;
  message += `📋 *Descripción:* ${data.description}\n\n`;
  message += `💰 *PRECIO TOTAL:* ${priceFormatted}\n\n`;
  if (validUntilStr) message += `⏰ *Válida hasta:* ${validUntilStr}\n\n`;
  message += `Para más información o agendar tu instalación, contáctanos.\n\n`;
  message += `¡Gracias por confiar en INNOVAR! 🏠`;

  return generateWhatsAppLink(data.clientPhone, message);
}

/**
 * Notifica al negocio sobre un nuevo estimado previo
 */
export function notifyNewEstimate(data: {
  clientName: string;
  clientPhone: string;
  workType: string;
  length?: string;
  width?: string;
  height?: string;
  counterTopType?: string;
  additionalDetails?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  let message = `📐 *NUEVO ESTIMADO PREVIO*\n\n`;
  message += `👤 *Cliente:* ${data.clientName}\n`;
  message += `📱 *WhatsApp:* ${data.clientPhone}\n`;
  message += `🛠️ *Tipo de trabajo:* ${workTypeLabels[data.workType] || data.workType}\n\n`;
  
  if (data.length || data.width || data.height) {
    message += `📏 *Medidas:*\n`;
    if (data.length) message += `  • Largo: ${data.length}m\n`;
    if (data.width) message += `  • Ancho: ${data.width}m\n`;
    if (data.height) message += `  • Alto: ${data.height}m\n`;
  }
  
  if (data.counterTopType) {
    message += `\n🪨 *Tipo de mesón:* ${data.counterTopType === "cuarzo" ? "Cuarzo" : "Sinterizado"}\n`;
  }
  
  if (data.additionalDetails) {
    message += `\n📝 *Detalles:* ${data.additionalDetails}\n`;
  }

  return generateWhatsAppLink(WHATSAPP_BUSINESS, message);
}
