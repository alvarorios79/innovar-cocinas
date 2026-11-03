// Tipo de datos de la configuración de cocina integral (se guarda en kitchenConfig de cada ítem de cotización).
// Separado del antiguo componente KitchenConfigurator.tsx (eliminado: no se usaba).

export interface KitchenConfig {
  shape: string;
  layout?: string; // Forma física: L, U, lineal, cuadrada (informativo, no afecta precio)
  includeLower?: boolean; // Incluir muebles inferiores (default true)
  includeUpper?: boolean; // Incluir muebles superiores (default true)
  totalMeters: number;
  independentMeters?: boolean;  // superiores e inferiores con metraje distinto
  upperMeters?: number;         // ML superiores (solo cuando independentMeters=true)
  lowerMeters?: number;         // ML inferiores (solo cuando independentMeters=true)
  specialModules: {
    nichoNevecon: boolean;
    nichoNevera: boolean;
    alacenaEntrepanos: boolean;
    alacenaHerraje: boolean;
    torreHornos: boolean;
  };
  countertop: {
    type: string;
    depthSurcharge: string;
    esImportado?: boolean;       // quarzo/sinterizado importado
    precioImportadoML?: number;  // precio/ml cuando es importado
    incluyeLaterales?: boolean;
    cantLaterales?: number;      // cuántos laterales (default 1)
    incluyeRegrueso?: boolean;
    incluyeLavaplatos?: boolean;
    lavaprecio?: number;         // precio lavaplatos (default 130000)
  };
  island: {
    enabled: boolean;
    meters: number;
    countertopType: string;
    hasLaterals: boolean;
    depthSurcharge?: string;       // none | 30percent | double
    esImportado?: boolean;
    precioImportadoML?: number;
    incluyeLateralesIsla?: boolean;
    incluyeRegrueso?: boolean;
    incluyeSalpicaderoAlto?: boolean;
    incluyeLavaplatos?: boolean;
    lavaprecio?: number;
    incluyeLedIsla?: boolean;
    ledMLIsla?: number;
    modulosDescriptivos?: {
      especiero?: boolean;
      botellero?: boolean;
      cajoneroTriple?: boolean;
      cajoneroDoble?: boolean;
      basurero?: boolean;
    };
  };
  bar: {
    enabled: boolean;
    meters: number;
    countertopType: string;
    hasLateral: boolean;
    barraAlturaLateral?: number;
    incluyePedestal?: boolean;
    incluyeHerraje?: boolean;
    esImportado?: boolean;
    precioImportadoML?: number;
  };
  ledLighting: number;
  includeUpperModule?: boolean; // Solo para Frente PLL - Módulo superior +$750,000/ml
  upperModuleMeters?: number; // Metraje separado para módulo superior en Frente PLL
  paintedDoors: {
    enabled: boolean;
    upperQty: number; // Puertas superiores - $120,000
    lowerQty: number; // Puertas inferiores - $150,000
    pantryQty: number; // Puertas de alacena - $250,000
    drawerQty: number; // Tapas de cajón - $80,000
    spiceQty: number; // Tapa de especiero - $100,000
    golaQty: number; // Tapas pequeña/gola - $45,000
  };
  // Módulos de cocina — descripción + ML consumido + piezas pintadas
  kitchenModules?: {
    // Superiores
    esquineroSuperior?: number;    // 0.60ml, 1 pta sup
    moduloAlmacSup?: number;       // 0.65ml, 2 ptas sup + 1 gola
    moduloExtractor?: number;      // 0.70ml
    moduloMicroondas?: number;     // 0.60ml
    especiero?: number;            // 0.25ml, 1 especiero + 1 gola
    botellero?: number;            // 0.35ml, 1 pta inf + 1 gola
    moduloRepisa?: number;         // 0.30ml
    // Inferiores
    esquinero1x1?: number;         // 1×1 (no descuenta ML), 2 ptas inf
    cajoneroTriple?: number;       // 0.70ml, 3 tapas cajón + 1 gola
    cajoneroDoble?: number;        // 0.60ml, 2 tapas cajón + 1 gola
    basurero?: number;             // 0.50ml, 1 pta inf + 1 gola
    moduloEstufaHorno?: number;    // 0.70ml, 1 pta inf + 1 gola
    moduloAlmacInf?: number;       // 0.70ml, 2 ptas inf + 1 gola
    // Laterales (no descuentan ML — solo piezas, cantidad por proyecto)
    lateralNichoNevera?: number;    // qty, sin piezas pintadas
    lateralMuebleSuperior?: number; // qty, 1 pta sup c/u
    lateralMuebleInferior?: number; // qty, 1 pta inf c/u
    luzLed?: boolean;
  };
  // Para forma "Puertas y Tapas (solo cambio)"
  doorsAndCovers?: {
    upperDoors70: number;   // Puertas superiores hasta 70cm - $120,000
    upperDoors90: number;   // Puertas superiores hasta 90cm - $150,000
    upperDoors100: number;  // Puertas superiores más de 100cm - $180,000
    lowerDoors: number;     // Puertas inferiores - $150,000
    pantryDoors: number;    // Puertas de alacena - $180,000
    drawerCovers: number;   // Tapas de cajón - $90,000
    smallCovers: number;    // Tapas pequeñas - $45,000
  };
  // Acabados Especiales
  specialFinishes?: {
    enabled: boolean;
    aluminumGlassDoors: Array<{
      id: string;
      height: number; // metros
      width: number;  // metros
      squareMeters: number; // calculado: height * width
      extraHinges: number; // calculado según altura: >0.8m = 1 par, >1.4m = 2 pares
    }>;
    ledLighting: {
      enabled: boolean;
      meters: number; // metros lineales del lado largo del mueble
    };
  };
  notes?: string;
  mlPriceCode?: string; // Código de precio guardado: COCINA_ML_ESTANDAR | COCINA_ML_PREMIUM | COCINA_ML_DELUXE
  // Especificaciones informativas (salen en PDF para el cliente)
  boardFinish?: string;
  interiorFinish?: string;
  hardware?: {
    bisagras?: 'estandar' | 'inox';
    rieles?: 'peso_alto' | 'cierre_lento';
  };
  incluyePlatero?: boolean;
  plateroDesc?: string;
  appliances?: {
    estufa: boolean;
    horno: boolean;
    extractor: boolean;
    llaveLavaplatos: boolean;
    nevera: boolean;
    microondas: boolean;
    lavaVajillas: boolean;
  };
}
