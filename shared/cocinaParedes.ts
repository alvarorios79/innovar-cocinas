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

export interface ParedCocina {
  inf?: number;        // largo de muebles inferiores (cm)
  sup?: number;        // largo de muebles superiores (cm)
  supManual?: boolean; // true = el superior se escribió aparte (si no, sigue al inferior)
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
  paredesM: Array<{ nombre: string; inf: number; sup: number }>;
  lowerMeters: number;     // m de muebles inferiores
  upperMeters: number;     // m de muebles superiores
  islaM: number;           // m de isla (0 si no hay)
  altoCm?: number;
  profundoCm?: number;
  aproximado: boolean;     // true = levantamiento antiguo sin paredes (solo un «ancho»): los metros son aproximados
}

/** Lee la cocina de las medidas de un levantamiento (nuevo con paredes, o antiguo con un solo ancho). */
export function cocinaDeLevantamiento(m: Record<string, any> | null | undefined): CocinaDeLevantamiento | null {
  if (!m) return null;
  const forma = m._cocina_forma as string | undefined;
  const paredes: ParedCocina[] | undefined = Array.isArray(m._cocina_paredes) ? m._cocina_paredes : undefined;
  const nombres = nombresParedes(forma);
  const isla = n(m._cocina_isla) / 100;
  if (paredes && paredes.some((p) => n(p.inf) > 0 || n(p.sup) > 0)) {
    const t = totalesParedes(paredes);
    return {
      layout: layoutDeForma(forma),
      paredesM: paredes.map((p, i) => ({ nombre: nombres[i] || String(i + 1), inf: r2(n(p.inf) / 100), sup: r2(n(p.sup) / 100) })),
      lowerMeters: t.infM, upperMeters: t.supM, islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined, aproximado: false,
    };
  }
  const ancho = n(m._cocina_ancho) / 100; // levantamiento antiguo: un solo «ancho»
  if (ancho > 0) {
    return {
      layout: layoutDeForma(forma), paredesM: [{ nombre: "A", inf: r2(ancho), sup: r2(ancho) }],
      lowerMeters: r2(ancho), upperMeters: r2(ancho), islaM: r2(isla),
      altoCm: n(m._cocina_alto) || undefined, profundoCm: n(m._cocina_profundo) || undefined, aproximado: true,
    };
  }
  return null;
}
