import { generateEmailHTML } from "./email";

/**
 * Plantilla de bienvenida para nuevos usuarios registrados automáticamente
 */
export function welcomeEmailTemplate(data: {
  userName: string;
  email: string;
  temporaryPassword: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h2>¡Bienvenido a INNOVAR Cocinas Integrales!</h2>
    <p>Hola <strong>${data.userName}</strong>,</p>
    <p>Hemos creado automáticamente tu cuenta en nuestro portal de clientes. Ahora podrás hacer seguimiento de tus citas, proyectos, cotizaciones y estimados en un solo lugar.</p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e3a8a;">Tus credenciales de acceso:</h3>
      <p style="margin: 10px 0;"><strong>Usuario:</strong> ${data.email}</p>
      <p style="margin: 10px 0;"><strong>Contraseña temporal:</strong> <code style="background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.temporaryPassword}</code></p>
    </div>

    <p><strong>⚠️ Importante:</strong> Por tu seguridad, te recomendamos cambiar esta contraseña temporal en tu primer inicio de sesión.</p>

    <a href="${data.portalUrl}" class="button">Acceder al Portal</a>

    <div class="divider"></div>

    <h3>¿Qué puedes hacer en tu portal?</h3>
    <ul style="line-height: 1.8;">
      <li>📅 Ver y reagendar tus citas</li>
      <li>📊 Hacer seguimiento de tus proyectos</li>
      <li>💰 Revisar cotizaciones y estimados</li>
      <li>🔔 Recibir notificaciones de avances</li>
      <li>👤 Actualizar tu información de contacto</li>
    </ul>

    <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
    <p>¡Gracias por confiar en INNOVAR!</p>
  `;

  return {
    subject: "¡Bienvenido a INNOVAR Cocinas! - Acceso a tu portal de cliente",
    html: generateEmailHTML(content, "Bienvenido a INNOVAR"),
  };
}

/**
 * Plantilla de notificación de nueva tarea asignada
 */
export function taskAssignedEmailTemplate(data: {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  priority: "alta" | "media" | "baja";
  dueDate?: Date;
  assignedBy: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const priorityLabels = {
    alta: "🔴 Alta",
    media: "🟡 Media",
    baja: "🟢 Baja",
  };

  const priorityColors = {
    alta: "#ef4444",
    media: "#f59e0b",
    baja: "#10b981",
  };

  const content = `
    <h2>📝 Nueva tarea asignada</h2>
    <p>Hola <strong>${data.recipientName}</strong>,</p>
    <p><strong>${data.assignedBy}</strong> te ha asignado una nueva tarea:</p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColors[data.priority]};">
      <h3 style="margin-top: 0; color: #1e3a8a;">${data.taskTitle}</h3>
      ${data.taskDescription ? `<p style="color: #64748b;">${data.taskDescription}</p>` : ""}
      <p style="margin: 10px 0;"><strong>Prioridad:</strong> ${priorityLabels[data.priority]}</p>
      ${data.dueDate ? `<p style="margin: 10px 0;"><strong>Fecha límite:</strong> ${data.dueDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })}</p>` : ""}
    </div>

    <a href="${data.portalUrl}" class="button">Ver tarea en el portal</a>

    <p>Recuerda que puedes actualizar el estado de la tarea desde tu panel de control.</p>
  `;

  return {
    subject: `Nueva tarea asignada: ${data.taskTitle}`,
    html: generateEmailHTML(content, "Nueva tarea asignada"),
  };
}

/**
 * Plantilla de recordatorio de tarea próxima a vencer
 */
export function taskReminderEmailTemplate(data: {
  recipientName: string;
  taskTitle: string;
  dueDate: Date;
  daysRemaining: number;
  portalUrl: string;
}): { subject: string; html: string } {
  const urgencyColor = data.daysRemaining <= 1 ? "#ef4444" : "#f59e0b";
  const urgencyIcon = data.daysRemaining <= 1 ? "🚨" : "⏰";

  const content = `
    <h2>${urgencyIcon} Recordatorio: Tarea próxima a vencer</h2>
    <p>Hola <strong>${data.recipientName}</strong>,</p>
    <p>Te recordamos que tienes una tarea pendiente que vence pronto:</p>
    
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
      <h3 style="margin-top: 0; color: ${urgencyColor};">${data.taskTitle}</h3>
      <p style="margin: 10px 0;"><strong>Vence:</strong> ${data.dueDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })}</p>
      <p style="margin: 10px 0; font-size: 18px; color: ${urgencyColor};"><strong>${data.daysRemaining === 0 ? "¡Vence hoy!" : `Quedan ${data.daysRemaining} día${data.daysRemaining > 1 ? "s" : ""}`}</strong></p>
    </div>

    <a href="${data.portalUrl}" class="button">Ver tarea</a>

    <p>Por favor, asegúrate de completar esta tarea a tiempo.</p>
  `;

  return {
    subject: `${urgencyIcon} Recordatorio: ${data.taskTitle} - Vence en ${data.daysRemaining} día${data.daysRemaining > 1 ? "s" : ""}`,
    html: generateEmailHTML(content, "Recordatorio de tarea"),
  };
}

/**
 * Plantilla de cambio de estado de proyecto
 */
export function projectStatusChangeEmailTemplate(data: {
  recipientName: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  notes?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const statusLabels: Record<string, string> = {
    cotizacion_enviada: "Cotización Enviada",
    aprobado_diseno: "Aprobado para Diseño",
    en_diseno: "En Diseño",
    diseno_listo: "Diseño Listo",
    aprobado_cliente: "Aprobado por Cliente",
    en_produccion: "En Producción",
    en_instalacion: "Listo para Instalación",
    instalado: "Instalado",
    finalizado: "Finalizado",
  };

  const content = `
    <h2>📊 Actualización de proyecto</h2>
    <p>Hola <strong>${data.recipientName}</strong>,</p>
    <p>El estado de tu proyecto ha sido actualizado:</p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e3a8a;">${data.projectName}</h3>
      <div style="display: flex; align-items: center; gap: 10px; margin: 15px 0;">
        <span style="background-color: #e2e8f0; padding: 8px 16px; border-radius: 6px;">${statusLabels[data.oldStatus] || data.oldStatus}</span>
        <span style="font-size: 20px;">→</span>
        <span style="background-color: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 6px; font-weight: 600;">${statusLabels[data.newStatus] || data.newStatus}</span>
      </div>
      ${data.notes ? `<p style="margin-top: 15px; color: #64748b;"><strong>Nota:</strong> ${data.notes}</p>` : ""}
      <p style="margin-top: 10px; font-size: 14px; color: #94a3b8;">Actualizado por: ${data.changedBy}</p>
    </div>

    <a href="${data.portalUrl}" class="button">Ver detalles del proyecto</a>

    <p>Puedes ver más detalles y el historial completo en tu portal de cliente.</p>
  `;

  return {
    subject: `Actualización de proyecto: ${data.projectName}`,
    html: generateEmailHTML(content, "Actualización de proyecto"),
  };
}

/**
 * Plantilla de cotización enviada
 */
export function quotationSentEmailTemplate(data: {
  clientName: string;
  projectName: string;
  workType: string;
  totalPrice: string;
  validUntil?: Date;
  portalUrl: string;
}): { subject: string; html: string } {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const content = `
    <h2>💰 Nueva cotización disponible</h2>
    <p>Hola <strong>${data.clientName}</strong>,</p>
    <p>Hemos preparado una cotización para tu proyecto:</p>
    
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #065f46;">${data.projectName}</h3>
      <p style="margin: 10px 0;"><strong>Tipo de trabajo:</strong> ${workTypeLabels[data.workType] || data.workType}</p>
      <p style="margin: 10px 0; font-size: 24px; color: #065f46;"><strong>Valor:</strong> $${data.totalPrice}</p>
      ${data.validUntil ? `<p style="margin: 10px 0; color: #059669;"><strong>Válida hasta:</strong> ${data.validUntil.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })}</p>` : ""}
    </div>

    <a href="${data.portalUrl}" class="button">Ver cotización completa</a>

    <p>En el portal podrás ver todos los detalles, materiales y especificaciones de tu proyecto.</p>
    <p>Si tienes alguna pregunta o deseas hacer ajustes, no dudes en contactarnos.</p>
  `;

  return {
    subject: `Nueva cotización: ${data.projectName} - $${data.totalPrice}`,
    html: generateEmailHTML(content, "Nueva cotización"),
  };
}

/**
 * Plantilla de diseño listo para aprobación
 */
export function designReadyEmailTemplate(data: {
  clientName: string;
  projectName: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h2>🎨 ¡Tu diseño está listo!</h2>
    <p>Hola <strong>${data.clientName}</strong>,</p>
    <p>Tenemos excelentes noticias: el diseño de tu proyecto está listo para tu revisión y aprobación.</p>
    
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin-top: 0; color: #92400e;">${data.projectName}</h3>
      <p style="color: #78350f;">Nuestro equipo de diseño ha completado los planos y especificaciones de tu proyecto.</p>
    </div>

    <a href="${data.portalUrl}" class="button">Ver diseño y aprobar</a>

    <p><strong>Próximos pasos:</strong></p>
    <ol style="line-height: 1.8;">
      <li>Revisa el diseño en el portal</li>
      <li>Aprueba el diseño o solicita ajustes</li>
      <li>Una vez aprobado, iniciaremos la producción</li>
    </ol>

    <p>¡Estamos emocionados de ver tu proyecto tomar forma!</p>
  `;

  return {
    subject: `¡Tu diseño está listo! - ${data.projectName}`,
    html: generateEmailHTML(content, "Diseño listo"),
  };
}

