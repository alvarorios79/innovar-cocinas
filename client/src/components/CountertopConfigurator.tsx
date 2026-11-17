import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/formatters";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Layers, Calculator, Plus, Trash2 } from "lucide-react";

// Precios y reglas: UNA sola fuente en shared/mesonPrecios.ts (piedra, fondo, barra angosta, lavaplatos, laterales, hierros de barra)
import { precioPiedraML, multiplicadorFondoCm, precioLavaplatos, hierrosBarra, LATERAL_ML, type LavaplatosTipo } from "@shared/mesonPrecios";
import { LavaplatosSelector } from "@/components/LavaplatosSelector";

// Constantes
const LAVAPLATOS_COST_ANTIGUO = 130000; // solo para sub-mesones guardados antes del 17 nov 2026

// Configuración de un sub-mesón individual
export interface SubMesonConfig {
  id: string;
  material: "granito" | "quarzo" | "sinterizado";
  tipo: "meson" | "isla" | "barra";
  metrosLineales: number;
  fondo: number;
  precioML: number;
  /** Importado: el precio por ml se escribe a mano porque es distinto al del Motor */
  esImportado?: boolean;
  // Isla
  incluyeLaterales: boolean;      // antiguo: marcada = 2 laterales
  cantLaterales?: number;         // 0, 1 o 2 laterales de 0,90 ml
  incluyeRegrueso: boolean;
  // Barra (regla del 17 nov 2026): herraje = lateral + regrueso interior; pedestal = solo mesón superior
  alturaLateral: number;          // altura de la barra en cm
  incluyeHerraje?: boolean;
  incluyePedestal?: boolean;
  cantPedestales?: number;
  // Mesón estándar: lavaplatos sencillo / doble / otro
  lavaplatosTipo?: LavaplatosTipo;
  lavaprecio?: number;
  /** true = sub-mesón creado/actualizado con las reglas nuevas; los antiguos conservan su cálculo hasta que se editen */
  reglaV2?: boolean;
  // Salpicadero alto (duplica metraje)
  incluyeSalpicaderoAlto: boolean;
  // Calculados
  subtotalMeson: number;
  subtotalLaterales: number;
  subtotalRegrueso: number;
  subtotalLavaplatos: number;
  subtotalSalpicaderoAlto: number;
  subtotalHierros?: number;
  subtotal: number;
}

// Configuración principal que contiene múltiples mesones
export interface CountertopConfig {
  mesones: SubMesonConfig[];
  total: number;
  // Extras globales
  notes: string;
  includeTransport: boolean;
  transportCost: number;
}

interface CountertopConfiguratorProps {
  config: CountertopConfig;
  onChange: (config: CountertopConfig) => void;
}

