// ═════════════════════════════════════════════════════════════════════════════
// MESONES DE PIEDRA — UNA SOLA FUENTE de precios y reglas (17 nov 2026)
//
// Se usa en los TRES lugares donde se cotiza piedra:
//   1. Cocina Integral → mesón principal (se calcula con los metros RESULTANTES), isla y barra de la cocina.
//   2. Piezas de Cocina → «Isla» completa (madera + piedra) y «Barra».
//   3. Mesón Solo     → ítem independiente (mesón, isla o barra sueltos).
//
// Reglas de negocio (Álvaro):
//   • Piedras: granito $750.000, cuarzo $850.000, sinterizado $1.200.000 por ml (fondo hasta 60 cm). El acero NO se cotiza aquí.
//   • Fondo: hasta 65 cm sin recargo · 66–90 cm +30 % · 91–120 cm ×2.
//   • Barra: SIEMPRE es angosta (35–45 cm) y usa el precio «angosta»; si es menos de 35 cm se cobra igual.
//   • Lavaplatos: sencillo $180.000 · doble $700.000 · otro (el precio que se escriba).
//   • Laterales de isla: cada lateral = 0,90 ml; se marcan por separado (0, 1 o 2).
//   • «Importado»: en todos los mesones hay una casilla; marcada, el precio por ml se escribe a mano (valor distinto al del Motor).
//   • BARRA (regla desde 17 nov 2026, `reglaV2`):
//       – Pedestal = una pata metálica que sostiene la barra (precio por unidad, igual para todos). Con pedestal SOLO lleva el mesón superior (sin lateral).
//       – Herraje = armazón de hierro anclado a pared y suelo que sostiene el mesón y el lateral. Su precio está pensado para 1,20 m y se cobra
//         proporcional al largo de la barra. Viene marcado por defecto. Con herraje la piedra es: largo + lateral + regrueso interior
//         (el regrueso interior mide lo mismo que el lateral), y el lateral depende de la ALTURA de la barra.
// Los precios se leen del Motor de Cotización (applyMesonPrices); los de aquí son solo respaldo.
// ═════════════════════════════════════════════════════════════════════════════

export type Piedra = "granito" | "cuarzo" | "sinterizado";
export type LavaplatosTipo = "ninguno" | "sencillo" | "doble" | "otro";

const DEFAULTS: Record<string, number> = {
  MESON_GRANITO: 750000, MESON_CUARZO: 850000, MESON_SINTERIZADO: 1200000,
  MESON_GRANITO_ANGOSTA: 490000, MESON_CUARZO_ANGOSTA: 600000, MESON_SINTERIZADO_ANGOSTA: 1000000,
  MESON_RECARGO_FONDO: 30,
  LAVAPLATOS_SENCILLO: 180000, LAVAPLATOS_DOBLE: 700000,
  BARRA_PEDESTAL: 250000, // por unidad
  BARRA_HERRAJE: 380000,  // por armazón de 1,20 m (se cobra proporcional al largo)
  LAVAPLATOS_MESON: 130000, // precio antiguo: solo para cotizaciones viejas que marcaron «lavaplatos» sin tipo
};
const P: Record<string, number> = { ...DEFAULTS };

/** Refresca los precios desde el Motor (lo que falte usa el respaldo). */
export function applyMesonPrices(getDbPrice: (code: string) => number | undefined) {
  for (const k of Object.keys(DEFAULTS)) {
    // Pedestal y herraje de barra: si no existe BARRA_*, se toma PIEZA_BARRA_* (como estaban en el Motor)
    const v = getDbPrice(k) ?? (k.startsWith("BARRA_") ? getDbPrice(`PIEZA_${k}`) : undefined);
    P[k] = typeof v === "number" && v > 0 ? v : DEFAULTS[k];
  }
}

/** Largo de un lateral de isla/barra en ml (0,90 m). */
export const LATERAL_ML = 0.9;

