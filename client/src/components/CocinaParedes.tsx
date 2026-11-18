import { lazy, Suspense, useEffect, useRef, useState, type MutableRefObject } from "react";
import { ChevronDown, Maximize2, X } from "lucide-react";
import type { Habitacion3DRef } from "./Habitacion3D";
import { Input } from "@/components/ui/input";
import { InputM, fm } from "@/components/InputMetros";
import {
  FORMAS_COCINA, nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes, ajustarAbertura, imantarDesde, estadoIman, anchoMuroCm,
  FONDO_INFERIOR_CM, FONDO_SUPERIOR_CM, esquinasDeForma, paredGanadoraEsquina, descuentosEsquinas, aplicarMueblesAutomaticos,
  ABERTURA_POR_DEFECTO, ALTO_COCINA_POR_DEFECTO, SEPARACION_PARALELA_POR_DEFECTO,
  type FormaCocina, type ParedCocina, type AberturaCocina,
} from "@shared/cocinaParedes";

// El visor 3D se carga solo cuando se necesita (no pesa en el resto de la aplicación)
const Habitacion3D = lazy(() => import("./Habitacion3D"));

// Gráfico de la cocina según su forma (Línea, L, U, II) para escribir solo las medidas de cada pared.
// Pensado para la tablet del levantamiento: botones y campos grandes.

interface Props {
  forma?: string;
  paredes?: ParedCocina[];
  /** Medidas guardadas del levantamiento (para leer isla y barra) */
  medidas?: Record<string, any>;
  altoCm?: number;
  profundoCm?: number;
  separacionCm?: number;
  aberturas?: AberturaCocina[];
  /** Devuelve las medidas a guardar en el levantamiento (claves _cocina_*) */
  onChange: (cambios: Record<string, any>) => void;
  /** Aquí queda una función que toma la foto del 3D (para ponerla sola y bloqueada en la pizarra) */
  capturaRef?: MutableRefObject<((pose?: any) => string | null) | null>;
  /** Cliente / otros datos no necesarios aquí */
}

const TEAL = "#00BCD4";
const GRIS = "rgba(255,255,255,0.18)";

// Coordenadas (en un lienzo de 260 × 170) de cada pared por forma: [x1, y1, x2, y2]
const GEOMETRIA: Record<FormaCocina, Array<[number, number, number, number]>> = {
  Lineal: [[30, 40, 230, 40]],
  L: [[30, 40, 230, 40], [230, 40, 230, 140]],
  U: [[30, 40, 30, 140], [30, 140, 230, 140], [230, 140, 230, 40]],
  Paralela: [[30, 40, 230, 40], [30, 140, 230, 140]],
};

