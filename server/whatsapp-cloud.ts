/**
 * Servicio de WhatsApp Cloud API para INNOVAR Cocinas
 * Permite enviar mensajes automáticos a través de la API oficial de Meta
 * 
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// Variables de entorno necesarias (se configuran en el panel de administración)
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

export interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface WhatsAppTextMessage {
  to: string;
  message: string;
}

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "image" | "document" | "video";
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

/**
 * Verifica si WhatsApp Cloud API está configurado
 */
export function isWhatsAppCloudConfigured(): boolean {
  return !!(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Obtiene la configuración actual de WhatsApp Cloud
 */
export function getWhatsAppCloudConfig(): WhatsAppCloudConfig | null {
  if (!isWhatsAppCloudConfigured()) {
    return null;
  }
  return {
    accessToken: WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
  };
}

/**
 * Formatea un número de teléfono colombiano para WhatsApp
 * WhatsApp requiere el formato internacional sin + ni espacios
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Eliminar todos los caracteres no numéricos
  let cleanPhone = phone.replace(/\D/g, "");
  
  // Si empieza con 57, ya tiene código de país
  if (cleanPhone.startsWith("57")) {
    return cleanPhone;
  }
  
  // Si empieza con 3 (celular colombiano), agregar 57
  if (cleanPhone.startsWith("3") && cleanPhone.length === 10) {
    return `57${cleanPhone}`;
  }
  
  // Si tiene otro formato, intentar agregar 57
  return `57${cleanPhone}`;
}

/**
 * Envía un mensaje de texto simple por WhatsApp
 */
export async function sendTextMessage(
  to: string,
  message: string
): Promise<WhatsAppMessageResponse> {
  if (!isWhatsAppCloudConfigured()) {
    return {
      success: false,
      error: "WhatsApp Cloud API no está configurado. Configure WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const formattedPhone = formatPhoneForWhatsApp(to);

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages.length > 0) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    // Error de la API
    return {
      success: false,
      error: data.error?.message || "Error desconocido al enviar mensaje",
      errorCode: data.error?.code?.toString(),
    };
  } catch (error) {
    console.error("[WhatsApp Cloud] Error enviando mensaje:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

/**
 * Envía un mensaje usando una plantilla pre-aprobada
 * Las plantillas deben estar aprobadas en Meta Business
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = "es",
  components?: TemplateComponent[]
): Promise<WhatsAppMessageResponse> {
  if (!isWhatsAppCloudConfigured()) {
    return {
      success: false,
      error: "WhatsApp Cloud API no está configurado.",
    };
  }

  const formattedPhone = formatPhoneForWhatsApp(to);

  try {
    const templatePayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    // Agregar componentes si se proporcionan
    if (components && components.length > 0) {
      (templatePayload.template as Record<string, unknown>).components = components;
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages.length > 0) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    return {
      success: false,
      error: data.error?.message || "Error al enviar plantilla",
      errorCode: data.error?.code?.toString(),
    };
  } catch (error) {
    console.error("[WhatsApp Cloud] Error enviando plantilla:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

/**
 * Verifica el estado de la conexión con WhatsApp Cloud API
 */
export async function verifyConnection(): Promise<{
  connected: boolean;
  phoneNumber?: string;
  displayName?: string;
  error?: string;
}> {
  if (!isWhatsAppCloudConfigured()) {
    return {
      connected: false,
      error: "Credenciales no configuradas",
    };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        connected: true,
        phoneNumber: data.display_phone_number,
        displayName: data.verified_name,
      };
    }

    return {
      connected: false,
      error: data.error?.message || "Error de conexión",
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}

// ============ MENSAJES PRE-DEFINIDOS PARA INNOVAR ============

/**
 * Envía confirmación de cita agendada al cliente
 */
export async function sendAppointmentConfirmation(
  clientPhone: string,
  clientName: string,
  appointmentDate: Date,
  workType: string
): Promise<WhatsAppMessageResponse> {
  const dateStr = appointmentDate.toLocaleString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const message = `✅ *Cita Confirmada - INNOVAR Cocinas*

Hola ${clientName},

Tu cita ha sido agendada exitosamente:

📅 *Fecha:* ${dateStr}
🛠️ *Tipo:* ${workTypeLabels[workType] || workType}

📍 Nos encontramos en:
K9 vía Cerritos a Pereira

Si necesitas reagendar, contáctanos con anticipación.

¡Te esperamos! 🏠`;

  return sendTextMessage(clientPhone, message);
}

/**
 * Envía recordatorio de cita (24 horas antes)
 */
export async function sendAppointmentReminder(
  clientPhone: string,
  clientName: string,
  appointmentDate: Date,
  workType: string
): Promise<WhatsAppMessageResponse> {
  const dateStr = appointmentDate.toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const message = `⏰ *Recordatorio de Cita - INNOVAR Cocinas*

Hola ${clientName},

Te recordamos que tienes una cita programada para *mañana*:

📅 ${dateStr}

📍 K9 vía Cerritos a Pereira

Si no puedes asistir, por favor avísanos con tiempo.

¡Te esperamos! 🏠`;

  return sendTextMessage(clientPhone, message);
}

/**
 * Envía notificación de cotización lista
 */
export async function sendQuotationReady(
  clientPhone: string,
  clientName: string,
  quotationNumber: string,
  totalAmount: string,
  portalUrl?: string
): Promise<WhatsAppMessageResponse> {
  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(totalAmount));

  let message = `📋 *Cotización Lista - INNOVAR Cocinas*

Hola ${clientName},

Tu cotización *${quotationNumber}* está lista:

💰 *Total:* ${formattedAmount}

`;

  if (portalUrl) {
    message += `🔗 Puedes verla y aprobarla aquí:
${portalUrl}

`;
  }

  message += `Si tienes preguntas, estamos para ayudarte.

¡Gracias por confiar en INNOVAR! 🏠`;

  return sendTextMessage(clientPhone, message);
}

/**
 * Envía actualización de estado del proyecto
 */
export async function sendProjectStatusUpdate(
  clientPhone: string,
  clientName: string,
  projectName: string,
  newStatus: string,
  portalUrl?: string
): Promise<WhatsAppMessageResponse> {
  const statusLabels: Record<string, string> = {
    pendiente_cliente: "Pendiente de Aprobación",
    aprobado: "Aprobado",
    en_diseno: "En Diseño",
    pendiente_modelado: "Modelado en Proceso",
    modelado_listo: "Modelado Listo para Revisión",
    en_produccion: "En Producción",
    corte: "En Producción - Corte",
    armado: "En Producción - Armado",
    pintura: "En Producción - Pintura",
    listo: "Listo para Entrega",
    entregado: "Entregado",
  };

  const statusEmojis: Record<string, string> = {
    pendiente_cliente: "⏳",
    aprobado: "✅",
    en_diseno: "🎨",
    pendiente_modelado: "📐",
    modelado_listo: "🖼️",
    en_produccion: "🔨",
    corte: "✂️",
    armado: "🔧",
    pintura: "🎨",
    listo: "📦",
    entregado: "🎉",
  };

  const emoji = statusEmojis[newStatus] || "📋";
  const statusLabel = statusLabels[newStatus] || newStatus;

  let message = `${emoji} *Actualización de Proyecto - INNOVAR*

Hola ${clientName},

Tu proyecto *${projectName}* ha cambiado de estado:

📋 *Nuevo estado:* ${statusLabel}

`;

  if (portalUrl) {
    message += `🔗 Ver detalles:
${portalUrl}

`;
  }

  message += `¡Gracias por tu confianza! 🏠`;

  return sendTextMessage(clientPhone, message);
}

/**
 * Envía felicitación de cumpleaños
 */
export async function sendBirthdayGreeting(
  clientPhone: string,
  clientName: string
): Promise<WhatsAppMessageResponse> {
  const message = `🎂 *¡Feliz Cumpleaños, ${clientName}!*

De parte de todo el equipo de *INNOVAR Cocinas Integrales*, te deseamos un día lleno de alegría y bendiciones.

🎁 Como regalo especial, te ofrecemos un *10% de descuento* en tu próximo proyecto con nosotros.

¡Que este nuevo año de vida esté lleno de éxitos! 🎉

Con cariño,
*INNOVAR Cocinas* 🏠`;

  return sendTextMessage(clientPhone, message);
}

/**
 * Envía recordatorio de pago pendiente
 */
export async function sendPaymentReminder(
  clientPhone: string,
  clientName: string,
  projectName: string,
  pendingAmount: string
): Promise<WhatsAppMessageResponse> {
  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(pendingAmount));

  const message = `💳 *Recordatorio de Pago - INNOVAR*

Hola ${clientName},

Te recordamos que tienes un saldo pendiente en tu proyecto *${projectName}*:

💰 *Saldo:* ${formattedAmount}

Para realizar el pago, puedes:
• Transferencia bancaria
• Efectivo en nuestras instalaciones

Si ya realizaste el pago, por favor envíanos el comprobante.

¡Gracias! 🏠`;

  return sendTextMessage(clientPhone, message);
}
