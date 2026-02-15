/**
 * Utilidades de formateo centralizadas
 * Evita duplicación de código en múltiples archivos
 */

/**
 * Formatea un número como precio en pesos colombianos
 * @param price - El precio a formatear
 * @returns String formateado como "$1,234,567"
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "$0";
  return `$${price.toLocaleString("es-CO")}`;
}

/**
 * Formatea una fecha en formato legible
 * @param date - La fecha a formatear (Date, string o timestamp)
 * @returns String formateado como "24 ene 2026"
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formatea una fecha con hora
 * @param date - La fecha a formatear
 * @returns String formateado como "24 ene 2026, 10:30 AM"
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formatea un número de teléfono colombiano
 * @param phone - El número de teléfono
 * @returns String formateado como "313 680 2025"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, "");
  // Formato colombiano: XXX XXX XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}
