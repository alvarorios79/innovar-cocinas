import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  CATALOG, CATALOG_BY_KEY, SPECIALS,
  normalizePlan, computePlan, rowItems, rowUsed, activeSpecials, lateralOn, isPainted,
  addModuleToPlan, removeModuleFromPlan, setModuleWidth, moveModule, moveModuleToTramo, primerHueco, setDefaultWidth, esquinasDeLayout, girarEsquinero, espaciosLibres, ampliarMueble, pegarMueble, moveTall, dropModule, dropTall, moverValidando, tidyPlan, packRow, setModuleLock, setTypeWidth, alignEnd, rebuildAutoUpper,
  round2,
  specialWidth,
  type ModulePlan, type PlanModule, type PlanRow,
} from "@shared/kitchenModulePlan";

// Plano de módulos por tramos, visto de frente: superiores arriba, inferiores abajo,
// y los módulos de piso a techo como un solo bloque largo. Solo cuenta módulos y piezas de pintura.
// No cambia precios ni el PDF: guarda su estado en kitchenConfig.modulePlan.

const PlanoModulos3D = lazy(() => import("./PlanoModulos3D"));
import type { PlanoModulos3DRef } from "./PlanoModulos3D";

interface Props {
  config: any;                       // kitchenConfig del ítem
  onChange: (plan: ModulePlan) => void;
  // Marca / desmarca un módulo de piso a techo en la cotización (specialModules). Si no se pasa, las tarjetas son de solo lectura.
  onSpecialToggle?: (key: string, on: boolean) => void;
  /** Cambia el plano Y marca/desmarca un módulo alto en UNA sola actualización (dos seguidas se pisan entre sí) */
  onPlanSpecial?: (plan: ModulePlan, key: string, on: boolean) => void;
  /** Devuelve el plano y los módulos altos marcados a un estado anterior (botón «Deshacer») en una sola actualización */
  onRestaurar?: (plan: ModulePlan, especiales: Record<string, boolean>) => void;
  /** La cotización pide aquí las fotos del 3D (iso, arriba, frente) al guardar: van al PDF y al proyecto (Diseño). Devuelve [] si el 3D no está a la vista. */
  capturaRef?: { current: null | (() => string[]) };
}

const m2 = (n: number) => (Number(n) || 0).toFixed(2);

// Iconos simples por tipo de módulo (trazo, sin dependencias)
const ICONS: Record<string, ReactElement> = {
  moduloEstufaPuerta: <g><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="2"/><circle cx="15.5" cy="8.5" r="2"/><circle cx="8.5" cy="15.5" r="2"/><circle cx="15.5" cy="15.5" r="2"/></g>,
  moduloEstufaHorno: <g><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="7.5" r="1.7"/><circle cx="15.5" cy="7.5" r="1.7"/><line x1="3" y1="12" x2="21" y2="12"/><rect x="6" y="14.5" width="12" height="4.5" rx="1"/></g>,
  moduloLavaplatos: <g><rect x="3" y="10" width="18" height="9" rx="2"/><path d="M12 10V5h3"/><line x1="7" y1="14.5" x2="17" y2="14.5"/></g>,
  moduloLavaplatosDoble: <g><rect x="2" y="10" width="20" height="9" rx="2"/><line x1="12" y1="10" x2="12" y2="19"/><path d="M12 10V5h3"/></g>,
  cajoneroTriple: <g><rect x="4" y="3" width="16" height="18" rx="1.5"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></g>,
  cajoneroDoble: <g><rect x="4" y="3" width="16" height="18" rx="1.5"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="10" y1="7.5" x2="14" y2="7.5"/><line x1="10" y1="16.5" x2="14" y2="16.5"/></g>,
  basurero: <g><path d="M6 8h12l-1 12H7L6 8z"/><line x1="4" y1="8" x2="20" y2="8"/><path d="M9 8V5h6v3"/></g>,
  especiero: <g><rect x="4" y="6" width="4" height="13" rx="1"/><rect x="10" y="6" width="4" height="13" rx="1"/><rect x="16" y="6" width="4" height="13" rx="1"/><line x1="4" y1="4" x2="20" y2="4"/></g>,
  botellero: <g><path d="M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3V3z"/><line x1="8" y1="14" x2="16" y2="14"/></g>,
  moduloAlmacInf: <g><rect x="3" y="4" width="18" height="16" rx="1.5"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="10" cy="12" r=".8"/><circle cx="14" cy="12" r=".8"/></g>,
  moduloAlmacSup: <g><rect x="3" y="4" width="18" height="16" rx="1.5"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="10" cy="14" r=".8"/><circle cx="14" cy="14" r=".8"/></g>,
  esquinero1x1: <g><path d="M4 4h10v6h6v10H4V4z"/><line x1="4" y1="10" x2="14" y2="10"/></g>,
  esquineroSuperior: <g><path d="M5 5h9v5h5v9H5V5z"/></g>,
  moduloExtractor: <g><path d="M8 3h8v6l4 7H4l4-7V3z"/><line x1="6" y1="19" x2="18" y2="19"/></g>,
  moduloExtractorMicroondas: <g><path d="M9 2h6v4l3 4H6l3-4V2z"/><rect x="4" y="12" width="16" height="8" rx="1"/><rect x="6" y="14" width="8" height="4"/></g>,
  moduloMicroondas: <g><rect x="3" y="7" width="18" height="11" rx="1.5"/><rect x="5" y="9" width="10" height="7"/><circle cx="18" cy="11" r="1"/><circle cx="18" cy="15" r="1"/></g>,
  moduloPlatero: <g><rect x="3" y="4" width="18" height="15" rx="1.5"/><line x1="8" y1="8" x2="8" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/><line x1="3" y1="19" x2="21" y2="19"/></g>,
  moduloRepisa: <g><rect x="4" y="3" width="16" height="18"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></g>,
  ventana: <g><rect x="4" y="4" width="16" height="16" rx="1"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></g>,
  nichoNevecon: <g><rect x="6" y="2" width="12" height="20" rx="1.5"/><line x1="6" y1="9" x2="18" y2="9"/><line x1="9" y1="5" x2="9" y2="7"/><line x1="9" y1="12" x2="9" y2="16"/></g>,
  nichoNevera: <g><rect x="6" y="4" width="12" height="16" rx="1.5"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="9" y1="7" x2="9" y2="8"/><line x1="9" y1="13" x2="9" y2="16"/></g>,
  alacenaEntrepanos: <g><rect x="6" y="2" width="12" height="20" rx="1.5"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="10" cy="12" r=".8"/></g>,
  alacenaHerraje: <g><rect x="6" y="2" width="12" height="20" rx="1.5"/><path d="M9 7h6M9 12h6M9 17h6"/></g>,
  torreHornos: <g><rect x="6" y="2" width="12" height="20" rx="1.5"/><rect x="8" y="4" width="8" height="5"/><rect x="8" y="11" width="8" height="5"/><line x1="8" y1="19" x2="16" y2="19"/></g>,
};
function ModuleIcon({ k, size = 28, className = "" }: { k: string; size?: number; className?: string }) {
  const g = ICONS[k];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {g || <rect x="4" y="4" width="16" height="16" rx="2" />}
    </svg>
  );
}

type Sel = { t: number; row: PlanRow; id: string } | { t: number; tall: string } | null;

