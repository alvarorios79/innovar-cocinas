/**
 * Servicio de WhatsApp Cloud API para INNOVAR Cocinas
 * Permite enviar mensajes automáticos a través de la API oficial de Meta
 * 
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

// Variables de entorno necesarias (se configuran en el panel de administración)
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_API_VERSION = "v21.0";

// Logo de INNOVAR para plantillas con imagen
const INNOVAR_LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663292328262/MrjmfKRiCJFHQLzk.png";
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
 * Envía confirmación de cita agendada al cliente usando plantilla con logo
 * Plantilla: confirmacion_cita (con imagen de encabezado)
 * Variables: {{1}} nombre, {{2}} fecha, {{3}} hora, {{4}} tipo de trabajo
 */
export async function sendAppointmentConfirmation(
  clientPhone: string,
  clientName: string,
  appointmentDate: Date,
  workType: string
): Promise<WhatsAppMessageResponse> {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const dateStr = appointmentDate.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });

  const timeStr = appointmentDate.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });

  const workTypeLabel = workTypeLabels[workType] || workType;

  // Intentar enviar con plantilla (funciona sin ventana de 24h)
  const templateResult = await sendTemplateMessage(
    clientPhone,
    "confirmacion_cita",
    "es",
    [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: INNOVAR_LOGO_URL },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: clientName },
          { type: "text", text: dateStr },
          { type: "text", text: timeStr },
          { type: "text", text: workTypeLabel },
        ],
      },
    ]
  );

  // Si la plantilla falla (no aprobada aún), usar texto libre como fallback
  if (!templateResult.success) {
    console.log(`[WhatsApp] Plantilla falló (${templateResult.error}), usando texto libre como fallback`);
    const message = `✅ *Cita Confirmada - INNOVAR Cocinas*\n\nHola ${clientName},\n\nTu cita ha sido agendada exitosamente:\n\n📅 *Fecha:* ${dateStr}\n⏰ *Hora:* ${timeStr}\n🛠️ *Tipo:* ${workTypeLabel}\n\n📍 *Dirección:* K9 vía Cerritos a Pereira\n\nSi necesitas reagendar, contáctanos con anticipación.\n\n¡Te esperamos! 🏠`;
    return sendTextMessage(clientPhone, message);
  }

  return templateResult;
}

/**
 * Envía recordatorio de cita (24 horas antes) usando plantilla con logo
 * Plantilla: recordatorio_cita (con imagen de encabezado)
 * Variables: {{1}} nombre, {{2}} fecha, {{3}} hora
 */
export async function sendAppointmentReminder(
  clientPhone: string,
  clientName: string,
  appointmentDate: Date,
  workType: string
): Promise<WhatsAppMessageResponse> {
  const dateStr = appointmentDate.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });

  const timeStr = appointmentDate.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });

  // Intentar enviar con plantilla (funciona sin ventana de 24h)
  const templateResult = await sendTemplateMessage(
    clientPhone,
    "recordatorio_cita",
    "es",
    [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: INNOVAR_LOGO_URL },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: clientName },
          { type: "text", text: dateStr },
          { type: "text", text: timeStr },
        ],
      },
    ]
  );

  // Si la plantilla falla, usar texto libre como fallback
  if (!templateResult.success) {
    console.log(`[WhatsApp] Plantilla recordatorio_cita falló (${templateResult.error}), usando texto libre como fallback`);
    const fullDateStr = appointmentDate.toLocaleString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const message = `⏰ *Recordatorio de Cita - INNOVAR Cocinas*\n\nHola ${clientName},\n\nTe recordamos que tienes una cita programada para *mañana*:\n\n📅 ${fullDateStr}\n\n📍 K9 vía Cerritos a Pereira\n\nSi no puedes asistir, por favor avísanos con tiempo.\n\n¡Te esperamos! 🏠`;
    return sendTextMessage(clientPhone, message);
  }

  return templateResult;
}

