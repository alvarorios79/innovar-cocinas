import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bath } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";
import { InputM, fm } from "@/components/InputMetros";
import { precioPiedraML } from "@shared/mesonPrecios";
import { precioMuebleBano, precioMesonBano, precioExcavadoBano, ANCHO_MIN_DOS_POCETAS, POCETA_EXTRA_RESPALDO, POCETA_RESPALDO, MUEBLE_FIJO_RESPALDO, MUEBLE_ML_RESPALDO } from "@shared/banoPrecios";

export interface BathroomConfig {
  furnitureType: "flotante" | "piso_con_pata";
  width: number;   // cm
  depth: number;   // cm
  height: number;  // cm
  widthRange: "50-60" | "60-80" | "80-100" | "100-120" | "mayor-120"; // solo informativo (cotizaciones viejas); el precio ya NO va por rangos
  sinkType: "lavamanos_sobreponer" | "excavado";
  includeMadera: boolean;
  hasExcavado: boolean;
  excavadoMaterial: "granito" | "cuarzo" | "sinterizado" | "";
  hasMeson: boolean;
  mesonMaterial: "granito" | "cuarzo" | "sinterizado" | "";
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
  pocetas?: 1 | 2;        // excavado: desde 1,30 m puede llevar 2 pocetas (la segunda cobra el 30 %)
  frentes?: number;       // (cotizaciones anteriores) cantidad de frentes sin distinguir cajones y puertas
  cajones?: number;       // cantidad de cajones (llevan rieles)
  puertas?: number;       // cantidad de puertas de almacenamiento (llevan bisagras en acero inoxidable de cierre lento)
  entrepanos?: number;    // cantidad de entrepaños (repisas internas)
  gola?: boolean;         // sistema gola (sin manijas)
  caladoU?: boolean;      // calado en U en los cajones superiores para desagües y llaves de paso
  rielesFull?: boolean;   // rieles de extensión total
  bisagrasInox?: boolean; // (cotizaciones anteriores) bisagras en acero inoxidable; ahora salen solas cuando hay puertas
  descripcionManual?: boolean; // la descripción del ítem se editó a mano: no se regenera sola (lo maneja la cotización)
}

export interface BathroomConfiguratorProps {
  config: BathroomConfig | null;
  onChange: (config: BathroomConfig) => void;
}

function getWidthRange(w: number): BathroomConfig["widthRange"] {
  if (w <= 60)  return "50-60";
  if (w <= 80)  return "60-80";
  if (w <= 100) return "80-100";
  if (w <= 120) return "100-120";
  return "mayor-120";
}

// Alto sugerido (se puede cambiar): flotante ≈ 55 cm · de piso con pata ≈ 75 cm (84 cm si lleva el excavado)
function alturaSugerida(furnitureType: string, sinkType: string): number {
  if (furnitureType === "piso_con_pata") return sinkType === "excavado" ? 84 : 75;
  return 55;
}

const DEFAULT_CFG: BathroomConfig = {
  furnitureType: "flotante", width: 60, depth: 45, height: 55,
  widthRange: "50-60", sinkType: "lavamanos_sobreponer",
  includeMadera: true,
  hasExcavado: false, excavadoMaterial: "", hasMeson: false, mesonMaterial: "",
  quantity: 1, pricePerUnit: 750000, subtotal: 750000,
};

