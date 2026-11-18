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
import { usePricing } from "@/hooks/usePricing";

export interface ClosetConfig {
  type: "estandar" | "premium" | "deluxe" | "especial";
  width: number;
  height: number;
  doorType: "corredizas" | "batientes";
  squareMeters: number;
  pricePerSquareMeter: number;
  subtotal: number;
  notes?: string;
  includeTransport?: boolean;
  transportCost?: number;
  includeDismantle?: boolean;
  dismantlePrice?: number;
  incluyeLed?: boolean;   // luz LED interior del closet
  ledML?: number;         // metros de LED (precio único del Motor: LED_ML)
  ledPrice?: number;
  accessories?: {
    maletero?: boolean;
    divisor?: boolean;
    entrepanos?: boolean;
    doubleCajonero?: boolean;
    zapatero?: boolean;
    dobleColgadero?: boolean;
    espejo?: boolean;
  };
}

interface ClosetConfiguratorProps {
  config: ClosetConfig | null;
  onChange: (config: ClosetConfig) => void;
}

// Los precios por m² salen del Motor de Cotización (códigos CLOSET_*_M2); el valor de aquí es solo la etiqueta y el respaldo.
const CLOSET_CODES: Record<string, string> = { estandar: "CLOSET_ESTANDAR_M2", premium: "CLOSET_PREMIUM_M2", deluxe: "CLOSET_DELUXE_M2", especial: "CLOSET_ESPECIAL_M2" };
const CLOSET_TYPES = {
  estandar: {
    label: "Closet Estándar",
    price: 750000,
    depth: "60 cm",
    description: "Fondo estándar 60 cm"
  },
  premium: {
    label: "Closet Premium",
    price: 900000,
    depth: "60 cm",
    description: "Con espaldar y laterales — gama alta"
  },
  deluxe: {
    label: "Closet Deluxe",
    price: 1100000,
    depth: "60 cm",
    description: "Máxima calidad, acabados exclusivos"
  },
  especial: {
    label: "Closet Especial",
    price: 700000,
    depth: "< 40 cm",
    description: "Fondo reducido menor a 40 cm"
  },
};

