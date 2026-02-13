/**
 * Monitoreo diario del token de WhatsApp - Fase 1: Blindaje inmediato
 * 
 * Verifica diariamente que el token de WhatsApp Cloud API sea válido.
 * Si falla, envía alerta por email usando Resend.
 * NO usa WhatsApp para notificar fallos de WhatsApp.
 * Expone estado como flag interno (sin UI por ahora).
 */

import { ENV } from "./_core/env";

// Estado interno del token
let tokenStatus: {
  isValid: boolean;
  lastCheck: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
} = {
  isValid: true,
  lastCheck: null,
  lastError: null,
  consecutiveFailures: 0,
};

/**
 * Obtiene el estado actual del token de WhatsApp.
 * Puede ser consultado internamente por otros módulos.
 */
export function getWhatsAppTokenStatus() {
  return { ...tokenStatus };
}

/**
 * Verifica la validez del token de WhatsApp haciendo una llamada ligera a la API.
 * Usa el endpoint de información del número de teléfono (GET, no envía mensajes).
 */
async function checkWhatsAppToken(): Promise<{ valid: boolean; error?: string }> {
  const accessToken = ENV.whatsappAccessToken;
  const phoneNumberId = ENV.whatsappPhoneNumberId;

  if (!accessToken || !phoneNumberId) {
    return { valid: false, error: "WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as any)?.error?.message || `HTTP ${response.status}`;
    const errorCode = (errorData as any)?.error?.code;

    // Código 190 = token expirado o inválido
    if (errorCode === 190 || response.status === 401) {
      return { valid: false, error: `Token expirado o inválido: ${errorMessage}` };
    }

    return { valid: false, error: `Error API: ${errorMessage}` };
  } catch (error) {
    return { valid: false, error: `Error de conexión: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Envía alerta por email cuando el token de WhatsApp falla.
 * Usa Resend (NO WhatsApp, para evitar dependencia circular).
 */
async function sendTokenAlert(error: string): Promise<void> {
  try {
    const { sendEmail } = await import("./email");

    // Enviar al owner del sistema
    const ownerEmail = ENV.emailFrom.match(/<(.+)>/)?.[1] || "info@innovarcocinas.com";

    await sendEmail({
      to: ownerEmail,
      subject: "⚠️ ALERTA: Token de WhatsApp inválido - INNOVAR Cocinas",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">⚠️ Token de WhatsApp Cloud API inválido</h2>
          <p>El sistema de monitoreo ha detectado que el token de WhatsApp no es válido.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Error</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${error}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Fecha</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Fallos consecutivos</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${tokenStatus.consecutiveFailures + 1}</td>
            </tr>
          </table>
          <h3>Acción requerida:</h3>
          <ol>
            <li>Ir a <a href="https://developers.facebook.com/">Meta for Developers</a></li>
            <li>Generar un nuevo token de acceso permanente</li>
            <li>Actualizar la variable de entorno <code>WHATSAPP_ACCESS_TOKEN</code></li>
          </ol>
          <p style="color: #6B7280; font-size: 12px;">
            Este es un mensaje automático del sistema de monitoreo de INNOVAR Cocinas.
            Las notificaciones por WhatsApp están deshabilitadas hasta que se renueve el token.
          </p>
        </div>
      `,
    });

    console.log("[WhatsAppMonitor] Alerta enviada por email");
  } catch (emailError) {
    console.error("[WhatsAppMonitor] Error enviando alerta por email:", emailError);
  }
}

/**
 * Ejecuta la verificación del token y actualiza el estado interno.
 */
async function runTokenCheck(): Promise<void> {
  const result = await checkWhatsAppToken();

  tokenStatus.lastCheck = new Date();

  if (result.valid) {
    if (!tokenStatus.isValid) {
      console.log("[WhatsAppMonitor] Token de WhatsApp restaurado correctamente");
    }
    tokenStatus.isValid = true;
    tokenStatus.lastError = null;
    tokenStatus.consecutiveFailures = 0;
  } else {
    tokenStatus.isValid = false;
    tokenStatus.lastError = result.error || "Error desconocido";
    tokenStatus.consecutiveFailures++;

    console.error(`[WhatsAppMonitor] Token inválido (fallo #${tokenStatus.consecutiveFailures}): ${result.error}`);

    // Enviar alerta por email solo en el primer fallo y cada 3 fallos consecutivos
    // para evitar spam de emails
    if (tokenStatus.consecutiveFailures === 1 || tokenStatus.consecutiveFailures % 3 === 0) {
      await sendTokenAlert(result.error || "Error desconocido");
    }
  }
}

/**
 * Inicia el servicio de monitoreo diario del token de WhatsApp.
 * Verifica inmediatamente al iniciar y luego cada 24 horas.
 */
export function startWhatsAppTokenMonitor(): void {
  // Verificación inicial (con delay de 10 segundos para que el servidor arranque)
  setTimeout(async () => {
    console.log("[WhatsAppMonitor] Verificación inicial del token de WhatsApp...");
    await runTokenCheck();

    if (tokenStatus.isValid) {
      console.log("[WhatsAppMonitor] Token de WhatsApp válido ✓");
    } else {
      console.error(`[WhatsAppMonitor] Token de WhatsApp inválido ✗: ${tokenStatus.lastError}`);
    }
  }, 10_000);

  // Verificación diaria (cada 24 horas)
  setInterval(async () => {
    console.log("[WhatsAppMonitor] Verificación diaria del token de WhatsApp...");
    await runTokenCheck();
  }, 24 * 60 * 60 * 1000);

  console.log("[WhatsAppMonitor] Servicio de monitoreo de token programado (cada 24h)");
}
