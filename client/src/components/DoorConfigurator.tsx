import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// Interfaz para una puerta individual
export interface DoorItem {
  id: string;
  type: "batiente" | "corrediza";
  widthRange: "50-85" | "85-110";
  width: number; // cm - ancho específico
  height: number; // metros - altura (máx 2.40m)
  quantity: number; // Cantidad de puertas iguales
  hardwareColor: "aluminio" | "negro";
  hasLintel: boolean; // Dintel (parte superior del marco)
  location?: string; // Ubicación: baño, alcoba, etc.
  pricePerUnit: number;
  lineTotal: number; // pricePerUnit × quantity
}

// Interfaz para la configuración completa de puertas
export interface DoorConfig {
  doors: DoorItem[];
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
    description: "Puerta maciza en aglomerado tipo RH con marco, chapa gama alta, bisagras omega y tope de puerta.",
  },
  corrediza: {
    label: "Puerta Corrediza",
    description: "Puerta corrediza maciza tipo RH con marco RH, sistema de riel, chapa gama alta.",
  },
};

// Generar ID único para cada puerta
const generateId = () => Math.random().toString(36).substr(2, 9);

// Crear una puerta nueva con valores por defecto
const createNewDoor = (): DoorItem => ({
  id: generateId(),
  type: "batiente",
  widthRange: "50-85",
  width: 80,
  height: 2.10,
  quantity: 1,
  hardwareColor: "aluminio",
  hasLintel: true,
  location: "",
  pricePerUnit: 890000,
  lineTotal: 890000,
});

export function DoorConfigurator({ config, onChange }: DoorConfiguratorProps) {
  const [doors, setDoors] = useState<DoorItem[]>(
    config?.doors && config.doors.length > 0 
      ? config.doors.map(d => ({
          ...d,
          quantity: d.quantity || 1,
          lineTotal: d.lineTotal || (d.pricePerUnit * (d.quantity || 1))
        }))
      : [createNewDoor()]
  );
  const [notes, setNotes] = useState<string>(config?.notes || "");

  // Calcular subtotal y notificar cambios
  useEffect(() => {
    const subtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
    
    const newConfig: DoorConfig = {
      doors,
      subtotal,
      notes,
    };

    onChange(newConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doors, notes]);

  // Agregar nueva puerta
  const addDoor = () => {
    setDoors([...doors, createNewDoor()]);
  };

  // Eliminar puerta
  const removeDoor = (id: string) => {
    if (doors.length > 1) {
      setDoors(doors.filter(door => door.id !== id));
    }
  };

  // Actualizar puerta específica
  const updateDoor = (id: string, updates: Partial<DoorItem>) => {
    setDoors(doors.map(door => {
      if (door.id !== id) return door;
      
      const updatedDoor = { ...door, ...updates };
      
      // Recalcular rango de ancho si cambió el ancho
      if (updates.width !== undefined) {
        if (updates.width <= 85) {
          updatedDoor.widthRange = "50-85";
        } else {
          updatedDoor.widthRange = "85-110";
        }
      }
      
      // Recalcular precio unitario
      updatedDoor.pricePerUnit = DOOR_PRICES[updatedDoor.type][updatedDoor.widthRange].price;
      
      // Recalcular total de línea
      updatedDoor.lineTotal = updatedDoor.pricePerUnit * updatedDoor.quantity;
      
      return updatedDoor;
    }));
  };

  const totalDoors = doors.reduce((sum, door) => sum + door.quantity, 0);
  const totalSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);

  return (
    <Card className="mt-4">
      <CardContent className="pt-6 space-y-4">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-amber-800">Configuración de Puertas</h4>
            <Button
              type="button"
              size="sm"
              onClick={addDoor}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar Puerta
            </Button>
          </div>
          
          <div className="space-y-4">
            {doors.map((door, index) => (
              <div key={door.id} className="bg-white p-4 rounded-lg border border-amber-300 relative">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-amber-700">
                    Puerta #{index + 1}
                  </h5>
                  {doors.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoor(door.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Tipo de Puerta */}
                  <div>
                    <Label className="text-xs font-medium">Tipo *</Label>
                    <Select 
                      value={door.type} 
                      onValueChange={(value) => updateDoor(door.id, { type: value as DoorItem["type"] })}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batiente">Batiente</SelectItem>
                        <SelectItem value="corrediza">Corrediza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ancho */}
                  <div>
                    <Label className="text-xs font-medium">Ancho (cm) *</Label>
                    <Input
                      type="number"
                      step="1"
                      min="50"
                      max="110"
                      value={door.width || ""}
                      onChange={(e) => updateDoor(door.id, { width: parseFloat(e.target.value) || 0 })}
                      placeholder="80"
                      className="mt-1 h-9"
                    />
                  </div>

                  {/* Alto */}
                  <div>
                    <Label className="text-xs font-medium">Alto (m) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1.80"
                      max="2.40"
                      value={door.height || ""}
                      onChange={(e) => updateDoor(door.id, { height: parseFloat(e.target.value) || 0 })}
                      placeholder="2.10"
                      className="mt-1 h-9"
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <Label className="text-xs font-medium">Cantidad *</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={door.quantity || 1}
                      onChange={(e) => updateDoor(door.id, { quantity: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      className="mt-1 h-9"
                    />
                  </div>

                  {/* Color de Herrajes */}
                  <div>
                    <Label className="text-xs font-medium">Color Accesorios *</Label>
                    <Select 
                      value={door.hardwareColor} 
                      onValueChange={(value) => updateDoor(door.id, { hardwareColor: value as DoorItem["hardwareColor"] })}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluminio">Aluminio</SelectItem>
                        <SelectItem value="negro">Negro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ubicación */}
                  <div>
                    <Label className="text-xs font-medium">Ubicación</Label>
                    <Input
                      type="text"
                      value={door.location || ""}
                      onChange={(e) => updateDoor(door.id, { location: e.target.value })}
                      placeholder="Ej: Baño, Alcoba"
                      className="mt-1 h-9"
                    />
                  </div>

                  {/* Dintel */}
                  <div className="flex items-end pb-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`lintel-${door.id}`}
                        checked={door.hasLintel}
                        onCheckedChange={(checked) => updateDoor(door.id, { hasLintel: checked === true })}
                      />
                      <Label htmlFor={`lintel-${door.id}`} className="text-xs font-medium cursor-pointer">
                        Con Dintel
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Resumen de la puerta */}
                <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {DOOR_TYPES[door.type].label} | {door.width}cm × {door.height}m | 
                    {door.hardwareColor === "aluminio" ? " Aluminio" : " Negro"} | 
                    {door.hasLintel ? " Con dintel" : " Sin dintel"}
                    {door.location && ` | ${door.location}`}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      ${door.pricePerUnit.toLocaleString()} × {door.quantity}
                    </div>
                    <div className="font-semibold text-amber-700">
                      ${door.lineTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Notas Adicionales */}
            <div>
              <Label htmlFor="door-notes" className="text-sm font-medium">
                Notas Adicionales
              </Label>
              <Textarea
                id="door-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Colores específicos, acabados especiales, observaciones generales..."
                className="mt-1.5"
                rows={2}
              />
            </div>

            {/* Resumen Total */}
            <div className="bg-amber-100 p-4 rounded-lg border border-amber-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-800">
                    Total: {totalDoors} {totalDoors === 1 ? "puerta" : "puertas"}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Incluye: Marco RH, chapa gama alta, bisagras omega, tope de puerta, instalación completa
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-800">
                    ${totalSubtotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
