import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BRAND_OF_CATEGORY, PRIMADERA_CATEGORY_LABELS, PRIMADERA_DESIGNS, WOOD_BRANDS, woodHasPhoto, woodShortName, woodSwatchUrl,
  type PrimaderaDesign,
} from "@shared/primaderaCatalog";
import { COUNTERTOP_DESIGNS, countertopDesignsByType, countertopHasPhoto, countertopLabel, countertopSwatchUrl, findCountertopDesign, type CountertopDesign } from "@shared/countertopCatalog";
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

/** El tipo de mesón de la cotización ("quarzone" = cuarzo) tal como lo usa el catálogo de piedras */
export const tipoPiedra = (t?: string | null): "granito" | "cuarzo" | "sinterizado" | null => (t === "quarzone" || t === "cuarzo" ? "cuarzo" : t === "granito" ? "granito" : t === "sinterizado" ? "sinterizado" : null);
export const piedraPorNombre = (n?: string) => (n ? findCountertopDesign(n) : undefined);
const CLAVE_PIEDRA = "innovar_piedras_uso";
function leerUsoPiedra(): Record<string, number> { try { return JSON.parse(localStorage.getItem(CLAVE_PIEDRA) || "{}") || {}; } catch { return {}; } }
function sumarUsoPiedra(n: string) { try { const u = leerUsoPiedra(); u[n] = (u[n] || 0) + 1; localStorage.setItem(CLAVE_PIEDRA, JSON.stringify(u)); } catch { /* */ } }
function piedrasMasUsadas(tipo: string): CountertopDesign[] {
  const todas = countertopDesignsByType(tipo).filter(countertopHasPhoto);
  const u = leerUsoPiedra();
  const usadas = Object.entries(u).sort((a, b) => b[1] - a[1]).map(([n]) => todas.find((d) => countertopLabel(d) === n)).filter((d): d is CountertopDesign => !!d);
  return [...usadas, ...todas.filter((d) => !usadas.includes(d))].slice(0, 6);
}

type Donde = "ext" | "sup" | "inf" | "alt" | "isla" | "int" | "meson" | "mesonIsla";
const CAMPO: Record<Donde, "colorExt" | "colorSup" | "colorInf" | "colorAlt" | "colorIsla" | "colorInt" | "colorMeson" | "colorMesonIsla"> = { ext: "colorExt", sup: "colorSup", inf: "colorInf", alt: "colorAlt", isla: "colorIsla", int: "colorInt", meson: "colorMeson", mesonIsla: "colorMesonIsla" };
const NOMBRE: Record<Donde, string> = { ext: "Todo (exterior)", sup: "Superiores", inf: "Inferiores", alt: "Muebles altos", isla: "Isla y barra", int: "Interior", meson: "Mesón", mesonIsla: "Mesón de la isla" };

