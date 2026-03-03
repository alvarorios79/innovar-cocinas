/**
 * Sistema centralizado de eventos de negocio
 * 
 * Este módulo dispara eventos cuando ocurren cambios importantes en el negocio.
 * Los eventos son procesados por handlers que pueden realizar acciones adicionales
 * sin modificar la lógica existente.
 * 
 * Eventos soportados:
 * - quotation.approved: Cuando un cliente aprueba una cotización
 * - project.delivered: Cuando un proyecto se marca como entregado
 */

export interface BusinessEventPayload {
  quotationId?: string | number;
  clientId?: string | number;
  commercialId?: string | number;
  projectId?: string | number;
  timestamp?: Date;
}

/**
 * Dispara un evento de negocio
 * @param type Tipo de evento
 * @param payload Datos del evento
 */
export async function triggerBusinessEvent(
  type: "quotation.approved" | "project.delivered",
  payload: BusinessEventPayload
) {
  try {
    switch (type) {
      case "quotation.approved":
        await handleQuotationApproved(payload);
        break;

      case "project.delivered":
        await handleProjectDelivered(payload);
        break;

      default:
        console.warn(`[BusinessEvents] Tipo de evento desconocido: ${type}`);
    }
  } catch (error) {
    console.error(`[BusinessEvents] Error procesando evento ${type}:`, error);
    // No fallar el flujo principal si el evento falla
  }
}

/**
 * Handler para evento: quotation.approved
 * Se dispara cuando un cliente aprueba una cotización
 * 
 * Acciones futuras:
 * - Notificar al comercial por WhatsApp
 * - Crear notificación en el sistema
 * - Registrar en log de auditoría
 */
async function handleQuotationApproved(payload: BusinessEventPayload) {
  console.log("[BusinessEvents] quotation.approved", {
    quotationId: payload.quotationId,
    clientId: payload.clientId,
    commercialId: payload.commercialId,
    timestamp: new Date().toISOString(),
  });

  // Estructura preparada para implementar acciones futuras
  // - Aquí irá el envío de WhatsApp al comercial
  // - Aquí irá la creación de notificaciones
  // - Aquí irá el registro de auditoría
}

/**
 * Handler para evento: project.delivered
 * Se dispara cuando un proyecto se marca como entregado
 * 
 * Acciones futuras:
 * - Notificar al cliente por Email + WhatsApp
 * - Crear notificación en el sistema
 * - Registrar en log de auditoría
 */
async function handleProjectDelivered(payload: BusinessEventPayload) {
  console.log("[BusinessEvents] project.delivered", {
    projectId: payload.projectId,
    clientId: payload.clientId,
    timestamp: new Date().toISOString(),
  });

  // Estructura preparada para implementar acciones futuras
  // - Aquí irá el envío de Email al cliente
  // - Aquí irá el envío de WhatsApp al cliente
  // - Aquí irá la creación de notificaciones
  // - Aquí irá el registro de auditoría
}
