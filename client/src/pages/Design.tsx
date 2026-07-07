import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Paintbrush, ExternalLink, Play, ThumbsUp, ThumbsDown,
  Clock, RefreshCw, User, CheckCircle, AlertCircle, Sparkles,
  Calendar, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ── Etapas del pipeline ───────────────────────────────────────────────────────
const DESIGN_STAGES = [
  {
    key: "adelanto_recibido",
    label: "Por Iniciar",
    icon: Sparkles,
    color: "#6366F1",
    gradient: "from-indigo-600 to-violet-600",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.25)",
    description: "Adelanto recibido, esperando inicio",
  },
  {
    key: "en_diseno",
    label: "En Diseño",
    icon: Paintbrush,
    color: "#8B5CF6",
    gradient: "from-purple-600 to-fuchsia-600",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
    description: "Modelado 3D en progreso",
    extraKeys: ["pendiente_modelado"],
  },
  {
    key: "pendiente_render",
    label: "Renders",
    icon: AlertCircle,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-500",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    description: "Esperando aprobación del cliente",
  },
  {
    key: "aprobacion_final",
    label: "Aprobado",
    icon: CheckCircle,
    color: "#10B981",
    gradient: "from-emerald-500 to-teal-500",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    description: "Listo para producción",
  },
] as const;

const DESIGN_STATUS_KEYS = [
  "adelanto_recibido",
  "en_diseno",
  "pendiente_modelado",
  "pendiente_render",
  "aprobacion_final",
] as const;

const WORK_TYPE_LABELS: Record<string, string> = {
  cocina:    "Cocina",
  closet:    "Closet",
  puertas:   "Puertas",
  centro_tv: "Centro TV",
  baño:      "Baño",
  escalera:  "Escalera",
};

