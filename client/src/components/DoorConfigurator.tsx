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
  notes?: string;
  pricePerUnit: number;
  lineTotal: number;
}

export interface DoorConfig {
  doors: DoorItem[];
  subtotal: number;
  includeTransport: boolean;
  transportCost: number;
  notes?: string;
}

interface DoorConfiguratorProps {
  config: DoorConfig | null;
  onChange: (config: DoorConfig) => void;
}

const DOOR_PRICES = {
  batiente: {
    "50-85": { price: 890000 },
    "85-110": { price: 950000 },
  },
  corrediza: {
    "50-85": { price: 1250000 },
    "85-110": { price: 1350000 },
  },
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
  notes: "",
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
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? 150000);

  useEffect(() => {
    const doorsSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
    const subtotal = doorsSubtotal + (includeTransport ? transportCost : 0);
    onChange({ doors, subtotal, includeTransport, transportCost, notes });
  }, [doors, notes, includeTransport, transportCost]);

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
  const doorsSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
  const grandTotal = doorsSubtotal + (includeTransport ? transportCost : 0);

  return (
    <Card className="mt-4 border-amber-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-200">
          <h4 className="font-bold text-amber-800 text-lg">Configuración de Puertas</h4>
          <Button type="button" size="sm" onClick={addDoor} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-1" /> Agregar Puerta
          </Button>
        </div>
        
        {/* Lista de puertas */}
        <div className="space-y-6">
          {doors.map((door, index) => (
            <div key={door.id} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              {/* Header de puerta */}
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-amber-700 text-base">
                  Puerta {index + 1} - {door.type === "batiente" ? "Batiente" : "Corrediza"}
                </h5>
                {doors.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeDoor(door.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Fila 1: Tipo y Medidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Puerta</Label>
                  <Select value={door.type} onValueChange={(v) => updateDoor(door.id, { type: v as "batiente" | "corrediza" })}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batiente">Batiente - $890k</SelectItem>
                      <SelectItem value="corrediza">Corrediza - $1.25M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Ancho (cm)</Label>
                  <Input 
                    type="number" 
                    min="50" 
                    max="110" 
                    value={door.width || ""} 
                    onChange={(e) => updateDoor(door.id, { width: parseFloat(e.target.value) || 0 })} 
                    className="h-10 bg-white"
                    placeholder="50-110"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Alto (m)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="1.80" 
                    max="2.40" 
                    value={door.height || ""} 
                    onChange={(e) => updateDoor(door.id, { height: parseFloat(e.target.value) || 0 })} 
                    className="h-10 bg-white"
                    placeholder="máx 2.40"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Cantidad</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={door.quantity || 1} 
                    onChange={(e) => updateDoor(door.id, { quantity: parseInt(e.target.value) || 1 })} 
                    className="h-10 bg-white"
                  />
                </div>
              </div>

              {/* Fila 2: Accesorios y Ubicación */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Color Accesorios</Label>
                  <Select value={door.hardwareColor} onValueChange={(v) => updateDoor(door.id, { hardwareColor: v as "aluminio" | "negro" })}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aluminio">Aluminio (Plateado)</SelectItem>
                      <SelectItem value="negro">Negro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">Ubicación</Label>
                  <Input 
                    type="text" 
                    value={door.location || ""} 
                    onChange={(e) => updateDoor(door.id, { location: e.target.value })} 
                    placeholder="Ej: Baño, Alcoba principal"
                    className="h-10 bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2 h-10 px-3 bg-white rounded-md border w-full">
                    <Checkbox 
                      id={`lintel-${door.id}`} 
                      checked={door.hasLintel} 
                      onCheckedChange={(c) => updateDoor(door.id, { hasLintel: c === true })} 
                    />
                    <Label htmlFor={`lintel-${door.id}`} className="text-sm cursor-pointer">Con Dintel</Label>
                  </div>
                </div>
              </div>

              {/* Fila 3: Notas */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700 block mb-2">Notas de esta puerta</Label>
                <Input 
                  type="text" 
                  value={door.notes || ""} 
                  onChange={(e) => updateDoor(door.id, { notes: e.target.value })} 
                  placeholder="Ej: Color específico, acabado especial, observaciones..."
                  className="h-10 bg-white"
                />
              </div>

              {/* Precio */}
              <div className="bg-amber-100 rounded-md p-3 flex justify-between items-center">
                <div className="text-sm text-amber-700">
                  <span className="font-medium">{door.width}cm × {door.height}m</span>
                  <span className="mx-2">|</span>
                  <span>{door.hardwareColor === "aluminio" ? "Aluminio" : "Negro"}</span>
                  <span className="mx-2">|</span>
                  <span>{door.hasLintel ? "Con dintel" : "Sin dintel"}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-amber-600">
                    ${door.pricePerUnit.toLocaleString()} × {door.quantity}
                  </div>
                  <div className="text-xl font-bold text-amber-800">
                    ${door.lineTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Transporte e Imprevistos */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="door-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <Label htmlFor="door-transport" className="text-sm cursor-pointer font-medium">
                  Incluir Transporte e Imprevistos
                </Label>
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

          {/* Notas generales */}
          <div>
            <Label className="text-sm font-medium text-gray-700 block mb-2">Notas Generales</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Observaciones generales para todas las puertas..."
              className="bg-white"
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="bg-amber-200 p-4 rounded-lg border border-amber-400">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-amber-800">
                  Total: {totalDoors} {totalDoors === 1 ? "puerta" : "puertas"}
                </div>
                <div className="text-sm text-amber-700">
                  Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación
                </div>
              </div>
              <div className="text-right">
                {includeTransport && (
                  <div className="text-sm text-amber-700">
                    Puertas: ${doorsSubtotal.toLocaleString()} + Transporte: ${transportCost.toLocaleString()}
                  </div>
                )}
                <div className="text-2xl font-bold text-amber-900">
                  ${grandTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
