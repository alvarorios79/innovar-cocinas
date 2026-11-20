// Validez de una cotización: 15 días calendario desde la fecha de emisión.
// Regla de Innovar: ninguna cotización tiene validez en la segunda quincena de diciembre (en enero suben todos los precios),
// así que la fecha de validez nunca pasa del 15 de diciembre del año de emisión. Una cotización emitida del 16 al 31 de diciembre
// vence el mismo día de su emisión (se renueva con los precios de enero).
export const DIAS_VALIDEZ_COTIZACION = 15;

/** Fecha hasta la que vale una cotización emitida en `desde`. */
export function fechaValidezCotizacion(desde: Date = new Date()): Date {
  const v = new Date(desde.getTime());
  v.setDate(v.getDate() + DIAS_VALIDEZ_COTIZACION);
  const limite = new Date(desde.getFullYear(), 11, 15, 23, 59, 59);   // 15 de diciembre del año de emisión
  if (desde.getTime() > limite.getTime()) return new Date(desde.getTime());
  return v.getTime() > limite.getTime() ? limite : v;
}

/** ¿El tope del 15 de diciembre recortó la validez? (para avisarlo en el documento) */
export function validezRecortadaPorDiciembre(desde: Date = new Date()): boolean {
  const v = new Date(desde.getTime()); v.setDate(v.getDate() + DIAS_VALIDEZ_COTIZACION);
  return fechaValidezCotizacion(desde).getTime() < v.getTime();
}