/** quarzone / quarzo / cuarzo → cuarzo. Cualquier otro valor desconocido se trata como sinterizado (comportamiento histórico). */
export function normalizarPiedra(t?: string | null): Piedra {
  const s = String(t || "").toLowerCase();
  if (s === "granito") return "granito";
  if (s === "quarzone" || s === "quarzo" || s === "cuarzo") return "cuarzo";
  return "sinterizado";
}

export const PIEDRA_NOMBRE: Record<Piedra, string> = { granito: "Granito", cuarzo: "Cuarzo", sinterizado: "Sinterizado" };

/** Precio por ml de la piedra. angosta = true para barra. */
export function precioPiedraML(tipo?: string | null, angosta = false): number {
  const p = normalizarPiedra(tipo);
  const code = `MESON_${p.toUpperCase()}${angosta ? "_ANGOSTA" : ""}`;
  return P[code];
}

/** Multiplicador por fondo en cm: ≤65 → 1 · 66–90 → +recargo (30 %) · >90 → ×2. */
export function multiplicadorFondoCm(fondoCm: number): number {
  if (fondoCm <= 65) return 1;
  if (fondoCm <= 90) return 1 + P.MESON_RECARGO_FONDO / 100;
  return 2;
}

/** Multiplicador según la opción elegida en la cocina (none / 30percent / 40percent / double). */
export function multiplicadorFondoOpcion(op?: string): number {
  if (op === "double") return 2;
  if (op === "40percent") return 1.4;
  if (op === "30percent") return 1 + P.MESON_RECARGO_FONDO / 100;
  return 1;
}

export function recargoFondoPct(): number { return P.MESON_RECARGO_FONDO; }
export function precioLavaplatosSencillo(): number { return P.LAVAPLATOS_SENCILLO; }
export function precioLavaplatosDoble(): number { return P.LAVAPLATOS_DOBLE; }

type ConLavaplatos = { lavaplatosTipo?: LavaplatosTipo; incluyeLavaplatos?: boolean; lavaprecio?: number | null };

/** Lavaplatos: sencillo / doble / otro (precio escrito). Cotizaciones antiguas (solo casilla) conservan su cálculo. */
export function precioLavaplatos(o: ConLavaplatos | undefined | null): number {
  if (!o) return 0;
  const t = o.lavaplatosTipo;
  if (t === "ninguno") return 0;
  if (t === "sencillo") return P.LAVAPLATOS_SENCILLO;
  if (t === "doble") return P.LAVAPLATOS_DOBLE;
  if (t === "otro") return Number(o.lavaprecio) || 0;
  return o.incluyeLavaplatos ? (o.lavaprecio ?? P.LAVAPLATOS_MESON) : 0; // antiguo
}

export function textoLavaplatos(o: ConLavaplatos | undefined | null): string | null {
  if (!o) return null;
  const t = o.lavaplatosTipo;
  if (t === "ninguno") return null;
  if (t === "sencillo") return "Lavaplatos sencillo y pegado";
  if (t === "doble") return "Lavaplatos doble y pegado";
  if (t === "otro") return "Lavaplatos y pegado";
  return o.incluyeLavaplatos ? "Lavaplatos y pegado" : null;
}

/** Cantidad de laterales de isla (0, 1 o 2). Cotizaciones antiguas con la casilla «laterales» = 2 (1,80 ml). */
export function cantLateralesIsla(isl: { cantLateralesIsla?: number; incluyeLateralesIsla?: boolean; hasLaterals?: boolean } | undefined | null): number {
  if (!isl) return 0;
  if (typeof isl.cantLateralesIsla === "number") return Math.max(0, Math.min(2, Math.round(isl.cantLateralesIsla)));
  return (isl.incluyeLateralesIsla ?? isl.hasLaterals) ? 2 : 0;
}

