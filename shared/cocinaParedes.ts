// Paredes de la cocina tomadas en el LEVANTAMIENTO (tablet) según la forma: Lineal, L, U o Paralela (II).
// De aquí salen la forma, los metros de muebles inferiores y superiores (separados) y las paredes del plano de módulos.
// Las medidas se guardan en CENTÍMETROS (igual que el resto del formulario).

export type FormaCocina = "Lineal" | "L" | "U" | "Paralela";

export const FORMAS_COCINA: Array<{ key: FormaCocina; label: string; paredes: string[]; ayuda: string }> = [
  { key: "Lineal", label: "Línea", paredes: ["A"], ayuda: "Una sola pared" },
  { key: "L", label: "En L", paredes: ["A", "B"], ayuda: "Dos paredes que se encuentran en una esquina" },
  { key: "U", label: "En U", paredes: ["A", "B", "C"], ayuda: "Tres paredes: izquierda, fondo y derecha" },
  { key: "Paralela", label: "II Paralela", paredes: ["A", "B"], ayuda: "Dos paredes enfrentadas" },
];

/** Ventana o puerta en una pared (medidas en cm). `desde` = distancia desde el inicio de la pared; `antepecho` = altura desde el piso. */
export interface AberturaCocina {
  id: string;
  tipo: "ventana" | "puerta";
  pared: number;     // índice de la pared (0 = A, 1 = B, 2 = C)
  desde: number;
  ancho: number;
  alto: number;
  antepecho: number;
}

export const ABERTURA_POR_DEFECTO: Record<AberturaCocina["tipo"], Pick<AberturaCocina, "ancho" | "alto" | "antepecho">> = {
  ventana: { ancho: 120, alto: 120, antepecho: 100 },
  puerta: { ancho: 90, alto: 210, antepecho: 0 },
};

export const ALTO_COCINA_POR_DEFECTO = 240; // cm
export const SEPARACION_PARALELA_POR_DEFECTO = 240; // cm entre las dos paredes de una cocina paralela

export interface ParedGeometria { nombre: string; indice: number; x1: number; z1: number; x2: number; z2: number; largo: number; altoM?: number }

/** Posición de cada pared en el plano (vista desde arriba, en metros). A=izquierda/primera, etc. Usa el mayor entre inferior y superior como largo. */
export function geometriaParedes(forma: string | undefined, paredes: ParedCocina[] | undefined, separacionCm?: number): ParedGeometria[] {
  const lista = normalizarParedes(forma, paredes);
  const L = lista.map((p) => anchoMuroCm(p) / 100);
  const nom = nombresParedes(forma);
  const mk = (i: number, x1: number, z1: number, x2: number, z2: number): ParedGeometria => ({ nombre: nom[i], indice: i, x1, z1, x2, z2, largo: L[i], altoM: (Number(lista[i]?.alto) || 0) / 100 || undefined });
  if (forma === "Lineal") return [mk(0, 0, 0, L[0], 0)];
  if (forma === "L") return [mk(0, 0, 0, L[0], 0), mk(1, L[0], 0, L[0], L[1])];
  if (forma === "U") return [mk(0, 0, L[0], 0, 0), mk(1, 0, 0, L[1], 0), mk(2, L[1], 0, L[1], L[2])];
  if (forma === "Paralela") {
    const d = (Number(separacionCm) || SEPARACION_PARALELA_POR_DEFECTO) / 100;
    return [mk(0, 0, 0, L[0], 0), mk(1, 0, d, L[1], d)];
  }
  return [];
}

