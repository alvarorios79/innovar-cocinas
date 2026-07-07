import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Images, Search, CheckCircle2, Clock, Copy, MessageCircle,
  ExternalLink, RefreshCw, Box, Palette, User,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE_URL = window.location.origin;

const STATUS_LABEL: Record<string, string> = {
  adelanto_recibido: "Adelanto recibido",
  en_diseno: "En diseño",
  pendiente_modelado: "Esperando aprobación modelado",
  pendiente_render: "Esperando aprobación renders",
  aprobacion_final: "Diseño aprobado",
  despiece: "En producción",
  corte: "En producción",
  enchape: "En producción",
  ensamble: "En producción",
  listo_instalacion: "Listo instalación",
  entregado: "Entregado",
};

const DESIGN_STATUSES = [
  "en_diseno", "pendiente_modelado", "pendiente_render", "aprobacion_final",
  "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado",
];

const WORK_LABELS: Record<string, string> = {
  cocina: "Cocina", closet: "Closet", puertas: "Puertas",
  centro_tv: "Centro TV", escalera: "Escalera", bano: "Baño",
};

function galleryUrl(projectId: number, token: string, type: "modelado_3d" | "renders") {
  return `${BASE_URL}/gallery?project=${projectId}&token=${token}&type=${type}`;
}

