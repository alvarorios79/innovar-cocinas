/**
 * Servicio de notificaciones por WhatsApp para proyectos
 * Genera mensajes personalizados según el estado del proyecto
 */

// Plantillas de mensajes por estado del proyecto
const MESSAGE_TEMPLATES: Record<string, (data: ProjectMessageData) => string> = {
  // Proyecto creado
  pendiente: (data) => `🏠 *¡Hola ${data.clientName}!*

Gracias por confiar en *INNOVAR Cocinas Integrales* para tu proyecto de ${data.workType}.

Tu proyecto *"${data.projectName}"* ha sido registrado exitosamente. Pronto te contactaremos para coordinar los siguientes pasos.

📋 *Detalles:*
• Proyecto: ${data.projectName}
• Tipo: ${data.workType}

Puedes seguir el estado de tu proyecto en:
${data.portalUrl}

¡Gracias por elegirnos! 🙌`,

  // Aprobado para diseño
  aprobado_diseno: (data) => `✅ *¡Excelentes noticias, ${data.clientName}!*

Tu proyecto *"${data.projectName}"* ha sido aprobado y nuestro equipo de diseño comenzará a trabajar en él.

🎨 Pronto recibirás los diseños 3D para tu aprobación.

Sigue el progreso en:
${data.portalUrl}

*INNOVAR Cocinas Integrales*`,

  // En diseño
  en_diseno: (data) => `🎨 *Hola ${data.clientName}*

Nuestro equipo de diseño está trabajando en tu proyecto *"${data.projectName}"*.

Estamos creando los diseños 3D y los planos de despiece para tu ${data.workType}.

Te notificaremos cuando estén listos para tu revisión.

${data.portalUrl}

*INNOVAR Cocinas Integrales*`,

  // Pendiente aprobación del cliente (renders listos)
  pendiente_render: (data) => {
    const credentialsSection = data.credentials ? `

🔐 *Tus datos de acceso al portal:*
📧 Correo: ${data.credentials.email}
🔑 Contraseña: ${data.credentials.password}

⚠️ _Guarda estos datos en un lugar seguro_` : '';
    
    return `📐 *¡${data.clientName}, tu diseño está listo!*

Los diseños 3D de tu proyecto *"${data.projectName}"* están listos para tu revisión y aprobación.

🔍 Por favor revisa los diseños y danos tu aprobación para comenzar la producción.${credentialsSection}

👉 Ingresa al portal aquí:
${data.portalUrl}

Si tienes alguna pregunta o necesitas cambios, no dudes en contactarnos.

*INNOVAR Cocinas Integrales*
📞 313 680 2025`;
  },

  // En corte
  corte: (data) => `🔨 *¡${data.clientName}, comenzamos la producción!*

Tu proyecto *"${data.projectName}"* ha entrado en la etapa de *CORTE*.

✂️ Estamos cortando los materiales según los diseños aprobados.

Puedes ver fotos del avance en:
${data.portalUrl}

*INNOVAR Cocinas Integrales*`,

  // En enchape
  enchape: (data) => `🎯 *Avance de tu proyecto, ${data.clientName}*

Tu proyecto *"${data.projectName}"* está en la etapa de *ENCHAPE*.

🪵 Estamos aplicando los acabados a las piezas de tu ${data.workType}.

Ve las fotos del proceso:
${data.portalUrl}

*INNOVAR Cocinas Integrales*`,

  // En ensamble
  ensamble: (data) => `🔧 *¡Ya casi está listo, ${data.clientName}!*

Tu proyecto *"${data.projectName}"* está en la etapa de *ENSAMBLE*.

🛠️ Estamos armando todas las piezas de tu ${data.workType}.

Mira el progreso:
${data.portalUrl}

*INNOVAR Cocinas Integrales*`,

  // Listo para instalación
  listo_instalacion: (data) => `🚚 *¡${data.clientName}, tu ${data.workType} está lista!*

Tu proyecto *"${data.projectName}"* ha sido completado en nuestro taller y está *LISTO PARA INSTALACIÓN*.

📅 Pronto nos comunicaremos contigo para coordinar la fecha de instalación.

Puedes ver las fotos del producto terminado:
${data.portalUrl}

¡Estamos emocionados de entregarte tu nuevo espacio! 🏠

*INNOVAR Cocinas Integrales*
📞 313 680 2025`,

  // Entregado
  entregado: (data) => `🎉 *¡Felicitaciones ${data.clientName}!*

Tu proyecto *"${data.projectName}"* ha sido *ENTREGADO* exitosamente.

Esperamos que disfrutes tu nueva ${data.workType}. Ha sido un placer trabajar contigo.

⭐ Si estás satisfecho con nuestro trabajo, te agradeceríamos mucho si nos dejas una reseña en Google:
https://g.page/r/CZ41O10XEQCQEBk/review

📸 También nos encantaría ver fotos de cómo quedó instalado en tu hogar.

¡Gracias por confiar en nosotros!

*INNOVAR Cocinas Integrales*
📞 313 680 2025`,
};

// Tipos de trabajo en español
const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

