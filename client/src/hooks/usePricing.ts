import { trpc } from "@/lib/trpc";
import { applyMesonPrices } from "@shared/mesonPrecios";
import { applyCocinaBase } from "@shared/piezasCocinaPrecios";

// Precios por defecto (fallback si no se cargan de la BD)
// Sincronizados con el Motor de Cotización INNOVAR — actualizar via /pricing-config
const DEFAULT_PRICES: Record<string, { value: number; unit: string | null }> = {
  // Cocina Base — precio por metro lineal (inferior + superior)
  // Códigos con nombre de referencia (usados por mlPriceCode en el configurador)
  COCINA_ML_ESTANDAR:   { value: 900000,  unit: "ml" },  // fallback BD: mismo valor
  COCINA_ML_PREMIUM:    { value: 1000000, unit: "ml" },  // fallback BD: mismo valor
  COCINA_ML_DELUXE:     { value: 1100000, unit: "ml" },  // fallback BD: mismo valor
  // Códigos legacy (por forma de cocina)
  COCINA_ML_L:          { value: 1800000, unit: "ml" },
  COCINA_ML_U:          { value: 1800000, unit: "ml" },
  COCINA_ML_LINEAL:     { value: 1800000, unit: "ml" },
  COCINA_ML_FRENTE_PLL: { value: 900000,  unit: "ml" },
  COCINA_ML_SOLO_MUEBLES: { value: 900000, unit: "ml" },
  MUEBLE_SUPERIOR_ML:   { value: 900000,  unit: "ml" },
  MUEBLE_INFERIOR_ML:   { value: 900000,  unit: "ml" },

  // Mesones — fondo estándar (≤60cm)
  MESON_GRANITO:        { value: 750000,  unit: "ml" },
  MESON_CUARZO:         { value: 850000,  unit: "ml" },
  MESON_SINTERIZADO:    { value: 1200000, unit: "ml" },
  MESON_RECARGO_FONDO:  { value: 30,      unit: "%" },   // +30% fondo 61-90cm; ×2 fondo 91-120cm

  // Mesones — fondo angosto (ítem independiente de meson)
  MESON_GRANITO_ANGOSTA:     { value: 490000,  unit: "ml" },
  MESON_CUARZO_ANGOSTA:      { value: 600000,  unit: "ml" },
  MESON_SINTERIZADO_ANGOSTA: { value: 1000000, unit: "ml" },

  // Extras de mesón
  LAVAPLATOS_MESON:     { value: 130000,  unit: "unidad" },  // antiguo (cotizaciones viejas)
  LAVAPLATOS_SENCILLO:  { value: 180000,  unit: "unidad" },
  LAVAPLATOS_DOBLE:     { value: 700000,  unit: "unidad" },

  // Muebles Especiales (descuentan metros lineales al precio base)
  NICHO_NEVECON:        { value: 1200000, unit: "unidad" }, // descuenta 1.0 ml
  NICHO_NEVERA:         { value: 1100000, unit: "unidad" }, // descuenta 0.75 ml
  ALACENA_ENTREPANOS:   { value: 1250000, unit: "unidad" }, // descuenta 0.5 ml
  ALACENA_HERRAJE:      { value: 900000,  unit: "unidad" }, // descuenta 0.5 ml
  TORRE_HORNOS:         { value: 1350000, unit: "unidad" }, // descuenta 0.7 ml

  // Extras
  ISLA_ML:              { value: 900000,  unit: "ml" },  // sin uso: la madera de la isla usa PIEZA_ISLA_MADERA_ML
  PIEZA_ISLA_MADERA_ML: { value: 1200000, unit: "ml" },  // isla con cajoneras: mismo precio dentro de la cocina y como pieza
  ISLA_LATERAL:         { value: 350000,  unit: "unidad" },
  BARRA_ML:             { value: 900000,  unit: "ml" },
  BARRA_LATERAL:        { value: 350000,  unit: "unidad" },
  BARRA_PEDESTAL:       { value: 250000,  unit: "unidad" },  // pata metálica, por unidad
  BARRA_HERRAJE:        { value: 380000,  unit: "unidad" },  // armazón de hierro para 1,20 m; se cobra proporcional al largo
  LED_ML:               { value: 180000,  unit: "ml" },
  // Recargos de pieza suelta (17 nov 2026): muebles altos/bajos sueltos = categoría +15 %; nichos/alacenas/torre sueltos = precio de cocina +10 %
  RECARGO_PIEZA_SUELTA: { value: 15,      unit: "%" },
  RECARGO_PIEZA_FIJA:   { value: 10,      unit: "%" },
  TRANSPORTE_IMPREVISTOS: { value: 600000, unit: "fijo" },

  // Puertas y Tapas (para cocinas)
  BANO_50_60:           { value: 750000,  unit: "unidad" },
  BANO_60_80:           { value: 900000,  unit: "unidad" },
  BANO_80_100:          { value: 1200000, unit: "unidad" },
  BANO_100_120:         { value: 1400000, unit: "unidad" },

  // Excavados de lavamanos (precio por ML de ancho del mueble)
  BANO_EXCAVADO_GRANITO:       { value: 1200000, unit: "ml" },
  BANO_EXCAVADO_CUARZO:        { value: 1500000, unit: "ml" },
  BANO_EXCAVADO_SINTERIZADO:   { value: 2100000, unit: "ml" },

  // Mesones de baño — plancha de piedra (precio por ML de ancho)
  BANO_MESON_GRANITO:          { value: 820000,  unit: "ml" },
  BANO_MESON_CUARZO:           { value: 1000000, unit: "ml" },
  BANO_MESON_SINTERIZADO:      { value: 1400000, unit: "ml" },
  BANO_POCETA_EXTRA:           { value: 400000,  unit: "unidad" }, // 2.ª poceta del excavado (desde 1,30 m de ancho)
  PUERTA_SUP_70:        { value: 120000,  unit: "unidad" },
  PUERTA_SUP_90:        { value: 150000,  unit: "unidad" },
  PUERTA_SUP_100:       { value: 180000,  unit: "unidad" },
  PUERTA_INF:           { value: 150000,  unit: "unidad" },
  PUERTA_ALACENA:       { value: 180000,  unit: "unidad" },
  TAPA_CAJON:           { value: 90000,   unit: "unidad" },
  TAPA_PEQUENA:         { value: 45000,   unit: "unidad" },

  // Pintado Alto Brillo (cocinas)
  PINTADO_SUP:          { value: 120000,  unit: "unidad" },
  PINTADO_INF:          { value: 150000,  unit: "unidad" },
  PINTADO_ALACENA:      { value: 250000,  unit: "unidad" },
  PINTADO_CAJON:        { value: 80000,   unit: "unidad" },
  PINTADO_ESPECIERO:    { value: 100000,  unit: "unidad" },
  PINTADO_GOLA:         { value: 45000,   unit: "unidad" },
  PINTADO_LATERAL:      { value: 200000,  unit: "unidad" },
  PINTADO_LATERAL_ISLA: { value: 150000,  unit: "unidad" },
  PINTADO_PUERTA_ELECTRO: { value: 180000, unit: "unidad" },
  PINTADO_PUERTA_NEVERA: { value: 300000, unit: "unidad" },

  // Closets — precio por m²
  CLOSET_ESTANDAR_M2:   { value: 800000,  unit: "m2" },
  CLOSET_PREMIUM_M2:    { value: 900000,  unit: "m2" },
  CLOSET_DELUXE_M2:     { value: 1100000, unit: "m2" },
  CLOSET_ESPECIAL_M2:   { value: 650000,  unit: "m2" },
  CLOSET_EMPOTRADO_M2:  { value: 900000,  unit: "m2" },

  // Puertas (Producto) — rangos de ancho
  PUERTA_BATIENTE_50_85:   { value: 890000,  unit: "unidad" },
  PUERTA_BATIENTE_85_110:  { value: 950000,  unit: "unidad" },
  PUERTA_CORREDIZA_50_85:  { value: 1250000, unit: "unidad" },
  PUERTA_CORREDIZA_85_110: { value: 1350000, unit: "unidad" },
  // Aliases legacy (para compatibilidad con código existente)
  PUERTA_CORREDIZA_SENCILLA: { value: 1250000, unit: "unidad" },
  PUERTA_CORREDIZA_DOBLE:    { value: 1350000, unit: "unidad" },
  PUERTA_BATIENTE:           { value: 890000,  unit: "unidad" },

  // Centros de TV
  TV_CENTER_LED:        { value: 180000,  unit: "ml" },
  TV_CENTER_REPISA:     { value: 100000,  unit: "unidad" },
  TV_CENTER_TRANSPORTE: { value: 150000,  unit: "unidad" },
  // Centro de TV — versión 2 (nov 2026)
  TV2_BASE:              { value: 2300000, unit: "unidad" }, // base 1.60m SIN alistonado; ±TV2_PER_20CM cada 20cm
  TV2_PER_20CM:          { value: 250000,  unit: "unidad" },
  TV2_ALISTONADO_LADO:   { value: 800000,  unit: "unidad" },
  TV2_SOPORTE_INSTALACION: { value: 160000, unit: "unidad" },
  TV2_PINTADO_REPISA:    { value: 80000,   unit: "unidad" },

  // Acabados Especiales
  ACABADO_ALUMINIO_VIDRIO_M2: { value: 1200000, unit: "m2" },
  ACABADO_BISAGRA_PAR:        { value: 35000,   unit: "par" },
  ACABADO_LED_ML:             { value: 180000,  unit: "ml" },

  // Servicios de desmonte (opcionales, el montaje va incluido en el trabajo)
  DESMONTE_COCINA:            { value: 300000,  unit: "servicio" },
  DESMONTE_CLOSET:            { value: 250000,  unit: "servicio" },

  // Descuentos internos (ml que descuentan módulos especiales)
  DESCUENTO_NICHO_ML:   { value: 1,   unit: "ml" },
  DESCUENTO_ALACENA_ML: { value: 0.5, unit: "ml" },
  DESCUENTO_TORRE_ML:   { value: 0.7, unit: "ml" },

};

