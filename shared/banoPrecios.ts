// Precios del mueble de baño: una sola fórmula para la pantalla y las pruebas.
//  • Mueble de madera: un valor FIJO + un valor por metro de ancho (los costos fijos se reparten en los metros: un mueble largo no cuesta lo
//    mismo por metro que uno corto). Con los valores de hoy el de 0,60 m × 0,45 m cuesta $750.000 y el de 2,55 m × 0,45 m unos $2.410.000.
//    Fondo hasta 60 cm: proporcional (referencia 45 cm) · de 61 a 90 cm: +30 % · más de 90: ×2 (como los mesones).
//  • Mesón (plancha para lavamanos de sobreponer): por metro lineal de ancho con el precio de los mesones de cocina, con el recargo de fondo
//    de la piedra (hasta 60: normal · 61–90: +30 % · más de 90: ×2). Incluye regrueso en los vistos y salpicadero de 10 cm.
//  • Excavado = la piedra (mismo precio por ml del mesón) + la poceta excavada (Motor: BANO_POCETA, $440.000). Desde 1,30 m de ancho puede
//    llevar 2 pocetas: la segunda se cobra aparte con un valor fijo (Motor: BANO_POCETA_EXTRA, $400.000). Incluye regrueso y salpicadero de 10 cm.
import { precioPiedraML, recargoFondoPct } from "./mesonPrecios";

export const BANO_ANCHO_REF = 60;
export const BANO_FONDO_REF = 45;
export const ANCHO_MIN_DOS_POCETAS = 130;
export const POCETA_EXTRA_RESPALDO = 400000; // valor de respaldo; el vigente sale del Motor (BANO_POCETA_EXTRA)
export const POCETA_RESPALDO = 440000;       // 1.ª poceta excavada (Motor: BANO_POCETA)
export const MUEBLE_FIJO_RESPALDO = 240000;   // Motor: BANO_MUEBLE_FIJO
export const MUEBLE_ML_RESPALDO = 850000;     // Motor: BANO_MUEBLE_ML (por metro de ancho)

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

/** Precio de UN mueble de madera (carcasa): (fijo + por metro × ancho) × factor de fondo, redondeado a $10.000. */
export function precioMuebleBano(fijo: number, porMetro: number, anchoCm: number, fondoCm: number): number {
  const a = Number(anchoCm) || 0;
  if (a <= 0 || !(porMetro > 0)) return 0;
  return Math.round(((Number(fijo) || 0) + porMetro * (a / 100)) * factorFondoMueble(fondoCm) / 10000) * 10000;
}

/** Mesón (plancha) de piedra para lavamanos de sobreponer, por unidad. */
export function precioMesonBano(material: string, anchoCm: number, fondoCm: number): number {
  const a = Number(anchoCm) || 0;
  if (!material || a <= 0) return 0;
  return Math.round(precioPiedraML(material) * (a / 100) * factorFondoPiedra(fondoCm));
}

/** Excavado (lavamanos integrado en la piedra), por unidad: piedra (precio por ml del material × ancho × fondo) + poceta (+ 2.ª poceta). */
export function precioExcavadoBano(material: string, anchoCm: number, fondoCm: number, pocetas = 1, precioPoceta = POCETA_RESPALDO, precioPocetaExtra = POCETA_EXTRA_RESPALDO):
  { piedra: number; poceta: number; uno: number; segunda: number; total: number } {
  const a = Number(anchoCm) || 0;
  if (!material || a <= 0) return { piedra: 0, poceta: 0, uno: 0, segunda: 0, total: 0 };
  const piedra = Math.round(precioPiedraML(material) * (a / 100) * factorFondoPiedra(fondoCm));
  const poceta = Math.round(precioPoceta);
  const uno = piedra + poceta;
  const segunda = pocetas >= 2 && a >= ANCHO_MIN_DOS_POCETAS ? Math.round(precioPocetaExtra) : 0;
  return { piedra, poceta, uno, segunda, total: uno + segunda };
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
