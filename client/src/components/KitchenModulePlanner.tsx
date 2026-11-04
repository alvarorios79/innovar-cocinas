import { useMemo, useState, type ReactElement } from "react";
import {
  CATALOG, CATALOG_BY_KEY, FILL_KEYS, SPECIALS,
  normalizePlan, computePlan, rowSequence, rowUsed, activeSpecials, lateralOn,
  addModuleToPlan, removeModuleFromPlan, setModuleWidth, moveModule, rebuildAutoUpper, isPainted,
  round2,
  type ModulePlan, type PlanRow,
} from "@shared/kitchenModulePlan";

// Etapa 1 — Plano de módulos por tramos. Solo cuenta módulos y piezas de pintura.
// No cambia precios ni el PDF: guarda su estado en kitchenConfig.modulePlan.

interface Props {
  config: any;                       // kitchenConfig del ítem
  onChange: (plan: ModulePlan) => void;
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
function ModuleIcon({ k, className = "" }: { k: string; className?: string }) {
  const g = ICONS[k];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {g || <rect x="4" y="4" width="16" height="16" rx="2" />}
    </svg>
  );
}

export function KitchenModulePlanner({ config, onChange }: Props) {
  const plan = useMemo(() => normalizePlan(config?.modulePlan, config), [config]);
  const result = useMemo(() => computePlan(plan, config), [plan, config]);
  const specials = activeSpecials(plan, config);
  const [dragId, setDragId] = useState<string | null>(null);

  const edit = (fn: (p: ModulePlan) => void) => {
    const p: ModulePlan = JSON.parse(JSON.stringify(plan));
    fn(p);
    onChange(p);
  };

  const fillRemaining = (t: number, row: PlanRow, key: string) => {
    const rem0 = round2(plan.tramos[t].length - rowUsed(plan, t, row, config));
    if (rem0 <= 0.01) return;
    edit(p => {
      let rem = rem0;
      while (rem > 0.01) {
        const w = round2(Math.min(0.90, rem));
        const mod = addModuleToPlan(p, t, row, key);
        if (mod) mod.width = w;
        rem = round2(rem - w);
      }
      if (row === "lower") rebuildAutoUpper(p, t); // los superiores toman los anchos finales
    });
  };

  const enabled = !!config?.modulePlan?.enabled;
  const box = "bg-[#162828] rounded-lg p-3 sm:p-4 border border-[rgba(106,207,199,0.12)] space-y-3";

  const renderRow = (t: number, row: PlanRow) => {
    const tr = plan.tramos[t];
    const seq = rowSequence(plan, t, row);
    const used = rowUsed(plan, t, row, config);
    const rem = round2(tr.length - used);
    const spHere = specials.filter(s => s.tramo === t);
    const options = CATALOG.filter(c => c.row === row);
    const fillOpts = FILL_KEYS[row].map(k => CATALOG_BY_KEY[k]);
    const over = tr.length > 0 && rem < -0.005;
    const own = tr[row];

    return (
      <div key={row} className="space-y-2">
        <div className={`flex flex-wrap items-center gap-2 text-xs rounded px-3 py-1.5 ${row === "upper" ? "bg-purple-900/50 border border-purple-400/40" : "bg-teal-900/50 border border-teal-400/40"}`}>
          <span className={`font-bold uppercase tracking-widest ${row === "upper" ? "text-purple-200" : "text-teal-200"}`}>{row === "upper" ? "▲ Muebles superiores" : "▼ Muebles inferiores"}</span>
          <span className={over ? "text-red-400 font-semibold" : "text-white/60"}>
            llevas {m2(used)} de {m2(tr.length)} m
            {tr.length > 0 && (over ? ` · te pasas ${m2(-rem)}` : ` · faltan ${m2(rem)}`)}
          </span>
        </div>

        {/* Línea de la cocina, en el orden real */}
        <div className="flex flex-wrap gap-1.5 items-stretch">
          {spHere.map(s => (
            <div key={s.key} className="rounded bg-amber-900/40 border border-amber-500/40 px-2 py-1 text-xs text-amber-200" title="Piso a techo">
              <ModuleIcon k={s.key} className="w-9 h-9" />
              <div className="font-semibold leading-tight">{s.label}</div>
              <span className="font-mono">{m2(s.w)} m</span>
            </div>
          ))}
          {seq.map(({ mod, fromPrev, ownIndex }) => {
            const cat = CATALOG_BY_KEY[mod.key];
            if (!cat) return null;
            const mine = !fromPrev;
            const painted = isPainted(plan, mod, row);
            const adjustable = !cat.locked && !(mod.autoBase !== undefined);
            const outOfRange = (!!cat.min && mod.width < cat.min - 1e-9) || (!!cat.max && mod.width > cat.max + 1e-9);
            return (
              <div
                key={(fromPrev ? "p-" : "") + mod.id}
                draggable={mine}
                onDragStart={() => mine && setDragId(mod.id)}
                onDragOver={(e) => { if (mine && dragId) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (mine && dragId && dragId !== mod.id) edit(p => moveModule(p, t, row, dragId, ownIndex));
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={`rounded border px-2 py-1 text-xs flex flex-col gap-1 min-w-[104px] ${mine ? "cursor-grab" : ""} ${
                  cat.key === "ventana" ? "bg-slate-700/40 border-slate-500/40 text-slate-200"
                  : outOfRange ? "bg-red-900/30 border-red-500/50 text-red-200"
                  : fromPrev ? "bg-teal-900/20 border-teal-500/20 text-teal-200/70"
                  : mod.autoOf ? "bg-sky-900/30 border-sky-500/30 text-sky-100"
                  : "bg-teal-900/40 border-teal-500/40 text-teal-100"}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <ModuleIcon k={mod.key} className="w-9 h-9 opacity-90" />
                  {mine && (
                    <button type="button" className="text-white/50 hover:text-red-300 leading-none px-1" onClick={() => edit(p => removeModuleFromPlan(p, t, row, mod.id))} title="Quitar">✕</button>
                  )}
                </div>
                <div className="font-semibold leading-tight">{cat.locked ? "🔒 " : ""}{cat.short}{fromPrev ? " (vértice)" : ""}</div>
                <div className="flex items-center gap-1">
                  {mine && adjustable ? (
                    <input
                      type="number" step="0.05" min="0"
                      value={mod.width}
                      onChange={(e) => edit(p => setModuleWidth(p, t, row, mod.id, parseFloat(e.target.value) || 0))}
                      className="w-14 bg-transparent border-b border-white/30 text-right font-mono focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono">{m2(mod.width)}</span>
                  )}
                  <span className="text-white/40">m</span>
                  {mine && Math.abs(mod.width - cat.width) > 0.004 && mod.autoBase === undefined && (
                    <span className="text-amber-300" title="Cambio frente a la medida normal">{mod.width > cat.width ? "+" : ""}{m2(mod.width - cat.width)}</span>
                  )}
                </div>
                {mine && mod.key === "moduloRepisa" && (
                  <label className="flex items-center gap-1 text-[11px] text-white/70">
                    repisas
                    <input
                      type="number" min="0" step="1" placeholder="?"
                      value={mod.qty ?? ""}
                      onChange={(e) => edit(p => { const m = p.tramos[t][row].find(x => x.id === mod.id); if (m) m.qty = e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value) || 0); })}
                      className="w-12 bg-transparent border-b border-amber-300/60 text-right font-mono focus:outline-none"
                    />
                  </label>
                )}
                {mine && (
                  <div className="flex items-center justify-between gap-1 text-white/60">
                    <span className="flex gap-1">
                      <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={ownIndex <= 0}
                        onClick={() => edit(p => moveModule(p, t, row, mod.id, ownIndex - 1))} title="Mover a la izquierda">◀</button>
                      <button type="button" className="w-7 h-7 rounded bg-white/10 hover:bg-white/25 disabled:opacity-30" disabled={ownIndex >= own.length - 1}
                        onClick={() => edit(p => moveModule(p, t, row, mod.id, ownIndex + 1))} title="Mover a la derecha">▶</button>
                    </span>
                    {!cat.noPieces && (
                      <button type="button" className={`w-7 h-7 rounded bg-white/10 ${painted ? "" : "opacity-30"}`}
                        onClick={() => edit(p => { const m = p.tramos[t][row].find(x => x.id === mod.id); if (m) { m.paint = !painted; m.unpainted = undefined; } })}
                        title={painted ? "Va pintado" : "No va pintado"}>🎨</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {seq.length === 0 && spHere.length === 0 && (
            <span className="text-xs text-white/30 py-2">Marca los módulos de abajo para armar la línea.</span>
          )}
        </div>

        {/* Casillas: marcar agrega el módulo (y su superior si aplica) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {options.map(o => {
            const count = own.filter(m => m.key === o.key).length;
            return (
              <div key={o.key} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${count > 0 ? "bg-teal-900/40 border border-teal-500/40" : "bg-white/[0.03] border border-transparent"}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-500 shrink-0"
                  checked={count > 0}
                  onChange={() => edit(p => {
                    if (count > 0) own.filter(m => m.key === o.key).forEach(m => removeModuleFromPlan(p, t, row, m.id));
                    else addModuleToPlan(p, t, row, o.key);
                  })}
                />
                <ModuleIcon k={o.key} className="w-6 h-6 shrink-0 text-white/70" />
                <span className="flex-1 text-white/80 leading-tight">{o.label} <span className="text-white/35">{m2(o.width)}</span></span>
                {count > 0 && (
                  <span className="flex items-center gap-1 shrink-0">
                    <button type="button" className="w-6 h-6 rounded bg-white/10 hover:bg-white/25"
                      onClick={() => edit(p => { const last = [...own].reverse().find(m => m.key === o.key); if (last) removeModuleFromPlan(p, t, row, last.id); })}>−</button>
                    <span className="w-4 text-center font-mono text-teal-200">{count}</span>
                    <button type="button" className="w-6 h-6 rounded bg-white/10 hover:bg-white/25"
                      onClick={() => edit(p => { addModuleToPlan(p, t, row, o.key); })}>+</button>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {row === "lower" && rem > 0.01 && (
          <select
            className="h-8 rounded bg-[#0C1A1A] border border-teal-500/40 text-xs text-teal-200 px-2"
            value=""
            onChange={(e) => { if (e.target.value) fillRemaining(t, row, e.target.value); }}
          >
            <option value="">Completar {m2(rem)} m con…</option>
            {fillOpts.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
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
    ["Puertas superiores", P.up], ["Puertas inferiores", P.lo], ["Puertas de alacena / altas", P.al],
    ["Tapas de cajón", P.ca], ["Tapas de especiero", P.es], ["Golas / frentes pequeños", P.go], ["Laterales grandes (nicho / alacena)", P.lat], ["Piezas especiales", P.special],
  ];

  const stepper = (label: string, field: keyof ModulePlan["extras"]) => (
    <div key={field} className="flex items-center gap-2 text-xs text-white/70">
      <button type="button" className="w-6 h-6 rounded bg-white/10 hover:bg-white/20" onClick={() => edit(p => { p.extras[field] = Math.max(0, (p.extras[field] || 0) - 1); })}>−</button>
      <span className="w-6 text-center font-mono text-white">{plan.extras[field] || 0}</span>
      <button type="button" className="w-6 h-6 rounded bg-white/10 hover:bg-white/20" onClick={() => edit(p => { p.extras[field] = (p.extras[field] || 0) + 1; })}>+</button>
      <span>{label}</span>
    </div>
  );

  return (
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
      </div>

      {enabled && (
        <div className="space-y-4">
          <p className="text-xs text-teal-400/70">
            Forma de la cocina: <b>{config?.layout || "sin definir"}</b>. Pon el largo de cada pared y marca los módulos en el orden de la cocina.
            🔒 no se mueve · 🎨 va pintado · ✕ quita · arrastra o usa ◀ ▶ para cambiar el orden.
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
              </div>
              {!tr.isIsland && renderRow(t, "upper")}
              {!tr.isIsland && <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500/60 via-white/30 to-teal-500/60" aria-hidden />}
              {renderRow(t, "lower")}
            </div>
          ))}

          {specials.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-3 space-y-2 text-xs">
              <p className="font-semibold text-amber-200">Módulos de piso a techo (ya marcados en la cotización)</p>
              {specials.map(s => (
                <div key={s.key} className="flex flex-wrap items-center gap-3 text-amber-100/80">
                  <ModuleIcon k={s.key} className="w-6 h-6" />
                  <span className="w-44">{s.label} <span className="text-amber-100/40">({s.detail})</span></span>
                  {SPECIALS.find(x => x.key === s.key)?.editable ? (
                    <label className="flex items-center gap-1">
                      ancho
                      <input
                        type="number" step="0.05" min="0"
                        value={s.w}
                        onChange={(e) => edit(p => { p.alacenaEntrepanosWidth = round2(parseFloat(e.target.value) || 0); })}
                        className="w-14 bg-transparent border-b border-amber-300/40 text-right font-mono focus:outline-none"
                      /> m
                    </label>
                  ) : (
                    <span className="font-mono">{m2(s.w)} m</span>
                  )}
                  {s.lateral && (
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={lateralOn(plan, s.key)}
                        onChange={(e) => edit(p => { p.specialLateral = { ...(p.specialLateral || {}), [s.key]: e.target.checked }; })} />
                      con lateral (pieza grande)
                    </label>
                  )}
                  {plan.tramos.length > 1 && (
                    <label className="flex items-center gap-1">
                      en
                      <select
                        className="h-7 rounded bg-[#0C1A1A] border border-white/15 px-1"
                        value={s.tramo}
                        onChange={(e) => edit(p => { p.specialTramo = { ...(p.specialTramo || {}), [s.key]: parseInt(e.target.value) || 0 }; })}
                      >
                        {plan.tramos.map((tt, i) => <option key={i} value={i}>{tt.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              ))}
              <p className="text-amber-200/50">Ocupan las dos filas del tramo. El descuento de metros del precio sigue calculándose como hoy.</p>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-900/10 p-3 text-xs text-yellow-200 space-y-1">
              {result.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
            </div>
          )}

          <div className="rounded-lg border border-pink-500/30 bg-pink-900/10 p-3 space-y-3">
            <p className="text-sm font-semibold text-pink-200">Piezas a pintar (alto brillo)</p>
            <div className="space-y-2 rounded bg-black/20 p-2">
              <p className="text-xs font-semibold text-white/60">¿Qué va pintado?</p>
              <div className="flex flex-wrap gap-4 text-xs text-white/80">
                {(["upper", "lower"] as PlanRow[]).map(r => {
                  const on = plan.paintRows?.[r] ?? (plan.paintAll !== false);
                  return (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 accent-pink-500" checked={on}
                        onChange={(e) => edit(p => {
                          p.paintRows = { ...(p.paintRows || {}), [r]: e.target.checked };
                          // al cambiar toda una fila se borran las excepciones de esa fila
                          const keys = new Set(CATALOG.filter(cc => cc.row === r).map(cc => cc.key));
                          p.paintKeys = Object.fromEntries(Object.entries(p.paintKeys || {}).filter(([k]) => !keys.has(k)));
                          p.tramos.forEach(tt => tt[r].forEach(mm => { mm.paint = undefined; mm.unpainted = undefined; }));
                        })} />
                      {r === "upper" ? "Muebles superiores" : "Muebles inferiores"}
                    </label>
                  );
                })}
              </div>
              {typeKeys.length > 0 && (
                <div>
                  <p className="text-[11px] text-white/45 mb-1">Excepciones por tipo (ej. solo los cajoneros pintados):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {typeKeys.map(k => {
                      const cat = CATALOG_BY_KEY[k];
                      const sp = SPECIALS.find(s => s.key === k);
                      const rowOf: PlanRow = cat?.row || "lower";
                      const on = cat
                        ? (plan.paintKeys?.[k] ?? (plan.paintRows?.[rowOf] ?? (plan.paintAll !== false)))
                        : (plan.paintKeys?.[k] !== false);
                      return (
                        <label key={k} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs cursor-pointer border ${on ? "bg-pink-900/30 border-pink-500/40 text-pink-100" : "bg-white/[0.03] border-white/10 text-white/40"}`}>
                          <input type="checkbox" className="h-3.5 w-3.5 accent-pink-500" checked={on}
                            onChange={(e) => edit(p => {
                              p.paintKeys = { ...(p.paintKeys || {}), [k]: e.target.checked };
                              p.tramos.forEach(tt => (["upper", "lower"] as PlanRow[]).forEach(r => tt[r].forEach(mm => { if (mm.key === k) { mm.paint = undefined; mm.unpainted = undefined; } })));
                            })} />
                          {cat ? cat.short : sp?.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-white/35 mt-1">El 🎨 de cada bloque cambia solo ese módulo.</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pieceRows.map(([label, n]) => (
                <div key={label} className="rounded bg-black/25 px-2 py-1.5 text-center">
                  <div className="text-lg font-bold text-pink-200 font-mono">{n}</div>
                  <div className="text-[11px] text-white/50 leading-tight">{label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Extras por diseño</p>
              {stepper("Lateral de mueble superior", "latSup")}
              {stepper("Lateral de mueble inferior", "latInf")}
              {stepper("Puerta de módulo alto", "puertaAlta")}
              {stepper("Piezas especiales (diseño especial)", "especiales")}
            </div>
            <p className="text-[11px] text-white/40">
              En esta etapa los números son informativos. Para cobrarlos, usa el bloque "Pintado Puertas Alto Brillo" más abajo.
            </p>
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
}
