import { useMemo } from "react";
import {
  CATALOG, CATALOG_BY_KEY, FILL_KEYS, SPECIALS,
  normalizePlan, computePlan, rowSequence, rowUsed, activeSpecials,
  round2, newId,
  type ModulePlan, type PlanRow, type PlanModule,
} from "@shared/kitchenModulePlan";

// Etapa 1 — Plano de módulos por tramos. Solo cuenta módulos y piezas de pintura.
// No cambia precios ni el PDF: guarda su estado en kitchenConfig.modulePlan.

interface Props {
  config: any;                       // kitchenConfig del ítem
  onChange: (plan: ModulePlan) => void;
}

const m2 = (n: number) => (Number(n) || 0).toFixed(2);

export function KitchenModulePlanner({ config, onChange }: Props) {
  const plan = useMemo(() => normalizePlan(config?.modulePlan, config), [config]);
  const result = useMemo(() => computePlan(plan, config), [plan, config]);
  const specials = activeSpecials(plan, config);

  const edit = (fn: (p: ModulePlan) => void) => {
    const p: ModulePlan = JSON.parse(JSON.stringify(plan));
    fn(p);
    onChange(p);
  };

  const addModule = (t: number, row: PlanRow, key: string) => {
    const cat = CATALOG_BY_KEY[key];
    if (!cat) return;
    edit(p => {
      const mod: PlanModule = { id: newId(), key, width: cat.width };
      if (cat.corner && t + 1 < p.tramos.length && !p.tramos[t + 1].isIsland && !p.tramos[t].isIsland) mod.alsoTramo = t + 1;
      p.tramos[t][row].push(mod);
    });
  };

  const fillRemaining = (t: number, row: PlanRow, key: string) => {
    const rem0 = round2(plan.tramos[t].length - rowUsed(plan, t, row, config));
    if (rem0 <= 0.01) return;
    edit(p => {
      let rem = rem0;
      while (rem > 0.01) {
        const w = round2(Math.min(0.90, rem));
        p.tramos[t][row].push({ id: newId(), key, width: w });
        rem = round2(rem - w);
      }
    });
  };

  const setWidth = (t: number, row: PlanRow, id: string, w: number) =>
    edit(p => { const m = p.tramos[t][row].find(x => x.id === id); if (m) m.width = round2(w); });
  const remove = (t: number, row: PlanRow, id: string) =>
    edit(p => { p.tramos[t][row] = p.tramos[t][row].filter(x => x.id !== id); });
  const move = (t: number, row: PlanRow, id: string, dir: -1 | 1) =>
    edit(p => {
      const arr = p.tramos[t][row]; const i = arr.findIndex(x => x.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  const togglePaint = (t: number, row: PlanRow, id: string) =>
    edit(p => { const m = p.tramos[t][row].find(x => x.id === id); if (m) m.unpainted = !m.unpainted; });

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
    return (
      <div key={row} className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-white/70 uppercase tracking-wide">{row === "upper" ? "Superiores" : "Inferiores"}</span>
          <span className={over ? "text-red-400 font-semibold" : "text-white/50"}>
            llevas {m2(used)} de {m2(tr.length)} m
            {tr.length > 0 && (over ? ` · te pasas ${m2(-rem)}` : ` · faltan ${m2(rem)}`)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 items-stretch">
          {spHere.map(s => (
            <div key={s.key} className="rounded bg-amber-900/40 border border-amber-500/40 px-2 py-1 text-xs text-amber-200" title="Piso a techo">
              {s.label} <span className="font-mono">{m2(s.w)}</span>
            </div>
          ))}
          {seq.map(({ mod, fromPrev }) => {
            const cat = CATALOG_BY_KEY[mod.key];
            if (!cat) return null;
            const own = !fromPrev;
            const painted = plan.paintAll !== false && !mod.unpainted;
            const adjustable = !cat.locked;
            const tooSmall = !!cat.min && mod.width < cat.min - 1e-9;
            return (
              <div
                key={(fromPrev ? "p-" : "") + mod.id}
                className={`rounded border px-2 py-1 text-xs flex flex-col gap-1 min-w-[88px] ${
                  cat.key === "ventana" ? "bg-slate-700/40 border-slate-500/40 text-slate-200"
                  : tooSmall ? "bg-red-900/30 border-red-500/50 text-red-200"
                  : fromPrev ? "bg-teal-900/20 border-teal-500/20 text-teal-200/70"
                  : "bg-teal-900/40 border-teal-500/40 text-teal-100"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{cat.locked ? "🔒 " : ""}{cat.short}{fromPrev ? " (vértice)" : ""}</span>
                  {own && (
                    <button type="button" className="text-white/40 hover:text-red-300 leading-none" onClick={() => remove(t, row, mod.id)} title="Quitar">✕</button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {own && adjustable ? (
                    <input
                      type="number" step="0.05" min="0"
                      value={mod.width}
                      onChange={(e) => setWidth(t, row, mod.id, parseFloat(e.target.value) || 0)}
                      className="w-14 bg-transparent border-b border-white/30 text-right font-mono focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono">{m2(mod.width)}</span>
                  )}
                  <span className="text-white/40">m</span>
                  {own && Math.abs(mod.width - cat.width) > 0.004 && (
                    <span className="text-amber-300">{mod.width > cat.width ? "+" : ""}{m2(mod.width - cat.width)}</span>
                  )}
                </div>
                {own && (
                  <div className="flex items-center justify-between gap-1 text-white/50">
                    <span className="flex gap-1">
                      <button type="button" onClick={() => move(t, row, mod.id, -1)} title="Mover a la izquierda">◀</button>
                      <button type="button" onClick={() => move(t, row, mod.id, 1)} title="Mover a la derecha">▶</button>
                    </span>
                    {!cat.noPieces && (
                      <button type="button" onClick={() => togglePaint(t, row, mod.id)} title={painted ? "Va pintado" : "No va pintado"} className={painted ? "" : "opacity-30"}>🎨</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {seq.length === 0 && spHere.length === 0 && (
            <span className="text-xs text-white/30 py-2">Sin módulos todavía.</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="h-8 rounded bg-[#0C1A1A] border border-white/15 text-xs text-white/80 px-2"
            value=""
            onChange={(e) => { if (e.target.value) addModule(t, row, e.target.value); }}
          >
            <option value="">+ Agregar módulo…</option>
            {options.map(o => <option key={o.key} value={o.key}>{o.label} ({m2(o.width)} m)</option>)}
          </select>
          {rem > 0.01 && (
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
      </div>
    );
  };

  const P = result.pieces;
  const pieceRows: Array<[string, number]> = [
    ["Puertas superiores", P.up], ["Puertas inferiores", P.lo], ["Puertas de alacena / altas", P.al],
    ["Tapas de cajón", P.ca], ["Tapas de especiero", P.es], ["Golas / frentes pequeños", P.go], ["Piezas especiales", P.special],
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
            Forma de la cocina: <b>{config?.layout || "sin definir"}</b>. Pon el largo de cada pared, agrega los módulos y completa lo que sobre con
            módulos de ajuste. 🔒 = no se mueve · 🎨 = va pintado · ✕ quita · ◀ ▶ cambia el orden.
          </p>

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
              {renderRow(t, "lower")}
            </div>
          ))}

          {specials.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-3 space-y-2 text-xs">
              <p className="font-semibold text-amber-200">Módulos de piso a techo (ya marcados en la cotización)</p>
              {specials.map(s => (
                <div key={s.key} className="flex flex-wrap items-center gap-3 text-amber-100/80">
                  <span className="w-44">{s.label}</span>
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
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-pink-200">Piezas a pintar (alto brillo)</p>
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox" className="h-4 w-4 accent-pink-500"
                  checked={plan.paintAll !== false}
                  onChange={(e) => edit(p => { p.paintAll = e.target.checked; })}
                />
                Todos los módulos van pintados
              </label>
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
              {stepper("Lateral de nicho de nevera", "latNevera")}
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