function Grafico({ forma, activa, onPick }: { forma: FormaCocina; activa: number; onPick: (i: number) => void }) {
  const paredes = GEOMETRIA[forma];
  const letras = nombresParedes(forma);
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-[420px] mx-auto" role="img" aria-label={`Forma de cocina ${forma}`}>
      <rect x="0" y="0" width="260" height="170" rx="10" fill="rgba(255,255,255,0.03)" />
      {paredes.map(([x1, y1, x2, y2], i) => {
        const on = i === activa;
        const vertical = x1 === x2;
        // «muebles»: una franja gruesa pegada a la pared, hacia adentro de la cocina
        const dx = vertical ? (x1 < 130 ? 14 : -14) : 0;
        const dy = vertical ? 0 : (y1 < 90 ? 14 : -14);
        return (
          <g key={i} onClick={() => onPick(i)} style={{ cursor: "pointer" }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? TEAL : "#9aa7ad"} strokeWidth={on ? 7 : 5} strokeLinecap="round" />
            <line x1={x1 + dx} y1={y1 + dy} x2={x2 + dx} y2={y2 + dy} stroke={on ? "rgba(0,188,212,0.55)" : GRIS} strokeWidth={10} strokeLinecap="butt" />
            <circle cx={(x1 + x2) / 2 + dx * 2.2} cy={(y1 + y2) / 2 + dy * 2.2} r="11" fill={on ? TEAL : "#3A3A3A"} stroke={on ? "#fff" : "#9aa7ad"} />
            <text x={(x1 + x2) / 2 + dx * 2.2} y={(y1 + y2) / 2 + dy * 2.2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{letras[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Campo con etiqueta en metros que deja ESCRIBIR con calma (los ajustes se aplican sobre la marcha y al salir se ve el valor ya ajustado)
function CampoNumero({ label, valor, onValor, clase }: { label: string; valor: number; onValor: (cm: number) => void; clase?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-primary mb-1">{label}</label>
      <InputM valorCm={valor} onCm={(v) => { if (v !== undefined) onValor(v); }} className={clase ?? "bg-background border-primary/30 text-white h-11 text-base"} />
    </div>
  );
}

const metros = (cm: number) => (cm / 100).toFixed(2).replace(".", ",");

// Pestaña plegable: solo se abre lo que se necesita
function Seccion({ titulo, resumen, abierta, onToggle, children }: { titulo: string; resumen?: string; abierta: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/25 bg-background/30 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[52px] text-left">
        <span className="text-sm font-bold text-white">{titulo}</span>
        <span className="flex items-center gap-2 min-w-0">
          {resumen && !abierta && <span className="text-[11px] text-gray-400 truncate max-w-[55vw]">{resumen}</span>}
          <ChevronDown className={`h-5 w-5 text-primary shrink-0 transition-transform ${abierta ? "rotate-180" : ""}`} />
        </span>
      </button>
      {abierta && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export function CocinaParedes({ forma, paredes, medidas, altoCm, profundoCm, separacionCm, aberturas, onChange, capturaRef }: Props) {
  const [activa, setActiva] = useState(0);
  const [sin3D, setSin3D] = useState(false); // si el equipo no puede dibujar 3D se muestra el dibujo plano de siempre
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [avisoVista, setAvisoVista] = useState("");
  // Pestañas: lo primero son las ventanas y las puertas
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({ aberturas: true });
  const alternar = (k: string) => setAbiertas((a) => ({ ...a, [k]: !a[k] }));
  const h3d = useRef<Habitacion3DRef>(null);
  useEffect(() => {
    if (!pantallaCompleta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // la página de fondo no se mueve
    return () => { document.body.style.overflow = previo; };
  }, [pantallaCompleta]);
  useEffect(() => { if (capturaRef) capturaRef.current = (pose) => h3d.current?.capturar(pose) ?? null; return () => { if (capturaRef) capturaRef.current = null; }; }, [capturaRef]);
  const lista0 = aberturas || [];

  const lista = normalizarParedes(forma, paredes);
  const letras = nombresParedes(forma);
  const tot = totalesParedes(lista);
  const techo = altoCm || ALTO_COCINA_POR_DEFECTO;
  const num = (v: string) => (v === "" ? undefined : Math.max(0, parseFloat(v)));
  // Largo que se usa para mover una abertura: el ancho de la pared; si aún no se escribió, 300 cm provisionales
  const largoPared = (i: number) => anchoMuroCm(lista[i]) || 300;

  // Fondos de los muebles y qué pared llega a cada esquina (L y U): de aquí salen los muebles de cada pared
  const fondoInf = Number(medidas?._cocina_profundo) || FONDO_INFERIOR_CM;
  const fondoSup = Number(medidas?._cocina_profundo_sup) || FONDO_SUPERIOR_CM;
  const eleccion: number[] | undefined = Array.isArray(medidas?._cocina_esquinas) ? medidas?._cocina_esquinas : undefined;
  const esquinas = esquinasDeForma(forma);
  const ganadoras = paredGanadoraEsquina(forma, lista, eleccion);
  const desc = descuentosEsquinas(forma, lista, fondoInf, fondoSup, eleccion);

  const emitir = (nuevas: ParedCocina[], extra: Record<string, any> = {}) => {
    // Los muebles que no se escribieron a mano se calculan solos: ancho de la pared menos el fondo del mueble que llega a la esquina
    const conAuto = aplicarMueblesAutomaticos(
      (extra._cocina_forma as string | undefined) ?? forma, nuevas,
      (extra._cocina_profundo as number | undefined) ?? fondoInf, (extra._cocina_profundo_sup as number | undefined) ?? fondoSup,
      (extra._cocina_esquinas as number[] | undefined) ?? eleccion,
    );
    const t = totalesParedes(conAuto);
    onChange({
      _cocina_paredes: conAuto,
      // el «ancho» antiguo sigue existiendo: es el total de muebles inferiores (para pantallas viejas)
      _cocina_ancho: t.infM > 0 ? Math.round(t.infM * 100) : undefined,
      ...extra,
    });
  };

  const inputCls = "bg-background border-primary/30 text-white h-12 text-base";

  return (
    <div className="space-y-4">
      {/* 1. Forma */}
      <div>
        <label className="block text-xs font-semibold text-primary mb-2">Forma de la cocina *</label>
        <div className="grid grid-cols-4 gap-2">
          {FORMAS_COCINA.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                const nuevas = normalizarParedes(f.key, lista);
                setActiva(0);
                emitir(nuevas, { _cocina_forma: f.key });
              }}
              className={`py-3 rounded-lg border text-sm font-bold transition-colors min-h-[48px] ${
                forma === f.key ? "bg-primary border-primary text-white" : "border-primary/30 text-gray-300 hover:border-primary/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {forma && <p className="text-[11px] text-gray-400 mt-1">{FORMAS_COCINA.find((f) => f.key === forma)?.ayuda}</p>}
        <p className="mt-2 text-[12px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">📏 <b>Todas las medidas se escriben en metros (m)</b>. Ejemplo: <b>3,60</b> (puedes usar coma o punto). Los totales también salen en metros.</p>
      </div>

      {forma && (
        <div className={pantallaCompleta ? "fixed inset-0 z-[60] bg-background flex flex-col [@media(orientation:landscape)]:flex-row" : "space-y-3"}>
          {/* ARRIBA (o a la izquierda): el dibujo queda FIJO, no se mueve al hacer scroll */}
          <div className={pantallaCompleta ? "shrink-0 h-[44dvh] [@media(orientation:landscape)]:h-full [@media(orientation:landscape)]:w-[56%] flex flex-col gap-2 p-3 border-b [@media(orientation:landscape)]:border-b-0 [@media(orientation:landscape)]:border-r border-primary/30" : "space-y-3"}>
          {/* 2. Dibujo 3D (se puede abrir en pantalla completa, como la pizarra) */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Dibujo de la cocina</p>
            <button type="button" onClick={() => setPantallaCompleta((v) => !v)} className="text-sm font-medium px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 min-h-[44px]">
              {pantallaCompleta ? <><X className="h-4 w-4" /> Cerrar</> : <><Maximize2 className="h-4 w-4" /> Pantalla completa</>}
            </button>
          </div>
          <div className={pantallaCompleta ? "flex-1 min-h-0" : ""}>
          {sin3D ? (
            <Grafico forma={forma as FormaCocina} activa={activa} onPick={setActiva} />
          ) : (
            <Suspense fallback={<div className="h-[300px] rounded-lg bg-black/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">Cargando vista 3D…</div>}>
              <Habitacion3D
                ref={h3d}
                forma={forma}
                paredes={lista}
                separacionCm={separacionCm}
                altoCm={altoCm}
                aberturas={lista0}
                activa={activa}
                onPickPared={setActiva}
                onFalla={() => setSin3D(true)}
                altura={pantallaCompleta ? "100%" : 300}
                profundoCm={fondoInf}
                profundoSupCm={fondoSup}
                esquinas={eleccion}
                isla={Number(medidas?._cocina_isla) > 0 ? { ancho: Number(medidas?._cocina_isla), profundo: Number(medidas?._cocina_isla_profundo) || 0, alto: Number(medidas?._cocina_isla_alto) || 0 } : null}
                barra={Number(medidas?._cocina_barra) > 0 ? { ancho: Number(medidas?._cocina_barra), profundo: Number(medidas?._cocina_barra_profundo) || 0, alto: Number(medidas?._cocina_barra_alto) || 0 } : null}
                vistaPizarra={medidas?._cocina_camara ?? null}
                onFijarVista={(pose) => { onChange({ _cocina_camara: pose ?? undefined }); setAvisoVista(pose ? "Vista enviada a la pizarra ✓ — la hoja se actualiza sola con cada medida nueva, desde este mismo ángulo." : "Vista automática: la pizarra usa el ángulo estándar."); }}
              />
            </Suspense>
          )}
          </div>
          </div>

          {/* ABAJO (o a la derecha): aquí se escribe; solo esta parte se desplaza */}
          <div className={pantallaCompleta ? "flex-1 min-h-0 overflow-y-auto p-3 space-y-3" : "space-y-3"}>
          {avisoVista && <p className="text-[11px] text-emerald-300">{avisoVista}</p>}
          {/* Paralela: distancia entre las dos paredes */}
          {forma === "Paralela" && (
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Distancia entre las dos paredes (m)</label>
              <InputM placeholder={fm(SEPARACION_PARALELA_POR_DEFECTO)} valorCm={separacionCm} onCm={(v) => onChange({ _cocina_separacion: v })} className={inputCls} />
            </div>
          )}

          {/* ── Pestañas ── */}
          <Seccion titulo="1 · Ventanas y puertas" abierta={!!abiertas.aberturas} onToggle={() => alternar("aberturas")}
            resumen={lista0.length ? `${lista0.filter((a) => a.tipo === "ventana").length} ventana(s) · ${lista0.filter((a) => a.tipo === "puerta").length} puerta(s)` : "ninguna"}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-400">Lo primero: marca dónde están las ventanas y las puertas. Se ven en el dibujo.</p>
              <div className="flex gap-2 shrink-0">
                {(["ventana", "puerta"] as const).map((tipo) => (
                  <button key={tipo} type="button" className="px-3 py-2 rounded-lg border border-primary/40 text-xs font-bold text-primary min-h-[44px]"
                    onClick={() => {
                      const base = ABERTURA_POR_DEFECTO[tipo];
                      const par = Math.min(activa, Math.max(0, letras.length - 1));
                      const nueva: AberturaCocina = { id: Math.random().toString(36).slice(2, 8), tipo, pared: par, desde: 20, ...base };
                      onChange({ _cocina_aberturas: [...lista0, ajustarAbertura(nueva, largoPared(par), techo)] });
                    }}>
                    + {tipo === "ventana" ? "Ventana" : "Puerta"}
                  </button>
                ))}
              </div>
            </div>
            {lista0.length === 0 && <p className="text-[11px] text-gray-400">Si la cocina no tiene ventanas ni puertas en estas paredes, sigue con la siguiente pestaña.</p>}
            {lista0.map((a, idx) => {
              const largoCm = largoPared(a.pared);
              const sinMedida = !(anchoMuroCm(lista[a.pared]) > 0);
              const otras = lista0.filter((_, i) => i !== idx);
              const cambiar = (c: Partial<AberturaCocina>) => {
                const copia = [...lista0];
                const par = c.pared ?? a.pared;
                copia[idx] = ajustarAbertura({ ...a, ...c }, largoPared(par), techo);
                onChange({ _cocina_aberturas: copia });
              };
              const mover = (desde: number) => cambiar({ desde: imantarDesde(a, desde, largoCm, otras) });
              const iman = estadoIman(a, largoCm, otras);
              const numero = (label: string, valor: number, clave: "desde" | "ancho" | "alto" | "antepecho") => (
                <CampoNumero key={clave} label={label} valor={valor} onValor={(n) => cambiar({ [clave]: n } as any)} />
              );
              const arriba = a.antepecho + a.alto;
              return (
                <div key={a.id} className="rounded-lg border border-primary/25 bg-background/40 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{a.tipo === "ventana" ? "Ventana" : "Puerta"}</span>
                    <select value={a.pared} onChange={(e) => cambiar({ pared: parseInt(e.target.value) })} className="h-10 rounded bg-background border border-primary/30 text-white text-sm px-2">
                      {letras.map((l, i) => <option key={l} value={i}>Pared {l}</option>)}
                    </select>
                    <button type="button" onClick={() => onChange({ _cocina_aberturas: lista0.filter((_, i) => i !== idx) })} className="px-3 py-2 rounded border border-red-500/40 text-red-300 text-xs min-h-[40px]">Quitar</button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-primary">Posición en la pared {sinMedida ? "(todavía sin ancho: se usan 3,00 m provisionales)" : `(la pared mide ${fm(largoCm)} m)`}</p>
                    <input type="range" min={0} max={Math.max(0, largoCm - a.ancho)} value={a.desde} onChange={(e) => mover(parseFloat(e.target.value))} className="w-full h-8" aria-label="Mover a lo largo de la pared" />
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => cambiar({ desde: 0 })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[44px]">⇤ Pegar al inicio</button>
                      <button type="button" onClick={() => cambiar({ desde: Math.round((largoCm - a.ancho) / 2) })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[44px]">Centrar</button>
                      <button type="button" onClick={() => cambiar({ desde: Math.max(0, largoCm - a.ancho) })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[44px]">Pegar al final ⇥</button>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Queda a <b>{fm(a.desde)} m</b> del inicio y a <b>{fm(Math.max(0, largoCm - a.desde - a.ancho))} m</b> del final.
                      {iman && <span className="ml-1 text-primary font-semibold">🧲 {iman === "inicio" ? "Pegada al inicio del muro" : iman === "final" ? "Pegada al final del muro" : "Pegada a otra abertura"}</span>}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {numero("Desde el inicio (m)", a.desde, "desde")}
                      {numero("Ancho (m)", a.ancho, "ancho")}
                      {numero("Alto (m)", a.alto, "alto")}
                    </div>
                  </div>
                  {a.tipo === "ventana" ? (
                    <div className="space-y-2 border-t border-primary/15 pt-2">
                      <p className="text-[11px] font-semibold text-primary">¿A qué altura queda la ventana? (medida desde el piso)</p>
                      <input type="range" min={0} max={Math.max(0, techo - a.alto)} value={a.antepecho} onChange={(e) => cambiar({ antepecho: parseFloat(e.target.value) })} className="w-full h-8" aria-label="Altura de la ventana desde el piso" />
                      <div className="grid grid-cols-4 gap-2">
                        {[90, 100, 120, 140].map((h) => (
                          <button key={h} type="button" onClick={() => cambiar({ antepecho: h })} className={`py-2 rounded border text-xs font-semibold min-h-[44px] ${a.antepecho === h ? "bg-primary border-primary text-white" : "border-primary/40 text-white"}`}>{fm(h)} m</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {numero("Borde de ABAJO: del piso a… (m)", a.antepecho, "antepecho")}
                        <div>
                          <label className="block text-[11px] font-semibold text-primary mb-1">Borde de ARRIBA (m del piso)</label>
                          <div className="h-11 flex items-center px-3 rounded-md bg-white/5 text-white text-base">{fm(arriba)}</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">El techo está a {fm(techo)} m. Si cambias el «Alto» de la ventana, el borde de arriba se recalcula.</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 border-t border-primary/15 pt-2">La puerta arranca en el piso y llega a {fm(arriba)} m de alto.</p>
                  )}
                </div>
              );
            })}
          </Seccion>

          <Seccion titulo="2 · Paredes: ancho y alto" abierta={!!abiertas.paredes} onToggle={() => alternar("paredes")}
            resumen={letras.map((l, i) => `${l} ${fm(anchoMuroCm(lista[i]))}×${fm(lista[i]?.alto || techo)} m`).join("  ·  ")}>
            <p className="text-[11px] text-gray-400">Lo que mide cada muro (no los muebles). Si una pared no tiene alto propio, se usa el alto general.</p>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Alto general de la cocina — techo (m)</label>
              <InputM placeholder="2,40" valorCm={altoCm} onCm={(v) => onChange({ _cocina_alto: v })} className={inputCls} />
            </div>
            {letras.map((letra, i) => (
              <div key={letra} className={`rounded-lg border p-3 ${activa === i ? "border-primary bg-primary/10" : "border-primary/20 bg-background/40"}`} onClick={() => setActiva(i)}>
                <p className="text-sm font-bold text-white mb-2">Pared {letra}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Ancho de la pared (m)</label>
                    <InputM placeholder="0,00" valorCm={lista[i]?.ancho} onFocus={() => setActiva(i)}
                      onCm={(v) => { const nuevas = [...lista]; nuevas[i] = { ...(lista[i] || {}), ancho: v }; emitir(nuevas); }} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Alto de la pared (m)</label>
                    <InputM placeholder={fm(techo)} valorCm={lista[i]?.alto} onFocus={() => setActiva(i)}
                      onCm={(v) => { const nuevas = [...lista]; nuevas[i] = { ...(lista[i] || {}), alto: v }; emitir(nuevas); }} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </Seccion>

          <Seccion titulo="3 · Muebles: inferiores y superiores" abierta={!!abiertas.muebles} onToggle={() => alternar("muebles")}
            resumen={`Inferiores ${metros(tot.infM * 100)} m · Superiores ${metros(tot.supM * 100)} m`}>
            <p className="text-[11px] text-gray-400">Salen solos: el ancho de la pared menos el fondo del mueble que llega a la esquina (en L y en U). Si escribes una medida a mano, esa queda fija.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Fondo muebles inferiores (m)</label>
                <InputM placeholder="0,60" valorCm={medidas?._cocina_profundo ?? FONDO_INFERIOR_CM} onCm={(v) => emitir(lista, { _cocina_profundo: v })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Fondo muebles superiores (m)</label>
                <InputM placeholder="0,35" valorCm={medidas?._cocina_profundo_sup ?? FONDO_SUPERIOR_CM} onCm={(v) => emitir(lista, { _cocina_profundo_sup: v })} className={inputCls} />
              </div>
            </div>
            {esquinas.length > 0 && (
              <div className="rounded-lg border border-primary/25 bg-background/40 p-3 space-y-2">
                <p className="text-xs font-bold text-white">Esquinas: ¿cuál pared llega hasta la esquina?</p>
                <p className="text-[11px] text-gray-400">La que llega queda completa; la otra se acorta por el fondo de los muebles de la primera.</p>
                {esquinas.map(([a, b], k) => (
                  <div key={k} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-300">Esquina {letras[a]}–{letras[b]}:</span>
                    {[a, b].map((w) => (
                      <button key={w} type="button" onClick={() => { const nuevo = [...ganadoras]; nuevo[k] = w; emitir(lista, { _cocina_esquinas: nuevo }); }}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold min-h-[44px] ${ganadoras[k] === w ? "bg-primary border-primary text-white" : "border-primary/40 text-white"}`}>
                        Llega la pared {letras[w]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {letras.map((letra, i) => {
              const w = anchoMuroCm(lista[i]);
              const d = desc[i];
              const notaInf = [d.infIni > 0 ? `− ${fm(d.infIni)} (esquina al inicio)` : "", d.infFin > 0 ? `− ${fm(d.infFin)} (esquina al final)` : ""].filter(Boolean).join(" ");
              const notaSup = [d.supIni > 0 ? `− ${fm(d.supIni)}` : "", d.supFin > 0 ? `− ${fm(d.supFin)}` : ""].filter(Boolean).join(" ");
              return (
                <div key={letra} className={`rounded-lg border p-3 ${activa === i ? "border-primary bg-primary/10" : "border-primary/20 bg-background/40"}`} onClick={() => setActiva(i)}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-sm font-bold text-white">Pared {letra} {w > 0 && <span className="text-[11px] font-normal text-gray-400">· mide {fm(w)} m</span>}</p>
                    {(lista[i]?.infManual || lista[i]?.supManual) && w > 0 && (
                      <button type="button" className="text-[11px] px-2 py-1.5 rounded border border-primary/40 text-primary min-h-[36px]"
                        onClick={() => { const nuevas = [...lista]; nuevas[i] = { ...(lista[i] || {}), infManual: false, supManual: false }; emitir(nuevas); }}>
                        Volver a calcular solos
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-primary mb-1">Inferiores (m) {!lista[i]?.infManual && w > 0 && <span className="text-emerald-300 font-normal">· automático</span>}</label>
                      <InputM placeholder="0,00" valorCm={lista[i]?.inf} onFocus={() => setActiva(i)}
                        onCm={(v) => { const nuevas = [...lista]; nuevas[i] = setInferior(lista[i] || {}, v); emitir(nuevas); }} className={inputCls} />
                      {w > 0 && !lista[i]?.infManual && <p className="text-[10px] text-gray-400 mt-0.5">{fm(w)} {notaInf || "(sin descuento)"}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-primary mb-1">Superiores (m) {!lista[i]?.supManual && w > 0 && <span className="text-emerald-300 font-normal">· automático</span>}</label>
                      <InputM placeholder="0,00" valorCm={lista[i]?.sup} onFocus={() => setActiva(i)}
                        onCm={(v) => { const nuevas = [...lista]; nuevas[i] = setSuperior(lista[i] || {}, v); emitir(nuevas); }} className={inputCls} />
                      {w > 0 && !lista[i]?.supManual && <p className="text-[10px] text-gray-400 mt-0.5">{fm(w)} {notaSup || "(sin descuento)"}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary/15 border border-primary/40 p-3 text-center">
                <p className="text-[11px] text-gray-300">Total inferiores</p>
                <p className="text-xl font-bold text-white">{metros(tot.infM * 100)} m</p>
              </div>
              <div className="rounded-lg bg-primary/15 border border-primary/40 p-3 text-center">
                <p className="text-[11px] text-gray-300">Total superiores</p>
                <p className="text-xl font-bold text-white">{metros(tot.supM * 100)} m</p>
              </div>
            </div>
          </Seccion>

          <Seccion titulo="4 · Isla y barra" abierta={!!abiertas.isla} onToggle={() => alternar("isla")}
            resumen={[Number(medidas?._cocina_isla) > 0 ? `Isla ${fm(Number(medidas?._cocina_isla))} m` : "", Number(medidas?._cocina_barra) > 0 ? `Barra ${fm(Number(medidas?._cocina_barra))} m` : ""].filter(Boolean).join(" · ") || "sin isla ni barra"}>
            {([["_cocina_isla", "Isla"], ["_cocina_barra", "Barra"]] as const).map(([base, titulo]) => (
              <div key={base} className="rounded-lg border border-primary/25 bg-background/40 p-3 space-y-2">
                <p className="text-sm font-bold text-white">{titulo} <span className="text-[11px] font-normal text-gray-400">(déjala en blanco si no lleva)</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {([["", "Ancho (m)"], ["_profundo", "Profundidad (m)"], ["_alto", "Altura (m)"]] as const).map(([suf, label]) => (
                    <div key={suf}>
                      <label className="block text-xs font-semibold text-primary mb-1">{label}</label>
                      <InputM placeholder="0,00" valorCm={medidas?.[base + suf]} onCm={(v) => onChange({ [base + suf]: v })} className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Seccion>
          </div>
        </div>
      )}
    </div>
  );
}
