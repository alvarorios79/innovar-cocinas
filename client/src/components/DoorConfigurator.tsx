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
import { DoorOpen, Plus, Trash2, Truck } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";

export interface DoorItem {
  id: string;
  type: "batiente" | "corrediza";
  widthRange: "50-85" | "85-110";
  width: number;
  height: number;
  quantity: number;
  hardwareColor: "negro" | "plata";
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

const generateId = () => Math.random().toString(36).substr(2, 9);

const createNewDoor = (defaultPrice = 890000): DoorItem => ({
  id: generateId(),
  type: "batiente",
  widthRange: "50-85",
  width: 80,
  height: 2.10,
  quantity: 1,
  hardwareColor: "negro",
  hasLintel: true,
  location: "",
  notes: "",
  pricePerUnit: defaultPrice,
  lineTotal: defaultPrice,
});

export function DoorConfigurator({ config, onChange }: DoorConfiguratorProps) {
  const { getPrice } = usePricing();

  // Precios dinámicos desde BD (editables en /pricing-config)
  const getDoorPrice = (type: "batiente" | "corrediza", range: "50-85" | "85-110"): number => {
    const codeMap = {
      batiente:  { "50-85": "PUERTA_BATIENTE_50_85",   "85-110": "PUERTA_BATIENTE_85_110"  },
      corrediza: { "50-85": "PUERTA_CORREDIZA_50_85",  "85-110": "PUERTA_CORREDIZA_85_110" },
    };
    return getPrice(codeMap[type][range]);
  };

  const [doors, setDoors] = useState<DoorItem[]>(
    config?.doors && config.doors.length > 0
      ? config.doors.map(d => ({
          ...d,
          quantity: d.quantity || 1,
          lineTotal: d.lineTotal || (d.pricePerUnit * (d.quantity || 1))
        }))
      : [createNewDoor(getPrice("PUERTA_BATIENTE_50_85"))]
  );
  const [notes, setNotes] = useState<string>(config?.notes || "");
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? 150000);

  useEffect(() => {
    const doorsSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
    const subtotal = doorsSubtotal + (includeTransport ? transportCost : 0);
    onChange({ doors, subtotal, includeTransport, transportCost, notes });
  }, [doors, notes, includeTransport, transportCost]);

