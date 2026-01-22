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

export interface ClosetConfig {
  type: "estandar" | "especial" | "empotrado";
  width: number; // metros
  height: number; // metros
  doorType: "corredizas" | "batientes";
  squareMeters: number;
  pricePerSquareMeter: number;
  subtotal: number;
  notes?: string; // Notas adicionales del cliente
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
    description: "Profundidad estándar de 0.60 cm. Incluye: maletero, divisor, doble colgadero, entrepaños, doble cajonero, zapatero y puertas (corredizas o batientes)."
  },
  especial: {
    label: "Closet Especial",
    price: 650000,
    depth: "hasta 0.45 cm",
    description: "Profundidad reducida hasta 0.45 cm o menos. Incluye el mismo equipamiento que el estándar."
  },
  empotrado: {
    label: "Closet Empotrado",
    price: 900000,
    depth: "0.60 cm",
    description: "Gama alta. Armario completo con espaldar, laterales y todo el equipamiento estándar."
  }
};

export function ClosetConfigurator({ config, onChange }: ClosetConfiguratorProps) {
  const [type, setType] = useState<ClosetConfig["type"]>(config?.type || "estandar");
  const [width, setWidth] = useState<string>(config?.width?.toString() || "");
  const [height, setHeight] = useState<string>(config?.height?.toString() || "");
  const [doorType, setDoorType] = useState<ClosetConfig["doorType"]>(config?.doorType || "corredizas");
  const [notes, setNotes] = useState<string>(config?.notes || "");

  useEffect(() => {
    const widthNum = parseFloat(width) || 0;
    const heightNum = parseFloat(height) || 0;
    const squareMeters = widthNum * heightNum;
    const pricePerSquareMeter = CLOSET_TYPES[type].price;
    const subtotal = squareMeters * pricePerSquareMeter;

    const newConfig: ClosetConfig = {
      type,
      width: widthNum,
      height: heightNum,
      doorType,
      squareMeters,
      pricePerSquareMeter,
      subtotal,
      notes
    };

    onChange(newConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, width, height, doorType, notes]);

  const squareMeters = (parseFloat(width) || 0) * (parseFloat(height) || 0);
  const closetType = CLOSET_TYPES[type] || CLOSET_TYPES.estandar;
  const subtotal = squareMeters * closetType.price;

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-4">
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <h4 className="font-semibold text-primary mb-2">Configuración del Closet</h4>
          
          <div className="space-y-4">
            {/* Tipo de Closet */}
            <div>
              <Label htmlFor="closet-type" className="text-sm font-medium">
                Tipo de Closet *
              </Label>
              <Select value={type} onValueChange={(value) => setType(value as ClosetConfig["type"])}>
                <SelectTrigger id="closet-type" className="mt-1.5">
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
              <p className="text-xs text-muted-foreground mt-1.5">
                {closetType.description}
              </p>
            </div>

            {/* Medidas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="closet-width" className="text-sm font-medium">
                  Ancho (metros) *
                </Label>
                <Input
                  id="closet-width"
                  type="number"
                  step="0.01"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Ej: 2.50"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="closet-height" className="text-sm font-medium">
                  Alto (metros) *
                </Label>
                <Input
                  id="closet-height"
                  type="number"
                  step="0.01"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ej: 2.40"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Tipo de Puertas */}
            <div>
              <Label htmlFor="door-type" className="text-sm font-medium">
                Tipo de Puertas *
              </Label>
              <Select value={doorType} onValueChange={(value) => setDoorType(value as ClosetConfig["doorType"])}>
                <SelectTrigger id="door-type" className="mt-1.5">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corredizas">Puertas Corredizas</SelectItem>
                  <SelectItem value="batientes">Puertas Batientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas Adicionales */}
            <div>
              <Label htmlFor="closet-notes" className="text-sm font-medium">
                Notas Adicionales
              </Label>
              <Textarea
                id="closet-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Sin zapatero, con espejo en puertas, acabado especial, etc."
                className="mt-1.5"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Especificaciones adicionales del cliente
              </p>
            </div>

            {/* Resumen de Cálculo */}
            {squareMeters > 0 && (
              <div className="bg-background p-3 rounded border space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Profundidad:</span> {closetType.depth}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Incluye:</span> Maletero, divisor, doble colgadero, entrepaños, doble cajonero, zapatero y puertas ({doorType}).
                </p>
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Área:</span> {squareMeters.toFixed(2)} M²
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Precio/M²:</span> ${closetType.price.toLocaleString()}
                  </p>
                  <p className="text-base font-semibold text-primary mt-1">
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
