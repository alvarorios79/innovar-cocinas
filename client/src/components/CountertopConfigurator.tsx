import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Calculator } from "lucide-react";

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

export interface CountertopConfig {
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
  total: number;
  // Extras
  notes: string;
  includeTransport: boolean;
  transportCost: number;
}

interface CountertopConfiguratorProps {
  config: CountertopConfig;
  onChange: (config: CountertopConfig) => void;
}

export const defaultCountertopConfig: CountertopConfig = {
  material: "quarzo",
  tipo: "meson",
  metrosLineales: 1,
  fondo: 60,
  precioML: BASE_PRICES.quarzo.standard,
  incluyeLaterales: true,
  incluyeRegrueso: true,
  alturaLateral: 90,
  incluyeSalpicaderoAlto: false,
  subtotalMeson: 0,
  subtotalLaterales: 0,
  subtotalRegrueso: 0,
  subtotalLavaplatos: LAVAPLATOS_COST,
  subtotalSalpicaderoAlto: 0,
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

export function CountertopConfigurator({ config, onChange }: CountertopConfiguratorProps) {
  
  const calcularTotales = (newConfig: Partial<CountertopConfig>) => {
    const updated = { ...config, ...newConfig };
    
    const multiplicador = getMultiplicadorFondo(updated.fondo, updated.tipo);
    const precioBase = updated.precioML;
    
    // Subtotal mesón principal
    updated.subtotalMeson = updated.metrosLineales * precioBase * multiplicador;
    
    // Subtotales para isla
    if (updated.tipo === "isla") {
      if (updated.incluyeLaterales) {
        updated.subtotalLaterales = ISLA_LATERALES_ML * precioBase * multiplicador;
      } else {
        updated.subtotalLaterales = 0;
      }
      if (updated.incluyeRegrueso) {
        updated.subtotalRegrueso = ISLA_REGRUESO_ML * precioBase; // Regrueso siempre a 60cm
      } else {
        updated.subtotalRegrueso = 0;
      }
      // Isla NO lleva lavaplatos ni salpicadero
      updated.subtotalLavaplatos = 0;
      updated.subtotalSalpicaderoAlto = 0;
    } else if (updated.tipo === "barra") {
      // Barra: lateral si está configurado
      if (updated.alturaLateral > 0) {
        const lateralML = updated.alturaLateral / 100;
        updated.subtotalLaterales = lateralML * precioBase * multiplicador;
      } else {
        updated.subtotalLaterales = 0;
      }
      updated.subtotalRegrueso = 0;
      // Barra NO lleva lavaplatos
      updated.subtotalLavaplatos = 0;
      // Barra SÍ puede llevar salpicadero alto
      if (updated.incluyeSalpicaderoAlto) {
        // Salpicadero alto = duplica el metraje del mesón
        updated.subtotalSalpicaderoAlto = updated.metrosLineales * precioBase * multiplicador;
      } else {
        updated.subtotalSalpicaderoAlto = 0;
      }
    } else {
      // Mesón estándar
      updated.subtotalLaterales = 0;
      updated.subtotalRegrueso = 0;
      // Mesón estándar SÍ lleva lavaplatos
      updated.subtotalLavaplatos = LAVAPLATOS_COST;
      // Mesón estándar puede llevar salpicadero alto
      if (updated.incluyeSalpicaderoAlto) {
        // Salpicadero alto = duplica el metraje del mesón
        updated.subtotalSalpicaderoAlto = updated.metrosLineales * precioBase * multiplicador;
      } else {
        updated.subtotalSalpicaderoAlto = 0;
      }
    }
    
    // Total
    updated.total = updated.subtotalMeson + updated.subtotalLaterales + updated.subtotalRegrueso + updated.subtotalLavaplatos + updated.subtotalSalpicaderoAlto;
    
    if (updated.includeTransport) {
      updated.total += updated.transportCost;
    }
    
    return updated;
  };

  const handleChange = (field: keyof CountertopConfig, value: any) => {
    let newConfig: Partial<CountertopConfig> = { [field]: value };
    
    // Actualizar precio base cuando cambia material o tipo
    if (field === "material" || field === "tipo" || field === "fondo") {
      const material = field === "material" ? value : config.material;
      const tipo = field === "tipo" ? value : config.tipo;
      const fondo = field === "fondo" ? value : config.fondo;
      newConfig.precioML = getPrecioBase(material, tipo, fondo);
    }
    
    // Reset valores específicos al cambiar tipo
    if (field === "tipo") {
      if (value === "meson") {
        newConfig.incluyeLaterales = false;
        newConfig.incluyeRegrueso = false;
        newConfig.alturaLateral = 0;
        newConfig.incluyeSalpicaderoAlto = false;
      } else if (value === "isla") {
        newConfig.incluyeLaterales = true;
        newConfig.incluyeRegrueso = true;
        newConfig.alturaLateral = 0;
        newConfig.incluyeSalpicaderoAlto = false;
      } else if (value === "barra") {
        newConfig.incluyeLaterales = false;
        newConfig.incluyeRegrueso = false;
        newConfig.alturaLateral = 90;
        newConfig.incluyeSalpicaderoAlto = false;
      }
    }
    
    onChange(calcularTotales(newConfig));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const multiplicador = getMultiplicadorFondo(config.fondo, config.tipo);
  const multiplicadorTexto = multiplicador === 1 ? "Normal" : multiplicador === 1.3 ? "+30%" : "Doble";

  // Determinar qué incluye cada tipo
  const getIncludedItems = () => {
    if (config.tipo === "meson") {
      // Mesón estándar: lavaplatos, pegado, salpicadero bajo, regrueso
      return [
        { text: `Pegado lavaplatos (${formatPrice(LAVAPLATOS_COST)})`, included: true },
        { text: "Lavaplatos 45×37cm incluido", included: true },
        { text: "Salpicadero bajo 10cm", included: true },
        { text: "Regrueso en el visto", included: true },
      ];
    } else if (config.tipo === "isla") {
      // Isla: solo regrueso en el visto
      return [
        { text: "Regrueso en el visto", included: true },
      ];
    } else {
      // Barra: salpicadero bajo y regrueso en los vistos
      return [
        { text: "Salpicadero bajo 10cm", included: true },
        { text: "Regrueso en los vistos", included: true },
      ];
    }
  };

  const includedItems = getIncludedItems();

  // Mostrar opción de salpicadero alto solo para mesón y barra
  const showSalpicaderoAltoOption = config.tipo === "meson" || config.tipo === "barra";

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gradient-to-br from-rose-50 to-pink-50">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
        <Layers className="h-5 w-5 text-rose-600" />
        <h3 className="font-semibold text-rose-800">Configurador de Mesones</h3>
      </div>

      {/* Tipo y Material */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white rounded-lg">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Mesón</Label>
          <Select value={config.tipo} onValueChange={(v) => handleChange("tipo", v)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meson">Mesón Estándar</SelectItem>
              <SelectItem value="isla">Isla</SelectItem>
              <SelectItem value="barra">Barra</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Material</Label>
          <Select value={config.material} onValueChange={(v) => handleChange("material", v as "quarzo" | "sinterizado")}>
            <SelectTrigger className="h-10">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white rounded-lg">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Metros Lineales</Label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={config.metrosLineales}
            onChange={(e) => handleChange("metrosLineales", parseFloat(e.target.value) || 0)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Fondo (cm)</Label>
          <Input
            type="number"
            min={config.tipo === "barra" ? 35 : 55}
            max="120"
            value={config.fondo}
            onChange={(e) => handleChange("fondo", parseInt(e.target.value) || 60)}
            className="h-10"
          />
          <p className="text-xs text-gray-500">
            {config.tipo === "barra" && config.fondo >= 35 && config.fondo <= 45 
              ? "Barra angosta (precio especial)" 
              : `Recargo: ${multiplicadorTexto}`}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Precio ML (editable)</Label>
          <Input
            type="number"
            value={config.precioML}
            onChange={(e) => handleChange("precioML", parseInt(e.target.value) || 0)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Subtotal Mesón</Label>
          <div className="h-10 flex items-center px-3 bg-rose-100 rounded-md font-semibold text-rose-800">
            {formatPrice(config.subtotalMeson)}
          </div>
        </div>
      </div>

      {/* Opciones de Isla */}
      {config.tipo === "isla" && (
        <div className="p-3 bg-rose-100 rounded-lg space-y-3">
          <h4 className="font-medium text-rose-800">Opciones de Isla</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-2 bg-white rounded">
              <Checkbox
                id="laterales"
                checked={config.incluyeLaterales}
                onCheckedChange={(checked) => handleChange("incluyeLaterales", checked)}
              />
              <div className="flex-1">
                <Label htmlFor="laterales" className="text-sm cursor-pointer">
                  Laterales (1.8 ML fijos)
                </Label>
                <p className="text-xs text-gray-500">Aplica recargo por fondo: {multiplicadorTexto}</p>
              </div>
              <span className="font-semibold text-rose-700">{formatPrice(config.subtotalLaterales)}</span>
            </div>

            <div className="flex items-center gap-3 p-2 bg-white rounded">
              <Checkbox
                id="regrueso"
                checked={config.incluyeRegrueso}
                onCheckedChange={(checked) => handleChange("incluyeRegrueso", checked)}
              />
              <div className="flex-1">
                <Label htmlFor="regrueso" className="text-sm cursor-pointer">
                  Regrueso (0.9 ML × 60cm)
                </Label>
                <p className="text-xs text-gray-500">Precio fijo sin recargo</p>
              </div>
              <span className="font-semibold text-rose-700">{formatPrice(config.subtotalRegrueso)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Opciones de Barra */}
      {config.tipo === "barra" && (
        <div className="p-3 bg-rose-100 rounded-lg space-y-3">
          <h4 className="font-medium text-rose-800">Opciones de Barra</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Altura del Lateral</Label>
              <Select 
                value={config.alturaLateral.toString()} 
                onValueChange={(v) => handleChange("alturaLateral", parseInt(v))}
              >
                <SelectTrigger className="h-10 bg-white">
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

            {config.alturaLateral > 0 && (
              <div className="flex items-center gap-3 p-2 bg-white rounded">
                <div className="flex-1">
                  <Label className="text-sm">Lateral ({config.alturaLateral}cm = {config.alturaLateral / 100} ML)</Label>
                  <p className="text-xs text-gray-500">Aplica recargo por fondo: {multiplicadorTexto}</p>
                </div>
                <span className="font-semibold text-rose-700">{formatPrice(config.subtotalLaterales)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opción de Salpicadero Alto (solo para mesón y barra) */}
      {showSalpicaderoAltoOption && (
        <div className="p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="salpicaderoAlto"
              checked={config.incluyeSalpicaderoAlto}
              onCheckedChange={(checked) => handleChange("incluyeSalpicaderoAlto", checked)}
            />
            <div className="flex-1">
              <Label htmlFor="salpicaderoAlto" className="text-sm cursor-pointer font-medium">
                Salpicadero Alto (pieza adicional para pared)
              </Label>
              <p className="text-xs text-gray-500">
                Duplica el metraje del mesón ({config.metrosLineales} ML × {formatPrice(config.precioML)} × {multiplicador})
              </p>
            </div>
            {config.incluyeSalpicaderoAlto && (
              <span className="font-semibold text-amber-700">{formatPrice(config.subtotalSalpicaderoAlto)}</span>
            )}
          </div>
        </div>
      )}

      {/* Incluido en el precio - Dinámico según tipo */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Incluido en el precio:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
          {includedItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Transporte */}
      <div className="p-3 bg-white rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="transport"
            checked={config.includeTransport}
            onCheckedChange={(checked) => handleChange("includeTransport", checked)}
          />
          <Label htmlFor="transport" className="text-sm cursor-pointer flex-1">
            Incluir Transporte e Imprevistos
          </Label>
          {config.includeTransport && (
            <Input
              type="number"
              value={config.transportCost}
              onChange={(e) => handleChange("transportCost", parseInt(e.target.value) || 0)}
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
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Color, modelo, especificaciones adicionales..."
          className="min-h-[60px]"
        />
      </div>

      {/* Resumen de precio */}
      <div className="p-4 bg-rose-600 text-white rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-5 w-5" />
          <h4 className="font-semibold">Resumen de Precio</h4>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Mesón ({config.metrosLineales} ML × {formatPrice(config.precioML)} × {multiplicador}):</span>
            <span>{formatPrice(config.subtotalMeson)}</span>
          </div>
          {config.tipo === "isla" && config.incluyeLaterales && (
            <div className="flex justify-between">
              <span>Laterales isla (1.8 ML × {multiplicador}):</span>
              <span>{formatPrice(config.subtotalLaterales)}</span>
            </div>
          )}
          {config.tipo === "isla" && config.incluyeRegrueso && (
            <div className="flex justify-between">
              <span>Regrueso isla (0.9 ML):</span>
              <span>{formatPrice(config.subtotalRegrueso)}</span>
            </div>
          )}
          {config.tipo === "barra" && config.alturaLateral > 0 && (
            <div className="flex justify-between">
              <span>Lateral barra ({config.alturaLateral}cm):</span>
              <span>{formatPrice(config.subtotalLaterales)}</span>
            </div>
          )}
          {config.tipo === "meson" && (
            <div className="flex justify-between">
              <span>Pegado lavaplatos:</span>
              <span>{formatPrice(config.subtotalLavaplatos)}</span>
            </div>
          )}
          {config.incluyeSalpicaderoAlto && (
            <div className="flex justify-between">
              <span>Salpicadero alto ({config.metrosLineales} ML × {multiplicador}):</span>
              <span>{formatPrice(config.subtotalSalpicaderoAlto)}</span>
            </div>
          )}
          {config.includeTransport && (
            <div className="flex justify-between">
              <span>Transporte e imprevistos:</span>
              <span>{formatPrice(config.transportCost)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-rose-400 text-lg font-bold">
            <span>TOTAL:</span>
            <span>{formatPrice(config.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