function waLink(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  const full = clean.startsWith("57") ? clean : `57${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GalleryAdmin() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendientes" | "aprobados">("todos");

  const { data: projects = [], isLoading, refetch } =
    trpc.projects.list.useQuery(undefined, { refetchInterval: 120_000 });

  // Solo proyectos que ya llegaron a la fase de diseño (tienen o van a tener fotos)
  const designProjects = useMemo(() => {
    return (projects as any[]).filter(p => DESIGN_STATUSES.includes(p.status));
  }, [projects]);

  const filtered = useMemo(() => {
    let list = designProjects;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.client?.name?.toLowerCase().includes(q)
      );
    }
    if (filter === "pendientes") {
      list = list.filter((p: any) =>
        p.status === "pendiente_modelado" || p.status === "pendiente_render"
      );
    } else if (filter === "aprobados") {
      list = list.filter((p: any) =>
        p.rendersApprovedAt || p.status === "aprobacion_final" ||
        DESIGN_STATUSES.indexOf(p.status) >= DESIGN_STATUSES.indexOf("aprobacion_final")
      );
    }
    return list;
  }, [designProjects, search, filter]);

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success(`Link de ${label} copiado`));
  };

  const openGallery = (url: string) => {
    window.open(url, "_blank");
  };

  const pendingCount = designProjects.filter((p: any) =>
    p.status === "pendiente_modelado" || p.status === "pendiente_render"
  ).length;

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Galerías de Clientes"
        icon={<Images className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </Button>
        }
      />

      {/* Banner pendientes de aprobación */}
      {pendingCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-300">
            <strong>{pendingCount}</strong> proyecto{pendingCount > 1 ? "s" : ""} esperando aprobación del cliente.
            <button className="underline ml-2 font-semibold" onClick={() => setFilter("pendientes")}>
              Ver ahora
            </button>
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar proyecto o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["todos", "pendientes", "aprobados"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-teal-600 hover:bg-teal-700 text-white" : "text-muted-foreground"}
            >
              {f === "todos" ? "Todos" : f === "pendientes" ? "Pendientes" : "Aprobados"}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Images className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "Sin coincidencias" : "No hay proyectos en fase de diseño"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project: any) => (
            <ProjectGalleryCard
              key={project.id}
              project={project}
              onOpenProject={() => setLocation(`/projects/${project.id}`)}
              onCopy={copyLink}
              onOpen={openGallery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tarjeta por proyecto ──────────────────────────────────────────────────────
function ProjectGalleryCard({
  project, onOpenProject, onCopy, onOpen,
}: {
  project: any;
  onOpenProject: () => void;
  onCopy: (url: string, label: string) => void;
  onOpen: (url: string) => void;
}) {
  const token = project.publicToken ?? "";
  const modeladoUrl = galleryUrl(project.id, token, "modelado_3d");
  const rendersUrl = galleryUrl(project.id, token, "renders");

  const modeladoApproved = !!project.modeladoApprovedAt;
  const rendersApproved = !!project.rendersApprovedAt;

  const isPendingModelado = project.status === "pendiente_modelado";
  const isPendingRenders = project.status === "pendiente_render";
  const isPending = isPendingModelado || isPendingRenders;

  const clientPhone = project.client?.whatsappPhone;

  const waModelado = clientPhone
    ? waLink(clientPhone,
        `¡Hola ${project.client?.name}! 👋\n\nYa puedes revisar el modelado 3D de tu proyecto "${project.name}":\n${modeladoUrl}\n\nCuando estés conforme, solo haz clic en "Aprobar". Si quieres algún cambio, también puedes indicarlo ahí.\n\nQuedamos atentos. — INNOVAR Cocinas`)
    : null;

  const waRenders = clientPhone
    ? waLink(clientPhone,
        `¡Hola ${project.client?.name}! 🎨\n\nTus renders están listos. Puedes verlos aquí:\n${rendersUrl}\n\nRevísalos y apruébalos cuando estés satisfecho. Si deseas algún ajuste, indícalo en la misma página.\n\n— INNOVAR Cocinas`)
    : null;

  return (
    <Card className={`border overflow-hidden ${isPending ? "border-amber-300" : ""}`}>
      <CardContent className="p-4">
        {/* Encabezado del proyecto */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">{project.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {WORK_LABELS[project.workType] ?? project.workType}
              </Badge>
              {isPending && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/20 shrink-0">
                  ⏳ Esperando aprobación
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {project.client && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{project.client.name}
                </span>
              )}
              <span className="text-slate-400">{STATUS_LABEL[project.status] ?? project.status}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpenProject} className="h-7 px-2 text-slate-400 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filas de galería */}
        <div className="space-y-2">
          {/* Modelado 3D */}
          <GalleryRow
            icon={<Box className="h-3.5 w-3.5" />}
            label="Modelado 3D"
            url={modeladoUrl}
            approved={modeladoApproved}
            approvedBy={project.modeladoApprovedBy}
            waUrl={waModelado}
            onCopy={() => onCopy(modeladoUrl, "modelado 3D")}
            onOpen={() => onOpen(modeladoUrl)}
            highlight={isPendingModelado}
          />

          {/* Renders */}
          <GalleryRow
            icon={<Palette className="h-3.5 w-3.5" />}
            label="Renders"
            url={rendersUrl}
            approved={rendersApproved}
            approvedBy={project.rendersApprovedBy}
            waUrl={waRenders}
            onCopy={() => onCopy(rendersUrl, "renders")}
            onOpen={() => onOpen(rendersUrl)}
            highlight={isPendingRenders}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Fila de un tipo de galería ────────────────────────────────────────────────
function GalleryRow({
  icon, label, url, approved, approvedBy, waUrl, onCopy, onOpen, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
  approved: boolean;
  approvedBy?: string | null;
  waUrl: string | null;
  onCopy: () => void;
  onOpen: () => void;
  highlight: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${highlight ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.04]"}`}>
      {/* Ícono + label */}
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs font-medium text-foreground w-24 shrink-0">{label}</span>

      {/* Estado */}
      {approved ? (
        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium shrink-0">
          <CheckCircle2 className="h-3 w-3" />
          {approvedBy ? `Aprobado por ${approvedBy}` : "Aprobado"}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          Sin aprobar
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Acciones */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost" size="sm"
          onClick={onOpen}
          className="h-7 px-2 text-slate-500 hover:text-teal-600"
          title="Ver galería del cliente"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={onCopy}
          className="h-7 px-2 text-slate-500 hover:text-teal-600"
          title="Copiar link"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {waUrl && (
          <Button
            variant="ghost" size="sm"
            onClick={() => window.open(waUrl, "_blank")}
            className="h-7 px-2 text-slate-500 hover:text-green-600"
            title="Enviar por WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