// Medida con botones «−» y «+» SIEMPRE visibles (las flechitas del navegador solo salen al pasar el ratón y en la tablet no existen)
function MedidaStepper({ valor, onCambio, paso = 0.05 }: { valor: number; onCambio: (v: number) => void; paso?: number }) {
  const cambiar = (v: number) => onCambio(Math.max(0, round2(v)));
  // La medida se escribe LIBRE (46, 0,46 o 0.46): se aplica al terminar de escribir (Enter o salir del campo), no letra por letra,
  // así se puede teclear cualquier medida real y no solo saltos de 5 cm.
  const [texto, setTexto] = useState<string | null>(null);
  const aplicar = () => {
    if (texto === null) return;
    const n = parseFloat(texto.trim().replace(",", "."));
    setTexto(null);
    if (!isFinite(n) || n <= 0) return;
    cambiar(n > 5 ? n / 100 : n);   // un número grande (46) se toma como centímetros: ningún módulo mide más de 5 m
  };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => cambiar(valor - paso)} aria-label="Restar 5 cm" className="w-10 h-10 shrink-0 rounded-lg bg-white/10 hover:bg-white/25 active:bg-white/30 text-lg font-bold text-white">−</button>
      <input type="text" inputMode="decimal" value={texto ?? String(valor).replace(".", ",")} aria-label="Medida en metros (se puede escribir cualquier medida, por ejemplo 0,46 o 46 cm)"
        onFocus={(e) => { setTexto(String(valor).replace(".", ",")); e.currentTarget.select(); }}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={aplicar}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicar(); (e.currentTarget as HTMLInputElement).blur(); } else if (e.key === "Escape") { setTexto(null); (e.currentTarget as HTMLInputElement).blur(); } }}
        className="w-[4.2rem] h-10 min-w-0 rounded-lg bg-black/40 border border-white/30 text-center font-mono text-sm text-white focus:outline-none focus:border-primary" />
      <button type="button" onClick={() => cambiar(valor + paso)} aria-label="Sumar 5 cm" className="w-10 h-10 shrink-0 rounded-lg bg-white/10 hover:bg-white/25 active:bg-white/30 text-lg font-bold text-white">+</button>
      <span className="text-xs text-white/60">m</span>
    </div>
  );
}

// Campo de medida suelto (metros): se escribe libre (0,46 o 46 cm) y se aplica al salir del campo o con Enter
function MedidaCampo({ valor, onCambio, className, cero }: { valor: number; onCambio: (v: number) => void; className?: string; cero?: boolean }) {
  const [texto, setTexto] = useState<string | null>(null);
  const aplicar = () => {
    if (texto === null) return;
    const n = parseFloat(texto.trim().replace(",", "."));
    setTexto(null);
    if (!isFinite(n) || n < 0 || (n === 0 && !cero)) return;
    onCambio(round2(n > 5 ? n / 100 : n));
  };
  return (
    <input type="text" inputMode="decimal" value={texto ?? (valor || cero ? String(valor).replace(".", ",") : "")} className={className}
      onFocus={(e) => { setTexto(valor ? String(valor).replace(".", ",") : ""); e.currentTarget.select(); }}
      onChange={(e) => setTexto(e.target.value)} onBlur={aplicar}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); } else if (e.key === "Escape") { setTexto(null); (e.currentTarget as HTMLInputElement).blur(); } }} />
  );
}

