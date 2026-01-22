import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChefHat } from "lucide-react";

export interface KitchenConfig {
  shape: string;
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
  notes?: string;
}

interface KitchenConfiguratorProps {
  config: KitchenConfig | null;
  onChange: (config: KitchenConfig) => void;
  includesFixedCosts: boolean;
  onFixedCostsChange: (includes: boolean, amount?: number) => void;
  fixedCostsAmount: number;
  totalPrice: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
};

export function KitchenConfigurator({ 
  config, 
  onChange, 
  includesFixedCosts, 
  onFixedCostsChange, 
  fixedCostsAmount,
  totalPrice 
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
    <Card className="mt-4 border-teal-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-teal-200">
          <ChefHat className="h-5 w-5 text-teal-600" />
          <h4 className="font-bold text-teal-800 text-lg">Configuración de Cocina Integral</h4>
        </div>

        <div className="space-y-4">
          {/* Forma y Metraje */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-800 mb-3">Dimensiones</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-teal-700">Forma de la Cocina</Label>
                <Select 
                  value={currentConfig.shape} 
                  onValueChange={(value) => updateConfig("shape", value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecciona la forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">En L</SelectItem>
                    <SelectItem value="U">En U</SelectItem>
                    <SelectItem value="lineal">Lineal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-teal-700">Metraje Total (ml)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.totalMeters || ""}
                  onChange={(e) => updateConfig("totalMeters", parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 5.00"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* Muebles Especiales */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-800 mb-3">Muebles Especiales (se descuentan del metraje)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.specialModules.nichoNevecon}
                  onChange={(e) => updateConfig("specialModules.nichoNevecon", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm">Nicho para nevecon (100cm) - $1,200,000</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.specialModules.nichoNevera}
                  onChange={(e) => updateConfig("specialModules.nichoNevera", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm">Nicho para nevera estándar (75cm) - $1,200,000</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.specialModules.alacenaEntrepanos}
                  onChange={(e) => updateConfig("specialModules.alacenaEntrepanos", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm">Alacena con entrepaños (50cm) - $1,250,000</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.specialModules.alacenaHerraje}
                  onChange={(e) => updateConfig("specialModules.alacenaHerraje", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm">Alacena para herraje (50cm) - $900,000</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.specialModules.torreHornos}
                  onChange={(e) => updateConfig("specialModules.torreHornos", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm">Torre de hornos (70cm) - $1,350,000</span>
              </label>
            </div>
            
            {/* Metraje resultante */}
            <div className="mt-3 p-3 bg-teal-100 rounded-lg">
              <p className="text-sm font-medium text-teal-800">
                Metraje resultante: <span className="text-lg">{resultingMeters.toFixed(2)} ml</span>
              </p>
              <p className="text-xs text-teal-600 mt-1">
                • Muebles Inferiores: {resultingMeters.toFixed(2)} ml | • Muebles Superiores: {resultingMeters.toFixed(2)} ml
              </p>
            </div>
          </div>

          {/* Mesón Principal */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-800 mb-3">Mesón Principal</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-teal-700">Tipo de Mesón *</Label>
                <Select 
                  value={currentConfig.countertop.type} 
                  onValueChange={(value) => updateConfig("countertop.type", value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarzone">Quarzone ($850k/ml)</SelectItem>
                    <SelectItem value="sinterizado">Sinterizado ($1.2M/ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-teal-700">Recargo por Fondo</Label>
                <Select 
                  value={currentConfig.countertop.depthSurcharge} 
                  onValueChange={(value) => updateConfig("countertop.depthSurcharge", value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin recargo (≤60cm)</SelectItem>
                    <SelectItem value="30percent">+30% (61-90cm)</SelectItem>
                    <SelectItem value="double">×2 (91-120cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Isla */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={currentConfig.island.enabled}
                onChange={(e) => updateConfig("island.enabled", e.target.checked)}
                className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
              />
              <h5 className="font-semibold text-teal-800">Isla</h5>
            </label>
            
            {currentConfig.island.enabled && (
              <div className="pl-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-teal-700">Metros de isla (ml)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.island.meters || ""}
                      onChange={(e) => updateConfig("island.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-teal-700">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.island.countertopType} 
                      onValueChange={(value) => updateConfig("island.countertopType", value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarzone">Quarzone</SelectItem>
                        <SelectItem value="sinterizado">Sinterizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.island.hasLaterals}
                    onChange={(e) => updateConfig("island.hasLaterals", e.target.checked)}
                    className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Incluir laterales (+1.80ml lateral + 0.90ml regrueso)</span>
                </label>
              </div>
            )}
          </div>

          {/* Barra */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={currentConfig.bar.enabled}
                onChange={(e) => updateConfig("bar.enabled", e.target.checked)}
                className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
              />
              <h5 className="font-semibold text-teal-800">Barra</h5>
            </label>
            
            {currentConfig.bar.enabled && (
              <div className="pl-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-teal-700">Metros de barra (ml)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.bar.meters || ""}
                      onChange={(e) => updateConfig("bar.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-teal-700">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.bar.countertopType} 
                      onValueChange={(value) => updateConfig("bar.countertopType", value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarzone">Quarzone</SelectItem>
                        <SelectItem value="sinterizado">Sinterizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.bar.hasLateral}
                    onChange={(e) => updateConfig("bar.hasLateral", e.target.checked)}
                    className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Incluir lateral (+0.90ml fijo)</span>
                </label>
              </div>
            )}
          </div>

          {/* Luz LED */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-800 mb-3">Luz LED (opcional)</h5>
            <div>
              <Label className="text-teal-700">Metros de LED - $180,000/ml</Label>
              <Input
                type="number"
                step="0.01"
                value={currentConfig.ledLighting || ""}
                onChange={(e) => updateConfig("ledLighting", parseFloat(e.target.value) || 0)}
                placeholder="Dejar en 0 si no lleva LED"
                className="bg-white"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-800 mb-3">Notas Adicionales</h5>
            <Textarea
              value={currentConfig.notes || ""}
              onChange={(e) => updateConfig("notes", e.target.value)}
              placeholder="Especificaciones adicionales, colores, acabados..."
              className="bg-white min-h-[80px]"
            />
          </div>

          {/* Transporte e Imprevistos */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesFixedCosts}
                  onChange={(e) => onFixedCostsChange(e.target.checked)}
                  className="h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-yellow-800">Incluye transporte e imprevistos</span>
              </label>
              {includesFixedCosts && (
                <Input
                  type="number"
                  value={fixedCostsAmount}
                  onChange={(e) => onFixedCostsChange(true, parseFloat(e.target.value) || 0)}
                  className="w-32 h-8 bg-white"
                  min="0"
                />
              )}
            </div>
          </div>

          {/* Resumen Total */}
          <div className="bg-teal-200 p-4 rounded-lg border border-teal-400">
            <h5 className="font-semibold text-teal-800 mb-3">Resumen del Precio</h5>
            <div className="border-t border-teal-400 pt-2 flex justify-between items-center">
              <span className="font-bold text-teal-900">TOTAL COCINA:</span>
              <span className="text-2xl font-bold text-teal-900">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
