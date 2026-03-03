import { trpc } from "@/lib/trpc";

// Precios por defecto (fallback si no se cargan de la BD)
const DEFAULT_PRICES: Record<string, { value: number; unit: string | null }> = {
  // Cocina Base
  COCINA_ML_L: { value: 1800000, unit: "ml" },
  COCINA_ML_U: { value: 1800000, unit: "ml" },
  COCINA_ML_LINEAL: { value: 1800000, unit: "ml" },
  COCINA_ML_FRENTE_PLL: { value: 900000, unit: "ml" },
  COCINA_ML_SOLO_MUEBLES: { value: 900000, unit: "ml" },
  MUEBLE_SUPERIOR_ML: { value: 900000, unit: "ml" },
  MUEBLE_INFERIOR_ML: { value: 900000, unit: "ml" },
  
  // Mesones
  MESON_GRANITO: { value: 450000, unit: "ml" },
  MESON_CUARZO: { value: 650000, unit: "ml" },
  MESON_SINTERIZADO: { value: 1100000, unit: "ml" },
  MESON_ACERO: { value: 800000, unit: "ml" },
  MESON_RECARGO_FONDO: { value: 30, unit: "%" },
  
  // Muebles Especiales
  NICHO_NEVECON: { value: 1200000, unit: "unidad" },
  NICHO_NEVERA: { value: 1200000, unit: "unidad" },
  ALACENA_ENTREPANOS: { value: 1250000, unit: "unidad" },
  ALACENA_HERRAJE: { value: 900000, unit: "unidad" },
  TORRE_HORNOS: { value: 1350000, unit: "unidad" },
  
  // Extras
  ISLA_ML: { value: 900000, unit: "ml" },
  ISLA_LATERAL: { value: 350000, unit: "unidad" },
  BARRA_ML: { value: 900000, unit: "ml" },
  BARRA_LATERAL: { value: 350000, unit: "unidad" },
  LED_ML: { value: 180000, unit: "ml" },
  TRANSPORTE_IMPREVISTOS: { value: 600000, unit: "fijo" },
  
  // Puertas y Tapas
  PUERTA_SUP_70: { value: 120000, unit: "unidad" },
  PUERTA_SUP_90: { value: 150000, unit: "unidad" },
  PUERTA_SUP_100: { value: 180000, unit: "unidad" },
  PUERTA_INF: { value: 150000, unit: "unidad" },
  PUERTA_ALACENA: { value: 180000, unit: "unidad" },
  TAPA_CAJON: { value: 90000, unit: "unidad" },
  TAPA_PEQUENA: { value: 45000, unit: "unidad" },
  
  // Pintado Alto Brillo
  PINTADO_SUP: { value: 120000, unit: "unidad" },
  PINTADO_INF: { value: 150000, unit: "unidad" },
  PINTADO_ALACENA: { value: 250000, unit: "unidad" },
  PINTADO_CAJON: { value: 80000, unit: "unidad" },
  PINTADO_ESPECIERO: { value: 100000, unit: "unidad" },
  PINTADO_GOLA: { value: 45000, unit: "unidad" },
  
  // Closets
  CLOSET_ESTANDAR_M2: { value: 750000, unit: "m2" },
  CLOSET_ESPECIAL_M2: { value: 650000, unit: "m2" },
  CLOSET_EMPOTRADO_M2: { value: 900000, unit: "m2" },
  
  // Puertas (Producto)
  PUERTA_CORREDIZA_SENCILLA: { value: 890000, unit: "unidad" },
  PUERTA_CORREDIZA_DOBLE: { value: 1500000, unit: "unidad" },
  PUERTA_BATIENTE: { value: 750000, unit: "unidad" },
  
  // Centros de TV
  TV_CENTER_BASE: { value: 2800000, unit: "unidad" },
  TV_CENTER_ALTO_BRILLO: { value: 500000, unit: "unidad" },
  TV_CENTER_LED: { value: 180000, unit: "ml" },
  TV_CENTER_REPISA: { value: 150000, unit: "unidad" },
  TV_CENTER_TRANSPORTE: { value: 150000, unit: "unidad" },
  
  // Otros/Descuentos
  DESCUENTO_NICHO_ML: { value: 1, unit: "ml" },
  DESCUENTO_ALACENA_ML: { value: 0.5, unit: "ml" },
  DESCUENTO_TORRE_ML: { value: 0.7, unit: "ml" },
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
