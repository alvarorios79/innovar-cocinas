import { ENV } from "./env";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

/**
 * Envía un mensaje de texto simple por WhatsApp
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
    console.error("[WhatsApp] Credenciales no configuradas");
    return { success: false, error: "Credenciales de WhatsApp no configuradas" };
  }

  // Formatear número de teléfono (remover espacios, guiones y el + inicial)
  const formattedPhone = to.replace(/[\s\-\+]/g, "");

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${ENV.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppError;
      console.error("[WhatsApp] Error al enviar mensaje:", errorData.error?.message);
      return { success: false, error: errorData.error?.message || "Error desconocido" };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log("[WhatsApp] Mensaje enviado exitosamente:", successData.messages[0]?.id);
    return { success: true, messageId: successData.messages[0]?.id };
  } catch (error) {
    console.error("[WhatsApp] Error de conexión:", error);
    return { success: false, error: "Error de conexión con WhatsApp API" };
  }
}

/**
 * Envía un mensaje de plantilla por WhatsApp
 * Las plantillas deben estar aprobadas previamente en Meta Business
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "es",
  components?: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{ type: "text"; text: string }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
    console.error("[WhatsApp] Credenciales no configuradas");
    return { success: false, error: "Credenciales de WhatsApp no configuradas" };
  }

  const formattedPhone = to.replace(/[\s\-\+]/g, "");

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${ENV.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components || [],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppError;
      console.error("[WhatsApp] Error al enviar plantilla:", errorData.error?.message);
      return { success: false, error: errorData.error?.message || "Error desconocido" };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log("[WhatsApp] Plantilla enviada exitosamente:", successData.messages[0]?.id);
    return { success: true, messageId: successData.messages[0]?.id };
  } catch (error) {
    console.error("[WhatsApp] Error de conexión:", error);
    return { success: false, error: "Error de conexión con WhatsApp API" };
  }
}

/**
 * Envía notificación de confirmación de cita
 */
export async function sendAppointmentConfirmation(
  phone: string,
  clientName: string,
  date: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  const message = `¡Hola ${clientName}! 👋

Tu cita con *INNOVAR Cocinas Integrales* ha sido registrada:

📅 *Fecha:* ${date}
🕐 *Hora:* ${time}

Te contactaremos para confirmar los detalles.

¡Gracias por preferirnos! 🏠✨`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Envía notificación de cambio de fecha de cita
 */
export async function sendAppointmentReschedule(
  phone: string,
  clientName: string,
  oldDate: string,
  newDate: string,
  newTime: string
): Promise<{ success: boolean; error?: string }> {
  const message = `¡Hola ${clientName}! 👋

Tu cita con *INNOVAR Cocinas Integrales* ha sido reprogramada:

📅 *Nueva fecha:* ${newDate}
🕐 *Nueva hora:* ${newTime}

(Fecha anterior: ${oldDate})

Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por tu comprensión! 🏠✨`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Envía recordatorio de cita
 */
export async function sendAppointmentReminder(
  phone: string,
  clientName: string,
  date: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  const message = `¡Hola ${clientName}! 👋

Te recordamos que tienes una cita programada con *INNOVAR Cocinas Integrales*:

📅 *Fecha:* ${date}
🕐 *Hora:* ${time}

¡Te esperamos! 🏠✨`;

  return sendWhatsAppMessage(phone, message);
}