export function textoLateralesIsla(n: number): string | null {
  if (n <= 0) return null;
  return n === 1 ? `1 lateral en piedra (${LATERAL_ML.toFixed(2)} ml)` : `2 laterales en piedra (${(2 * LATERAL_ML).toFixed(2)} ml)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cocina Integral: piedra del mesón principal, de la isla y de la barra
// (la madera de isla y barra se cobra aparte en el calculador de la cocina)
// ─────────────────────────────────────────────────────────────────────────────

/** Mesón principal de la cocina. `metros` = metros resultantes (ya descontados los módulos especiales). */
export function piedraMesonPrincipal(ct: any, metros: number): number {
  if (!ct || !ct.type) return 0;
  const base = ct.esImportado && ct.precioImportadoML ? ct.precioImportadoML : precioPiedraML(ct.type);
  const precio = base * multiplicadorFondoOpcion(ct.depthSurcharge === "40percent" ? "30percent" : ct.depthSurcharge);
  let total = metros * precio;
  if (ct.incluyeLaterales) total += (ct.cantLaterales || 1) * LATERAL_ML * precio;
  if (ct.incluyeRegrueso) total += LATERAL_ML * precio;
  total += precioLavaplatos(ct);
  // Salpicadero alto: se cobra de nuevo el metraje (mismo precio y recargo); laterales del salpicadero: 0,62 ml a precio base
  if (ct.incluyeSalpicaderoAlto) {
    total += metros * precio;
    total += (ct.cantLateralesSalpicadero || 0) * 0.62 * base;
  }
  return total;
}

/** Piedra de la isla de la cocina: mesón + laterales (0/1/2 × 0,90 ml con fondo) + regrueso (0,90 ml sin fondo) + salpicadero + lavaplatos. */
export function piedraIsla(isl: any): number {
  if (!isl) return 0;
  let total = precioLavaplatos(isl);
  if (isl.countertopType) {
    const base = isl.esImportado && isl.precioImportadoML ? isl.precioImportadoML : precioPiedraML(isl.countertopType);
    const precio = base * multiplicadorFondoOpcion(isl.depthSurcharge);
    total += isl.meters * precio;
    total += cantLateralesIsla(isl) * LATERAL_ML * precio;
    if (isl.incluyeRegrueso ?? isl.hasLaterals) total += LATERAL_ML * base;
    if (isl.incluyeSalpicaderoAlto) total += isl.meters * precio;
  }
  return total;
}

/** Largo (m) para el que está pensado el precio del herraje de barra. */
export const HERRAJE_BARRA_BASE_M = 1.2;

/** Precio del herraje (armazón de hierro) de una barra de `metros`: proporcional a 1,20 m, redondeado al millar. */
export function precioHerrajeBarra(metros: number): number {
  return Math.round((P.BARRA_HERRAJE * (Number(metros) || 0)) / HERRAJE_BARRA_BASE_M / 1000) * 1000;
}

/** Hierros de la barra: pedestales (por unidad) + herraje (proporcional al largo). Barras antiguas: precio fijo de cada uno. */
export function hierrosBarra(bar: any): number {
  if (!bar) return 0;
  const v2 = !!bar.reglaV2;
  let t = 0;
  if (bar.incluyePedestal) t += P.BARRA_PEDESTAL * (v2 ? Math.max(1, Math.round(bar.cantPedestales || 1)) : 1);
  if (bar.incluyeHerraje) t += v2 ? precioHerrajeBarra(bar.meters) : P.BARRA_HERRAJE;
  return t;
}

/**
 * Piedra de la barra: SIEMPRE precio «angosta» (35–45 cm; menos de 35 se cobra igual).
 * Regla nueva (reglaV2): sin herraje solo el mesón superior; con herraje largo + lateral + regrueso interior (lateral = altura de la barra).
 * Barras antiguas: mesón + lateral opcional (casilla «lateral»).
 */
export function piedraBarra(bar: any): number {
  if (!bar || !bar.countertopType) return 0;
  const base = bar.esImportado && bar.precioImportadoML ? bar.precioImportadoML : precioPiedraML(bar.countertopType, true);
  const alturaM = bar.barraAlturaLateral && bar.barraAlturaLateral > 0 ? bar.barraAlturaLateral / 100 : 0.9;
  if (bar.reglaV2) return (bar.meters + (bar.incluyeHerraje ? 2 * alturaM : 0)) * base;
  return bar.meters * base + (bar.hasLateral ? alturaM * base : 0);
}

export function textoPiedraBarra(bar: any): string[] {
  const out: string[] = [];
  if (!bar) return out;
  const h = bar.barraAlturaLateral && bar.barraAlturaLateral > 0 ? bar.barraAlturaLateral : 90;
  if (bar.reglaV2) {
    if (bar.incluyeHerraje) out.push(`Lateral de ${h} cm y regrueso interior en piedra (soportados por el herraje de hierro)`);
  } else if (bar.hasLateral) out.push(`Lateral de ${h} cm en piedra`);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Texto de un sub-mesón de «Mesón Solo» (lo usan el PDF y el enlace público; una sola redacción)
// ─────────────────────────────────────────────────────────────────────────────
export function lineasSubMeson(m: any, idx: number, fmtCOP: (n: number) => string): string[] {
  const out: string[] = [];
  const piedra = PIEDRA_NOMBRE[normalizarPiedra(m.material)];
  const tipoTxt = m.tipo === "meson" ? "Mesón Estándar" : m.tipo === "isla" ? "Isla" : "Barra";
  out.push(`${idx + 1}. ${tipoTxt.toUpperCase()} EN ${piedra.toUpperCase()}${m.esImportado ? " IMPORTADO" : ""}`);
  const v2 = !!m.reglaV2;
  out.push(m.tipo === "barra" && v2 ? `   ${m.metrosLineales}ML, barra angosta` : `   ${m.metrosLineales}ML x ${m.fondo}cm de fondo`);
  const sal = m.incluyeSalpicaderoAlto ? "Salpicadero alto" : "Salpicadero bajo 10cm";
  if (m.tipo === "meson") {
    out.push(`   Incluye: Regrueso en el visto, ${sal}`);
    const lv = v2 ? textoLavaplatos(m) : "Pegado lavaplatos + Lavaplatos 45x37cm";
    if (lv) out.push(`   ${lv}`);
  } else if (m.tipo === "isla") {
    const ex = ["Regrueso en el visto"];
    const n = typeof m.cantLaterales === "number" ? m.cantLaterales : (m.incluyeLaterales ? 2 : 0);
    const lt = textoLateralesIsla(n);
    if (lt) ex.push(lt);
    if (m.incluyeRegrueso) ex.push("Regrueso adicional (0.9ML)");
    out.push(`   Incluye: ${ex.join(", ")}`);
  } else {
    const ex = ["Regrueso en los vistos", sal];
    if (v2) {
      if (m.incluyeHerraje) ex.push(`Lateral y regrueso interior de ${m.alturaLateral || 90}cm`);
      else ex.push("Solo mesón superior (sin lateral)");
    } else if (m.alturaLateral > 0) ex.push(`Lateral ${m.alturaLateral}cm`);
    out.push(`   Incluye: ${ex.join(", ")}`);
    if (v2 && m.incluyeHerraje) out.push(`   Herraje de hierro para barra de ${m.metrosLineales}ML (armazón anclado a pared y suelo)`);
    if (v2 && m.incluyePedestal) out.push(`   ${m.cantPedestales > 1 ? m.cantPedestales + " pedestales metálicos" : "Pedestal metálico"} (pata de soporte)`);
  }
  out.push(`   Subtotal: ${fmtCOP(m.subtotal || 0)}`);
  out.push("");
  return out;
}