// Precios que el cotizador necesita SÍ o SÍ. Si alguno no está en el Motor se usa el valor de respaldo y se avisa con un cartel rojo
// (antes un código mal escrito o faltante cobraba $0 o un precio viejo sin avisar).
export const CODIGOS_NECESARIOS = [
  "COCINA_ML_ESTANDAR", "COCINA_ML_PREMIUM", "COCINA_ML_DELUXE", "COCINA_ML_FRENTE_PLL", "MUEBLE_SUPERIOR_ML", "MUEBLE_INFERIOR_ML",
  "MESON_GRANITO", "MESON_CUARZO", "MESON_SINTERIZADO", "MESON_GRANITO_ANGOSTA", "MESON_CUARZO_ANGOSTA", "MESON_SINTERIZADO_ANGOSTA", "MESON_RECARGO_FONDO",
  "LAVAPLATOS_SENCILLO", "LAVAPLATOS_DOBLE", "LED_ML", "BARRA_ML", "BARRA_PEDESTAL", "BARRA_HERRAJE", "PIEZA_ISLA_MADERA_ML",
  "RECARGO_PIEZA_SUELTA", "RECARGO_PIEZA_FIJA", "NICHO_NEVECON", "NICHO_NEVERA", "ALACENA_ENTREPANOS", "ALACENA_HERRAJE", "TORRE_HORNOS",
  "PINTADO_SUP", "PINTADO_INF", "PINTADO_ALACENA", "PINTADO_CAJON", "PINTADO_ESPECIERO", "PINTADO_GOLA", "PINTADO_LATERAL",
  "CLOSET_ESTANDAR_M2", "CLOSET_PREMIUM_M2", "CLOSET_DELUXE_M2", "CLOSET_ESPECIAL_M2",
  "PUERTA_BATIENTE_50_85", "PUERTA_BATIENTE_85_110", "PUERTA_CORREDIZA_50_85", "PUERTA_CORREDIZA_85_110",
  "BANO_50_60", "BANO_60_80", "BANO_80_100", "BANO_100_120", "BANO_POCETA_EXTRA", "TV2_BASE", "TV2_PER_20CM",
  "ACABADO_ALUMINIO_VIDRIO_M2", "ACABADO_BISAGRA_PAR", "DESMONTE_COCINA", "DESMONTE_CLOSET",
];