/**
 * Plantilla de proyecto listo para instalación
 */
export function readyForInstallationEmailTemplate(data: {
  clientName: string;
  projectName: string;
  estimatedDate?: Date;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h2>🚚 ¡Tu proyecto está listo para instalación!</h2>
    <p>Hola <strong>${data.clientName}</strong>,</p>
    <p>Excelentes noticias: tu proyecto ha sido completado y está listo para ser instalado.</p>
    
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #065f46;">${data.projectName}</h3>
      <p style="color: #059669;">La producción ha finalizado y tu proyecto está listo para ser llevado a tu hogar.</p>
      ${data.estimatedDate ? `<p style="margin: 15px 0;"><strong>Fecha estimada de instalación:</strong> ${data.estimatedDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })}</p>` : ""}
    </div>

    <a href="${data.portalUrl}" class="button">Ver detalles</a>

    <p><strong>Próximos pasos:</strong></p>
    <ol style="line-height: 1.8;">
      <li>Nuestro equipo te contactará para coordinar la instalación</li>
      <li>Prepara el espacio según las indicaciones que te proporcionaremos</li>
      <li>El día de la instalación, nuestro equipo llegará puntualmente</li>
    </ol>

    <p>¡Estamos emocionados de ver tu nuevo espacio!</p>
  `;

  return {
    subject: `¡Listo para instalación! - ${data.projectName}`,
    html: generateEmailHTML(content, "Listo para instalación"),
  };
}

/**
 * Plantilla de confirmación de cita
 */
export function appointmentConfirmedEmailTemplate(data: {
  clientName: string;
  appointmentDate: Date;
  workTypes: string[];
  notes?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const workTypesText = data.workTypes.map(wt => workTypeLabels[wt] || wt).join(", ");

  const content = `
    <h2>📅 Cita confirmada</h2>
    <p>Hola <strong>${data.clientName}</strong>,</p>
    <p>Tu cita ha sido confirmada exitosamente.</p>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin-top: 0; color: #1e3a8a;">Detalles de tu cita</h3>
      <p style="margin: 10px 0;"><strong>Fecha y hora:</strong> ${data.appointmentDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" })} a las ${data.appointmentDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}</p>
      <p style="margin: 10px 0;"><strong>Tipo de trabajo:</strong> ${workTypesText}</p>
      ${data.notes ? `<p style="margin: 10px 0;"><strong>Notas:</strong> ${data.notes}</p>` : ""}
    </div>

    <a href="${data.portalUrl}" class="button">Ver cita en el portal</a>

    <p><strong>¿Necesitas reagendar?</strong> Puedes hacerlo fácilmente desde tu portal de cliente.</p>
    <p>Te enviaremos un recordatorio 24 horas antes de tu cita.</p>
  `;

  return {
    subject: `Cita confirmada - ${data.appointmentDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`,
    html: generateEmailHTML(content, "Cita confirmada"),
  };
}

/**
 * Plantilla de recordatorio de cita (24h antes)
 */
export function appointmentReminderEmailTemplate(data: {
  clientName: string;
  appointmentDate: Date;
  workTypes: string[];
  portalUrl: string;
}): { subject: string; html: string } {
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  const workTypesText = data.workTypes.map(wt => workTypeLabels[wt] || wt).join(", ");

  const content = `
    <h2>⏰ Recordatorio: Cita mañana</h2>
    <p>Hola <strong>${data.clientName}</strong>,</p>
    <p>Te recordamos que tienes una cita programada para mañana:</p>
    
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin-top: 0; color: #92400e;">Detalles de tu cita</h3>
      <p style="margin: 10px 0; font-size: 18px;"><strong>Mañana ${data.appointmentDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" })} a las ${data.appointmentDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}</strong></p>
      <p style="margin: 10px 0;"><strong>Tipo de trabajo:</strong> ${workTypesText}</p>
    </div>

    <a href="${data.portalUrl}" class="button">Ver detalles</a>

    <p><strong>¿Necesitas reagendar?</strong> Si no puedes asistir, por favor contáctanos lo antes posible o reagenda desde tu portal.</p>
    <p>¡Nos vemos mañana!</p>
  `;

  return {
    subject: `⏰ Recordatorio: Cita mañana - ${data.appointmentDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`,
    html: generateEmailHTML(content, "Recordatorio de cita"),
  };
}