/** Ajusta una abertura para que quepa dentro de su pared. */
export function ajustarAbertura(a: AberturaCocina, largoParedCm: number, altoCocinaCm: number): AberturaCocina {
  const ancho = Math.max(10, Math.min(a.ancho || 0, largoParedCm || a.ancho || 10));
  const desde = Math.max(0, Math.min(a.desde || 0, Math.max(0, (largoParedCm || 0) - ancho)));
  // Se respeta el alto de la abertura; si no cabe, baja su altura desde el piso (no se achica la ventana)
  const alto = Math.max(10, Math.min(a.alto || 0, altoCocinaCm));
  const antepecho = Math.max(0, Math.min(a.antepecho || 0, Math.max(0, altoCocinaCm - alto)));
  return { ...a, ancho, desde, antepecho, alto };
}

export type ImanAbertura = "inicio" | "final" | "vecina" | null;
export const TOLERANCIA_IMAN_CM = 12;

/** «Imán»: si la ventana/puerta queda cerca del inicio o del final de la pared (o pegada a otra abertura), se pega sola. */
export function imantarDesde(a: AberturaCocina, desde: number, largoParedCm: number, otras: AberturaCocina[], tol = TOLERANCIA_IMAN_CM): number {
  const fin = Math.max(0, largoParedCm - a.ancho);
  const candidatos: number[] = [0, fin];
  otras.filter((o) => o.id !== a.id && o.pared === a.pared).forEach((o) => { candidatos.push(o.desde + o.ancho, o.desde - a.ancho); });
  let mejor = desde, dist = tol + 1;
  candidatos.filter((c) => c >= 0 && c <= fin).forEach((c) => { const d = Math.abs(c - desde); if (d <= tol && d < dist) { mejor = c; dist = d; } });
  return mejor;
}

/** A qué quedó pegada una abertura (para avisarlo en pantalla). */
export function estadoIman(a: AberturaCocina, largoParedCm: number, otras: AberturaCocina[]): ImanAbertura {
  if (Math.abs(a.desde) < 0.5) return "inicio";
  if (largoParedCm > 0 && Math.abs(a.desde + a.ancho - largoParedCm) < 0.5) return "final";
  if (otras.some((o) => o.id !== a.id && o.pared === a.pared && (Math.abs(a.desde - (o.desde + o.ancho)) < 0.5 || Math.abs(a.desde + a.ancho - o.desde) < 0.5))) return "vecina";
  return null;
}

export interface ParedCocina {
  inf?: number;        // largo de muebles inferiores (cm)
  sup?: number;        // largo de muebles superiores (cm)
  supManual?: boolean; // true = el superior se escribió a mano (si no, se calcula solo desde el ancho de la pared y las esquinas)
  infManual?: boolean; // true = el inferior se escribió a mano (si no, se calcula solo)
  ancho?: number;      // ANCHO de la pared (cm): lo que mide el muro, aparte de los muebles
  alto?: number;       // ALTO de la pared (cm); si no se escribe, se usa el alto general de la cocina
}

/** Largo del muro: el ancho escrito de la pared; si no se escribió, el mayor de los muebles. */
export function anchoMuroCm(p: ParedCocina | undefined): number {
  return Math.max(Number(p?.ancho) || 0, 0) || Math.max(Number(p?.inf) || 0, Number(p?.sup) || 0);
}

export function nombresParedes(forma?: string): string[] {
  return FORMAS_COCINA.find((f) => f.key === forma)?.paredes ?? [];
}

/** Ajusta la lista de paredes al número que pide la forma (conserva lo escrito). */
export function normalizarParedes(forma: string | undefined, paredes: ParedCocina[] | undefined): ParedCocina[] {
  const n = nombresParedes(forma).length;
  const base = Array.isArray(paredes) ? paredes : [];
  return Array.from({ length: n }, (_, i) => ({ ...(base[i] || {}) }));
}

/** Escribir el inferior a mano (queda fijo; ya no se recalcula solo). */
export function setInferior(p: ParedCocina, valor: number | undefined): ParedCocina {
  return { ...p, inf: valor, infManual: true };
}
export function setSuperior(p: ParedCocina, valor: number | undefined): ParedCocina {
  return { ...p, sup: valor, supManual: true };
}

