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
import { LayoutGrid, DoorOpen, Truck } from "lucide-react";

export interface ClosetConfig {
  type: "estandar" | "especial" | "empotrado";
  width: number;
  height: number;
  doorType: "corredizas" | "batientes";
  squareMeters: number;
  pricePerSquareMeter: number;
  subtotal: number;
  notes?: string;
  includeTransport?: boolean;
  transportCost?: number;
}

interface ClosetConfiguratorProps {
  config: ClosetConfig | null;
  onChange: (config: ClosetConfig) => void;
}

const CLOSET_TYPES = {
  estandar: {
    label: "Closet Estándar",
    price: 750000,
    depth: "0.60 cm",
    description: "Profundidad estándar de 0.60 cm"
  },
  especial: {
    label: "Closet Especial",
    price: 650000,
    depth: "hasta 0.45 cm",
    description: "Profundidad reducida hasta 0.45 cm"
  },
  empotrado: {
    label: "Closet Empotrado",
    price: 900000,
    depth: "0.60 cm",
    description: "Gama alta con espaldar y laterales"
  }
};

export function ClosetConfigurator({ config, onChange }: ClosetConfiguratorProps) {
  const [type, setType] = useState<ClosetConfig["type"]>(config?.type || "estandar");
  const [width, setWidth] = useState<string>(config?.width?.toString() || "");
  const [height, setHeight] = useState<string>(config?.height?.toString() || "");
  const [doorType, setDoorType] = useState<ClosetConfig["doorType"]>(config?.doorType || "corredizas");
  const [notes, setNotes] = useState<string>(config?.notes || "");
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? 150000);

  useEffect(() => {
    const widthNum = parseFloat(width) || 0;
    const heightNum = parseFloat(height) || 0;
    const squareMeters = widthNum * heightNum;
    const pricePerSquareMeter = CLOSET_TYPES[type].price;
    let subtotal = squareMeters * pricePerSquareMeter;
    
    if (includeTransport) {
      subtotal += transportCost;
    }

    const newConfig: ClosetConfig = {
      type,
      width: widthNum,
      height: heightNum,
      doorType,
      squareMeters,
      pricePerSquareMeter,
      subtotal,
      notes,
      includeTransport,
      transportCost
    };

    onChange(newConfig);
  }, [type, width, height, doorType, notes, includeTransport, transportCost]);

  const squareMeters = (parseFloat(width) || 0) * (parseFloat(height) || 0);
  const closetType = CLOSET_TYPES[type] || CLOSET_TYPES.estandar;
  const baseSubtotal = squareMeters * closetType.price;
  const transport = includeTransport ? transportCost : 0;
  const subtotal = baseSubtotal + transport;

  return (
    <Card className="mt-4 border-blue-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-200">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          <h4 className="font-bold text-blue-800 text-lg">Configuración del Closet</h4>
        </div>

        <div className="space-y-6">
          {/* Tipo de Closet */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-semibold text-blue-700 mb-3">Tipo de Closet</h5>
            <Select value={type} onValueChange={(value) => setType(value as ClosetConfig["type"])}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLOSET_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.label} - ${(info.price / 1000).toFixed(0)}k/M²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 p-3 bg-blue-100 rounded">
              <p className="text-sm text-blue-700">
                <strong>Profundidad:</strong> {closetType.depth}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Incluye:</strong> Maletero, divisor, doble colgadero, entrepaños, doble cajonero, zapatero y puertas
              </p>
            </div>
          </div>

          {/* Medidas */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-700 mb-3">Medidas del Closet</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-2">Ancho (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Ej: 2.50"
                  className="h-10 bg-white"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 block mb-2">Alto (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ej: 2.40"
                  className="h-10 bg-white"
                />
              </div>
            </div>
            {squareMeters > 0 && (
              <div className="mt-3 p-3 bg-gray-100 rounded flex justify-between items-center">
                <span className="text-sm text-gray-700">Área total:</span>
                <span className="font-bold text-gray-800">{squareMeters.toFixed(2)} M²</span>
              </div>
            )}
          </div>

          {/* Tipo de Puertas */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="h-4 w-4 text-gray-600" />
              <h5 className="font-semibold text-gray-700">Tipo de Puertas</h5>
            </div>
            <Select value={doorType} onValueChange={(value) => setDoorType(value as ClosetConfig["doorType"])}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corredizas">Puertas Corredizas</SelectItem>
                <SelectItem value="batientes">Puertas Batientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transporte e Imprevistos */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="closet-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-600" />
                  <Label htmlFor="closet-transport" className="cursor-pointer font-medium">
                    Incluir Transporte e Imprevistos
                  </Label>
                </div>
              </div>
              {includeTransport && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Monto: $</span>
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
            <Label className="text-sm font-medium text-gray-700 block mb-2">Notas Adicionales</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin zapatero, con espejo en puertas, acabado especial, etc."
              className="bg-white"
              rows={2}
            />
          </div>

          {/* Resumen de Precio */}
          {squareMeters > 0 && (
            <div className="bg-blue-200 p-4 rounded-lg border border-blue-400">
              <h5 className="font-semibold text-blue-800 mb-3">Resumen del Precio</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{closetType.label} ({squareMeters.toFixed(2)} M² × ${closetType.price.toLocaleString()}/M²):</span>
                  <span className="font-medium">${baseSubtotal.toLocaleString()}</span>
                </div>
                {includeTransport && (
                  <div className="flex justify-between text-blue-700">
                    <span>+ Transporte e imprevistos:</span>
                    <span className="font-medium">${transport.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-blue-400 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-blue-900">TOTAL:</span>
                  <span className="text-2xl font-bold text-blue-900">${subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
