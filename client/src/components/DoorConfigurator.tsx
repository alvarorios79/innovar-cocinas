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
    <Card className="mt-3 border-amber-200">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-amber-800">Puertas</h4>
          <Button type="button" size="sm" onClick={addDoor} className="bg-amber-600 hover:bg-amber-700 h-8 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Agregar
          </Button>
        </div>
        
        {/* Lista de puertas */}
        <div className="space-y-3">
          {doors.map((door, index) => (
            <div key={door.id} className="bg-amber-50 p-3 rounded border border-amber-200">
              {/* Header de puerta */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700">
                  Puerta {index + 1} - {door.type === "batiente" ? "Batiente" : "Corrediza"}
                </span>
                {doors.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeDoor(door.id)} className="text-red-500 h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Campos en grid compacto */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                <div>
                  <Label className="text-xs text-gray-500">Tipo</Label>
                  <Select value={door.type} onValueChange={(v) => updateDoor(door.id, { type: v as "batiente" | "corrediza" })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batiente">Batiente</SelectItem>
                      <SelectItem value="corrediza">Corrediza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Ancho cm</Label>
                  <Input type="number" min="50" max="110" value={door.width || ""} onChange={(e) => updateDoor(door.id, { width: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Alto m</Label>
                  <Input type="number" step="0.01" min="1.80" max="2.40" value={door.height || ""} onChange={(e) => updateDoor(door.id, { height: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Cantidad</Label>
                  <Input type="number" min="1" value={door.quantity || 1} onChange={(e) => updateDoor(door.id, { quantity: parseInt(e.target.value) || 1 })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Accesorios</Label>
                  <Select value={door.hardwareColor} onValueChange={(v) => updateDoor(door.id, { hardwareColor: v as "aluminio" | "negro" })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aluminio">Aluminio</SelectItem>
                      <SelectItem value="negro">Negro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Ubicación</Label>
                  <Input type="text" value={door.location || ""} onChange={(e) => updateDoor(door.id, { location: e.target.value })} placeholder="Baño, Alcoba..." className="h-8 text-xs" />
                </div>
              </div>

              {/* Dintel y Notas */}
              <div className="flex items-start gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Checkbox id={`lintel-${door.id}`} checked={door.hasLintel} onCheckedChange={(c) => updateDoor(door.id, { hasLintel: c === true })} />
                  <Label htmlFor={`lintel-${door.id}`} className="text-xs cursor-pointer">Con Dintel</Label>
                </div>
                <div className="flex-1">
                  <Input type="text" value={door.notes || ""} onChange={(e) => updateDoor(door.id, { notes: e.target.value })} placeholder="Notas: color, acabado..." className="h-7 text-xs" />
                </div>
              </div>

              {/* Precio */}
              <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-amber-200 text-xs">
                <span className="text-gray-500">${door.pricePerUnit.toLocaleString()} × {door.quantity} =</span>
                <span className="font-bold text-amber-700">${door.lineTotal.toLocaleString()}</span>
              </div>
            </div>
          ))}

          {/* Transporte e Imprevistos */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="door-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <Label htmlFor="door-transport" className="text-xs cursor-pointer font-medium">
                  Incluir Transporte e Imprevistos
                </Label>
              </div>
              {includeTransport && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">$</span>
                  <Input 
                    type="number" 
                    value={transportCost} 
                    onChange={(e) => setTransportCost(parseInt(e.target.value) || 0)} 
                    className="h-7 w-28 text-xs text-right" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notas generales */}
          <div>
            <Label className="text-xs text-gray-600">Notas Generales</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones generales..." className="text-xs h-16" rows={2} />
          </div>

          {/* Total */}
          <div className="bg-amber-100 p-2 rounded border border-amber-300">
            <div className="flex justify-between items-center">
              <div className="text-xs text-amber-700">
                <strong>{totalDoors} {totalDoors === 1 ? "puerta" : "puertas"}</strong>
                <span className="ml-2 text-amber-600">Marco RH, chapa, bisagras, tope, instalación</span>
              </div>
              <div className="text-right">
                {includeTransport && (
                  <div className="text-xs text-gray-500">
                    Puertas: ${doorsSubtotal.toLocaleString()} + Transporte: ${transportCost.toLocaleString()}
                  </div>
                )}
                <div className="text-lg font-bold text-amber-800">${grandTotal.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
