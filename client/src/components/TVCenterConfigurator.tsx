import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tv, Lightbulb, Sparkles, Box } from "lucide-react";

export interface TVCenterConfig {
  width: number; // Ancho en metros (base 1.60)
  basePrice: number;
  hasHighGloss: boolean; // Alto brillo
  highGlossPrice: number;
  hasLedLights: boolean; // Luces LED
  ledLightsPrice: number;
  floatingShelves: number; // Cantidad de repisas flotantes (base 2)
  extraShelvesPrice: number;
  equipmentSpaces: number; // Espacios especiales para equipos
  equipmentSpacesPrice: number;
  includeTransport: boolean;
  transportCost: number;
  notes: string;
  subtotal: number;
}

interface TVCenterConfiguratorProps {
  config: TVCenterConfig | null;
  onChange: (config: TVCenterConfig) => void;
}

// Precios base
const BASE_WIDTH = 1.60; // metros
const BASE_PRICE = 2800000;
const PRICE_PER_20CM = 500000; // +$500,000 por cada 20cm extra
const HIGH_GLOSS_PRICE = 350000;
const LED_LIGHTS_PRICE = 250000;
const EXTRA_SHELF_PRICE = 100000; // Por cada repisa adicional (base son 2)
const EQUIPMENT_SPACE_PRICE = 150000; // Por cada espacio especial

const WIDTH_OPTIONS = [
  { value: 1.20, label: "1.20m (-$500,000)" },
  { value: 1.40, label: "1.40m (-$250,000)" },
  { value: 1.60, label: "1.60m (Estándar)" },
  { value: 1.80, label: "1.80m (+$500,000)" },
  { value: 2.00, label: "2.00m (+$1,000,000)" },
  { value: 2.20, label: "2.20m (+$1,500,000)" },
  { value: 2.40, label: "2.40m (+$2,000,000)" },
];

