import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RanchoArdiendoCards } from "@/components/RanchoArdiendo";
import { trpc } from "@/lib/trpc";
import { 
  FolderKanban, 
  Plus, 
  Eye, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hammer,
  Paintbrush,
  Package,
  Truck,
  FileDown,
  ZoomIn,
  MessageCircle,
  Send,
  ExternalLink,
  Calendar,
  Pencil,
  User,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Sparkles,
  Archive,
  RotateCcw,
  Flame,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { FileViewer, useFileViewer } from "@/components/FileViewer";
import { ProjectMaterialsPanel } from "@/components/ProjectMaterialsPanel";
import { PageHeader } from "@/components/PageHeader";
import { ReportExportButtons } from "@/components/ReportExportButtons";
import { buildProjectsListReport } from "@shared/businessReports";
import { PROJECT_STATUS as PROJECT_STATUSES, getProjectStatusLabel as getStatusLabel } from "@/lib/projectStatus";
import { confirmAction } from "@/lib/confirm";
// Usar tRPC mutations en lugar de fetch directo

const WORK_TYPES = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export default function Projects() {
  const { user, isAuthenticated, loading } = useAuth();

  const [location, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Leer parámetros de URL para filtros
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlStatus = urlParams.get('status');
  const urlOverdue = urlParams.get('overdue');
  
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || "all");
  const [showPendingPaymentOnly, setShowPendingPaymentOnly] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(urlOverdue === 'true');
  
  // Actualizar filtros cuando cambia la URL
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const status = params.get('status');
    const overdue = params.get('overdue');
    if (status) setStatusFilter(status);
    if (overdue === 'true') setShowOverdueOnly(true);
  }, [location]);
  
  const [createForm, setCreateForm] = useState({
    clientId: "",
    name: "",
    workType: "cocina" as "cocina" | "closet" | "puertas" | "centro_tv",
    initialMeasurements: "",
  });

  // Estados para subida de fotos y detalles
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [photoForm, setPhotoForm] = useState({
    stage: "" as "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final" | "",
    category: "medidas" as "cotizacion" | "medidas" | "disenos" | "avance" | "instalacion" | "entrega",
    subcategory: "" as "fotos_iniciales" | "dibujo" | "renders" | "despieces" | "detalles" | "corte" | "enchape" | "armado" | "proceso_instalacion" | "fotos_finales" | "documento_cotizacion" | "",
    photoUrl: "",
    description: "",
  });

  // Taller (jefe_taller / operario) solo puede subir en Avance, Instalación y Entrega:
  // el formulario nunca debe quedar en "Medidas" (el servidor lo rechaza con "No tienes permisos")
  useEffect(() => {
    const isWorkshop = user?.role === "jefe_taller" || user?.role === "operario";
    if (isWorkshop && !["avance", "instalacion", "entrega"].includes(photoForm.category)) {
      setPhotoForm((f: any) => ({ ...f, category: "avance", subcategory: "" }));
    }
  }, [user?.role, photoForm.category]);
  
  // Estado para filtro de categoría y subcategoría en galería
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [detailForm, setDetailForm] = useState({
    type: "nota_importante" as "medida_especial" | "nota_importante" | "foto_referencia",
    title: "",
    content: "",
    photoUrl: "",
  });

  const utils = trpc.useUtils();
  
  // Hook para visor de archivos (imágenes y PDFs)
  const fileViewer = useFileViewer();
  
  // Mutation para enviar por WhatsApp
  const sendWhatsappMutation = trpc.quotations.sendByWhatsApp.useMutation({
    onSuccess: () => {
      toast.success("Cotización enviada correctamente por WhatsApp");
      setShowWhatsAppDialog(false);
      setWhatsAppMessage("");
    },
    onError: (error) => {
      const errorMessage = error.message || "Error desconocido";
      const fullError = JSON.stringify({
        message: errorMessage,
        code: (error as any).code,
        data: (error as any).data,
      }, null, 2);
      toast.error(`Error: ${errorMessage}\n${fullError}`);
      console.error("[WHATSAPP ERROR]", error);
    }
  });
  
  // Estado para guardar el ID de la cotización actual
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  
  // Estado para generar PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Estados para notificación WhatsApp
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppLink, setWhatsAppLink] = useState("");
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  
  // Estado para editar fecha estimada
  const [showEditDateDialog, setShowEditDateDialog] = useState(false);
  const [editDateForm, setEditDateForm] = useState({
    estimatedInstallDate: "",
    reason: "",
  });
  
  // Estado para eliminación de proyectos
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [projectPage, setProjectPage] = useState(1);
  const PROJECTS_PER_PAGE = 50;
  
  // Estado para filtro de rentabilidad
  const [profitFilter, setProfitFilter] = useState<string>("all");
  
  // Estado para búsqueda de cliente
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para tab de archivado (inicializar desde localStorage)
  const [archiveTab, setArchiveTab] = useState<'active' | 'archived' | 'closed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('projectsArchiveTab');
      return (saved === 'archived' || saved === 'active' || saved === 'closed') ? saved as 'active' | 'archived' | 'closed' : 'active';
    }
    return 'active';
  });
  
  // Guardar el estado de la pestaña en localStorage cuando cambia
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projectsArchiveTab', archiveTab);
    }
  }, [archiveTab]);
  
  // Estado para carga de archivado
  const [archivingProjectId, setArchivingProjectId] = useState<number | null>(null);
  
  // Estado para confirmación de avance a aprobacion_final
  const [showAdvanceConfirmDialog, setShowAdvanceConfirmDialog] = useState(false);
  const [projectToAdvance, setProjectToAdvance] = useState<any>(null);
  
  // Conteos para las pestañas
  const { data: tabCounts } = trpc.projects.getCounts.useQuery();

  // "Cerrados" es información financiera: jefe de taller, operario y diseñador no lo ven
  const canSeeClosedTab = user?.role !== "jefe_taller" && user?.role !== "operario" && user?.role !== "disenador";
  useEffect(() => {
    if (!canSeeClosedTab && archiveTab === 'closed') setArchiveTab('active');
  }, [canSeeClosedTab, archiveTab]);

  // Tarjetas "El rancho ardiendo": lista completa (no paginada) y se refresca sola cada minuto
  const { data: ranchoProjects = [] } = trpc.projects.list.useQuery(undefined, {
    enabled: user?.role === "jefe_taller",
    refetchInterval: 60000,
  });

  const { data: projectsData, isLoading: loadingProjects } = trpc.projects.listPaginated.useQuery({
    page: projectPage,
    limit: PROJECTS_PER_PAGE,
    ...(statusFilter !== "all" && { status: statusFilter }),
    archived: archiveTab === 'archived' ? true : archiveTab === 'active' ? false : undefined,
    closed: archiveTab === 'closed' && canSeeClosedTab ? true : undefined,
  });
  const projects = projectsData?.data || [];
  
  // Aplicar filtro de rentabilidad
  const filteredByProfit = projects.filter(p => {
    const rent = Number((p as any).rentabilidad ?? 0);
    
    switch (profitFilter) {
      case "healthy":
        return rent > 20;
      case "moderate":
        return rent >= 10 && rent <= 20;
      case "risk":
        return rent < 15;
      case "critical":
        return rent < 10;
      default:
        return true;
    }
  });
  
  // No filtrar por estado aquí - el backend ya está filtrando por archived
  const filteredByArchive = filteredByProfit;
  
  // Proyectos en diseño para jefe_taller (tarjetas preview no clickeables)
  const DESIGN_PREVIEW_STATUSES = ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "aprobacion_final"];
  const designPreviewProjects = user?.role === "jefe_taller"
    ? filteredByArchive.filter(p => DESIGN_PREVIEW_STATUSES.includes((p as any).status))
    : [];

  // Aplicar filtro de busqueda por cliente (jefe_taller: excluye diseño de lista normal)
  const filteredProjects = filteredByArchive.filter(p => {
    if (user?.role === "jefe_taller" && DESIGN_PREVIEW_STATUSES.includes((p as any).status)) return false;
    const clientName = (p as any).clientName?.toLowerCase() || "";
    return clientName.includes(searchTerm.toLowerCase());
  });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: projectDetail } = trpc.projects.getById.useQuery(
    { id: selectedProject?.id },
    { enabled: !!selectedProject?.id }
  );

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listPaginated.invalidate();
      toast.success("Proyecto creado exitosamente");
      setShowCreateDialog(false);
      setCreateForm({ clientId: "", name: "", workType: "cocina", initialMeasurements: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear proyecto");
    },
  });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: (data) => {
      utils.projects.list.invalidate();
      utils.projects.listPaginated.invalidate();
      utils.projects.getById.invalidate();
      toast.success("Estado actualizado");
      
      // Si hay recordatorio de pago del 40%, abrir WhatsApp automáticamente
      if (data.paymentReminderWhatsApp) {
        toast.success("💰 Proyecto entregado. Se abrirá WhatsApp para recordar el pago del 40%", { duration: 5000 });
        setTimeout(() => {
          window.open(data.paymentReminderWhatsApp as string, '_blank');
        }, 1500);
      }
      // Mostrar diálogo de WhatsApp si hay notificación disponible
      else if (data.whatsappNotification) {
        setWhatsAppMessage(data.whatsappNotification.message);
        setWhatsAppLink(data.whatsappNotification.whatsappLink);
        setWhatsAppPhone(data.whatsappNotification.phone);
        setShowWhatsAppDialog(true);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      toast.success("Foto subida exitosamente");
      setShowPhotoDialog(false);
      setPhotoForm({ stage: "", category: ["jefe_taller", "operario"].includes(user?.role || "") ? "avance" : "medidas", subcategory: "", photoUrl: "", description: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir foto");
    },
  });

  const deletePhoto = trpc.projectPhotos.delete.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      toast.success("Foto eliminada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar foto");
    },
  });

  const updateEstimatedDate = trpc.projects.updateEstimatedDate.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      utils.projects.list.invalidate();
      toast.success("Fecha estimada actualizada");
      setShowEditDateDialog(false);
      setEditDateForm({ estimatedInstallDate: "", reason: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar fecha");
    },
  });

  const createDetail = trpc.projectDetails.create.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      toast.success("Detalle agregado exitosamente");
      setShowDetailDialog(false);
      setDetailForm({ type: "nota_importante", title: "", content: "", photoUrl: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al agregar detalle");
    },
  });

  const uploadDesign = trpc.projects.uploadDesign.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      toast.success("Diseño actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar diseño");
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listPaginated.invalidate();
      toast.success("Proyecto eliminado exitosamente");
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar proyecto");
    },
  });

  // Mutations para archivar/desarchivar
  const archiveMutation = trpc.projects.archive.useMutation({
    onSuccess: () => {
      toast.success("Proyecto archivado correctamente");
      utils.projects.listPaginated.invalidate();
    },
    onError: (error: any) => {
      console.error("Archive project error:", error.message);
      toast.error(error.message || "Error al archivar proyecto");
    },
    onSettled: () => {
      setArchivingProjectId(null);
    }
  });

  const unarchiveMutation = trpc.projects.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Proyecto restaurado correctamente");
      utils.projects.listPaginated.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al restaurar proyecto");
      console.error("Unarchive error:", error);
    },
    onSettled: () => {
      setArchivingProjectId(null);
    }
  });

  const handleArchive = (projectId: number) => {
    setArchivingProjectId(projectId);
    archiveMutation.mutate({ projectId });
  };

  const handleUnarchive = (projectId: number) => {
    setArchivingProjectId(projectId);
    unarchiveMutation.mutate({ projectId });
  };

  // Mutation para retroceder estado
  const revertStatus = trpc.projects.revertStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado retrocedido correctamente");
      utils.projects.list.invalidate();
      utils.projects.listPaginated.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo retroceder el estado");
      console.error("Revert error:", error);
    },
  });

  const handleRevert = async (projectId: number, currentStatus: string) => {
    const confirmed = (await confirmAction(
      `Retroceder proyecto desde "${currentStatus}" al estado anterior?`
    ));

    if (!confirmed) return;

    try {
      await revertStatus.mutateAsync({ id: projectId });
    } catch (error: any) {
      // Error ya se maneja en onError
    }
  };

  const handleBulkDelete = async () => {
    for (const projectId of selectedProjects) {
      await deleteProject.mutateAsync({ id: projectId });
    }
    setSelectedProjects([]);
    setShowBulkDeleteDialog(false);
    toast.success(`${selectedProjects.length} proyecto(s) eliminado(s)`);
  };

  const toggleProjectSelection = (projectId: number) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: (_, variables) => {
      utils.projects.list.invalidate();
      utils.projects.listPaginated.invalidate();
      utils.projects.getById.invalidate();
      toast.success(variables.approved ? "Diseño aprobado exitosamente" : "Diseño rechazado, vuelve a diseño");
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la aprobación");
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  // Verificar permisos - solo admin, super_admin, comercial, diseñador, jefe_taller, operario
  const allowedRoles = ["admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario"];
  if (!isAuthenticated || !allowedRoles.includes(user?.role || "")) {
    setLocation("/");
    return null;
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.clientId || !createForm.name) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    await createProject.mutateAsync({
      clientId: parseInt(createForm.clientId),
      name: createForm.name,
      workType: createForm.workType,
      initialMeasurements: createForm.initialMeasurements || undefined,
    });
  };

  // Función para exportar proyecto a PDF
  const handleExportPdf = async (projectId: number, projectName: string) => {
    setGeneratingPdf(true);
    try {
      const response = await fetch(`/api/trpc/pdf.generateProjectReport?input=${encodeURIComponent(JSON.stringify({ projectId }))}`);
      const data = await response.json();
      
      if (data.result?.data?.html) {
        // Abrir en nueva ventana para imprimir/guardar como PDF
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(data.result.data.html);
          printWindow.document.close();
          printWindow.focus();
          // Dar tiempo para cargar imágenes antes de imprimir
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        }
      } else {
        toast.error("Error al generar el reporte");
      }
    } catch (error) {
      // Error controlado - se muestra toast al usuario
      toast.error("Error al exportar el proyecto");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    // Flujo completo según Ruta INNOVAR
    const flow: Record<string, string> = {
      contacto_inicial: "contacto",
      visita_medidas: "cotizacion_enviada",
      cotizacion_enviada: "cotizacion_aprobada",
      cotizacion_aprobada: "adelanto_recibido",
      adelanto_recibido: "en_diseno",
      en_diseno: "pendiente_modelado",
      pendiente_modelado: "pendiente_render",
      pendiente_cliente: "pendiente_render",
      pendiente_render: "aprobacion_final",
      aprobacion_final: "despiece",
      despiece: "corte",
      corte: "enchape",
      enchape: "ensamble",
      ensamble: "listo_instalacion",
      listo_instalacion: "trabajando_instalacion",
      trabajando_instalacion: "entregado",
    };
    return flow[currentStatus] || null;
  };

  const canAdvanceStatus = (status: string): boolean => {
    const role = user?.role;
    if (role === "super_admin" || role === "admin") return true;
    
    if (role === "disenador") {
      // Diseñador puede avanzar en estados de diseño
      return ["adelanto_recibido", "en_diseno", "aprobacion_final"].includes(status);
    }
    if (role === "jefe_taller") {
      return ["aprobacion_final", "corte", "enchape", "ensamble", "listo_instalacion", "trabajando_instalacion"].includes(status);
    }
    if (role === "operario") {
      return ["corte", "enchape", "ensamble"].includes(status);
    }
    return false;
  };

  const getStatusBadge = (status: string, modeladoRevisionNumber?: number | null, renderRevisionNumber?: number | null) => {
    const config = PROJECT_STATUSES[status];
    if (!config) return <Badge>{status}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {getStatusLabel(status, modeladoRevisionNumber, renderRevisionNumber)}
      </Badge>
    );
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Administrador",
      comercial: "Comercial",
      disenador: "Diseñador",
      jefe_taller: "Jefe de Taller",
      operario: "Operario",
      user: "Cliente",
    };
    return labels[role] || role;
  };

  return (
    <div>
      <div className="py-2 px-1">
        {/* Header con filtros y botón crear */}
        <PageHeader
          title="Proyectos"
          subtitle={
            user?.role === "disenador" ? "Proyectos pendientes de diseño" :
            (user?.role === "jefe_taller" || user?.role === "operario") ? "Proyectos en producción" :
            "Gestión completa de proyectos"
          }
          icon={<FolderKanban className="h-5 w-5" />}
          showBack={false}
          actions={
            (user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") ? (
              <div className="flex gap-2">
                {(user?.role === "admin" || user?.role === "super_admin") && (
                  <ReportExportButtons
                    filename={`Proyectos_${archiveTab === 'archived' ? 'Archivados' : 'Activos'}_${new Date().toISOString().slice(0, 10)}`}
                    emptyMessage="No hay proyectos para exportar"
                    load={async () => {
                      const archived = archiveTab === 'archived';
                      const rows = await utils.projects.exportList.fetch({ archived });
                      return rows.length ? buildProjectsListReport(rows, archived) : null;
                    }}
                  />
                )}
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  style={{ background: "var(--brand-gradient)" }}
                  className="text-white font-medium shadow-sm hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nuevo Proyecto
                </Button>
              </div>
            ) : undefined
          }
        />
        
        {/* Tabs de archivado */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit mb-4">
          <Button
            variant={archiveTab === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setArchiveTab('active')}
            className={`text-sm font-medium transition-colors ${
              archiveTab === 'active'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            En Curso
            {tabCounts?.active !== undefined && (
              <span className="ml-1.5 bg-teal-600/30 text-teal-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {tabCounts.active}
              </span>
            )}
          </Button>

          <Button
            variant={archiveTab === 'archived' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setArchiveTab('archived')}
            className={`text-sm font-medium transition-colors ${
              archiveTab === 'archived'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Archivados
            {tabCounts?.archived !== undefined && (
              <span className="ml-1.5 bg-teal-600/30 text-teal-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {tabCounts.archived}
              </span>
            )}
          </Button>

          {canSeeClosedTab && (
          <Button
            variant={archiveTab === 'closed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setArchiveTab('closed')}
            className={`text-sm font-medium transition-colors ${
              archiveTab === 'closed'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Cerrados
            {tabCounts?.closed !== undefined && (
              <span className="ml-1.5 bg-teal-600/30 text-teal-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {tabCounts.closed}
              </span>
            )}
          </Button>
          )}
        </div>
        
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div></div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Celular: estado y rentabilidad lado a lado; búsqueda a todo el ancho */}
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex">
              {/* Filtro por estado - filtrado según rol */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`w-full sm:w-[180px] ${(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") ? "" : "col-span-2"}`}>
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(PROJECT_STATUSES)
                  .filter(([key]) => {
                    // Jefe de taller: solo etapas desde diseño listo hasta entregado
                    if (user?.role === "jefe_taller") {
                      return ["pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "trabajando_instalacion", "entregado"].includes(key);
                    }
                    // Diseñador: ve todos los estados desde adelanto hasta entregado
                    if (user?.role === "disenador") {
                      return ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "trabajando_instalacion", "entregado"].includes(key);
                    }
                    // Operario: desde aprobacion_final hasta entrega
                    if (user?.role === "operario") {
                      return ["aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "trabajando_instalacion"].includes(key);
                    }
                    // Admin y super_admin ven todos
                    return true;
                  })
                  .map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filtro de rentabilidad */}
            {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (
              <Select value={profitFilter} onValueChange={setProfitFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Rentabilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda rentabilidad</SelectItem>
                  <SelectItem value="healthy">Saludable (mayor a 20%)</SelectItem>
                  <SelectItem value="moderate">Moderada (10-20%)</SelectItem>
                  <SelectItem value="risk">En Riesgo (menor a 15%)</SelectItem>
                  <SelectItem value="critical">Crítica (menor a 10%)</SelectItem>
                </SelectContent>
              </Select>
            )}
              </div>
            
            {/* Input de busqueda por cliente */}
            <Input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            
            {/* Saldo pendiente y atrasados: lado a lado en celular */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex">
            {/* Filtro de saldo pendiente */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Button
                variant={showPendingPaymentOnly ? "default" : "outline"}
                onClick={() => {
                  setShowPendingPaymentOnly(!showPendingPaymentOnly);
                  if (!showPendingPaymentOnly) setShowOverdueOnly(false);
                }}
                className={`w-full sm:w-auto px-2 sm:px-4 ${showPendingPaymentOnly ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              >
                <AlertCircle className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                Saldo pendiente
              </Button>
            )}

            {/* Filtro de proyectos atrasados (jefe de taller, operario, admin) */}
            {(user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "admin" || user?.role === "super_admin") && (
              <Button
                variant={showOverdueOnly ? "default" : "outline"}
                onClick={() => {
                  setShowOverdueOnly(!showOverdueOnly);
                  if (!showOverdueOnly) setShowPendingPaymentOnly(false);
                }}
                className={`w-full sm:w-auto px-2 sm:px-4 ${(user?.role === "admin" || user?.role === "super_admin") ? "" : "col-span-2"} ${showOverdueOnly ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-300 text-red-400 hover:bg-red-500/10"}`}
              >
                <AlertCircle className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                Atrasados +5 días
              </Button>
            )}
            </div>

            {/* Botón eliminar seleccionados (solo admin) */}
            {(user?.role === "admin" || user?.role === "super_admin") && selectedProjects.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedProjects.length})
              </Button>
            )}

            {/* Contador de proyectos filtrados */}
            <div className="text-xs sm:text-sm text-muted-foreground w-full sm:w-auto sm:ml-auto text-right">
              Mostrando {filteredProjects.length} de {projects.length} proyectos
              {profitFilter !== "all" && (
                <span className="ml-2">
                  (Filtro: {profitFilter === "healthy" ? "Saludable" : profitFilter === "moderate" ? "Moderada" : profitFilter === "risk" ? "En Riesgo" : "Crítica"})
                </span>
              )}
            </div>

            {/* Distribución de Rentabilidad — solo admin, super_admin y comercial. Una sola fila de 4, a todo el ancho;
                tocar una casilla filtra la lista por ese nivel (tocar de nuevo quita el filtro). */}
            {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (() => {
              const healthy = projects.filter((p: any) => (p.rentabilidad ?? 0) > 20).length;
              const moderate = projects.filter((p: any) => (p.rentabilidad ?? 0) >= 10 && (p.rentabilidad ?? 0) <= 20).length;
              const risk = projects.filter((p: any) => (p.rentabilidad ?? 0) >= 5 && (p.rentabilidad ?? 0) < 10).length;
              const critical = projects.filter((p: any) => (p.rentabilidad ?? 0) < 5).length;
              const levels = [
                { key: "healthy", n: healthy, label: "Saludable", range: "más de 20%", color: "var(--success)" },
                { key: "moderate", n: moderate, label: "Moderado", range: "10-20%", color: "var(--warning)" },
                { key: "risk", n: risk, label: "En riesgo", range: "5-10%", color: "var(--color-orange-500, #f97316)" },
                { key: "critical", n: critical, label: "Crítico", range: "menos de 5%", color: "var(--destructive)" },
              ];

              return (
                <div className="w-full mt-2 rounded-xl border border-border bg-card" style={{ borderTop: "3px solid var(--success)" }}>
                  <div className="px-3 sm:px-5 pt-3 pb-0">
                    <h3 className="text-sm font-semibold text-foreground/85">Distribución de rentabilidad</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-3 p-2.5 sm:p-4">
                    {levels.map((l) => {
                      const on = profitFilter === l.key;
                      return (
                        <button
                          key={l.key}
                          type="button"
                          onClick={() => setProfitFilter(on ? "all" : l.key)}
                          title={`Ver solo ${l.label.toLowerCase()} (${l.range})`}
                          className={`rounded-lg px-1 py-2 sm:p-4 flex flex-col items-center justify-center text-center transition-shadow ${on ? "ring-2" : ""}`}
                          style={{
                            background: `color-mix(in srgb, ${l.color} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${l.color} 30%, transparent)`,
                            ...(on ? { boxShadow: `0 0 0 2px ${l.color}` } : {}),
                          }}
                        >
                          <span className="text-lg sm:text-2xl font-bold leading-none" style={{ color: l.color }}>{l.n}</span>
                          <span className="text-[11px] sm:text-xs font-medium mt-1 leading-tight" style={{ color: l.color }}>{l.label}</span>
                          <span className="text-[10px] mt-0.5 hidden sm:block text-muted-foreground">{l.range}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Botones de acción (solo admin) */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                    <DialogDescription>
                      Crea un proyecto a partir de una cotización aprobada
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cliente *</Label>
                      <Select 
                        value={createForm.clientId} 
                        onValueChange={(v) => setCreateForm({ ...createForm, clientId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name} - {client.whatsappPhone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nombre del Proyecto *</Label>
                      <Input
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Ej: Cocina Familia García"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Trabajo</Label>
                      <Select 
                        value={createForm.workType} 
                        onValueChange={(v: any) => setCreateForm({ ...createForm, workType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORK_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Medidas Iniciales</Label>
                      <Textarea
                        value={createForm.initialMeasurements}
                        onChange={(e) => setCreateForm({ ...createForm, initialMeasurements: e.target.value })}
                        placeholder="Describe las medidas del espacio..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createProject.isPending}>
                        {createProject.isPending ? "Creando..." : "Crear Proyecto"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              </>
            )}
            </div>
          </div>
        </div>

        {/* Próximos trabajos — "El rancho ardiendo" (solo jefe_taller): lista completa, no depende de pestañas ni de la página */}
        {user?.role === "jefe_taller" && <RanchoArdiendoCards projects={ranchoProjects as any[]} />}

        {/* Lista de proyectos - clic abre modal de detalle */}
        {loadingProjects ? (
          <div className="text-center py-8">Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay proyectos disponibles</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredProjects
              .filter((project: any) => {
                // Filtro de saldo pendiente: proyectos entregados con saldo > 0
                if (showPendingPaymentOnly) {
                  const isDelivered = project.status === "entregado";
                  const hasPendingPayment = project.quotation?.total && 
                    (project.actualPaid || 0) < project.quotation.total;
                  return isDelivered && hasPendingPayment;
                }
                // Filtro de proyectos atrasados (más de 5 días en etapa de producción)
                if (showOverdueOnly) {
                  const productionStatuses = ["despiece", "corte", "enchape", "ensamble"];
                  if (!productionStatuses.includes(project.status)) return false;
                  const lastChange = project.statusChangedAt ? new Date(project.statusChangedAt) : new Date(project.createdAt);
                  const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
                  return daysSinceChange > 5;
                }
                return true;
              })
              .map((project: any) => (
              <div key={project.id}>
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-all hover:ring-1 hover:ring-primary/50`}
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      {/* Info básica */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg break-words min-w-0 max-w-[200px] sm:max-w-none">
                            {project.client?.name || "Cliente"}
                          </h3>
                          <p className="text-xs text-gray-500 break-words min-w-0 max-w-[200px] sm:max-w-none">
                            {project.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getStatusBadge(project.status, (project as any).modeladoRevisionNumber, (project as any).renderRevisionNumber)}
                          {/* Indicador de Nuevo para Producción (aprobado en las últimas 48 horas) */}
                          {["aprobacion_final", "despiece"].includes(project.status) && 
                           (project as any).rendersApprovedAt && 
                           ((Date.now() - new Date((project as any).rendersApprovedAt).getTime()) / (1000 * 60 * 60)) <= 48 && (
                            <Badge 
                              className="bg-gradient-to-r from-green-500 to-green-500 text-white text-xs animate-pulse"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Nuevo
                            </Badge>
                          )}
                          {/* Indicador de revisiones de renders */}
                          {(project as any).renderRevisionNumber > 0 && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                (project as any).renderRevisionNumber >= 3 
                                  ? "border-red-500 text-red-400 bg-red-500/10" 
                                  : (project as any).renderRevisionNumber >= 2 
                                    ? "border-amber-500 text-amber-400 bg-amber-500/10" 
                                    : "border-blue-500 text-blue-400 bg-blue-500/10"
                              }`}
                            >
                              🎨 {(project as any).renderRevisionNumber} Rev{(project as any).renderRevisionNumber > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-1">
                          <p className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {WORK_TYPES[project.workType as keyof typeof WORK_TYPES]}
                          </p>
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.createdAt).toLocaleDateString("es-CO")}
                          </p>
                          {/* Rentabilidad con codigo de colores */}
                          {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "comercial") && (
                            <p className="flex items-center gap-1" title="Rentabilidad del proyecto">
                              <span>💰</span>
                              {(() => {
                                const rent = Number((project as any).rentabilidad ?? 0)
                                let colorClass = "text-gray-500";
                                if (rent > 20) {
                                  colorClass = "text-green-400 font-semibold";
                                } else if (rent >= 10) {
                                  colorClass = "text-amber-400 font-semibold";
                                } else {
                                  colorClass = "text-red-400 font-semibold";
                                }
                                return <span className={colorClass}>{rent.toFixed(1)}%</span>;
                              })()}
                            </p>
                          )}
                          {/* Fecha tentativa (rojo) */}
                          {(project as any).tentativeInstallDate && !(project as any).isInstallDateOfficial && project.status !== "entregado" && (
                            <p className="flex items-center gap-1 font-medium text-red-400">
                              <Truck className="h-3 w-3" />
                              🟥 Tentativa: {new Date((project as any).tentativeInstallDate).toLocaleDateString("es-CO")}
                            </p>
                          )}
                          {/* Fecha oficial (verde) */}
                          {project.estimatedInstallDate && (project as any).isInstallDateOfficial && project.status !== "entregado" && (
                            <p className={`flex items-center gap-1 font-medium ${
                              new Date(project.estimatedInstallDate) < new Date() 
                                ? "text-red-400" 
                                : "text-green-400"
                            }`}>
                              <Truck className="h-3 w-3" />
                              🟩 Oficial: {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO")}
                              {new Date(project.estimatedInstallDate) < new Date() && " ⚠️"}
                            </p>
                          )}
                          {/* Fallback para proyectos antiguos */}
                          {project.estimatedInstallDate && (project as any).isInstallDateOfficial === undefined && project.status !== "entregado" && (
                            <p className={`flex items-center gap-1 font-medium ${
                              new Date(project.estimatedInstallDate) < new Date() 
                                ? "text-red-400" 
                                : "text-green-400"
                            }`}>
                              <Truck className="h-3 w-3" />
                              Entrega: {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO")}
                              {new Date(project.estimatedInstallDate) < new Date() && " ⚠️"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Checkbox para selección múltiple */}
                        {(user?.role === "admin" || user?.role === "super_admin") && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-white/[0.15] text-primary focus:ring-primary cursor-pointer"
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                          />
                        )}
                        {canAdvanceStatus(project.status) && getNextStatus(project.status) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const nextStatus = getNextStatus(project.status);
                              if (nextStatus) {
                                // Si es pendiente_render, mostrar confirmación antes de avanzar
                                if (project.status === "pendiente_render") {
                                  setProjectToAdvance(project);
                                  setShowAdvanceConfirmDialog(true);
                                } else {
                                  updateStatus.mutate({
                                    projectId: project.id,
                                    newStatus: nextStatus as any,
                                  });
                                }
                              }
                            }}
                            disabled={updateStatus.isPending}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Avanzar
                          </Button>
                        )}
                        {/* Botón eliminar individual */}
                        {(user?.role === "admin" || user?.role === "super_admin") && (
                          <>
                            {archiveTab === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={archivingProjectId === project.id}
                                onClick={() => handleArchive(project.id)}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">Archivar</span>
                              </Button>
                            )}
                            {archiveTab === 'archived' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={archivingProjectId === project.id}
                                onClick={() => handleUnarchive(project.id)}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">Restaurar</span>
                              </Button>
                            )}
                            {user?.role === "admin" || user?.role === "super_admin" ? (
                              (project as any).status !== "contacto_inicial" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground hover:bg-accent"
                                  onClick={() => handleRevert(project.id, (project as any).status)}
                                  title="Retroceder al estado anterior"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  <span className="hidden md:inline">Retroceder</span>
                                </Button>
                              )
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => {
                                setProjectToDelete(project);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Visor de archivos (imágenes y PDFs) */}
      <FileViewer
        files={fileViewer.files}
        initialIndex={fileViewer.initialIndex}
        isOpen={fileViewer.isOpen}
        onClose={fileViewer.closeViewer}
      />

      {/* Diálogo de notificación WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Notificar al Cliente por WhatsApp
            </DialogTitle>
            <DialogDescription>
              El estado del proyecto ha sido actualizado. Puedes enviar una notificación al cliente por WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Teléfono:</span>
              <span className="font-medium text-foreground">{whatsAppPhone}</span>
            </div>

            <div className="space-y-2">
              <Label>Mensaje (puedes editarlo antes de enviar)</Label>
              <Textarea
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowWhatsAppDialog(false)}
              >
                Cerrar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const phone = whatsAppPhone.replace(/\D/g, "");
                  const phoneWithCountry = phone.startsWith("57") ? phone : `57${phone}`;
                  const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(whatsAppMessage)}`;
                  window.open(url, "_blank");
                  setShowWhatsAppDialog(false);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar por WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Diálogo de confirmación para eliminar proyecto individual */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Eliminar Proyecto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el proyecto <strong>"{projectToDelete?.name}"</strong>?
              <br /><br />
              Esta acción eliminará permanentemente:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Todas las fotos del proyecto</li>
                <li>Todos los detalles y notas</li>
                <li>Todo el historial</li>
              </ul>
              <br />
              <strong className="text-red-400">Esta acción no se puede deshacer.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => projectToDelete && deleteProject.mutate({ id: projectToDelete.id })}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Eliminando..." : "Sí, Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar múltiples proyectos */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Eliminar {selectedProjects.length} Proyecto(s)</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{selectedProjects.length} proyecto(s)</strong>?
              <br /><br />
              Esta acción eliminará permanentemente todos los datos asociados a estos proyectos.
              <br /><br />
              <strong className="text-red-400">Esta acción no se puede deshacer.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Eliminando..." : `Sí, Eliminar ${selectedProjects.length} Proyecto(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para avanzar a Diseño Aprobado */}
      <Dialog open={showAdvanceConfirmDialog} onOpenChange={setShowAdvanceConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Diseño Aprobado
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                Estás a punto de marcar el proyecto <strong>"{projectToAdvance?.clientName}"</strong> como <strong>Diseño Aprobado</strong>.
              </p>
              {projectToAdvance?.renderRevisionNumber && projectToAdvance.renderRevisionNumber > 1 && (
                <p className="text-amber-400 font-medium">
                  ⚠️ Este proyecto ha tenido {projectToAdvance.renderRevisionNumber} revisiones de renders.
                </p>
              )}
              <p>
                Esto significa que el cliente ha aprobado los renders y el proyecto pasará a la etapa de <strong>producción</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                ¿Confirmas que el cliente aprobó los renders?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowAdvanceConfirmDialog(false);
              setProjectToAdvance(null);
            }}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (projectToAdvance) {
                  updateStatus.mutate({
                    projectId: projectToAdvance.id,
                    newStatus: "aprobacion_final" as any,
                  });
                  setShowAdvanceConfirmDialog(false);
                  setProjectToAdvance(null);
                }
              }}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Avanzando..." : "Sí, Cliente Aprobó"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
