// Texto de un closet para el PDF y el enlace público (una sola redacción, antes estaba duplicada y con errores).
export function lineasCloset(cc: any): string[] {
  const labels: Record<string, string> = { estandar: "Closet Estándar", premium: "Closet Premium", deluxe: "Closet Deluxe", especial: "Closet Especial", empotrado: "Closet Premium" };
  const doorLabels: Record<string, string> = { corredizas: "Puertas corredizas", batientes: "Puertas batientes" };
  const lines: string[] = [];
  lines.push((labels[cc.type] || `Closet ${String(cc.type || "").toUpperCase()}`).toUpperCase());
  lines.push(`Dimensiones: ${cc.width} m (ancho) x ${cc.height} m (alto)`);
  lines.push(`Profundidad: ${cc.type === "especial" ? "menos de 40 cm" : "60 cm"}`);
  lines.push(`Área: ${Number(cc.squareMeters || 0).toFixed(2)} m²`);
  if (doorLabels[cc.doorType]) lines.push(doorLabels[cc.doorType]);
  lines.push("");
  const a = cc.accessories || {};
  const hayMarcados = Object.values(a).some(Boolean);
  const incluye: string[] = [];
  if (hayMarcados) {
    if (a.maletero) incluye.push("Maletero");
    if (a.divisor) incluye.push("Divisor de ropa");
    if (a.entrepanos) incluye.push("Entrepaños");
    if (a.doubleCajonero) incluye.push("Doble cajonero");
    if (a.zapatero) incluye.push("Zapatero");
    if (a.dobleColgadero) incluye.push("Doble colgadero");
    if (a.espejo) incluye.push("Espejo en puertas");
  } else {
    // cotizaciones antiguas sin casillas: el closet siempre incluía esto
    incluye.push("Maletero", "Divisor", "Doble colgadero", "Entrepaños", "Doble cajonero", "Zapatero");
  }
  if (cc.type === "premium" || cc.type === "deluxe" || cc.type === "empotrado") incluye.push("Espaldar y laterales completos");
  if (cc.incluyeLed && cc.ledML > 0) incluye.push(`Iluminación LED interior (${cc.ledML} ml)`);
  lines.push("Incluye:");
  incluye.forEach((x) => lines.push(`• ${x}`));
  if (cc.includeDismantle) lines.push("• Desmonte y desarmado del closet existente (no incluye el retiro de escombros del domicilio)");
  if (cc.notes && String(cc.notes).trim()) { lines.push(""); lines.push("Notas adicionales:"); lines.push(String(cc.notes).trim()); }
  return lines;
}