export interface PricingData {
  prices: Record<string, { value: number; unit: string | null }>;
  isLoading: boolean;
  isError: boolean;
  /** Códigos necesarios que NO están en el Motor (se usa el respaldo). Vacío mientras carga. */
  missing: string[];
  getPrice: (code: string) => number;
  getPriceWithUnit: (code: string) => { value: number; unit: string | null };
}

export function usePricing(): PricingData {
  const { data, isLoading, isError } = trpc.pricing.getAllForCalculations.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (antes cacheTime)
    refetchOnWindowFocus: false,
  });

  const prices = data || DEFAULT_PRICES;
  // Mantiene al día las reglas compartidas (mesones y piezas) con los precios del Motor
  applyMesonPrices((code) => prices[code]?.value ?? DEFAULT_PRICES[code]?.value);
  applyCocinaBase((code) => prices[code]?.value ?? DEFAULT_PRICES[code]?.value);

  const getPrice = (code: string): number => {
    const priceData = prices[code];
    if (priceData) {
      return priceData.value;
    }
    // Fallback a precios por defecto
    const defaultPrice = DEFAULT_PRICES[code];
    return defaultPrice ? defaultPrice.value : 0;
  };

  const getPriceWithUnit = (code: string): { value: number; unit: string | null } => {
    const priceData = prices[code];
    if (priceData) {
      return priceData;
    }
    // Fallback a precios por defecto
    const defaultPrice = DEFAULT_PRICES[code];
    return defaultPrice || { value: 0, unit: null };
  };

  const missing = isLoading || isError || !data ? [] : CODIGOS_NECESARIOS.filter((c) => !data[c]);

  return {
    prices,
    isLoading,
    isError,
    missing,
    getPrice,
    getPriceWithUnit,
  };
}

// Función helper para usar en componentes que no pueden usar hooks
export function getPriceFromMap(
  pricesMap: Record<string, { value: number; unit: string | null }>,
  code: string
): number {
  const priceData = pricesMap[code];
  if (priceData) {
    return priceData.value;
  }
  const defaultPrice = DEFAULT_PRICES[code];
  return defaultPrice ? defaultPrice.value : 0;
}
