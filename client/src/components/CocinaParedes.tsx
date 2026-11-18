import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  FORMAS_COCINA, nombresParedes, normalizarParedes, setInferior, setSuperior, totalesParedes,
  type FormaCocina, type ParedCocina,
} from "@shared/cocinaParedes";

// Gráfico de la cocina según su forma (Línea, L, U, II) para escribir solo las medidas de cada pared.
// Pensado para la tablet del levantamiento: botones y campos grandes.

interface Props {
  forma?: string;
  paredes?: ParedCocina[];
  islaCm?: number;
  altoCm?: number;
  profundoCm?: number;
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

export function CocinaParedes({ forma, paredes, islaCm, altoCm, profundoCm, onChange }: Props) {
  const [activa, setActiva] = useState(0);
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
          <Grafico forma={forma as FormaCocina} activa={activa} onPick={setActiva} />
          <p className="text-[11px] text-gray-400 text-center">Toca una pared del dibujo o escribe las medidas de cada una (en cm). El superior copia al inferior; si es distinto, escríbelo.</p>

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

      {/* 3. Isla, alto y profundo */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Isla: largo (cm)</label>
          <Input type="number" inputMode="decimal" placeholder="0" value={islaCm ?? ""} onChange={(e) => onChange({ _cocina_isla: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Alto (cm)</label>
          <Input type="number" inputMode="decimal" placeholder="0" value={altoCm ?? ""} onChange={(e) => onChange({ _cocina_alto: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">Profundo (cm)</label>
          <Input type="number" inputMode="decimal" placeholder="0" value={profundoCm ?? ""} onChange={(e) => onChange({ _cocina_profundo: num(e.target.value) })} className="bg-background border-primary/30 text-white h-12 text-base" />
        </div>
      </div>
    </div>
  );
}
