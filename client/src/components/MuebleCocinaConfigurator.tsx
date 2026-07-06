import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice } from "@/lib/formatters";
import { Textarea } from "@/components/ui/textarea";
import { Hammer, Calculator, Refrigerator, LayoutGrid, UtensilsCrossed, Paintbrush } from "lucide-react";

// ── Precios ─────────────────────────────────────────────────────────────────
const PRECIOS = {
  // Madera
  ISLA_MADERA_ML:         1200000,
  MUEBLE_ALTO_ML:          900000,
  MUEBLE_ALTO_LED_ML:     1000000,
  MUEBLE_BAJO_ML:         1100000,
  // LED
  LED_ML:                  220000,
  // Barra
  BARRA_PEDESTAL:          250000,
  BARRA_HERRAJE:           380000,
  // Mesón materiales
  MESON_GRANITO:           700000,
  MESON_CUARZO:            850000,
  MESON_SINTERIZADO:      1200000,
  // Recargos mesón
  RECARGO_FONDO_30:            1.3,
  RECARGO_FONDO_DOBLE:         2.0,
  // Lavaplatos
  PEGADO_LAVAPLATOS:        50000,
  // Piezas fijas
  NICHO_NEVECON:          1200000,
  NICHO_NEVERA:           1200000,
  ALACENA_ENTREPANOS:     1250000,
  ALACENA_HERRAJE:         900000,
  TORRE_HORNOS:           1350000,
  // Pintado alto brillo
  PINTADO_SUPERIOR:        120000,
  PINTADO_INFERIOR:        150000,
  PINTADO_ALACENA:         250000,
  PINTADO_CAJON:            80000,
  PINTADO_ESPECIERO:       100000,
  PINTADO_GOLA:             45000,
};

// ── Tipos ────────────────────────────────────────────────────────────────────
export type TipoPieza =
  | "isla"
  | "barra"
  | "mueble_alto"
  | "mueble_bajo"
  | "nicho_nevecon"
  | "nicho_nevera"
  | "alacena_entrepanos"
  | "alacena_herraje"
  | "torre_hornos";

export type MaterialMeson = "granito" | "cuarzo" | "sinterizado";
export type TipoBarra    = "con_lateral" | "solo_arriba";

export interface PintadoPuertas {
  superiores: number;
  inferiores: number;
  alacena:    number;
  cajon:      number;
  especiero:  number;
  gola:       number;
}

export interface ModulosDescriptivos {
  // Muebles altos
  esquineroSuperior?:    boolean;
  moduloExtractor?:      boolean;
  moduloMicroondas?:     boolean;
  especiero?:            boolean;
  botellero?:            boolean;
  moduloRepisa?:         boolean;
  moduloAlmacSup?:       boolean;
  // Muebles bajos
  esquinero1x1?:         boolean;
  cajoneroTriple?:       boolean;
  cajoneroDoble?:        boolean;
  basurero?:             boolean;
  moduloEstufaHorno?:    boolean;
  moduloAlmacInf?:       boolean;
}

export interface MuebleCocinaConfig {
  tipoPieza: TipoPieza;

  // Alacena con herraje — precio editable del herraje
  alacenaHerrajePrecio: number;

  // Madera (isla, muebles altos, muebles bajos)
  madreraML: number;

  // LED (muebles altos)
  incluyeLed:  boolean;
  ledML:       number;

  // Mesón (isla, barra)
  incluyeMeson:              boolean;
  mesonMaterial:             MaterialMeson;
  mesonML:                   number;
  mesonFondo:                number;
  mesonIncluyeLaterales:     boolean;
  mesonIncluyeRegrueso:      boolean;
  mesonIncluyeSalpicaderoAlto: boolean;

  // Barra
  barraTipo:          TipoBarra;
  barraAlturaLateral: number;

  // Lavaplatos (isla, barra, mesón)
  incluyeLavaplatos: boolean;
  lavaprecio:        number;

