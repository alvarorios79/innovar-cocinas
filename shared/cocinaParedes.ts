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
  supManual?: boolean; // true = el superior se escribió aparte (si no, sigue al inferior)
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

/** Al escribir el inferior, el superior lo sigue mientras no se haya escrito aparte. */
export function setInferior(p: ParedCocina, valor: number | undefined): ParedCocina {
  return { ...p, inf: valor, sup: p.supManual ? p.sup : valor };
}
export function setSuperior(p: ParedCocina, valor: number | undefined): ParedCocina {
  return { ...p, sup: valor, supManual: true };
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

export function totalesParedes(paredes: ParedCocina[] | undefined): { infM: number; supM: number } {
  const p = paredes || [];
  return { infM: r2(p.reduce((a, x) => a + n(x.inf), 0) / 100), supM: r2(p.reduce((a, x) => a + n(x.sup), 0) / 100) };
}

export function layoutDeForma(forma?: string): "lineal" | "L" | "U" | "paralela" | "" {
  return forma === "Lineal" ? "lineal" : forma === "L" ? "L" : forma === "U" ? "U" : forma === "Paralela" ? "paralela" : "";
}

export interface CocinaDeLevantamiento {
  layout: "lineal" | "L" | "U" | "paralela" | "";
  paredesM: Array<{ nombre: string; inf: number; sup: number; ancho: number; alto?: number }>;
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
    return {
      layout: layoutDeForma(forma),
      paredesM: paredes.map((p, i) => ({ nombre: nombres[i] || String(i + 1), inf: r2(n(p.inf) / 100), sup: r2(n(p.sup) / 100), ancho: r2(anchoMuroCm(p) / 100), alto: n(p.alto) > 0 ? r2(n(p.alto) / 100) : undefined })),
      lowerMeters: t.infM, upperMeters: t.supM, islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined,
      separacionCm: n(m._cocina_separacion) || undefined, isla: piezaDeLevantamiento(m, "_cocina_isla"), barra: piezaDeLevantamiento(m, "_cocina_barra"), aberturas: Array.isArray(m._cocina_aberturas) ? m._cocina_aberturas : [], aproximado: false,
    };
  }
  const ancho = n(m._cocina_ancho) / 100; // levantamiento antiguo: un solo «ancho»
  if (ancho > 0) {
    return {
      layout: layoutDeForma(forma), paredesM: [{ nombre: "A", inf: r2(ancho), sup: r2(ancho), ancho: r2(ancho) }],
      lowerMeters: r2(ancho), upperMeters: r2(ancho), islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined, isla: piezaDeLevantamiento(m, "_cocina_isla"), barra: piezaDeLevantamiento(m, "_cocina_barra"), aberturas: [], aproximado: true,
    };
  }
  return null;
}
