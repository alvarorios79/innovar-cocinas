/**
 * Formatos únicos del CRM: dinero y fechas se muestran igual en todas las pantallas.
 *   formatCurrency(1250000)        → "$ 1.250.000"
 *   formatDate("2026-11-07")        → "07 nov 2026"
 *   formatDateTime(fecha)           → "07 nov 2026, 3:30 p. m."
 *   formatDateLong(fecha)           → "viernes, 7 de noviembre de 2026"
 */

const TZ = "America/Bogota";

/** Dinero en pesos colombianos, sin decimales. Acepta número, texto o vacío. */
export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(safe);
}

/** Lee fechas de la BD: "2026-11-07" (día, sin hora) o "2026-11-07 15:30:00" (UTC sin zona). */
export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return new Date(value);
  const s = String(value);
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dayOnly) return new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]));
  const noZone = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s);
  const d = new Date(noZone ? `${s.replace(" ", "T")}Z` : s);
  return isNaN(d.getTime()) ? null : d;
}

/** 07 nov 2026 */
export function formatDate(value: string | number | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }).replace(/\./g, "");
}

/** 07 nov 2026, 3:30 p. m. */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(value);
  if (!d) return fallback;
  const day = formatDate(d);
  const time = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ });
  return `${day}, ${time}`;
}

/** viernes, 7 de noviembre de 2026 */
export function formatDateLong(value: string | number | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}
