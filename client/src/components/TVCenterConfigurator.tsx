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
import { Tv, Lightbulb, Sparkles, Box } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";

export interface TVCenterConfig {
  width: number; // Ancho en metros (base 1.60)
  basePrice: number;
  hasHighGloss: boolean; // Alto brillo
  highGlossPrice: number;
  hasLedLights: boolean; // Luces LED
  ledLightsPrice: number;
  ledMeters?: number; // Metros lineales de LED (abierto: pantalla, mueble flotante, repisas...)
  floatingShelves: number; // Cantidad de repisas flotantes (base 2)
  extraShelvesPrice: number;
  equipmentSpaces: number; // Espacios especiales para equipos
  equipmentSpacesPrice: number;
  includeTransport: boolean;
  transportCost: number;
  notes: string;
  subtotal: number;
  // ── Versión 2 (nov 2026): cotización por casillas. Las cotizaciones antiguas no tienen pricingVersion y conservan su cálculo. ──
  pricingVersion?: number;
  tvInches?: number;              // pulgadas del TV (solo sugiere ancho y se escribe en el PDF)
  alistonadoSides?: number;       // 0, 1 o 2 lados
  alistonadoPrice?: number;
  doors?: number;                 // puertas (incluidas en el precio; se pintan si hay pintura)
  drawerFronts?: number;          // tapas de cajón (incluidas; se pintan si hay pintura)
  hasPainting?: boolean;          // pintura poliuretano
  paintFinish?: "alto_brillo" | "mate";
  paintPrice?: number;
  includeTvBracket?: boolean;     // soporte + instalación del TV
  tvBracketPrice?: number;
  aluminumGlassDoors?: Array<{ id: string; height: number; width: number }>; // puertas de aluminio con vidrio (mismo precio que en cocinas)
  aluminumGlassPrice?: number;
}

interface TVCenterConfiguratorProps {
  config: TVCenterConfig | null;
  onChange: (config: TVCenterConfig) => void;
}

// Precios base
const BASE_WIDTH = 1.60; // metros
const BASE_PRICE = 2800000;
const PRICE_PER_20CM = 500000; // +$500,000 por cada 20cm extra
const HIGH_GLOSS_PRICE = 350000;
const LED_LIGHTS_PRICE = 180000; // por metro lineal (precio único del LED)
const EXTRA_SHELF_PRICE = 100000; // Por cada repisa adicional (base son 2)
const EQUIPMENT_SPACE_PRICE = 150000; // Por cada espacio especial

const WIDTH_OPTIONS = [
  { value: 1.20, label: "1.20m (-$500,000)" },
  { value: 1.40, label: "1.40m (-$250,000)" },
  { value: 1.60, label: "1.60m (Estándar)" },
  { value: 1.80, label: "1.80m (+$500,000)" },
  { value: 2.00, label: "2.00m (+$1,000,000)" },
  { value: 2.20, label: "2.20m (+$1,500,000)" },
  { value: 2.40, label: "2.40m (+$2,000,000)" },
];

