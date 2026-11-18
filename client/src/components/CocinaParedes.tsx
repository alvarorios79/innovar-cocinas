import { lazy, Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  FORMAS_COCINA, nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes, ajustarAbertura, imantarDesde, estadoIman,
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

const metros = (cm: number) => (cm / 100).toFixed(2).replace(".", ",");

export function CocinaParedes({ forma, paredes, medidas, altoCm, profundoCm, separacionCm, aberturas, onChange }: Props) {
  const [activa, setActiva] = useState(0);
  const [sin3D, setSin3D] = useState(false); // si el equipo no puede dibujar 3D se muestra el dibujo plano de siempre
  const lista0 = aberturas || [];
  const lista = normalizarParedes(forma, paredes);
  const letras = nombresParedes(forma);
  const tot = totalesParedes(lista);
  const num = (v: string) => (v === "" ? undefined : Math.max(0, parseFloat(v)));

  const emitir = (nuevas: ParedCocina[], extra: Record<string, any> = {}) => {
    const t = totalesParedes(nuevas);
    onChange({
      _cocina_paredes: nuevas,
      // el «ancho» antiguo sigue existiendo: es el total de muebles inferiores (para pantallas viejas)
      _cocina_ancho: t.infM > 0 ? Math.round(t.infM * 100) : undefined,
      ...extra,
    });
  };

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
      </div>

      {/* 2. Gráfico + medidas de cada pared */}
      {forma && (
        <>
          {sin3D ? (
            <Grafico forma={forma as FormaCocina} activa={activa} onPick={setActiva} />
          ) : (
            <Suspense fallback={<div className="h-[300px] rounded-lg bg-black/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">Cargando vista 3D…</div>}>
              <Habitacion3D
                forma={forma}
                paredes={lista}
                separacionCm={separacionCm}
                altoCm={altoCm}
                aberturas={lista0}
                activa={activa}
                onPickPared={setActiva}
                onFalla={() => setSin3D(true)}
              />
            </Suspense>
          )}
          <p className="text-[11px] text-gray-400 text-center">Escribe las medidas de cada pared (en cm). El superior copia al inferior; si es distinto, escríbelo.</p>

          <div className="space-y-2">
            {letras.map((letra, i) => (
              <div key={letra} className={`rounded-lg border p-3 ${activa === i ? "border-primary bg-primary/10" : "border-primary/20 bg-background/40"}`} onClick={() => setActiva(i)}>
                <p className="text-sm font-bold text-white mb-2">Pared {letra}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Inferiores (cm)</label>
                    <Input
                      type="number" inputMode="decimal" placeholder="0"
                      value={lista[i]?.inf ?? ""}
                      onFocus={() => setActiva(i)}
                      onChange={(e) => { const nuevas = [...lista]; nuevas[i] = setInferior(lista[i] || {}, num(e.target.value)); emitir(nuevas); }}
                      className="bg-background border-primary/30 text-white h-12 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Superiores (cm)</label>
                    <Input
                      type="number" inputMode="decimal" placeholder="0"
                      value={lista[i]?.sup ?? ""}
                      onFocus={() => setActiva(i)}
                      onChange={(e) => { const nuevas = [...lista]; nuevas[i] = setSuperior(lista[i] || {}, num(e.target.value)); emitir(nuevas); }}
                      className="bg-background border-primary/30 text-white h-12 text-base"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
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
        </>
      )}

      {/* Paralela: distancia entre las dos paredes */}
      {forma === "Paralela" && (
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Distancia entre las dos paredes (cm)</label>
          <Input type="number" inputMode="decimal" placeholder={String(SEPARACION_PARALELA_POR_DEFECTO)} value={separacionCm ?? ""} onChange={(e) => onChange({ _cocina_separacion: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
      )}

      {/* Ventanas y puertas (se ven en el dibujo 3D) */}
      {forma && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">Ventanas y puertas</p>
            <div className="flex gap-2">
              {(["ventana", "puerta"] as const).map((tipo) => (
                <button key={tipo} type="button" className="px-3 py-2 rounded-lg border border-primary/40 text-xs font-bold text-primary min-h-[40px]"
                  onClick={() => {
                    const base = ABERTURA_POR_DEFECTO[tipo];
                    const nueva: AberturaCocina = { id: Math.random().toString(36).slice(2, 8), tipo, pared: Math.min(activa, Math.max(0, letras.length - 1)), desde: 20, ...base };
                    onChange({ _cocina_aberturas: [...lista0, ajustarAbertura(nueva, Math.max(lista[nueva.pared]?.inf ?? 0, lista[nueva.pared]?.sup ?? 0), altoCm || ALTO_COCINA_POR_DEFECTO)] });
                  }}>
                  + {tipo === "ventana" ? "Ventana" : "Puerta"}
                </button>
              ))}
            </div>
          </div>
          {lista0.length === 0 && <p className="text-[11px] text-gray-400">Si la cocina tiene ventanas o puertas en estas paredes, agrégalas para ver la distribución real.</p>}
          {lista0.map((a, idx) => {
            const largoCm = Math.max(lista[a.pared]?.inf ?? 0, lista[a.pared]?.sup ?? 0);
            const techo = altoCm || ALTO_COCINA_POR_DEFECTO;
            const otras = lista0.filter((_, i) => i !== idx);
            const cambiar = (c: Partial<AberturaCocina>) => {
              const copia = [...lista0];
              const par = c.pared ?? a.pared;
              copia[idx] = ajustarAbertura({ ...a, ...c }, Math.max(lista[par]?.inf ?? 0, lista[par]?.sup ?? 0), techo);
              onChange({ _cocina_aberturas: copia });
            };
            // El deslizador y los botones usan el imán; los números escritos a mano quedan exactos
            const mover = (desde: number) => cambiar({ desde: imantarDesde(a, desde, largoCm, otras) });
            const iman = estadoIman(a, largoCm, otras);
            const numero = (label: string, valor: number, clave: "desde" | "ancho" | "alto" | "antepecho") => (
              <div key={clave}>
                <label className="block text-[11px] font-semibold text-primary mb-1">{label}</label>
                <Input type="number" inputMode="decimal" value={valor} onChange={(e) => cambiar({ [clave]: parseFloat(e.target.value) || 0 } as any)} className="bg-background border-primary/30 text-white h-11 text-base" />
              </div>
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

                {/* Posición a lo largo de la pared, con imán */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-primary">Posición en la pared {largoCm > 0 ? `(la pared mide ${largoCm} cm)` : "(escribe primero la medida de la pared)"}</p>
                  {largoCm > 0 && (
                    <>
                      <input type="range" min={0} max={Math.max(0, largoCm - a.ancho)} value={a.desde} onChange={(e) => mover(parseFloat(e.target.value))} className="w-full h-8" aria-label="Mover a lo largo de la pared" />
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => cambiar({ desde: 0 })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[40px]">⇤ Pegar al inicio</button>
                        <button type="button" onClick={() => cambiar({ desde: Math.round((largoCm - a.ancho) / 2) })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[40px]">Centrar</button>
                        <button type="button" onClick={() => cambiar({ desde: Math.max(0, largoCm - a.ancho) })} className="py-2 rounded border border-primary/40 text-xs font-semibold text-white min-h-[40px]">Pegar al final ⇥</button>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        Queda a <b>{Math.round(a.desde)} cm</b> del inicio y a <b>{Math.max(0, Math.round(largoCm - a.desde - a.ancho))} cm</b> del final.
                        {iman && <span className="ml-1 text-primary font-semibold">🧲 {iman === "inicio" ? "Pegada al inicio del muro" : iman === "final" ? "Pegada al final del muro" : "Pegada a otra abertura"}</span>}
                      </p>
                    </>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {numero("Desde el inicio (cm)", a.desde, "desde")}
                    {numero("Ancho (cm)", a.ancho, "ancho")}
                    {numero("Alto (cm)", a.alto, "alto")}
                  </div>
                </div>

                {/* Altura: a qué altura del piso queda */}
                {a.tipo === "ventana" ? (
                  <div className="space-y-2 border-t border-primary/15 pt-2">
                    <p className="text-[11px] font-semibold text-primary">¿A qué altura queda la ventana? (medida desde el piso)</p>
                    <input type="range" min={0} max={Math.max(0, techo - a.alto)} value={a.antepecho} onChange={(e) => cambiar({ antepecho: parseFloat(e.target.value) })} className="w-full h-8" aria-label="Altura de la ventana desde el piso" />
                    <div className="grid grid-cols-4 gap-2">
                      {[90, 100, 120, 140].map((h) => (
                        <button key={h} type="button" onClick={() => cambiar({ antepecho: h })} className={`py-2 rounded border text-xs font-semibold min-h-[40px] ${a.antepecho === h ? "bg-primary border-primary text-white" : "border-primary/40 text-white"}`}>{h} cm</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {numero("Borde de ABAJO: del piso a… (cm)", a.antepecho, "antepecho")}
                      <div>
                        <label className="block text-[11px] font-semibold text-primary mb-1">Borde de ARRIBA (cm del piso)</label>
                        <div className="h-11 flex items-center px-3 rounded-md bg-white/5 text-white text-base">{Math.round(arriba)}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">El techo está a {techo} cm. Si cambias el «Alto» de la ventana, el borde de arriba se recalcula.</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 border-t border-primary/15 pt-2">La puerta arranca en el piso y llega a {Math.round(arriba)} cm de alto.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Alto de la cocina y profundo de los muebles */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Alto de la cocina — techo (cm)</label>
          <Input type="number" inputMode="decimal" placeholder="240" value={altoCm ?? ""} onChange={(e) => onChange({ _cocina_alto: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Profundo de los muebles (cm)</label>
          <Input type="number" inputMode="decimal" placeholder="0" value={profundoCm ?? ""} onChange={(e) => onChange({ _cocina_profundo: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
      </div>

      {/* 4. Isla y barra: ancho, profundidad y altura de cada una (se llevan a la cotización) */}
      {([["_cocina_isla", "Isla"], ["_cocina_barra", "Barra"]] as const).map(([base, titulo]) => (
        <div key={base} className="rounded-lg border border-primary/25 bg-background/40 p-3 space-y-2">
          <p className="text-sm font-bold text-white">{titulo} <span className="text-[11px] font-normal text-gray-400">(déjala en blanco si no lleva)</span></p>
          <div className="grid grid-cols-3 gap-3">
            {([["", "Ancho (cm)"], ["_profundo", "Profundidad (cm)"], ["_alto", "Altura (cm)"]] as const).map(([suf, label]) => (
              <div key={suf}>
                <label className="block text-xs font-semibold text-primary mb-1">{label}</label>
                <Input type="number" inputMode="decimal" placeholder="0" value={medidas?.[base + suf] ?? ""} onChange={(e) => onChange({ [base + suf]: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