  // Barra estructura
  incluyePedestal: boolean;
  incluyeHerraje:  boolean;

  // Módulos descriptivos (sin precio propio)
  modulosDescriptivos: ModulosDescriptivos;

  // Pintado puertas alto brillo
  incluyePintado: boolean;
  pintadoPuertas: PintadoPuertas;

  notas: string;

  // Calculados
  subtotalMadera:    number;
  subtotalLed:       number;
  subtotalMeson:     number;
  subtotalLavaplatos: number;
  subtotalPedestal:  number;
  subtotalHerraje:   number;
  subtotalPintado:   number;
  total:             number;
}

// ── Valores por defecto ──────────────────────────────────────────────────────
export function defaultMuebleCocinaConfig(tipo: TipoPieza = "isla"): MuebleCocinaConfig {
  return {
    tipoPieza:   tipo,
    alacenaHerrajePrecio: 0,
    madreraML:   1,
    incluyeLed:  false,
    ledML:       1,
    incluyeMeson:              tipo === "isla" || tipo === "barra",
    mesonMaterial:             "cuarzo",
    mesonML:                   1,
    mesonFondo:                60,
    mesonIncluyeLaterales:     tipo === "isla",
    mesonIncluyeRegrueso:      tipo === "isla",
    mesonIncluyeSalpicaderoAlto: false,
    barraTipo:          "con_lateral",
    barraAlturaLateral: 90,
    incluyeLavaplatos: false,
    lavaprecio:        0,
    incluyePedestal: tipo === "barra",
    incluyeHerraje:  tipo === "barra",
    modulosDescriptivos: {},
    incluyePintado: false,
    pintadoPuertas: { superiores: 0, inferiores: 0, alacena: 0, cajon: 0, especiero: 0, gola: 0 },
    notas: "",
    subtotalMadera:    0,
    subtotalLed:       0,
    subtotalMeson:     0,
    subtotalLavaplatos: 0,
    subtotalPedestal:  0,
    subtotalHerraje:   0,
    subtotalPintado:   0,
    total:             0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMultiplicadorFondo(fondo: number): number {
  if (fondo >= 66 && fondo <= 90)  return PRECIOS.RECARGO_FONDO_30;
  if (fondo >= 91 && fondo <= 120) return PRECIOS.RECARGO_FONDO_DOBLE;
  return 1;
}

function precioMesonML(material: MaterialMeson): number {
  if (material === "granito")     return PRECIOS.MESON_GRANITO;
  if (material === "sinterizado") return PRECIOS.MESON_SINTERIZADO;
  return PRECIOS.MESON_CUARZO;
}

const PRECIO_PIEZA_FIJA: Partial<Record<TipoPieza, number>> = {
  nicho_nevecon:      PRECIOS.NICHO_NEVECON,
  nicho_nevera:       PRECIOS.NICHO_NEVERA,
  alacena_entrepanos: PRECIOS.ALACENA_ENTREPANOS,
  alacena_herraje:    PRECIOS.ALACENA_HERRAJE,
  torre_hornos:       PRECIOS.TORRE_HORNOS,
};

export function esPiezaFija(tipo: TipoPieza): boolean {
  return tipo in PRECIO_PIEZA_FIJA;
}

// ── Cálculo principal ────────────────────────────────────────────────────────
export function calcularMuebleCocina(cfg: MuebleCocinaConfig): MuebleCocinaConfig {
  const c = { ...cfg };

  // Piezas fijas (precio estático)
  if (esPiezaFija(c.tipoPieza)) {
    c.subtotalMadera    = 0;
    c.subtotalLed       = 0;
    c.subtotalMeson     = 0;
    c.subtotalLavaplatos = 0;
    c.subtotalPedestal  = 0;
    c.subtotalHerraje   = 0;
    c.subtotalPintado   = 0;
    const basePrice = PRECIO_PIEZA_FIJA[c.tipoPieza] ?? 0;
    // Alacena herraje: base + precio editable del herraje
    const extraHerraje = (c.tipoPieza === "alacena_herraje" && c.alacenaHerrajePrecio > 0)
      ? c.alacenaHerrajePrecio : 0;
    c.subtotalHerraje = extraHerraje;
    c.total = basePrice + extraHerraje;
    return c;
  }

  const mult     = getMultiplicadorFondo(c.mesonFondo);
  const precioMat = precioMesonML(c.mesonMaterial);

  // Madera
  if (c.tipoPieza === "isla") {
    c.subtotalMadera = c.madreraML * PRECIOS.ISLA_MADERA_ML;
  } else if (c.tipoPieza === "mueble_alto") {
    c.subtotalMadera = c.madreraML * (c.incluyeLed ? PRECIOS.MUEBLE_ALTO_LED_ML : PRECIOS.MUEBLE_ALTO_ML);
  } else if (c.tipoPieza === "mueble_bajo") {
    c.subtotalMadera = c.madreraML * PRECIOS.MUEBLE_BAJO_ML;
  } else {
    c.subtotalMadera = 0; // barra
  }

  // LED
  c.subtotalLed = (c.tipoPieza === "mueble_alto" && c.incluyeLed) ? c.ledML * PRECIOS.LED_ML : 0;

  // Mesón
  if (c.incluyeMeson || c.tipoPieza === "barra") {
    let base = c.mesonML * precioMat * mult;

    if (c.tipoPieza === "isla") {
      const lat  = c.mesonIncluyeLaterales ? 1.8 * precioMat * mult : 0;
      const reg  = c.mesonIncluyeRegrueso  ? 0.9 * precioMat       : 0;
      c.subtotalMeson = base + lat + reg;
    } else if (c.tipoPieza === "barra") {
      let lateral = 0;
      if (c.barraTipo === "con_lateral" && c.barraAlturaLateral > 0) {
        lateral = (c.barraAlturaLateral / 100) * precioMat * mult;
      }
      const salp = c.mesonIncluyeSalpicaderoAlto ? base : 0;
      c.subtotalMeson = base + lateral + salp;
    } else {
      const salp = c.mesonIncluyeSalpicaderoAlto ? base : 0;
      c.subtotalMeson = base + salp;
    }
  } else {
    c.subtotalMeson = 0;
  }

  // Lavaplatos
  c.subtotalLavaplatos = c.incluyeLavaplatos ? c.lavaprecio + PRECIOS.PEGADO_LAVAPLATOS : 0;

  // Barra
  c.subtotalPedestal = c.incluyePedestal ? PRECIOS.BARRA_PEDESTAL : 0;
  c.subtotalHerraje  = c.incluyeHerraje  ? PRECIOS.BARRA_HERRAJE  : 0;

  // Pintado
  if (c.incluyePintado) {
    const p = c.pintadoPuertas;
    c.subtotalPintado =
      (p.superiores * PRECIOS.PINTADO_SUPERIOR) +
      (p.inferiores * PRECIOS.PINTADO_INFERIOR) +
      (p.alacena    * PRECIOS.PINTADO_ALACENA)  +
      (p.cajon      * PRECIOS.PINTADO_CAJON)    +
      (p.especiero  * PRECIOS.PINTADO_ESPECIERO) +
      (p.gola       * PRECIOS.PINTADO_GOLA);
  } else {
    c.subtotalPintado = 0;
  }

  c.total =
    c.subtotalMadera +
    c.subtotalLed    +
    c.subtotalMeson  +
    c.subtotalLavaplatos +
    c.subtotalPedestal +
    c.subtotalHerraje +
    c.subtotalPintado;

  return c;
}

// ── Metadata de piezas ────────────────────────────────────────────────────────
const LABELS_PIEZA: Record<TipoPieza, string> = {
  isla:               "Isla",
  barra:              "Barra",
  mueble_alto:        "Muebles Altos",
  mueble_bajo:        "Muebles Bajos",
  nicho_nevecon:      "Nicho Nevecón",
  nicho_nevera:       "Nicho Nevera",
  alacena_entrepanos: "Alacena Entrepaños",
  alacena_herraje:    "Alacena Herraje",
  torre_hornos:       "Torre de Hornos",
};

const PIEZAS_GRUPOS = [
  {
    label: "Muebles",
    items: ["isla", "barra", "mueble_alto", "mueble_bajo"] as TipoPieza[],
  },
  {
    label: "Piezas especiales",
    items: ["nicho_nevecon", "nicho_nevera", "alacena_entrepanos", "alacena_herraje", "torre_hornos"] as TipoPieza[],
  },
];

const INFO_PIEZA_FIJA: Record<string, { icon: React.ReactNode; desc: string; color: string }> = {
  nicho_nevecon:      { icon: <Refrigerator className="h-5 w-5" />, desc: "Módulo de 100cm para nevecón empotrado", color: "#3b82f6" },
  nicho_nevera:       { icon: <Refrigerator className="h-5 w-5" />, desc: "Módulo de 75cm para nevera estándar",    color: "#60a5fa" },
  alacena_entrepanos: { icon: <LayoutGrid className="h-5 w-5" />,   desc: "Alacena con entrepaños internos (50cm)", color: "#f59e0b" },
  alacena_herraje:    { icon: <LayoutGrid className="h-5 w-5" />,   desc: "Alacena con herraje de arrastre (50cm)", color: "#f97316" },
  torre_hornos:       { icon: <UtensilsCrossed className="h-5 w-5" />, desc: "Torre de hornos empotrada (70cm)",    color: "#ef4444" },
};

const MODULOS_ALTOS = [
  { key: "esquineroSuperior",  label: "Esquinero superior" },
  { key: "moduloExtractor",    label: "Módulo extractor" },
  { key: "moduloMicroondas",   label: "Módulo microondas" },
  { key: "especiero",          label: "Especiero" },
  { key: "botellero",          label: "Botellero" },
  { key: "moduloRepisa",       label: "Módulo repisa" },
  { key: "moduloAlmacSup",     label: "Módulo almacenamiento sup." },
] as const;

const MODULOS_BAJOS = [
  { key: "esquinero1x1",       label: "Esquinero 1×1 inferior" },
  { key: "cajoneroTriple",     label: "Cajonero triple" },
  { key: "cajoneroDoble",      label: "Cajonero doble" },
  { key: "basurero",           label: "Basurero integrado" },
  { key: "moduloEstufaHorno",  label: "Módulo estufa/horno" },
  { key: "moduloAlmacInf",     label: "Módulo almacenamiento inf." },
] as const;

// ── Componente ───────────────────────────────────────────────────────────────
interface Props {
  config: MuebleCocinaConfig;
  onChange: (config: MuebleCocinaConfig) => void;
}

export function MuebleCocinaConfigurator({ config, onChange }: Props) {
  const update = (field: keyof MuebleCocinaConfig, value: any) => {
    let next = { ...config, [field]: value };
    if (field === "tipoPieza") {
      next = { ...defaultMuebleCocinaConfig(value as TipoPieza), notas: config.notas };
    }
    onChange(calcularMuebleCocina(next));
  };

  const updatePintado = (field: keyof PintadoPuertas, value: number) => {
    const next = {
      ...config,
      pintadoPuertas: { ...config.pintadoPuertas, [field]: value },
    };
    onChange(calcularMuebleCocina(next));
  };

  const updateModulo = (field: keyof ModulosDescriptivos, value: boolean) => {
    const next = {
      ...config,
      modulosDescriptivos: { ...config.modulosDescriptivos, [field]: value },
    };
    onChange(calcularMuebleCocina(next));
  };

  const mult    = getMultiplicadorFondo(config.mesonFondo);
  const recTexto = mult === 1 ? "Normal" : mult === 1.3 ? "+30%" : "×2";
  const esBarra      = config.tipoPieza === "barra";
  const esIsla       = config.tipoPieza === "isla";
  const esMuebleAlto = config.tipoPieza === "mueble_alto";
  const esMuebleBajo = config.tipoPieza === "mueble_bajo";
  const esPieza      = esPiezaFija(config.tipoPieza);
  const piezaInfo    = INFO_PIEZA_FIJA[config.tipoPieza];
  const tieneMueble  = esMuebleAlto || esMuebleBajo;

  return (
    <div className="space-y-4 rounded-xl p-4"
      style={{ background: "rgba(29,181,168,0.07)", border: "1px solid rgba(29,181,168,0.25)" }}>

      {/* Header */}
      <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid rgba(29,181,168,0.2)" }}>
        <Hammer className="h-5 w-5" style={{ color: "#1DB5A8" }} />
        <h3 className="font-semibold text-white">Piezas de Cocina</h3>
      </div>

      {/* Selector de tipo — agrupado */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-white/70">Tipo de pieza</Label>
        {PIEZAS_GRUPOS.map((grupo) => (
          <div key={grupo.label}>
            <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">{grupo.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {grupo.items.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update("tipoPieza", t)}
                  className="py-2 px-3 rounded-lg text-sm font-medium transition-all text-left"
                  style={config.tipoPieza === t
                    ? { background: "#1DB5A8", color: "#0C1A1A" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" }}
                >
                  {LABELS_PIEZA[t]}
                  {esPiezaFija(t) && (
                    <span className="block text-[10px] mt-0.5 opacity-70">
                      {formatPrice(PRECIO_PIEZA_FIJA[t] ?? 0)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── PIEZA FIJA — info card ── */}
      {esPieza && piezaInfo && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: `${piezaInfo.color}18`, border: `1px solid ${piezaInfo.color}40` }}>
          <div className="flex gap-3 items-start">
            <span style={{ color: piezaInfo.color }}>{piezaInfo.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-white">{LABELS_PIEZA[config.tipoPieza]}</p>
              <p className="text-sm text-white/60 mt-0.5">{piezaInfo.desc}</p>
              <p className="text-lg font-bold mt-2" style={{ color: "#1DB5A8" }}>
                {formatPrice(PRECIO_PIEZA_FIJA[config.tipoPieza] ?? 0)}
              </p>
            </div>
          </div>
          {/* Campo de herraje para alacena_herraje */}
          {config.tipoPieza === "alacena_herraje" && (
            <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${piezaInfo.color}30` }}>
              <Label className="text-xs text-white/70">Precio del herraje de arrastre</Label>
              <Input
                type="number" step="10000" min="0"
                placeholder="Ej: 350000"
                value={config.alacenaHerrajePrecio || ""}
                onChange={(e) => update("alacenaHerrajePrecio", parseInt(e.target.value) || 0)}
                className="h-9 bg-transparent border-white/15 text-white"
              />
              <p className="text-xs text-white/40">El herraje varía según el modelo — ingresa el valor según proveedor</p>
            </div>
          )}
        </div>
      )}

      {/* ── MADERA (isla / muebles) ── */}
      {!esBarra && !esPieza && (
        <div className="p-3 rounded-lg space-y-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
            {esIsla ? "Estructura de madera" : "Mueble"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/70">Metros Lineales</Label>
              <Input
                type="number" step="0.1" min="0.1"
                value={config.madreraML}
                onChange={(e) => update("madreraML", parseFloat(e.target.value) || 0)}
                className="h-9 bg-transparent border-white/15 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/70">Precio ML</Label>
              <div className="h-9 flex items-center px-3 rounded-md text-sm font-semibold"
                style={{ background: "rgba(29,181,168,0.15)", color: "#6ACFC7" }}>
                {esIsla
                  ? formatPrice(1200000)
                  : esMuebleAlto
                    ? formatPrice(config.incluyeLed ? 1000000 : 900000)
                    : formatPrice(1100000)}
              </div>
            </div>
          </div>

          {/* LED para muebles altos */}
          {esMuebleAlto && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(255,193,7,0.1)" }}>
                <Checkbox
                  id="led-check"
                  checked={config.incluyeLed}
                  onCheckedChange={(v) => update("incluyeLed", v === true)}
                />
                <Label htmlFor="led-check" className="text-sm cursor-pointer flex-1 text-white/80">
                  Preparación LED
                  <span className="ml-1 text-xs text-white/45">(+$100.000/ml en mueble)</span>
                </Label>
              </div>
              {config.incluyeLed && (
                <div className="grid grid-cols-2 gap-3 pl-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-white/70">Metros de LED</Label>
                    <Input
                      type="number" step="0.1" min="0.1"
                      value={config.ledML}
                      onChange={(e) => update("ledML", parseFloat(e.target.value) || 0)}
                      className="h-9 bg-transparent border-white/15 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-white/70">Precio LED/ml</Label>
                    <div className="h-9 flex items-center px-3 rounded-md text-sm font-semibold"
                      style={{ background: "rgba(255,193,7,0.15)", color: "#fbbf24" }}>
                      {formatPrice(220000)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-1 text-sm">
            <span className="text-white/50">Subtotal madera:</span>
            <span className="font-semibold text-white">{formatPrice(config.subtotalMadera)}</span>
          </div>
          {esMuebleAlto && config.incluyeLed && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Subtotal LED:</span>
              <span className="font-semibold" style={{ color: "#fbbf24" }}>{formatPrice(config.subtotalLed)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── MÓDULOS DESCRIPTIVOS (no tienen precio) ── */}
      {tieneMueble && (
        <div className="p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
            Módulos incluidos <span className="normal-case font-normal text-white/35">(para la descripción)</span>
          </p>
          <div className="grid grid-cols-2 gap-1">
            {(esMuebleAlto ? MODULOS_ALTOS : MODULOS_BAJOS).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 p-1.5 rounded"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <Checkbox
                  id={`mod-${key}`}
                  checked={!!config.modulosDescriptivos[key]}
                  onCheckedChange={(v) => updateModulo(key as keyof ModulosDescriptivos, v === true)}
                />
                <Label htmlFor={`mod-${key}`} className="text-xs cursor-pointer text-white/70">{label}</Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BARRA — estructura ── */}
      {esBarra && (
        <div className="p-3 rounded-lg space-y-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Estructura de barra</p>
          <div className="space-y-1">
            <Label className="text-xs text-white/70">Tipo de barra</Label>
            <Select value={config.barraTipo} onValueChange={(v) => update("barraTipo", v as TipoBarra)}>
              <SelectTrigger className="h-9 bg-transparent border-white/15 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="con_lateral">Con lateral regruesado (G/Q/S)</SelectItem>
                <SelectItem value="solo_arriba">Solo parte de arriba (G/Q/S o madera)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.barraTipo === "con_lateral" && (
            <div className="space-y-1">
              <Label className="text-xs text-white/70">Altura del lateral</Label>
              <Select
                value={config.barraAlturaLateral.toString()}
                onValueChange={(v) => update("barraAlturaLateral", parseInt(v))}
              >
                <SelectTrigger className="h-9 bg-transparent border-white/15 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin lateral</SelectItem>
                  <SelectItem value="90">90 cm</SelectItem>
                  <SelectItem value="100">100 cm</SelectItem>
                  <SelectItem value="110">110 cm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Checkbox id="pedestal" checked={config.incluyePedestal}
                  onCheckedChange={(v) => update("incluyePedestal", v === true)} />
                <Label htmlFor="pedestal" className="text-sm cursor-pointer text-white/80">Pedestal metálico</Label>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#6ACFC7" }}>{formatPrice(250000)}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Checkbox id="herraje" checked={config.incluyeHerraje}
                  onCheckedChange={(v) => update("incluyeHerraje", v === true)} />
                <Label htmlFor="herraje" className="text-sm cursor-pointer text-white/80">Herraje de barra</Label>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#6ACFC7" }}>{formatPrice(380000)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MESÓN ── */}
      {!esPieza && (
        <div className="p-3 rounded-lg space-y-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Mesón</p>
            {!esBarra && (
              <div className="flex items-center gap-2">
                <Checkbox id="meson-check" checked={config.incluyeMeson}
                  onCheckedChange={(v) => update("incluyeMeson", v === true)} />
                <Label htmlFor="meson-check" className="text-xs cursor-pointer text-white/70">Incluir mesón</Label>
              </div>
            )}
          </div>

          {(config.incluyeMeson || esBarra) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Material</Label>
                  <Select value={config.mesonMaterial} onValueChange={(v) => update("mesonMaterial", v as MaterialMeson)}>
                    <SelectTrigger className="h-9 bg-transparent border-white/15 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granito">Granito — {formatPrice(700000)}/ml</SelectItem>
                      <SelectItem value="cuarzo">Cuarzo — {formatPrice(850000)}/ml</SelectItem>
                      <SelectItem value="sinterizado">Sinterizado — {formatPrice(1200000)}/ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Metros Lineales</Label>
                  <Input
                    type="number" step="0.1" min="0.1"
                    value={config.mesonML}
                    onChange={(e) => update("mesonML", parseFloat(e.target.value) || 0)}
                    className="h-9 bg-transparent border-white/15 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Fondo (cm)</Label>
                  <Input
                    type="number" min="35" max="120"
                    value={config.mesonFondo}
                    onChange={(e) => update("mesonFondo", parseInt(e.target.value) || 60)}
                    className="h-9 bg-transparent border-white/15 text-white"
                  />
                  <p className="text-[10px] text-white/40">Recargo: {recTexto}</p>
                </div>
              </div>

              {/* Extras isla */}
              {esIsla && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Checkbox id="laterales" checked={config.mesonIncluyeLaterales}
                      onCheckedChange={(v) => update("mesonIncluyeLaterales", v === true)} />
                    <Label htmlFor="laterales" className="text-xs cursor-pointer text-white/75">Laterales (1.8 ml)</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Checkbox id="regrueso" checked={config.mesonIncluyeRegrueso}
                      onCheckedChange={(v) => update("mesonIncluyeRegrueso", v === true)} />
                    <Label htmlFor="regrueso" className="text-xs cursor-pointer text-white/75">Regrueso (0.9 ml)</Label>
                  </div>
                </div>
              )}

              {/* Lavaplatos */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="lavaplatos" checked={config.incluyeLavaplatos}
                    onCheckedChange={(v) => update("incluyeLavaplatos", v === true)} />
                  <Label htmlFor="lavaplatos" className="text-xs cursor-pointer text-white/75">
                    Lavaplatos + pegado ($50.000)
                  </Label>
                </div>
                {config.incluyeLavaplatos && (
                  <div className="pl-6">
                    <Label className="text-xs text-white/60">Precio del lavaplatos</Label>
                    <Input
                      type="number" step="10000" min="0" placeholder="Ej: 250000"
                      value={config.lavaprecio || ""}
                      onChange={(e) => update("lavaprecio", parseInt(e.target.value) || 0)}
                      className="h-9 mt-1 bg-transparent border-white/15 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-white/50">Subtotal mesón:</span>
                <span className="font-semibold text-white">{formatPrice(config.subtotalMeson)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PINTADO PUERTAS ALTO BRILLO (muebles altos y bajos) ── */}
      {tieneMueble && (
        <div className="p-3 rounded-lg space-y-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2">
            <Checkbox id="pintado-check" checked={config.incluyePintado}
              onCheckedChange={(v) => update("incluyePintado", v === true)} />
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4" style={{ color: "#ec4899" }} />
              <Label htmlFor="pintado-check" className="text-sm cursor-pointer font-semibold text-white/85">
                Pintado Puertas Alto Brillo
              </Label>
            </div>
          </div>

          {config.incluyePintado && (
            <div className="space-y-2 pt-1">
              {([
                { field: "superiores",  label: "Puertas superiores",  precio: PRECIOS.PINTADO_SUPERIOR,  show: esMuebleAlto },
                { field: "inferiores",  label: "Puertas inferiores",  precio: PRECIOS.PINTADO_INFERIOR,  show: esMuebleBajo },
                { field: "alacena",     label: "Puertas de alacena",  precio: PRECIOS.PINTADO_ALACENA,   show: esMuebleAlto },
                { field: "cajon",       label: "Tapas de cajón",      precio: PRECIOS.PINTADO_CAJON,     show: true },
                { field: "especiero",   label: "Tapa de especiero",   precio: PRECIOS.PINTADO_ESPECIERO, show: esMuebleAlto },
                { field: "gola",        label: "Tapas gola/pequeñas", precio: PRECIOS.PINTADO_GOLA,      show: true },
              ] as const).filter(r => r.show).map(({ field, label, precio }) => (
                <div key={field} className="flex items-center justify-between p-2 rounded"
                  style={{ background: "rgba(236,72,153,0.08)" }}>
                  <div>
                    <p className="text-sm text-white/80">{label}</p>
                    <p className="text-xs text-white/40">{formatPrice(precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min="0"
                      value={config.pintadoPuertas[field] || ""}
                      onChange={(e) => updatePintado(field as keyof PintadoPuertas, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-16 text-right bg-transparent border-white/15 text-white"
                    />
                    <span className="text-xs text-white/45 w-24 text-right">
                      {formatPrice(config.pintadoPuertas[field] * precio)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-sm pt-1">
                <span className="text-white/50">Subtotal pintado:</span>
                <span className="font-semibold" style={{ color: "#ec4899" }}>{formatPrice(config.subtotalPintado)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      <div className="space-y-1">
        <Label className="text-xs text-white/70">Notas</Label>
        <Textarea
          value={config.notas}
          onChange={(e) => update("notas", e.target.value)}
          placeholder="Color, modelo, especificaciones adicionales..."
          className="min-h-[60px] bg-transparent border-white/15 text-white placeholder:text-white/30"
        />
      </div>

      {/* ── RESUMEN TOTAL ── */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "#1DB5A8" }}>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-4 w-4 text-[#0C1A1A]" />
          <span className="font-semibold text-[#0C1A1A] text-sm">Resumen</span>
        </div>
        {config.subtotalMadera > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>{esIsla ? "Madera isla" : LABELS_PIEZA[config.tipoPieza]} ({config.madreraML} ml):</span>
            <span>{formatPrice(config.subtotalMadera)}</span>
          </div>
        )}
        {config.subtotalLed > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>LED ({config.ledML} ml):</span>
            <span>{formatPrice(config.subtotalLed)}</span>
          </div>
        )}
        {config.subtotalMeson > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>Mesón {config.mesonMaterial} ({config.mesonML} ml):</span>
            <span>{formatPrice(config.subtotalMeson)}</span>
          </div>
        )}
        {config.subtotalLavaplatos > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>Lavaplatos + pegado:</span>
            <span>{formatPrice(config.subtotalLavaplatos)}</span>
          </div>
        )}
        {config.subtotalPedestal > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>Pedestal:</span>
            <span>{formatPrice(config.subtotalPedestal)}</span>
          </div>
        )}
        {config.subtotalHerraje > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>Herraje barra:</span>
            <span>{formatPrice(config.subtotalHerraje)}</span>
          </div>
        )}
        {config.subtotalPintado > 0 && (
          <div className="flex justify-between text-sm text-[#0C1A1A]/80">
            <span>Pintado alto brillo:</span>
            <span>{formatPrice(config.subtotalPintado)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 font-bold text-[#0C1A1A] text-base"
          style={{ borderTop: "1px solid rgba(12,26,26,0.25)" }}>
          <span>TOTAL:</span>
          <span>{formatPrice(config.total)}</span>
        </div>
      </div>
    </div>
  );
}