function LegacyTVCenterConfigurator({ config, onChange }: TVCenterConfiguratorProps) {
  const [width, setWidth] = useState<number>(config?.width ?? BASE_WIDTH);
  const [hasHighGloss, setHasHighGloss] = useState<boolean>(config?.hasHighGloss ?? false);
  const [hasLedLights, setHasLedLights] = useState<boolean>(config?.hasLedLights ?? false);
  // Cotizaciones antiguas: LED como cargo fijo (sin metros). Se mantiene su precio hasta que se ingresen metros.
  const [legacyLed, setLegacyLed] = useState<boolean>(!!config?.hasLedLights && config?.ledMeters === undefined);
  const [ledMeters, setLedMeters] = useState<number>(config?.ledMeters ?? 0);
  const [ledMetersText, setLedMetersText] = useState<string>(config?.ledMeters ? String(config.ledMeters) : "");
  const [floatingShelves, setFloatingShelves] = useState<number>(config?.floatingShelves ?? 2);
  const [equipmentSpaces, setEquipmentSpaces] = useState<number>(config?.equipmentSpaces ?? 0);
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? 150000);
  const [notes, setNotes] = useState<string>(config?.notes ?? "");

  // Calcular precio base según ancho
  const calculateBasePrice = (w: number): number => {
    const diff = (w - BASE_WIDTH) * 100; // diferencia en cm
    const increments = Math.round(diff / 20); // cada 20cm
    return BASE_PRICE + (increments * PRICE_PER_20CM);
  };

  // Calcular precio de repisas extra (base son 2)
  const calculateExtraShelvesPrice = (shelves: number): number => {
    const extraShelves = Math.max(0, shelves - 2);
    return extraShelves * EXTRA_SHELF_PRICE;
  };

  useEffect(() => {
    const basePrice = calculateBasePrice(width);
    const highGlossPrice = hasHighGloss ? HIGH_GLOSS_PRICE : 0;
    const ledLightsPrice = !hasLedLights ? 0 : (legacyLed ? (config?.ledLightsPrice || LED_LIGHTS_PRICE) : ledMeters * LED_LIGHTS_PRICE);
    const extraShelvesPrice = calculateExtraShelvesPrice(floatingShelves);
    const equipmentSpacesPrice = equipmentSpaces * EQUIPMENT_SPACE_PRICE;
    const transport = includeTransport ? transportCost : 0;

    const subtotal = basePrice + highGlossPrice + ledLightsPrice + extraShelvesPrice + equipmentSpacesPrice + transport;

    onChange({
      width,
      basePrice,
      hasHighGloss,
      highGlossPrice,
      hasLedLights,
      ledLightsPrice,
      ledMeters: legacyLed ? undefined : ledMeters,
      floatingShelves,
      extraShelvesPrice,
      equipmentSpaces,
      equipmentSpacesPrice,
      includeTransport,
      transportCost,
      notes,
      subtotal,
    });
  }, [width, hasHighGloss, hasLedLights, ledMeters, legacyLed, floatingShelves, equipmentSpaces, includeTransport, transportCost, notes]);

  const basePrice = calculateBasePrice(width);
  const highGlossPrice = hasHighGloss ? HIGH_GLOSS_PRICE : 0;
  const ledLightsPrice = !hasLedLights ? 0 : (legacyLed ? (config?.ledLightsPrice || LED_LIGHTS_PRICE) : ledMeters * LED_LIGHTS_PRICE);
  const extraShelvesPrice = calculateExtraShelvesPrice(floatingShelves);
  const equipmentSpacesPrice = equipmentSpaces * EQUIPMENT_SPACE_PRICE;
  const transport = includeTransport ? transportCost : 0;
  const subtotal = basePrice + highGlossPrice + ledLightsPrice + extraShelvesPrice + equipmentSpacesPrice + transport;

  return (
    <Card className="mt-4 border-white/[0.15]">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.12]">
          <Tv className="h-5 w-5 text-purple-400" />
          <h4 className="font-bold text-foreground text-lg">Configuración Centro de TV</h4>
        </div>

        <div className="space-y-6">
          {/* Medidas */}
          <div className="bg-white/[0.04] p-4 rounded-lg border border-white/[0.10]">
            <h5 className="font-semibold text-foreground mb-3">Medidas del Mueble</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Ancho del Mueble</Label>
                <Select value={width.toString()} onValueChange={(v) => setWidth(parseFloat(v))}>
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue placeholder="Seleccionar ancho" />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-white/85 block mb-2">Repisas Flotantes</Label>
                <Select value={floatingShelves.toString()} onValueChange={(v) => setFloatingShelves(parseInt(v))}>
                  <SelectTrigger className="h-10 bg-[#162828]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin repisas</SelectItem>
                    <SelectItem value="1">1 repisa</SelectItem>
                    <SelectItem value="2">2 repisas (incluidas)</SelectItem>
                    <SelectItem value="3">3 repisas (+$100,000)</SelectItem>
                    <SelectItem value="4">4 repisas (+$200,000)</SelectItem>
                    <SelectItem value="5">5 repisas (+$300,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 p-3 bg-[#162828] rounded">
              <p className="text-sm text-purple-300">
                <strong>Incluye:</strong> Mueble flotante, panel para TV con alistonado, {floatingShelves} repisas flotantes
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                Precio base: ${basePrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <h5 className="font-semibold text-white/85 mb-3">Opciones Adicionales</h5>
            
            <div className="space-y-4">
              {/* Alto Brillo */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="high-gloss" 
                    checked={hasHighGloss} 
                    onCheckedChange={(c) => setHasHighGloss(c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="high-gloss" className="cursor-pointer font-medium">
                      Acabado Alto Brillo
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${hasHighGloss ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  +${HIGH_GLOSS_PRICE.toLocaleString()}
                </span>
              </div>

              {/* Luces LED */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="led-lights" 
                    checked={hasLedLights} 
                    onCheckedChange={(c) => setHasLedLights(c === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="led-lights" className="cursor-pointer font-medium">
                      Iluminación LED
                    </Label>
                  </div>
                </div>
                <span className={`font-semibold ${hasLedLights ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  {hasLedLights ? `+$${ledLightsPrice.toLocaleString()}` : `$${LED_LIGHTS_PRICE.toLocaleString()}/ml`}
                </span>
              </div>
              {hasLedLights && (
                <div className="flex items-center gap-3 pl-10 -mt-2">
                  <Label className="text-sm text-white/60">Metros lineales de LED (pantalla, mueble flotante, repisas):</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ledMetersText}
                    onChange={(e) => {
                      setLedMetersText(e.target.value);
                      setLedMeters(parseFloat(e.target.value) || 0);
                      setLegacyLed(false);
                    }}
                    className="h-8 w-24 text-center"
                    placeholder="0.00"
                  />
                  <span className="text-sm">ml × ${LED_LIGHTS_PRICE.toLocaleString()}</span>
                </div>
              )}

              {/* Espacios para equipos */}
              <div className="flex items-center justify-between p-3 bg-[#162828] rounded border">
                <div className="flex items-center gap-3">
                  <Box className="h-4 w-4 text-blue-500" />
                  <div>
                    <Label className="font-medium">Espacios para Equipos</Label>
                    <p className="text-xs text-white/45">Consolas, decodificadores, etc.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={equipmentSpaces.toString()} onValueChange={(v) => setEquipmentSpaces(parseInt(v))}>
                    <SelectTrigger className="h-9 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className={`font-semibold min-w-[100px] text-right ${equipmentSpaces > 0 ? 'text-purple-400' : 'text-muted-foreground'}`}>
                    +${equipmentSpacesPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transporte e Imprevistos */}
          <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="tv-transport" 
                  checked={includeTransport} 
                  onCheckedChange={(c) => setIncludeTransport(c === true)} 
                />
                <Label htmlFor="tv-transport" className="cursor-pointer font-medium">
                  Incluir Transporte e Imprevistos
                </Label>
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

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas Adicionales</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Especificaciones adicionales, colores, ubicación de equipos, etc."
              className="bg-[#162828]"
              rows={2}
            />
          </div>

          {/* Resumen de Precio */}
          <div className="bg-[#162828] p-4 rounded-lg border border-purple-500/30">
            <h5 className="font-semibold text-foreground mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Mueble flotante {width}m + panel + {floatingShelves} repisas:</span>
                <span className="font-medium">${basePrice.toLocaleString()}</span>
              </div>
              {hasHighGloss && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Alto brillo:</span>
                  <span className="font-medium">${highGlossPrice.toLocaleString()}</span>
                </div>
              )}
              {hasLedLights && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Iluminación LED{!legacyLed && ledMeters > 0 ? ` (${ledMeters} ml)` : ""}:</span>
                  <span className="font-medium">${ledLightsPrice.toLocaleString()}</span>
                </div>
              )}
              {floatingShelves > 2 && (
                <div className="flex justify-between text-purple-400">
                  <span>+ {floatingShelves - 2} repisas extra:</span>
                  <span className="font-medium">${extraShelvesPrice.toLocaleString()}</span>
                </div>
              )}
              {equipmentSpaces > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>+ {equipmentSpaces} espacios para equipos:</span>
                  <span className="font-medium">${equipmentSpacesPrice.toLocaleString()}</span>
                </div>
              )}
              {includeTransport && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Transporte e imprevistos:</span>
                  <span className="font-medium">${transport.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between">
                <span className="font-bold text-foreground">TOTAL:</span>
                <span className="text-2xl font-bold text-primary">${subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// VERSIÓN 2 — cotización por casillas (precios desde el Motor de Cotización)
// ═════════════════════════════════════════════════════════════════════════════
const V2_WIDTHS = [1.20, 1.40, 1.60, 1.80, 2.00, 2.20, 2.40];
const TV_INCHES = [32, 40, 43, 50, 55, 58, 60, 65, 70, 75, 85];
const tvWidthM = (inches: number) => inches * 0.0254 * 0.8716; // ancho real de un TV 16:9

export function TVCenterConfigurator(props: TVCenterConfiguratorProps) {
  // Cotizaciones guardadas antes de la versión 2 siguen con su cálculo original.
  if (props.config && props.config.pricingVersion !== 2) return <LegacyTVCenterConfigurator {...props} />;
  return <TVCenterConfiguratorV2 {...props} />;
}

function TVCenterConfiguratorV2({ config, onChange }: TVCenterConfiguratorProps) {
  const { getPrice } = usePricing();
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

  const [tvInches, setTvInches] = useState<number>(config?.tvInches ?? 0);
  const [width, setWidth] = useState<number>(config?.width ?? 1.6);
  const [floatingShelves, setFloatingShelves] = useState<number>(config?.floatingShelves ?? 2);
  const [alistonadoSides, setAlistonadoSides] = useState<number>(config?.alistonadoSides ?? 1);
  const [doors, setDoors] = useState<number>(config?.doors ?? 0);
  const [drawerFronts, setDrawerFronts] = useState<number>(config?.drawerFronts ?? 0);
  const [glassDoors, setGlassDoors] = useState<Array<{ id: string; h: string; w: string }>>(
    (config?.aluminumGlassDoors || []).map((d) => ({ id: d.id, h: d.height ? String(d.height) : "", w: d.width ? String(d.width) : "" }))
  );
  const [hasGlass, setHasGlass] = useState<boolean>((config?.aluminumGlassDoors?.length ?? 0) > 0);
  const [hasPainting, setHasPainting] = useState<boolean>(config?.hasPainting ?? false);
  const [paintFinish, setPaintFinish] = useState<"alto_brillo" | "mate">(config?.paintFinish ?? "alto_brillo");
  const [hasLedLights, setHasLedLights] = useState<boolean>(config?.hasLedLights ?? false);
  const [ledMeters, setLedMeters] = useState<number>(config?.ledMeters ?? 0);
  const [ledMetersText, setLedMetersText] = useState<string>(config?.ledMeters ? String(config.ledMeters) : "");
  const [includeTvBracket, setIncludeTvBracket] = useState<boolean>(config?.includeTvBracket ?? false);
  const [includeTransport, setIncludeTransport] = useState<boolean>(config?.includeTransport ?? false);
  const [transportCost, setTransportCost] = useState<number>(config?.transportCost ?? getPrice("TV_CENTER_TRANSPORTE"));
  const [notes, setNotes] = useState<string>(config?.notes ?? "");

  const base160 = getPrice("TV2_BASE");
  const per20 = getPrice("TV2_PER_20CM");
  const priceForWidth = (w: number) => base160 + Math.round(((w - 1.6) * 100) / 20) * per20;
  const alistLado = getPrice("TV2_ALISTONADO_LADO");
  const shelfExtra = getPrice("TV_CENTER_REPISA");
  const paintDoor = getPrice("PINTADO_INF");
  const paintDrawer = getPrice("PINTADO_CAJON");
  const paintShelf = getPrice("TV2_PINTADO_REPISA");
  const ledPrice = getPrice("TV_CENTER_LED");
  const bracketPrice = getPrice("TV2_SOPORTE_INSTALACION");
  const glassM2Price = getPrice("ACABADO_ALUMINIO_VIDRIO_M2");
  const hingePairPrice = getPrice("ACABADO_BISAGRA_PAR");
  const glassList = hasGlass
    ? glassDoors.map((d) => ({ id: d.id, height: parseFloat(d.h) || 0, width: parseFloat(d.w) || 0 }))
    : [];
  const hingesFor = (h: number) => (h > 1.4 ? 2 : h > 0.8 ? 1 : 0);
  const aluminumGlassPrice = glassList.reduce((a, d) => a + d.height * d.width * glassM2Price + hingesFor(d.height) * hingePairPrice, 0);

  const basePrice = priceForWidth(width);
  const alistonadoPrice = alistonadoSides * alistLado;
  const extraShelvesPrice = Math.max(0, floatingShelves - 2) * shelfExtra;
  const paintPrice = hasPainting ? doors * paintDoor + drawerFronts * paintDrawer + floatingShelves * paintShelf : 0;
  const ledLightsPrice = hasLedLights ? ledMeters * ledPrice : 0;
  const tvBracketPrice = includeTvBracket ? bracketPrice : 0;
  const transport = includeTransport ? transportCost : 0;
  const subtotal = basePrice + alistonadoPrice + extraShelvesPrice + paintPrice + aluminumGlassPrice + ledLightsPrice + tvBracketPrice + transport;

  useEffect(() => {
    onChange({
      pricingVersion: 2,
      aluminumGlassDoors: glassList, aluminumGlassPrice,
      width, basePrice, tvInches: tvInches || undefined,
      alistonadoSides, alistonadoPrice,
      doors, drawerFronts,
      hasPainting, paintFinish, paintPrice,
      hasHighGloss: false, highGlossPrice: 0,
      hasLedLights, ledLightsPrice, ledMeters,
      floatingShelves, extraShelvesPrice,
      equipmentSpaces: 0, equipmentSpacesPrice: 0,
      includeTvBracket, tvBracketPrice,
      includeTransport, transportCost,
      notes, subtotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, tvInches, alistonadoSides, glassDoors, hasGlass, glassM2Price, hingePairPrice, doors, drawerFronts, hasPainting, paintFinish, hasLedLights, ledMeters, floatingShelves, includeTvBracket, includeTransport, transportCost, notes, base160, per20, alistLado, shelfExtra, paintDoor, paintDrawer, paintShelf, ledPrice, bracketPrice]);

  const tvW = tvInches ? tvWidthM(tvInches) : 0;
  const minSuggested = tvW ? V2_WIDTHS.find((w) => w >= tvW + 0.3) ?? V2_WIDTHS[V2_WIDTHS.length - 1] : 0;
  const widthLabel = (w: number) => {
    const diff = priceForWidth(w) - base160;
    return `${w.toFixed(2)} m ${diff === 0 ? "(base)" : diff > 0 ? `(+${fmt(diff)})` : `(-${fmt(-diff)})`}`;
  };
  const sel = "h-9 rounded bg-[#0C1A1A] border border-white/15 text-sm text-white px-2";
  const row = "flex items-center justify-between p-3 bg-[#162828] rounded border gap-3";
  const count = (v: number, set: (n: number) => void, max = 8) => (
    <select className={sel} value={v} onChange={(e) => set(parseInt(e.target.value))}>
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
    </select>
  );

  return (
    <Card className="mt-4 border-white/[0.15]">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.12]">
          <Tv className="h-5 w-5 text-purple-400" />
          <h4 className="font-bold text-foreground text-lg">Configuración Centro de TV</h4>
        </div>

        {/* TV y medidas */}
        <div className="bg-white/[0.04] p-4 rounded-lg border border-white/[0.10] space-y-3">
          <h5 className="font-semibold text-foreground">TV y medidas del mueble</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm text-white/85 block mb-1">Pulgadas del TV</Label>
              <select className={sel + " w-full"} value={tvInches} onChange={(e) => setTvInches(parseInt(e.target.value))}>
                <option value={0}>Sin definir</option>
                {TV_INCHES.map((i) => <option key={i} value={i}>{i}"</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm text-white/85 block mb-1">Ancho del mueble</Label>
              <select className={sel + " w-full"} value={width} onChange={(e) => setWidth(parseFloat(e.target.value))}>
                {V2_WIDTHS.map((w) => <option key={w} value={w}>{widthLabel(w)}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm text-white/85 block mb-1">Repisas flotantes (2 incluidas)</Label>
              <select className={sel + " w-full"} value={floatingShelves} onChange={(e) => setFloatingShelves(parseInt(e.target.value))}>
                {[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}{n > 2 ? ` (+${fmt((n - 2) * shelfExtra)})` : ""}</option>)}
              </select>
            </div>
          </div>
          {tvW > 0 && (
            <p className={`text-xs ${width < tvW + 0.2 ? "text-amber-300" : "text-white/50"}`}>
              Un TV de {tvInches}" mide cerca de {tvW.toFixed(2)} m de ancho. Ancho de mueble sugerido: {minSuggested.toFixed(2)} m o más.
              {width < tvW + 0.2 ? " El ancho elegido queda muy justo." : ""}
            </p>
          )}
          <p className="text-sm text-purple-300"><strong>Incluye:</strong> mueble flotante, panel para TV, repisas, bisagras y rieles de cierre lento. Precio base: <strong>{fmt(basePrice)}</strong></p>
        </div>

        {/* Alistonado */}
        <div className={row}>
          <div>
            <Label className="font-medium">Alistonado</Label>
            <p className="text-xs text-white/45">{fmt(alistLado)} por lado (lados cuando la pared es grande)</p>
          </div>
          <div className="flex items-center gap-2">
            <select className={sel} value={alistonadoSides} onChange={(e) => setAlistonadoSides(parseInt(e.target.value))}>
              <option value={0}>Sin alistonado</option>
              <option value={1}>1 lado</option>
              <option value={2}>2 lados</option>
            </select>
            <span className={`font-semibold min-w-[90px] text-right ${alistonadoSides ? "text-purple-400" : "text-muted-foreground"}`}>{fmt(alistonadoPrice)}</span>
          </div>
        </div>

        {/* Puertas y cajones */}
        <div className="bg-white/[0.03] p-4 rounded-lg border border-[rgba(106,207,199,0.12)] space-y-2">
          <h5 className="font-semibold text-white/85">Puertas y cajones <span className="text-xs font-normal text-white/40">(incluidos en el precio del mueble)</span></h5>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-white/80">Puertas {count(doors, setDoors)}</label>
            <label className="flex items-center gap-2 text-sm text-white/80">Tapas de cajón {count(drawerFronts, setDrawerFronts)}</label>
          </div>
        </div>

        {/* Puertas de aluminio con vidrio (mismas de cocinas / acabados especiales) */}
        <div className={row + " flex-col items-stretch"}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox id="tv2-glass" checked={hasGlass} onCheckedChange={(c) => {
                const on = c === true; setHasGlass(on);
                if (on && glassDoors.length === 0) setGlassDoors([{ id: `door-${Date.now()}`, h: "", w: "" }]);
              }} />
              <Label htmlFor="tv2-glass" className="cursor-pointer font-medium">Puertas de aluminio con vidrio ({fmt(glassM2Price)}/m²)</Label>
            </div>
            <span className={`font-semibold ${hasGlass ? "text-purple-400" : "text-muted-foreground"}`}>{fmt(aluminumGlassPrice)}</span>
          </div>
          {hasGlass && (
            <div className="pl-8 space-y-2">
              <p className="text-xs text-white/45">Bisagras adicionales: +1 par si el alto pasa de 80 cm, +2 pares si pasa de 140 cm ({fmt(hingePairPrice)}/par)</p>
              {glassDoors.map((d, i) => {
                const h = parseFloat(d.h) || 0, w = parseFloat(d.w) || 0;
                const m2 = Math.round(h * w * 100) / 100;
                return (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className="text-xs text-purple-400">#{i + 1}</span>
                    <Input type="text" inputMode="decimal" placeholder="Alto (m)" value={d.h} className="h-8 w-24 text-center"
                      onChange={(e) => setGlassDoors((prev) => prev.map((x) => x.id === d.id ? { ...x, h: e.target.value } : x))} />
                    <span className="text-white/40">×</span>
                    <Input type="text" inputMode="decimal" placeholder="Ancho (m)" value={d.w} className="h-8 w-24 text-center"
                      onChange={(e) => setGlassDoors((prev) => prev.map((x) => x.id === d.id ? { ...x, w: e.target.value } : x))} />
                    <span className="text-xs text-white/60 min-w-[70px]">{m2.toFixed(2)} m²{hingesFor(h) > 0 ? ` +${hingesFor(h)} par` : ""}</span>
                    <button type="button" className="text-red-400 text-xs px-2" onClick={() => setGlassDoors((prev) => prev.filter((x) => x.id !== d.id))}>Quitar</button>
                  </div>
                );
              })}
              <button type="button" className="text-xs text-purple-300 border border-purple-500/30 rounded px-2 py-1"
                onClick={() => setGlassDoors((prev) => [...prev, { id: `door-${Date.now()}`, h: "", w: "" }])}>+ Agregar puerta</button>
            </div>
          )}
        </div>

        {/* Pintura */}
        <div className={row + " flex-col items-stretch"}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox id="tv2-paint" checked={hasPainting} onCheckedChange={(c) => setHasPainting(c === true)} />
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <Label htmlFor="tv2-paint" className="cursor-pointer font-medium">Pintura poliuretano</Label>
            </div>
            <span className={`font-semibold ${hasPainting ? "text-purple-400" : "text-muted-foreground"}`}>{fmt(paintPrice)}</span>
          </div>
          {hasPainting && (
            <div className="pl-8 space-y-1">
              <div className="flex items-center gap-4 text-sm text-white/80">
                <label className="flex items-center gap-1"><input type="radio" checked={paintFinish === "alto_brillo"} onChange={() => setPaintFinish("alto_brillo")} /> Alto brillo</label>
                <label className="flex items-center gap-1"><input type="radio" checked={paintFinish === "mate"} onChange={() => setPaintFinish("mate")} /> Mate</label>
              </div>
              <p className="text-xs text-white/45">
                {doors} puerta(s) × {fmt(paintDoor)} + {drawerFronts} tapa(s) de cajón × {fmt(paintDrawer)} + {floatingShelves} repisa(s) × {fmt(paintShelf)}
              </p>
              {doors + drawerFronts + floatingShelves === 0 && <p className="text-xs text-amber-300">No hay piezas para pintar: agrega puertas, tapas de cajón o repisas.</p>}
            </div>
          )}
        </div>

        {/* LED */}
        <div className={row + " flex-col items-stretch"}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox id="tv2-led" checked={hasLedLights} onCheckedChange={(c) => setHasLedLights(c === true)} />
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <Label htmlFor="tv2-led" className="cursor-pointer font-medium">Iluminación LED ({fmt(ledPrice)}/ml)</Label>
            </div>
            <span className={`font-semibold ${hasLedLights ? "text-purple-400" : "text-muted-foreground"}`}>{fmt(ledLightsPrice)}</span>
          </div>
          {hasLedLights && (
            <div className="flex items-center gap-3 pl-8">
              <Label className="text-sm text-white/60">Metros lineales (pantalla, mueble, repisas):</Label>
              <Input type="number" step="0.01" min="0" value={ledMetersText} placeholder="0.00" className="h-8 w-24 text-center"
                onChange={(e) => { setLedMetersText(e.target.value); setLedMeters(parseFloat(e.target.value) || 0); }} />
            </div>
          )}
        </div>

        {/* Soporte e instalación del TV */}
        <div className={row}>
          <div className="flex items-center gap-3">
            <Checkbox id="tv2-bracket" checked={includeTvBracket} onCheckedChange={(c) => setIncludeTvBracket(c === true)} />
            <div>
              <Label htmlFor="tv2-bracket" className="cursor-pointer font-medium">Soporte e instalación del TV</Label>
              <p className="text-xs text-white/45">El soporte del TV y su instalación se cobran aparte</p>
            </div>
          </div>
          <span className={`font-semibold ${includeTvBracket ? "text-purple-400" : "text-muted-foreground"}`}>{fmt(bracketPrice)}</span>
        </div>

        {/* Transporte */}
        <div className={row}>
          <div className="flex items-center gap-3">
            <Checkbox id="tv2-transport" checked={includeTransport} onCheckedChange={(c) => setIncludeTransport(c === true)} />
            <Label htmlFor="tv2-transport" className="cursor-pointer font-medium">Incluir transporte e imprevistos</Label>
          </div>
          {includeTransport && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">$</span>
              <Input type="number" value={transportCost} onChange={(e) => setTransportCost(parseInt(e.target.value) || 0)} className="h-9 w-32 text-right" />
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-white/85 block mb-1">Notas adicionales</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Especificaciones adicionales, colores, etc." className="bg-[#162828]" rows={2} />
        </div>

        {/* Resumen */}
        <div className="bg-[#162828] p-4 rounded-lg border border-purple-500/30 text-sm space-y-1">
          <h5 className="font-semibold text-foreground mb-2">Resumen del precio</h5>
          <div className="flex justify-between"><span>Mueble flotante {width.toFixed(2)} m + panel + 2 repisas:</span><span>{fmt(basePrice)}</span></div>
          {alistonadoSides > 0 && <div className="flex justify-between text-purple-400"><span>+ Alistonado ({alistonadoSides} lado{alistonadoSides > 1 ? "s" : ""}):</span><span>{fmt(alistonadoPrice)}</span></div>}
          {extraShelvesPrice > 0 && <div className="flex justify-between text-purple-400"><span>+ {floatingShelves - 2} repisa(s) extra:</span><span>{fmt(extraShelvesPrice)}</span></div>}
          {aluminumGlassPrice > 0 && <div className="flex justify-between text-purple-400"><span>+ Puertas aluminio y vidrio ({glassList.length}):</span><span>{fmt(aluminumGlassPrice)}</span></div>}
          {hasPainting && <div className="flex justify-between text-purple-400"><span>+ Pintura poliuretano {paintFinish === "mate" ? "mate" : "alto brillo"}:</span><span>{fmt(paintPrice)}</span></div>}
          {hasLedLights && <div className="flex justify-between text-purple-400"><span>+ LED ({ledMeters} ml):</span><span>{fmt(ledLightsPrice)}</span></div>}
          {includeTvBracket && <div className="flex justify-between text-purple-400"><span>+ Soporte e instalación del TV:</span><span>{fmt(tvBracketPrice)}</span></div>}
          {includeTransport && <div className="flex justify-between text-purple-400"><span>+ Transporte e imprevistos:</span><span>{fmt(transport)}</span></div>}
          <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between">
            <span className="font-bold">TOTAL:</span><span className="text-2xl font-bold text-primary">{fmt(subtotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
