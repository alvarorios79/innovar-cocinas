import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Search, User, Truck, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  PhoneCall, CalendarClock, Wrench, Plus, RefreshCw,
  Circle, ExternalLink, MessageCircle, Check,
} from "lucide-react";
import { toast } from "sonner";
import { GOOGLE_REVIEW_URL } from "@shared/const";
import {
  warrantyInfo, followUp30Message, annualReviewMessage, claimReplyMessage, postventaWaPhone, splitClaimPhotos,
} from "@shared/postventa";
import { useLocation } from "wouter";

// ── Tipos ────────────────────────────────────────────────────────────────────
type ReclamacionType = "reclamacion" | "seguimiento_30d" | "revision_anual";
type ReclamacionStatus = "pendiente" | "en_revision" | "resuelto" | "no_procede";

type Reclamacion = {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  type: ReclamacionType;
  status: ReclamacionStatus;
  priority: "alta" | "media" | "baja";
  scheduledFor?: string | null;
  resolvedAt?: string | null;
  resolvedNotes?: string | null;
  createdAt: string;
  assignedToUser?: { name?: string | null } | null;
  resolvedByUser?: { name?: string | null } | null;
};

type PostventaProject = {
  id: number;
  name: string;
  workType: string;
  deliveredAt?: string | null;
  client?: { name: string; whatsappPhone?: string } | null;
  reclamaciones: Reclamacion[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina", closet: "Closet", puertas: "Puertas", centro_tv: "Centro TV",
};

const TYPE_CONFIG: Record<ReclamacionType, { label: string; icon: typeof PhoneCall; color: string }> = {
  reclamacion:    { label: "Reclamación",       icon: Wrench,       color: "#EF4444" },
  seguimiento_30d:{ label: "Seguimiento 30d",   icon: PhoneCall,    color: "#F59E0B" },
  revision_anual: { label: "Revisión de un año", icon: CalendarClock,color: "#6366F1" },
};

const STATUS_CONFIG: Record<ReclamacionStatus, { label: string; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   color: "#F59E0B", bg: "#FEF3C7" },
  en_revision: { label: "En Revisión", color: "#3B82F6", bg: "#DBEAFE" },
  resuelto:    { label: "Resuelto",    color: "#10B981", bg: "#D1FAE5" },
  no_procede:  { label: "No Procede",  color: "#6B7280", bg: "#F3F4F6" },
};

const PRIORITY_CONFIG = {
  alta:  { label: "Alta",  color: "#EF4444" },
  media: { label: "Media", color: "#F59E0B" },
  baja:  { label: "Baja",  color: "#6B7280" },
};

/** Semáforo de garantía: 6 meses para todo (decisión de Álvaro, shared/postventa.ts). */
function getWarrantyStatus(deliveredAt: string | null | undefined): {
  color: string; label: string; daysElapsed: number; inWarranty: boolean; nearExpiry: boolean;
} {
  const w = warrantyInfo(deliveredAt);
  const color = w.status === "vigente" ? "#10B981" : w.status === "por_vencer" ? "#F59E0B" : "#6B7280";
  return { color, label: w.label, daysElapsed: w.daysElapsed, inWarranty: w.status === "vigente" || w.status === "por_vencer", nearExpiry: w.status === "por_vencer" };
}

