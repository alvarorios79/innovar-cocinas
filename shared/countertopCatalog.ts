/**
 * Catálogo de mesones (piedra sinterizada, cuarzo, granito).
 * Fuente 1: "Catalogo Stock Zoho.pdf" — Catálogo Stock de piedra sinterizada, marca Stone
 * (enviado por Álvaro el 7 nov 2026). Las cantidades en stock del PDF NO se guardan: cambian.
 * Fuente 2: lista de referencias del proveedor de mesones (imagen enviada por Álvaro, 7 nov 2026; SIN precios).
 *   Fotos de referencia descargadas de rocacentersas.com (Roca Center) y artemarmolcolombia.com (Calacatta Gris: enlace enviado por Álvaro; Calacatta Gold: "Calacutta Bianco Oro"; Statuario White: "Bianco Statuario Venato"; Marquina: "Negro Marquina"; Kenya Black: "Pure Black" — todos de Artemarmol);
 *   no son del proveedor de Innovar: el tono real puede variar. El tipo (cuarzo/granito/sinterizado)
 *   de algunas referencias es estimado — confirmar con Álvaro.
 * Para agregar más: poner la muestra en client/public/materiales/mesones/<code>.jpg y una fila aquí.
 */
export type CountertopType = "granito" | "cuarzo" | "sinterizado";

export interface CountertopDesign {
  code: string;            // nombre del archivo de la muestra
  name: string;            // nombre comercial
  finish?: "Mate" | "Brillante";
  type: CountertopType;
  supplier?: string;
  photo?: boolean;         // false = aún sin foto de muestra
}

export const COUNTERTOP_DESIGNS: CountertopDesign[] = [
  { code: "pure_white_mate", name: "Pure White", finish: "Mate", type: "sinterizado", supplier: "Stone" },
  { code: "pure_white_brillante", name: "Pure White", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "pure_black_mate", name: "Pure Black", finish: "Mate", type: "sinterizado", supplier: "Stone" },
  { code: "pure_black_brillante", name: "Pure Black", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "golden_thread_brillante", name: "Golden Thread", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "white_marle_brillante", name: "White Marle", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "carrara_brillante", name: "Carrara", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "caralagin_brillante", name: "Caralagin", finish: "Brillante", type: "sinterizado", supplier: "Stone" },
  { code: "calala_gold_mate", name: "Calala Gold", finish: "Mate", type: "sinterizado", supplier: "Stone" },
  { code: "calala_gold_brillante", name: "Calala Gold", finish: "Brillante", type: "sinterizado", supplier: "Stone" },

  // Lista del proveedor de mesones — cuarzo
  { code: "blanco_polar", name: "Blanco Polar", type: "cuarzo" },
  { code: "blanco_extra", name: "Blanco Extra", type: "cuarzo" },
  { code: "blanco_estelar", name: "Blanco Estelar", type: "cuarzo" },
  { code: "calacatta_gold", name: "Calacatta Gold", type: "cuarzo" },
  { code: "calacatta_gris", name: "Calacatta Gris", type: "cuarzo" },
  { code: "gris_cemento", name: "Gris Cemento", type: "cuarzo" },
  { code: "gris_estelar", name: "Gris Estelar", type: "cuarzo" },
  { code: "gris_oscuro", name: "Gris Oscuro", type: "cuarzo", photo: false },
  { code: "negro_estelar", name: "Negro Estelar", type: "cuarzo" },
  // Lista del proveedor de mesones — granito
  { code: "negro_san_gabriel", name: "Negro San Gabriel", type: "granito" },
  { code: "blanco_dallas", name: "Blanco Dallas", type: "granito" },
  { code: "new_caledonia", name: "New Caledonia", type: "granito" },
  { code: "verde_ubatuba", name: "Verde Ubatuba", type: "granito" },
  { code: "blanco_atlantico", name: "Blanco Atlántico", type: "granito" },
  { code: "salmon_brown", name: "Salmon Brown", type: "granito" },
  // Lista del proveedor de mesones — sinterizado (estimado)
  { code: "kenya_black", name: "Pure Black / Kenya Black", type: "sinterizado" },
  { code: "marquina_negro", name: "Marquina Negro", finish: "Brillante", type: "sinterizado" },
  { code: "statuario_gold", name: "Statuario Gold", finish: "Brillante", type: "sinterizado" },
  { code: "statuario_white", name: "Statuario White", finish: "Brillante", type: "sinterizado" },
];

/** Texto que se guarda en el proyecto (campo existente `countertopName`), p. ej. "Calala Gold · Mate". */
export const countertopLabel = (d: CountertopDesign) => (d.finish ? `${d.name} · ${d.finish}` : d.name);

export const countertopSwatchUrl = (code: string) => `/materiales/mesones/${code}.jpg`;
export const countertopHasPhoto = (d: CountertopDesign) => d.photo !== false;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Busca la muestra por el texto guardado ("Calala Gold · Mate"; si no trae acabado, toma el primero). */
export function findCountertopDesign(text?: string | null): CountertopDesign | undefined {
  if (!text) return undefined;
  const n = norm(text);
  return (
    COUNTERTOP_DESIGNS.find((d) => norm(countertopLabel(d)) === n) ??
    COUNTERTOP_DESIGNS.find((d) => norm(d.name) === n)
  );
}

export const countertopDesignsByType = (type?: string | null) =>
  COUNTERTOP_DESIGNS.filter((d) => !type || d.type === type);