// Etiquetas de estado en español
const STATUS_LABELS: Record<string, string> = {
  contacto: "Contacto",
  cotizacion_enviada: "Cotización Enviada",
  cotizacion_aprobada: "Cotización Aprobada",
  adelanto_recibido: "Adelanto Recibido",
  en_diseno: "En Diseño",
  pendiente_modelado: "Modelado 3D Listo - Pendiente Aprobación",
  pendiente_render: "Diseño Listo - Pendiente Aprobación",
  aprobacion_final: "Aprobación Final",
  despiece: "Despiece",
  corte: "En Producción - Corte",
  enchape: "En Producción - Enchape",
  ensamble: "En Producción - Ensamble",
  listo_instalacion: "Listo para Instalación",
  entregado: "Entregado",
};

export interface ProjectMessageData {
  clientName: string;
  clientPhone: string;
  projectName: string;
  projectId: number;
  workType: string;
  status: string;
  portalUrl: string;
  // Credenciales opcionales para el mensaje de diseño listo
  credentials?: {
    email: string;
    password: string;
  };
}

/**
 * Genera el mensaje de WhatsApp según el estado del proyecto
 */
export function generateProjectMessage(data: ProjectMessageData): string {
  const template = MESSAGE_TEMPLATES[data.status];
  
  if (!template) {
    // Mensaje genérico si no hay plantilla específica
    return `Hola ${data.clientName}, tu proyecto "${data.projectName}" ha sido actualizado a: ${STATUS_LABELS[data.status] || data.status}. 

Revisa el estado en: ${data.portalUrl}

INNOVAR Cocinas Integrales`;
  }

  // Convertir el tipo de trabajo a etiqueta legible
  const messageData = {
    ...data,
    workType: WORK_TYPE_LABELS[data.workType] || data.workType,
  };

  return template(messageData);
}

/**
 * Genera el enlace de WhatsApp con el mensaje pre-escrito
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Limpiar el número de teléfono (solo dígitos)
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Agregar código de país si no lo tiene (Colombia = 57)
  const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
  
  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
}

/**
 * Genera la URL del portal del cliente para un proyecto específico
 */
export function generatePortalUrl(projectId: number, baseUrl: string): string {
  return `${baseUrl}/portal?project=${projectId}`;
}

/**
 * Obtiene la etiqueta de estado en español
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Obtiene la etiqueta del tipo de trabajo en español
 */
export function getWorkTypeLabel(workType: string): string {
  return WORK_TYPE_LABELS[workType] || workType;
}

// Número de WhatsApp del equipo INNOVAR (Martha/Admin)
const TEAM_WHATSAPP_NUMBER = "3136802025";

/**
 * Genera mensaje de notificación para el equipo cuando el cliente responde
 */
export function generateTeamNotificationMessage(
  type: "approval" | "changes",
  data: {
    clientName: string;
    projectName: string;
    projectId: number;
    designType: "modelado_3d" | "renders";
    changes?: string;
  }
): string {
  const designTypeLabel = data.designType === "modelado_3d" ? "Modelado 3D" : "Renders";
  
  if (type === "approval") {
    return `✅ *CLIENTE APROBÓ ${designTypeLabel.toUpperCase()}*

📋 *Proyecto:* ${data.projectName}
👤 *Cliente:* ${data.clientName}
📅 *Fecha:* ${new Date().toLocaleString('es-CO')}

${data.designType === "modelado_3d" 
  ? "➡️ *Siguiente paso:* Preparar y enviar los renders finales."
  : "➡️ *Siguiente paso:* Iniciar producción del proyecto."}

_Notificación automática de InnovarCitas_`;
  } else {
    return `📝 *CLIENTE SOLICITÓ CAMBIOS EN ${designTypeLabel.toUpperCase()}*

📋 *Proyecto:* ${data.projectName}
👤 *Cliente:* ${data.clientName}
📅 *Fecha:* ${new Date().toLocaleString('es-CO')}

📌 *Cambios solicitados:*
${data.changes || "No especificados"}

➡️ *Acción requerida:* Revisar y aplicar los cambios solicitados.

_Notificación automática de InnovarCitas_`;
  }
}

/**
 * Genera el enlace de WhatsApp para notificar al equipo
 */
export function generateTeamWhatsAppLink(
  type: "approval" | "changes",
  data: {
    clientName: string;
    projectName: string;
    projectId: number;
    designType: "modelado_3d" | "renders";
    changes?: string;
  }
): string {
  const message = generateTeamNotificationMessage(type, data);
  return generateWhatsAppLink(TEAM_WHATSAPP_NUMBER, message);
}

/**
 * Genera todos los datos necesarios para enviar una notificación de WhatsApp
 */
export function prepareWhatsAppNotification(
  project: {
    id: number;
    name: string;
    status: string;
    workType: string;
    client: {
      name: string;
      whatsappPhone: string;
    };
  },
  baseUrl: string,
  credentials?: { email: string; password: string }
): {
  message: string;
  whatsappLink: string;
  phone: string;
  statusLabel: string;
} {
  const portalUrl = generatePortalUrl(project.id, baseUrl);
  
  const messageData: ProjectMessageData = {
    clientName: project.client.name,
    clientPhone: project.client.whatsappPhone,
    projectName: project.name,
    projectId: project.id,
    workType: project.workType,
    status: project.status,
    portalUrl,
    credentials,
  };

  const message = generateProjectMessage(messageData);
  const whatsappLink = generateWhatsAppLink(project.client.whatsappPhone, message);

  return {
    message,
    whatsappLink,
    phone: project.client.whatsappPhone,
    statusLabel: getStatusLabel(project.status),
  };
}
