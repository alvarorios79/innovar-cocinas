import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { FileViewer, useFileViewer } from "@/components/FileViewer";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
import { ProjectInlineDetail } from "@/components/ProjectInlineDetail";

// Estados del proyecto según Ruta INNOVAR
const PROJECT_STATUSES = {
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Adelanto Recibido", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: Paintbrush },
  pendiente_cliente: { label: "Diseño Listo", color: "bg-yellow-500", icon: AlertCircle },
  aprobacion_final: { label: "Aprobación Final", color: "bg-green-400", icon: CheckCircle2 },
  corte: { label: "En Corte", color: "bg-orange-500", icon: Hammer },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: Paintbrush },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: Package },
  listo_instalacion: { label: "Listo para Instalación", color: "bg-teal-500", icon: Truck },
  instalacion_programada: { label: "Instalación Programada", color: "bg-teal-600", icon: Truck },
  entregado: { label: "Entregado", color: "bg-green-700", icon: CheckCircle2 },
};

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
  
  const { data: projects = [], isLoading: loadingProjects } = trpc.projects.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: projectDetail } = trpc.projects.getById.useQuery(
    { id: selectedProject?.id },
    { enabled: !!selectedProject?.id }
  );

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
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
      setPhotoForm({ stage: "", category: "medidas", subcategory: "", photoUrl: "", description: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir foto");
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
      toast.success("Proyecto eliminado exitosamente");
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar proyecto");
    },
  });

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
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar el proyecto");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    // Flujo según Ruta INNOVAR
    const flow: Record<string, string> = {
      cotizacion_enviada: "cotizacion_aprobada",
      cotizacion_aprobada: "adelanto_recibido",
      adelanto_recibido: "en_diseno",
      en_diseno: "pendiente_cliente",
      // pendiente_cliente -> aprobacion_final (se hace con approveDesign)
      aprobacion_final: "corte",
      corte: "enchape",
      enchape: "ensamble",
      ensamble: "listo_instalacion",
      listo_instalacion: "instalacion_programada",
      instalacion_programada: "entregado",
    };
    return flow[currentStatus] || null;
  };

  const canAdvanceStatus = (status: string): boolean => {
    const role = user?.role;
    if (role === "super_admin" || role === "admin") return true;
    
    if (role === "disenador") {
      return ["adelanto_recibido", "en_diseno"].includes(status);
    }
    if (role === "jefe_taller") {
      return ["aprobacion_final", "corte", "enchape", "ensamble", "listo_instalacion", "instalacion_programada"].includes(status);
    }
    if (role === "operario") {
      return ["corte", "enchape", "ensamble"].includes(status);
    }
    return false;
  };

  const getStatusBadge = (status: string) => {
    const config = PROJECT_STATUSES[status as keyof typeof PROJECT_STATUSES];
    if (!config) return <Badge>{status}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <span className="hidden sm:inline">← Inicio</span>
                <span className="sm:hidden">←</span>
              </Button>
            </Link>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Link href="/admin" className="hidden md:block">
                <Button variant="ghost" size="sm">Panel Admin</Button>
              </Link>
            )}
            <img 
              src="/logo-light.png" 
              alt="INNOVAR" 
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="hidden lg:inline text-sm text-muted-foreground">Gestión de Proyectos</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Badge variant="outline" className="text-xs md:text-sm">{getRoleLabel(user?.role || "")}</Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[100px] md:max-w-none">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Header con filtros y botón crear */}
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <FolderKanban className="h-5 w-5 md:h-6 md:w-6" />
                Proyectos
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.role === "disenador" && "Proyectos pendientes de diseño"}
                {(user?.role === "jefe_taller" || user?.role === "operario") && "Proyectos en producción"}
                {(user?.role === "admin" || user?.role === "super_admin") && "Todos los proyectos"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Filtro por estado - filtrado según rol */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(PROJECT_STATUSES)
                  .filter(([key]) => {
                    // Jefe de taller: solo etapas desde diseño listo hasta entregado
                    if (user?.role === "jefe_taller") {
                      return ["pendiente_cliente", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "instalacion_programada", "entregado"].includes(key);
                    }
                    // Diseñador: solo etapas de diseño
                    if (user?.role === "disenador") {
                      return ["adelanto_recibido", "en_diseno", "pendiente_cliente", "aprobacion_final", "despiece"].includes(key);
                    }
                    // Operario: solo etapas de producción
                    if (user?.role === "operario") {
                      return ["despiece", "corte", "enchape", "ensamble", "listo_instalacion"].includes(key);
                    }
                    // Admin y super_admin ven todos
                    return true;
                  })
                  .map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filtro de saldo pendiente */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Button
                variant={showPendingPaymentOnly ? "default" : "outline"}
                onClick={() => {
                  setShowPendingPaymentOnly(!showPendingPaymentOnly);
                  if (!showPendingPaymentOnly) setShowOverdueOnly(false);
                }}
                className={showPendingPaymentOnly ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Saldo Pendiente
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
                className={showOverdueOnly ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-300 text-red-600 hover:bg-red-50"}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                ⚠️ Atrasados (+5 días)
              </Button>
            )}

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

            {/* Botón crear (solo admin) */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Proyecto
                  </Button>
                </DialogTrigger>
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
            )}
            </div>
          </div>
        </div>

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
            {projects
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
                  className={`cursor-pointer hover:shadow-md transition-all ${expandedProjectId === project.id ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-1 hover:ring-primary/50'}`}
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      {/* Info básica */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg truncate max-w-[200px] sm:max-w-none">
                            {project.name}
                          </h3>
                          {getStatusBadge(project.status)}
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1">
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {project.client?.name || "N/A"}
                          </p>
                          <p className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {WORK_TYPES[project.workType as keyof typeof WORK_TYPES]}
                          </p>
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.createdAt).toLocaleDateString("es-CO")}
                          </p>
                          {/* Fecha tentativa (rojo) */}
                          {(project as any).tentativeInstallDate && !(project as any).isInstallDateOfficial && project.status !== "entregado" && (
                            <p className="flex items-center gap-1 font-medium text-red-600">
                              <Truck className="h-3 w-3" />
                              🟥 Tentativa: {new Date((project as any).tentativeInstallDate).toLocaleDateString("es-CO")}
                            </p>
                          )}
                          {/* Fecha oficial (verde) */}
                          {project.estimatedInstallDate && (project as any).isInstallDateOfficial && project.status !== "entregado" && (
                            <p className={`flex items-center gap-1 font-medium ${
                              new Date(project.estimatedInstallDate) < new Date() 
                                ? "text-red-600" 
                                : "text-green-600"
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
                                ? "text-red-600" 
                                : "text-green-600"
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
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
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
                                updateStatus.mutate({
                                  projectId: project.id,
                                  newStatus: nextStatus as any,
                                });
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setProjectToDelete(project);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          {expandedProjectId === project.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detalle expandido inline */}
                {expandedProjectId === project.id && (
                  <ProjectInlineDetail
                    project={project}
                    user={user}
                    onCollapse={() => setExpandedProjectId(null)}
                    onExportPdf={handleExportPdf}
                    generatingPdf={generatingPdf}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de detalle del proyecto */}
        <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedProject?.name}
                {selectedProject && getStatusBadge(selectedProject.status)}
              </DialogTitle>
              <DialogDescription className="flex items-center justify-between">
                <span>{WORK_TYPES[selectedProject?.workType as keyof typeof WORK_TYPES]} - {selectedProject?.client?.name}</span>
                <div className="flex gap-2">
                  {/* Botón WhatsApp manual */}
                  {selectedProject?.client?.whatsappPhone && (user?.role === "admin" || user?.role === "super_admin") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => {
                        const baseUrl = window.location.origin;
                        const portalUrl = `${baseUrl}/portal?project=${selectedProject.id}`;
                        const workTypeLabel = WORK_TYPES[selectedProject.workType as keyof typeof WORK_TYPES] || selectedProject.workType;
                        const statusLabel = PROJECT_STATUSES[selectedProject.status as keyof typeof PROJECT_STATUSES]?.label || selectedProject.status;
                        
                        const message = `Hola ${selectedProject.client.name}, te escribimos de INNOVAR Cocinas Integrales.\n\nTu proyecto "${selectedProject.name}" (${workTypeLabel}) está en estado: ${statusLabel}.\n\nPuedes ver el seguimiento en:\n${portalUrl}\n\n¿Tienes alguna pregunta?`;
                        
                        setWhatsAppMessage(message);
                        setWhatsAppPhone(selectedProject.client.whatsappPhone);
                        setShowWhatsAppDialog(true);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedProject && handleExportPdf(selectedProject.id, selectedProject.name)}
                    disabled={generatingPdf}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {generatingPdf ? "Generando..." : "Exportar PDF"}
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Acciones según estado y rol */}
            {projectDetail && projectDetail.status === "pendiente_cliente" && 
              (user?.role === "admin" || user?.role === "super_admin") && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pendiente de Aprobación del Cliente
                </h4>
                <p className="text-sm text-yellow-700 mb-4">
                  Puedes aprobar el diseño en nombre del cliente si este no usa la aplicación.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveDesign.mutate({ projectId: projectDetail.id, approved: true })}
                    disabled={approveDesign.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Aprobar Diseño
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const notes = prompt("Indica qué cambios se necesitan:");
                      if (notes) {
                        approveDesign.mutate({ projectId: projectDetail.id, approved: false, notes });
                      }
                    }}
                    disabled={approveDesign.isPending}
                  >
                    Solicitar Cambios
                  </Button>
                </div>
              </div>
            )}

            {projectDetail && (
              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="flex flex-wrap sm:grid sm:grid-cols-5 w-full gap-1 h-auto p-1">
                  <TabsTrigger value="info" className="text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white">Información</TabsTrigger>
                  <TabsTrigger value="materials" className="text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-purple-500 data-[state=active]:text-white">Materiales</TabsTrigger>
                  <TabsTrigger value="photos" className="text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-green-500 data-[state=active]:text-white">Fotos</TabsTrigger>
                  <TabsTrigger value="details" className="text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">Detalles</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-gray-600 data-[state=active]:text-white">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><strong>Nombre:</strong> {projectDetail.client?.name}</p>
                      {user?.role !== "disenador" && (
                        <>
                          <p><strong>Teléfono:</strong> {projectDetail.client?.whatsappPhone}</p>
                          <p><strong>Email:</strong> {projectDetail.client?.email || "N/A"}</p>
                        </>
                      )}
                      <p><strong>Dirección:</strong> {projectDetail.client?.address || "N/A"}</p>
                    </CardContent>
                  </Card>

                  {/* Fechas importantes del proyecto */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Fechas del Proyecto
                        </CardTitle>
                        {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "jefe_taller") && projectDetail.status !== "entregado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditDateForm({
                                estimatedInstallDate: projectDetail.estimatedInstallDate 
                                  ? new Date(projectDetail.estimatedInstallDate).toISOString().split('T')[0]
                                  : "",
                                reason: "",
                              });
                              setShowEditDateDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {/* Fechas de la cotización */}
                      {(projectDetail as any).quotation?.createdAt && (
                        <p><strong>Cotización creada:</strong> {new Date((projectDetail as any).quotation.createdAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {(projectDetail as any).quotation?.validUntil && (
                        <p><strong>Validez cotización:</strong> {new Date((projectDetail as any).quotation.validUntil).toLocaleDateString("es-CO")}</p>
                      )}
                      <p><strong>Proyecto creado:</strong> {new Date(projectDetail.createdAt).toLocaleDateString("es-CO")}</p>
                      {projectDetail.quotationSentAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                        <p><strong>Cotización enviada:</strong> {new Date(projectDetail.quotationSentAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.quotationApprovedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                        <p><strong>Cotización aprobada:</strong> {new Date(projectDetail.quotationApprovedAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.advanceReceivedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                        <p><strong>Adelanto recibido:</strong> {new Date(projectDetail.advanceReceivedAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.advanceReceiptUrl && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-1">Comprobante de pago:</p>
                          <a 
                            href={projectDetail.advanceReceiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            Ver comprobante
                          </a>
                        </div>
                      )}
                      {(projectDetail as any).quotationPdfUrl && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">Cotización aprobada:</p>
                          <a 
                            href={(projectDetail as any).quotationPdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            Ver PDF de cotización
                          </a>
                        </div>
                      )}
                      {projectDetail.designDeadline && (
                        <p className={new Date(projectDetail.designDeadline) < new Date() && projectDetail.status === "en_diseno" ? "text-red-600 font-medium" : ""}>
                          <strong>Límite diseño:</strong> {new Date(projectDetail.designDeadline).toLocaleDateString("es-CO")}
                          {new Date(projectDetail.designDeadline) < new Date() && projectDetail.status === "en_diseno" && " (Vencido)"}
                        </p>
                      )}
                      {projectDetail.designDeliveredAt && (
                        <p><strong>Diseño entregado:</strong> {new Date(projectDetail.designDeliveredAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.clientApprovedAt && (
                        <p><strong>Aprobación cliente:</strong> {new Date(projectDetail.clientApprovedAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {/* Fecha TENTATIVA (rojo) - solo si no hay fecha oficial */}
                      {(projectDetail as any).tentativeInstallDate && !(projectDetail as any).isInstallDateOfficial && projectDetail.status !== "entregado" && (
                        <p className="font-medium text-red-600">
                          <strong>🟥 Fecha tentativa:</strong> {new Date((projectDetail as any).tentativeInstallDate).toLocaleDateString("es-CO")}
                          <span className="text-xs ml-1">(pendiente aprobación diseños)</span>
                        </p>
                      )}
                      {/* Fecha OFICIAL (verde) - cuando el cliente aprobó diseños */}
                      {projectDetail.estimatedInstallDate && (projectDetail as any).isInstallDateOfficial && projectDetail.status !== "entregado" && (
                        <p className={`font-medium ${
                          new Date(projectDetail.estimatedInstallDate) < new Date() 
                            ? "text-red-600" 
                            : new Date(projectDetail.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}>
                          <strong>🟩 Fecha oficial:</strong> {new Date(projectDetail.estimatedInstallDate).toLocaleDateString("es-CO")}
                          {new Date(projectDetail.estimatedInstallDate) < new Date() && " (Vencida)"}
                        </p>
                      )}
                      {/* Fallback para proyectos antiguos sin el nuevo sistema */}
                      {projectDetail.estimatedInstallDate && (projectDetail as any).isInstallDateOfficial === undefined && projectDetail.status !== "entregado" && (
                        <p className={`font-medium ${
                          new Date(projectDetail.estimatedInstallDate) < new Date() 
                            ? "text-red-600" 
                            : new Date(projectDetail.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}>
                          <strong>Entrega estimada:</strong> {new Date(projectDetail.estimatedInstallDate).toLocaleDateString("es-CO")}
                          {new Date(projectDetail.estimatedInstallDate) < new Date() && " (Vencida)"}
                        </p>
                      )}
                      {projectDetail.scheduledInstallDate && projectDetail.status !== "entregado" && (
                        <p className="text-blue-600 font-medium">
                          <strong>Instalación programada:</strong> {new Date(projectDetail.scheduledInstallDate).toLocaleDateString("es-CO")}
                        </p>
                      )}
                      {projectDetail.deliveredAt && (
                        <p className="text-green-600 font-medium">
                          <strong>Entregado:</strong> {new Date(projectDetail.deliveredAt).toLocaleDateString("es-CO")}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {projectDetail.initialMeasurements && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Medidas Iniciales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{projectDetail.initialMeasurements}</p>
                      </CardContent>
                    </Card>
                  )}

                  {(projectDetail.design3dFiles || projectDetail.despieceFiles) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Archivos de Diseño</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {projectDetail.design3dFiles && (
                          <div>
                            <strong className="text-sm">Diseño 3D:</strong>
                            <p className="text-sm text-muted-foreground">{projectDetail.design3dFiles}</p>
                          </div>
                        )}
                        {projectDetail.despieceFiles && (
                          <div>
                            <strong className="text-sm">Despiece:</strong>
                            <p className="text-sm text-muted-foreground">{projectDetail.despieceFiles}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="materials" className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Materiales Base</h3>
                      <MaterialsForm projectId={projectDetail.id} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Herrajes del Proyecto</h3>
                      <HardwareSelector projectId={projectDetail.id} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="space-y-4">
                  {/* Filtro por categoría y botón para subir foto */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        variant={categoryFilter === "all" ? "default" : "outline"}
                        onClick={() => { setCategoryFilter("all"); setSubcategoryFilter("all"); }}
                        className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                      >
                        Todas
                      </Button>
                      {[
                        { value: "cotizacion", label: "Cotización" },
                        { value: "medidas", label: "Medidas" },
                        { value: "disenos", label: "Diseños" },
                        { value: "avance", label: "Avance" },
                        { value: "instalacion", label: "Instalación" },
                        { value: "entrega", label: "Entrega" },
                      ].map((cat) => (
                        <Button
                          key={cat.value}
                          size="sm"
                          variant={categoryFilter === cat.value ? "default" : "outline"}
                          onClick={() => { setCategoryFilter(cat.value); setSubcategoryFilter("all"); }}
                          className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                    {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial" ||
                      user?.role === "disenador" || user?.role === "jefe_taller" || user?.role === "operario") && (
                      <Button
                        size="sm"
                        onClick={() => setShowPhotoDialog(true)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Subir Foto
                      </Button>
                    )}
                  </div>

                  {/* Filtro de subcategorías dinámico según categoría seleccionada */}
                  {categoryFilter !== "all" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        size="sm"
                        variant={subcategoryFilter === "all" ? "secondary" : "ghost"}
                        onClick={() => setSubcategoryFilter("all")}
                        className="h-7 text-xs"
                      >
                        Todas
                      </Button>
                      {categoryFilter === "cotizacion" && (
                        <Button
                          size="sm"
                          variant={subcategoryFilter === "documento_cotizacion" ? "secondary" : "ghost"}
                          onClick={() => setSubcategoryFilter("documento_cotizacion")}
                          className="h-7 text-xs"
                        >
                          Documento
                        </Button>
                      )}
                      {categoryFilter === "medidas" && (
                        <>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "fotos_iniciales" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("fotos_iniciales")}
                            className="h-7 text-xs"
                          >
                            Fotos Iniciales
                          </Button>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "dibujo" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("dibujo")}
                            className="h-7 text-xs"
                          >
                            Dibujo
                          </Button>
                        </>
                      )}
                      {categoryFilter === "disenos" && (
                        <>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "renders" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("renders")}
                            className="h-7 text-xs"
                          >
                            Renders
                          </Button>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "despieces" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("despieces")}
                            className="h-7 text-xs"
                          >
                            Despieces
                          </Button>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "detalles" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("detalles")}
                            className="h-7 text-xs"
                          >
                            Detalles
                          </Button>
                        </>
                      )}
                      {categoryFilter === "avance" && (
                        <>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "corte" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("corte")}
                            className="h-7 text-xs"
                          >
                            Corte
                          </Button>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "enchape" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("enchape")}
                            className="h-7 text-xs"
                          >
                            Enchape
                          </Button>
                          <Button
                            size="sm"
                            variant={subcategoryFilter === "armado" ? "secondary" : "ghost"}
                            onClick={() => setSubcategoryFilter("armado")}
                            className="h-7 text-xs"
                          >
                            Armado
                          </Button>
                        </>
                      )}
                      {categoryFilter === "instalacion" && (
                        <Button
                          size="sm"
                          variant={subcategoryFilter === "proceso_instalacion" ? "secondary" : "ghost"}
                          onClick={() => setSubcategoryFilter("proceso_instalacion")}
                          className="h-7 text-xs"
                        >
                          Proceso
                        </Button>
                      )}
                      {categoryFilter === "entrega" && (
                        <Button
                          size="sm"
                          variant={subcategoryFilter === "fotos_finales" ? "secondary" : "ghost"}
                          onClick={() => setSubcategoryFilter("fotos_finales")}
                          className="h-7 text-xs"
                        >
                          Fotos Finales
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Mapeo de categorías a etapas */}
                  {(() => {
                    // Definir qué subcarpetas corresponden a cada categoría
                    // Ahora usamos subcategorías como carpetas en lugar de etapas
                    const categoryToFolders: Record<string, string[]> = {
                      cotizacion: ["documento_cotizacion"], // Documento
                      medidas: ["fotos_iniciales", "dibujo"], // Fotos Iniciales + Dibujo
                      disenos: ["modelado", "renders", "detalles", "despieces"], // Modelado, Renders, Detalles, Despieces
                      avance: ["corte", "enchape", "armado"], // Corte, Enchape, Armado
                      instalacion: ["proceso_instalacion"], // Proceso
                      entrega: ["fotos_finales"], // Fotos Finales
                    };
                    
                    // Todas las subcarpetas disponibles
                    const allFolders = [
                      "documento_cotizacion", "fotos_iniciales", "dibujo",
                      "renders", "despieces", "detalles",
                      "corte", "enchape", "armado",
                      "proceso_instalacion", "fotos_finales"
                    ];
                    
                    // Permisos de visualización por carpeta según rol
                    const viewPermissions: Record<string, string[]> = {
                      // Cotización/Documento: Super Admin, Admin y Comercial
                      documento_cotizacion: ["super_admin", "admin", "comercial"],
                      // Medidas: Super Admin, Admin, Comercial, Diseñador, Jefe Taller
                      fotos_iniciales: ["super_admin", "admin", "comercial", "disenador", "jefe_taller"],
                      dibujo: ["disenador", "jefe_taller", "super_admin", "admin", "comercial"],
                      // Diseños: Super Admin, Admin, Comercial, Jefe Taller, Operario
                      renders: ["super_admin", "admin", "comercial", "jefe_taller", "operario"],
                      despieces: ["super_admin", "admin", "comercial", "jefe_taller", "operario"],
                      detalles: ["super_admin", "admin", "comercial", "jefe_taller", "operario"],
                      // Avance: Todos (incluido Cliente)
                      corte: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario", "user"],
                      enchape: ["super_admin", "admin", "disenador", "jefe_taller", "operario", "user", "comercial"],
                      armado: ["super_admin", "admin", "disenador", "jefe_taller", "operario", "user", "comercial"],
                      // Instalación: Todos (incluido Cliente)
                      proceso_instalacion: ["super_admin", "admin", "disenador", "jefe_taller", "operario", "user", "comercial"],
                      // Entrega: Todos (incluido Cliente)
                      fotos_finales: ["super_admin", "admin", "disenador", "jefe_taller", "operario", "user", "comercial"],
                    };
                    
                    // Filtrar carpetas según permisos de visualización del usuario
                    const userRole = user?.role || "user";
                    const canViewFolder = (folderName: string) => {
                      const allowedRoles = viewPermissions[folderName] || [];
                      return allowedRoles.includes(userRole);
                    };
                    
                    // Determinar qué carpetas mostrar según el filtro de categoría
                    const foldersToShow = (categoryFilter === "all" 
                      ? allFolders
                      : categoryToFolders[categoryFilter] || []).filter(canViewFolder);
                    
                    return foldersToShow;
                  })().map((folder) => {
                    // Filtrar fotos por subcategoría (carpeta)
                    const allFolderPhotos = projectDetail.photos?.filter((p: any) => p.subcategory === folder) || [];
                    let folderPhotos = categoryFilter === "all" 
                      ? allFolderPhotos 
                      : allFolderPhotos.filter((p: any) => p.category === categoryFilter);
                    
                    // Aplicar filtro de subcategoría si está activo
                    if (subcategoryFilter !== "all") {
                      folderPhotos = folderPhotos.filter((p: any) => p.subcategory === subcategoryFilter);
                    }
                    
                    const folderLabels: Record<string, string> = {
                      documento_cotizacion: "Documento",
                      fotos_iniciales: "Fotos Iniciales",
                      dibujo: "Dibujo",
                      renders: "Renders",
                      despieces: "Despieces",
                      detalles: "Detalles",
                      corte: "Corte",
                      enchape: "Enchape",
                      armado: "Armado",
                      proceso_instalacion: "Proceso",
                      fotos_finales: "Fotos Finales",
                    };
                    
                    // Mantener compatibilidad con stageLabels para el resto del código
                    const stageLabels: Record<string, string> = folderLabels;
                    
                    const categoryLabels: Record<string, string> = {
                      cotizacion: "Cotización",
                      medidas: "Medidas",
                      disenos: "Diseños",
                      avance: "Avance",
                      instalacion: "Instalación",
                      entrega: "Entrega",
                    };

                    const subcategoryLabels: Record<string, string> = {
                      documento_cotizacion: "Documento",
                      fotos_iniciales: "Fotos Iniciales",
                      dibujo: "Dibujo",
                      renders: "Renders",
                      despieces: "Despieces",
                      detalles: "Detalles",
                      corte: "Corte",
                      enchape: "Enchape",
                      armado: "Armado",
                      proceso_instalacion: "Proceso",
                      fotos_finales: "Fotos Finales",
                    };

                    // Determinar qué etapas puede subir cada rol
                    // Permisos de subida por carpeta según rol
                    const canUploadToFolder = () => {
                      const role = user?.role;
                      
                      // Definir qué roles pueden subir a cada carpeta
                      const uploadPermissions: Record<string, string[]> = {
                        // Cotización/Documento: Super Admin, Admin y Comercial
                        documento_cotizacion: ["super_admin", "admin", "comercial"],
                        // Medidas: Super Admin, Admin y Comercial
                        fotos_iniciales: ["super_admin", "admin", "comercial"],
                        dibujo: ["super_admin", "admin"],
                        // Diseños: solo Diseñador
                        renders: ["disenador"],
                        despieces: ["disenador"],
                        detalles: ["disenador"],
                        // Avance: Jefe Taller y Operario
                        corte: ["jefe_taller", "operario"],
                        enchape: ["jefe_taller", "operario"],
                        armado: ["jefe_taller", "operario"],
                        // Instalación: Jefe Taller y Operario
                        proceso_instalacion: ["jefe_taller", "operario"],
                        // Entrega: Jefe Taller y Operario
                        fotos_finales: ["jefe_taller", "operario"],
                      };
                      
                      const allowedRoles = uploadPermissions[folder] || [];
                      return allowedRoles.includes(role || "");
                    };

                    return (
                      <Card key={folder}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              {stageLabels[folder]}
                              <Badge variant="outline">{folderPhotos.length}</Badge>
                            </div>
                            {canUploadToFolder() && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  // Mapear folder a stage para el formulario
                                  const folderToStageMap: Record<string, string> = {
                                    documento_cotizacion: "inicial",
                                    fotos_iniciales: "inicial",
                                    dibujo: "inicial",
                                    renders: "diseno",
                                    despieces: "diseno",
                                    detalles: "diseno",
                                    corte: "corte",
                                    enchape: "enchape",
                                    armado: "ensamble",
                                    proceso_instalacion: "final",
                                    fotos_finales: "final",
                                  };
                                  // Mapear folder a category para permisos
                                  const folderToCategoryMap: Record<string, string> = {
                                    documento_cotizacion: "cotizacion",
                                    fotos_iniciales: "medidas",
                                    dibujo: "medidas",
                                    renders: "disenos",
                                    despieces: "disenos",
                                    detalles: "disenos",
                                    corte: "avance",
                                    enchape: "avance",
                                    armado: "avance",
                                    proceso_instalacion: "instalacion",
                                    fotos_finales: "entrega",
                                  };
                                  setPhotoForm({ ...photoForm, stage: folderToStageMap[folder] as any, category: folderToCategoryMap[folder] as any, subcategory: folder as any });
                                  setShowPhotoDialog(true);
                                }}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {folderPhotos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin fotos en esta carpeta</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {folderPhotos.map((photo: any, photoIndex: number) => {
                                const isPdf = photo.photoUrl.toLowerCase().endsWith('.pdf');
                                return (
                                  <div 
                                    key={photo.id} 
                                    className="relative group cursor-pointer"
                                    onClick={() => fileViewer.openViewer(
                                      folderPhotos.map((p: any) => ({
                                        url: p.photoUrl,
                                        title: `${stageLabels[folder]} - Archivo ${folderPhotos.indexOf(p) + 1}`,
                                        description: p.description,
                                        type: p.photoUrl.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const,
                                      })),
                                      photoIndex
                                    )}
                                  >
                                    {isPdf ? (
                                      <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded flex flex-col items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                        <FileText className="h-8 w-8 text-red-500" />
                                        <span className="text-xs text-muted-foreground mt-1">PDF</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={photo.photoUrl}
                                        alt={photo.description || "Foto del proyecto"}
                                        className="w-full h-24 object-cover rounded hover:opacity-80 transition-opacity"
                                      />
                                    )}
                                    {/* Badge de categoría y subcategoría */}
                                    <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                                      {photo.category && (
                                        <span className="text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">
                                          {categoryLabels[photo.category] || photo.category}
                                        </span>
                                      )}
                                      {photo.subcategory && (
                                        <span className="text-[10px] bg-secondary/90 text-secondary-foreground px-1.5 py-0.5 rounded">
                                          {subcategoryLabels[photo.subcategory] || photo.subcategory}
                                        </span>
                                      )}
                                    </div>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ZoomIn className="h-4 w-4 text-white drop-shadow-lg" />
                                    </div>
                                    {photo.description && (
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {photo.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  {/* Botón para agregar detalle */}
                  {(user?.role === "admin" || user?.role === "super_admin" || 
                    user?.role === "disenador" || user?.role === "jefe_taller" || user?.role === "operario") && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => setShowDetailDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Detalle
                      </Button>
                    </div>
                  )}

                  {projectDetail.details?.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No hay detalles registrados</p>
                      </CardContent>
                    </Card>
                  ) : (
                    projectDetail.details?.map((detail: any) => (
                      <Card key={detail.id}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{detail.title}</CardTitle>
                          <CardDescription>
                            {detail.type === "medida_especial" && "Medida Especial"}
                            {detail.type === "nota_importante" && "Nota Importante"}
                            {detail.type === "foto_referencia" && "Foto de Referencia"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{detail.content}</p>
                          {detail.photoUrl && (
                            <img 
                              src={detail.photoUrl} 
                              alt={detail.title}
                              className="mt-2 max-w-xs rounded"
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-2">
                  {projectDetail.history?.map((entry: any, index: number) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                      <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <strong>{entry.fromStatus || "Inicio"}</strong>
                          {" → "}
                          <strong>{entry.toStatus}</strong>
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.createdAt).toLocaleString("es-CO")}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo para subir foto */}
        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-2xl p-3 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subir Fotos</DialogTitle>
              <DialogDescription>
                Agrega fotos al proyecto: {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etapa *</Label>
                  <Select 
                    value={photoForm.stage} 
                    onValueChange={(v: any) => setPhotoForm({ ...photoForm, stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial">Fotos Iniciales</SelectItem>
                      <SelectItem value="diseno">Diseño</SelectItem>
                      <SelectItem value="corte">Corte</SelectItem>
                      <SelectItem value="enchape">Enchape</SelectItem>
                      <SelectItem value="ensamble">Ensamble</SelectItem>
                      <SelectItem value="final">Producto Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <Select 
                    value={photoForm.category} 
                    onValueChange={(v: any) => setPhotoForm({ ...photoForm, category: v, subcategory: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cotizacion">Cotización</SelectItem>
                      <SelectItem value="medidas">Medidas</SelectItem>
                      <SelectItem value="disenos">Diseños</SelectItem>
                      <SelectItem value="avance">Avance</SelectItem>
                      <SelectItem value="instalacion">Instalación</SelectItem>
                      <SelectItem value="entrega">Entrega</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategoría según la categoría seleccionada */}
                {photoForm.category && (
                  <div className="space-y-2">
                    <Label>Subcategoría</Label>
                    <Select 
                      value={photoForm.subcategory} 
                      onValueChange={(v: any) => setPhotoForm({ ...photoForm, subcategory: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona subcategoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {photoForm.category === "cotizacion" && (
                          <SelectItem value="documento_cotizacion">Documento de Cotización</SelectItem>
                        )}
                        {photoForm.category === "medidas" && (
                          <>
                            <SelectItem value="fotos_iniciales">Fotos Iniciales</SelectItem>
                            <SelectItem value="dibujo">Dibujo</SelectItem>
                          </>
                        )}
                        {photoForm.category === "disenos" && (
                          <>
                            <SelectItem value="renders">Renders</SelectItem>
                            <SelectItem value="despieces">Despieces</SelectItem>
                            <SelectItem value="detalles">Detalles</SelectItem>
                          </>
                        )}
                        {photoForm.category === "avance" && (
                          <>
                            <SelectItem value="corte">Corte</SelectItem>
                            <SelectItem value="enchape">Enchape</SelectItem>
                            <SelectItem value="armado">Armado</SelectItem>
                          </>
                        )}
                        {photoForm.category === "instalacion" && (
                          <SelectItem value="proceso_instalacion">Proceso de Instalación</SelectItem>
                        )}
                        {photoForm.category === "entrega" && (
                          <SelectItem value="fotos_finales">Fotos Finales</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {photoForm.stage && selectedProject && (
                <PhotoUploader
                  projectId={selectedProject.id}
                  stage={photoForm.stage as any}
                  category={photoForm.category as any}
                  maxFiles={10}
                  accept="image/*,application/pdf"
                  onUploadComplete={(urls) => {
                    // Guardar cada foto en la base de datos
                    urls.forEach((url) => {
                      uploadPhoto.mutate({
                        projectId: selectedProject.id,
                        stage: photoForm.stage as "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final",
                        category: photoForm.category,
                        subcategory: photoForm.subcategory || undefined,
                        photoUrl: url,
                        description: photoForm.description || undefined,
                      });
                    });
                    setShowPhotoDialog(false);
                    setPhotoForm({ stage: "", category: "medidas", subcategory: "", photoUrl: "", description: "" });
                  }}
                />
              )}

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={photoForm.description}
                  onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                  placeholder="Descripción de las fotos..."
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo para agregar detalle */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Detalle del Proyecto</DialogTitle>
              <DialogDescription>
                Agrega medidas especiales, notas importantes o fotos de referencia
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!detailForm.title || !detailForm.content || !selectedProject) {
                toast.error("Por favor completa los campos requeridos");
                return;
              }
              createDetail.mutate({
                projectId: selectedProject.id,
                type: detailForm.type,
                title: detailForm.title,
                content: detailForm.content,
                photoUrl: detailForm.photoUrl || undefined,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select 
                  value={detailForm.type} 
                  onValueChange={(v: any) => setDetailForm({ ...detailForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medida_especial">Medida Especial</SelectItem>
                    <SelectItem value="nota_importante">Nota Importante</SelectItem>
                    <SelectItem value="foto_referencia">Foto de Referencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={detailForm.title}
                  onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                  placeholder="Ej: Medida del hueco de la nevera"
                />
              </div>

              <div className="space-y-2">
                <Label>Contenido *</Label>
                <Textarea
                  value={detailForm.content}
                  onChange={(e) => setDetailForm({ ...detailForm, content: e.target.value })}
                  placeholder="Describe el detalle..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>URL de Foto (opcional)</Label>
                <Input
                  value={detailForm.photoUrl}
                  onChange={(e) => setDetailForm({ ...detailForm, photoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createDetail.isPending}>
                  {createDetail.isPending ? "Guardando..." : "Guardar Detalle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                  // Regenerar el enlace con el mensaje editado
                  const cleanPhone = whatsAppPhone.replace(/\D/g, "");
                  const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
                  const newLink = `https://wa.me/${fullPhone}?text=${encodeURIComponent(whatsAppMessage)}`;
                  window.open(newLink, "_blank");
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

      {/* Diálogo de editar fecha estimada */}
      <Dialog open={showEditDateDialog} onOpenChange={setShowEditDateDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Editar Fecha Estimada de Entrega
            </DialogTitle>
            <DialogDescription>
              Modifica la fecha estimada de instalación del proyecto. El cambio quedará registrado en el historial.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editDateForm.estimatedInstallDate || !selectedProject) return;
              updateEstimatedDate.mutate({
                projectId: selectedProject.id,
                estimatedInstallDate: new Date(editDateForm.estimatedInstallDate),
                reason: editDateForm.reason || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="estimatedDate">Nueva Fecha Estimada *</Label>
              <Input
                id="estimatedDate"
                type="date"
                required
                value={editDateForm.estimatedInstallDate}
                onChange={(e) => setEditDateForm({ ...editDateForm, estimatedInstallDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del cambio (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ej: Retraso en materiales, solicitud del cliente..."
                value={editDateForm.reason}
                onChange={(e) => setEditDateForm({ ...editDateForm, reason: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateEstimatedDate.isPending || !editDateForm.estimatedInstallDate}
              >
                {updateEstimatedDate.isPending ? "Guardando..." : "Guardar Fecha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar proyecto individual */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Proyecto</DialogTitle>
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
              <strong className="text-red-600">Esta acción no se puede deshacer.</strong>
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
            <DialogTitle className="text-red-600">Eliminar {selectedProjects.length} Proyecto(s)</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{selectedProjects.length} proyecto(s)</strong>?
              <br /><br />
              Esta acción eliminará permanentemente todos los datos asociados a estos proyectos.
              <br /><br />
              <strong className="text-red-600">Esta acción no se puede deshacer.</strong>
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
    </div>
  );
}