  const addDoor = () => {
    const price = getDoorPrice("batiente", "50-85");
    setDoors([...doors, createNewDoor(price)]);
  };

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
      updatedDoor.pricePerUnit = getDoorPrice(updatedDoor.type, updatedDoor.widthRange);
      updatedDoor.lineTotal = updatedDoor.pricePerUnit * updatedDoor.quantity;
      return updatedDoor;
    }));
  };

  const totalDoors = doors.reduce((sum, door) => sum + door.quantity, 0);
  const doorsSubtotal = doors.reduce((sum, door) => sum + door.lineTotal, 0);
  const grandTotal = doorsSubtotal + (includeTransport ? transportCost : 0);

  return (
    <Card className="mt-4 border-orange-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-200">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-orange-600" />
            <h4 className="font-bold text-orange-800 text-lg">Configuración de Puertas</h4>
          </div>
          <Button type="button" size="sm" onClick={addDoor} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-1" /> Agregar Puerta
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Lista de puertas */}
          {doors.map((door, index) => (
            <div key={door.id} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              {/* Header de puerta */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-200">
                <h5 className="font-semibold text-orange-700">
                  Puerta {index + 1} - {door.type === "batiente" ? "Batiente" : "Corrediza"}
                </h5>
                {doors.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeDoor(door.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Fila 1: Tipo y Medidas */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Tipo</Label>
                  <Select value={door.type} onValueChange={(v) => updateDoor(door.id, { type: v as "batiente" | "corrediza" })}>
                    <SelectTrigger className="h-10 bg-[#162828]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batiente">Batiente</SelectItem>
                      <SelectItem value="corrediza">Corrediza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Ancho (cm)</Label>
                  <Input 
                    type="number" 
                    min="50" 
                    max="110" 
                    value={door.width || ""} 
                    onChange={(e) => updateDoor(door.id, { width: parseFloat(e.target.value) || 0 })} 
                    className="h-10 bg-[#162828]"
                    placeholder="50-110"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Alto (m)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="1.80" 
                    max="2.40" 
                    value={door.height || ""} 
                    onChange={(e) => updateDoor(door.id, { height: parseFloat(e.target.value) || 0 })} 
                    className="h-10 bg-[#162828]"
                    placeholder="máx 2.40"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Cantidad</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={door.quantity || 1} 
                    onChange={(e) => updateDoor(door.id, { quantity: parseInt(e.target.value) || 1 })} 
                    className="h-10 bg-[#162828]"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Ubicación</Label>
                  <Input 
                    type="text" 
                    value={door.location || ""} 
                    onChange={(e) => updateDoor(door.id, { location: e.target.value })} 
                    placeholder="Ej: Baño"
                    className="h-10 bg-[#162828]"
                  />
                </div>
              </div>

              {/* Fila 2: Accesorios */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Color Accesorios</Label>
                  <Select value={door.hardwareColor} onValueChange={(v) => updateDoor(door.id, { hardwareColor: v as "negro" | "plata" })}>
                    <SelectTrigger className="h-10 bg-[#162828]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negro">Negro</SelectItem>
                      <SelectItem value="plata">Plata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-3 h-10 px-3 bg-[#162828] rounded-md border w-full">
                    <Checkbox 
                      id={`lintel-${door.id}`} 
                      checked={door.hasLintel} 
                      onCheckedChange={(c) => updateDoor(door.id, { hasLintel: c === true })} 
                    />
                    <Label htmlFor={`lintel-${door.id}`} className="text-sm cursor-pointer font-medium">Con Dintel</Label>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-white/85 block mb-2">Notas</Label>
                  <Input 
                    type="text" 
                    value={door.notes || ""} 
                    onChange={(e) => updateDoor(door.id, { notes: e.target.value })} 
                    placeholder="Observaciones..."
                    className="h-10 bg-[#162828]"
                  />
                </div>
              </div>

              {/* Precio de esta puerta */}
              <div className="bg-orange-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-orange-700">
                    <span className="font-medium">{door.type === "batiente" ? "Batiente" : "Corrediza"}</span>
                    <span className="mx-2">•</span>
                    <span>{door.width}cm × {door.height}m</span>
                    <span className="mx-2">•</span>
                    <span>Herrajes {door.hardwareColor === "negro" ? "Negro" : "Plata"}</span>
                    <span className="mx-2">•</span>
                    <span>{door.hasLintel ? "Con dintel" : "Sin dintel"}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-orange-600">
                      ${door.pricePerUnit.toLocaleString()} × {door.quantity}
                    </div>
                    <div className="text-xl font-bold text-orange-800">
                      ${door.lineTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Transporte e Imprevistos */}
          <div className="bg-gray-50 p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="door-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-white/60" />
                  <Label htmlFor="door-transport" className="cursor-pointer font-medium">
                    Incluir Transporte e Imprevistos
                  </Label>
                </div>
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

          {/* Notas generales */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas Generales</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Observaciones generales para todas las puertas..."
              className="bg-[#162828]"
              rows={2}
            />
          </div>

          {/* Resumen Total */}
          <div className="bg-orange-200 p-4 rounded-lg border border-orange-400">
            <h5 className="font-semibold text-orange-800 mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({totalDoors} {totalDoors === 1 ? "puerta" : "puertas"}):</span>
                <span className="font-medium">${doorsSubtotal.toLocaleString()}</span>
              </div>
              {includeTransport && (
                <div className="flex justify-between text-orange-700">
                  <span>+ Transporte e imprevistos:</span>
                  <span className="font-medium">${transportCost.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-orange-400 pt-2 mt-2 flex justify-between">
                <div>
                  <span className="font-bold text-orange-900">TOTAL:</span>
                  <p className="text-xs text-orange-700 mt-1">
                    Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación
                  </p>
                </div>
                <span className="text-2xl font-bold text-orange-900">${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
