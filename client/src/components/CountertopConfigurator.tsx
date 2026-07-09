import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/formatters";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Layers, Calculator, Plus, Trash2 } from "lucide-react";

// Precios base
const BASE_PRICES = {
  quarzo: {
    standard: 850000,
    barraAngosta: 600000,
  },
  sinterizado: {
    standard: 1200000,
    barraAngosta: 1000000,
  },
};

// Constantes
const LAVAPLATOS_COST = 130000; // Solo aplica para mesón estándar
const ISLA_LATERALES_ML = 1.8;
const ISLA_REGRUESO_ML = 0.9;

// Configuración de un sub-mesón individual
export interface SubMesonConfig {
  id: string;
  material: "quarzo" | "sinterizado";
  tipo: "meson" | "isla" | "barra";
  metrosLineales: number;
  fondo: number;
  precioML: number;
  // Isla
  incluyeLaterales: boolean;
  incluyeRegrueso: boolean;
  // Barra
  alturaLateral: number; // 0, 90, 100, 110
  // Salpicadero alto (duplica metraje)
  incluyeSalpicaderoAlto: boolean;
  // Calculados
  subtotalMeson: number;
  subtotalLaterales: number;
  subtotalRegrueso: number;
  subtotalLavaplatos: number;
  subtotalSalpicaderoAlto: number;
  subtotal: number;
}

// Configuración principal que contiene múltiples mesones
export interface CountertopConfig {
  mesones: SubMesonConfig[];
  total: number;
  // Extras globales
  notes: string;
  includeTransport: boolean;
  transportCost: number;
}

interface CountertopConfiguratorProps {
  config: CountertopConfig;
  onChange: (config: CountertopConfig) => void;
}

