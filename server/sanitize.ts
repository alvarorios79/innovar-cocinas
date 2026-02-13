/**
 * Sanitización de entradas de texto - Fase 1: Blindaje inmediato
 * 
 * Sanitiza campos de texto libre antes de persistir en BD.
 * Prioriza uso en emails HTML y notas visibles por admins.
 * No rompe contenido válido existente (tildes, ñ, emojis, saltos de línea).
 * 
 * Estrategia: escapar caracteres HTML peligrosos, no eliminar contenido.
 */

/**
 * Escapa caracteres HTML peligrosos para prevenir XSS.
 * Preserva saltos de línea, tildes, ñ, emojis y caracteres especiales del español.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitiza texto para uso general en BD.
 * Elimina caracteres de control invisibles (excepto newline, tab, carriage return).
 * Recorta espacios al inicio y final.
 * NO escapa HTML (usar sanitizeHtml para contextos HTML).
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return input;

  return input
    // Eliminar caracteres de control invisibles excepto \n, \r, \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalizar espacios múltiples (pero preservar saltos de línea)
    .replace(/[^\S\n\r]+/g, " ")
    .trim();
}

/**
 * Sanitiza un campo de texto que se usará en emails HTML.
 * Aplica sanitizeText + sanitizeHtml.
 */
export function sanitizeForEmail(input: string): string {
  if (!input || typeof input !== "string") return input;
  return sanitizeHtml(sanitizeText(input));
}

/**
 * Sanitiza un objeto con campos de texto.
 * Solo sanitiza valores de tipo string, deja el resto intacto.
 * Útil para sanitizar inputs de formularios completos.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize?: string[]
): T {
  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "string") continue;
    if (fieldsToSanitize && !fieldsToSanitize.includes(key)) continue;

    (result as any)[key] = sanitizeText(value);
  }

  return result;
}

/**
 * Sanitiza un número de teléfono.
 * Solo permite dígitos, +, -, (, ), espacios.
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== "string") return input;
  return input.replace(/[^\d+\-() ]/g, "").trim();
}

/**
 * Sanitiza un email.
 * Solo permite caracteres válidos de email.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== "string") return input;
  return input.replace(/[^\w.@+\-]/g, "").trim().toLowerCase();
}