// ── ESQUINAS (L y U): la madera (muebles inferiores y superiores) se cobra con el ancho COMPLETO de cada pared.
//    El descuento de la esquina es SOLO para el MESÓN: la pared que no llega a la esquina se acorta por el fondo del mueble de la otra. ──
export const FONDO_INFERIOR_CM = 60;   // muebles inferiores: 0,60 m de fondo
export const FONDO_SUPERIOR_CM = 35;   // muebles superiores: 0,35 m de fondo
// Alturas (cm desde el piso): inferiores llegan a 0,90; el salpicadero ocupa 0,60 (de 0,90 a 1,50); los superiores van de 1,50 hacia arriba
/** ¿La ventana estorba a los muebles superiores? Sí si su borde de arriba pasa de 1,50 m (ahí donde no va mueble). Una ventana baja, en el salpicadero, no. */
export function ventanaEstorbaSuperiores(a: { tipo?: string; antepecho?: number; alto?: number }): boolean {
  return a?.tipo === "ventana" && (Number(a.antepecho) || 0) + (Number(a.alto) || 0) > ARRANQUE_SUPERIOR_CM + 0.5;
}
export const ALTO_INFERIOR_CM = 90;
export const ALTO_SALPICADERO_CM = 60;
export const ARRANQUE_SUPERIOR_CM = ALTO_INFERIOR_CM + ALTO_SALPICADERO_CM;   // 150

/** Esquinas de cada forma: pares de paredes que se juntan (índices). L: A–B. U: A–B y B–C. */
export function esquinasDeForma(forma?: string): Array<[number, number]> {
  if (forma === "L") return [[0, 1]];
  if (forma === "U") return [[0, 1], [1, 2]];
  return [];
}

/** En cada esquina, ¿cuál pared llega hasta la esquina (la otra se acorta)? Por defecto la más ancha; si el usuario eligió, se respeta. */
export function paredGanadoraEsquina(forma: string | undefined, paredes: ParedCocina[] | undefined, eleccion?: number[]): number[] {
  const ps = normalizarParedes(forma, paredes);
  return esquinasDeForma(forma).map(([a, b], k) => {
    const e = eleccion?.[k];
    if (e === a || e === b) return e;
    return anchoMuroCm(ps[b]) > anchoMuroCm(ps[a]) ? b : a;
  });
}

export interface DescuentoPared { infIni: number; infFin: number; supIni: number; supFin: number }
/** Cuánto se le quita a cada pared (en cm) en su inicio y su final por las esquinas. Se calcula con los fondos de las paredes que sí llegan a la esquina. */
export function descuentosEsquinas(forma: string | undefined, paredes: ParedCocina[] | undefined, fondoInfCm = FONDO_INFERIOR_CM, fondoSupCm = FONDO_SUPERIOR_CM, eleccion?: number[]): DescuentoPared[] {
  const ps = normalizarParedes(forma, paredes);
  const out: DescuentoPared[] = ps.map(() => ({ infIni: 0, infFin: 0, supIni: 0, supFin: 0 }));
  const esq = esquinasDeForma(forma);
  const gan = paredGanadoraEsquina(forma, paredes, eleccion);
  esq.forEach(([a, b], k) => {
    const perdedora = gan[k] === a ? b : a;
    // la pared «a» termina en la esquina (su final) y la «b» empieza en ella (su inicio)
    // Solo el mesón (inferiores) se descuenta; los superiores y la madera no (el esquinero superior depende del diseño)
    if (perdedora === b) out[b].infIni += fondoInfCm;
    else out[a].infFin += fondoInfCm;
  });
  void fondoSupCm;
  return out;
}

/** Descuento de esquinas del MESÓN: por pared y en total (cm). El mesón = metros de inferiores − este descuento − módulos altos. */
export function descuentoMesonCm(forma: string | undefined, paredes: ParedCocina[] | undefined, fondoInfCm = FONDO_INFERIOR_CM, eleccion?: number[]): { porPared: number[]; totalCm: number } {
  const porPared = descuentosEsquinas(forma, paredes, fondoInfCm, FONDO_SUPERIOR_CM, eleccion).map((d) => d.infIni + d.infFin);
  return { porPared, totalCm: porPared.reduce((a, x) => a + x, 0) };
}

