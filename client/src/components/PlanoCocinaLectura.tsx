import { lazy, Suspense, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { FORMAS_COCINA, supNetoPorParedCm, descuentosEsquinas, FONDO_INFERIOR_CM, FONDO_SUPERIOR_CM, anchoMuroCm, nombresParedes, totalesParedes, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

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
  const supNeto = supNetoPorParedCm(forma, paredes, aberturas);
  const supTotalCm = supNeto.reduce((a, x) => a + x, 0);
  const ventSup = Math.max(0, t.supM * 100 - supTotalCm);
  const fondoInf = Number(m._cocina_profundo) || FONDO_INFERIOR_CM, fondoSup = Number(m._cocina_profundo_sup) || FONDO_SUPERIOR_CM;
  const esq: number[] | undefined = Array.isArray(m._cocina_esquinas) ? m._cocina_esquinas : undefined;
  const dsc = descuentosEsquinas(forma, paredes, fondoInf, fondoSup, esq);
  const techo = Number(m._cocina_alto) || 240;
  const metros = (x: number) => x.toFixed(2).replace(".", ",");
  const fm = (cm: number) => metros((Number(cm) || 0) / 100);
  const pieza = (base: string, titulo: string) => (Number(m[base]) > 0
    ? <div key={base} className="flex justify-between gap-3"><span className="text-gray-400">{titulo}</span><span className="text-white font-medium text-right">{fm(m[base])} m de ancho · {fm(m[base + "_profundo"] || 0)} de profundo · {fm(m[base + "_alto"] || 0)} de alto</span></div>
    : null);

  // En pantalla completa la vista se saca del contenedor (portal al body): dentro de una ventana emergente (la cotización) un «fixed»
  // queda pegado a la ventana y no a la pantalla, y se veía diminuto en el computador.
  const envolver = (nodo: ReactElement) => grande
    ? createPortal(<div data-pantalla-completa="1" style={{ pointerEvents: "auto" }}>{nodo}</div>, document.body)
    : nodo;
  return envolver(
    <div className={grande ? "fixed inset-0 z-[60] bg-background flex flex-col [@media(orientation:landscape)]:flex-row" : "space-y-3"}>
      <div className={grande ? "shrink-0 h-[46dvh] [@media(orientation:landscape)]:h-full [@media(orientation:landscape)]:w-[56%] flex flex-col gap-2 p-3 border-b [@media(orientation:landscape)]:border-b-0 [@media(orientation:landscape)]:border-r border-primary/30" : "space-y-3"}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">Cocina {FORMAS_COCINA.find((f) => f.key === forma)?.label ?? forma}</p>
        {!sin3D && (
          <button type="button" onClick={() => setGrande((v) => !v)} className="text-sm font-medium px-3 py-2 rounded-lg border border-primary/40 text-primary flex items-center gap-1.5 min-h-[44px]">
            {grande ? <><X className="h-4 w-4" /> Cerrar</> : <><Maximize2 className="h-4 w-4" /> Pantalla completa</>}
          </button>
        )}
      </div>
      <div className={grande ? "flex-1 min-h-0" : ""}>
      {!sin3D && forma && (
        <Suspense fallback={<div className="h-[300px] rounded-lg bg-black/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">Cargando vista 3D…</div>}>
          <Habitacion3D forma={forma} paredes={paredes} separacionCm={Number(m._cocina_separacion) || undefined} altoCm={Number(m._cocina_alto) || undefined}
            aberturas={aberturas} activa={-1} onFalla={() => setSin3D(true)} altura={grande ? "100%" : 300}
            profundoCm={fondoInf} profundoSupCm={fondoSup} esquinas={esq}
            isla={Number(m._cocina_isla) > 0 ? { ancho: Number(m._cocina_isla), profundo: Number(m._cocina_isla_profundo) || 0, alto: Number(m._cocina_isla_alto) || 0 } : null}
            barra={Number(m._cocina_barra) > 0 ? { ancho: Number(m._cocina_barra), profundo: Number(m._cocina_barra_profundo) || 0, alto: Number(m._cocina_barra_alto) || 0 } : null} />
        </Suspense>
      )}
      </div>
      </div>
      <div className={grande ? "flex-1 min-h-0 overflow-y-auto p-3 space-y-1 text-sm" : "space-y-1 text-sm"}>
        <div className="grid grid-cols-5 gap-2 text-[11px] text-gray-400 font-semibold border-b border-primary/20 pb-1">
          <span>Pared</span><span>Ancho</span><span>Alto</span><span>Inferiores</span><span>Superiores</span>
        </div>
        {letras.map((l, i) => (
          <div key={l} className="grid grid-cols-5 gap-2 text-white">
            <span className="font-bold">{l}</span>
            <span>{fm(anchoMuroCm(paredes[i]))} m</span>
            <span>{fm(paredes[i]?.alto || techo)} m</span>
            <span>{fm(paredes[i]?.inf ?? anchoMuroCm(paredes[i]))} m{(dsc[i]?.infIni + dsc[i]?.infFin) > 0 && <span className="block text-[10px] text-gray-400">mesón − {fm(dsc[i].infIni + dsc[i].infFin)} esquina</span>}</span>
            <span>{fm(supNeto[i] ?? 0)} m{(anchoMuroCm(paredes[i]) - (supNeto[i] ?? 0)) > 0.5 && !paredes[i]?.supManual && <span className="block text-[10px] text-gray-400">− {fm(anchoMuroCm(paredes[i]) - supNeto[i])} ventana</span>}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 border-t border-primary/20"><span className="text-gray-400">Total de muebles</span><span className="text-white font-semibold">inferiores {metros(t.infM)} m · superiores {metros(supTotalCm / 100)} m{ventSup > 0 ? ` (− ${metros(ventSup / 100)} de ventanas)` : ""}</span></div>
        {pieza("_cocina_isla", "Isla")}
        {pieza("_cocina_barra", "Barra")}
        {Number(m._cocina_profundo) > 0 && <div className="flex justify-between"><span className="text-gray-400">Profundo de los muebles</span><span className="text-white font-medium">{fm(m._cocina_profundo)} m</span></div>}
        {aberturas.map((a) => (
          <div key={a.id} className="flex justify-between gap-3">
            <span className="text-gray-400">{a.tipo === "ventana" ? "Ventana" : "Puerta"} · pared {letras[a.pared] ?? a.pared + 1}</span>
            <span className="text-white font-medium text-right">a {fm(a.desde)} m del inicio · {fm(a.ancho)}×{fm(a.alto)} m{a.tipo === "ventana" ? ` · desde ${fm(a.antepecho)} m del piso` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