// Crear un nuevo sub-mesón con valores por defecto
function createDefaultSubMeson(tipo: "meson" | "isla" | "barra" = "meson"): SubMesonConfig {
  const id = `meson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    material: "quarzo",
    tipo,
    metrosLineales: 1,
    fondo: 60,
    precioML: BASE_PRICES.quarzo.standard,
    incluyeLaterales: tipo === "isla",
    incluyeRegrueso: tipo === "isla",
    alturaLateral: tipo === "barra" ? 90 : 0,
    incluyeSalpicaderoAlto: false,
    subtotalMeson: 0,
    subtotalLaterales: 0,
    subtotalRegrueso: 0,
    subtotalLavaplatos: tipo === "meson" ? LAVAPLATOS_COST : 0,
    subtotalSalpicaderoAlto: 0,
    subtotal: 0,
  };
}

export const defaultCountertopConfig: CountertopConfig = {
  mesones: [createDefaultSubMeson("meson")],
  total: 0,
  notes: "",
  includeTransport: false,
  transportCost: 150000,
};

// Calcular multiplicador por fondo
function getMultiplicadorFondo(fondo: number, tipo: string): number {
  if (tipo === "barra" && fondo >= 35 && fondo <= 45) {
    return 1; // Precio especial para barra angosta, sin multiplicador
  }
  if (fondo >= 55 && fondo <= 65) return 1;
  if (fondo >= 66 && fondo <= 90) return 1.3;
  if (fondo >= 91 && fondo <= 120) return 2;
  return 1;
}

// Obtener precio base según material, tipo y fondo
function getPrecioBase(material: "quarzo" | "sinterizado", tipo: string, fondo: number): number {
  if (tipo === "barra" && fondo >= 35 && fondo <= 45) {
    return BASE_PRICES[material].barraAngosta;
  }
  return BASE_PRICES[material].standard;
}

// Calcular subtotales de un sub-mesón
function calcularSubMeson(meson: SubMesonConfig): SubMesonConfig {
  const multiplicador = getMultiplicadorFondo(meson.fondo, meson.tipo);
  const precioBase = meson.precioML;
  
  // Subtotal mesón principal
  meson.subtotalMeson = meson.metrosLineales * precioBase * multiplicador;
  
  // Subtotales para isla
  if (meson.tipo === "isla") {
    if (meson.incluyeLaterales) {
      meson.subtotalLaterales = ISLA_LATERALES_ML * precioBase * multiplicador;
    } else {
      meson.subtotalLaterales = 0;
    }
    if (meson.incluyeRegrueso) {
      meson.subtotalRegrueso = ISLA_REGRUESO_ML * precioBase; // Regrueso siempre a 60cm
    } else {
      meson.subtotalRegrueso = 0;
    }
    // Isla NO lleva lavaplatos ni salpicadero
    meson.subtotalLavaplatos = 0;
    meson.subtotalSalpicaderoAlto = 0;
  } else if (meson.tipo === "barra") {
    // Barra: lateral si está configurado
    if (meson.alturaLateral > 0) {
      const lateralML = meson.alturaLateral / 100;
      meson.subtotalLaterales = lateralML * precioBase * multiplicador;
    } else {
      meson.subtotalLaterales = 0;
    }
    meson.subtotalRegrueso = 0;
    // Barra NO lleva lavaplatos
    meson.subtotalLavaplatos = 0;
    // Barra SÍ puede llevar salpicadero alto
    if (meson.incluyeSalpicaderoAlto) {
      meson.subtotalSalpicaderoAlto = meson.metrosLineales * precioBase * multiplicador;
    } else {
      meson.subtotalSalpicaderoAlto = 0;
    }
  } else {
    // Mesón estándar
    meson.subtotalLaterales = 0;
    meson.subtotalRegrueso = 0;
    // Mesón estándar SÍ lleva lavaplatos
    meson.subtotalLavaplatos = LAVAPLATOS_COST;
    // Mesón estándar puede llevar salpicadero alto
    if (meson.incluyeSalpicaderoAlto) {
      meson.subtotalSalpicaderoAlto = meson.metrosLineales * precioBase * multiplicador;
    } else {
      meson.subtotalSalpicaderoAlto = 0;
    }
  }
  
  // Subtotal del mesón
  meson.subtotal = meson.subtotalMeson + meson.subtotalLaterales + meson.subtotalRegrueso + meson.subtotalLavaplatos + meson.subtotalSalpicaderoAlto;
  
  return meson;
}

export function CountertopConfigurator({ config, onChange }: CountertopConfiguratorProps) {
  


  // Calcular total general
  const calcularTotal = (mesones: SubMesonConfig[], includeTransport: boolean, transportCost: number): number => {
    const subtotalMesones = mesones.reduce((sum, m) => sum + m.subtotal, 0);
    return subtotalMesones + (includeTransport ? transportCost : 0);
  };

  // Actualizar un sub-mesón específico
  const handleSubMesonChange = (index: number, field: keyof SubMesonConfig, value: any) => {
    const newMesones = [...config.mesones];
    let meson = { ...newMesones[index], [field]: value };
    
    // Actualizar precio base cuando cambia material o tipo
    if (field === "material" || field === "tipo" || field === "fondo") {
      const material = field === "material" ? value : meson.material;
      const tipo = field === "tipo" ? value : meson.tipo;
      const fondo = field === "fondo" ? value : meson.fondo;
      meson.precioML = getPrecioBase(material, tipo, fondo);
    }
    
    // Reset valores específicos al cambiar tipo
    if (field === "tipo") {
      if (value === "meson") {
        meson.incluyeLaterales = false;
        meson.incluyeRegrueso = false;
        meson.alturaLateral = 0;
        meson.incluyeSalpicaderoAlto = false;
      } else if (value === "isla") {
        meson.incluyeLaterales = true;
        meson.incluyeRegrueso = true;
        meson.alturaLateral = 0;
        meson.incluyeSalpicaderoAlto = false;
      } else if (value === "barra") {
        meson.incluyeLaterales = false;
        meson.incluyeRegrueso = false;
        meson.alturaLateral = 90;
        meson.incluyeSalpicaderoAlto = false;
      }
    }
    
    newMesones[index] = calcularSubMeson(meson);
    
    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Agregar un nuevo sub-mesón
  const handleAddMeson = (tipo: "meson" | "isla" | "barra") => {
    const newMeson = calcularSubMeson(createDefaultSubMeson(tipo));
    const newMesones = [...config.mesones, newMeson];
    
    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Eliminar un sub-mesón
  const handleRemoveMeson = (index: number) => {
    if (config.mesones.length <= 1) return; // Mantener al menos uno
    
    const newMesones = config.mesones.filter((_, i) => i !== index);
    
    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Manejar cambios globales
  const handleGlobalChange = (field: "notes" | "includeTransport" | "transportCost", value: any) => {
    const newConfig = { ...config, [field]: value };
    newConfig.total = calcularTotal(newConfig.mesones, newConfig.includeTransport, newConfig.transportCost);
    onChange(newConfig);
  };

  // Obtener nombre del tipo de mesón
  const getTipoNombre = (tipo: string) => {
    switch (tipo) {
      case "meson": return "Mesón Estándar";
      case "isla": return "Isla";
      case "barra": return "Barra";
      default: return tipo;
    }
  };

  // Determinar qué incluye cada tipo (considerando salpicadero alto)
  const getIncludedItems = (meson: SubMesonConfig) => {
    if (meson.tipo === "meson") {
      const items = [
        { text: `Pegado lavaplatos (${formatPrice(LAVAPLATOS_COST)})`, included: true },
        { text: "Lavaplatos 45×37cm incluido", included: true },
        { text: "Regrueso en el visto", included: true },
      ];
      // Solo mostrar salpicadero bajo si NO tiene salpicadero alto
      if (!meson.incluyeSalpicaderoAlto) {
        items.splice(2, 0, { text: "Salpicadero bajo 10cm", included: true });
      }
      return items;
    } else if (meson.tipo === "isla") {
      return [
        { text: "Regrueso en el visto", included: true },
      ];
    } else {
      // Barra: solo mostrar salpicadero bajo si NO tiene salpicadero alto
      const items = [
        { text: "Regrueso en los vistos", included: true },
      ];
      if (!meson.incluyeSalpicaderoAlto) {
        items.unshift({ text: "Salpicadero bajo 10cm", included: true });
      }
      return items;
    }
  };

  return (
    <div className="space-y-4 border border-white/[0.12] rounded-lg p-4 bg-white/[0.02]">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-white/[0.12]">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-rose-400" />
          <h3 className="font-semibold text-foreground">Configurador de Mesones</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("meson")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Mesón
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("isla")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Isla
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("barra")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Barra
          </Button>
        </div>
      </div>

      {/* Lista de mesones */}
      {config.mesones.map((meson, index) => {
        const multiplicador = getMultiplicadorFondo(meson.fondo, meson.tipo);
        const multiplicadorTexto = multiplicador === 1 ? "Normal" : multiplicador === 1.3 ? "+30%" : "Doble";
        const includedItems = getIncludedItems(meson);
        const showSalpicaderoAltoOption = meson.tipo === "meson" || meson.tipo === "barra";

        return (
          <div key={meson.id} className="space-y-3 p-3 bg-[#162828] rounded-lg border border-white/[0.10]">
            {/* Header del sub-mesón */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-rose-400">
                {getTipoNombre(meson.tipo)} #{index + 1}
              </h4>
              {config.mesones.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMeson(index)}
                  className="text-red-500 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Tipo y Material */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Tipo de Mesón</Label>
                <Select value={meson.tipo} onValueChange={(v) => handleSubMesonChange(index, "tipo", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meson">Mesón Estándar</SelectItem>
                    <SelectItem value="isla">Isla</SelectItem>
                    <SelectItem value="barra">Barra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Material</Label>
                <Select value={meson.material} onValueChange={(v) => handleSubMesonChange(index, "material", v as "quarzo" | "sinterizado")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarzo">Quarzo</SelectItem>
                    <SelectItem value="sinterizado">Sinterizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medidas y Precio */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Metros Lineales</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={meson.metrosLineales}
                  onChange={(e) => handleSubMesonChange(index, "metrosLineales", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Fondo (cm)</Label>
                <Input
                  type="number"
                  min={meson.tipo === "barra" ? 35 : 55}
                  max="120"
                  value={meson.fondo}
                  onChange={(e) => handleSubMesonChange(index, "fondo", parseInt(e.target.value) || 60)}
                  className="h-9"
                />
                <p className="text-[10px] text-white/45">
                  {meson.tipo === "barra" && meson.fondo >= 35 && meson.fondo <= 45 
                    ? "Barra angosta" 
                    : `Recargo: ${multiplicadorTexto}`}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Precio ML</Label>
                <Input
                  type="number"
                  value={meson.precioML}
                  onChange={(e) => handleSubMesonChange(index, "precioML", parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Subtotal</Label>
                <div className="h-9 flex items-center px-2 bg-rose-500/10 rounded-md font-semibold text-rose-300 text-sm">
                  {formatPrice(meson.subtotal)}
                </div>
              </div>
            </div>

            {/* Opciones de Isla */}
            {meson.tipo === "isla" && (
              <div className="p-2 bg-white/[0.04] rounded space-y-2">
                <h5 className="text-xs font-medium text-rose-400">Opciones de Isla</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-[#162828] rounded text-sm">
                    <Checkbox
                      id={`laterales-${meson.id}`}
                      checked={meson.incluyeLaterales}
                      onCheckedChange={(checked) => handleSubMesonChange(index, "incluyeLaterales", checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`laterales-${meson.id}`} className="text-xs cursor-pointer">
                        Laterales (1.8 ML)
                      </Label>
                    </div>
                    <span className="font-semibold text-rose-400 text-xs">{formatPrice(meson.subtotalLaterales)}</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-[#162828] rounded text-sm">
                    <Checkbox
                      id={`regrueso-${meson.id}`}
                      checked={meson.incluyeRegrueso}
                      onCheckedChange={(checked) => handleSubMesonChange(index, "incluyeRegrueso", checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`regrueso-${meson.id}`} className="text-xs cursor-pointer">
                        Regrueso (0.9 ML)
                      </Label>
                    </div>
                    <span className="font-semibold text-rose-400 text-xs">{formatPrice(meson.subtotalRegrueso)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Opciones de Barra */}
            {meson.tipo === "barra" && (
              <div className="p-2 bg-white/[0.04] rounded space-y-2">
                <h5 className="text-xs font-medium text-rose-400">Opciones de Barra</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Altura del Lateral</Label>
                    <Select 
                      value={meson.alturaLateral.toString()} 
                      onValueChange={(v) => handleSubMesonChange(index, "alturaLateral", parseInt(v))}
                    >
                      <SelectTrigger className="h-9 bg-[#162828]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin lateral</SelectItem>
                        <SelectItem value="90">90 cm</SelectItem>
                        <SelectItem value="100">100 cm</SelectItem>
                        <SelectItem value="110">110 cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {meson.alturaLateral > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-[#162828] rounded">
                      <div className="flex-1">
                        <Label className="text-xs">Lateral ({meson.alturaLateral}cm)</Label>
                      </div>
                      <span className="font-semibold text-rose-400 text-xs">{formatPrice(meson.subtotalLaterales)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opción de Salpicadero Alto */}
            {showSalpicaderoAltoOption && (
              <div className="p-2 bg-amber-500/10 rounded">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`salpicaderoAlto-${meson.id}`}
                    checked={meson.incluyeSalpicaderoAlto}
                    onCheckedChange={(checked) => handleSubMesonChange(index, "incluyeSalpicaderoAlto", checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`salpicaderoAlto-${meson.id}`} className="text-xs cursor-pointer font-medium">
                      Salpicadero Alto (reemplaza el bajo, duplica metraje)
                    </Label>
                    <p className="text-[10px] text-white/45">
                      {meson.metrosLineales} ML × {formatPrice(meson.precioML)} × {multiplicador}
                    </p>
                  </div>
                  {meson.incluyeSalpicaderoAlto && (
                    <span className="font-semibold text-amber-400 text-xs">{formatPrice(meson.subtotalSalpicaderoAlto)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Incluido en el precio */}
            <div className="p-2 bg-white/[0.03] rounded">
              <h5 className="text-xs font-medium text-white/60 mb-1">Incluido en el precio:</h5>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                {includedItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Transporte */}
      <div className="p-3 bg-[#162828] rounded-lg border border-white/[0.10]">
        <div className="flex items-center gap-3">
          <Checkbox
            id="transport"
            checked={config.includeTransport}
            onCheckedChange={(checked) => handleGlobalChange("includeTransport", checked)}
          />
          <Label htmlFor="transport" className="text-sm cursor-pointer flex-1">
            Incluir Transporte e Imprevistos
          </Label>
          {config.includeTransport && (
            <Input
              type="number"
              value={config.transportCost}
              onChange={(e) => handleGlobalChange("transportCost", parseInt(e.target.value) || 0)}
              className="w-32 h-8"
            />
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Notas especiales</Label>
        <Textarea
          value={config.notes}
          onChange={(e) => handleGlobalChange("notes", e.target.value)}
          placeholder="Color, modelo, especificaciones adicionales..."
          className="min-h-[60px]"
        />
      </div>

      {/* Resumen de precio */}
      <div className="p-4 bg-[#162828] border border-rose-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-5 w-5 text-rose-400" />
          <h4 className="font-semibold text-foreground">Resumen de Precio</h4>
        </div>
        <div className="space-y-1 text-sm">
          {config.mesones.map((meson, index) => (
            <div key={meson.id} className="flex justify-between">
              <span>{getTipoNombre(meson.tipo)} #{index + 1} ({meson.metrosLineales} ML {meson.material}):</span>
              <span>{formatPrice(meson.subtotal)}</span>
            </div>
          ))}
          {config.includeTransport && (
            <div className="flex justify-between">
              <span>Transporte e imprevistos:</span>
              <span>{formatPrice(config.transportCost)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-white/[0.15] text-lg font-bold">
            <span>TOTAL:</span>
            <span className="text-primary">{formatPrice(config.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