/**
 * Envía notificación de cotización lista usando plantilla con logo
 * Plantilla: cotizacion_lista (con imagen de encabezado)
 * Variables: {{1}} nombre, {{2}} número cotización, {{3}} total
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

  // Intentar enviar con plantilla (funciona sin ventana de 24h)
  const templateResult = await sendTemplateMessage(
    clientPhone,
    "cotizacion_lista",
    "es",
    [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: INNOVAR_LOGO_URL },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: clientName },
          { type: "text", text: quotationNumber },
          { type: "text", text: formattedAmount },
        ],
      },
    ]
  );

  // Si la plantilla falla, usar texto libre como fallback
  if (!templateResult.success) {
    console.log(`[WhatsApp] Plantilla cotizacion_lista falló (${templateResult.error}), usando texto libre como fallback`);
    let message = `📋 *Cotización Lista - INNOVAR Cocinas*\n\nHola ${clientName},\n\nTu cotización *${quotationNumber}* está lista:\n\n💰 *Total:* ${formattedAmount}\n\n`;
    if (portalUrl) {
      message += `🔗 Puedes verla y aprobarla aquí:\n${portalUrl}\n\n`;
    }
    message += `Si tienes preguntas, estamos para ayudarte.\n\n¡Gracias por confiar en INNOVAR! 🏠`;
    return sendTextMessage(clientPhone, message);
  }

  return templateResult;
}

/**
 * Envía actualización de estado del proyecto usando plantilla con logo
 * Plantilla: actualizacion_proyecto (con imagen de encabezado)
 * Variables: {{1}} nombre, {{2}} nombre proyecto, {{3}} nuevo estado
 */
export async function sendProjectStatusUpdate(
  clientPhone: string,
  clientName: string,
  projectName: string,
  newStatus: string,
  portalUrl?: string
): Promise<WhatsAppMessageResponse> {
  const statusLabels: Record<string, string> = {
    contacto: "Contacto",
    cotizacion_enviada: "Cotización Enviada",
    cotizacion_aprobada: "Cotización Aprobada",
    adelanto_recibido: "Adelanto Recibido",
    en_diseno: "En Diseño",
    pendiente_modelado: "Modelado 3D Listo",
    pendiente_render: "Renders Listos",
    aprobacion_final: "Aprobación Final",
    despiece: "Despiece",
    corte: "En Producción - Corte",
    enchape: "En Producción - Enchape",
    ensamble: "En Producción - Ensamble",
    listo_instalacion: "Listo para Instalación",
    entregado: "Entregado",
  };

  const statusEmojis: Record<string, string> = {
    contacto: "📞",
    cotizacion_enviada: "📝",
    cotizacion_aprobada: "✅",
    adelanto_recibido: "💰",
    en_diseno: "🎨",
    pendiente_modelado: "📐",
    pendiente_render: "🖼️",
    aprobacion_final: "✅",
    despiece: "📋",
    corte: "✂️",
    enchape: "🪵",
    ensamble: "🔧",
    listo_instalacion: "🚚",
    entregado: "🎉",
  };

  const emoji = statusEmojis[newStatus] || "📋";
  const statusLabel = statusLabels[newStatus] || newStatus;

  // Intentar enviar con plantilla (funciona sin ventana de 24h)
  const templateResult = await sendTemplateMessage(
    clientPhone,
    "actualizacion_proyecto",
    "es",
    [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: INNOVAR_LOGO_URL },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: clientName },
          { type: "text", text: projectName },
          { type: "text", text: statusLabel },
        ],
      },
    ]
  );

  // Si la plantilla falla, usar texto libre como fallback
  if (!templateResult.success) {
    console.log(`[WhatsApp] Plantilla actualizacion_proyecto falló (${templateResult.error}), usando texto libre como fallback`);
    let message = `${emoji} *Actualización de Proyecto - INNOVAR*\n\nHola ${clientName},\n\nTu proyecto *${projectName}* ha cambiado de estado:\n\n📋 *Nuevo estado:* ${statusLabel}\n\n`;
    if (portalUrl) {
      message += `🔗 Ver detalles:\n${portalUrl}\n\n`;
    }
    message += `¡Gracias por tu confianza! 🏠`;
    return sendTextMessage(clientPhone, message);
  }

  return templateResult;
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
