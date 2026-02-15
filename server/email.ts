import { Resend } from "resend";
import { ENV } from "./_core/env";

// Inicializar Resend con API key desde variables de entorno
const resend = new Resend(ENV.resendApiKey);

// Email remitente por defecto (debe ser verificado en Resend)
const DEFAULT_FROM = ENV.emailFrom;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

/**
 * Envía un email usando Resend
 * @param options Opciones del email
 * @returns Promise con el resultado del envío
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validar que tenemos API key
    if (!ENV.resendApiKey) {
      console.error("[Email] RESEND_API_KEY no está configurada");
      return { success: false, error: "RESEND_API_KEY no configurada" };
    }

    // Validar email de destino
    if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
      console.error("[Email] Email de destino no proporcionado");
      return { success: false, error: "Email de destino requerido" };
    }

    // Enviar email
    const result = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    } as any);

    if (result.error) {
      console.error("[Email] Error al enviar:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error: any) {
    console.error("[Email] Excepción al enviar:", error);
    return { success: false, error: error.message || "Error desconocido" };
  }
}

/**
 * Genera HTML base para emails con branding de INNOVAR
 */
export function generateEmailHTML(content: string, title?: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "INNOVAR Cocinas Integrales"}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      color: #e0e7ff;
      margin: 5px 0 0 0;
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .content h2 {
      color: #1e3a8a;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>INNOVAR</h1>
      <p>Cocinas Integrales</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>INNOVAR Cocinas Integrales</strong></p>
      <p>Transformamos espacios, creamos experiencias</p>
      <div class="divider"></div>
      <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
      <p>Si tienes alguna pregunta, contáctanos por WhatsApp o visita nuestro sitio web.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
