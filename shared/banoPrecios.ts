// Precios del mueble de baño: una sola fórmula para la pantalla y las pruebas.
//  • Mueble de madera: proporcional al ANCHO y al FONDO a partir de la medida de referencia (60 cm de ancho × 45 de fondo = precio base).
//    Fondo hasta 60 cm: proporcional · de 61 a 90 cm: +30 % · más de 90: ×2 (como los mesones).
//  • Mesón (plancha para lavamanos de sobreponer) y excavado (lavamanos integrado en la piedra): por metro lineal de ancho, con el recargo
//    de fondo de la piedra (hasta 60: normal · 61–90: +30 % · más de 90: ×2). Incluyen regrueso en los vistos y salpicadero de 10 cm.
//  • Excavado desde 1,30 m de ancho puede llevar 2 pocetas: la segunda poceta se cobra aparte con un valor fijo (Motor: BANO_POCETA_EXTRA, $400.000).
import { precioPiedraML, recargoFondoPct } from "./mesonPrecios";

export const BANO_ANCHO_REF = 60;
export const BANO_FONDO_REF = 45;
export const ANCHO_MIN_DOS_POCETAS = 130;
export const POCETA_EXTRA_RESPALDO = 400000; // valor de respaldo; el vigente sale del Motor (BANO_POCETA_EXTRA)

export function factorFondoMueble(fondo: number): number {
  const f = Number(fondo) || BANO_FONDO_REF;
  if (f <= BANO_FONDO_REF) return 1;
  if (f <= 60) return f / BANO_FONDO_REF;
  const a60 = 60 / BANO_FONDO_REF;
  return f <= 90 ? a60 * (1 + recargoFondoPct() / 100) : a60 * 2;
}

export function factorFondoPiedra(fondo: number): number {
  const f = Number(fondo) || 0;
  if (f <= 60) return 1;
  return f <= 90 ? 1 + recargoFondoPct() / 100 : 2;
}

/** Precio de UN mueble de madera (carcasa) según su ancho y fondo, redondeado a $10.000. `base` = precio del mueble de 60 × 45. */
export function precioMuebleBano(base: number, anchoCm: number, fondoCm: number): number {
  const a = Number(anchoCm) || 0;
  if (a <= 0 || !(base > 0)) return 0;
  return Math.round((base * (a / BANO_ANCHO_REF) * factorFondoMueble(fondoCm)) / 10000) * 10000;
}

/** Mesón (plancha) de piedra para lavamanos de sobreponer, por unidad. */
export function precioMesonBano(material: string, anchoCm: number, fondoCm: number): number {
  const a = Number(anchoCm) || 0;
  if (!material || a <= 0) return 0;
  return Math.round(precioPiedraML(material) * (a / 100) * factorFondoPiedra(fondoCm));
}

/** Excavado (lavamanos integrado en la piedra), por unidad. `precioMl` = precio por ml de ancho del material. */
export function precioExcavadoBano(precioMl: number, anchoCm: number, fondoCm: number, pocetas = 1, precioPocetaExtra = POCETA_EXTRA_RESPALDO): { uno: number; segunda: number; total: number } {
  const a = Number(anchoCm) || 0;
  if (!(precioMl > 0) || a <= 0) return { uno: 0, segunda: 0, total: 0 };
  const ff = factorFondoPiedra(fondoCm);
  const uno = Math.round(precioMl * (a / 100) * ff);
  const segunda = pocetas >= 2 && a >= ANCHO_MIN_DOS_POCETAS ? Math.round(precioPocetaExtra) : 0;
  return { uno, segunda, total: uno + segunda };
}

/**
 * ¿La descripción del mueble de baño se conserva (el vendedor la editó a mano) o se regenera sola con el cambio?
 * `marca` = bathroomConfig.descripcionManual. Sin marca (cotizaciones guardadas antes), se considera automática si
 * empieza con el texto del mueble («Mueble de Baño…» o «2 unidades — Mueble de Baño…»).
 */
export function conservarDescripcionBano(descripcion: string | null | undefined, marca: boolean | undefined): boolean {
  const d = String(descripcion || "").trim();
  if (!d) return false;
  if (marca === true) return true;
  if (marca === false) return false;
  return !/^(\d+ unidades — )?Mueble de Baño/i.test(d);
}
