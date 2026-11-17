// Precios de «Piezas de cocina» que dependen de la cocina completa (sin React, para poder probarlos).
// ── Regla de negocio (17 nov 2026) ──────────────────────────────────────────
// Cocina completa: inferiores y superiores a precio de su categoría (Estándar/Premium/Deluxe).
// Muebles altos/bajos SUELTOS: precio de la categoría + 15 % (Motor: RECARGO_PIEZA_SUELTA).
// Nichos, alacenas y torre de hornos como pieza sola: precio que tienen dentro de la cocina + 10 % (Motor: RECARGO_PIEZA_FIJA).
// Frente pollo: mismo precio que el Frente PLL de la cocina (COCINA_ML_FRENTE_PLL).
export type CategoriaPieza = "estandar" | "premium" | "deluxe";
export const CATEGORIAS_PIEZA: Record<CategoriaPieza, string> = { estandar: "Estándar", premium: "Premium", deluxe: "Deluxe" };
const CODIGO_CATEGORIA: Record<CategoriaPieza, string> = {
  estandar: "COCINA_ML_ESTANDAR", premium: "COCINA_ML_PREMIUM", deluxe: "COCINA_ML_DELUXE",
};
const CODIGO_PIEZA_FIJA: Partial<Record<string, string>> = {
  nicho_nevecon: "NICHO_NEVECON", nicho_nevera: "NICHO_NEVERA", alacena_entrepanos: "ALACENA_ENTREPANOS",
  alacena_herraje: "ALACENA_HERRAJE", torre_hornos: "TORRE_HORNOS",
};
// Precios que la pieza toma de la COCINA (se refrescan con applyPiezaPrices; valores = Motor 17 nov 2026)
const COCINA_BASE_DEFAULT: Record<string, number> = {
  COCINA_ML_ESTANDAR: 900000, COCINA_ML_PREMIUM: 1000000, COCINA_ML_DELUXE: 1100000, COCINA_ML_FRENTE_PLL: 900000,
  NICHO_NEVECON: 1200000, NICHO_NEVERA: 1100000, ALACENA_ENTREPANOS: 1250000, ALACENA_HERRAJE: 900000, TORRE_HORNOS: 1350000,
};
const COCINA_BASE: Record<string, number> = { ...COCINA_BASE_DEFAULT };
const RECARGO = { suelta: 15, fija: 10 };
// Claves de PRECIOS que ya no se leen de PIEZA_* porque salen de la cocina
export const DERIVADAS = new Set(["MUEBLE_ALTO_ML", "MUEBLE_ALTO_LED_ML", "MUEBLE_BAJO_ML", "FRENTE_POLLO_ML", "NICHO_NEVECON", "NICHO_NEVERA", "ALACENA_ENTREPANOS", "ALACENA_HERRAJE", "TORRE_HORNOS"]);

/** Refresca los precios de cocina y los recargos desde el Motor (los que falten usan el valor por defecto). */
export function applyCocinaBase(getDbPrice: (code: string) => number | undefined) {
  Object.keys(COCINA_BASE_DEFAULT).forEach((k) => {
    const v = getDbPrice(k);
    COCINA_BASE[k] = (typeof v === "number" && v > 0) ? v : COCINA_BASE_DEFAULT[k];
  });
  const rs = getDbPrice("RECARGO_PIEZA_SUELTA"); RECARGO.suelta = typeof rs === "number" && rs >= 0 ? rs : 15;
  const rf = getDbPrice("RECARGO_PIEZA_FIJA");   RECARGO.fija   = typeof rf === "number" && rf >= 0 ? rf : 10;
}

/** Precio por ml de un mueble alto/bajo suelto: categoría + recargo de pieza suelta. */
export function precioMuebleSuelto(cat?: CategoriaPieza): number {
  return Math.round(COCINA_BASE[CODIGO_CATEGORIA[cat || "estandar"]] * (1 + RECARGO.suelta / 100));
}
export function recargoSueltaPct(): number { return RECARGO.suelta; }
/** Precio de nicho/alacena/torre como pieza sola: precio dentro de la cocina + recargo. */
export function precioPiezaFija(tipo: string): number | undefined {
  const c = CODIGO_PIEZA_FIJA[tipo];
  return c ? Math.round(COCINA_BASE[c] * (1 + RECARGO.fija / 100)) : undefined;
}
export function precioFrentePollo(): number { return COCINA_BASE.COCINA_ML_FRENTE_PLL; }
