import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Refrigerator, UtensilsCrossed, Lightbulb, LayoutGrid, Paintbrush } from "lucide-react";

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
    paintedDoors: {
      enabled: false,
      upperQty: 0,
      lowerQty: 0,
      pantryQty: 0,
      drawerQty: 0,
      spiceQty: 0,
      golaQty: 0,
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
          <ChefHat className="h-5 w-5 text-emerald-600" />
          <h4 className="font-bold text-emerald-800 text-lg">Configuración de Cocina Integral</h4>
        </div>

        <div className="space-y-6">
          {/* Dimensiones */}
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <h5 className="font-semibold text-emerald-700 mb-3">Dimensiones del Proyecto</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-2">Forma de la Cocina</Label>
                <Select 
                  value={currentConfig.shape} 
                  onValueChange={(value) => updateConfig("shape", value)}
                >
                  <SelectTrigger className="h-10 bg-white">
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
                <Label className="text-sm font-medium text-gray-700 block mb-2">Metraje Total (ml)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.totalMeters || ""}
                  onChange={(e) => updateConfig("totalMeters", parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 5.00"
                  className="h-10 bg-white"
                />
              </div>
            </div>
            <div className="mt-3 p-3 bg-emerald-100 rounded">
              <p className="text-sm text-emerald-700">
                <strong>Metraje resultante:</strong> {resultingMeters.toFixed(2)} ml
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Muebles Inferiores: {resultingMeters.toFixed(2)} ml | Muebles Superiores: {resultingMeters.toFixed(2)} ml
              </p>
            </div>
          </div>

          {/* Muebles Especiales */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-700 mb-3">Muebles Especiales (se descuentan del metraje)</h5>
            
            <div className="space-y-3">
              {/* Nicho Nevecon */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
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
                <span className={`font-semibold ${currentConfig.specialModules.nichoNevecon ? 'text-emerald-700' : 'text-gray-400'}`}>
                  $1,200,000
                </span>
              </div>

              {/* Nicho Nevera */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
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
                <span className={`font-semibold ${currentConfig.specialModules.nichoNevera ? 'text-emerald-700' : 'text-gray-400'}`}>
                  $1,200,000
                </span>
              </div>

              {/* Alacena Entrepaños */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
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
                <span className={`font-semibold ${currentConfig.specialModules.alacenaEntrepanos ? 'text-emerald-700' : 'text-gray-400'}`}>
                  $1,250,000
                </span>
              </div>

              {/* Alacena Herraje */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
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
                <span className={`font-semibold ${currentConfig.specialModules.alacenaHerraje ? 'text-emerald-700' : 'text-gray-400'}`}>
                  $900,000
                </span>
              </div>

              {/* Torre de Hornos */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
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
                <span className={`font-semibold ${currentConfig.specialModules.torreHornos ? 'text-emerald-700' : 'text-gray-400'}`}>
                  $1,350,000
                </span>
              </div>
            </div>
          </div>

          {/* Mesón Principal */}
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <h5 className="font-semibold text-emerald-700 mb-3">Mesón Principal</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Mesón *</Label>
                <Select 
                  value={currentConfig.countertop.type} 
                  onValueChange={(value) => updateConfig("countertop.type", value)}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarzone">Quarzone ($850k/ml)</SelectItem>
                    <SelectItem value="sinterizado">Sinterizado ($1.2M/ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-2">Recargo por Fondo</Label>
                <Select 
                  value={currentConfig.countertop.depthSurcharge} 
                  onValueChange={(value) => updateConfig("countertop.depthSurcharge", value)}
                >
                  <SelectTrigger className="h-10 bg-white">
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="isla-enabled" 
                  checked={currentConfig.island.enabled} 
                  onCheckedChange={(c) => updateConfig("island.enabled", c === true)} 
                />
                <Label htmlFor="isla-enabled" className="cursor-pointer font-semibold text-gray-700">
                  Incluir Isla
                </Label>
              </div>
            </div>
            
            {currentConfig.island.enabled && (
              <div className="space-y-4 mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">Metros lineales de isla</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.island.meters || ""}
                      onChange={(e) => updateConfig("island.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-10 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.island.countertopType} 
                      onValueChange={(value) => updateConfig("island.countertopType", value)}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="barra-enabled" 
                  checked={currentConfig.bar.enabled} 
                  onCheckedChange={(c) => updateConfig("bar.enabled", c === true)} 
                />
                <Label htmlFor="barra-enabled" className="cursor-pointer font-semibold text-gray-700">
                  Incluir Barra
                </Label>
              </div>
            </div>
            
            {currentConfig.bar.enabled && (
              <div className="space-y-4 mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">Metros lineales de barra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentConfig.bar.meters || ""}
                      onChange={(e) => updateConfig("bar.meters", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-10 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">Tipo de mesón</Label>
                    <Select 
                      value={currentConfig.bar.countertopType} 
                      onValueChange={(value) => updateConfig("bar.countertopType", value)}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <div>
                  <Label className="font-medium">Iluminación LED</Label>
                  <p className="text-xs text-gray-500">$180,000 por metro lineal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.ledLighting || ""}
                  onChange={(e) => updateConfig("ledLighting", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9 w-24 text-right bg-white"
                />
                <span className="text-sm text-gray-600">ml</span>
              </div>
            </div>
          </div>

          {/* Pintado Puertas Alto Brillo */}
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="painted-doors-enabled" 
                  checked={currentConfig.paintedDoors?.enabled || false} 
                  onCheckedChange={(c) => updateConfig("paintedDoors.enabled", c === true)} 
                />
                <div className="flex items-center gap-2">
                  <Paintbrush className="h-4 w-4 text-pink-600" />
                  <Label htmlFor="painted-doors-enabled" className="cursor-pointer font-semibold text-pink-700">
                    Pintado Puertas Alto Brillo
                  </Label>
                </div>
              </div>
            </div>
            
            {currentConfig.paintedDoors?.enabled && (
              <div className="space-y-3 mt-3 pt-3 border-t border-pink-200">
                <p className="text-xs text-pink-600 mb-2">Ingrese la cantidad de cada tipo de puerta</p>
                
                {/* Puertas Superiores */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas Superiores</Label>
                    <p className="text-xs text-gray-500">$120,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.upperQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.upperQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.upperQty || 0) * 120000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Puertas Inferiores */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas Inferiores</Label>
                    <p className="text-xs text-gray-500">$150,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.lowerQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.lowerQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.lowerQty || 0) * 150000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Puertas de Alacena */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Puertas de Alacena</Label>
                    <p className="text-xs text-gray-500">$250,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.pantryQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.pantryQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.pantryQty || 0) * 250000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapas de Cajón */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapas de Cajón</Label>
                    <p className="text-xs text-gray-500">$80,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.drawerQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.drawerQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.drawerQty || 0) * 80000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapa de Especiero */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapa de Especiero</Label>
                    <p className="text-xs text-gray-500">$100,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.spiceQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.spiceQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.spiceQty || 0) * 100000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tapas Pequeña/Gola */}
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Label className="text-sm font-medium">Tapas Pequeña/Gola</Label>
                    <p className="text-xs text-gray-500">$45,000 c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={currentConfig.paintedDoors?.golaQty || ""}
                      onChange={(e) => updateConfig("paintedDoors.golaQty", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-20 text-right bg-white"
                    />
                    <span className="text-sm text-pink-700 font-medium w-28 text-right">
                      ${((currentConfig.paintedDoors?.golaQty || 0) * 45000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Total Pintado */}
                <div className="flex items-center justify-between p-2 bg-pink-100 rounded border border-pink-300 mt-2">
                  <Label className="text-sm font-bold text-pink-800">Total Pintado Alto Brillo:</Label>
                  <span className="text-lg font-bold text-pink-800">
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                  <span className="text-sm text-gray-600">Monto: $</span>
                  <Input 
                    type="number" 
                    value={fixedCostsAmount} 
                    onChange={(e) => onFixedCostsChange(true, parseFloat(e.target.value) || 0)} 
                    className="h-9 w-32 text-right bg-white" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-gray-700 block mb-2">Notas Adicionales</Label>
            <Textarea
              value={currentConfig.notes || ""}
              onChange={(e) => updateConfig("notes", e.target.value)}
              placeholder="Especificaciones adicionales, colores, acabados..."
              className="bg-white"
              rows={2}
            />
          </div>

          {/* Resumen Total */}
          <div className="bg-emerald-200 p-4 rounded-lg border border-emerald-400">
            <h5 className="font-semibold text-emerald-800 mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cocina {currentConfig.shape || "---"} - {resultingMeters.toFixed(2)}ml:</span>
                <span className="font-medium">Calculado</span>
              </div>
              {currentConfig.specialModules.nichoNevecon && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Nicho nevecon:</span>
                  <span className="font-medium">$1,200,000</span>
                </div>
              )}
              {currentConfig.specialModules.nichoNevera && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Nicho nevera:</span>
                  <span className="font-medium">$1,200,000</span>
                </div>
              )}
              {currentConfig.specialModules.alacenaEntrepanos && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Alacena entrepaños:</span>
                  <span className="font-medium">$1,250,000</span>
                </div>
              )}
              {currentConfig.specialModules.alacenaHerraje && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Alacena herraje:</span>
                  <span className="font-medium">$900,000</span>
                </div>
              )}
              {currentConfig.specialModules.torreHornos && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Torre de hornos:</span>
                  <span className="font-medium">$1,350,000</span>
                </div>
              )}
              {currentConfig.island.enabled && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Isla ({currentConfig.island.meters}ml):</span>
                  <span className="font-medium">Incluido</span>
                </div>
              )}
              {currentConfig.bar.enabled && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Barra ({currentConfig.bar.meters}ml):</span>
                  <span className="font-medium">Incluido</span>
                </div>
              )}
              {currentConfig.ledLighting > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ LED ({currentConfig.ledLighting}ml × $180,000):</span>
                  <span className="font-medium">${(currentConfig.ledLighting * 180000).toLocaleString()}</span>
                </div>
              )}
              {currentConfig.paintedDoors?.enabled && (
                <div className="flex justify-between text-pink-700">
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
              {includesFixedCosts && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Transporte e imprevistos:</span>
                  <span className="font-medium">${fixedCostsAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-emerald-400 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-emerald-900">TOTAL COCINA:</span>
                <span className="text-2xl font-bold text-emerald-900">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