export function BathroomConfigurator({ config, onChange }: BathroomConfiguratorProps) {
  const { getPrice } = usePricing();
  const [cfg, setCfg] = useState<BathroomConfig>({ ...DEFAULT_CFG, ...config });

  useEffect(() => {
    if (config) { setCfg({ ...DEFAULT_CFG, ...config }); }
    else {
      // Recién elegido el tipo: se avisa a la cotización con los valores iniciales (antes quedaba en $0 y sin configuración hasta tocar algo)
      const first = { ...DEFAULT_CFG };
      first.pricePerUnit = getBathroomPrice(first.width, first.depth);
      first.subtotal = first.pricePerUnit * first.quantity;
      setCfg(first);
      onChange(first);
    }
  }, []);

  const muebleFijo = getPrice("BANO_MUEBLE_FIJO") || MUEBLE_FIJO_RESPALDO;
  const muebleMl = getPrice("BANO_MUEBLE_ML") || MUEBLE_ML_RESPALDO;
  const pocetaPrecio = getPrice("BANO_POCETA") || POCETA_RESPALDO;
  const getBathroomPrice = (width: number, depth: number): number => precioMuebleBano(muebleFijo, muebleMl, width, depth);

  const excavadoDe = (next: BathroomConfig) => {
    if (!next.hasExcavado || !next.excavadoMaterial) return { uno: 0, segunda: 0, total: 0 };
    return precioExcavadoBano(next.excavadoMaterial, next.width, next.depth, next.pocetas === 2 ? 2 : 1, pocetaPrecio, getPrice("BANO_POCETA_EXTRA") || POCETA_EXTRA_RESPALDO);
  };
  const calcExcavadoTotal = (next: BathroomConfig): number => excavadoDe(next).total * next.quantity;
  const calcMesonTotal = (next: BathroomConfig): number =>
    next.hasMeson && next.mesonMaterial ? precioMesonBano(next.mesonMaterial, next.width, next.depth) * next.quantity : 0;

  const update = (updates: Partial<BathroomConfig>) => {
    const next = { ...cfg, ...updates };
    next.widthRange = getWidthRange(next.width);
    // Si cambia el tipo de mueble o de lavabo, el alto se sugiere de nuevo (después se puede cambiar a mano)
    if (updates.furnitureType !== undefined || updates.sinkType !== undefined) next.height = alturaSugerida(next.furnitureType, next.sinkType);
    if (next.width < ANCHO_MIN_DOS_POCETAS || !next.hasExcavado) next.pocetas = 1; // 2 pocetas solo desde 1,30 m
    next.pricePerUnit = getBathroomPrice(next.width, next.depth);
    const woodTotal = (next.includeMadera !== false) ? next.pricePerUnit * next.quantity : 0;
    next.subtotal = woodTotal + calcExcavadoTotal(next) + calcMesonTotal(next);
    setCfg(next);
    onChange(next);
  };

  // Un solo selector: sobreponer sin piedra · sobreponer con mesón de piedra · excavado (piedra con el lavamanos integrado)
  const lavabo: "sobreponer" | "meson" | "excavado" = cfg.hasExcavado || cfg.sinkType === "excavado" ? "excavado" : cfg.hasMeson ? "meson" : "sobreponer";
  const elegirLavabo = (v: "sobreponer" | "meson" | "excavado") => {
    if (v === "excavado") update({ sinkType: "excavado", hasExcavado: true, excavadoMaterial: cfg.excavadoMaterial || "cuarzo", hasMeson: false, mesonMaterial: "" });
    else if (v === "meson") update({ sinkType: "lavamanos_sobreponer", hasExcavado: false, excavadoMaterial: "", hasMeson: true, mesonMaterial: cfg.mesonMaterial || "granito", pocetas: 1 });
    else update({ sinkType: "lavamanos_sobreponer", hasExcavado: false, excavadoMaterial: "", hasMeson: false, mesonMaterial: "", pocetas: 1 });
  };

  const woodTotal = (cfg.includeMadera !== false) ? cfg.pricePerUnit * cfg.quantity : 0;
  const exc = excavadoDe(cfg);
  const excTotal = exc.total * cfg.quantity;
  const mesTotal = calcMesonTotal(cfg);
  const fondoPiedraTxt = cfg.depth > 90 ? "×2 (más de 0,90 m de fondo)" : cfg.depth > 60 ? "+30 % (fondo de 0,61 a 0,90 m)" : "fondo normal (hasta 0,60 m)";

  return (
    <Card className="mt-4 border-white/[0.15]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.12]">
          <Bath className="h-5 w-5 text-primary" />
          <h4 className="font-bold text-foreground text-lg">Mueble de Baño</h4>
        </div>
        <div className="space-y-4">
          {/* Tipo de mueble + lavabo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Tipo de mueble</Label>
              <Select value={cfg.furnitureType} onValueChange={(v) => update({ furnitureType: v as any })}>
                <SelectTrigger className="h-10 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flotante">Flotante (alto ≈ 0,55 m)</SelectItem>
                  <SelectItem value="piso_con_pata">De piso con pata (alto ≈ 0,75 m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Lavamanos y piedra</Label>
              <Select value={lavabo} onValueChange={(v) => elegirLavabo(v as any)}>
                <SelectTrigger className="h-10 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sobreponer">Lavamanos de sobreponer (sin piedra)</SelectItem>
                  <SelectItem value="meson">Mesón de piedra para lavamanos de sobreponer</SelectItem>
                  <SelectItem value="excavado">Excavado (lavamanos integrado en la piedra)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Medidas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Ancho (m)</Label>
              <InputM valorCm={cfg.width || undefined} onCm={(cm) => update({ width: cm || 0 })} placeholder="Ej: 0,60" className="h-10 bg-card" />
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Fondo (m)</Label>
              <InputM valorCm={cfg.depth || undefined} onCm={(cm) => update({ depth: cm || 0 })} placeholder="Ej: 0,45" className="h-10 bg-card" />
            </div>
            <div>
              <Label className="text-sm font-medium text-white/85 block mb-2">Alto (m)</Label>
              <InputM valorCm={cfg.height || undefined} onCm={(cm) => update({ height: cm || 0 })} placeholder="Ej: 0,55" className="h-10 bg-card" />
            </div>
          </div>
          {((cfg.width > 0 && cfg.width < 30) || (cfg.depth > 0 && cfg.depth < 30)) && (
            <p className="text-xs text-amber-300 -mt-2">Revise las medidas: un mueble de baño de menos de 0,30 m de ancho o de fondo es poco común.</p>
          )}
          <p className="text-xs text-muted-foreground -mt-2">
            Las medidas van en metros (ej. 2,55). Mueble de madera: ${muebleFijo.toLocaleString()} fijos + ${muebleMl.toLocaleString()} por metro de ancho (0,60 × 0,45 m = ${precioMuebleBano(muebleFijo, muebleMl, 60, 45).toLocaleString()}); el fondo suma proporcional hasta 0,60 m y +30 % de 0,61 a 0,90 m. El alto no cambia el precio.
            El alto no cambia el precio.
          </p>

          {/* Cantidad */}
          <div className="w-32">
            <Label className="text-sm font-medium text-white/85 block mb-2">Cantidad</Label>
            <Input type="number" min="1" step="1" value={cfg.quantity}
              onChange={(e) => update({ quantity: parseInt(e.target.value) || 1 })}
              className="h-10 bg-card" />
          </div>

          {/* Componentes a cotizar */}
          <div className="border border-white/[0.12] rounded-lg p-3 space-y-4">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Componentes a cotizar</p>

            {/* Madera */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="includeMadera" checked={cfg.includeMadera !== false}
                    onCheckedChange={(v) => update({ includeMadera: !!v })} />
                  <Label htmlFor="includeMadera" className="text-sm cursor-pointer">Mueble de madera (carcasa)</Label>
                </div>
                {cfg.includeMadera !== false && (
                  <span className="text-sm font-medium text-white/80">${woodTotal.toLocaleString()}</span>
                )}
              </div>
              {cfg.includeMadera !== false && (
                <p className="text-xs text-muted-foreground ml-6">
                  {fm(cfg.width)} × {fm(cfg.depth)} m = ${cfg.pricePerUnit.toLocaleString()} por mueble × {cfg.quantity} ud
                </p>
              )}
            </div>

            {/* Piedra: excavado o mesón */}
            {lavabo !== "sobreponer" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{lavabo === "excavado" ? "Excavado (lavamanos integrado en piedra)" : "Mesón de piedra (con perforación para el lavamanos)"}</Label>
                  <span className="text-sm font-medium text-white/80">${(lavabo === "excavado" ? excTotal : mesTotal).toLocaleString()}</span>
                </div>
                <div className="ml-1 space-y-2">
                  <Select value={lavabo === "excavado" ? cfg.excavadoMaterial : cfg.mesonMaterial}
                    onValueChange={(v) => update(lavabo === "excavado" ? { excavadoMaterial: v as any } : { mesonMaterial: v as any })}>
                    <SelectTrigger className="h-9 bg-card w-48"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granito">Granito</SelectItem>
                      <SelectItem value="cuarzo">Cuarzo</SelectItem>
                      <SelectItem value="sinterizado">Sinterizado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {lavabo === "excavado"
                      ? `Piedra $${precioPiedraML(cfg.excavadoMaterial || "granito").toLocaleString()}/ml × ${(cfg.width / 100).toFixed(2)} m (${fondoPiedraTxt}) + poceta $${pocetaPrecio.toLocaleString()}`
                      : `$${precioPiedraML(cfg.mesonMaterial || "granito").toLocaleString()}/ml (igual que los mesones de cocina) × ${(cfg.width / 100).toFixed(2)} m · ${fondoPiedraTxt}`}
                    {" "}— incluye regrueso en los vistos y salpicadero de 10 cm.
                  </p>
                  {lavabo === "excavado" && cfg.width >= ANCHO_MIN_DOS_POCETAS && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Pocetas:</Label>
                      <Select value={String(cfg.pocetas === 2 ? 2 : 1)} onValueChange={(v) => update({ pocetas: v === "2" ? 2 : 1 })}>
                        <SelectTrigger className="h-9 bg-card w-64"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 poceta</SelectItem>
                          <SelectItem value="2">2 pocetas (la 2.ª se cobra aparte)</SelectItem>
                        </SelectContent>
                      </Select>
                      {cfg.pocetas === 2 && <span className="text-xs text-muted-foreground">2.ª poceta: ${(exc.segunda * cfg.quantity).toLocaleString()}</span>}
                    </div>
                  )}
                  {lavabo === "excavado" && cfg.width < ANCHO_MIN_DOS_POCETAS && (
                    <p className="text-xs text-muted-foreground">Desde 1,30 m de ancho el excavado puede llevar 2 pocetas.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Detalles que salen en la descripción (no cambian el precio) */}
          <div className="border border-white/[0.12] rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Detalles del mueble (salen en la descripción)</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { k: "cajones", label: "Cajones", ph: "Ej: 6" },
                { k: "puertas", label: "Puertas", ph: "Ej: 2" },
                { k: "entrepanos", label: "Entrepaños", ph: "Ej: 1" },
              ] as Array<{ k: "cajones" | "puertas" | "entrepanos"; label: string; ph: string }>).map(({ k, label, ph }) => (
                <div key={k}>
                  <Label className="text-sm block mb-1">{label}</Label>
                  <Input type="number" min="0" step="1" value={cfg[k] ?? ""} placeholder={ph}
                    onChange={(e) => update({ [k]: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value) || 0) } as any)}
                    className="h-9" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Los cajones llevan rieles. Las puertas de almacenamiento llevan bisagras en acero inoxidable de cierre lento (salen solas en la descripción).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { k: "gola", label: "Sistema gola (sin manijas)" },
                { k: "rielesFull", label: "Rieles de extensión total (full extension)" },
                ...(lavabo === "excavado" ? [{ k: "caladoU", label: "Calado en U en los cajones superiores (desagües y llaves)" }] : []),
              ] as Array<{ k: "gola" | "rielesFull" | "caladoU"; label: string }>).map(({ k, label }) => (
                <div key={k} className="flex items-center gap-2">
                  <Checkbox id={`bano-${k}`} checked={!!cfg[k]} onCheckedChange={(v) => update({ [k]: v === true } as any)} />
                  <Label htmlFor={`bano-${k}`} className="text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium text-white/85 block mb-2">Notas adicionales</Label>
            <Input value={cfg.notes || ""}
              onChange={(e) => update({ notes: e.target.value })}
              className="h-10 bg-card" placeholder="Observaciones..." />
          </div>

          {/* Resumen */}
          <div className="bg-card p-4 rounded-lg border border-primary/30">
            <h5 className="font-semibold text-foreground mb-3">Resumen del Precio</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-white/60">
                <span>{fm(cfg.width)} m ancho × {fm(cfg.depth)} m fondo × {fm(cfg.height)} m alto</span>
                <span>× {cfg.quantity} ud</span>
              </div>
              {cfg.includeMadera !== false && (
                <div className="flex justify-between">
                  <span>Mueble de madera:</span>
                  <span className="font-medium">${woodTotal.toLocaleString()}</span>
                </div>
              )}
              {cfg.hasExcavado && excTotal > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Excavado en {cfg.excavadoMaterial} (piedra + poceta):</span>
                    <span className="font-medium">${(exc.uno * cfg.quantity).toLocaleString()}</span>
                  </div>
                  {exc.segunda > 0 && (
                    <div className="flex justify-between">
                      <span>2.ª poceta (valor fijo):</span>
                      <span className="font-medium">${(exc.segunda * cfg.quantity).toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {cfg.hasMeson && mesTotal > 0 && (
                <div className="flex justify-between">
                  <span>Mesón en {cfg.mesonMaterial}:</span>
                  <span className="font-medium">${mesTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between items-start">
                <div>
                  <span className="font-bold text-foreground">TOTAL:</span>
                  <p className="text-xs text-muted-foreground mt-1">Madera aglomerada tipo RH de alta presión, cantos rígidos</p>
                  {cfg.hasExcavado && cfg.excavadoMaterial && <p className="text-xs text-teal-300 mt-0.5">Excavado con regrueso en los vistos y salpicadero de 10 cm — llave/grifería no incluida</p>}
                  {cfg.hasMeson && cfg.mesonMaterial && <p className="text-xs text-teal-300 mt-0.5">Mesón con regrueso en los vistos, salpicadero de 10 cm y perforación para el lavamanos — lavamanos y grifería no incluidos</p>}
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
