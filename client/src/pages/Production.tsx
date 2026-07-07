import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Wrench, ChevronRight, ChevronLeft, Scissors, Layers,
  Package, Truck, CheckCircle2, RefreshCw, User, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ProjectProductionPanel } from "@/components/ProjectProductionPanel";

// ── Columnas del kanban de producción ─────────────────────────────────────────
const PROD_STAGES = [
  { key: "despiece", label: "Despiece", icon: Scissors, color: "#6366F1", bg: "rgba(99,102,241,0.07)", description: "Lista de piezas" },
  { key: "corte", label: "Corte", icon: Layers, color: "#F59E0B", bg: "rgba(245,158,11,0.07)", description: "Corte y mecanizado" },
  { key: "enchape", label: "Enchape", icon: Layers, color: "#EC4899", bg: "rgba(236,72,153,0.07)", description: "Aplicación de enchape" },
  { key: "ensamble", label: "Ensamble", icon: Package, color: "#1DB5A8", bg: "rgba(29,181,168,0.07)", description: "Armado de módulos" },
  { key: "listo_instalacion", label: "Listo", icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.07)", description: "Listo para instalar" },
  { key: "entregado", label: "Entregado", icon: Truck, color: "#64748B", bg: "rgba(100,116,139,0.07)", description: "Instalado y entregado" },
] as const;

type ProdStageKey = typeof PROD_STAGES[number]["key"];
const PROD_STATUS_KEYS = PROD_STAGES.map((s) => s.key);

const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina", closet: "Closet", puertas: "Puertas", centro_tv: "Centro TV",
};

