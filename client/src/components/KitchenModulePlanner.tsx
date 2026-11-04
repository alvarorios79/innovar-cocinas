import { useMemo, useState } from "react";
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
              {s.label} <span className="font-mono">{m2(s.w)}</span>
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
                className={`rounded border px-2 py-1 text-xs flex flex-col gap-1 min-w-[96px] ${mine ? "cursor-grab" : ""} ${
                  cat.key === "ventana" ? "bg-slate-700/40 border-slate-500/40 text-slate-200"
                  : outOfRange ? "bg-red-900/30 border-red-500/50 text-red-200"
                  : fromPrev ? "bg-teal-900/20 border-teal-500/20 text-teal-200/70"
                  : mod.autoOf ? "bg-sky-900/30 border-sky-500/30 text-sky-100"
                  : "bg-teal-900/40 border-teal-500/40 text-teal-100"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{cat.locked ? "🔒 " : ""}{cat.short}{fromPrev ? " (vértice)" : ""}</span>
                  {mine && (
                    <button type="button" className="text-white/50 hover:text-red-300 leading-none px-1" onClick={() => edit(p => removeModuleFromPlan(p, t, row, mod.id))} title="Quitar">✕</button>
                  )}
                </div>
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
                  {mine && Math.abs(mod.width - cat.width) > 0.004 && !mod.autoBase && !mod.autoGroup && (
                    <span className="text-amber-300">{mod.width > cat.width ? "+" : ""}{m2(mod.width - cat.width)}</span>
                  )}
                </div>
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
                  <span className="w-48">{s.label} <span className="text-amber-100/40">({s.detail})</span></span>
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
                      con lateral
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
