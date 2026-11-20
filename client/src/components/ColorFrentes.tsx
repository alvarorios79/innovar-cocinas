import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BRAND_OF_CATEGORY, PRIMADERA_CATEGORY_LABELS, PRIMADERA_DESIGNS, WOOD_BRANDS, woodHasPhoto, woodShortName, woodSwatchUrl,
  type PrimaderaDesign,
} from "@shared/primaderaCatalog";
import type { ModulePlan } from "@shared/kitchenModulePlan";

// Botón «Color» del visor 3D: el color de los frentes es ORIENTATIVO (la cotización aún no tiene colores definidos).
// Se despliegan los 6 más usados; «Ver todos» abre el catálogo completo (Primadera, Duratex, altos brillos). Lo más usado se aprende solo en este equipo.

const CLAVE = "innovar_colores_uso";
const POR_DEFECTO = ["Blanco Tradicional", "Ártico", "Yalaa", "Humo", "Sukta", "Roble Cenizo"];
const conFoto = PRIMADERA_DESIGNS.filter(woodHasPhoto);
export const disenoPorNombre = (n?: string) => (n ? PRIMADERA_DESIGNS.find((d) => d.name === n) : undefined);

function leerUso(): Record<string, number> { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch { return {}; } }
function sumarUso(nombre: string) { try { const u = leerUso(); u[nombre] = (u[nombre] || 0) + 1; localStorage.setItem(CLAVE, JSON.stringify(u)); } catch { /* sin almacenamiento: no pasa nada */ } }
function masUsados(): PrimaderaDesign[] {
  const u = leerUso();
  const usados = Object.entries(u).sort((a, b) => b[1] - a[1]).map(([n]) => disenoPorNombre(n)).filter((d): d is PrimaderaDesign => !!d && woodHasPhoto(d));
  const relleno = POR_DEFECTO.map(disenoPorNombre).filter((d): d is PrimaderaDesign => !!d && !usados.includes(d));
  return [...usados, ...relleno].slice(0, 6);
}

type Donde = "ext" | "sup" | "inf";
const CAMPO: Record<Donde, "colorExt" | "colorSup" | "colorInf"> = { ext: "colorExt", sup: "colorSup", inf: "colorInf" };

export function ColorFrentes({ plan, onEdit }: { plan: ModulePlan; onEdit: (fn: (p: ModulePlan) => void) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [donde, setDonde] = useState<Donde>("ext");
  const [todos, setTodos] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [uso, setUso] = useState(0);
  const frecuentes = useMemo(() => masUsados(), [uso, abierto]);   // eslint-disable-line react-hooks/exhaustive-deps
  const actual = disenoPorNombre(plan[CAMPO[donde]]);
  const poner = (d: PrimaderaDesign | null) => {
    if (d) { sumarUso(d.name); setUso((x) => x + 1); }
    onEdit((p) => { (p as any)[CAMPO[donde]] = d ? d.name : undefined; });
  };
  const hayColor = !!(plan.colorExt || plan.colorSup || plan.colorInf);
  const muestra = (d: PrimaderaDesign, grande = false) => (
    <button key={d.name} type="button" title={`${woodShortName(d)} · ${d.hint}`} onClick={() => poner(d)}
      className={`relative ${grande ? "w-full" : "w-11"} rounded overflow-hidden border-2 ${actual?.name === d.name ? "border-cyan-300" : "border-white/20"} bg-black/40 text-left`}>
      <img src={woodSwatchUrl(d)} alt={d.name} loading="lazy" className={`${grande ? "h-12" : "h-11"} w-full object-cover`} />
      {grande && <span className="block px-1 py-0.5 text-[10px] leading-tight text-white/80 truncate">{woodShortName(d)}</span>}
    </button>
  );
  const q = buscar.trim().toLowerCase();
  const lista = conFoto.filter((d) => !q || d.name.toLowerCase().includes(q) || d.hint.toLowerCase().includes(q));
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((x) => !x)} aria-expanded={abierto}
        className={`px-2.5 py-1.5 rounded text-xs font-semibold border min-h-[32px] ${hayColor ? "bg-primary text-white border-primary" : "bg-black/60 text-white border-white/20"}`}>🎨 Color</button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[300px] max-w-[88vw] rounded-lg border border-white/20 bg-[#10181a] p-2.5 shadow-xl space-y-2" onPointerDown={(e) => e.stopPropagation()}>
          <p className="text-[11px] text-white/60 leading-snug">Color de los frentes <b>orientativo</b> para mostrar al cliente. El color definitivo se elige al aprobar el diseño.</p>
          <div className="flex gap-1">
            {([["ext", "Todo"], ["sup", "Superiores"], ["inf", "Inferiores"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setDonde(v)} className={`flex-1 px-1.5 py-1 rounded text-[11px] font-semibold border ${donde === v ? "bg-primary text-white border-primary" : "bg-white/5 text-white/70 border-white/15"}`}>{t}{plan[CAMPO[v]] ? " ●" : ""}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frecuentes.map((d) => muestra(d))}
            <button type="button" onClick={() => poner(null)} title="Quitar el color (tono claro)" className="w-11 h-11 rounded border-2 border-dashed border-white/30 text-[10px] text-white/70 leading-tight">Sin color</button>
          </div>
          {actual && <p className="text-[11px] text-cyan-200">{donde === "ext" ? "Todo" : donde === "sup" ? "Superiores" : "Inferiores"}: <b>{woodShortName(actual)}</b></p>}
          <button type="button" onClick={() => setTodos((x) => !x)} className="w-full px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white">{todos ? "▲ Ocultar catálogo" : "▼ Ver todos"}</button>
        </div>
      )}
      {abierto && todos && createPortal(
        <div data-pantalla-completa className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3" style={{ pointerEvents: "auto" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setTodos(false)}>
          <div className="w-full max-w-[640px] max-h-[88vh] rounded-xl border border-white/20 bg-[#10181a] p-3 space-y-2 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-bold text-white">Todos los colores · {donde === "ext" ? "Todo" : donde === "sup" ? "Superiores" : "Inferiores"}</p>
              <button type="button" onClick={() => setTodos(false)} className="px-3 h-8 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white">Cerrar</button>
            </div>
            <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar color o madera…" className="w-full h-9 px-2 rounded bg-black/40 border border-white/20 text-sm text-white focus:outline-none" />
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-3 pr-1" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {WOOD_BRANDS.map((marca) => {
                const cats = Array.from(new Set(lista.filter((d) => BRAND_OF_CATEGORY[d.category] === marca).map((d) => d.category)));
                if (!cats.length) return null;
                return (
                  <div key={marca}>
                    <p className="text-xs font-bold text-white/80 mb-1">{marca}</p>
                    {cats.map((c) => (
                      <div key={c} className="mb-2">
                        <p className="text-[11px] text-white/50 mb-1">{PRIMADERA_CATEGORY_LABELS[c]}</p>
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">{lista.filter((d) => d.category === c).map((d) => muestra(d, true))}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
