import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DoorConfig {
  type: "batiente" | "corrediza";
  widthRange: "50-85" | "85-110";
  width: number; // cm - ancho específico
  height: number; // metros - altura (máx 2.40m)
  quantity: number;
  hardwareColor: "aluminio" | "negro"; // Color de chapa, bisagras y tope
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

interface DoorConfiguratorProps {
  config: DoorConfig | null;
  onChange: (config: DoorConfig) => void;
}

// Precios según tipo y rango de ancho
const DOOR_PRICES = {
  batiente: {
    "50-85": {
      price: 890000,
      label: "50cm - 85cm",
    },
    "85-110": {
      price: 950000,
      label: "85cm - 110cm",
    },
  },
  corrediza: {
    "50-85": {
      price: 1250000,
      label: "50cm - 85cm",
    },
    "85-110": {
      price: 1350000,
      label: "85cm - 110cm",
    },
  },
};

const DOOR_TYPES = {
  batiente: {
    label: "Puerta Batiente",
    description: "Puerta maciza en aglomerado tipo RH con marco, chapa gama alta, bisagras omega y tope de puerta. Totalmente instalada y funcional.",
  },
  corrediza: {
    label: "Puerta Corrediza",
    description: "Puerta corrediza maciza tipo RH con marco RH, sistema de riel, chapa gama alta. Totalmente instalada y funcional.",
  },
};

export function DoorConfigurator({ config, onChange }: DoorConfiguratorProps) {
  const [type, setType] = useState<DoorConfig["type"]>(config?.type || "batiente");
  const [widthRange, setWidthRange] = useState<DoorConfig["widthRange"]>(config?.widthRange || "50-85");
  const [width, setWidth] = useState<string>(config?.width?.toString() || "");
  const [height, setHeight] = useState<string>(config?.height?.toString() || "2.40");
  const [quantity, setQuantity] = useState<string>(config?.quantity?.toString() || "1");
  const [hardwareColor, setHardwareColor] = useState<DoorConfig["hardwareColor"]>(config?.hardwareColor || "aluminio");
  const [notes, setNotes] = useState<string>(config?.notes || "");

  // Determinar rango automáticamente basado en el ancho ingresado
  useEffect(() => {
    const widthNum = parseFloat(width) || 0;
    if (widthNum > 0) {
      if (widthNum <= 85) {
        setWidthRange("50-85");
      } else if (widthNum <= 110) {
        setWidthRange("85-110");
      }
    }
  }, [width]);

  useEffect(() => {
    const widthNum = parseFloat(width) || 0;
    const heightNum = parseFloat(height) || 2.40;
    const quantityNum = parseInt(quantity) || 1;
    const pricePerUnit = DOOR_PRICES[type][widthRange].price;
    const subtotal = pricePerUnit * quantityNum;

    const newConfig: DoorConfig = {
      type,
      widthRange,
      width: widthNum,
      height: heightNum,
      quantity: quantityNum,
      hardwareColor,
      pricePerUnit,
      subtotal,
      notes,
    };

    onChange(newConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, widthRange, width, height, quantity, hardwareColor, notes]);

  const pricePerUnit = DOOR_PRICES[type][widthRange].price;
  const quantityNum = parseInt(quantity) || 1;
  const subtotal = pricePerUnit * quantityNum;
  const doorTypeInfo = DOOR_TYPES[type];

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-4">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-2">Configuración de Puerta</h4>
          
          <div className="space-y-4">
            {/* Tipo de Puerta */}
            <div>
              <Label htmlFor="door-type" className="text-sm font-medium">
                Tipo de Puerta *
              </Label>
              <Select value={type} onValueChange={(value) => setType(value as DoorConfig["type"])}>
                <SelectTrigger id="door-type" className="mt-1.5">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="batiente">
                    Puerta Batiente - desde ${(890000 / 1000).toFixed(0)}k
                  </SelectItem>
                  <SelectItem value="corrediza">
                    Puerta Corrediza - desde ${(1250000 / 1000).toFixed(0)}k
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {doorTypeInfo.description}
              </p>
            </div>

            {/* Medidas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="door-width" className="text-sm font-medium">
                  Ancho (cm) *
                </Label>
                <Input
                  id="door-width"
                  type="number"
                  step="1"
                  min="50"
                  max="110"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Ej: 80"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Rango: 50cm - 110cm
                </p>
              </div>
              <div>
                <Label htmlFor="door-height" className="text-sm font-medium">
                  Alto (metros) *
                </Label>
                <Input
                  id="door-height"
                  type="number"
                  step="0.01"
                  min="1.80"
                  max="2.40"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="2.40"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Altura estándar: hasta 2.40m
                </p>
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <Label htmlFor="door-quantity" className="text-sm font-medium">
                Cantidad de Puertas *
              </Label>
              <Input
                id="door-quantity"
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="mt-1.5 w-32"
              />
            </div>

            {/* Color de Herrajes */}
            <div>
              <Label htmlFor="hardware-color" className="text-sm font-medium">
                Color de Chapa, Bisagras y Tope *
              </Label>
              <Select value={hardwareColor} onValueChange={(value) => setHardwareColor(value as DoorConfig["hardwareColor"])}>
                <SelectTrigger id="hardware-color" className="mt-1.5">
                  <SelectValue placeholder="Selecciona el color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluminio">Aluminio</SelectItem>
                  <SelectItem value="negro">Negro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas Adicionales */}
            <div>
              <Label htmlFor="door-notes" className="text-sm font-medium">
                Notas Adicionales
              </Label>
              <Textarea
                id="door-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Color específico, acabado especial, ubicación, etc."
                className="mt-1.5"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Especificaciones adicionales del cliente
              </p>
            </div>

            {/* Resumen de Cálculo */}
            {parseFloat(width) > 0 && (
              <div className="bg-background p-3 rounded border space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Tipo:</span> {doorTypeInfo.label}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Rango de ancho:</span> {DOOR_PRICES[type][widthRange].label}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Medidas:</span> {width}cm × {height}m
                </p>
                <p className="text-sm">
                  <span className="font-medium">Incluye:</span> Marco RH, chapa gama alta, bisagras omega, tope de puerta ({hardwareColor === "aluminio" ? "color aluminio" : "color negro"}), instalación completa.
                </p>
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Precio unitario:</span> ${pricePerUnit.toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Cantidad:</span> {quantityNum} {quantityNum === 1 ? "puerta" : "puertas"}
                  </p>
                  <p className="text-base font-semibold text-amber-700 mt-1">
                    Subtotal: ${subtotal.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
