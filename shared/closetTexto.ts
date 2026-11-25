import { componentesMarcados } from "./closetComponentes";

// Texto de un closet para el PDF y el enlace público (una sola redacción, antes estaba duplicada y con errores).
/** Texto fijo del vestier en concepto abierto: lo demás sale de las casillas de componentes que se marquen. */
/** Texto fijo del closet con puertas (corredizas o batientes). */
export const TEXTO_CLOSET = "Closet en madera aglomerada de alta presión tipo RH color a elegir por el cliente (diseño final por definir).";
export const TEXTO_VESTIER = "Madera aglomerado de alta presión tipo RH, color a elegir por el cliente, con regruesos en los paneles, zócalo, base y techo.";

export function lineasCloset(cc: any): string[] {
  const labels: Record<string, string> = { estandar: "Closet Estándar", premium: "Closet Premium", deluxe: "Closet Deluxe", especial: "Closet Especial", empotrado: "Closet Premium" };
  const doorLabels: Record<string, string> = { corredizas: "Puertas corredizas", batientes: "Puertas batientes", abierto: "Concepto abierto: sin puertas, con regrueso en los cantos" };
  const lines: string[] = [];
  const abierto = cc.doorType === "abierto";
  // Concepto abierto (vestier): sin puertas, con regrueso; se describe por lo que SÍ lleva, nunca habla de puertas
  lines.push(abierto ? `${labels[cc.type] || "Closet Deluxe"} · CONCEPTO ABIERTO (VESTIER)`.toUpperCase() : (labels[cc.type] || `Closet ${String(cc.type || "").toUpperCase()}`).toUpperCase());
  lines.push(`Dimensiones: ${cc.width} m (ancho) x ${cc.height} m (alto)`);
  lines.push(`Profundidad: ${cc.type === "especial" ? "menos de 40 cm" : "60 cm"}`);
  lines.push(`Área: ${Number(cc.squareMeters || 0).toFixed(2)} m²`);
  if (abierto) lines.push(TEXTO_VESTIER);
  else {
    lines.push(TEXTO_CLOSET);
    if (doorLabels[cc.doorType]) lines.push(doorLabels[cc.doorType]);
  }
  lines.push("");
  const a = cc.accessories || {};
  const hayMarcados = Object.values(a).some(Boolean);
  const incluye: string[] = [];
  if (hayMarcados) {
    incluye.push(...componentesMarcados(a, cc.cantidades, cc.medidasCm));
  } else if (!abierto) {
    // cotizaciones antiguas sin casillas: el closet siempre incluía esto
    incluye.push("Maletero", "Divisor", "Doble colgadero", "Entrepaños", "Doble cajonero", "Zapatero");
  }
  if (!abierto && (cc.type === "premium" || cc.type === "deluxe" || cc.type === "empotrado")) incluye.push("Espaldar y laterales completos");
  if (cc.incluyeLed && cc.ledML > 0) incluye.push(`Iluminación LED interior (${cc.ledML} ml)`);
  lines.push("Incluye:");
  incluye.forEach((x) => lines.push(`• ${x}`));
  if (cc.includeDismantle) lines.push("• Desmonte y desarmado del closet existente (no incluye el retiro de escombros del domicilio)");
  if (cc.notes && String(cc.notes).trim()) { lines.push(""); lines.push("Notas adicionales:"); lines.push(String(cc.notes).trim()); }
  return lines;
}