/** Medidas de muebles que salen solas: la madera se cobra plena (ancho completo de cada pared, sin descuento de esquina). */
export function mueblesSugeridos(forma: string | undefined, paredes: ParedCocina[] | undefined, fondoInfCm = FONDO_INFERIOR_CM, fondoSupCm = FONDO_SUPERIOR_CM, eleccion?: number[]): Array<{ inf: number; sup: number }> {
  const ps = normalizarParedes(forma, paredes);
  void fondoInfCm; void fondoSupCm; void eleccion;
  return ps.map((p) => {
    const w = anchoMuroCm(p);
    return { inf: w, sup: w };
  });
}

/** Rellena inferiores y superiores de las paredes que no se escribieron a mano (según el ancho de la pared y las esquinas). */
export function aplicarMueblesAutomaticos(forma: string | undefined, paredes: ParedCocina[], fondoInfCm?: number, fondoSupCm?: number, eleccion?: number[]): ParedCocina[] {
  const sug = mueblesSugeridos(forma, paredes, fondoInfCm, fondoSupCm, eleccion);
  return normalizarParedes(forma, paredes).map((p, i) => {
    if (!(anchoMuroCm(p) > 0)) return p;
    return { ...p, inf: p.infManual ? p.inf : sug[i].inf, sup: p.supManual ? p.sup : sug[i].sup };
  });
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Metros de madera de una pared: lo escrito, o —si no hay nada escrito— el ancho completo de la pared (la madera se cobra plena). */
const muebleCm = (v: any, p: ParedCocina) => (v === undefined || v === null || v === "" ? anchoMuroCm(p) : n(v));
export function totalesParedes(paredes: ParedCocina[] | undefined): { infM: number; supM: number } {
  const p = paredes || [];
  return { infM: r2(p.reduce((a, x) => a + muebleCm(x.inf, x), 0) / 100), supM: r2(p.reduce((a, x) => a + muebleCm(x.sup, x), 0) / 100) };
}

/** Ancho (cm) de ventanas que estorban a los superiores, por pared: donde va ventana no va mueble superior. */
export function ventanasSuperioresCm(forma: string | undefined, paredes: ParedCocina[] | undefined, aberturas: AberturaCocina[] | undefined): number[] {
  const ps = normalizarParedes(forma, paredes);
  const out = ps.map(() => 0);
  (Array.isArray(aberturas) ? aberturas : []).forEach((a) => {
    const i = Number(a?.pared);
    if (!(i >= 0 && i < ps.length) || !ventanaEstorbaSuperiores(a)) return;
    const largo = anchoMuroCm(ps[i]);
    const desde = Math.max(0, n(a.desde));
    const ancho = largo > 0 ? Math.max(0, Math.min(n(a.ancho), largo - desde)) : n(a.ancho);
    out[i] += ancho;
  });
  return out;
}

export function layoutDeForma(forma?: string): "lineal" | "L" | "U" | "paralela" | "" {
  return forma === "Lineal" ? "lineal" : forma === "L" ? "L" : forma === "U" ? "U" : forma === "Paralela" ? "paralela" : "";
}

export interface CocinaDeLevantamiento {
  layout: "lineal" | "L" | "U" | "paralela" | "";
  paredesM: Array<{ nombre: string; inf: number; sup: number; ancho: number; alto?: number }>;
  descMesonM: number;      // m que se descuentan del MESÓN por las esquinas (L y U); la madera se cobra plena
  ventanasSupM: number;    // m de ventanas que estorban a los superiores (ya restados de upperMeters: donde va ventana no va mueble)
  lowerMeters: number;     // m de muebles inferiores
  upperMeters: number;     // m de muebles superiores
  islaM: number;           // m de isla (0 si no hay)
  altoCm?: number;
  profundoCm?: number;
  separacionCm?: number;   // solo cocina paralela: distancia entre las dos paredes
  isla: PiezaSuelta | null; // isla: ancho (largo), profundo y alto
  barra: PiezaSuelta | null; // barra: ancho (largo), profundo y alto
  aberturas: AberturaCocina[];
  aproximado: boolean;     // true = levantamiento antiguo sin paredes (solo un «ancho»): los metros son aproximados
}

/** Medidas de una isla o una barra tomadas en el levantamiento (ancho = largo del mueble, en cm). */
export interface PiezaSuelta { anchoCm: number; profundoCm: number; altoCm: number }
export function piezaDeLevantamiento(m: Record<string, any>, base: "_cocina_isla" | "_cocina_barra"): PiezaSuelta | null {
  const anchoCm = n(m[base]);
  if (!(anchoCm > 0)) return null;
  return { anchoCm, profundoCm: n(m[`${base}_profundo`]), altoCm: n(m[`${base}_alto`]) };
}

/** Lee la cocina de las medidas de un levantamiento (nuevo con paredes, o antiguo con un solo ancho). */
export function cocinaDeLevantamiento(m: Record<string, any> | null | undefined): CocinaDeLevantamiento | null {
  if (!m) return null;
  const forma = m._cocina_forma as string | undefined;
  const paredes: ParedCocina[] | undefined = Array.isArray(m._cocina_paredes) ? m._cocina_paredes : undefined;
  const nombres = nombresParedes(forma);
  const isla = n(m._cocina_isla) / 100;
  if (paredes && paredes.some((p) => n(p.inf) > 0 || n(p.sup) > 0 || n(p.ancho) > 0)) {
    const t = totalesParedes(paredes);
    const ventanasSup = r2(ventanasSuperioresCm(forma, paredes, Array.isArray(m._cocina_aberturas) ? m._cocina_aberturas : undefined).reduce((a, x) => a + x, 0) / 100);
    return {
      layout: layoutDeForma(forma),
      paredesM: paredes.map((p, i) => ({ nombre: nombres[i] || String(i + 1), inf: r2(muebleCm(p.inf, p) / 100), sup: r2(muebleCm(p.sup, p) / 100), ancho: r2(anchoMuroCm(p) / 100), alto: n(p.alto) > 0 ? r2(n(p.alto) / 100) : undefined })),
      descMesonM: r2(descuentoMesonCm(forma, paredes, n(m._cocina_profundo) || FONDO_INFERIOR_CM, Array.isArray(m._cocina_esquinas) ? m._cocina_esquinas : undefined).totalCm / 100),
      ventanasSupM: ventanasSup,
      lowerMeters: t.infM, upperMeters: Math.max(0, r2(t.supM - ventanasSup)), islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined,
      separacionCm: n(m._cocina_separacion) || undefined, isla: piezaDeLevantamiento(m, "_cocina_isla"), barra: piezaDeLevantamiento(m, "_cocina_barra"), aberturas: Array.isArray(m._cocina_aberturas) ? m._cocina_aberturas : [], aproximado: false,
    };
  }
  const ancho = n(m._cocina_ancho) / 100; // levantamiento antiguo: un solo «ancho»
  if (ancho > 0) {
    return {
      layout: layoutDeForma(forma), paredesM: [{ nombre: "A", inf: r2(ancho), sup: r2(ancho), ancho: r2(ancho) }],
      descMesonM: 0, ventanasSupM: 0, lowerMeters: r2(ancho), upperMeters: r2(ancho), islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined, isla: piezaDeLevantamiento(m, "_cocina_isla"), barra: piezaDeLevantamiento(m, "_cocina_barra"), aberturas: [], aproximado: true,
    };
  }
  return null;
}
