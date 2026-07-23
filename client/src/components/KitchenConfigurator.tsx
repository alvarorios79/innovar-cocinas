import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChefHat, Refrigerator, UtensilsCrossed, Lightbulb, LayoutGrid, Paintbrush, Plus, Trash2, Sparkles } from "lucide-react";

export interface KitchenConfig {
  shape: string;
  layout?: string; // Forma física: L, U, lineal, cuadrada (informativo, no afecta precio)
  includeLower?: boolean; // Incluir muebles inferiores (default true)
  includeUpper?: boolean; // Incluir muebles superiores (default true)
  totalMeters: number;
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
  };
  bar: {
    enabled: boolean;
    meters: number;
    countertopType: string;
    hasLateral: boolean;
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
  // Módulos de cocina — para descripción automática de la cotización
  kitchenModules?: {
    esquinero1x1?: boolean;        // Esquinero inferior 1x1
    esquineroSuperior?: boolean;   // Esquinero superior
    cajoneroTriple?: boolean;      // Cajonero triple
    cajoneroDoble?: boolean;       // Cajonero doble
    basurero?: boolean;            // Basurero integrado
    moduloEstufaHorno?: boolean;   // Módulo estufa y horno
    moduloAlmacInf?: boolean;      // Módulo almacenamiento inferior
    moduloAlmacSup?: boolean;      // Módulo almacenamiento superior
    moduloExtractor?: boolean;     // Módulo extractor
    moduloMicroondas?: boolean;    // Módulo de microondas
    especiero?: boolean;           // Especiero
    botellero?: boolean;           // Botellero
    moduloRepisa?: boolean;        // Módulo repisa
    luzLed?: boolean;              // Luz LED
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
}

interface KitchenConfiguratorProps {
  config: KitchenConfig | null;
  onChange: (config: KitchenConfig) => void;
  includesFixedCosts: boolean;
  onFixedCostsChange: (includes: boolean, amount?: number) => void;
  fixedCostsAmount: number;
  totalPrice: number;
  // Precios de acabados especiales (desde configuración)
  precioAluminioVidrioM2?: number;
  precioBisagraPar?: number;
  precioLedMl?: number;
}

export function KitchenConfigurator({ 
  config, 
  onChange, 
  includesFixedCosts, 
  onFixedCostsChange, 
  fixedCostsAmount,
  totalPrice,
  precioAluminioVidrioM2 = 1200000,
  precioBisagraPar = 15000,
  precioLedMl = 180000
}: KitchenConfiguratorProps) {
  
  const defaultConfig: KitchenConfig = {
    shape: "",
    totalMeters: 0,
    specialModules: {
      nichoNevecon: false,
      nichoNevera: false,
      alacenaEntrepanos: false,
      alacenaHerraje: false,
      torreHornos: false,
    },
    countertop: {
      type: "",
      depthSurcharge: "none",
      incluyeLaterales: false,
      cantLaterales: 1,
      incluyeRegrueso: false,
      incluyeLavaplatos: false,
      lavaprecio: 130000,
    },
    island: {
      enabled: false,
      meters: 0,
      countertopType: "",
      hasLaterals: false,
    },
    bar: {
      enabled: false,
      meters: 0,
      countertopType: "",
      hasLateral: false,
    },
    ledLighting: 0,
    paintedDoors: {
      enabled: false,
      upperQty: 0,
      lowerQty: 0,
      pantryQty: 0,
      drawerQty: 0,
      spiceQty: 0,
      golaQty: 0,
    },
    specialFinishes: {
      enabled: false,
      aluminumGlassDoors: [],
      ledLighting: {
        enabled: false,
        meters: 0,
      },
    },
    kitchenModules: {
      esquinero1x1: false,
      esquineroSuperior: false,
      cajoneroTriple: false,
      cajoneroDoble: false,
      basurero: false,
      moduloEstufaHorno: false,
      moduloAlmacInf: false,
      moduloAlmacSup: false,
      moduloExtractor: false,
      moduloMicroondas: false,
      especiero: false,
      botellero: false,
      moduloRepisa: false,
      luzLed: false,
    },
    notes: "",
  };

  const currentConfig = config || defaultConfig;

  const updateConfig = (field: string, value: any) => {
    const newConfig = { ...currentConfig };
    
    if (field.includes('.')) {
      const parts = field.split('.');
      let obj: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof obj[parts[i]] === 'object') {
          obj[parts[i]] = { ...obj[parts[i]] };
        }
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    } else {
      (newConfig as any)[field] = value;
    }
    
    onChange(newConfig);
  };

  // Calcular metraje resultante
  const calculateResultingMeters = () => {
    let deductions = 0;
    if (currentConfig.specialModules.nichoNevecon) deductions += 1.0;
    if (currentConfig.specialModules.nichoNevera) deductions += 0.75;
    if (currentConfig.specialModules.alacenaEntrepanos) deductions += 0.5;
    if (currentConfig.specialModules.alacenaHerraje) deductions += 0.5;
    if (currentConfig.specialModules.torreHornos) deductions += 0.7;
    return Math.max(0, currentConfig.totalMeters - deductions);
  };

  const resultingMeters = calculateResultingMeters();

  return (
    <Card className="mt-4 border-emerald-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-200">
          <ChefHat className="h-5 w-5 text-emerald-400" />
          <h4 className="font-bold text-emerald-300 text-lg">Configuración de Cocina Integral</h4>
        </div>

        <div className="space-y-6">
          {/* Dimensiones */}
          <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-200">
            <h5 className="font-semibold text-emerald-300 mb-3">Dimensiones del Proyecto</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de Cocina</Label>
                <Select
                  value={currentConfig.shape}
                  onValueChange={(value) => updateConfig("shape", value)}
                >
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estandar">Cocina Estándar</SelectItem>
                    <SelectItem value="premium">Cocina Premium</SelectItem>
                    <SelectItem value="deluxe">Cocina Deluxe</SelectItem>
                    <SelectItem value="frente_pll">Frente / PLL</SelectItem>
                    <SelectItem value="solo_superiores">Solo muebles superiores</SelectItem>
                    <SelectItem value="solo_inferiores">Solo muebles inferiores</SelectItem>
                    <SelectItem value="puertas_tapas">Puertas y tapas (solo cambio)</SelectItem>
                    <SelectItem value="solo_acabados">Solo acabados especiales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Forma de la Cocina</Label>
                <Select
                  value={currentConfig.layout || ""}
                  onValueChange={(value) => updateConfig("layout", value)}
                >
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue placeholder="Selecciona la forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">En L</SelectItem>
                    <SelectItem value="U">En U</SelectItem>
                    <SelectItem value="lineal">Lineal / Recta</SelectItem>
                    <SelectItem value="cuadrada">Cuadrada / Paralela</SelectItem>
                    <SelectItem value="isla">Con isla central</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Módulos incluidos — solo para cocinas completas */}
            {!['puertas_tapas', 'solo_acabados', 'solo_superiores', 'solo_inferiores', 'frente_pll'].includes(currentConfig.shape || '') && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-white/60 block mb-2">Módulos incluidos</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.includeLower !== false}
                    onChange={(e) => updateConfig("includeLower", e.target.checked)}
                    className="h-4 w-4 accent-[#00BCD4]"
                  />
                  Muebles Inferiores
                </label>
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.includeUpper !== false}
                    onChange={(e) => updateConfig("includeUpper", e.target.checked)}
                    className="h-4 w-4 accent-[#00BCD4]"
                  />
                  Muebles Superiores
                </label>
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Metraje Total (ml)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.totalMeters || ""}
                  onChange={(e) => updateConfig("totalMeters", parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 5.00"
                  className="h-10 bg-[#162828]"
                />
              </div>
            </div>
            <div className="mt-3 p-3 bg-emerald-500/15 rounded">
              <p className="text-sm text-emerald-300">
                <strong>Metraje resultante:</strong> {resultingMeters.toFixed(2)} ml
              </p>
              <p className="text-xs text-emerald-400 mt-1">
                {currentConfig.includeLower !== false && `Muebles Inferiores: ${resultingMeters.toFixed(2)} ml`}{currentConfig.includeLower !== false && currentConfig.includeUpper !== false && ' | '}{currentConfig.includeUpper !== false && `Muebles Superiores: ${resultingMeters.toFixed(2)} ml`}
              </p>
            </div>
          </div>

          {/* Muebles Especiales */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <h5 className="font-semibold text-white/85 mb-3">Muebles Especiales (se descuentan del metraje)</h5>
            
            <div className="space-y-3">
              {/* Nicho Nevecon */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="nicho-nevecon" 
                    checked={currentConfig.specialModules.nichoNevecon} 
                    onCheckedChange={(c) => updateConfig("specialModules.nichoNevecon", c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Refrigerator className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="nicho-nevecon" className="cursor-pointer font-medium">
                      Nicho para nevecon (100cm)
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${currentConfig.specialModules.nichoNevecon ? 'text-emerald-300' : 'text-gray-400'}`}>
                  $1,200,000
                </span>
              </div>

              {/* Nicho Nevera */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="nicho-nevera" 
                    checked={currentConfig.specialModules.nichoNevera} 
                    onCheckedChange={(c) => updateConfig("specialModules.nichoNevera", c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Refrigerator className="h-4 w-4 text-blue-400" />
                    <Label htmlFor="nicho-nevera" className="cursor-pointer font-medium">
                      Nicho para nevera estándar (75cm)
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${currentConfig.specialModules.nichoNevera ? 'text-emerald-300' : 'text-gray-400'}`}>
                  $1,200,000
                </span>
              </div>

              {/* Alacena Entrepaños */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="alacena-entrepanos" 
                    checked={currentConfig.specialModules.alacenaEntrepanos} 
                    onCheckedChange={(c) => updateConfig("specialModules.alacenaEntrepanos", c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="alacena-entrepanos" className="cursor-pointer font-medium">
                      Alacena con entrepaños (50cm)
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${currentConfig.specialModules.alacenaEntrepanos ? 'text-emerald-300' : 'text-gray-400'}`}>
                  $1,250,000
                </span>
              </div>

              {/* Alacena Herraje */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="alacena-herraje" 
                    checked={currentConfig.specialModules.alacenaHerraje} 
                    onCheckedChange={(c) => updateConfig("specialModules.alacenaHerraje", c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-orange-500" />
                    <Label htmlFor="alacena-herraje" className="cursor-pointer font-medium">
                      Alacena para herraje (50cm)
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${currentConfig.specialModules.alacenaHerraje ? 'text-emerald-300' : 'text-gray-400'}`}>
                  $900,000
                </span>
              </div>

              {/* Torre de Hornos */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="torre-hornos" 
                    checked={currentConfig.specialModules.torreHornos} 
                    onCheckedChange={(c) => updateConfig("specialModules.torreHornos", c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-red-500" />
                    <Label htmlFor="torre-hornos" className="cursor-pointer font-medium">
                      Torre de hornos (70cm)
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${currentConfig.specialModules.torreHornos ? 'text-emerald-300' : 'text-gray-400'}`}>
                  $1,350,000
                </span>
              </div>
            </div>
          </div>

          {/* Módulos de Cocina — checklist descriptivo */}
          <div className="bg-teal-500/10 p-4 rounded-lg border border-teal-500/25">
            <h5 className="font-semibold text-teal-300 mb-1">Módulos de Cocina (para descripción)</h5>
            <p className="text-xs text-teal-400 mb-3">Selecciona los módulos que lleva esta cocina — se usan para generar la descripción automática de la cotización.</p>

            <div className="space-y-4">
              {/* Módulos Superiores */}
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Módulos superiores</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: "esquineroSuperior",  label: "Esquinero superior" },
                    { key: "moduloAlmacSup",     label: "Módulo almacenamiento sup." },
                    { key: "moduloExtractor",    label: "Módulo extractor" },
                    { key: "moduloMicroondas",   label: "Módulo de microondas" },
                    { key: "especiero",          label: "Especiero" },
                    { key: "botellero",          label: "Botellero" },
                    { key: "moduloRepisa",       label: "Módulo repisa" },
                    { key: "luzLed",             label: "Luz LED" },
                  ] as { key: keyof NonNullable<KitchenConfig["kitchenModules"]>; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-[#162828] rounded border border-teal-100 hover:border-teal-300 transition-colors">
                      <Checkbox
                        id={`km-sup-${key}`}
                        checked={currentConfig.kitchenModules?.[key] ?? false}
                        onCheckedChange={(c) => updateConfig(`kitchenModules.${key}`, c === true)}
                      />
                      <Label htmlFor={`km-sup-${key}`} className="cursor-pointer text-sm text-white/85">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Módulos Inferiores */}
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Módulos inferiores</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: "esquinero1x1",       label: "Esquinero 1×1 inferior" },
                    { key: "cajoneroTriple",     label: "Cajonero triple" },
                    { key: "cajoneroDoble",      label: "Cajonero doble" },
                    { key: "basurero",           label: "Basurero integrado" },
                    { key: "moduloEstufaHorno",  label: "Módulo estufa y horno" },
                    { key: "moduloAlmacInf",     label: "Módulo almacenamiento inf." },
                  ] as { key: keyof NonNullable<KitchenConfig["kitchenModules"]>; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-[#162828] rounded border border-teal-100 hover:border-teal-300 transition-colors">
                      <Checkbox
                        id={`km-inf-${key}`}
                        checked={currentConfig.kitchenModules?.[key] ?? false}
                        onCheckedChange={(c) => updateConfig(`kitchenModules.${key}`, c === true)}
                      />
                      <Label htmlFor={`km-inf-${key}`} className="cursor-pointer text-sm text-white/85">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mesón Principal */}
          <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-200">
            <h5 className="font-semibold text-emerald-300 mb-3">Mesón Principal</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de Mesón *</Label>
                <Select 
                  value={currentConfig.countertop.type} 
                  onValueChange={(value) => updateConfig("countertop.type", value)}
                >
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="granito">Granito ($700k/ml)</SelectItem>
                    <SelectItem value="quarzone">Quarzone ($850k/ml)</SelectItem>
                    <SelectItem value="sinterizado">Sinterizado ($1.2M/ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Recargo por Fondo</Label>
                <Select 
                  value={currentConfig.countertop.depthSurcharge} 
                  onValueChange={(value) => updateConfig("countertop.depthSurcharge", value)}
                >
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin recargo (≤60cm)</SelectItem>
                    <SelectItem value="30percent">+30% fondo (61-90cm)</SelectItem>
                    <SelectItem value="double">×2 fondo (91-120cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info metros mesón */}
            {currentConfig.countertop.type && (
              <div className="mt-3 p-2 bg-emerald-900/40 rounded text-xs text-emerald-300 flex flex-wrap gap-2">
                <span>Metros mesón: <strong>{resultingMeters.toFixed(2)} ml</strong></span>
                {currentConfig.countertop.incluyeLaterales && (
                  <span className="text-white/60">+ {((currentConfig.countertop.cantLaterales || 1) * 0.9).toFixed(2)} ml lateral{(currentConfig.countertop.cantLaterales || 1) > 1 ? 'es' : ''}</span>
                )}
                {currentConfig.countertop.incluyeRegrueso && (
                  <span className="text-white/60">+ 0.90 ml regrueso</span>
                )}
                {currentConfig.countertop.depthSurcharge === '30percent' && (
                  <span className="text-amber-300">· +30% por fondo</span>
                )}
                {currentConfig.countertop.depthSurcharge === 'double' && (
                  <span className="text-amber-300">· ×2 por fondo</span>
                )}
              </div>
            )}

            {/* Laterales, regrueso, lavaplatos */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Checkbox
                  id="meson-laterales"
                  checked={currentConfig.countertop.incluyeLaterales ?? false}
                  onCheckedChange={(c) => updateConfig("countertop.incluyeLaterales", c === true)}
                />
                <Label htmlFor="meson-laterales" className="cursor-pointer text-sm">Laterales (+0.90ml c/u)</Label>
                {currentConfig.countertop.incluyeLaterales && (
                  <>
                    <Input
                      type="number" min="1" max="4" step="1"
                      value={currentConfig.countertop.cantLaterales || 1}
                      onChange={(e) => updateConfig("countertop.cantLaterales", parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-center bg-[#162828]"
                    />
                    <span className="text-xs text-white/50">ud.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="meson-regrueso"
                  checked={currentConfig.countertop.incluyeRegrueso ?? false}
                  onCheckedChange={(c) => updateConfig("countertop.incluyeRegrueso", c === true)}
                />
                <Label htmlFor="meson-regrueso" className="cursor-pointer text-sm">Regrueso (+0.90ml)</Label>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Checkbox
                  id="meson-lavaplatos"
                  checked={currentConfig.countertop.incluyeLavaplatos ?? false}
                  onCheckedChange={(c) => updateConfig("countertop.incluyeLavaplatos", c === true)}
                />
                <Label htmlFor="meson-lavaplatos" className="cursor-pointer text-sm">Lavaplatos y pegado</Label>
                {currentConfig.countertop.incluyeLavaplatos && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/50">$</span>
                    <Input
                      type="number" step="1000" min="0"
                      value={currentConfig.countertop.lavaprecio ?? 130000}
                      onChange={(e) => updateConfig("countertop.lavaprecio", parseInt(e.target.value) || 130000)}
                      className="h-8 w-32 bg-[#162828]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Isla */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="isla-enabled" 
                  checked={currentConfig.island.enabled} 
                  onCheckedChange={(c) => updateConfig("island.enabled", c === true)} 
                />
                <Label htmlFor="isla-enabled" className="cursor-pointer font-semibold text-white/85">
                  Incluir Isla
                </Label>
              </div>
            </div>
            
            {currentConfig.island.enabled && (
              <div className="space-y-4 mt-3 pt-3 border-t border-[rgba(106,207,199,0.12)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-white/85 block mb-2">Metros lineales de isla</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.island.meters || ""}
                      onChange={(e) => updateConfig("island.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-10 bg-[#162828]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.island.countertopType} 
                      onValueChange={(value) => updateConfig("island.countertopType", value)}
                    >
                      <SelectTrigger className="h-10 bg-[#162828]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="granito">Granito</SelectItem>
                        <SelectItem value="quarzone">Quarzone</SelectItem>
                        <SelectItem value="sinterizado">Sinterizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="isla-laterales" 
                    checked={currentConfig.island.hasLaterals} 
                    onCheckedChange={(c) => updateConfig("island.hasLaterals", c === true)} 
                  />
                  <Label htmlFor="isla-laterales" className="cursor-pointer text-sm">
                    Incluir laterales (+0.90ml × 2 lados)
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Barra */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="barra-enabled" 
                  checked={currentConfig.bar.enabled} 
                  onCheckedChange={(c) => updateConfig("bar.enabled", c === true)} 
                />
                <Label htmlFor="barra-enabled" className="cursor-pointer font-semibold text-white/85">
                  Incluir Barra
                </Label>
              </div>
            </div>
            
            {currentConfig.bar.enabled && (
              <div className="space-y-4 mt-3 pt-3 border-t border-[rgba(106,207,199,0.12)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-white/85 block mb-2">Metros lineales de barra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.bar.meters || ""}
                      onChange={(e) => updateConfig("bar.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-10 bg-[#162828]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.bar.countertopType} 
                      onValueChange={(value) => updateConfig("bar.countertopType", value)}
                    >
                      <SelectTrigger className="h-10 bg-[#162828]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="granito">Granito</SelectItem>
                        <SelectItem value="quarzone">Quarzone</SelectItem>
                        <SelectItem value="sinterizado">Sinterizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="barra-lateral" 
                    checked={currentConfig.bar.hasLateral} 
                    onCheckedChange={(c) => updateConfig("bar.hasLateral", c === true)} 
                  />
                  <Label htmlFor="barra-lateral" className="cursor-pointer text-sm">
                    Incluir lateral (+0.90ml fijo)
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Luz LED */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <div>
                  <Label className="font-medium">Iluminación LED</Label>
                  <p className="text-xs text-white/45">$180,000 por metro lineal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.ledLighting || ""}
                  onChange={(e) => updateConfig("ledLighting", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9 w-24 text-right bg-[#162828]"
                />
                <span className="text-sm text-white/60">ml</span>
              </div>
            </div>
          </div>

          {/* Pintado Puertas Alto Brillo */}
          <div className="bg-pink-500/10 p-4 rounded-lg border border-pink-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="painted-doors-enabled" 
                  checked={currentConfig.paintedDoors?.enabled || false} 
                  onCheckedChange={(c) => updateConfig("paintedDoors.enabled", c === true)} 
                />
                <div className="flex items-center gap-2">
                  <Paintbrush className="h-4 w-4 text-pink-400" />
                  <Label htmlFor="painted-doors-enabled" className="cursor-pointer font-semibold text-pink-300">
                    Pintado Puertas Alto Brillo
                  </Label>
                </div>
              </div>
            </div>
            
            {currentConfig.paintedDoors?.enabled && (
              <div className="space-y-3 mt-3 pt-3 border-t border-pink-200">
                <p className="text-xs text-pink-400 mb-2">Ingrese la cantidad de cada tipo de puerta</p>
                
                {/* Puertas Superiores */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas Superiores</Label>
                    <p className="text-xs text-white/45">$120,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.upperQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.upperQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.upperQty || 0) * 120000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Puertas Inferiores */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas Inferiores</Label>
                    <p className="text-xs text-white/45">$150,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.lowerQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.lowerQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.lowerQty || 0) * 150000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Puertas de Alacena */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas de Alacena</Label>
                    <p className="text-xs text-white/45">$250,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.pantryQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.pantryQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.pantryQty || 0) * 250000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapas de Cajón */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapas de Cajón</Label>
                    <p className="text-xs text-white/45">$80,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.drawerQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.drawerQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.drawerQty || 0) * 80000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapa de Especiero */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapa de Especiero</Label>
                    <p className="text-xs text-white/45">$100,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.spiceQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.spiceQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.spiceQty || 0) * 100000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapas Pequeña/Gola */}
                <div className="flex items-center justify-between p-2 bg-[#162828] rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapas Pequeña/Gola</Label>
                    <p className="text-xs text-white/45">$45,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.golaQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.golaQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-[#162828]"
                    />
                    <span className="text-sm text-pink-300 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.golaQty || 0) * 45000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Total Pintado */}
                <div className="flex items-center justify-between p-2 bg-pink-500/15 rounded border border-pink-300 mt-2">
                  <Label className="text-sm font-bold text-pink-200">Total Pintado Alto Brillo:</Label>
                  <span className="text-lg font-bold text-pink-200">
                    ${((
                      (currentConfig.paintedDoors?.upperQty || 0) * 120000 +
                      (currentConfig.paintedDoors?.lowerQty || 0) * 150000 +
                      (currentConfig.paintedDoors?.pantryQty || 0) * 250000 +
                      (currentConfig.paintedDoors?.drawerQty || 0) * 80000 +
                      (currentConfig.paintedDoors?.spiceQty || 0) * 100000 +
                      (currentConfig.paintedDoors?.golaQty || 0) * 45000
                    )).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Transporte e Imprevistos */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="kitchen-transport" 
                  checked={includesFixedCosts} 
                  onCheckedChange={(c) => onFixedCostsChange(c === true)} 
                />
                <Label htmlFor="kitchen-transport" className="cursor-pointer font-medium">
                  Incluir Transporte e Imprevistos
                </Label>
              </div>
              {includesFixedCosts && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Monto: $</span>
                  <Input 
                    type="number" 
                    value={fixedCostsAmount} 
                    onChange={(e) => onFixedCostsChange(true, parseFloat(e.target.value) || 0)} 
                    className="h-9 w-32 text-right bg-[#162828]" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Acabados Especiales */}
          <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-300">
            <div className="flex items-center gap-3 mb-4">
              <Checkbox 
                id="special-finishes" 
                checked={currentConfig.specialFinishes?.enabled || false} 
                onCheckedChange={(c) => {
                  const newSpecialFinishes = {
                    ...currentConfig.specialFinishes,
                    enabled: c === true,
                    aluminumGlassDoors: currentConfig.specialFinishes?.aluminumGlassDoors || [],
                    ledLighting: currentConfig.specialFinishes?.ledLighting || { enabled: false, meters: 0 },
                  };
                  updateConfig("specialFinishes", newSpecialFinishes);
                }} 
              />
              <Label htmlFor="special-finishes" className="cursor-pointer font-semibold text-amber-300 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Acabados Especiales (Puertas Aluminio + Vidrio)
              </Label>
            </div>
            
            {currentConfig.specialFinishes?.enabled && (
              <div className="space-y-4 pl-6">
                {/* Lista de Puertas de Aluminio + Vidrio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-amber-300">Puertas en Marco de Aluminio + Vidrio Ahumado</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400 text-amber-300 hover:bg-amber-500/15"
                      onClick={() => {
                        const newDoor = {
                          id: `door-${Date.now()}`,
                          height: 0,
                          width: 0,
                          squareMeters: 0,
                          extraHinges: 0,
                        };
                        const newDoors = [...(currentConfig.specialFinishes?.aluminumGlassDoors || []), newDoor];
                        updateConfig("specialFinishes", {
                          ...currentConfig.specialFinishes,
                          aluminumGlassDoors: newDoors,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar Puerta
                    </Button>
                  </div>
                  
                  {(currentConfig.specialFinishes?.aluminumGlassDoors || []).length === 0 ? (
                    <p className="text-sm text-amber-400 italic">No hay puertas agregadas. Haz clic en "Agregar Puerta" para comenzar.</p>
                  ) : (
                    <div className="space-y-2">
                      {(currentConfig.specialFinishes?.aluminumGlassDoors || []).map((door, index) => {
                        const sqm = door.height * door.width;
                        const extraHinges = door.height <= 0.8 ? 1 : (door.height <= 1.4 ? 2 : 3);
                        const doorPrice = sqm * precioAluminioVidrioM2;
                        const hingePrice = extraHinges * precioBisagraPar;
                        const totalDoorPrice = doorPrice + hingePrice;
                        
                        return (
                          <div key={door.id} className="flex items-center gap-2 bg-[#162828] p-2 rounded border border-amber-500/25">
                            <span className="text-sm font-medium text-amber-300 w-16">Puerta {index + 1}:</span>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-white/45">Alto:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={door.height || ""}
                                onChange={(e) => {
                                  const newDoors = [...(currentConfig.specialFinishes?.aluminumGlassDoors || [])];
                                  const newHeight = parseFloat(e.target.value) || 0;
                                  newDoors[index] = {
                                    ...newDoors[index],
                                    height: newHeight,
                                    squareMeters: newHeight * newDoors[index].width,
                                    extraHinges: newHeight <= 0.8 ? 1 : (newHeight <= 1.4 ? 2 : 3),
                                  };
                                  updateConfig("specialFinishes", {
                                    ...currentConfig.specialFinishes,
                                    aluminumGlassDoors: newDoors,
                                  });
                                }}
                                className="h-8 w-20 text-center"
                                placeholder="0.70"
                              />
                              <span className="text-xs">m</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-white/45">Ancho:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={door.width || ""}
                                onChange={(e) => {
                                  const newDoors = [...(currentConfig.specialFinishes?.aluminumGlassDoors || [])];
                                  const newWidth = parseFloat(e.target.value) || 0;
                                  newDoors[index] = {
                                    ...newDoors[index],
                                    width: newWidth,
                                    squareMeters: newDoors[index].height * newWidth,
                                  };
                                  updateConfig("specialFinishes", {
                                    ...currentConfig.specialFinishes,
                                    aluminumGlassDoors: newDoors,
                                  });
                                }}
                                className="h-8 w-20 text-center"
                                placeholder="0.40"
                              />
                              <span className="text-xs">m</span>
                            </div>
                            <div className="flex-1 text-right text-sm">
                              <span className="text-amber-300">{sqm.toFixed(2)} m²</span>
                              {extraHinges > 0 && (
                                <span className="text-orange-400 ml-2">+{extraHinges} par bisagras</span>
                              )}
                              <span className="font-semibold text-amber-300 ml-2">${totalDoorPrice.toLocaleString()}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                              onClick={() => {
                                const newDoors = (currentConfig.specialFinishes?.aluminumGlassDoors || []).filter((_, i) => i !== index);
                                updateConfig("specialFinishes", {
                                  ...currentConfig.specialFinishes,
                                  aluminumGlassDoors: newDoors,
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      
                      {/* Subtotal Puertas */}
                      {(currentConfig.specialFinishes?.aluminumGlassDoors || []).length > 0 && (
                        <div className="flex justify-between items-center pt-2 border-t border-amber-500/25">
                          <span className="text-sm text-amber-300">Subtotal Puertas Aluminio + Vidrio:</span>
                          <span className="font-semibold text-amber-300">
                            ${(currentConfig.specialFinishes?.aluminumGlassDoors || []).reduce((sum, door) => {
                              const sqm = door.height * door.width;
                              const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
                              return sum + (sqm * precioAluminioVidrioM2) + (extraHinges * precioBisagraPar);
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Luz LED para Alacenas */}
                <div className="border-t border-amber-500/25 pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox 
                      id="led-alacenas" 
                      checked={currentConfig.specialFinishes?.ledLighting?.enabled || false} 
                      onCheckedChange={(c) => {
                        updateConfig("specialFinishes", {
                          ...currentConfig.specialFinishes,
                          ledLighting: {
                            ...currentConfig.specialFinishes?.ledLighting,
                            enabled: c === true,
                          },
                        });
                      }} 
                    />
                    <Label htmlFor="led-alacenas" className="cursor-pointer text-sm font-medium text-amber-300 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Luz LED para Alacenas ($180,000/ml)
                    </Label>
                  </div>
                  
                  {currentConfig.specialFinishes?.ledLighting?.enabled && (
                    <div className="flex items-center gap-3 pl-6">
                      <Label className="text-sm text-white/60">Metros lineales (lado largo del mueble):</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentConfig.specialFinishes?.ledLighting?.meters || ""}
                        onChange={(e) => {
                          updateConfig("specialFinishes", {
                            ...currentConfig.specialFinishes,
                            ledLighting: {
                              ...currentConfig.specialFinishes?.ledLighting,
                              meters: parseFloat(e.target.value) || 0,
                            },
                          });
                        }}
                        className="h-8 w-24 text-center"
                        placeholder="0.00"
                      />
                      <span className="text-sm">ml</span>
                      <span className="font-semibold text-amber-300">
                        = ${((currentConfig.specialFinishes?.ledLighting?.meters || 0) * precioLedMl).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Total Acabados Especiales */}
                <div className="bg-amber-500/15 p-3 rounded-lg mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-amber-300">Total Acabados Especiales:</span>
                    <span className="text-xl font-bold text-amber-300">
                      ${(
                       (currentConfig.specialFinishes?.aluminumGlassDoors || []).reduce((sum, door) => {
                       const sqm = door.height * door.width;
                       const extraHinges = door.height <= 0.8 ? 1 : (door.height <= 1.4 ? 2 : 3);
                       return sum + (sqm * precioAluminioVidrioM2) + (extraHinges * precioBisagraPar);
                        }, 0) +
                        (currentConfig.specialFinishes?.ledLighting?.enabled ? (currentConfig.specialFinishes?.ledLighting?.meters || 0) * precioLedMl : 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas Adicionales</Label>
            <Textarea
              value={currentConfig.notes || ""}
              onChange={(e) => updateConfig("notes", e.target.value)}
              placeholder="Especificaciones adicionales, colores, acabados..."
              className="bg-[#162828]"
              rows={2}
            />
          </div>

          {/* Resumen Total */}
          <div className="bg-emerald-200 p-4 rounded-lg border border-emerald-400">
            <h5 className="font-semibold text-emerald-300 mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cocina {currentConfig.shape || "---"} - {resultingMeters.toFixed(2)}ml:</span>
                <span className="font-medium">Calculado</span>
              </div>
              {currentConfig.specialModules.nichoNevecon && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Nicho nevecon:</span>
                  <span className="font-medium">$1,200,000</span>
                </div>
              )}
              {currentConfig.specialModules.nichoNevera && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Nicho nevera:</span>
                  <span className="font-medium">$1,200,000</span>
                </div>
              )}
              {currentConfig.specialModules.alacenaEntrepanos && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Alacena entrepaños:</span>
                  <span className="font-medium">$1,250,000</span>
                </div>
              )}
              {currentConfig.specialModules.alacenaHerraje && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Alacena herraje:</span>
                  <span className="font-medium">$900,000</span>
                </div>
              )}
              {currentConfig.specialModules.torreHornos && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Torre de hornos:</span>
                  <span className="font-medium">$1,350,000</span>
                </div>
              )}
              {currentConfig.island.enabled && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Isla ({currentConfig.island.meters}ml):</span>
                  <span className="font-medium">Incluido</span>
                </div>
              )}
              {currentConfig.bar.enabled && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Barra ({currentConfig.bar.meters}ml):</span>
                  <span className="font-medium">Incluido</span>
                </div>
              )}
              {currentConfig.ledLighting > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ LED ({currentConfig.ledLighting}ml × $180,000):</span>
                  <span className="font-medium">${(currentConfig.ledLighting * precioLedMl).toLocaleString()}</span>
                </div>
              )}
              {currentConfig.paintedDoors?.enabled && (
                <div className="flex justify-between text-pink-300">
                  <span>+ Pintado Alto Brillo:</span>
                  <span className="font-medium">
                    ${((
                      (currentConfig.paintedDoors?.upperQty || 0) * 120000 +
                      (currentConfig.paintedDoors?.lowerQty || 0) * 150000 +
                      (currentConfig.paintedDoors?.pantryQty || 0) * 250000 +
                      (currentConfig.paintedDoors?.drawerQty || 0) * 80000 +
                      (currentConfig.paintedDoors?.spiceQty || 0) * 100000 +
                      (currentConfig.paintedDoors?.golaQty || 0) * 45000
                    )).toLocaleString()}
                  </span>
                </div>
              )}
              {currentConfig.specialFinishes?.enabled && (currentConfig.specialFinishes?.aluminumGlassDoors || []).length > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>+ Puertas Aluminio+Vidrio ({(currentConfig.specialFinishes?.aluminumGlassDoors || []).length}):</span>
                  <span className="font-medium">
                    ${(currentConfig.specialFinishes?.aluminumGlassDoors || []).reduce((sum, door) => {
                      const sqm = door.height * door.width;
                      const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
                      return sum + (sqm * precioAluminioVidrioM2) + (extraHinges * precioBisagraPar);
                    }, 0).toLocaleString()}
                  </span>
                </div>
              )}
              {currentConfig.specialFinishes?.enabled && currentConfig.specialFinishes?.ledLighting?.enabled && (currentConfig.specialFinishes?.ledLighting?.meters || 0) > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>+ LED Alacenas ({currentConfig.specialFinishes?.ledLighting?.meters}ml):</span>
                  <span className="font-medium">
                    ${((currentConfig.specialFinishes?.ledLighting?.meters || 0) * precioLedMl).toLocaleString()}
                  </span>
                </div>
              )}
              {includesFixedCosts && (
                <div className="flex justify-between text-emerald-300">
                  <span>+ Transporte e imprevistos:</span>
                  <span className="font-medium">${fixedCostsAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-emerald-400 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-emerald-300">TOTAL COCINA:</span>
                <span className="text-2xl font-bold text-emerald-300">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
