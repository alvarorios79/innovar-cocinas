import { trpc } from "@/lib/trpc";

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
  MESON_GRANITO:        { value: 700000,  unit: "ml" },
  MESON_CUARZO:         { value: 850000,  unit: "ml" },
  MESON_SINTERIZADO:    { value: 1200000, unit: "ml" },
  MESON_ACERO:          { value: 800000,  unit: "ml" },
  MESON_RECARGO_FONDO:  { value: 30,      unit: "%" },   // +30% fondo 61-90cm; ×2 fondo 91-120cm

  // Mesones — fondo angosto (ítem independiente de meson)
  MESON_GRANITO_ANGOSTA:     { value: 490000,  unit: "ml" },
  MESON_CUARZO_ANGOSTA:      { value: 600000,  unit: "ml" },
  MESON_SINTERIZADO_ANGOSTA: { value: 1000000, unit: "ml" },

  // Extras de mesón
  LAVAPLATOS_MESON:     { value: 130000,  unit: "unidad" },

  // Muebles Especiales (descuentan metros lineales al precio base)
  NICHO_NEVECON:        { value: 1200000, unit: "unidad" }, // descuenta 1.0 ml
  NICHO_NEVERA:         { value: 1100000, unit: "unidad" }, // descuenta 0.75 ml
  ALACENA_ENTREPANOS:   { value: 1250000, unit: "unidad" }, // descuenta 0.5 ml
  ALACENA_HERRAJE:      { value: 900000,  unit: "unidad" }, // descuenta 0.5 ml
  TORRE_HORNOS:         { value: 1350000, unit: "unidad" }, // descuenta 0.7 ml

  // Extras
  ISLA_ML:              { value: 900000,  unit: "ml" },
  ISLA_LATERAL:         { value: 350000,  unit: "unidad" },
  BARRA_ML:             { value: 900000,  unit: "ml" },
  BARRA_LATERAL:        { value: 350000,  unit: "unidad" },
  LED_ML:               { value: 220000,  unit: "ml" },
  TRANSPORTE_IMPREVISTOS: { value: 600000, unit: "fijo" },

  // Puertas y Tapas (para cocinas)
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

  // Closets — precio por m²
  CLOSET_ESTANDAR_M2:   { value: 750000,  unit: "m2" },
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
  TV_CENTER_BASE:       { value: 2800000, unit: "unidad" }, // base 1.60m; +$500K c/20cm adicionales
  TV_CENTER_ALTO_BRILLO: { value: 350000, unit: "unidad" },
  TV_CENTER_LED:        { value: 220000,  unit: "ml" },
  TV_CENTER_REPISA:     { value: 100000,  unit: "unidad" },
  TV_CENTER_ESPACIO_EQUIPO: { value: 150000, unit: "unidad" },
  TV_CENTER_TRANSPORTE: { value: 150000,  unit: "unidad" },

  // Acabados Especiales
  ACABADO_ALUMINIO_VIDRIO_M2: { value: 1200000, unit: "m2" },
  ACABADO_BISAGRA_PAR:        { value: 15000,   unit: "par" },
  ACABADO_LED_ML:             { value: 150000,  unit: "ml" },

  // Descuentos internos (ml que descuentan módulos especiales)
  DESCUENTO_NICHO_ML:   { value: 1,   unit: "ml" },
  DESCUENTO_ALACENA_ML: { value: 0.5, unit: "ml" },
  DESCUENTO_TORRE_ML:   { value: 0.7, unit: "ml" },

};

export interface PricingData {
  prices: Record<string, { value: number; unit: string | null }>;
  isLoading: boolean;
  isError: boolean;
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

  return {
    prices,
    isLoading,
    isError,
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