/** Mensaje de WhatsApp listo según el tipo de caso. */
function whatsAppFor(rec: any): string | null {
  const phone = postventaWaPhone(rec.client?.whatsappPhone);
  if (!phone) return null;
  const name = rec.client?.name;
  const msg = rec.type === "seguimiento_30d" ? followUp30Message(name, GOOGLE_REVIEW_URL)
    : rec.type === "revision_anual" ? annualReviewMessage(name)
    : claimReplyMessage(name, String(rec.title || "").replace(/^Reporte del cliente:\s*/, ""));
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Postventa() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [newReclamacion, setNewReclamacion] = useState<{ projectId: number; projectName: string } | null>(null);
  const [resolveDialog, setResolveDialog] = useState<Reclamacion | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [newForm, setNewForm] = useState({
    title: "", description: "", type: "reclamacion" as ReclamacionType,
    priority: "media" as "alta" | "media" | "baja",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: allReclamaciones = [], isLoading: loadingRec, refetch } =
    trpc.postventa.list.useQuery(undefined, { refetchInterval: 60_000 });

  const { data: stats } = trpc.postventa.stats.useQuery(undefined, { refetchInterval: 60_000 });

  const { data: projects = [] } =
    trpc.projects.list.useQuery(undefined, { refetchInterval: 120_000 });

  // Mutations
  const createRec = trpc.postventa.create.useMutation({
    onSuccess: () => {
      toast.success("Reclamación creada");
      setNewReclamacion(null);
      setNewForm({ title: "", description: "", type: "reclamacion", priority: "media" });
      utils.postventa.list.invalidate();
      utils.postventa.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRec = trpc.postventa.update.useMutation({
    onSuccess: () => {
      toast.success("Reclamación actualizada");
      setResolveDialog(null);
      setResolveNotes("");
      utils.postventa.list.invalidate();
      utils.postventa.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Proyectos entregados enriquecidos con sus reclamaciones
  const delivered = useMemo(() => {
    const entregados = (projects as any[]).filter((p: any) => p.status === "entregado");
    return entregados.map((p: any) => ({
      ...p,
      reclamaciones: (allReclamaciones as any[]).filter((r: any) => r.projectId === p.id),
    })) as PostventaProject[];
  }, [projects, allReclamaciones]);

  // Filtrado y búsqueda
  const filtered = useMemo(() => {
    let list = delivered;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.client?.name?.toLowerCase().includes(q)
      );
    }
    if (filterStatus === "con_pendientes") {
      list = list.filter(p => p.reclamaciones.some(r => r.status === "pendiente" || r.status === "en_revision"));
    } else if (filterStatus === "seguimientos_due") {
      const today = new Date().toISOString();
      list = list.filter(p => p.reclamaciones.some(r =>
        (r.type === "seguimiento_30d" || r.type === "revision_anual") &&
        r.status === "pendiente" && r.scheduledFor && r.scheduledFor <= today
      ));
    }
    return list;
  }, [delivered, search, filterStatus]);

  // Stats rápidas del banner
  const pendientesCount = (allReclamaciones as any[]).filter((r: any) => r.status === "pendiente").length;
  const overdueFollowUps = (allReclamaciones as any[]).filter((r: any) =>
    (r.type === "seguimiento_30d" || r.type === "revision_anual") &&
    r.status === "pendiente" && r.scheduledFor && r.scheduledFor <= new Date().toISOString()
  ).length;

  // Lo que hay que hacer ya: seguimientos vencidos + reportes/reclamaciones abiertos
  const todo = useMemo(() => {
    const now = new Date().toISOString();
    return (allReclamaciones as any[]).filter((r: any) =>
      ((r.type === "seguimiento_30d" || r.type === "revision_anual") && r.status === "pendiente" && r.scheduledFor && r.scheduledFor <= now) ||
      (r.type === "reclamacion" && (r.status === "pendiente" || r.status === "en_revision"))
    ).sort((a: any, b: any) => (a.type === "reclamacion" ? 0 : 1) - (b.type === "reclamacion" ? 0 : 1) || String(a.scheduledFor || a.createdAt).localeCompare(String(b.scheduledFor || b.createdAt)));
  }, [allReclamaciones]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReclamacion || !newForm.title) return;
    createRec.mutate({
      projectId: newReclamacion.projectId,
      title: newForm.title,
      description: newForm.description,
      type: newForm.type,
      priority: newForm.priority,
    });
  };

  const handleStatusChange = (rec: Reclamacion, newStatus: ReclamacionStatus) => {
    if (newStatus === "resuelto") {
      setResolveDialog(rec);
      return;
    }
    updateRec.mutate({ id: rec.id, status: newStatus });
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveDialog) return;
    updateRec.mutate({ id: resolveDialog.id, status: "resuelto", resolvedNotes: resolveNotes });
  };

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Postventa"
        icon={<ShieldCheck className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </Button>
        }
      />

      {/* KPI strip */}
      <KpiGrid cols={4}>
        <KpiCard
          label="Total entregados"
          value={delivered.length}
          icon={<Truck className="h-4 w-4" />}
          accent="var(--primary)"
        />
        <KpiCard
          label="Pendientes"
          value={pendientesCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="var(--destructive)"
        />
        <KpiCard
          label="Vencidos hoy"
          value={overdueFollowUps}
          icon={<Clock className="h-4 w-4" />}
          accent="var(--warning)"
        />
        <KpiCard
          label="Revisiones próximas"
          value={stats?.revisionesAnualesDue ?? 0}
          icon={<CalendarClock className="h-4 w-4" />}
          accent="#6366F1"
        />
      </KpiGrid>

      {/* Para hacer hoy */}
      {todo.length > 0 && (
        <Card className="mb-4 border-amber-500/30">
          <CardContent className="p-3 md:p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Para hacer hoy
              <span className="text-xs font-normal text-muted-foreground">({todo.length})</span>
            </h2>
            <div className="divide-y divide-white/[0.08]">
              {todo.map((r: any) => <TodoRow key={r.id} rec={r} onDone={() => handleStatusChange(r, "resuelto")}
                onOpen={() => setLocation(`/projects/${r.projectId}`)} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar proyecto o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            <SelectItem value="con_pendientes">Con pendientes</SelectItem>
            <SelectItem value="seguimientos_due">Seguimientos vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de proyectos */}
      {loadingRec ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.06] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "Sin coincidencias" : "No hay proyectos entregados aún"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => (
            <ProjectPostventaCard
              key={project.id}
              project={project}
              onOpen={() => setLocation(`/projects/${project.id}`)}
              onNewReclamacion={() => setNewReclamacion({ projectId: project.id, projectName: project.name })}
              onStatusChange={handleStatusChange}
              updatingId={updateRec.isPending ? (resolveDialog?.id ?? null) : null}
            />
          ))}
        </div>
      )}

      {/* Dialog: Nueva reclamación */}
      <Dialog open={!!newReclamacion} onOpenChange={() => setNewReclamacion(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva reclamación</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2 mb-3">
            Proyecto: <strong>{newReclamacion?.projectName}</strong>
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={newForm.type} onValueChange={(v) => setNewForm({ ...newForm, type: v as ReclamacionType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reclamacion">Reclamación del cliente</SelectItem>
                  <SelectItem value="seguimiento_30d">Llamada de seguimiento</SelectItem>
                  <SelectItem value="revision_anual">Revisión anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input
                placeholder="Ej: Puerta módulo derecho no cierra bien"
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Detalle del problema o solicitud…"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prioridad</Label>
              <Select value={newForm.priority} onValueChange={(v) => setNewForm({ ...newForm, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewReclamacion(null)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createRec.isPending}
                style={{ background: "var(--brand-gradient)" }} className="text-white">
                {createRec.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resolver */}
      <Dialog open={!!resolveDialog} onOpenChange={() => { setResolveDialog(null); setResolveNotes(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{resolveDialog?.type === "reclamacion" ? "Marcar como resuelto" : "Marcar como hecho"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{resolveDialog?.title}</p>
          <form onSubmit={handleResolve} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{resolveDialog?.type === "reclamacion" ? "¿Cómo se resolvió?" : resolveDialog?.type === "revision_anual" ? "¿Qué dijo? ¿Aceptó la revisión o el mantenimiento?" : "¿Qué dijo el cliente?"} <span className="text-gray-400">(opcional)</span></Label>
              <Textarea
                placeholder="Descripción de lo que se hizo para resolver el caso…"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setResolveDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={updateRec.isPending}
                className="bg-green-600 hover:bg-green-700 text-white">
                {updateRec.isPending ? "Guardando…" : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tarjeta por proyecto ──────────────────────────────────────────────────────
function ProjectPostventaCard({
  project, onOpen, onNewReclamacion, onStatusChange, updatingId,
}: {
  project: PostventaProject;
  onOpen: () => void;
  onNewReclamacion: () => void;
  onStatusChange: (rec: Reclamacion, status: ReclamacionStatus) => void;
  updatingId: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const warranty = getWarrantyStatus(project.deliveredAt);
  const openRecs = project.reclamaciones.filter(r => r.status === "pendiente" || r.status === "en_revision");
  const today = new Date().toISOString();
  const overdueRecs = project.reclamaciones.filter(
    r => r.status === "pendiente" && r.scheduledFor && r.scheduledFor <= today
  );

  const deliveredDate = project.deliveredAt
    ? new Date(project.deliveredAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <Card className="border overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: warranty.color }}>
      {/* Header */}
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Semáforo */}
          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
            <Circle className="h-4 w-4" style={{ fill: warranty.color, color: warranty.color }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold text-foreground truncate">{project.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {WORK_TYPE_LABELS[project.workType] ?? project.workType}
              </Badge>
              {overdueRecs.length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500/15 text-amber-300 border-amber-500/25">
                  {overdueRecs.length} vencido{overdueRecs.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {project.client && (
                <span className="flex items-center gap-1 truncate">
                  <User className="h-3 w-3 shrink-0" />{project.client.name}
                </span>
              )}
              {deliveredDate && (
                <span className="flex items-center gap-1 shrink-0">
                  <Truck className="h-3 w-3" />{deliveredDate} · {warranty.daysElapsed}d
                </span>
              )}
              <span className="shrink-0 font-medium" style={{ color: warranty.color }}>
                {warranty.label}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onOpen} className="h-7 px-2 text-gray-500" title="Ver proyecto">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onNewReclamacion} className="h-7 px-2 text-gray-500" title="Nueva reclamación">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2 text-gray-500"
              title={expanded ? "Ocultar" : "Ver reclamaciones"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {openRecs.length > 0 && (
                <span className="ml-1 text-xs font-bold" style={{ color: "#EF4444" }}>{openRecs.length}</span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Reclamaciones expandidas */}
      {expanded && (
        <div className="border-t border-white/[0.08] bg-white/[0.03]">
          {project.reclamaciones.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-400" />
              Sin reclamaciones — proyecto sin novedades
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {project.reclamaciones.map((rec) => (
                <ReclamacionRow
                  key={rec.id}
                  rec={rec}
                  onStatusChange={onStatusChange}
                  updating={updatingId === rec.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Fila de una reclamación ───────────────────────────────────────────────────
function ReclamacionRow({
  rec, onStatusChange, updating,
}: {
  rec: Reclamacion;
  onStatusChange: (rec: Reclamacion, status: ReclamacionStatus) => void;
  updating: boolean;
}) {
  const typeConf = TYPE_CONFIG[rec.type];
  const statusConf = STATUS_CONFIG[rec.status];
  const priorityConf = PRIORITY_CONFIG[rec.priority];
  const TypeIcon = typeConf.icon;
  const today = new Date().toISOString();
  const isOverdue = rec.status === "pendiente" && rec.scheduledFor && rec.scheduledFor <= today;

  const scheduledLabel = rec.scheduledFor
    ? new Date(rec.scheduledFor).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className={`px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 ${isOverdue ? "bg-amber-500/10" : ""}`}>
      {/* Ícono tipo */}
      <div className="shrink-0 mt-0.5">
        <TypeIcon className="h-4 w-4" style={{ color: typeConf.color }} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{rec.title}</p>
        {rec.type === "reclamacion" && <ClaimDetail description={rec.description} />}
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="text-[11px] font-medium" style={{ color: typeConf.color }}>{typeConf.label}</span>
          <span className="text-[11px] text-gray-400">·</span>
          <span className="text-[11px] font-medium" style={{ color: priorityConf.color }}>{priorityConf.label}</span>
          {scheduledLabel && (
            <>
              <span className="text-[11px] text-gray-400">·</span>
              <span className={`text-[11px] ${isOverdue ? "text-amber-400 font-semibold" : "text-gray-500"}`}>
                {isOverdue ? "⚠ Vence " : ""}{scheduledLabel}
              </span>
            </>
          )}
          {rec.resolvedAt && rec.resolvedNotes && (
            <span className="text-[11px] text-green-400 italic">"{rec.resolvedNotes}"</span>
          )}
        </div>
      </div>

      {/* Status + cambio */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: statusConf.bg, color: statusConf.color }}
        >
          {statusConf.label}
        </span>
        {rec.status !== "resuelto" && rec.status !== "no_procede" && (
          <Select
            value={rec.status}
            onValueChange={(v) => onStatusChange(rec, v as ReclamacionStatus)}
            disabled={updating}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_revision">En Revisión</SelectItem>
              <SelectItem value="resuelto">Resuelto ✓</SelectItem>
              <SelectItem value="no_procede">No procede</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// ── Descripción y fotos de un reporte ────────────────────────────────────────
function ClaimDetail({ description }: { description?: string | null }) {
  const parsed = splitClaimPhotos(description);
  const photos = parsed.photos;
  const text = parsed.text.replace(/^Reportado por .* desde su enlace\.\s*/, "").trim();
  if (!text && !photos.length) return null;
  return (
    <div className="mt-1 space-y-1.5">
      {text && <p className="text-xs text-muted-foreground whitespace-pre-line">{text}</p>}
      {photos.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 rounded-md overflow-hidden border border-white/10">
              <img src={u} alt="Foto del cliente" className="h-full w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fila de "Para hacer hoy" ─────────────────────────────────────────────────
function TodoRow({ rec, onDone, onOpen }: { rec: any; onDone: () => void; onOpen: () => void }) {
  const conf = TYPE_CONFIG[rec.type as ReclamacionType] ?? TYPE_CONFIG.reclamacion;
  const Icon = conf.icon;
  const wa = whatsAppFor(rec);
  const what = rec.type === "seguimiento_30d" ? "Llamada de 30 días: cómo le ha ido + reseña en Google"
    : rec.type === "revision_anual" ? "Un año: regalarle la revisión y ofrecer mantenimiento"
    : String(rec.title).startsWith("Reporte del cliente")
      ? `🛠️ ${String(rec.description || "").match(/^Reportado por (.+?) desde su enlace/)?.[1] || "El cliente"} reportó un problema desde su enlace`
      : rec.title;
  return (
    <div className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: conf.color }} />
        <div className="min-w-0">
          <button onClick={onOpen} className="text-sm font-semibold text-foreground hover:underline text-left">
            {rec.client?.name || rec.project?.name || `Proyecto ${rec.projectId}`}
          </button>
          <p className="text-xs text-muted-foreground">{what}</p>
          {rec.type === "reclamacion" && <ClaimDetail description={rec.description} />}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {wa ? (
          <Button asChild size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
            <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3.5 w-3.5 mr-1.5" />WhatsApp</a>
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground self-center">Sin WhatsApp registrado</span>
        )}
        <Button size="sm" variant="outline" className="h-8" onClick={onDone}>
          <Check className="h-3.5 w-3.5 mr-1.5" />{rec.type === "reclamacion" ? "Resuelto" : "Hecho"}
        </Button>
      </div>
    </div>
  );
}
