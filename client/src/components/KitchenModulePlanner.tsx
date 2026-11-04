import { useMemo, useRef, useState, type ReactElement, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import {
  CATALOG, CATALOG_BY_KEY, FILL_KEYS, SPECIALS,
  normalizePlan, computePlan, rowItems, rowUsed, activeSpecials, lateralOn, isPainted,
  addModuleToPlan, removeModuleFromPlan, setModuleWidth, moveModule, moveTall, dropModule, dropTall, tidyPlan, packRow, setModuleLock, setTypeWidth, alignEnd, rebuildAutoUpper,
  round2,
  specialWidth,
  type ModulePlan, type PlanModule, type PlanRow, type RowItem,
} from "@shared/kitchenModulePlan";

// Plano de módulos por tramos, visto de frente: superiores arriba, inferiores abajo,
// y los módulos de piso a techo como un solo bloque largo. Solo cuenta módulos y piezas de pintura.
// No cambia precios ni el PDF: guarda su estado en kitchenConfig.modulePlan.

interface Props {
  config: any;                       // kitchenConfig del ítem
  onChange: (plan: ModulePlan) => void;
  // Marca / desmarca un módulo de piso a techo en la cotización (specialModules). Si no se pasa, las tarjetas son de solo lectura.
  onSpecialToggle?: (key: string, on: boolean) => void;
}

let PX = 120;        // píxeles por metro en el dibujo
const LANE_H = 76;     // alto de cada línea (superiores / inferiores)
const DIV_H = 14;      // alto de la franja que divide
// Fondo rayado para lo que NO va pintado
const NO_PAINT_BG: CSSProperties = { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 9px)" };
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

// Cota: línea con topes y la medida en metros, centrada bajo el icono
function Cota({ w }: { w: number }) {
  return (
    <div className="absolute left-1 right-1 bottom-0.5 flex flex-col items-center pointer-events-none">
      <span className="text-[10px] leading-none font-mono text-white/85">{(Number(w) || 0).toFixed(2)}</span>
      <div className="relative w-full h-[5px] border-t border-white/50 mt-[1px]">
        <span className="absolute left-0 -top-[3px] h-[5px] border-l border-white/60" />
        <span className="absolute right-0 -top-[3px] h-[5px] border-l border-white/60" />
      </div>
    </div>
  );
}

type Sel = { t: number; row: PlanRow; id: string } | { t: number; tall: string } | null;

export function KitchenModulePlanner({ config, onChange, onSpecialToggle }: Props) {
  const plan = useMemo(() => normalizePlan(config?.modulePlan, config), [config]);
  const result = useMemo(() => computePlan(plan, config), [plan, config]);
  const specials = activeSpecials(plan, config);
  const [sel, setSel] = useState<Sel>(null);
  const ZOOMS = [70, 95, 120, 170, 220];   // píxeles por metro
  const [zoom, setZoom] = useState(2);
  const [showExtras, setShowExtras] = useState(false);       // acercar / alejar el dibujo
  PX = ZOOMS[zoom];
  // Arrastre con puntero (funciona con dedo y con ratón)
  const dragRef = useRef<{ kind: "mod" | "tall"; t: number; row?: PlanRow; id: string; startX: number; moved: boolean; locked?: boolean; box: HTMLElement | null } | null>(null);
  const [dragDx, setDragDx] = useState<{ id: string; dx: number } | null>(null);

  const startDrag = (e: RPointerEvent<HTMLElement>, info: { kind: "mod" | "tall"; t: number; row?: PlanRow; id: string; locked?: boolean }) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { ...info, startX: e.clientX, moved: false, box: e.currentTarget.closest("[data-elev]") as HTMLElement | null };
  };
  const moveDrag = (e: RPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    if (d.moved && !d.locked) setDragDx({ id: d.id, dx });
  };
  const endDrag = (e: RPointerEvent<HTMLElement>, onClick: () => void) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragDx(null);
    if (!d) return;
    if (d.locked && d.moved) return;   // ubicación bloqueada: no se arrastra
    if (!d.moved || !d.box) { onClick(); return; }
    const dM = (e.clientX - d.startX) / PX;   // metros que se arrastró
    if (d.kind === "tall") {
      const cur = rowItems(plan, d.t, "lower", config).find(i => i.kind === "tall" && i.key === d.id);
      if (cur) edit(p => dropTall(p, d.id, cur.start + dM, config));
    } else if (d.row) {
      const row = d.row, t = d.t, id = d.id;
      const cur = rowItems(plan, t, row, config).find(i => i.kind === "mod" && !i.fromPrev && i.mod!.id === id);
      if (cur) edit(p => dropModule(p, t, row, id, cur.start + dM, config, true));
    }
  };

  const edit = (fn: (p: ModulePlan) => void) => {
    const p: ModulePlan = JSON.parse(JSON.stringify(plan));
    fn(p);
    try { tidyPlan(p, config); } catch { /* si algo falla, se deja el plan como quedó */ }
    onChange(p);
  };

  const fillRemaining = (t: number, key: string) => {
    const rem0 = round2(plan.tramos[t].length - rowUsed(plan, t, "lower", config));
    if (rem0 <= 0.01) return;
    edit(p => {
      let rem = rem0;
      while (rem > 0.01) {
        const w = round2(Math.min(0.90, rem));
        const mod = addModuleToPlan(p, t, "lower", key);
        if (mod) mod.width = w;
        rem = round2(rem - w);
      }
      rebuildAutoUpper(p, t);
    });
  };

  const enabled = !!config?.modulePlan?.enabled;
  const box = "bg-[#162828] rounded-lg p-3 sm:p-4 border border-[rgba(106,207,199,0.12)] space-y-3";

  // ── Dibujo de la cocina de frente (solo iconos) ──────────────────────────
  const renderElevation = (t: number) => {
    const tr = plan.tramos[t];
    const up: RowItem[] = tr.isIsland ? [] : rowItems(plan, t, "upper", config);
    const lo: RowItem[] = rowItems(plan, t, "lower", config);
    const total = Math.max(tr.length, ...up.map(i => i.start + i.width), ...lo.map(i => i.start + i.width), 1);
    const widthPx = Math.ceil(total * PX);
    const upCuts = up.map(i => round2(i.start + i.width));
    const loCuts = lo.map(i => round2(i.start + i.width));
    const near = (arr: number[], x: number) => arr.some(y => Math.abs(y - x) < 0.025);
    const allCuts = Array.from(new Set([...upCuts, ...loCuts])).filter(x => x > 0.02 && x < total - 0.02);
    const ticks: number[] = [];
    for (let x = 0; x <= total + 0.001; x += 0.5) ticks.push(round2(x));
    const talls = lo.filter(i => i.kind === "tall");
    const heightPx = tr.isIsland ? LANE_H : LANE_H * 2 + DIV_H;

    const tile = (it: RowItem, row: PlanRow, idx: number) => {
      const w = Math.max(it.width * PX, 8);
      if (it.kind === "tall") return null;
      const mod = it.mod!;
      const cat = CATALOG_BY_KEY[it.key];
      const mine = !it.fromPrev;
      const isSel = !!sel && "id" in sel && sel.t === t && sel.row === row && sel.id === mod.id;
      const painted = isPainted(plan, mod, row);
      const out = (!!cat.min && mod.width < cat.min - 1e-9) || (!!cat.max && mod.width > cat.max + 1e-9);
      const color = cat.key === "ventana" ? "bg-sky-500/25 border-sky-300/80 text-sky-100"
        : out ? "bg-red-900/40 border-red-500/60 text-red-100"
        : it.fromPrev ? "bg-teal-900/20 border-teal-500/20 text-teal-200/60"
        : row === "upper" ? (mod.autoOf ? "bg-purple-900/30 border-purple-400/30 text-purple-100" : "bg-purple-900/50 border-purple-400/50 text-purple-100")
        : "bg-teal-900/50 border-teal-400/50 text-teal-100";
      return (
        <div key={`${row}-${mod.id}${it.fromPrev ? "p" : ""}`} className="absolute p-[2px]" style={{ left: it.start * PX, top: 0, width: w, height: LANE_H }}>
          <div
            role="button"
            onPointerDown={(e) => mine && startDrag(e, { kind: "mod", t, row, id: mod.id, locked: mod.lockAt !== undefined })}
            onPointerMove={moveDrag}
            onPointerUp={(e) => mine && endDrag(e, () => setSel(isSel ? null : { t, row, id: mod.id }))}
            onPointerCancel={() => { dragRef.current = null; setDragDx(null); }}
            title={`${cat.label} · ${m2(mod.width)} m${cat.locked ? " · fijo" : ""}${painted ? "" : " · sin pintar"}`}
            style={{ touchAction: "none", transform: dragDx?.id === mod.id ? `translateX(${dragDx.dx}px)` : undefined, zIndex: dragDx?.id === mod.id ? 30 : undefined, ...(!painted && !cat.noPieces ? NO_PAINT_BG : {}) }}
            className={`relative h-full w-full rounded border flex items-center justify-center select-none ${color} ${!painted && !cat.noPieces ? "border-dashed opacity-60" : ""} ${isSel ? "ring-2 ring-white" : ""} ${mine ? "cursor-grab" : "cursor-default"} ${dragDx?.id === mod.id ? "opacity-80 shadow-lg" : ""}`}
          >
            <ModuleIcon k={it.key} size={Math.max(12, Math.min(30, w - 14))} className="-mt-3" />
            <Cota w={mod.width} />
            {mod.lockAt !== undefined && <span className="absolute top-0.5 left-0.5 text-[10px] leading-none" title="Ubicación bloqueada">🔒</span>}
            {painted && !cat.noPieces && <span className="absolute top-0.5 right-0.5 text-[11px] leading-none drop-shadow" title="Va pintado">🎨</span>}
          </div>
        </div>
      );
    };

    return (
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-4 text-[11px] text-white/60 pb-1">
          <span>🎨 = va pintado</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-3 rounded-sm border border-dashed border-white/50" style={NO_PAINT_BG} /> rayado = sin pintar</span>
          <span className="text-white/35">Toca un módulo y usa «Pintar» / «Quitar pintura»</span>
        </div>
        <div className="relative" data-elev style={{ width: widthPx, height: heightPx + 20 }}>
          {/* líneas */}
          {!tr.isIsland && (
            <div className="absolute left-0 top-0 rounded bg-purple-950/40" style={{ height: LANE_H, width: widthPx }}>
              {up.map((it, i) => tile(it, "upper", i))}
            </div>
          )}
          {!tr.isIsland && (
            <div className="absolute left-0 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500/60 via-white/30 to-teal-500/60 text-[9px] font-bold tracking-widest text-white/80"
              style={{ top: LANE_H + 1, height: DIV_H - 2, width: widthPx }}>
              ▲ SUPERIORES · INFERIORES ▼
            </div>
          )}
          <div className="absolute left-0 rounded bg-teal-950/40" style={{ top: tr.isIsland ? 0 : LANE_H + DIV_H, height: LANE_H, width: widthPx }}>
            {lo.map((it, i) => tile(it, "lower", i))}
          </div>

          {/* guías de corte: verde = coincide arriba y abajo, ámbar = solo en una línea */}
          {!tr.isIsland && allCuts.map(x => {
            const both = near(upCuts, x) && near(loCuts, x);
            return (
              <div key={`g${x}`} className={`absolute pointer-events-none ${both ? "border-l border-emerald-400/50" : "border-l border-dashed border-amber-400/60"}`}
                style={{ left: x * PX, top: both ? 0 : (near(upCuts, x) ? 0 : LANE_H + DIV_H), height: both ? heightPx : LANE_H }} />
            );
          })}

          {/* módulos de piso a techo: un solo bloque largo que cruza las dos líneas */}
          {talls.map(it => {
            const s = it.special!;
            const isSel = !!sel && "tall" in sel && sel.t === t && sel.tall === s.key;
            return (
              <div key={`tall-${s.key}`} role="button"
                onPointerDown={(e) => startDrag(e, { kind: "tall", t, id: s.key })}
                onPointerMove={moveDrag}
                onPointerUp={(e) => endDrag(e, () => setSel(isSel ? null : { t, tall: s.key }))}
                onPointerCancel={() => { dragRef.current = null; setDragDx(null); }}
                title={`${s.label} · ${m2(s.w)} m · piso a techo`}
                className={`absolute rounded border flex flex-col items-center justify-center gap-1 select-none cursor-grab bg-amber-900/60 border-amber-400/70 text-amber-100 ${isSel ? "ring-2 ring-white" : ""} ${dragDx?.id === s.key ? "opacity-80 shadow-lg" : ""}`}
                style={{ left: it.start * PX + 2, top: 2, width: Math.max(it.width * PX - 4, 10), height: heightPx - 4, touchAction: "none", zIndex: dragDx?.id === s.key ? 30 : 5, transform: dragDx?.id === s.key ? `translateX(${dragDx.dx}px)` : undefined }}>
                <ModuleIcon k={s.key} size={Math.max(16, Math.min(40, it.width * PX - 14))} />
                {plan.paintKeys?.[s.key] !== false && <span className="absolute top-0.5 right-0.5 text-[11px] leading-none drop-shadow" title="Va pintado">🎨</span>}
                <Cota w={s.w} />
              </div>
            );
          })}

          {/* regla en metros */}
          <div className="absolute left-0 text-[9px] text-white/40" style={{ top: heightPx + 3, width: widthPx }}>
            {ticks.map(x => (
              <span key={x} className="absolute" style={{ left: x * PX - 6 }}>{x % 1 === 0 ? `${x} m` : "·"}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Barra del módulo seleccionado ────────────────────────────────────────
  const renderSelected = () => {
    if (!sel) return <p className="text-[11px] text-white/35">Toca un icono para ver y cambiar su medida, moverlo o quitarlo.</p>;
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
                className={`h-9 px-3 rounded border font-semibold ${sp ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-pink-600/80 border-pink-300/60 text-white hover:bg-pink-600"}`}
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
    const adjustable = !cat.locked && mod.autoBase === undefined;
    const painted = isPainted(plan, mod, sel.row);
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded border p-2 text-xs ${sel.row === "upper" ? "border-purple-400/40 bg-purple-900/20 text-purple-100" : "border-teal-400/40 bg-teal-900/20 text-teal-100"}`}>
        <ModuleIcon k={mod.key} size={26} />
        <span className="font-semibold">{cat.label}</span>
        {!cat.noPieces && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${painted ? "bg-pink-600/70 text-white" : "bg-white/10 text-white/60"}`}>{painted ? "VA PINTADO" : "SIN PINTAR"}</span>}
        <label className="flex items-center gap-1">
          {adjustable ? (
            <input type="number" step="0.05" min="0" value={mod.width}
              onChange={(e) => edit(p => setModuleWidth(p, sel.t, sel.row, mod.id, parseFloat(e.target.value) || 0, config))}
              className="w-16 bg-black/20 border-b border-white/40 text-right font-mono text-sm focus:outline-none" />
          ) : <span className="font-mono text-sm">{m2(mod.width)}</span>}
          m
        </label>
        {Math.abs(mod.width - cat.width) > 0.004 && mod.autoBase === undefined && (
          <span className="text-amber-300">{mod.width > cat.width ? "+" : ""}{m2(mod.width - cat.width)} vs normal</span>
        )}
        {cat.locked && <span className="text-white/50">🔒 medida fija</span>}
        {mod.autoBase !== undefined && <span className="text-white/50">automático (sigue a los inferiores)</span>}
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
                <input type="number" step="0.05" min="0" value={round2(st)}
                  onChange={(e) => edit(p => setModuleLock(p, sel.t, sel.row, mod.id, parseFloat(e.target.value) || 0, config))}
                  className="w-16 bg-black/20 border-b border-sky-300/60 text-right font-mono text-sm focus:outline-none" />
                m
              </label>
              <span className="text-white/50">termina en {m2(st + mod.width)} m{tr0.length > 0 ? ` · a la derecha quedan ${m2(tr0.length - st - mod.width)} m` : ""}</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="accent-sky-400" checked={locked}
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
          <button type="button" className="h-9 px-2 rounded bg-emerald-700/40 hover:bg-emerald-700/70" title="Ajusta la medida para que el final coincida con el corte de la otra línea"
            onClick={() => edit(p => alignEnd(p, sel.t, sel.row, mod.id, config))}>Alinear con la otra línea</button>
        )}
        {!cat.noPieces && (
          <button type="button"
            className={`h-9 px-3 rounded border font-semibold ${painted ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-pink-600/80 border-pink-300/60 text-white hover:bg-pink-600"}`}
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
      </div>
    );
  };

  // ── Tarjetas de módulos: icono + nombre + medida + cantidad ─────────────
  const renderPalette = (t: number, row: PlanRow) => {
    const tr = plan.tramos[t];
    const own = tr[row];
    const options = CATALOG.filter(c => c.row === row);
    const rem = round2(tr.length - rowUsed(plan, t, row, config));
    const over = tr.length > 0 && rem < -0.005;
    const used = rowUsed(plan, t, row, config);
    const fillOpts = FILL_KEYS.lower.map(k => CATALOG_BY_KEY[k]);
    return (
      <div className="space-y-2">
        <div className={`flex flex-wrap items-center gap-2 text-xs rounded px-3 py-1.5 ${row === "upper" ? "bg-purple-900/50 border border-purple-400/40" : "bg-teal-900/50 border border-teal-400/40"}`}>
          <span className={`font-bold uppercase tracking-widest ${row === "upper" ? "text-purple-200" : "text-teal-200"}`}>{row === "upper" ? "▲ Módulos superiores" : "▼ Módulos inferiores"}</span>
          <span className={over ? "text-red-400 font-semibold" : "text-white/60"}>
            llevas {m2(used)} de {m2(tr.length)} m{tr.length > 0 && (over ? ` · te pasas ${m2(-rem)}` : ` · faltan ${m2(rem)}`)}
          </span>
          {row === "lower" && rem > 0.01 && (
            <select className="h-8 rounded bg-[#0C1A1A] border border-teal-500/40 text-xs text-teal-200 px-2 ml-auto" value=""
              onChange={(e) => { if (e.target.value) fillRemaining(t, e.target.value); }}>
              <option value="">Completar {m2(rem)} m con…</option>
              {fillOpts.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {options.map(o => {
            const mods = own.filter(m => m.key === o.key);
            const count = mods.length;
            const curW = count > 0 ? mods[0].width : ((!o.locked && plan.defaultWidth?.[o.key]) || o.width);
            return (
              <div key={o.key} className={`rounded border p-2 flex flex-col gap-1.5 ${count > 0 ? (row === "upper" ? "bg-purple-900/30 border-purple-400/50" : "bg-teal-900/40 border-teal-400/50") : "bg-white/[0.03] border-white/10"}`}>
                <button type="button" className="flex items-center gap-2 text-left" title="Tocar para agregar uno"
                  onClick={() => edit(p => { addModuleToPlan(p, t, row, o.key, config); })}>
                  <ModuleIcon k={o.key} size={34} className="shrink-0 text-white/80" />
                  <span className="text-xs font-semibold text-white/85 leading-tight">{o.label}</span>
                </button>
                <div className="flex items-center justify-between gap-1">
                  {o.locked ? (
                    <span className="text-xs font-mono text-white/60" title="Medida fija">🔒 {m2(o.width)} m</span>
                  ) : (
                    <label className="flex items-center gap-1 text-xs text-white/70">
                      <input type="number" step="0.05" min="0" value={curW}
                        onChange={(e) => edit(p => setTypeWidth(p, t, row, o.key, parseFloat(e.target.value) || 0))}
                        className="w-14 bg-black/30 border-b border-white/40 text-right font-mono text-white focus:outline-none" />
                      m
                    </label>
                  )}
                  <span className="flex items-center gap-1">
                    <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={count === 0}
                      onClick={() => edit(p => { const last = [...own].reverse().find(m => m.key === o.key); if (last) removeModuleFromPlan(p, t, row, last.id); })}>−</button>
                    <span className={`w-5 text-center font-mono text-sm ${count > 0 ? "text-white font-bold" : "text-white/40"}`}>{count}</span>
                    <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25"
                      onClick={() => edit(p => { addModuleToPlan(p, t, row, o.key, config); })}>+</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Tipos de módulo presentes en el plano (para las excepciones de pintura)
  const typeKeys = Array.from(new Set([
    ...plan.tramos.flatMap(tt => [...tt.upper, ...tt.lower]).map(mm => mm.key).filter(k => !CATALOG_BY_KEY[k]?.noPieces),
    ...specials.map(s => s.key),
  ]));

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

  const content = (
    <div className={box}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="modulePlanEnabled"
          className="h-4 w-4 accent-teal-500"
          checked={enabled}
          onChange={(e) => edit(p => { p.enabled = e.target.checked; })}
        />
        <label htmlFor="modulePlanEnabled" className="text-xs sm:text-sm font-semibold text-white/85 cursor-pointer">
          Plano de módulos de la cocina <span className="font-normal text-white/40">(cuenta módulos y piezas de pintura; no cambia el precio)</span>
        </label>
        {enabled && (
          <span className="ml-auto shrink-0 flex items-center gap-1 text-xs text-white/70">
            Zoom
            <button type="button" disabled={zoom <= 0} onClick={() => setZoom(z => Math.max(0, z - 1))}
              className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-base font-bold" title="Alejar (ver la pared completa)">−</button>
            <button type="button" disabled={zoom >= ZOOMS.length - 1} onClick={() => setZoom(z => Math.min(ZOOMS.length - 1, z + 1))}
              className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-base font-bold" title="Acercar (trabajar con más detalle)">+</button>
          </span>
        )}
      </div>

      {enabled && (
        <div className="space-y-4">
          <p className="text-xs text-teal-400/70">
            Forma de la cocina: <b>{config?.layout || "sin definir"}</b>. Pon el largo de cada pared, agrega módulos con las tarjetas y acomódalos en el dibujo.
            Líneas verdes = el corte coincide arriba y abajo; ámbar = solo en una línea.
          </p>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={plan.autoUpper !== false}
              onChange={(e) => edit(p => { p.autoUpper = e.target.checked; })} />
            El diseño lo marcan los inferiores: los superiores se arman solos
            <span className="text-white/35">(lavaplatos→platero, estufa→extractor, cajoneros→almacenamiento; botellero/basurero/especiero pegados al esquinero agrandan el de arriba)</span>
          </label>

          {plan.tramos.map((tr, t) => (
            <div key={t} className="rounded-lg border border-white/10 p-3 space-y-3 bg-black/10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-white/85">{tr.name}</span>
                <label className="flex items-center gap-1 text-xs text-white/60">
                  Largo
                  <input
                    type="number" step="0.05" min="0"
                    value={tr.length || ""}
                    onChange={(e) => edit(p => { p.tramos[t].length = round2(parseFloat(e.target.value) || 0); })}
                    className="w-16 bg-transparent border-b border-white/30 text-right font-mono text-white focus:outline-none"
                  />
                  m
                </label>
                <button type="button" onClick={() => edit(p => { packRow(p, t, "lower", config); })}
                  className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] text-white/75" title="Junta los módulos de abajo sin dejar espacios">
                  Cerrar espacios
                </button>
              </div>

              {renderElevation(t)}
              {renderSelected()}
              {renderPalette(t, "lower")}
              {!tr.isIsland && renderPalette(t, "upper")}
            </div>
          ))}

          {/* Módulos de piso a techo: misma presentación que superiores e inferiores */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs rounded px-3 py-1.5 bg-amber-900/40 border border-amber-400/40">
              <span className="font-bold uppercase tracking-widest text-amber-200">▮ Módulos de piso a techo</span>
              <span className="text-white/60">
                {specials.length === 0 ? "ninguno" : `llevas ${specials.length} · ocupan ${m2(specials.reduce((a, s) => a + s.w, 0))} m de la pared`}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {SPECIALS.map(o => {
                const act = specials.find(s => s.key === o.key);
                const count = act ? 1 : 0;
                const w = act ? act.w : specialWidth(plan, o.key);
                const canToggle = !!onSpecialToggle;
                return (
                  <div key={o.key} className={`rounded border p-2 flex flex-col gap-1.5 ${count > 0 ? "bg-amber-900/30 border-amber-400/50" : "bg-white/[0.03] border-white/10"}`}>
                    <button type="button" className="flex items-center gap-2 text-left disabled:cursor-default" disabled={!canToggle || count > 0}
                      title={count > 0 ? "Ya está en la cotización" : "Tocar para agregarlo"}
                      onClick={() => onSpecialToggle?.(o.key, true)}>
                      <ModuleIcon k={o.key} size={34} className="shrink-0 text-white/80" />
                      <span className="text-xs font-semibold text-white/85 leading-tight">{o.label}</span>
                    </button>
                    <div className="flex items-center justify-between gap-1">
                      {o.editable ? (
                        <label className="flex items-center gap-1 text-xs text-white/70">
                          <input type="number" step="0.05" min="0" value={w}
                            onChange={(e) => edit(p => { p.alacenaEntrepanosWidth = round2(parseFloat(e.target.value) || 0); })}
                            className="w-14 bg-black/30 border-b border-white/40 text-right font-mono text-white focus:outline-none" />
                          m
                        </label>
                      ) : (
                        <span className="text-xs font-mono text-white/60" title="Medida fija">🔒 {m2(o.width)} m</span>
                      )}
                      <span className="flex items-center gap-1">
                        <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={!canToggle || count === 0}
                          onClick={() => onSpecialToggle?.(o.key, false)}>−</button>
                        <span className={`w-5 text-center font-mono text-sm ${count > 0 ? "text-white font-bold" : "text-white/40"}`}>{count}</span>
                        <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={!canToggle || count > 0}
                          onClick={() => onSpecialToggle?.(o.key, true)}>+</button>
                      </span>
                    </div>
                    {act && (act.lateral || plan.tramos.length > 1) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-100/80">
                        {act.lateral && (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" checked={lateralOn(plan, o.key)}
                              onChange={(e) => edit(p => { p.specialLateral = { ...(p.specialLateral || {}), [o.key]: e.target.checked }; })} />
                            con lateral (pieza grande)
                          </label>
                        )}
                        {plan.tramos.length > 1 && (
                          <label className="flex items-center gap-1">
                            en
                            <select className="h-6 rounded bg-[#0C1A1A] border border-white/15 px-1"
                              value={act.tramo}
                              onChange={(e) => edit(p => { p.specialTramo = { ...(p.specialTramo || {}), [o.key]: parseInt(e.target.value) || 0 }; })}>
                              {plan.tramos.map((tt, i) => <option key={i} value={i}>{tt.name}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-amber-200/50">Ocupan las dos líneas del tramo. Para moverlos, arrástralos en el dibujo o usa ◀ ▶ al tocarlos. Marcarlos o quitarlos cambia la cotización igual que su casilla de siempre.</p>
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-900/10 p-3 text-xs text-yellow-200 space-y-1">
              {result.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
            </div>
          )}

          <div className="rounded-lg border border-pink-500/30 bg-pink-900/10 p-3 space-y-3">
            <p className="text-sm font-semibold text-pink-200">Piezas a pintar (alto brillo)</p>
            {/* Atajos: el control fino es tocar el módulo en el dibujo (Pintar / Quitar pintura) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(["upper", "lower"] as PlanRow[]).map(r => {
                const ps = paintState(allMods.filter(x => x.r === r));
                if (ps.total === 0) return null;
                const all = ps.state === "all";
                return (
                  <button key={r} type="button"
                    className={`h-8 px-3 rounded border ${all ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-pink-600/70 border-pink-300/60 text-white hover:bg-pink-600"}`}
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
                    className={`h-8 px-3 rounded border ${allOn ? "bg-red-900/30 border-red-400/50 text-red-100 hover:bg-red-900/50" : "bg-pink-600/70 border-pink-300/60 text-white hover:bg-pink-600"}`}
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
                      <span key={`${g.key}${g.w}`} className="flex items-center gap-1.5 rounded border border-pink-500/40 bg-pink-900/30 px-2 py-1 text-xs text-pink-100">
                        <ModuleIcon k={g.key} size={16} />
                        {g.n > 1 ? `${g.n} × ` : ""}{g.label} <span className="text-pink-100/50">{m2(g.w)} m</span>
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
                  <div className="text-lg font-bold text-pink-200 font-mono">{n}</div>
                  <div className="text-[11px] text-white/50 leading-tight">{label}</div>
                </div>
              ))}
            </div>
            {(() => {
              const EX: Array<[string, keyof ModulePlan["extras"]]> = [
                ["Lateral de mueble superior", "latSup"], ["Lateral de mueble inferior", "latInf"],
                ["Puerta de módulo alto", "puertaAlta"], ["Piezas especiales (diseño especial)", "especiales"],
              ];
              const used = EX.filter(([, k]) => (plan.extras[k] || 0) > 0);
              const shown = showExtras ? EX : used;
              return (
                <div className="space-y-1.5">
                  {shown.length > 0 && <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Extras por diseño</p>}
                  {shown.map(([label, k]) => stepper(label, k))}
                  <button type="button" onClick={() => setShowExtras(v => !v)}
                    className="w-full text-left rounded-lg border border-dashed border-pink-400/60 bg-pink-900/20 hover:bg-pink-900/35 px-3 py-2 transition-colors">
                    <span className="block text-sm font-bold tracking-wide text-pink-100">{showExtras ? "− Ocultar piezas extra" : "+ Agregar pieza extra"}</span>
                    <span className="block text-[11px] text-pink-200/60">Laterales de mueble, puerta de módulo alto o piezas de diseño especial</span>
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
