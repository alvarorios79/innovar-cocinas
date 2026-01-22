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
import { Plus, Trash2, DoorOpen } from "lucide-react";

// Interfaz para una puerta individual
export interface DoorItem {
  id: string;
  type: "batiente" | "corrediza";
  widthRange: "50-85" | "85-110";
  width: number;
  height: number;
  quantity: number;
  hardwareColor: "aluminio" | "negro";
  hasLintel: boolean;
  location?: string;
  pricePerUnit: number;
  lineTotal: number;
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
    "50-85": { price: 890000, label: "50cm - 85cm" },
    "85-110": { price: 950000, label: "85cm - 110cm" },
  },
  corrediza: {
    "50-85": { price: 1250000, label: "50cm - 85cm" },
    "85-110": { price: 1350000, label: "85cm - 110cm" },
  },
};

const DOOR_TYPES = {
  batiente: { label: "Batiente", fullLabel: "Puerta Batiente" },
  corrediza: { label: "Corrediza", fullLabel: "Puerta Corrediza" },
};

const generateId = () => Math.random().toString(36).substr(2, 9);

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

  useEffect(() => {
    const subtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
    const newConfig: DoorConfig = { doors, subtotal, notes };
    onChange(newConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doors, notes]);

  const addDoor = () => setDoors([...doors, createNewDoor()]);

  const removeDoor = (id: string) => {
    if (doors.length > 1) {
      setDoors(doors.filter(door => door.id !== id));
    }
  };

  const updateDoor = (id: string, updates: Partial<DoorItem>) => {
    setDoors(doors.map(door => {
      if (door.id !== id) return door;
      
      const updatedDoor = { ...door, ...updates };
      
      if (updates.width !== undefined) {
        updatedDoor.widthRange = updates.width <= 85 ? "50-85" : "85-110";
      }
      
      updatedDoor.pricePerUnit = DOOR_PRICES[updatedDoor.type][updatedDoor.widthRange].price;
      updatedDoor.lineTotal = updatedDoor.pricePerUnit * updatedDoor.quantity;
      
      return updatedDoor;
    }));
  };

  const totalDoors = doors.reduce((sum, door) => sum + door.quantity, 0);
  const totalSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-amber-700" />
              <h4 className="font-semibold text-amber-800 text-lg">Configuración de Puertas</h4>
            </div>
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
          
          {/* Lista de puertas */}
          <div className="space-y-4">
            {doors.map((door, index) => (
              <div key={door.id} className="bg-white p-4 rounded-lg border border-amber-300 shadow-sm">
                {/* Encabezado de puerta */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <h5 className="font-semibold text-amber-700 flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-sm">
                      #{index + 1}
                    </span>
                    {DOOR_TYPES[door.type].fullLabel}
                  </h5>
                  {doors.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoor(door.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Primera fila: Tipo, Medidas, Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="lg:col-span-1">
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Tipo de Puerta
                    </Label>
                    <Select 
                      value={door.type} 
                      onValueChange={(value) => updateDoor(door.id, { type: value as DoorItem["type"] })}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batiente">Batiente - $890k</SelectItem>
                        <SelectItem value="corrediza">Corrediza - $1.25M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Ancho (cm)
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="50"
                      max="110"
                      value={door.width || ""}
                      onChange={(e) => updateDoor(door.id, { width: parseFloat(e.target.value) || 0 })}
                      placeholder="80"
                      className="h-10 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Alto (m)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1.80"
                      max="2.40"
                      value={door.height || ""}
                      onChange={(e) => updateDoor(door.id, { height: parseFloat(e.target.value) || 0 })}
                      placeholder="2.10"
                      className="h-10 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Cantidad
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={door.quantity || 1}
                      onChange={(e) => updateDoor(door.id, { quantity: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      className="h-10 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Ubicación
                    </Label>
                    <Input
                      type="text"
                      value={door.location || ""}
                      onChange={(e) => updateDoor(door.id, { location: e.target.value })}
                      placeholder="Ej: Baño, Alcoba"
                      className="h-10 bg-white"
                    />
                  </div>
                </div>

                {/* Segunda fila: Color y Dintel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Color de Accesorios (Chapa, Bisagras, Tope)
                    </Label>
                    <Select 
                      value={door.hardwareColor} 
                      onValueChange={(value) => updateDoor(door.id, { hardwareColor: value as DoorItem["hardwareColor"] })}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluminio">Aluminio (Plateado)</SelectItem>
                        <SelectItem value="negro">Negro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center space-x-3 h-10 px-3 bg-gray-50 rounded-md border">
                      <Checkbox
                        id={`lintel-${door.id}`}
                        checked={door.hasLintel}
                        onCheckedChange={(checked) => updateDoor(door.id, { hasLintel: checked === true })}
                      />
                      <Label htmlFor={`lintel-${door.id}`} className="text-sm font-medium cursor-pointer">
                        Con Dintel (parte superior del marco)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Resumen de precio */}
                <div className="bg-amber-50 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{door.width}cm × {door.height}m</span>
                    <span className="mx-2">•</span>
                    <span>{door.hardwareColor === "aluminio" ? "Aluminio" : "Negro"}</span>
                    <span className="mx-2">•</span>
                    <span>{door.hasLintel ? "Con dintel" : "Sin dintel"}</span>
                    {door.location && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{door.location}</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      ${door.pricePerUnit.toLocaleString()} × {door.quantity}
                    </div>
                    <div className="font-bold text-amber-700 text-lg">
                      ${door.lineTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Notas Adicionales */}
            <div className="mt-4">
              <Label htmlFor="door-notes" className="text-sm font-medium text-gray-700 mb-1.5 block">
                Notas Adicionales
              </Label>
              <Textarea
                id="door-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Colores específicos, acabados especiales, observaciones generales..."
                className="bg-white"
                rows={2}
              />
            </div>

            {/* Resumen Total */}
            <div className="bg-amber-100 p-4 rounded-lg border border-amber-300 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-amber-800 text-lg">
                    Total: {totalDoors} {totalDoors === 1 ? "puerta" : "puertas"}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Incluye: Marco RH, chapa gama alta, bisagras omega, tope de puerta, instalación completa
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-600 uppercase tracking-wide">Subtotal</p>
                  <p className="text-3xl font-bold text-amber-800">
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