export function ColorFrentes({ plan, onEdit, mesonTipo, mesonIslaTipo }: { plan: ModulePlan; onEdit: (fn: (p: ModulePlan) => void) => void; mesonTipo?: string | null; mesonIslaTipo?: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number; max: number }>({ top: 0, right: 0, max: 400 });
  const abrir = () => {
    if (!abierto && boton.current) {
      const r = boton.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right), max: Math.max(220, window.innerHeight - r.bottom - 16) });
    }
    setAbierto((x) => !x);
  };
  const [donde, setDonde] = useState<Donde>("ext");
  const [todos, setTodos] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [uso, setUso] = useState(0);
  const esPiedra = donde === "meson" || donde === "mesonIsla";
  const tipoDe = tipoPiedra(donde === "mesonIsla" ? (mesonIslaTipo ?? mesonTipo) : mesonTipo);
  type Item = { clave: string; nombre: string; url: string; pista: string };
  const deMadera = (d: PrimaderaDesign): Item => ({ clave: d.name, nombre: woodShortName(d), url: woodSwatchUrl(d), pista: d.hint });
  const dePiedra = (d: CountertopDesign): Item => ({ clave: countertopLabel(d), nombre: countertopLabel(d), url: countertopSwatchUrl(d.code), pista: d.type });
  const frecuentes: Item[] = useMemo(() => (esPiedra ? (tipoDe ? piedrasMasUsadas(tipoDe).map(dePiedra) : []) : masUsados().map(deMadera)), [uso, abierto, esPiedra, tipoDe]);   // eslint-disable-line react-hooks/exhaustive-deps
  const claveActual = plan[CAMPO[donde]] as string | undefined;
  const actual: Item | undefined = esPiedra ? (piedraPorNombre(claveActual) ? dePiedra(piedraPorNombre(claveActual)!) : undefined) : (disenoPorNombre(claveActual) ? deMadera(disenoPorNombre(claveActual)!) : undefined);
  const poner = (d: Item | null) => {
    if (d) { if (esPiedra) sumarUsoPiedra(d.clave); else sumarUso(d.clave); setUso((x) => x + 1); }
    onEdit((p) => { (p as any)[CAMPO[donde]] = d ? d.clave : undefined; });
  };
  const hayColor = !!(plan.colorExt || plan.colorSup || plan.colorInf || plan.colorAlt || plan.colorIsla || plan.colorInt || plan.colorMeson || plan.colorMesonIsla);
  const hayIsla = plan.tramos.some((t) => t.isIsland);
  const muestra = (d: Item, grande = false) => (
    <button key={d.clave} type="button" title={`${d.nombre} · ${d.pista}`} onClick={() => poner(d)}
      className={`relative ${grande ? "w-full" : "w-11"} rounded overflow-hidden border-2 ${actual?.clave === d.clave ? "border-cyan-300" : "border-white/20"} bg-black/40 text-left`}>
      <img src={d.url} alt={d.nombre} loading="lazy" className={`${grande ? "h-12" : "h-11"} w-full object-cover`} />
      {grande && <span className="block px-1 py-0.5 text-[10px] leading-tight text-white/80 truncate">{d.nombre}</span>}
    </button>
  );
  // Dentro de la ventana de la cotización un campo de texto fuera de ella pierde el foco (la ventana lo retiene): la búsqueda se escribe con el teclado, sin campo
  useEffect(() => {
    if (!(abierto && todos)) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { e.stopPropagation(); setTodos(false); return; }
      if (e.key === "Backspace") { e.preventDefault(); setBuscar((b) => b.slice(0, -1)); return; }
      if (e.key.length === 1) { e.preventDefault(); setBuscar((b) => (b + e.key).slice(0, 30)); }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [abierto, todos]);
  const q = buscar.trim().toLowerCase();
  const lista = conFoto.filter((d) => !q || d.name.toLowerCase().includes(q) || d.hint.toLowerCase().includes(q));
  const listaPiedra = tipoDe ? countertopDesignsByType(tipoDe).filter(countertopHasPhoto).filter((d) => !q || countertopLabel(d).toLowerCase().includes(q)) : [];
  return (
    <div className="relative">
      <button ref={boton} type="button" onClick={abrir} aria-expanded={abierto}
        className={`px-2.5 py-1.5 rounded text-xs font-semibold border min-h-[32px] ${hayColor ? "bg-primary text-white border-primary" : "bg-black/60 text-white border-white/20"}`}>🎨 Color</button>
      {abierto && createPortal(
        <div data-pantalla-completa className="fixed inset-0" style={{ pointerEvents: "auto", zIndex: 100001 }} onPointerDown={() => setAbierto(false)}>
        <div className="fixed w-[300px] max-w-[88vw] overflow-y-auto rounded-lg border border-white/20 bg-[#10181a] p-2.5 shadow-xl space-y-2" style={{ top: pos.top, right: pos.right, maxHeight: pos.max }} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          <p className="text-[11px] text-white/60 leading-snug">Colores <b>orientativos</b> para mostrar al cliente. El color definitivo se elige al aprobar el diseño. «Todo» pinta lo que no tenga color propio; el interior es el de la carcasa por dentro.</p>
          <div className="flex flex-wrap gap-1">
            {(["ext", "sup", "inf", "alt", ...(hayIsla ? ["isla"] : []), "int", "meson", ...(hayIsla ? ["mesonIsla"] : [])] as Donde[]).map((v) => (
              <button key={v} type="button" onClick={() => setDonde(v)} className={`px-2 py-1 rounded text-[11px] font-semibold border ${donde === v ? "bg-primary text-white border-primary" : "bg-white/5 text-white/70 border-white/15"}`}>{NOMBRE[v]}{plan[CAMPO[v]] ? " ●" : ""}</button>
            ))}
          </div>
          {donde === "int" && <p className="text-[11px] text-white/55 leading-snug">El interior es el color de la carcasa por dentro: se guarda para el diseñador, pero con las puertas cerradas no se ve en el 3D.</p>}
          {esPiedra && (
            <p className={`text-[11px] leading-snug ${tipoDe ? "text-white/70" : "text-amber-300"}`}>
              {tipoDe ? <>Material de la cotización: <b>{tipoDe === "cuarzo" ? "Cuarzo" : tipoDe === "granito" ? "Granito" : "Sinterizado"}</b>. Solo cambia el color o la veta; el material es el real.</> : "Elige primero el «Tipo de mesón» en la cotización: el 3D usa ese material."}
            </p>
          )}
          {(!esPiedra || tipoDe) && (
            <div className="flex flex-wrap gap-1.5">
              {frecuentes.map((d) => muestra(d))}
              <button type="button" onClick={() => poner(null)} title="Quitar el color (tono claro)" className="w-11 h-11 rounded border-2 border-dashed border-white/30 text-[10px] text-white/70 leading-tight">Sin color</button>
            </div>
          )}
          {actual && !(esPiedra && tipoDe && piedraPorNombre(claveActual)?.type !== tipoDe) && <p className="text-[11px] text-cyan-200">{NOMBRE[donde]}: <b>{actual.nombre}</b></p>}
          {actual && esPiedra && tipoDe && piedraPorNombre(claveActual)?.type !== tipoDe && <p className="text-[11px] text-amber-300">«{actual.nombre}» es de otro material; la cotización dice {tipoDe}. Elige uno de {tipoDe}.</p>}
          <button type="button" disabled={esPiedra && !tipoDe} onClick={() => setTodos((x) => !x)} className="w-full px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-semibold text-white">{todos ? "▲ Ocultar catálogo" : "▼ Ver todos"}</button>
        </div>
        </div>, document.body)}
      {abierto && todos && createPortal(
        <div data-pantalla-completa className="fixed inset-0 flex items-center justify-center bg-black/60 p-3" style={{ pointerEvents: "auto", zIndex: 100002 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setTodos(false)}>
          <div className="w-full max-w-[640px] max-h-[88vh] rounded-xl border border-white/20 bg-[#10181a] p-3 space-y-2 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-bold text-white">Todos los colores · {NOMBRE[donde]}</p>
              <button type="button" onClick={() => setTodos(false)} className="px-3 h-8 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white">Cerrar</button>
            </div>
            <div className="w-full h-9 px-2 rounded bg-black/40 border border-white/20 text-sm flex items-center gap-2">
              <span aria-hidden>🔎</span>
              <span className={buscar ? "text-white" : "text-white/40"}>{buscar || (esPiedra ? "Escribe para buscar una piedra…" : "Escribe para buscar un color o madera…")}</span>
              {buscar && <button type="button" onClick={() => setBuscar("")} className="ml-auto text-xs text-white/60 hover:text-white">Borrar</button>}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-3 pr-1" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {esPiedra ? (
                <div>
                  <p className="text-xs font-bold text-white/80 mb-1">{tipoDe === "cuarzo" ? "Cuarzo" : tipoDe === "granito" ? "Granito" : "Sinterizado"}</p>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">{listaPiedra.map((d) => muestra(dePiedra(d), true))}</div>
                </div>
              ) : WOOD_BRANDS.map((marca) => {
                const cats = Array.from(new Set(lista.filter((d) => BRAND_OF_CATEGORY[d.category] === marca).map((d) => d.category)));
                if (!cats.length) return null;
                return (
                  <div key={marca}>
                    <p className="text-xs font-bold text-white/80 mb-1">{marca}</p>
                    {cats.map((c) => (
                      <div key={c} className="mb-2">
                        <p className="text-[11px] text-white/50 mb-1">{PRIMADERA_CATEGORY_LABELS[c]}</p>
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">{lista.filter((d) => d.category === c).map((d) => muestra(deMadera(d), true))}</div>
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