export function TVCenterConfigurator({ config, onChange }: TVCenterConfiguratorProps) {
  const [width, setWidth] = useState<number>(config?.width ?? BASE_WIDTH);
  const [hasHighGloss, setHasHighGloss] = useState<boolean>(config?.hasHighGloss ?? false);
  const [hasLedLights, setHasLedLights] = useState<boolean>(config?.hasLedLights ?? false);
  const [floatingShelves, setFloatingShelves] = useState<number>(config?.floatingShelves ?? 2);
  const [equipmentSpaces, setEquipmentSpaces] = useState<number>(config?.equipmentSpaces ?? 0);
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? 150000);
  const [notes, setNotes] = useState<string>(config?.notes ?? "");

  // Calcular precio base según ancho
  const calculateBasePrice = (w: number): number => {
    const diff = (w - BASE_WIDTH) * 100; // diferencia en cm
    const increments = Math.round(diff / 20); // cada 20cm
    return BASE_PRICE + (increments * PRICE_PER_20CM);
  };

  // Calcular precio de repisas extra (base son 2)
  const calculateExtraShelvesPrice = (shelves: number): number => {
    const extraShelves = Math.max(0, shelves - 2);
    return extraShelves * EXTRA_SHELF_PRICE;
  };

  useEffect(() => {
    const basePrice = calculateBasePrice(width);
    const highGlossPrice = hasHighGloss ? HIGH_GLOSS_PRICE : 0;
    const ledLightsPrice = hasLedLights ? LED_LIGHTS_PRICE : 0;
    const extraShelvesPrice = calculateExtraShelvesPrice(floatingShelves);
    const equipmentSpacesPrice = equipmentSpaces * EQUIPMENT_SPACE_PRICE;
    const transport = includeTransport ? transportCost : 0;

    const subtotal = basePrice + highGlossPrice + ledLightsPrice + extraShelvesPrice + equipmentSpacesPrice + transport;

    onChange({
      width,
      basePrice,
      hasHighGloss,
      highGlossPrice,
      hasLedLights,
      ledLightsPrice,
      floatingShelves,
      extraShelvesPrice,
      equipmentSpaces,
      equipmentSpacesPrice,
      includeTransport,
      transportCost,
      notes,
      subtotal,
    });
  }, [width, hasHighGloss, hasLedLights, floatingShelves, equipmentSpaces, includeTransport, transportCost, notes]);

  const basePrice = calculateBasePrice(width);
  const highGlossPrice = hasHighGloss ? HIGH_GLOSS_PRICE : 0;
  const ledLightsPrice = hasLedLights ? LED_LIGHTS_PRICE : 0;
  const extraShelvesPrice = calculateExtraShelvesPrice(floatingShelves);
  const equipmentSpacesPrice = equipmentSpaces * EQUIPMENT_SPACE_PRICE;
  const transport = includeTransport ? transportCost : 0;
  const subtotal = basePrice + highGlossPrice + ledLightsPrice + extraShelvesPrice + equipmentSpacesPrice + transport;

  return (
    <Card className="mt-4 border-white/[0.15]">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.12]">
          <Tv className="h-5 w-5 text-purple-400" />
          <h4 className="font-bold text-foreground text-lg">Configuración Centro de TV</h4>
        </div>

        <div className="space-y-6">
          {/* Medidas */}
          <div className="bg-white/[0.04] p-4 rounded-lg border border-white/[0.10]">
            <h5 className="font-semibold text-foreground mb-3">Medidas del Mueble</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Ancho del Mueble</Label>
                <Select value={width.toString()} onValueChange={(v) => setWidth(parseFloat(v))}>
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue placeholder="Seleccionar ancho" />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Repisas Flotantes</Label>
                <Select value={floatingShelves.toString()} onValueChange={(v) => setFloatingShelves(parseInt(v))}>
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin repisas</SelectItem>
                    <SelectItem value="1">1 repisa</SelectItem>
                    <SelectItem value="2">2 repisas (incluidas)</SelectItem>
                    <SelectItem value="3">3 repisas (+$100,000)</SelectItem>
                    <SelectItem value="4">4 repisas (+$200,000)</SelectItem>
                    <SelectItem value="5">5 repisas (+$300,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 p-3 bg-[#162828] rounded">
              <p className="text-sm text-purple-300">
                <strong>Incluye:</strong> Mueble flotante, panel para TV con alistonado, {floatingShelves} repisas flotantes
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                Precio base: ${basePrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <h5 className="font-semibold text-white/85 mb-3">Opciones Adicionales</h5>
            
            <div className="space-y-4">
              {/* Alto Brillo */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="high-gloss" 
                    checked={hasHighGloss} 
                    onCheckedChange={(c) => setHasHighGloss(c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="high-gloss" className="cursor-pointer font-medium">
                      Acabado Alto Brillo
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${hasHighGloss ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  +${HIGH_GLOSS_PRICE.toLocaleString()}
                </span>
              </div>

              {/* Luces LED */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="led-lights" 
                    checked={hasLedLights} 
                    onCheckedChange={(c) => setHasLedLights(c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="led-lights" className="cursor-pointer font-medium">
                      Iluminación LED
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${hasLedLights ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  +${LED_LIGHTS_PRICE.toLocaleString()}
                </span>
              </div>

              {/* Espacios para equipos */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Box className="h-4 w-4 text-blue-500" />
                  <div>
                    <Label className="font-medium">Espacios para Equipos</Label>
                    <p className="text-xs text-white/45">Consolas, decodificadores, etc.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={equipmentSpaces.toString()} onValueChange={(v) => setEquipmentSpaces(parseInt(v))}>
                    <SelectTrigger className="h-9 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`font-semibold min-w-[100px] text-right ${equipmentSpaces > 0 ? 'text-purple-400' : 'text-muted-foreground'}`}>
                    +${equipmentSpacesPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transporte e Imprevistos */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="tv-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <Label htmlFor="tv-transport" className="cursor-pointer font-medium">
                  Incluir Transporte e Imprevistos
                </Label>
              </div>
              {includeTransport && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Monto: $</span>
                  <Input 
                    type="number" 
                    value={transportCost} 
                    onChange={(e) => setTransportCost(parseInt(e.target.value) || 0)} 
                    className="h-9 w-32 text-right" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas Adicionales</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Especificaciones adicionales, colores, ubicación de equipos, etc."
              className="bg-[#162828]"
              rows={2}
            />
          </div>

          {/* Resumen de Precio */}
          <div className="bg-[#162828] p-4 rounded-lg border border-purple-500/30">
            <h5 className="font-semibold text-foreground mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Mueble flotante {width}m + panel + {floatingShelves} repisas:</span>
                <span className="font-medium">${basePrice.toLocaleString()}</span>
              </div>
              {hasHighGloss && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Alto brillo:</span>
                  <span className="font-medium">${highGlossPrice.toLocaleString()}</span>
                </div>
              )}
              {hasLedLights && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Iluminación LED:</span>
                  <span className="font-medium">${ledLightsPrice.toLocaleString()}</span>
                </div>
              )}
              {floatingShelves > 2 && (
                <div className="flex justify-between text-purple-400">
                  <span>+ {floatingShelves - 2} repisas extra:</span>
                  <span className="font-medium">${extraShelvesPrice.toLocaleString()}</span>
                </div>
              )}
              {equipmentSpaces > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>+ {equipmentSpaces} espacios para equipos:</span>
                  <span className="font-medium">${equipmentSpacesPrice.toLocaleString()}</span>
                </div>
              )}
              {includeTransport && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Transporte e imprevistos:</span>
                  <span className="font-medium">${transport.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between">
                <span className="font-bold text-foreground">TOTAL:</span>
                <span className="text-2xl font-bold text-primary">${subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
