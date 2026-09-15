import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bath } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";

export interface BathroomConfig {
  furnitureType: "flotante" | "piso_con_pata";
  width: number;
  depth: number;
  height: number;
  widthRange: "50-60" | "60-80" | "80-100" | "100-120" | "mayor-120";
  sinkType: "lavamanos_sobreponer" | "excavado";
  hasExcavado: boolean;
  excavadoMaterial: "granito" | "cuarzo" | "sinterizado" | "";
  hasMeson: boolean;
  mesonMaterial: "granito" | "cuarzo" | "sinterizado" | "";
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

export interface BathroomConfiguratorProps {
  config: BathroomConfig | null;
  onChange: (config: BathroomConfig) => void;
}

const PRICE_CODES: Record<string, string> = {
  "50-60":     "BANO_50_60",
  "60-80":     "BANO_60_80",
  "80-100":    "BANO_80_100",
  "100-120":   "BANO_100_120",
  "mayor-120": "BANO_100_120",
};

const FALLBACK: Record<string, number> = {
  "50-60": 750000, "60-80": 900000, "80-100": 1200000, "100-120": 1400000, "mayor-120": 1400000,
};

function getWidthRange(w: number): BathroomConfig["widthRange"] {
  if (w <= 60)  return "50-60";
  if (w <= 80)  return "60-80";
  if (w <= 100) return "80-100";
  if (w <= 120) return "100-120";
  return "mayor-120";
}

function autoHeight(furnitureType: string, sinkType: string): number | null {
  if (furnitureType === "piso_con_pata") return sinkType === "excavado" ? 84 : 75;
  return null;
}

const DEFAULT_CFG: BathroomConfig = {
  furnitureType: "flotante", width: 60, depth: 45, height: 55,
  widthRange: "50-60", sinkType: "lavamanos_sobreponer",
  hasExcavado: false, excavadoMaterial: "", hasMeson: false, mesonMaterial: "",
  quantity: 1, pricePerUnit: 750000, subtotal: 750000,
};

export function BathroomConfigurator({ config, onChange }: BathroomConfiguratorProps) {
  const { getPrice } = usePricing();
  const [cfg, setCfg] = useState<BathroomConfig>(config || DEFAULT_CFG);

  useEffect(() => { if (config) setCfg(config); }, []);

  const getBathroomPrice = (range: BathroomConfig["widthRange"], width: number): number => {
    const base = getPrice(PRICE_CODES[range]) || FALLBACK[range] || 750000;
    if (range === "mayor-120") {
      return Math.round((base * width / 120) / 10000) * 10000;
    }
    return base;
  };

  const update = (updates: Partial<BathroomConfig>) => {
    const next = { ...cfg, ...updates };
    if (updates.width !== undefined) next.widthRange = getWidthRange(updates.width);
    const ah = autoHeight(next.furnitureType, next.sinkType);
    if (ah !== null) next.height = ah;
    next.pricePerUnit = getBathroomPrice(next.widthRange, next.width);
    next.subtotal = next.pricePerUnit * next.quantity;
    setCfg(next);
    onChange(next);
  };

  const isAuto = cfg.furnitureType === "piso_con_pata";
  const ah = autoHeight(cfg.furnitureType, cfg.sinkType);

  return (
    <Card className="mt-4 border-white/[0.15]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.12]">
          <Bath className="h-5 w-5 text-cyan-400" />
          <h4 className="font-bold text-foreground text-lg">Mueble de Ba\u00f1o</h4>
        </div>
        <div className="space-y-4">
          {/* Tipo + Lavabo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de mueble</Label>
              <Select value={cfg.furnitureType} onValueChange={(v) => update({ furnitureType: v as any })}>
                <SelectTrigger className="h-10 bg-[#162828]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flotante">Flotante</SelectItem>
                  <SelectItem value="piso_con_pata">De piso con pata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de lavabo</Label>
              <Select value={cfg.sinkType} onValueChange={(v) => update({ sinkType: v as any })}>
                <SelectTrigger className="h-10 bg-[#162828]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavamanos_sobreponer">Lavamanos de sobreponer</SelectItem>
                  <SelectItem value="excavado">Excavado (integrado en piedra)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Medidas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Ancho (cm)</Label>
              <Input type="number" min="50" step="1" value={cfg.width || ""}
                onChange={(e) => update({ width: parseFloat(e.target.value) || 0 })}
                className="h-10 bg-[#162828]" placeholder="50-120+" />
              <p className="text-xs text-muted-foreground mt-1">Rango: {cfg.widthRange} cm</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Profundidad (cm)</Label>
              <Input type="number" min="42" max="50" step="1" value={cfg.depth || ""}
                onChange={(e) => update({ depth: parseFloat(e.target.value) || 0 })}
                className="h-10 bg-[#162828]" placeholder="42-50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">
                Alto (cm){isAuto ? " (auto)" : ""}
              </Label>
              <Input type="number" min={cfg.furnitureType === "flotante" ? 50 : undefined}
                max={cfg.furnitureType === "flotante" ? 65 : undefined} step="1"
                value={isAuto ? (ah ?? cfg.height) : (cfg.height || "")}
                onChange={(e) => { if (!isAuto) update({ height: parseFloat(e.target.value) || 0 }); }}
                className="h-10 bg-[#162828]" readOnly={isAuto}
                placeholder={cfg.furnitureType === "flotante" ? "50-65" : ""} />
              {isAuto && <p className="text-xs text-muted-foreground mt-1">{cfg.sinkType === "excavado" ? "84 cm (excavado)" : "75 cm (sobreponer)"}</p>}
            </div>
          </div>
          {/* Cantidad */}
          <div className="w-32">
            <Label className="text-sm font-medium text-white/85 block mb-2">Cantidad</Label>
            <Input type="number" min="1" step="1" value={cfg.quantity}
              onChange={(e) => update({ quantity: parseInt(e.target.value) || 1 })}
              className="h-10 bg-[#162828]" />
          </div>
          {/* Add-ons */}
          <div className="border border-white/[0.12] rounded-lg p-3 space-y-4">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Complementos (para cotizar aparte)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="hasExcavado" checked={cfg.hasExcavado}
                  onCheckedChange={(v) => update({ hasExcavado: !!v, excavadoMaterial: v ? (cfg.excavadoMaterial || "granito") : "" })} />
                <Label htmlFor="hasExcavado" className="text-sm cursor-pointer">Lleva excavado (lavamanos integrado en piedra)</Label>
              </div>
              {cfg.hasExcavado && (
                <div className="ml-6">
                  <Select value={cfg.excavadoMaterial} onValueChange={(v) => update({ excavadoMaterial: v as any })}>
                    <SelectTrigger className="h-9 bg-[#162828] w-44"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granito">Granito</SelectItem>
                      <SelectItem value="cuarzo">Cuarzo</SelectItem>
                      <SelectItem value="sinterizado">Sinterizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="hasMeson" checked={cfg.hasMeson}
                  onCheckedChange={(v) => update({ hasMeson: !!v, mesonMaterial: v ? (cfg.mesonMaterial || "granito") : "" })} />
                <Label htmlFor="hasMeson" className="text-sm cursor-pointer">Lleva mes\u00f3n (plancha de piedra + lavamanos sobreponer)</Label>
              </div>
              {cfg.hasMeson && (
                <div className="ml-6">
                  <Select value={cfg.mesonMaterial} onValueChange={(v) => update({ mesonMaterial: v as any })}>
                    <SelectTrigger className="h-9 bg-[#162828] w-44"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granito">Granito</SelectItem>
                      <SelectItem value="cuarzo">Cuarzo</SelectItem>
                      <SelectItem value="sinterizado">Sinterizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas adicionales</Label>
            <Input value={cfg.notes || ""}
              onChange={(e) => update({ notes: e.target.value })}
              className="h-10 bg-[#162828]" placeholder="Observaciones..." />
          </div>
          {/* Resumen */}
          <div className="bg-[#162828] p-4 rounded-lg border border-cyan-500/30">
            <h5 className="font-semibold text-foreground mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-white/60">
                <span>{cfg.width}cm ancho × {cfg.depth}cm prof. × {isAuto ? (ah ?? cfg.height) : cfg.height}cm alto</span>
                <span>Rango {cfg.widthRange} cm</span>
              </div>
              {cfg.widthRange === "mayor-120" && (
                <p className="text-xs text-cyan-400">Precio calculado proporcionalmente (ancho &gt; 120 cm)</p>
              )}
              <div className="flex justify-between">
                <span>Precio unitario (madera):</span>
                <span className="font-medium">${cfg.pricePerUnit.toLocaleString()}</span>
              </div>
              {cfg.quantity > 1 && (
                <div className="flex justify-between">
                  <span>× {cfg.quantity} unidades:</span>
                  <span className="font-medium">${cfg.subtotal.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between items-start">
                <div>
                  <span className="font-bold text-foreground">TOTAL MADERA:</span>
                  <p className="text-xs text-muted-foreground mt-1">Madera aglomerada tipo RH de alta presi\u00f3n, cantos r\u00edgidos en puertas y tapas</p>
                  {cfg.hasExcavado && <p className="text-xs text-cyan-300 mt-0.5">+ Excavado en {cfg.excavadoMaterial} (por cotizar)</p>}
                  {cfg.hasMeson && <p className="text-xs text-cyan-300 mt-0.5">+ Mes\u00f3n en {cfg.mesonMaterial} (por cotizar)</p>}
                </div>
                <span className="text-2xl font-bold text-primary">${cfg.subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
