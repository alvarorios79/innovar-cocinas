/**
 * REGISTRO OFICIAL DE PLANTILLAS WHATSAPP - INNOVAR COCINAS
 * 
 * Este archivo documenta todas las plantillas de WhatsApp aprobadas por Meta
 * que se utilizan en el sistema de automatización.
 * 
 * IMPORTANTE:
 * - Todas las plantillas deben estar en estado APPROVED en Meta Business Manager
 * - Los nombres deben coincidir EXACTAMENTE con lo registrado en Meta
 * - El idioma debe ser exactamente "es" (Español)
 * - No modificar nombres, variables ni estructura sin actualizar Meta primero
 */

export const WHATSAPP_TEMPLATES = {
  /**
   * PLANTILLA 1: COTIZACIÓN ENVIADA
   * Estado: APPROVED ✅
   * Uso: Notificar al cliente que su cotización ha sido enviada
   * Abre ventana de 24h para clientes nuevos
   */
  QUOTATION_SENT: {
    name: "cotizacion_enviada_innovar",
    category: "UTILITY",
    language: "es",
    description: "Notificación de cotización enviada",
    variables: [
      { position: 1, name: "clientName", description: "Nombre del cliente" },
      { position: 2, name: "quotationNumber", description: "Número de cotización (ej: COT-2026-9-6333545)" }
    ],
    bodyTemplate: "Hola {{1}}, recibimos tu solicitud para la cotización {{2}}. Pronto recibirás los detalles.",
    status: "APPROVED",
    createdAt: "2026-03-02",
    lastModified: "2026-03-02",
    notes: "Plantilla original del sistema. Abre ventana de 24h para nuevos clientes."
  },

  /**
   * PLANTILLA 2: AVANCE DE PROYECTO
   * Estado: SUBMITTED (Enviada a Meta para revisión)
   * Uso: Notificar al cliente sobre el avance de su proyecto
   * Integración: Futura (event: project.statusChanged)
   */
  PROJECT_PROGRESS: {
    name: "avance_proyecto_innovar",
    category: "MARKETING",
    language: "es",
    description: "Notificación de avance de proyecto",
    variables: [
      { position: 1, name: "clientName", description: "Nombre del cliente" },
      { position: 2, name: "projectCode", description: "Código del proyecto (ej: PROJ-2026-001)" },
      { position: 3, name: "stageName", description: "Nombre de la etapa (ej: Diseño, Producción, Instalación)" },
      { position: 4, name: "galleryUrl", description: "URL de galería o avance visual" }
    ],
    bodyTemplate: `Hola amigo {{1}}, tu proyecto {{2}} ha avanzado a la etapa de {{3}}, puedes ver el avance aquí {{4}} gracias.`,
    status: "SUBMITTED",
    createdAt: "2026-03-02",
    lastModified: "2026-03-03",
    submittedAt: "2026-03-03T14:30:00Z",
    notes: "Enviada a Meta el 3 de marzo. Esperar aprobación (24-48h). No usar hasta que status = APPROVED",
    futureIntegration: "project.statusChanged event"
  },

  /**
   * PLANTILLA 3: PROYECTO ENTREGADO
   * Estado: SUBMITTED (Enviada a Meta para revisión)
   * Uso: Notificar al cliente que su proyecto ha sido entregado
   * Integración: Futura (event: project.delivered)
   */
  PROJECT_DELIVERED: {
    name: "proyecto_entregado_innovar",
    category: "MARKETING",
    language: "es",
    description: "Notificación de proyecto entregado",
    variables: [
      { position: 1, name: "clientName", description: "Nombre del cliente" },
      { position: 2, name: "projectCode", description: "Código del proyecto (ej: PROJ-2026-001)" }
    ],
    bodyTemplate: `Hola {{1}}, tu proyecto {{2}} ha sido entregado exitosamente. Gracias por tu confianza.`,
    status: "SUBMITTED",
    createdAt: "2026-03-02",
    lastModified: "2026-03-03",
    submittedAt: "2026-03-03T14:35:00Z",
    notes: "Enviada a Meta el 3 de marzo. Esperar aprobación (24-48h). No usar hasta que status = APPROVED",
    futureIntegration: "project.delivered event"
  }
} as const;

/**
 * VALIDACIONES REQUERIDAS
 * 
 * Antes de usar cualquier plantilla, verificar:
 * ✅ Nombre coincide EXACTAMENTE con Meta
 * ✅ Idioma es exactamente "es"
 * ✅ Sin encabezados ni botones
 * ✅ Sin emojis
 * ✅ Categoría es UTILITY
 * ✅ Status es APPROVED
 */

export function validateTemplateForUse(templateKey: keyof typeof WHATSAPP_TEMPLATES): { valid: boolean; error?: string } {
  const template = WHATSAPP_TEMPLATES[templateKey] as any;

  if (template.status !== "APPROVED") {
    return {
      valid: false,
      error: `Plantilla ${template.name} no está aprobada. Estado actual: ${template.status}`
    };
  }

  if (template.language !== "es") {
    return {
      valid: false,
      error: `Plantilla ${template.name} tiene idioma incorrecto: ${template.language}`
    };
  }

  if (template.category !== "UTILITY" && template.category !== "MARKETING") {
    return {
      valid: false,
      error: `Plantilla ${template.name} tiene categoría incorrecta: ${template.category}`
    };
  }

  return { valid: true };
}

/**
 * INSTRUCCIONES PARA CREAR NUEVAS PLANTILLAS EN META
 * 
 * 1. Ve a: https://business.facebook.com/wa/manage/
 * 2. Busca "Message Templates"
 * 3. Haz click en "Create Template"
 * 4. Selecciona idioma: Español (es)
 * 5. Selecciona categoría: Utility
 * 6. Copia EXACTAMENTE el nombre y body del registro anterior
 * 7. Agrega variables con {{1}}, {{2}}, etc.
 * 8. Envía para aprobación
 * 9. Una vez aprobada, actualiza status a "APPROVED" en este archivo
 */

/**
 * ESTADO DE PLANTILLAS
 * 
 * APPROVED (Listas para usar):
 * ✅ cotizacion_enviada_innovar
 * 
 * SUBMITTED (En revisión por Meta, esperar 24-48h):
 * ⏳ avance_proyecto_innovar (Enviada: 3 de marzo)
 * ⏳ proyecto_entregado_innovar (Enviada: 3 de marzo)
 * 
 * TOTAL: 1 aprobada, 2 en revisión
 */
