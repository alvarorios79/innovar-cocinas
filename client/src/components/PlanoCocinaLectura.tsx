import { lazy, Suspense, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { FORMAS_COCINA, anchoMuroCm, nombresParedes, totalesParedes, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

const Habitacion3D = lazy(() => import("./Habitacion3D"));

// Cómo recibe el levantamiento quien lo trabaja (medidor, comercial, administrador, diseñador): el dibujo 3D (solo para mirar y girar)
// y las medidas escritas de cada pared, ventana, puerta, isla y barra.
export function PlanoCocinaLectura({ measurements }: { measurements: Record<string, any> }) {
  const [grande, setGrande] = useState(false);
  const [sin3D, setSin3D] = useState(false);
  const m = measurements || {};
  const forma = m._cocina_forma as string | undefined;
  const paredes: ParedCocina[] = Array.isArray(m._cocina_paredes) ? m._cocina_paredes : [];
  const aberturas: AberturaCocina[] = Array.isArray(m._cocina_aberturas) ? m._cocina_aberturas : [];
  const letras = nombresParedes(forma);
  const t = totalesParedes(paredes);
  const techo = Number(m._cocina_alto) || 240;
  const metros = (x: number) => x.toFixed(2).replace(".", ",");
  const pieza = (base: string, titulo: string) => (Number(m[base]) > 0
    ? <div key={base} className="flex justify-between gap-3"><span className="text-gray-400">{titulo}</span><span className="text-white font-medium text-right">{m[base]} cm de ancho · {m[base + "_profundo"] || 0} de profundo · {m[base + "_alto"] || 0} de alto</span></div>
    : null);

  return (
    <div className={grande ? "fixed inset-0 z-[60] bg-background overflow-y-auto p-3 space-y-3" : "space-y-3"}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">Cocina {FORMAS_COCINA.find((f) => f.key === forma)?.label ?? forma}</p>
        {!sin3D && (
          <button type="button" onClick={() => setGrande((v) => !v)} className="text-sm font-medium px-3 py-2 rounded-lg border border-primary/40 text-primary flex items-center gap-1.5 min-h-[44px]">
            {grande ? <><X className="h-4 w-4" /> Cerrar</> : <><Maximize2 className="h-4 w-4" /> Pantalla completa</>}
          </button>
        )}
      </div>
      {!sin3D && forma && (
        <Suspense fallback={<div className="h-[300px] rounded-lg bg-black/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">Cargando vista 3D…</div>}>
          <Habitacion3D forma={forma} paredes={paredes} separacionCm={Number(m._cocina_separacion) || undefined} altoCm={Number(m._cocina_alto) || undefined}
            aberturas={aberturas} activa={-1} onFalla={() => setSin3D(true)} altura={grande ? "60vh" : 300} />
        </Suspense>
      )}
      <div className="space-y-1 text-sm">
        <div className="grid grid-cols-5 gap-2 text-[11px] text-gray-400 font-semibold border-b border-primary/20 pb-1">
          <span>Pared</span><span>Ancho</span><span>Alto</span><span>Inferiores</span><span>Superiores</span>
        </div>
        {letras.map((l, i) => (
          <div key={l} className="grid grid-cols-5 gap-2 text-white">
            <span className="font-bold">{l}</span>
            <span>{anchoMuroCm(paredes[i]) || "—"} cm</span>
            <span>{paredes[i]?.alto || techo} cm</span>
            <span>{paredes[i]?.inf ?? 0} cm</span>
            <span>{paredes[i]?.sup ?? 0} cm</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 border-t border-primary/20"><span className="text-gray-400">Total de muebles</span><span className="text-white font-semibold">inferiores {metros(t.infM)} m · superiores {metros(t.supM)} m</span></div>
        {pieza("_cocina_isla", "Isla")}
        {pieza("_cocina_barra", "Barra")}
        {Number(m._cocina_profundo) > 0 && <div className="flex justify-between"><span className="text-gray-400">Profundo de los muebles</span><span className="text-white font-medium">{m._cocina_profundo} cm</span></div>}
        {aberturas.map((a) => (
          <div key={a.id} className="flex justify-between gap-3">
            <span className="text-gray-400">{a.tipo === "ventana" ? "Ventana" : "Puerta"} · pared {letras[a.pared] ?? a.pared + 1}</span>
            <span className="text-white font-medium text-right">a {Math.round(a.desde)} cm del inicio · {a.ancho}×{a.alto} cm{a.tipo === "ventana" ? ` · desde ${a.antepecho} cm del piso` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