type Project = {
  id: number;
  name: string;
  status: string;
  workType: string;
  clientId: number;
  client?: { name: string; whatsappPhone: string } | null;
  createdAt: string;
  designerId?: number | null;
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function Design() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isDesigner = user?.role === "disenador";
  const isAdmin    = user?.role === "super_admin" || user?.role === "admin";
  const canApprove = isAdmin;
  const canStart   = isDesigner || isAdmin;

  const { data: projects = [], isLoading, refetch } =
    trpc.projects.list.useQuery(undefined, { refetchInterval: 60_000 });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.approved ? "✅ Diseño aprobado" : "🔄 Diseño rechazado — vuelve a diseño");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const designProjects = (projects as Project[]).filter((p) =>
    (DESIGN_STATUS_KEYS as readonly string[]).includes(p.status)
  );

  const byStage = (stage: typeof DESIGN_STAGES[number]) => {
    const keys = [stage.key, ...((stage as any).extraKeys ?? [])];
    return designProjects.filter((p) => keys.includes(p.status));
  };

  const startDesign = (projectId: number) =>
    updateStatus.mutate({ projectId, newStatus: "en_diseno" });

  const approve = (projectId: number, approved: boolean) =>
    approveDesign.mutate({ projectId, approved });

  const isPending = updateStatus.isPending || approveDesign.isPending;

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <PageHeader
        title="Pipeline de Diseño"
        icon={<Paintbrush className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 text-white/50 hover:text-white/80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        }
      />

      {/* ── KPI counters ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DESIGN_STAGES.map((stage) => {
          const count = byStage(stage).length;
          const Icon  = stage.icon;
          return (
            <div
              key={stage.key}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                background: `linear-gradient(135deg, ${stage.bg}, rgba(22,40,40,0.9))`,
                border: `1px solid ${stage.border}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${stage.color}20` }}
                >
                  <Icon className="h-4 w-4" style={{ color: stage.color }} />
                </div>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: stage.color }}
                >
                  {count}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{stage.label}</p>
                <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total badge */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(29,181,168,0.08)",
            border: "1px solid rgba(29,181,168,0.2)",
            color: "#1DB5A8",
          }}
        >
          <Calendar className="h-3.5 w-3.5" />
          {designProjects.length} proyecto{designProjects.length !== 1 ? "s" : ""} en fase de diseño
        </div>
      </div>

      {/* ── Pipeline ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : designProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(29,181,168,0.08)", border: "1px solid rgba(29,181,168,0.15)" }}
          >
            <Paintbrush className="h-8 w-8 text-teal-400 opacity-50" />
          </div>
          <p className="text-white/40 text-sm">No hay proyectos en fase de diseño</p>
          <p className="text-white/25 text-xs mt-1">Los proyectos aparecen aquí cuando reciben adelanto</p>
        </div>
      ) : (
        <div className="space-y-8">
          {DESIGN_STAGES.map((stage) => {
            const stageProjects = byStage(stage);
            if (stageProjects.length === 0) return null;
            const Icon = stage.icon;

            return (
              <section key={stage.key}>
                {/* Encabezado de sección */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="flex items-center justify-center h-7 w-7 rounded-lg"
                    style={{ background: `${stage.color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: stage.color }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: stage.color }}>
                    {stage.label}
                  </span>
                  <span
                    className="h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: stage.color }}
                  >
                    {stageProjects.length}
                  </span>
                  <span className="text-xs text-white/25 hidden sm:block">
                    — {stage.description}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="space-y-2">
                  {stageProjects.map((project) => (
                    <DesignCard
                      key={project.id}
                      project={project}
                      stage={stage}
                      canStart={canStart}
                      canApprove={canApprove}
                      isPending={isPending}
                      onStart={() => startDesign(project.id)}
                      onApprove={() => approve(project.id, true)}
                      onReject={() => approve(project.id, false)}
                      onOpen={() => setLocation(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DesignCard ────────────────────────────────────────────────────────────────
function DesignCard({
  project, stage, canStart, canApprove, isPending,
  onStart, onApprove, onReject, onOpen,
}: {
  project: Project;
  stage: typeof DESIGN_STAGES[number];
  canStart: boolean;
  canApprove: boolean;
  isPending: boolean;
  onStart: () => void;
  onApprove: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const typeLabel = WORK_TYPE_LABELS[project.workType] ?? project.workType;

  const daysSince = Math.floor(
    (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysSince > 3;

  return (
    <div
      className="rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer transition-all hover:translate-x-0.5"
      style={{
        background: "#162828",
        border: `1px solid ${stage.border}`,
        borderLeft: `3px solid ${stage.color}`,
      }}
      onClick={onOpen}
    >
      {/* Color accent strip */}
      <div
        className="hidden sm:flex h-9 w-9 rounded-lg items-center justify-center shrink-0"
        style={{ background: `${stage.color}12` }}
      >
        <stage.icon className="h-4 w-4" style={{ color: stage.color }} />
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold text-white/90 truncate">{project.name}</p>
          <Badge
            className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium"
            style={{
              background: `${stage.color}15`,
              color: stage.color,
              border: `1px solid ${stage.color}30`,
            }}
          >
            {typeLabel}
          </Badge>
          {isUrgent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
              ⚡ {daysSince}d
            </Badge>
          )}
        </div>
        {project.client && (
          <p className="flex items-center gap-1 text-xs text-white/35">
            <User className="h-3 w-3 shrink-0" />
            {project.client.name}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ver proyecto */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          className="h-7 w-7 p-0 text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
          title="Ver proyecto"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>

        {/* Iniciar diseño */}
        {project.status === "adelanto_recibido" && canStart && (
          <Button
            size="sm"
            onClick={onStart}
            disabled={isPending}
            className="h-7 px-3 text-xs text-white gap-1 border-0"
            style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
          >
            <Play className="h-3 w-3" />
            Iniciar
          </Button>
        )}

        {/* Aprobar / Rechazar */}
        {canApprove &&
          ["en_diseno", "pendiente_modelado", "pendiente_render"].includes(project.status) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                disabled={isPending}
                className="h-7 px-2 text-red-400 border-red-500/25 hover:bg-red-500/10 hover:border-red-500/40"
                title="Rechazar — vuelve a diseño"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isPending}
                className="h-7 px-3 text-xs text-white gap-1 bg-emerald-600 hover:bg-emerald-500 border-0"
                title="Aprobar diseño"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                OK
              </Button>
            </>
          )}
      </div>
    </div>
  );
}