// Crear un nuevo sub-mesón con valores por defecto
function createDefaultSubMeson(tipo: "meson" | "isla" | "barra" = "meson"): SubMesonConfig {
  const id = `meson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    material: "quarzo",
    tipo,
    metrosLineales: 1,
    fondo: tipo === "barra" ? 40 : 60,
    precioML: precioPiedraML("quarzo", tipo === "barra"),
    esImportado: false,
    incluyeLaterales: false,
    cantLaterales: tipo === "isla" ? 2 : 0,
    incluyeRegrueso: tipo === "isla",
    alturaLateral: tipo === "barra" ? 90 : 0,
    incluyeHerraje: tipo === "barra",
    incluyePedestal: false,
    cantPedestales: 1,
    lavaplatosTipo: tipo === "meson" ? "sencillo" : "ninguno",
    lavaprecio: 0,
    reglaV2: true,
    incluyeSalpicaderoAlto: false,
    subtotalMeson: 0,
    subtotalLaterales: 0,
    subtotalRegrueso: 0,
    subtotalLavaplatos: 0,
    subtotalSalpicaderoAlto: 0,
    subtotalHierros: 0,
    subtotal: 0,
  };
}

const mesonInicial = calcularSubMeson(createDefaultSubMeson("meson"));
export const defaultCountertopConfig: CountertopConfig = {
  mesones: [mesonInicial],
  total: mesonInicial.subtotal,
  notes: "",
  includeTransport: false,
  transportCost: 150000,
};

// ── Cálculo ANTIGUO (sub-mesones guardados antes del 17 nov 2026): se conserva igual hasta que se editen ──
function multiplicadorFondoAntiguo(fondo: number, tipo: string): number {
  if (tipo === "barra" && fondo >= 35 && fondo <= 45) return 1;
  if (fondo >= 55 && fondo <= 65) return 1;
  if (fondo >= 66 && fondo <= 90) return 1.3;
  if (fondo >= 91 && fondo <= 120) return 2;
  return 1;
}
function calcularSubMesonAntiguo(meson: SubMesonConfig): SubMesonConfig {
  const multiplicador = multiplicadorFondoAntiguo(meson.fondo, meson.tipo);
  const precioBase = meson.precioML;
  meson.subtotalMeson = meson.metrosLineales * precioBase * multiplicador;
  meson.subtotalHierros = 0;
  if (meson.tipo === "isla") {
    meson.subtotalLaterales = meson.incluyeLaterales ? 1.8 * precioBase * multiplicador : 0;
    meson.subtotalRegrueso = meson.incluyeRegrueso ? 0.9 * precioBase : 0;
    meson.subtotalLavaplatos = 0;
    meson.subtotalSalpicaderoAlto = 0;
  } else if (meson.tipo === "barra") {
    meson.subtotalLaterales = meson.alturaLateral > 0 ? (meson.alturaLateral / 100) * precioBase * multiplicador : 0;
    meson.subtotalRegrueso = 0;
    meson.subtotalLavaplatos = 0;
    meson.subtotalSalpicaderoAlto = meson.incluyeSalpicaderoAlto ? meson.metrosLineales * precioBase * multiplicador : 0;
  } else {
    meson.subtotalLaterales = 0;
    meson.subtotalRegrueso = 0;
    meson.subtotalLavaplatos = LAVAPLATOS_COST_ANTIGUO;
    meson.subtotalSalpicaderoAlto = meson.incluyeSalpicaderoAlto ? meson.metrosLineales * precioBase * multiplicador : 0;
  }
  meson.subtotal = meson.subtotalMeson + meson.subtotalLaterales + meson.subtotalRegrueso + meson.subtotalLavaplatos + meson.subtotalSalpicaderoAlto;
  return meson;
}

// ── Cálculo NUEVO (reglas del 17 nov 2026) ──
function calcularSubMesonNuevo(meson: SubMesonConfig): SubMesonConfig {
  const esBarra = meson.tipo === "barra";
  // Barra: siempre angosta, sin recargo de fondo. Mesón/isla: fondo ≤65 sin recargo · 66–90 +30 % · más de 90 ×2.
  const mult = esBarra ? 1 : multiplicadorFondoCm(meson.fondo);
  const precioBase = meson.precioML; // del Motor, o escrito a mano si es importado
  meson.subtotalMeson = meson.metrosLineales * precioBase * mult;
  meson.subtotalRegrueso = 0;
  meson.subtotalLaterales = 0;
  meson.subtotalLavaplatos = 0;
  meson.subtotalSalpicaderoAlto = 0;
  meson.subtotalHierros = 0;
  if (meson.tipo === "isla") {
    const nLat = typeof meson.cantLaterales === "number" ? meson.cantLaterales : (meson.incluyeLaterales ? 2 : 0);
    meson.subtotalLaterales = nLat * LATERAL_ML * precioBase * mult;
    meson.subtotalRegrueso = meson.incluyeRegrueso ? LATERAL_ML * precioBase : 0;
  } else if (esBarra) {
    // Con herraje: lateral + regrueso interior (misma medida = altura de la barra). Con pedestal solo el mesón superior.
    if (meson.incluyeHerraje) {
      const alturaM = (meson.alturaLateral > 0 ? meson.alturaLateral : 90) / 100;
      meson.subtotalLaterales = 2 * alturaM * precioBase;
    }
    meson.subtotalSalpicaderoAlto = meson.incluyeSalpicaderoAlto ? meson.metrosLineales * precioBase : 0;
    meson.subtotalHierros = hierrosBarra({ reglaV2: true, incluyePedestal: meson.incluyePedestal, cantPedestales: meson.cantPedestales, incluyeHerraje: meson.incluyeHerraje, meters: meson.metrosLineales });
  } else {
    meson.subtotalLavaplatos = precioLavaplatos(meson);
    meson.subtotalSalpicaderoAlto = meson.incluyeSalpicaderoAlto ? meson.metrosLineales * precioBase * mult : 0;
  }
  meson.subtotal = meson.subtotalMeson + meson.subtotalLaterales + meson.subtotalRegrueso + meson.subtotalLavaplatos + meson.subtotalSalpicaderoAlto + (meson.subtotalHierros || 0);
  return meson;
}

function calcularSubMeson(meson: SubMesonConfig): SubMesonConfig {
  return meson.reglaV2 ? calcularSubMesonNuevo(meson) : calcularSubMesonAntiguo(meson);
}

export function CountertopConfigurator({ config, onChange }: CountertopConfiguratorProps) {
  


  // Calcular total general
  const calcularTotal = (mesones: SubMesonConfig[], includeTransport: boolean, transportCost: number): number => {
    const subtotalMesones = mesones.reduce((sum, m) => sum + m.subtotal, 0);
    return subtotalMesones + (includeTransport ? transportCost : 0);
  };

  // Actualizar un sub-mesón específico
  const handleSubMesonChange = (index: number, field: keyof SubMesonConfig | "lavaplatos", value: any) => {
    const newMesones = [...config.mesones];
    let meson: SubMesonConfig = field === "lavaplatos"
      ? { ...newMesones[index], lavaplatosTipo: value.tipo, lavaprecio: value.precio }
      : { ...newMesones[index], [field]: value };

    // Un sub-mesón guardado antes del 17 nov 2026 pasa a las reglas nuevas en cuanto se edita
    if (!meson.reglaV2) {
      meson.reglaV2 = true;
      meson.cantLaterales = meson.cantLaterales ?? (meson.incluyeLaterales ? 2 : 0);
      meson.lavaplatosTipo = meson.lavaplatosTipo ?? (meson.tipo === "meson" ? "sencillo" : "ninguno");
      meson.incluyeHerraje = meson.incluyeHerraje ?? (meson.tipo === "barra");
      meson.cantPedestales = meson.cantPedestales ?? 1;
      if (meson.tipo === "barra" && !(meson.alturaLateral > 0)) meson.alturaLateral = 90;
      if (!meson.esImportado) meson.precioML = precioPiedraML(meson.material, meson.tipo === "barra");
    }

    // El precio sale del Motor según piedra y tipo; solo se escribe a mano si es importado
    if ((field === "material" || field === "tipo" || (field === "esImportado" && value === false)) && !meson.esImportado) {
      meson.precioML = precioPiedraML(meson.material, meson.tipo === "barra");
    }

    // Valores por defecto al cambiar el tipo
    if (field === "tipo") {
      if (value === "meson") {
        meson.cantLaterales = 0;
        meson.incluyeRegrueso = false;
        meson.alturaLateral = 0;
        meson.incluyeHerraje = false;
        meson.incluyePedestal = false;
        meson.incluyeSalpicaderoAlto = false;
        meson.lavaplatosTipo = "sencillo";
        if (meson.fondo < 55) meson.fondo = 60;
      } else if (value === "isla") {
        meson.cantLaterales = 2;
        meson.incluyeRegrueso = true;
        meson.alturaLateral = 0;
        meson.incluyeHerraje = false;
        meson.incluyePedestal = false;
        meson.incluyeSalpicaderoAlto = false;
        meson.lavaplatosTipo = "ninguno";
        if (meson.fondo < 55) meson.fondo = 60;
      } else if (value === "barra") {
        meson.cantLaterales = 0;
        meson.incluyeRegrueso = false;
        meson.alturaLateral = 90;
        meson.incluyeHerraje = true; // el herraje viene marcado en todas las barras
        meson.incluyePedestal = false;
        meson.incluyeSalpicaderoAlto = false;
        meson.lavaplatosTipo = "ninguno";
        meson.fondo = 40;
      }
    }

    newMesones[index] = calcularSubMeson(meson);

    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Agregar un nuevo sub-mesón
  const handleAddMeson = (tipo: "meson" | "isla" | "barra") => {
    const newMeson = calcularSubMeson(createDefaultSubMeson(tipo));
    const newMesones = [...config.mesones, newMeson];
    
    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Eliminar un sub-mesón
  const handleRemoveMeson = (index: number) => {
    if (config.mesones.length <= 1) return; // Mantener al menos uno
    
    const newMesones = config.mesones.filter((_, i) => i !== index);
    
    onChange({
      ...config,
      mesones: newMesones,
      total: calcularTotal(newMesones, config.includeTransport, config.transportCost),
    });
  };

  // Manejar cambios globales
  const handleGlobalChange = (field: "notes" | "includeTransport" | "transportCost", value: any) => {
    const newConfig = { ...config, [field]: value };
    newConfig.total = calcularTotal(newConfig.mesones, newConfig.includeTransport, newConfig.transportCost);
    onChange(newConfig);
  };

  // Obtener nombre del tipo de mesón
  const getTipoNombre = (tipo: string) => {
    switch (tipo) {
      case "meson": return "Mesón Estándar";
      case "isla": return "Isla";
      case "barra": return "Barra";
      default: return tipo;
    }
  };

  // Determinar qué incluye cada tipo (considerando salpicadero alto, lavaplatos y soporte de la barra)
  const getIncludedItems = (meson: SubMesonConfig) => {
    if (meson.tipo === "meson") {
      const nuevo = !!meson.reglaV2;
      const tieneLav = nuevo ? (meson.lavaplatosTipo && meson.lavaplatosTipo !== "ninguno") : true;
      const lavTexto = nuevo
        ? (meson.lavaplatosTipo === "doble" ? "Lavaplatos doble" : meson.lavaplatosTipo === "sencillo" ? "Lavaplatos sencillo 45×37cm" : "Lavaplatos")
        : "Lavaplatos 45×37cm";
      const items = [
        ...(tieneLav ? [{ text: `Pegado de lavaplatos (${formatPrice(meson.subtotalLavaplatos)})`, included: true }, { text: `${lavTexto} incluido`, included: true }] : []),
        { text: "Regrueso en el visto", included: true },
      ];
      if (!meson.incluyeSalpicaderoAlto) {
        items.push({ text: "Salpicadero bajo 10cm", included: true });
      }
      return items;
    } else if (meson.tipo === "isla") {
      return [
        { text: "Regrueso en el visto", included: true },
      ];
    } else {
      const items = [
        { text: "Regrueso en los vistos", included: true },
      ];
      if (!meson.incluyeSalpicaderoAlto) {
        items.unshift({ text: "Salpicadero bajo 10cm", included: true });
      }
      if (meson.reglaV2) {
        if (meson.incluyeHerraje) items.push({ text: `Lateral y regrueso interior de ${meson.alturaLateral || 90} cm + herraje de hierro`, included: true });
        else items.push({ text: "Solo mesón superior (sin lateral)", included: true });
        if (meson.incluyePedestal) items.push({ text: `${meson.cantPedestales && meson.cantPedestales > 1 ? meson.cantPedestales + " pedestales" : "Pedestal"} metálico`, included: true });
      }
      return items;
    }
  };

  return (
    <div className="space-y-4 border border-white/[0.12] rounded-lg p-4 bg-white/[0.02]">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-white/[0.12]">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-red-400" />
          <h3 className="font-semibold text-foreground">Configurador de Mesones</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("meson")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Mesón
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("isla")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Isla
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddMeson("barra")}
            className="text-xs flex-shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Barra
          </Button>
        </div>
      </div>

      {/* Lista de mesones */}
      {config.mesones.map((meson, index) => {
        const multiplicador = meson.reglaV2 ? (meson.tipo === "barra" ? 1 : multiplicadorFondoCm(meson.fondo)) : multiplicadorFondoAntiguo(meson.fondo, meson.tipo);
        const multiplicadorTexto = multiplicador === 1 ? "Normal" : multiplicador === 1.3 ? "+30%" : "Doble";
        const includedItems = getIncludedItems(meson);
        const showSalpicaderoAltoOption = meson.tipo === "meson" || meson.tipo === "barra";

        return (
          <div key={meson.id} className="space-y-3 p-3 bg-card rounded-lg border border-white/[0.10]">
            {/* Header del sub-mesón */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-red-400">
                {getTipoNombre(meson.tipo)} #{index + 1}
              </h4>
              {config.mesones.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMeson(index)}
                  className="text-red-500 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Tipo y Material */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Tipo de Mesón</Label>
                <Select value={meson.tipo} onValueChange={(v) => handleSubMesonChange(index, "tipo", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meson">Mesón Estándar</SelectItem>
                    <SelectItem value="isla">Isla</SelectItem>
                    <SelectItem value="barra">Barra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Material</Label>
                <Select value={meson.material} onValueChange={(v) => handleSubMesonChange(index, "material", v as "granito" | "quarzo" | "sinterizado")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="granito">Granito</SelectItem>
                    <SelectItem value="quarzo">Cuarzo</SelectItem>
                    <SelectItem value="sinterizado">Sinterizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medidas y Precio */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Metros Lineales</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={meson.metrosLineales}
                  onChange={(e) => handleSubMesonChange(index, "metrosLineales", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Fondo (cm)</Label>
                {meson.tipo === "barra" && meson.reglaV2 ? (
                  <>
                    <div className="h-9 flex items-center px-2 bg-white/[0.04] rounded-md text-sm text-white/70">35–45 (angosta)</div>
                    <p className="text-[10px] text-white/45">La barra siempre es angosta; si es menos de 35 cm se cobra igual.</p>
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      min="55"
                      max="120"
                      value={meson.fondo}
                      onChange={(e) => handleSubMesonChange(index, "fondo", parseInt(e.target.value) || 60)}
                      className="h-9"
                    />
                    <p className="text-[10px] text-white/45">
                      {meson.fondo > 120 ? "Más de 120 cm: se cobra ×2; consultar" : `Recargo: ${multiplicadorTexto}`}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Precio ML</Label>
                <Input
                  type="number"
                  value={meson.precioML}
                  disabled={!meson.esImportado}
                  onChange={(e) => handleSubMesonChange(index, "precioML", parseInt(e.target.value) || 0)}
                  className="h-9"
                />
                <label className="flex items-center gap-1.5 text-[11px] text-white/70 cursor-pointer">
                  <Checkbox
                    id={`importado-${meson.id}`}
                    checked={!!meson.esImportado}
                    onCheckedChange={(checked) => handleSubMesonChange(index, "esImportado", checked === true)}
                  />
                  Importado (precio a mano)
                </label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Subtotal</Label>
                <div className="h-9 flex items-center px-2 bg-red-500/10 rounded-md font-semibold text-red-300 text-sm">
                  {formatPrice(meson.subtotal)}
                </div>
              </div>
            </div>

            {/* Opciones de Isla */}
            {meson.tipo === "isla" && (
              <div className="p-2 bg-white/[0.04] rounded space-y-2">
                <h5 className="text-xs font-medium text-red-400">Opciones de Isla</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 bg-card rounded text-sm">
                    <Label className="text-xs flex-1">Laterales (0,9 ML c/u)</Label>
                    <Select
                      value={String(typeof meson.cantLaterales === "number" ? meson.cantLaterales : (meson.incluyeLaterales ? 2 : 0))}
                      onValueChange={(v) => handleSubMesonChange(index, "cantLaterales", parseInt(v) || 0)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Ninguno</SelectItem>
                        <SelectItem value="1">1 lateral</SelectItem>
                        <SelectItem value="2">2 laterales</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="font-semibold text-red-400 text-xs">{formatPrice(meson.subtotalLaterales)}</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-card rounded text-sm">
                    <Checkbox
                      id={`regrueso-${meson.id}`}
                      checked={meson.incluyeRegrueso}
                      onCheckedChange={(checked) => handleSubMesonChange(index, "incluyeRegrueso", checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`regrueso-${meson.id}`} className="text-xs cursor-pointer">
                        Regrueso (0.9 ML)
                      </Label>
                    </div>
                    <span className="font-semibold text-red-400 text-xs">{formatPrice(meson.subtotalRegrueso)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Opciones de Barra */}
            {meson.tipo === "barra" && (
              <div className="p-2 bg-white/[0.04] rounded space-y-2">
                <h5 className="text-xs font-medium text-red-400">Soporte de la barra</h5>
                <p className="text-[10px] text-white/45">Con herraje la piedra lleva: largo + lateral + regrueso interior (según la altura). Con pedestal solo lleva el mesón superior, sin lateral.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-2 bg-card rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`herraje-${meson.id}`} checked={!!meson.incluyeHerraje}
                        onCheckedChange={(c) => handleSubMesonChange(index, "incluyeHerraje", c === true)} />
                      <Label htmlFor={`herraje-${meson.id}`} className="text-xs cursor-pointer flex-1">Herraje de hierro (armazón a pared y suelo)</Label>
                      <span className="font-semibold text-red-400 text-xs">{formatPrice(hierrosBarra({ reglaV2: true, incluyeHerraje: !!meson.incluyeHerraje, meters: meson.metrosLineales }))}</span>
                    </div>
                    {meson.incluyeHerraje && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label className="text-xs">Altura de la barra (cm)</Label>
                        <Input type="number" min="0" step="1" value={meson.alturaLateral || ""}
                          onChange={(e) => handleSubMesonChange(index, "alturaLateral", parseInt(e.target.value) || 0)}
                          className="h-8 w-24" />
                        <span className="font-semibold text-red-400 text-xs">{formatPrice(meson.subtotalLaterales)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-card rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`pedestal-${meson.id}`} checked={!!meson.incluyePedestal}
                        onCheckedChange={(c) => handleSubMesonChange(index, "incluyePedestal", c === true)} />
                      <Label htmlFor={`pedestal-${meson.id}`} className="text-xs cursor-pointer flex-1">Pedestal (pata metálica)</Label>
                    </div>
                    {meson.incluyePedestal && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label className="text-xs">Cantidad</Label>
                        <Input type="number" min="1" step="1" value={meson.cantPedestales || 1}
                          onChange={(e) => handleSubMesonChange(index, "cantPedestales", Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 w-20" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Lavaplatos del mesón estándar: sencillo, doble u otro */}
            {meson.tipo === "meson" && (
              <div className="p-2 bg-white/[0.04] rounded">
                <LavaplatosSelector
                  value={meson.lavaplatosTipo === undefined ? { lavaplatosTipo: "otro", lavaprecio: LAVAPLATOS_COST_ANTIGUO } : meson}
                  onChange={(tipo, precio) => handleSubMesonChange(index, "lavaplatos", { tipo, precio })}
                />
                <p className="text-[10px] text-white/45 mt-1">Subtotal lavaplatos: {formatPrice(meson.subtotalLavaplatos)}</p>
              </div>
            )}

            {/* Opción de Salpicadero Alto */}
            {showSalpicaderoAltoOption && (
              <div className="p-2 bg-amber-500/10 rounded">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`salpicaderoAlto-${meson.id}`}
                    checked={meson.incluyeSalpicaderoAlto}
                    onCheckedChange={(checked) => handleSubMesonChange(index, "incluyeSalpicaderoAlto", checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`salpicaderoAlto-${meson.id}`} className="text-xs cursor-pointer font-medium">
                      Salpicadero Alto (reemplaza el bajo, duplica metraje)
                    </Label>
                    <p className="text-[10px] text-white/45">
                      {meson.metrosLineales} ML × {formatPrice(meson.precioML)} × {multiplicador}
                    </p>
                  </div>
                  {meson.incluyeSalpicaderoAlto && (
                    <span className="font-semibold text-amber-400 text-xs">{formatPrice(meson.subtotalSalpicaderoAlto)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Incluido en el precio */}
            <div className="p-2 bg-white/[0.03] rounded">
              <h5 className="text-xs font-medium text-white/60 mb-1">Incluido en el precio:</h5>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                {includedItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Transporte */}
      <div className="p-3 bg-card rounded-lg border border-white/[0.10]">
        <div className="flex items-center gap-3">
          <Checkbox
            id="transport"
            checked={config.includeTransport}
            onCheckedChange={(checked) => handleGlobalChange("includeTransport", checked)}
          />
          <Label htmlFor="transport" className="text-sm cursor-pointer flex-1">
            Incluir Transporte e Imprevistos
          </Label>
          {config.includeTransport && (
            <Input
              type="number"
              value={config.transportCost}
              onChange={(e) => handleGlobalChange("transportCost", parseInt(e.target.value) || 0)}
              className="w-32 h-8"
            />
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Notas especiales</Label>
        <Textarea
          value={config.notes}
          onChange={(e) => handleGlobalChange("notes", e.target.value)}
          placeholder="Color, modelo, especificaciones adicionales..."
          className="min-h-[60px]"
        />
      </div>

      {/* Resumen de precio */}
      <div className="p-4 bg-card border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-5 w-5 text-red-400" />
          <h4 className="font-semibold text-foreground">Resumen de Precio</h4>
        </div>
        <div className="space-y-1 text-sm">
          {config.mesones.map((meson, index) => (
            <div key={meson.id} className="flex justify-between">
              <span>{getTipoNombre(meson.tipo)} #{index + 1} ({meson.metrosLineales} ML {meson.material === "quarzo" ? "cuarzo" : meson.material}{meson.esImportado ? " importado" : ""}):</span>
              <span>{formatPrice(meson.subtotal)}</span>
            </div>
          ))}
          {config.includeTransport && (
            <div className="flex justify-between">
              <span>Transporte e imprevistos:</span>
              <span>{formatPrice(config.transportCost)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-white/[0.15] text-lg font-bold">
            <span>TOTAL:</span>
            <span className="text-primary">{formatPrice(config.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