type Project = {
  id: number; name: string; status: string; workType: string; clientId: number;
  client?: { name: string; whatsappPhone: string } | null;
  createdAt: string; designerId?: number | null; estimatedInstallDate?: string | null;
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function Production() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const canAdvance = user?.role === "super_admin" || user?.role === "admin" || user?.role === "jefe_taller";

  const { data: projects = [], isLoading, refetch } = trpc.projects.list.useQuery(
    undefined, { refetchInterval: 60_000 }
  );

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Proyecto movido a ${PROD_STAGES.find((s) => s.key === vars.newStatus)?.label}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const prodProjects = (projects as Project[]).filter((p) =>
    PROD_STATUS_KEYS.includes(p.status as ProdStageKey)
  );

  const byStage = (stage: ProdStageKey) => prodProjects.filter((p) => p.status === stage);

  const nextStage = (key: ProdStageKey): ProdStageKey | null => {
    const idx = PROD_STATUS_KEYS.indexOf(key);
    return idx < PROD_STATUS_KEYS.length - 1 ? (PROD_STATUS_KEYS[idx + 1] as ProdStageKey) : null;
  };
  const prevStage = (key: ProdStageKey): ProdStageKey | null => {
    const idx = PROD_STATUS_KEYS.indexOf(key);
    return idx > 0 ? (PROD_STATUS_KEYS[idx - 1] as ProdStageKey) : null;
  };

  const move = (projectId: number, newStatus: ProdStageKey) => {
    updateStatus.mutate({ projectId, newStatus });
  };

  const openPanel = (projectId: number) => {
    setSelectedProjectId(projectId);
    setPanelOpen(true);
  };

  const selectedProject = prodProjects.find(p => p.id === selectedProjectId);

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Producción"
        icon={<Wrench className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-slate-600">
            <RefreshCw className="h-3.5 w-3.5" />Actualizar
          </Button>
        }
      />

      {/* Contador rápido */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PROD_STAGES.map((s) => {
          const count = byStage(s.key).length;
          return (
            <div key={s.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{ background: s.bg, borderColor: `${s.color}30`, color: s.color }}>
              <span>{s.label}</span>
              <span className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: s.color }}>
                {count}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] text-white/55 border border-white/[0.08]">
          Total en fábrica: <strong>{prodProjects.length}</strong>
        </div>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PROD_STAGES.map((s) => (
            <div key={s.key} className="min-w-[260px] h-64 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PROD_STAGES.map((stage) => {
            const stageProjects = byStage(stage.key);
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="min-w-[260px] max-w-[280px] shrink-0 flex flex-col rounded-xl border"
                style={{ background: stage.bg, borderColor: `${stage.color}20` }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b"
                  style={{ background: `${stage.color}15`, borderColor: `${stage.color}20` }}>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: stage.color }} />
                  <span className="text-sm font-semibold" style={{ color: stage.color }}>{stage.label}</span>
                  <Badge className="ml-auto text-[10px] h-5 px-1.5 text-white" style={{ background: stage.color }}>
                    {stageProjects.length}
                  </Badge>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageProjects.length === 0 ? (
                    <p className="text-center text-xs text-white/30 py-6">Sin proyectos</p>
                  ) : (
                    stageProjects.map((project) => (
                      <ProdCard
                        key={project.id}
                        project={project}
                        stageKey={stage.key}
                        canAdvance={canAdvance}
                        isPending={updateStatus.isPending}
                        onNext={() => { const ns = nextStage(stage.key); if (ns) move(project.id, ns); }}
                        onPrev={() => { const ps = prevStage(stage.key); if (ps) move(project.id, ps); }}
                        onManage={() => openPanel(project.id)}
                        hasNext={!!nextStage(stage.key)}
                        hasPrev={!!prevStage(stage.key)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Panel lateral de producción ─── */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-4">
          <SheetHeader className="mb-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-orange-500" />
              {selectedProject ? `Producción — ${selectedProject.name}` : "Gestión de Producción"}
            </SheetTitle>
          </SheetHeader>
          {selectedProjectId && <ProjectProductionPanel projectId={selectedProjectId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── ProdCard ──────────────────────────────────────────────────────────────────
function ProdCard({
  project, stageKey, canAdvance, isPending, onNext, onPrev, onManage, hasNext, hasPrev,
}: {
  project: Project; stageKey: ProdStageKey; canAdvance: boolean; isPending: boolean;
  onNext: () => void; onPrev: () => void; onManage: () => void; hasNext: boolean; hasPrev: boolean;
}) {
  const typeLabel = WORK_TYPE_LABELS[project.workType] ?? project.workType;
  const stageInfo = PROD_STAGES.find((s) => s.key === stageKey)!;

  return (
    <Card className="shadow-sm border-0">
      <CardContent className="p-3">
        <div className="mb-2">
          <p className="text-xs font-semibold text-white/85 leading-tight">{project.name}</p>
          <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0" style={{ color: stageInfo.color, borderColor: `${stageInfo.color}40` }}>
            {typeLabel}
          </Badge>
        </div>
        {project.client && (
          <p className="flex items-center gap-1 text-[11px] text-white/40 mb-2 truncate">
            <User className="h-3 w-3 shrink-0" />{project.client.name}
          </p>
        )}
        {project.estimatedInstallDate && (
          <p className="text-[10px] text-white/30 mb-2">
            Instalación: {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
          </p>
        )}
        {/* Gestionar materiales y fotos */}
        <Button variant="outline" size="sm" onClick={onManage}
          className="w-full h-6 text-[10px] text-orange-400 border-orange-400/30 hover:bg-orange-500/10 mb-2 gap-1">
          <Settings2 className="h-3 w-3" />Materiales y Fotos
        </Button>
        {canAdvance && (
          <div className="flex gap-1 pt-2 border-t border-white/[0.07]">
            {hasPrev && (
              <Button variant="outline" size="sm" onClick={onPrev} disabled={isPending}
                className="h-6 px-2 text-[10px] text-slate-500 flex-1">
                <ChevronLeft className="h-3 w-3 mr-0.5" />Retroceder
              </Button>
            )}
            {hasNext && (
              <Button size="sm" onClick={onNext} disabled={isPending}
                className="h-6 px-2 text-[10px] text-white flex-1"
                style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}>
                Avanzar<ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