export function ClosetConfigurator({ config, onChange }: ClosetConfiguratorProps) {
  const [type, setType] = useState<ClosetConfig["type"]>(config?.type || "estandar");
  const [width, setWidth] = useState<string>(config?.width?.toString() || "");
  const [height, setHeight] = useState<string>(config?.height?.toString() || "");
  const [doorType, setDoorType] = useState<ClosetConfig["doorType"]>(config?.doorType || "corredizas");
  const [notes, setNotes] = useState<string>(config?.notes || "");
  // El transporte ya NO va aquí: se marca una sola vez en la casilla «Incluye transporte e imprevistos» del ítem (no se multiplica por la cantidad).
  const includeTransport = false;
  const transportCost = 0;
  const { getPrice } = usePricing();
  const dismantlePriceNow = getPrice("DESMONTE_CLOSET");
  const [includeDismantle, setIncludeDismantle] = useState<boolean>(config?.includeDismantle ?? false);
  const [incluyeLed, setIncluyeLed] = useState<boolean>(config?.incluyeLed ?? false);
  const [ledText, setLedText] = useState<string>(config?.ledML ? String(config.ledML) : "");
  const ledMetros = parseFloat(ledText) || 0;
  const ledPriceNow = getPrice("LED_ML");

  // Accesorios del closet
  const [accMaletero, setAccMaletero] = useState<boolean>(config?.accessories?.maletero ?? false);
  const [accDivisor, setAccDivisor] = useState<boolean>(config?.accessories?.divisor ?? false);
  const [accEntrepanos, setAccEntrepanos] = useState<boolean>(config?.accessories?.entrepanos ?? false);
  const [accDoubleCajonero, setAccDoubleCajonero] = useState<boolean>(config?.accessories?.doubleCajonero ?? false);
  const [accZapatero, setAccZapatero] = useState<boolean>(config?.accessories?.zapatero ?? false);
  const [accDobleColgadero, setAccDobleColgadero] = useState<boolean>(config?.accessories?.dobleColgadero ?? false);
  const [accEspejo, setAccEspejo] = useState<boolean>(config?.accessories?.espejo ?? false);

  useEffect(() => {
    const widthNum = parseFloat(width) || 0;
    const heightNum = parseFloat(height) || 0;
    const squareMeters = widthNum * heightNum;
    const pricePerSquareMeter = getPrice(CLOSET_CODES[type]) || CLOSET_TYPES[type].price;
    let subtotal = squareMeters * pricePerSquareMeter;

    if (includeTransport) {
      subtotal += transportCost;
    }
    if (includeDismantle) {
      subtotal += dismantlePriceNow;
    }
    if (incluyeLed) {
      subtotal += ledMetros * ledPriceNow;
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
      transportCost,
      includeDismantle,
      dismantlePrice: includeDismantle ? dismantlePriceNow : 0,
      incluyeLed,
      ledML: incluyeLed ? ledMetros : 0,
      ledPrice: incluyeLed ? ledPriceNow : 0,
      accessories: {
        maletero: accMaletero,
        divisor: accDivisor,
        entrepanos: accEntrepanos,
        doubleCajonero: accDoubleCajonero,
        zapatero: accZapatero,
        dobleColgadero: accDobleColgadero,
        espejo: accEspejo,
      },
    };

    onChange(newConfig);
  }, [type, width, height, doorType, notes, includeTransport, transportCost, includeDismantle, dismantlePriceNow, incluyeLed, ledMetros, ledPriceNow, getPrice(CLOSET_CODES[type]),
      accMaletero, accDivisor, accEntrepanos, accDoubleCajonero, accZapatero, accDobleColgadero, accEspejo]);

  const squareMeters = (parseFloat(width) || 0) * (parseFloat(height) || 0);
  const closetBase = CLOSET_TYPES[type] || CLOSET_TYPES.estandar;
  const closetType = { ...closetBase, price: getPrice(CLOSET_CODES[type]) || closetBase.price };
  const baseSubtotal = squareMeters * closetType.price;
  const transport = includeTransport ? transportCost : 0;
  const dismantle = includeDismantle ? dismantlePriceNow : 0;
  const ledTotal = incluyeLed ? ledMetros * ledPriceNow : 0;
  const subtotal = baseSubtotal + transport + dismantle + ledTotal;

  return (
    <Card className="mt-4 border-blue-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/25">
          <LayoutGrid className="h-5 w-5 text-blue-400" />
          <h4 className="font-bold text-blue-300 text-lg">Configuración del Closet</h4>
        </div>

        <div className="space-y-6">
          {/* Tipo de Closet */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/25">
            <h5 className="font-semibold text-blue-300 mb-3">Tipo de Closet</h5>
            <Select value={type} onValueChange={(value) => setType(value as ClosetConfig["type"])}>
              <SelectTrigger className="h-10 bg-card">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLOSET_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.label} - ${((getPrice(CLOSET_CODES[key]) || info.price) / 1000).toFixed(0)}k/M²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 p-3 bg-blue-500/15 rounded">
              <p className="text-sm text-blue-300">
                <strong>Profundidad:</strong> {closetType.depth}
              </p>
              <p className="text-sm text-blue-300 mt-1">
                <strong>Incluye:</strong> Maletero, divisor, doble colgadero, entrepaños, doble cajonero, zapatero y puertas
              </p>
            </div>
          </div>

          {/* Medidas */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <h5 className="font-semibold text-white/85 mb-3">Medidas del Closet</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Ancho (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Ej: 2.50"
                  className="h-10 bg-card"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Alto (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ej: 2.40"
                  className="h-10 bg-card"
                />
              </div>
            </div>
            {squareMeters > 0 && (
              <div className="mt-3 p-3 bg-white/[0.06] rounded flex justify-between items-center">
                <span className="text-sm text-white/85">Área total:</span>
                <span className="font-bold text-foreground">{squareMeters.toFixed(2)} M²</span>
              </div>
            )}
          </div>

          {/* Tipo de Puertas */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="h-4 w-4 text-white/60" />
              <h5 className="font-semibold text-white/85">Tipo de Puertas</h5>
            </div>
            <Select value={doorType} onValueChange={(value) => setDoorType(value as ClosetConfig["doorType"])}>
              <SelectTrigger className="h-10 bg-card">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corredizas">Puertas Corredizas</SelectItem>
                <SelectItem value="batientes">Puertas Batientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accesorios del closet */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/25">
            <h5 className="font-semibold text-blue-300 mb-3">Componentes (para descripción)</h5>
            <p className="text-xs text-blue-400 mb-3">Selecciona los componentes que lleva este closet — se generará la descripción automáticamente.</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { state: accMaletero,       setState: setAccMaletero,       label: "Maletero" },
                { state: accDivisor,        setState: setAccDivisor,        label: "Divisor de ropa" },
                { state: accEntrepanos,     setState: setAccEntrepanos,     label: "Entrepaños" },
                { state: accDoubleCajonero, setState: setAccDoubleCajonero, label: "Doble cajonero" },
                { state: accZapatero,       setState: setAccZapatero,       label: "Zapatero" },
                { state: accDobleColgadero, setState: setAccDobleColgadero, label: "Doble colgadero" },
                { state: accEspejo,         setState: setAccEspejo,         label: "Espejo en puertas" },
              ]).map(({ state, setState, label }) => (
                <div key={label} className="flex items-center gap-2 p-2 bg-card rounded border border-blue-100 hover:border-blue-300 transition-colors">
                  <Checkbox
                    id={`acc-${label}`}
                    checked={state}
                    onCheckedChange={(c) => setState(c === true)}
                  />
                  <Label htmlFor={`acc-${label}`} className="cursor-pointer text-sm text-white/85">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Luz LED interior (opcional) */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)] space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox id="closet-led" className="size-6 border-2" checked={incluyeLed} onCheckedChange={(v) => setIncluyeLed(v === true)} />
              <Label htmlFor="closet-led" className="cursor-pointer font-medium">
                Luz LED interior (${ledPriceNow.toLocaleString()}/ml)
              </Label>
            </div>
            {incluyeLed && (
              <div className="flex items-center gap-2 pl-9">
                <Label className="text-sm text-white/70">Metros de LED:</Label>
                <Input type="number" step="0.1" min="0" value={ledText} onChange={(e) => setLedText(e.target.value)} placeholder="0.0" className="h-9 w-24" />
                <span className="text-sm text-white/60">= ${ledTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Desmonte de closet existente */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center gap-3">
              <Checkbox
                id="closet-dismantle"
                className="size-6 border-2"
                checked={includeDismantle}
                onCheckedChange={(v) => setIncludeDismantle(v === true)}
              />
              <Label htmlFor="closet-dismantle" className="cursor-pointer font-medium">
                Desmonte de closet existente (${dismantlePriceNow.toLocaleString()})
              </Label>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas Adicionales</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin zapatero, con espejo en puertas, acabado especial, etc."
              className="bg-card"
              rows={2}
            />
          </div>

          {/* Resumen de Precio */}
          {squareMeters > 0 && (
            <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-400">
              <h5 className="font-semibold text-blue-300 mb-3">Resumen del Precio</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{closetType.label} ({squareMeters.toFixed(2)} M² × ${closetType.price.toLocaleString()}/M²):</span>
                  <span className="font-medium">${baseSubtotal.toLocaleString()}</span>
                </div>
                {incluyeLed && (
                  <div className="flex justify-between text-blue-300">
                    <span>+ Luz LED ({ledMetros} ml):</span>
                    <span className="font-medium">${ledTotal.toLocaleString()}</span>
                  </div>
                )}
                {includeDismantle && (
                  <div className="flex justify-between text-blue-300">
                    <span>+ Desmonte de closet existente:</span>
                    <span className="font-medium">${dismantle.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-blue-400 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-blue-300">TOTAL:</span>
                  <span className="text-2xl font-bold text-blue-300">${subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