export function KitchenModulePlanner({ config, onChange, onSpecialToggle, onPlanSpecial, onRestaurar, capturaRef }: Props) {
  const visor3d = useRef<PlanoModulos3DRef>(null);
  const plan = useMemo(() => normalizePlan(config?.modulePlan, config), [config]);
  const result = useMemo(() => computePlan(plan, config), [plan, config]);
  const specials = activeSpecials(plan, config);
  const [sel, setSel] = useState<Sel>(null);
  const [showExtras, setShowExtras] = useState(false);       // acercar / alejar el dibujo
  const [activaT, setActivaT] = useState(0);                // pared (tramo) a la que se agregan los módulos nuevos
  const [falla3d, setFalla3d] = useState(false);              // si el navegador no puede dibujar en 3D, las tarjetas se muestran directamente
  useEffect(() => {
    if (!capturaRef) return;
    capturaRef.current = () => (["iso", "arriba", "frente"] as const).map((v) => visor3d.current?.capturar(v) || "").filter(Boolean);
    return () => { capturaRef.current = null; };
  });

  // Tarjeta del módulo seleccionado en el 3D: se resalta con su color y la lista se desplaza hasta ella
  const selKey: string | null = !sel ? null : "tall" in sel ? sel.tall : sel.id === "__bloque__" ? null : (plan.tramos[sel.t]?.[sel.row].find(m => m.id === sel.id)?.key ?? null);
  useEffect(() => {
    if (!selKey) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tarjeta="${selKey}"]`)).filter(e => e.offsetParent !== null);
    const el = els.find(e => e.closest("[data-pantalla-completa]")) ?? els[0];
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selKey, sel]);

  // Historial para «Deshacer»: antes de cada cambio se guarda cómo estaba el plano (y los módulos altos marcados)
  const historial = useRef<Array<{ plan: ModulePlan; especiales: Record<string, boolean> }>>([]);
  const [nHistorial, setNHistorial] = useState(0);
  const guardarHistorial = () => {
    historial.current.push({ plan: JSON.parse(JSON.stringify(plan)), especiales: { ...(config?.specialModules || {}) } });
    if (historial.current.length > 50) historial.current.shift();
    setNHistorial(historial.current.length);
  };
  const deshacer = () => {
    const ult = historial.current.pop();
    setNHistorial(historial.current.length);
    if (!ult) return;
    setSel(null);
    if (onRestaurar) onRestaurar(ult.plan, ult.especiales); else onChange(ult.plan);
  };

  const edit = (fn: (p: ModulePlan) => void) => {
    guardarHistorial();
    const p: ModulePlan = JSON.parse(JSON.stringify(plan));
    fn(p);
    try { tidyPlan(p, config); } catch { /* si algo falla, se deja el plan como quedó */ }
    onChange(p);
  };

  // Agrega un módulo alto en la pared elegida: plano + casilla de la cotización en una sola actualización
  const agregarAlto = (key: string, t: number) => {
    if (!onPlanSpecial) { edit(p => { p.specialTramo = { ...(p.specialTramo || {}), [key]: t }; }); onSpecialToggle?.(key, true); return; }
    guardarHistorial();
    const p: ModulePlan = JSON.parse(JSON.stringify(plan));
    p.specialTramo = { ...(p.specialTramo || {}), [key]: t };
    try { tidyPlan(p, { ...config, specialModules: { ...(config?.specialModules || {}), [key]: true } }); } catch { /* se deja como quedó */ }
    onPlanSpecial(p, key, true);
  };

  const enabled = !!config?.modulePlan?.enabled;
  const box = "bg-card rounded-lg p-3 sm:p-4 border border-[rgba(106,207,199,0.12)] space-y-3";

  // ── Barra del módulo seleccionado ────────────────────────────────────────
  const renderSelected = () => {
    if (!sel) return <p className="text-[11px] text-white/35">Toca un módulo para ver y cambiar su medida, moverlo o quitarlo.</p>;
    if ("id" in sel && sel.id === "__bloque__") {
      // Isla o barra: bloque suelto que se coloca donde vaya (orientativo)
      const trB = plan.tramos[sel.t];
      if (!trB) return null;
      const rot = trB.pos?.rot ?? 0;
      return (
        <div className="flex flex-wrap items-center gap-3 rounded border border-amber-300/40 bg-amber-900/20 p-2 text-xs text-amber-100">
          <span className="font-semibold">{trB.name} · {m2(trB.length)} m</span>
          <span className="text-amber-100/60">arrástrala por el piso para ubicarla</span>
          <button type="button" className="h-9 px-3 rounded bg-white/10 hover:bg-white/25" onClick={() => edit(p => { const t0 = p.tramos[sel.t]; t0.pos = { x: t0.pos?.x ?? 0, z: t0.pos?.z ?? 1.8, rot: ((t0.pos?.rot ?? rot) - 90) % 360 }; })}>↺ Girar 90°</button>
          <button type="button" className="h-9 px-3 rounded bg-white/10 hover:bg-white/25" onClick={() => edit(p => { const t0 = p.tramos[sel.t]; t0.pos = { x: t0.pos?.x ?? 0, z: t0.pos?.z ?? 1.8, rot: ((t0.pos?.rot ?? rot) + 90) % 360 }; })}>↻ Girar 90°</button>
          <button type="button" className="h-9 px-3 rounded bg-white/10 hover:bg-white/25" onClick={() => edit(p => { delete p.tramos[sel.t].pos; })}>Volver a su lugar</button>
        </div>
      );
    }
    if ("tall" in sel) {
      const s = specials.find(x => x.key === sel.tall);
      if (!s) return null;
      return (
        <div className="flex flex-wrap items-center gap-3 rounded border border-amber-400/40 bg-amber-900/20 p-2 text-xs text-amber-100">
          <ModuleIcon k={s.key} size={26} />
          <span className="font-semibold">{s.label}</span>
          <span className="font-mono">{m2(s.w)} m</span>
          <span className="text-amber-100/50">piso a techo: ocupa superior e inferior</span>
          {(() => {
            const sp = plan.paintKeys?.[s.key] !== false;
            return (
              <button type="button"
                className={`h-9 px-3 rounded border font-semibold ${sp ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-purple-600/80 border-purple-300/60 text-white hover:bg-purple-600"}`}
                onClick={() => edit(p => { p.paintKeys = { ...(p.paintKeys || {}), [s.key]: !sp }; })}>
                🎨 {sp ? "Quitar pintura" : "Pintar"}
              </button>
            );
          })()}
          <span className="flex gap-1">
            <button type="button" className="w-9 h-9 rounded bg-white/10 hover:bg-white/25" onClick={() => edit(p => moveTall(p, s.key, -1, config))} title="Mover a la izquierda">◀</button>
            <button type="button" className="w-9 h-9 rounded bg-white/10 hover:bg-white/25" onClick={() => edit(p => moveTall(p, s.key, 1, config))} title="Mover a la derecha">▶</button>
          </span>
        </div>
      );
    }
    const tr = plan.tramos[sel.t];
    const arr = tr?.[sel.row] || [];
    const idx = arr.findIndex(m => m.id === sel.id);
    const mod = arr[idx];
    if (!mod) return null;
    const cat = CATALOG_BY_KEY[mod.key];
    const adjustable = !cat.locked;   // también los superiores «amarrados» a un inferior: al cambiarles la medida quedan con la suya
    const esp = espaciosLibres(plan, sel.t, sel.row, mod.id, config);
    const painted = isPainted(plan, mod, sel.row);
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded border p-2 text-xs ${sel.row === "upper" ? "border-purple-400/40 bg-purple-900/20 text-purple-100" : "border-primary/40 bg-teal-900/20 text-teal-100"}`}>
        <ModuleIcon k={mod.key} size={26} />
        <span className="font-semibold">{cat.label}</span>
        {!cat.noPieces && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${painted ? "bg-purple-600/70 text-white" : "bg-white/10 text-white/60"}`}>{painted ? "VA PINTADO" : "SIN PINTAR"}</span>}
        <div className="flex items-center gap-1">
          {adjustable ? (
            <MedidaStepper valor={mod.width} onCambio={(v) => edit(p => setModuleWidth(p, sel.t, sel.row, mod.id, v, config))} />
          ) : <span className="font-mono text-sm">{m2(mod.width)} m</span>}
        </div>
        {Math.abs(mod.width - cat.width) > 0.004 && mod.autoBase === undefined && (
          <span className="text-amber-300">{mod.width > cat.width ? "+" : ""}{m2(mod.width - cat.width)} vs normal</span>
        )}
        {cat.locked && <span className="text-white/50">🔒 medida fija</span>}
        {(mod.autoBase !== undefined || mod.autoOf) && (mod.anchoManual
          ? <span className="flex items-center gap-2 text-amber-200">Medida propia
              <button type="button" className="h-8 px-2 rounded bg-white/10 hover:bg-white/25 text-[11px]" onClick={() => edit(p => { const m0 = p.tramos[sel.t][sel.row].find(x => x.id === mod.id); if (m0) { delete m0.anchoManual; } rebuildAutoUpper(p, sel.t); })}>↺ Volver a automático</button></span>
          : <span className="text-white/60">Automático: sigue a los inferiores; si le cambias la medida queda con la suya</span>)}
        {mod.key === "moduloRepisa" && (
          <label className="flex items-center gap-1">
            repisas
            <input type="number" min="0" step="1" placeholder="?" value={mod.qty ?? ""}
              onChange={(e) => edit(p => { const m = p.tramos[sel.t][sel.row].find(x => x.id === mod.id); if (m) m.qty = e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value) || 0); })}
              className="w-12 bg-black/20 border-b border-amber-300/60 text-right font-mono focus:outline-none" />
          </label>
        )}
        {mod.key === "ventana" && (() => {
          const tr0 = plan.tramos[sel.t];
          const st = rowItems(plan, sel.t, sel.row, config).find(i => i.mod?.id === mod.id)?.start ?? 0;
          const locked = mod.lockAt !== undefined;
          return (
            <>
              <label className="flex items-center gap-1">
                desde el borde izquierdo
                <MedidaCampo cero valor={round2(st)} onCambio={(v) => edit(p => setModuleLock(p, sel.t, sel.row, mod.id, v, config))}
                  className="w-16 bg-black/20 border-b border-blue-300/60 text-right font-mono text-sm focus:outline-none" />
                m
              </label>
              <span className="text-white/50">termina en {m2(st + mod.width)} m{tr0.length > 0 ? ` · a la derecha quedan ${m2(tr0.length - st - mod.width)} m` : ""}</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="accent-blue-400" checked={locked}
                  onChange={(e) => edit(p => setModuleLock(p, sel.t, sel.row, mod.id, e.target.checked ? st : null, config))} />
                🔒 ubicación bloqueada
              </label>
            </>
          );
        })()}
        <span className="flex gap-1">
          <button type="button" className="w-9 h-9 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={idx <= 0 || mod.lockAt !== undefined}
            onClick={() => edit(p => moveModule(p, sel.t, sel.row, mod.id, idx - 1))} title="Mover a la izquierda">◀</button>
          <button type="button" className="w-9 h-9 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={idx >= arr.length - 1 || mod.lockAt !== undefined}
            onClick={() => edit(p => moveModule(p, sel.t, sel.row, mod.id, idx + 1))} title="Mover a la derecha">▶</button>
        </span>
        {adjustable && (
          <button type="button" className="h-9 px-2 rounded bg-green-700/40 hover:bg-green-700/70" title="Ajusta la medida para que el final coincida con el corte de la otra línea"
            onClick={() => edit(p => alignEnd(p, sel.t, sel.row, mod.id, config))}>Alinear con la otra línea</button>
        )}
        {!cat.noPieces && (
          <button type="button"
            className={`h-9 px-3 rounded border font-semibold ${painted ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-purple-600/80 border-purple-300/60 text-white hover:bg-purple-600"}`}
            title={painted ? "Este módulo va pintado. Toca para quitarle la pintura." : "Este módulo NO va pintado. Toca para pintarlo."}
            onClick={() => edit(p => { const m = p.tramos[sel.t][sel.row].find(x => x.id === mod.id); if (m) { m.paint = !painted; m.unpainted = undefined; } })}>
            🎨 {painted ? "Quitar pintura" : "Pintar"}
          </button>
        )}
        {sel.row === "upper" && mod.autoOf && (
            <button type="button" className="px-3 h-9 rounded bg-white/10 hover:bg-white/25 text-xs"
              onClick={() => edit(p => { const m = p.tramos[sel.t].upper.find(x => x.id === mod.id); if (m) delete m.manual; })}
              title="Lo regresa a quedar justo encima de su inferior">⤓ Ponerlo sobre su inferior</button>
          )}
          <button type="button" className="h-9 px-2 rounded bg-red-900/40 hover:bg-red-900/70"
          onClick={() => { edit(p => removeModuleFromPlan(p, sel.t, sel.row, mod.id)); setSel(null); }}>✕ Quitar</button>
        {/* Espacio libre a cada lado (hasta la ventana, el vecino o la pared) y botones para ampliar el mueble hasta allí */}
        {esp && !cat.locked && (
          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            {([["izq", "◀ A la izquierda", esp.izq], ["der", "A la derecha ▶", esp.der]] as const).map(([lado, titulo, e]) => (
              <div key={lado} className="rounded-lg bg-black/25 border border-white/15 p-2 space-y-1.5">
                <p className="text-[11px] text-white/60">{titulo}</p>
                <p className="text-sm text-white">Libre: <b className={e.libre > 0.005 ? "text-amber-300" : "text-white/50"}>{m2(e.libre)} m</b> <span className="text-[11px] text-white/55">hasta {e.hasta}</span></p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" disabled={e.libre < 0.01} className="h-9 rounded-lg bg-white/10 hover:bg-white/25 disabled:opacity-30 text-xs font-semibold text-white"
                    title="Mueve el mueble hasta pegarlo, sin cambiarle la medida" onClick={() => edit(p => { pegarMueble(p, sel.t, sel.row, mod.id, lado, config); })}>{lado === "izq" ? "◀ Pegar" : "Pegar ▶"}</button>
                  <button type="button" disabled={e.libre < 0.01} className="h-9 rounded-lg bg-primary/40 hover:bg-primary/60 disabled:opacity-30 text-xs font-semibold text-white"
                    title="Agranda el mueble hasta llegar allí" onClick={() => edit(p => { ampliarMueble(p, sel.t, sel.row, mod.id, lado, config); })}>Ampliar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const P = result.pieces;
  const pieceRows: Array<[string, number]> = [
    ["Puertas superiores", P.up], ["Puertas inferiores", P.lo], ["Puertas de módulos altos (piso a techo)", P.al],
    ["Tapas de cajón", P.ca], ["Tapas de especiero", P.es], ["Golas / frentes pequeños", P.go], ["Laterales grandes (nicho / alacena)", P.lat], ["Piezas especiales", P.special],
  ];

  // Estado REAL de pintura (cuenta lo marcado módulo por módulo, no solo la casilla de fila o tipo)
  const allMods = plan.tramos.flatMap(tt => (["upper", "lower"] as PlanRow[]).flatMap(r => tt[r].map(mm => ({ mm, r }))))
    .filter(x => !CATALOG_BY_KEY[x.mm.key]?.noPieces);
  const paintState = (list: Array<{ mm: PlanModule; r: PlanRow }>): { state: "all" | "some" | "none"; n: number; total: number } => {
    const n = list.filter(x => isPainted(plan, x.mm, x.r)).length;
    return { state: list.length === 0 ? "none" : n === list.length ? "all" : n === 0 ? "none" : "some", n, total: list.length };
  };

  const stepper = (label: string, field: keyof ModulePlan["extras"]) => (
    <div key={field} className="flex items-center gap-2 text-xs text-white/70">
      <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/20" onClick={() => edit(p => { p.extras[field] = Math.max(0, (p.extras[field] || 0) - 1); })}>−</button>
      <span className="w-6 text-center font-mono text-white">{plan.extras[field] || 0}</span>
      <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/20" onClick={() => edit(p => { p.extras[field] = (p.extras[field] || 0) + 1; })}>+</button>
      <span>{label}</span>
    </div>
  );

  // ── 3D: UNA sola lista de módulos (inferiores, superiores y altos). Se agregan a la pared elegida y se pueden pasar a otra ──
  const tAct = Math.min(activaT, Math.max(0, plan.tramos.length - 1));
  const trAct = plan.tramos[tAct];
  const cuentaDe = (key: string) => plan.tramos.reduce((a, tt) => a + tt.lower.filter(m => m.key === key).length + tt.upper.filter(m => m.key === key).length, 0);
  const quitarUno = (key: string, row: PlanRow) => edit(p => {
    const orden = [tAct, ...p.tramos.map((_, i) => i).filter(i => i !== tAct)];
    for (const i of orden) { const ult = [...p.tramos[i][row]].reverse().find(m => m.key === key); if (ult) { removeModuleFromPlan(p, i, row, ult.id); return; } }
  });
  // Esquinas de la cocina: en L una (A–B) y en U dos (A–B y B–C). El esquinero va siempre en la esquina y se puede girar a la otra.
  const esquinas = esquinasDeLayout(config?.layout).filter(o => plan.tramos[o] && plan.tramos[o + 1] && !plan.tramos[o].isIsland && !plan.tramos[o + 1].isIsland);
  const nombreEsquina = (o: number) => `${plan.tramos[o].name.replace("Pared ", "")}–${plan.tramos[o + 1].name.replace("Pared ", "")}`;
  const quitarAlto = (key: string) => { guardarHistorial(); onSpecialToggle?.(key, false); };
  // Tarjetas claras: arriba el icono y el nombre, en medio la medida, abajo los botones grandes − / cantidad / +
  const btnCant = "h-10 rounded-lg bg-white/10 hover:bg-white/25 active:bg-white/30 text-lg font-bold text-white disabled:opacity-30";
  const claseTarjeta = (cnt: number, tono: "lower" | "upper" | "tall", apagada: boolean, elegida = false) =>
    `relative rounded-xl border-2 p-3 flex flex-col gap-2.5 min-w-0 transition-shadow ${apagada ? "opacity-35" : ""} ${elegida ? "!border-cyan-300 !bg-cyan-900/55 ring-4 ring-cyan-300/70 shadow-lg shadow-cyan-300/30" : ""} ${cnt > 0
      ? (tono === "upper" ? "bg-purple-900/35 border-purple-400/70" : tono === "tall" ? "bg-amber-900/35 border-amber-400/70" : "bg-teal-900/40 border-primary/70")
      : "bg-white/[0.04] border-white/15"}`;
  const renderPaletaUnica = (enPanel = false) => {
    const tarjeta = (o: { key: string; label: string; width: number; locked?: boolean; corner?: boolean }, row: PlanRow) => {
      const cnt = cuentaDe(o.key);
      if (o.corner) {
        return (
          <div key={o.key} data-tarjeta={o.key} className={claseTarjeta(cnt, row, esquinas.length === 0, selKey === o.key)}>
            {selKey === o.key && <span className="absolute -top-2.5 right-3 rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-extrabold text-slate-900">● SELECCIONADO</span>}
            <div className="flex items-start gap-2 min-w-0">
              <ModuleIcon k={o.key} size={34} className="shrink-0 text-white/85" />
              <span className="text-sm font-semibold text-white leading-snug break-words">{o.label}</span>
            </div>
            <div className="text-xs text-white/70">🔒 Medida fija {m2(o.width)} × {m2(o.width)} m (en «L») · Llevas: <b className="text-white text-sm">{cnt}</b></div>
            {esquinas.length === 0
              ? <p className="text-xs text-white/55">Solo en cocinas en L o en U</p>
              : <div className="flex flex-col gap-1.5">{esquinas.map(e => {
                  const ocupada = plan.tramos[e][row].some(x => x.key === o.key && x.alsoTramo !== undefined);
                  return (
                    <button key={e} type="button" disabled={ocupada} className="h-10 rounded-lg bg-white/10 hover:bg-white/25 disabled:opacity-40 text-sm font-semibold text-white px-2"
                      title={ocupada ? `La esquina ${nombreEsquina(e)} ya tiene su esquinero` : `Poner en la esquina ${nombreEsquina(e)}`} onClick={() => edit(p => { addModuleToPlan(p, e, row, o.key, config); })}>
                      {ocupada ? `✓ Esq. ${nombreEsquina(e)}` : `+ Esq. ${nombreEsquina(e)}`}
                    </button>
                  );
                })}
                {cnt > 0 && <button type="button" className="h-9 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-xs font-semibold text-red-100" onClick={() => quitarUno(o.key, row)}>− Quitar uno</button>}
              </div>}
          </div>
        );
      }
      const bloqueado = row === "upper" && !!trAct?.isIsland;
      // Si hay un módulo de este tipo SELECCIONADO, la medida de la tarjeta es la de ESE módulo (y solo la de ese): puede haber varios del mismo tipo con medidas distintas.
      // Si no hay ninguno seleccionado, la medida es la de los módulos NUEVOS de este tipo; los que ya están puestos no se tocan.
      const modSel = selKey === o.key && sel && "id" in sel && sel.id !== "__bloque__" ? plan.tramos[sel.t]?.[sel.row].find(m => m.id === sel.id) : undefined;
      const curW = modSel ? modSel.width : ((!o.locked && plan.defaultWidth?.[o.key]) || o.width);
      return (
        <div key={o.key} data-tarjeta={o.key} className={claseTarjeta(cnt, row, bloqueado, selKey === o.key)}>
          {selKey === o.key && <span className="absolute -top-2.5 right-3 rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-extrabold text-slate-900">● SELECCIONADO</span>}
          <div className="flex items-start gap-2 min-w-0">
            <ModuleIcon k={o.key} size={34} className="shrink-0 text-white/85" />
            <span className="text-sm font-semibold text-white leading-snug break-words">{o.label}</span>
          </div>
          {o.locked
            ? <div className="text-xs text-white/70">🔒 Medida fija: <b className="text-white text-sm">{m2(o.width)} m</b></div>
            : <div className="space-y-1">
                <span className={`text-xs ${modSel ? "text-cyan-200 font-semibold" : "text-white/70"}`}>{modSel ? "Medida del módulo seleccionado" : "Medida de los módulos nuevos"}</span>
                <MedidaStepper valor={curW} onCambio={(v) => edit(p => { if (modSel && sel && "id" in sel) setModuleWidth(p, sel.t, sel.row, sel.id, v, config); else setDefaultWidth(p, o.key, v); })} />
                {cnt > 1 && !modSel && (
                  <button type="button" className="text-[11px] text-white/55 underline hover:text-white" title="Pone esta medida a TODOS los de este tipo"
                    onClick={() => edit(p => { p.tramos.forEach((_, i) => setTypeWidth(p, i, row, o.key, curW)); })}>Igualar los {cnt} a {m2(curW)} m</button>
                )}
              </div>}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button type="button" className={btnCant} disabled={cnt === 0} onClick={() => quitarUno(o.key, row)} aria-label="Quitar uno">−</button>
            <span className={`min-w-[2rem] text-center font-mono text-lg ${cnt > 0 ? "text-white font-bold" : "text-white/40"}`}>{cnt}</span>
            <button type="button" className={`${btnCant} bg-primary/40 hover:bg-primary/60`} disabled={bloqueado} onClick={() => edit(p => { addModuleToPlan(p, tAct, row, o.key, config); })} aria-label={`Agregar a ${trAct?.name}`}>+</button>
          </div>
        </div>
      );
    };
    // Candado de los módulos de piso a techo: cerrado = medida estándar; al tocarlo se abre y se puede ampliar o reducir (electrodoméstico especial, completar la pared)
    const renderMedidaAlta = (key: string, estandar: number) => {
      const propia = plan.specialWidths?.[key];
      const abierto = !!propia && Math.abs(propia - estandar) > 0.001;
      const actual = abierto ? propia! : estandar;
      const poner = (v: number) => edit(p => { const sw = { ...(p.specialWidths || {}) }; if (v > 0 && Math.abs(v - estandar) > 0.001) sw[key] = round2(v); else delete sw[key]; p.specialWidths = sw; });
      return abierto ? (
        <div className="space-y-1.5">
          <MedidaStepper valor={actual} onCambio={poner} />
          <button type="button" className="h-9 w-full rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white" onClick={() => poner(estandar)}>🔒 Volver a {m2(estandar)} m</button>
        </div>
      ) : (
        <button type="button" className="h-9 w-full rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white" onClick={() => poner(round2(estandar + 0.05))}
          title="Cambiar la medida de este módulo (electrodoméstico especial o para completar la pared)">🔒 Medida fija {m2(estandar)} m · tocar para cambiarla</button>
      );
    };
    const tarjetaAlta = (o: typeof SPECIALS[number]) => {
      const act = specials.find(s => s.key === o.key);
      const bloqueado = !act && !!trAct?.isIsland;
      return (
        <div key={o.key} data-tarjeta={o.key} className={claseTarjeta(act ? 1 : 0, "tall", bloqueado, selKey === o.key)}>
          {selKey === o.key && <span className="absolute -top-2.5 right-3 rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-extrabold text-slate-900">● SELECCIONADO</span>}
          <div className="flex items-start gap-2 min-w-0">
            <ModuleIcon k={o.key} size={34} className="shrink-0 text-white/85" />
            <span className="text-sm font-semibold text-white leading-snug break-words">{o.label}</span>
          </div>
          <div className="text-xs text-white/70">{act ? <>Está en <b className="text-white text-sm">{plan.tramos[act.tramo]?.name}</b></> : <>Medida estándar: <b className="text-white text-sm">{m2(o.width)} m</b></>}</div>
          {renderMedidaAlta(o.key, o.width)}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button type="button" className={btnCant} disabled={!act || !onSpecialToggle} onClick={() => quitarAlto(o.key)} aria-label="Quitar">−</button>
            <span className={`min-w-[2rem] text-center font-mono text-lg ${act ? "text-white font-bold" : "text-white/40"}`}>{act ? 1 : 0}</span>
            <button type="button" className={`${btnCant} bg-primary/40 hover:bg-primary/60`} disabled={bloqueado || !onSpecialToggle || !!act} onClick={() => agregarAlto(o.key, tAct)} aria-label={`Agregar a ${trAct?.name}`}>+</button>
          </div>
        </div>
      );
    };
    // Columnas según el ANCHO DEL PANEL (no el de la pantalla): en el panel de pantalla completa van 2 y dentro de la cotización 2 o 3
    const rejilla = enPanel ? "grid grid-cols-2 gap-2.5" : "grid grid-cols-2 lg:grid-cols-3 gap-2.5";
    return (
      <div className="space-y-4">
        {/* A qué pared se agregan los módulos nuevos, y cuánto FALTA en cada una para llenar el muro */}
        <div className="rounded-xl border-2 border-white/15 bg-black/20 p-3 space-y-2.5">
          <p className="text-sm font-bold text-white">Agregar módulos a la pared:</p>
          <div className="grid grid-cols-1 gap-2">
            {plan.tramos.map((tt, i) => {
              const li = rowUsed(plan, i, "lower", config), ls = tt.isIsland ? null : rowUsed(plan, i, "upper", config);
              const barra = (lleva: number, largo: number) => {
                const pct = largo > 0 ? Math.min(100, (lleva / largo) * 100) : 0, falta = largo - lleva;
                const col = falta < -0.005 ? "bg-red-500" : falta < 0.005 ? "bg-emerald-500" : "bg-amber-500";
                const txt = falta < -0.005 ? `Te pasas ${m2(-falta)} m` : falta < 0.005 ? "Completo ✓" : `FALTAN ${m2(falta)} m`;
                return { pct, col, txt, tc: falta < -0.005 ? "text-red-300" : falta < 0.005 ? "text-emerald-300" : "text-amber-300" };
              };
              const bi = barra(li, tt.length), bs = ls === null ? null : barra(ls, tt.length);
              return (
                <button key={i} type="button" onClick={() => setActivaT(i)}
                  className={`w-full text-left rounded-xl border-2 px-3 py-2.5 ${i === tAct ? "bg-primary/25 border-primary" : "border-white/15 hover:border-white/30"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{i === tAct ? "● " : "○ "}{tt.name}</span>
                    <span className="text-xs text-white/60">mide {m2(tt.length)} m</span>
                  </span>
                  <span className="block mt-1.5 space-y-1.5">
                    <span className="block">
                      <span className="flex justify-between text-xs"><span className="text-white/75">▼ Abajo · lleva {m2(li)}</span><span className={`font-bold ${bi.tc}`}>{bi.txt}</span></span>
                      <span className="block h-2 rounded bg-white/10 overflow-hidden"><span className={`block h-full ${bi.col}`} style={{ width: `${bi.pct}%` }} /></span>
                    </span>
                    {bs && ls !== null && (
                      <span className="block">
                        <span className="flex justify-between text-xs"><span className="text-white/75">▲ Arriba · lleva {m2(ls)}</span><span className={`font-bold ${bs.tc}`}>{bs.txt}</span></span>
                        <span className="block h-2 rounded bg-white/10 overflow-hidden"><span className={`block h-full ${bs.col}`} style={{ width: `${bs.pct}%` }} /></span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/55">Toca una pared (aquí o en el 3D) para elegirla. Los módulos nuevos se agregan a la pared elegida y los puedes arrastrar a otra o tocarlos y usar «Pasar a…».</p>
        </div>
        {renderControlesBloque()}
        <div className="rounded-lg px-3 py-2 bg-teal-900/60 border border-primary/50 text-sm font-bold uppercase tracking-wider text-teal-100">▼ Módulos inferiores</div>
        <div className={rejilla}>{CATALOG.filter(c => c.row === "lower").map(c => tarjeta(c, "lower"))}</div>
        <div className="rounded-lg px-3 py-2 bg-purple-900/60 border border-purple-400/50 text-sm font-bold uppercase tracking-wider text-purple-100">▲ Módulos superiores</div>
        <div className={rejilla}>{CATALOG.filter(c => c.row === "upper").map(c => tarjeta(c, "upper"))}</div>
        <div className="rounded-lg px-3 py-2 bg-amber-900/60 border border-amber-400/50 text-sm font-bold uppercase tracking-wider text-amber-100">▮ Módulos altos (piso a techo)</div>
        <div className={rejilla}>{SPECIALS.map(o => tarjetaAlta(o))}</div>
      </div>
    );
  };

  // Mover la isla / la barra (bloques sueltos): flechas a lo largo de la pared A y hacia/desde ella, y giro de 90°
  const [pasoMover, setPasoMover] = useState(0.1);
  const renderControlesBloque = () => {
    const tB = trAct?.isIsland ? tAct : (sel && sel.t !== undefined && plan.tramos[sel.t]?.isIsland ? sel.t : -1);
    if (tB < 0) return null;
    const nombre = plan.tramos[tB].name;
    const mover = (along: number, away: number) => {
      const np = visor3d.current?.mover(tB, along * pasoMover, away * pasoMover);
      if (np) edit(p => { p.tramos[tB].pos = { x: np.x, z: np.z, rot: p.tramos[tB].pos?.rot ?? np.rot }; });
    };
    const girar = (g: number) => {
      const np = visor3d.current?.mover(tB, 0, 0);
      if (np) edit(p => { const t0 = p.tramos[tB]; t0.pos = { x: t0.pos?.x ?? np.x, z: t0.pos?.z ?? np.z, rot: (((t0.pos?.rot ?? np.rot) + g) % 360 + 360) % 360 }; });
    };
    const b = "h-11 rounded-lg bg-white/10 hover:bg-white/25 active:bg-white/30 text-white text-base font-bold";
    return (
      <div className="rounded-xl border-2 border-amber-400/50 bg-amber-900/20 p-3 space-y-2.5">
        <p className="text-sm font-bold text-amber-100">Mover «{nombre}» (con todos sus módulos)</p>
        <p className="text-xs text-white/60">{plan.tramos[tB].lower.length > 0 ? "La isla está BLOQUEADA porque ya tiene módulos: arrastra cada módulo por su cuenta (sus frentes miran al interior de la cocina) y muévela entera solo con estas flechas." : "Mientras esté vacía puedes arrastrar la base amarilla en el 3D."} Las flechas son respecto a la pared A.</p>
        <div className="grid grid-cols-3 gap-1.5 max-w-[260px]">
          <span /><button type="button" className={b} onClick={() => mover(0, -1)} title="Acercar a la pared A">▲ Acercar</button><span />
          <button type="button" className={b} onClick={() => mover(-1, 0)} title="A la izquierda">◀</button>
          <button type="button" className="h-11 rounded-lg bg-white/5 text-[11px] text-white/50" onClick={() => edit(p => { delete p.tramos[tB].pos; })}>Volver a su lugar</button>
          <button type="button" className={b} onClick={() => mover(1, 0)} title="A la derecha">▶</button>
          <span /><button type="button" className={b} onClick={() => mover(0, 1)} title="Alejar de la pared A">▼ Alejar</button><span />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`${b} px-3`} onClick={() => girar(-90)}>↺ Girar 90°</button>
          <button type="button" className={`${b} px-3`} onClick={() => girar(90)}>↻ Girar 90°</button>
          <label className="flex items-center gap-1 text-xs text-white/70">Paso
            <select value={pasoMover} onChange={(e) => setPasoMover(parseFloat(e.target.value))} className="h-10 rounded bg-black/40 border border-white/30 text-white text-sm px-1">
              <option value={0.05}>5 cm</option><option value={0.1}>10 cm</option><option value={0.25}>25 cm</option><option value={0.5}>50 cm</option>
            </select>
          </label>
        </div>
      </div>
    );
  };

  // Botones «Pasar a Pared X» del módulo seleccionado
  const renderPasarA = () => {
    if (!sel || ("id" in sel && sel.id === "__bloque__")) return null;
    const destinos = plan.tramos.map((tt, i) => ({ tt, i })).filter(({ i }) => i !== sel.t);
    if (!destinos.length) return null;
    const esAlto = "tall" in sel;
    const row: PlanRow | null = esAlto ? null : sel.row;
    const mod = esAlto ? null : plan.tramos[sel.t]?.[sel.row].find(m => m.id === sel.id);
    const cat = mod ? CATALOG_BY_KEY[mod.key] : null;
    if (!esAlto && mod && (cat?.corner || mod.alsoTramo !== undefined) && !mod.autoOf) {
      // Esquinero: va fijo en la esquina; en una cocina en U se puede girar a la otra esquina
      const otra = esquinas.length > 1 ? esquinas[(Math.max(0, esquinas.indexOf(sel.t)) + 1) % esquinas.length] : undefined;
      return otra !== undefined ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <span>Esquinero en la esquina {nombreEsquina(sel.t)}:</span>
          <button type="button" className="h-9 px-3 rounded bg-white/10 hover:bg-white/25"
            onClick={() => { edit(p => { girarEsquinero(p, sel.t, row!, (sel as { id: string }).id, esquinas, config); }); setSel(null); }}>↻ Girar a la esquina {nombreEsquina(otra)}</button>
        </div>
      ) : <p className="text-[11px] text-white/40">Este esquinero va fijo en la esquina {nombreEsquina(sel.t)}.</p>;
    }
    if (!esAlto && (!mod || cat?.corner || mod.alsoTramo !== undefined || mod.autoOf || mod.lockAt !== undefined)) {
      return <p className="text-[11px] text-white/40">{mod?.lockAt !== undefined ? "La ventana no se pasa de pared." : mod?.autoOf ? "Este módulo sigue a su inferior: para cambiarlo de esquina, gira el esquinero inferior." : "Este módulo va fijo en su esquina."}</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
        <span>Pasar a:</span>
        {destinos.map(({ tt, i }) => {
          const bloqueado = (!esAlto && row === "upper" && !!tt.isIsland) || (esAlto && !!tt.isIsland);
          return (
            <button key={i} type="button" disabled={bloqueado} className="h-9 px-3 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30"
              onClick={() => {
                if (esAlto) { const key = (sel as { tall: string }).tall; edit(p => { p.specialTramo = { ...(p.specialTramo || {}), [key]: i }; dropTall(p, key, primerHueco(p, i, "lower", specialWidth(p, key), config), config); }); setSel({ t: i, tall: key }); }
                else edit(p => { moveModuleToTramo(p, sel.t, row!, (sel as { id: string }).id, i, primerHueco(p, i, row!, mod!.width, config), config); });
                if (!esAlto) setSel(null);
              }}>{tt.name}</button>
          );
        })}
      </div>
    );
  };

  // Laterales de los módulos altos (pieza grande que se cobra aparte)
  const renderLaterales = () => specials.filter(sp => sp.lateral).length > 0 ? (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-100/80">
      {specials.filter(sp => sp.lateral).map(sp => (
        <label key={sp.key} className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" checked={lateralOn(plan, sp.key)}
            onChange={(e) => edit(p => { p.specialLateral = { ...(p.specialLateral || {}), [sp.key]: e.target.checked }; })} />
          {sp.label}: con lateral (pieza grande)
        </label>
      ))}
    </div>
  ) : null;

  const content = (
    <div className={box}>
      <div className="flex items-center gap-2">
        {!enabled && (
          <input
            type="checkbox"
            id="modulePlanEnabled"
            className="h-4 w-4 accent-primary"
            checked={enabled}
            onChange={(e) => edit(p => { p.enabled = e.target.checked; })}
          />
        )}
        <label htmlFor="modulePlanEnabled" className={`text-xs sm:text-sm font-semibold text-white/85 ${enabled ? "" : "cursor-pointer"}`}>
          Plano de módulos de la cocina <span className="font-normal text-white/40">(cuenta módulos y piezas; alimenta la descripción, el PDF y la pintura)</span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4">
          <p className="text-xs text-primary/70">
            Forma de la cocina: <b>{config?.layout || "sin definir"}</b>. Pon el largo de cada pared, agrega módulos con las tarjetas y acomódalos en el dibujo.
            Líneas verdes = el corte coincide arriba y abajo; ámbar = solo en una línea.
          </p>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-blue-500" checked={plan.autoUpper !== false}
              onChange={(e) => edit(p => { p.autoUpper = e.target.checked; })} />
            El diseño lo marcan los inferiores: los superiores se arman solos
            <span className="text-white/35">(lavaplatos→platero, estufa→extractor, cajoneros→almacenamiento; botellero/basurero/especiero pegados al esquinero agrandan el de arriba)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-blue-500" checked={plan.conManijas === true}
              onChange={(e) => edit(p => { p.conManijas = e.target.checked; })} />
            <span>Con manijas <span className="text-white/45">(solo si el cliente lo pide; por defecto es sistema gola, sin manijas)</span></span>
          </label>

          <div className="space-y-2">
            {!falla3d ? (
              <>
                <Suspense fallback={<div className="h-[420px] rounded-lg bg-black/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">Cargando el plano en 3D…</div>}>
                  <PlanoModulos3D
                    ref={visor3d}
                    plan={plan} config={config} sel={sel} onSelect={(x) => { setSel(x); if (x && typeof (x as any).t === "number") setActivaT((x as any).t); }} onEdit={edit} onFalla={() => setFalla3d(true)}
                    activa={tAct} onPickPared={setActivaT}
                    onDeshacer={deshacer} puedeDeshacer={nHistorial > 0}
                    resumen={plan.tramos.map((tt, i) => ({ nombre: tt.name, largo: tt.length, llevaAbajo: rowUsed(plan, i, "lower", config), llevaArriba: tt.isIsland ? null : rowUsed(plan, i, "upper", config), activa: i === tAct }))}
                    panel={<div className="space-y-4"><button type="button" onClick={deshacer} disabled={nHistorial === 0} className="w-full h-11 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-35 text-white text-sm font-bold">↶ Deshacer el último cambio ({nHistorial})</button>{renderSelected()}{renderPasarA()}{renderPaletaUnica(true)}{renderLaterales()}</div>}
                    moveTramo={(p, fromT, row, id, toT, start) => moveModuleToTramo(p, fromT, row, id, toT, start, config)}
                    dropMod={(p, t, row, id, start) => { moverValidando(p, config, (q) => dropModule(q, t, row, id, start, config, true)); }}
                    acomodar={(p) => { try { tidyPlan(p, config); } catch { /* */ } }}
                    dropTallTo={(p, key, tramo, start) => { moverValidando(p, config, (q) => { q.specialTramo = { ...(q.specialTramo || {}), [key]: tramo }; dropTall(q, key, start, config); }); }}
                  />
                </Suspense>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <p className="flex-1 min-w-[200px] text-xs text-white/70">Para agregar módulos, cambiar sus medidas, moverlos entre paredes o ver las piezas, abre el editor en pantalla completa.</p>
                  <button type="button" onClick={() => visor3d.current?.abrirPantalla()} className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold">Abrir editor de módulos</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-200">Este equipo no pudo dibujar el plano en 3D. Los módulos se agregan y se editan con estas tarjetas.</p>
                {renderSelected()}
                {renderPasarA()}
                {renderPaletaUnica()}
                {renderLaterales()}
              </>
            )}
          </div>

          {plan.tramos.map((tr, t) => (
            <div key={t} className="rounded-lg border border-white/10 p-3 space-y-3 bg-black/10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-white/85">{tr.name}</span>
                <label className="flex items-center gap-1 text-xs text-white/60">
                  Largo
                  <MedidaCampo valor={tr.length || 0} onCambio={(v) => edit(p => { p.tramos[t].length = v; })}
                    className="w-16 bg-transparent border-b border-white/30 text-right font-mono text-white focus:outline-none" />
                  m
                </label>
                <button type="button" onClick={() => edit(p => { packRow(p, t, "lower", config); })}
                  className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] text-white/75" title="Junta los módulos de abajo sin dejar espacios">
                  Cerrar espacios
                </button>
              </div>

            </div>
          ))}

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-900/10 p-3 text-xs text-amber-200 space-y-1">
              {result.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
            </div>
          )}

          <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-3 space-y-3">
            <p className="text-sm font-semibold text-purple-200">Piezas a pintar (alto brillo)</p>
            {/* Atajos: el control fino es tocar el módulo en el dibujo (Pintar / Quitar pintura) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(["upper", "lower"] as PlanRow[]).map(r => {
                const ps = paintState(allMods.filter(x => x.r === r));
                if (ps.total === 0) return null;
                const all = ps.state === "all";
                return (
                  <button key={r} type="button"
                    className={`h-8 px-3 rounded border ${all ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-purple-600/70 border-purple-300/60 text-white hover:bg-purple-600"}`}
                    onClick={() => edit(p => {
                      p.paintRows = { ...(p.paintRows || {}), [r]: !all };
                      const keys = new Set(CATALOG.filter(cc => cc.row === r).map(cc => cc.key));
                      p.paintKeys = Object.fromEntries(Object.entries(p.paintKeys || {}).filter(([k]) => !keys.has(k)));
                      p.tramos.forEach(tt => tt[r].forEach(mm => { mm.paint = undefined; mm.unpainted = undefined; }));
                    })}>
                    🎨 {all ? "Quitar pintura a todos los" : "Pintar todos los"} {r === "upper" ? "superiores" : "inferiores"} <span className="opacity-70">({ps.n}/{ps.total})</span>
                  </button>
                );
              })}
              {specials.length > 0 && (() => {
                const allOn = specials.every(s => plan.paintKeys?.[s.key] !== false);
                return (
                  <button type="button"
                    className={`h-8 px-3 rounded border ${allOn ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-purple-600/70 border-purple-300/60 text-white hover:bg-purple-600"}`}
                    onClick={() => edit(p => { p.paintKeys = { ...(p.paintKeys || {}), ...Object.fromEntries(specials.map(s => [s.key, !allOn])) }; })}>
                    🎨 {allOn ? "Quitar pintura a los" : "Pintar los"} de piso a techo
                  </button>
                );
              })()}
            </div>

            {/* Solo lo que va pintado */}
            {(() => {
              const groups = new Map<string, { key: string; label: string; w: number; n: number }>();
              result.detail.filter(d => d.painted && !d.noPieces && d.row !== "extra").forEach(d => {
                const k = `${d.key}|${d.width}`;
                const g = groups.get(k);
                if (g) g.n += 1; else groups.set(k, { key: d.key, label: CATALOG_BY_KEY[d.key]?.short || d.label, w: d.width || 0, n: 1 });
              });
              if (!groups.size) return null;
              return (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white/60">Módulos que se pintan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(groups.values()).map(g => (
                      <span key={`${g.key}${g.w}`} className="flex items-center gap-1.5 rounded border border-purple-500/40 bg-purple-900/30 px-2 py-1 text-xs text-purple-100">
                        <ModuleIcon k={g.key} size={16} />
                        {g.n > 1 ? `${g.n} × ` : ""}{g.label} <span className="text-purple-100/50">{m2(g.w)} m</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
            {pieceRows.every(([, n]) => !n) && <p className="text-xs text-white/40">Ninguna pieza marcada para pintar.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pieceRows.filter(([, n]) => n > 0).map(([label, n]) => (
                <div key={label} className="rounded bg-black/25 px-2 py-1.5 text-center">
                  <div className="text-lg font-bold text-purple-200 font-mono">{n}</div>
                  <div className="text-[11px] text-white/50 leading-tight">{label}</div>
                </div>
              ))}
            </div>
            {(() => {
              const EX: Array<[string, keyof ModulePlan["extras"]]> = [
                ["Lateral de mueble superior", "latSup"], ["Lateral de mueble inferior", "latInf"],
                ["Puerta de módulo alto", "puertaAlta"],
                ["Laterales de isla (solo si la isla no lleva laterales de mesón)", "latIsla"],
                ["Puerta de lavavajillas / lavadora integrada", "puertaElectro"], ["Puerta de nevera integrada", "puertaNevera"],
                ["Piezas especiales (diseño especial, se cotizan aparte)", "especiales"],
              ];
              const used = EX.filter(([, k]) => (plan.extras[k] || 0) > 0);
              const shown = showExtras ? EX : used;
              return (
                <div className="space-y-1.5">
                  {shown.length > 0 && <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Extras por diseño</p>}
                  {shown.map(([label, k]) => stepper(label, k))}
                  <button type="button" onClick={() => setShowExtras(v => !v)}
                    className="w-full text-left rounded-lg border border-dashed border-purple-400/60 bg-purple-900/20 hover:bg-purple-900/35 px-3 py-2 transition-colors">
                    <span className="block text-sm font-bold tracking-wide text-purple-100">{showExtras ? "− Ocultar piezas extra" : "+ Agregar pieza extra"}</span>
                    <span className="block text-[11px] text-purple-200/60">Laterales de mueble, puerta de módulo alto o piezas de diseño especial</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {result.modules.length > 0 && (
            <div className="rounded-lg border border-white/10 p-3 text-xs text-white/70 space-y-1">
              <p className="font-semibold text-white/80">Módulos de la cocina</p>
              {result.modules.map(mm => (
                <p key={mm.key}>• {mm.qty > 1 ? `${mm.qty} × ` : ""}{mm.label} <span className="text-white/40">({mm.widths.map(m2).join(" + ")} m)</span></p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
  return content;
}
