import { Flame, User, MapPin } from "lucide-react";

// Tarjetas "El rancho ardiendo": proyectos que están en diseño y que el jefe de taller debe ir preparando.
// Titilan para llamar la atención. Se usan en Inicio y en Proyectos (misma fuente de datos: projects.list).
export const RANCHO_STATUSES = ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "aprobacion_final"];

const TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export function RanchoArdiendoCards({ projects }: { projects: any[] }) {
  const list = (projects || []).filter((p: any) => RANCHO_STATUSES.includes(p.status) && !p.isArchived);
  if (list.length === 0) return null;
  return (
    <div className="mb-6">
      <style>{`
        @keyframes ranchoBlink {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(251,146,60,0); }
          50% { opacity: .55; box-shadow: 0 0 24px 6px rgba(251,146,60,.7); }
        }
        .rancho-blink { animation: ranchoBlink 1.1s ease-in-out infinite; }
      `}</style>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-semibold text-orange-400 uppercase tracking-wide">Próximos trabajos</span>
        <span className="text-xs text-white/40 ml-1">— en diseño</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {list.map((project: any) => {
          const typeLabel = TYPE_LABELS[project.workType] ?? project.workType;
          return (
            <div
              key={project.id}
              className="rancho-blink rounded-xl border-2 p-4 min-w-[220px] max-w-[260px]"
              style={{ borderColor: "#fb923c", background: "rgba(251,146,60,0.10)" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">El rancho ardiendo</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Nuevo {typeLabel}</p>
              {project.client?.name && (
                <p className="flex items-center gap-1 text-xs text-white/60 mb-1">
                  <User className="h-3 w-3 shrink-0" />{project.client.name}
                </p>
              )}
              {project.client?.address && (
                <p className="flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3 w-3 shrink-0" />{project.client.address}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
