import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Paintbrush, ExternalLink, Play, ThumbsUp, ThumbsDown,
  Clock, RefreshCw, User, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ── Columnas del pipeline de diseño ──────────────────────────────────────────
const DESIGN_STAGES = [
  {
    key: "adelanto_recibido",
    label: "Por Iniciar",
    icon: Clock,
    color: "#6366F1",
    bg: "rgba(99,102,241,0.07)",
    description: "Adelanto recibido, esperando inicio de diseño",
  },
  {
    key: "en_diseno",
    label: "En Diseño",
    icon: Paintbrush,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.07)",
    description: "Modelado 3D en progreso / pendiente aprobación",
    extraKeys: ["pendiente_modelado"],
  },
  {
    key: "pendiente_render",
    label: "Renders",
    icon: AlertCircle,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.07)",
    description: "Renders en proceso / esperando aprobación del cliente",
  },
  {
    key: "aprobacion_final",
    label: "Aprobado",
    icon: CheckCircle,
    color: "#10B981",
    bg: "rgba(16,185,129,0.07)",
    description: "Diseño aprobado — listo para pasar a producción",
  },
] as const;

type DesignStageKey = typeof DESIGN_STAGES[number]["key"];

const DESIGN_STATUS_KEYS = [
  "adelanto_recibido",
  "en_diseno",
  "pendiente_modelado",
  "pendiente_render",
  "aprobacion_final",
] as const;

const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro TV",
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
  const isAdmin =
    user?.role === "super_admin" ||
    user?.role === "admin";
  const canApprove = isAdmin;
  const canStart = isDesigner || isAdmin;

  const { data: projects = [], isLoading, refetch } =
    trpc.projects.list.useQuery(undefined, { refetchInterval: 60_000 });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.approved ? "Diseño aprobado" : "Diseño rechazado — vuelve a diseño");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Solo proyectos en etapas de diseño
  const designProjects = (projects as Project[]).filter((p) =>
    (DESIGN_STATUS_KEYS as readonly string[]).includes(p.status)
  );

  const byStage = (stage: typeof DESIGN_STAGES[number]) => {
    const keys = [stage.key, ...((stage as any).extraKeys ?? [])];
    return designProjects.filter((p) => keys.includes(p.status));
  };

  const startDesign = (projectId: number) => {
    updateStatus.mutate({ projectId, newStatus: "en_diseno" });
  };

  const approve = (projectId: number, approved: boolean) => {
    approveDesign.mutate({ projectId, approved });
  };

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Diseño"
        icon={<Paintbrush className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        }
      />

      {/* Contadores rápidos */}
      <div className="flex flex-wrap gap-2 mb-5">
        {DESIGN_STAGES.map((s) => {
          const count = byStage(s).length;
          return (
            <div
              key={s.key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                background: s.bg,
                borderColor: `${s.color}30`,
                color: s.color,
              }}
            >
              <span>{s.label}</span>
              <span
                className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: s.color }}
              >
                {count}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] text-white/55 border border-white/[0.08]">
          Total en diseño:
          <strong>{designProjects.length}</strong>
        </div>
      </div>

      {/* Pipeline por secciones */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : designProjects.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Paintbrush className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay proyectos en la fase de diseño</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DESIGN_STAGES.map((stage) => {
            const stageProjects = byStage(stage);
            if (stageProjects.length === 0) return null;
            const Icon = stage.icon;

            return (
              <div key={stage.key}>
                {/* Encabezado de sección */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex items-center justify-center h-6 w-6 rounded-md"
                    style={{ background: `${stage.color}18` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: stage.color }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: stage.color }}>
                    {stage.label}
                  </span>
                  <Badge
                    className="text-[10px] h-4 px-1.5 text-white"
                    style={{ background: stage.color }}
                  >
                    {stageProjects.length}
                  </Badge>
                  <span className="text-xs text-white/30 ml-1">{stage.description}</span>
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
                      isPending={updateStatus.isPending || approveDesign.isPending}
                      onStart={() => startDesign(project.id)}
                      onApprove={() => approve(project.id, true)}
                      onReject={() => approve(project.id, false)}
                      onOpen={() => setLocation(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              </div>
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

  // Días desde creación (urgencia)
  const daysSince = Math.floor(
    (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysSince > 3;

  return (
    <Card
      className="border hover:shadow-sm transition-shadow cursor-pointer"
      style={{ borderLeftWidth: 3, borderLeftColor: stage.color }}
      onClick={onOpen}
    >
      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <p className="text-sm font-semibold text-white/85 truncate">{project.name}</p>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 shrink-0"
              style={{ color: stage.color, borderColor: `${stage.color}40` }}
            >
              {typeLabel}
            </Badge>
            {isUrgent && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500/15 text-red-400 border-red-500/30 shrink-0">
                {daysSince}d
              </Badge>
            )}
          </div>
          {project.client && (
            <p className="flex items-center gap-1 text-xs text-white/40 truncate">
              <User className="h-3 w-3 shrink-0" />
              {project.client.name}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Abrir detalle siempre disponible */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpen}
            className="h-7 px-2 text-slate-500"
            title="Ver proyecto"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          {/* Iniciar diseño (adelanto_recibido → en_diseno) */}
          {project.status === "adelanto_recibido" && canStart && (
            <Button
              size="sm"
              onClick={onStart}
              disabled={isPending}
              className="h-7 px-3 text-xs text-white gap-1"
              style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
            >
              <Play className="h-3 w-3" />
              Iniciar
            </Button>
          )}

          {/* Aprobar / Rechazar diseño (en_diseno, pendiente_modelado, pendiente_render) */}
          {canApprove &&
            ["en_diseno", "pendiente_modelado", "pendiente_render"].includes(project.status) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReject}
                  disabled={isPending}
                  className="h-7 px-2 text-xs text-red-600 border-red-500/25 hover:bg-red-500/10"
                  title="Rechazar — vuelve a diseño"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={onApprove}
                  disabled={isPending}
                  className="h-7 px-2 text-xs text-white bg-emerald-500 hover:bg-emerald-600"
                  title="Aprobar"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
