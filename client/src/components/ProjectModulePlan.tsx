import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { PlanSchemeView } from "@/components/PlanSchemeView";

// Plano de módulos de la cocina del proyecto (solo lectura) para el diseñador, el jefe de taller y el equipo.
// Sale de la cotización del proyecto: dibujo con medidas, ventanas, qué va pintado, laterales y módulos de piso a techo.
export function ProjectModulePlan({ projectId, defaultOpen = true }: { projectId: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = trpc.projects.getModulePlans.useQuery({ projectId }, { enabled: !!projectId, staleTime: 30000 });
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Card style={{ background: "#162828", border: "1px solid rgba(255,255,255,0.08)" }}>
      <CardHeader className="py-3 bg-teal-500/10 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-teal-300" />
          Plano de módulos de la cocina
          <span className="ml-auto text-white/50">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="pt-4 space-y-6">
          {data.map((p: any, i: number) => (
            <div key={i} className="space-y-3">
              <p className="text-sm font-semibold text-white/90">
                {p.scheme.title}{p.scheme.layout ? <span className="font-normal text-white/50"> · cocina {p.scheme.layout}</span> : null}
              </p>
              <PlanSchemeView scheme={p.scheme} showPaint />
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/55">
                <span>🎨 va pintado</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-3 rounded-sm border border-dashed border-white/50" /> borde punteado = sin pintar</span>
                <span>🔒 ubicación bloqueada (ventana)</span>
                <span>Medidas en metros</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded bg-black/20 p-3 text-xs text-white/75 space-y-1">
                  <p className="font-semibold text-white/85">Módulos del proyecto</p>
                  {p.scheme.modules.map((m: any, k: number) => (
                    <p key={k}>• {m.qty > 1 ? `${m.qty} × ` : ""}{m.label} <span className="text-white/40">({m.widths.map((w: number) => w.toFixed(2)).join(" + ")} m)</span></p>
                  ))}
                </div>
                {p.scheme.pieces.length > 0 && (
                  <div className="rounded bg-black/20 p-3 text-xs text-white/75 space-y-1">
                    <p className="font-semibold text-pink-200">Piezas a pintar (alto brillo)</p>
                    {p.scheme.pieces.map((x: any, k: number) => (
                      <p key={k} className="flex justify-between"><span>{x.label}</span><span className="font-mono text-pink-200">{x.n}</span></p>
                    ))}
                  </div>
                )}
              </div>
              {p.scheme.warnings.length > 0 && (
                <div className="rounded border border-yellow-500/30 bg-yellow-900/10 p-2 text-[11px] text-yellow-200 space-y-0.5">
                  {p.scheme.warnings.map((w: string, k: number) => <p key={k}>⚠️ {w}</p>)}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
