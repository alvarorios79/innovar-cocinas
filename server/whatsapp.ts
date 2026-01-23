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
  preferredCallTime?: string;
  notes?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const callTimeLabels: Record<string, string> = {
    morning: "Mañana (8:00 AM - 12:00 PM)",
    afternoon: "Tarde (12:00 PM - 5:00 PM)",
    evening: "Noche (5:00 PM - 8:00 PM)",
    anytime: "Cualquier hora",
  };

  let message = `📞 *SOLICITUD DE ASESORAMIENTO*\n\n`;
  message += `👤 *Cliente:* ${data.clientName}\n`;
  message += `📱 *WhatsApp:* ${data.clientPhone}\n`;
  if (data.clientEmail) message += `📧 *Email:* ${data.clientEmail}\n`;
  message += `🛠️ *Tipo de trabajo:* ${workTypeLabels[data.workType] || data.workType}\n`;
  if (data.preferredCallTime) message += `⏰ *Horario preferido:* ${callTimeLabels[data.preferredCallTime] || data.preferredCallTime}\n`;
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
  kitchenShape?: string;
  linearLength?: number;
  height?: number;
  materialType?: string;
  additionalDetails?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const shapeLabels: Record<string, string> = {
    L: "En forma de L",
    U: "En forma de U",
    lineal: "Lineal",
  };

  const materialLabels: Record<string, string> = {
    quarzone: "Quarzone",
    sinterizado: "Sinterizado",
  };

  let message = `📐 *NUEVO ESTIMADO PREVIO*\n\n`;
  message += `👤 *Cliente:* ${data.clientName}\n`;
  message += `📱 *WhatsApp:* ${data.clientPhone}\n`;
  message += `🛠️ *Tipo de trabajo:* ${workTypeLabels[data.workType] || data.workType}\n\n`;
  
  if (data.kitchenShape) {
    message += `📐 *Forma de cocina:* ${shapeLabels[data.kitchenShape] || data.kitchenShape}\n`;
  }
  
  if (data.linearLength || data.height) {
    message += `📏 *Medidas:*`;
    if (data.linearLength) message += ` Largo lineal: ${data.linearLength}m`;
    if (data.linearLength && data.height) message += ` |`;
    if (data.height) message += ` Alto: ${data.height}m`;
    message += `\n`;
  }
  
  if (data.materialType) {
    message += `🪨 *Tipo de mesón:* ${materialLabels[data.materialType] || data.materialType}\n`;
  }
  
  if (data.additionalDetails) {
    message += `\n📝 *Detalles:* ${data.additionalDetails}\n`;
  }

  return generateWhatsAppLink(WHATSAPP_BUSINESS, message);
}


/**
 * Notifica al WhatsApp Business cuando un cliente aprueba una cotización
 */
export function notifyQuotationApproved(data: {
  clientName: string;
  clientPhone: string;
  quotationNumber: string;
  workType: string;
  totalAmount: string;
  advanceAmount?: string;
  portalUrl?: string;
}): string {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puerta: "Puertas",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
    herrajes: "Herrajes",
    mesones: "Mesones",
    otro: "Otro",
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(num);
  };

  let message = `🎉 *¡COTIZACIÓN APROBADA!*\n\n`;
  message += `✅ El cliente ha aprobado la cotización y se ha creado el proyecto automáticamente.\n\n`;
  message += `📋 *Detalles:*\n`;
  message += `• *Cotización:* ${data.quotationNumber}\n`;
  message += `• *Cliente:* ${data.clientName}\n`;
  message += `• *WhatsApp:* ${data.clientPhone}\n`;
  message += `• *Tipo:* ${workTypeLabels[data.workType] || data.workType}\n`;
  message += `• *Monto Total:* ${formatCurrency(data.totalAmount)}\n`;
  
  if (data.advanceAmount) {
    message += `• *Adelanto informado:* ${formatCurrency(data.advanceAmount)}\n`;
  }
  
  message += `\n⚡ *Acción requerida:*\n`;
  message += `1. Verificar comprobante de pago del adelanto\n`;
  message += `2. Confirmar recepción del adelanto en el sistema\n`;
  message += `3. Coordinar con diseño para iniciar el proyecto\n`;
  
  if (data.portalUrl) {
    message += `\n🔗 Ver proyecto: ${data.portalUrl}`;
  }

  return generateWhatsAppLink(WHATSAPP_BUSINESS, message);
}
