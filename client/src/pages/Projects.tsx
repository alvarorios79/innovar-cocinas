import { useState } from "react";
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
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { FileViewer, useFileViewer } from "@/components/FileViewer";

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
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [createForm, setCreateForm] = useState({
    clientId: "",
    name: "",
    workType: "cocina" as "cocina" | "closet" | "puertas" | "centro_tv",
    initialMeasurements: "",
  });

  // Estados para subida de fotos y detalles
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [photoForm, setPhotoForm] = useState({
    stage: "" as "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final" | "",
    category: "otros" as "medidas" | "disenos" | "avance" | "materiales" | "instalacion" | "entrega" | "otros",
    photoUrl: "",
    description: "",
  });
  
  // Estado para filtro de categoría en galería
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
      
      // Mostrar diálogo de WhatsApp si hay notificación disponible
      if (data.whatsappNotification) {
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
      setPhotoForm({ stage: "", category: "otros", photoUrl: "", description: "" });
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

  // Verificar permisos - solo admin, super_admin, diseñador, jefe_taller, operario
  const allowedRoles = ["admin", "super_admin", "disenador", "jefe_taller", "operario"];
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
              {/* Filtro por estado */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(PROJECT_STATUSES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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

        {/* Lista de proyectos */}
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
          <div className="grid gap-4">
            {projects.map((project: any) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Info del proyecto */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        {getStatusBadge(project.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Cliente:</strong> {project.client?.name || "N/A"}</p>
                        <p><strong>Tipo:</strong> {WORK_TYPES[project.workType as keyof typeof WORK_TYPES]}</p>
                        <p><strong>Creado:</strong> {new Date(project.createdAt).toLocaleDateString("es-CO")}</p>
                        {project.estimatedInstallDate && project.status !== "entregado" && (
                          <p className={`font-medium ${
                            new Date(project.estimatedInstallDate) < new Date() 
                              ? "text-red-600" 
                              : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}>
                            <strong>Entrega estimada:</strong> {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO")}
                            {new Date(project.estimatedInstallDate) < new Date() && " (Vencida)"}
                          </p>
                        )}
                        {project.scheduledInstallDate && project.status !== "entregado" && (
                          <p className="text-blue-600 font-medium">
                            <strong>Instalación:</strong> {new Date(project.scheduledInstallDate).toLocaleDateString("es-CO")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalle
                      </Button>

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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de detalle del proyecto */}
        <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="photos">Fotos</TabsTrigger>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                  <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><strong>Nombre:</strong> {projectDetail.client?.name}</p>
                      <p><strong>Teléfono:</strong> {projectDetail.client?.whatsappPhone}</p>
                      <p><strong>Email:</strong> {projectDetail.client?.email || "N/A"}</p>
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
                      <p><strong>Creado:</strong> {new Date(projectDetail.createdAt).toLocaleDateString("es-CO")}</p>
                      {projectDetail.quotationSentAt && (
                        <p><strong>Cotización enviada:</strong> {new Date(projectDetail.quotationSentAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.quotationApprovedAt && (
                        <p><strong>Cotización aprobada:</strong> {new Date(projectDetail.quotationApprovedAt).toLocaleDateString("es-CO")}</p>
                      )}
                      {projectDetail.advanceReceivedAt && (
                        <p><strong>Adelanto recibido:</strong> {new Date(projectDetail.advanceReceivedAt).toLocaleDateString("es-CO")}</p>
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
                      {projectDetail.estimatedInstallDate && projectDetail.status !== "entregado" && (
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

                <TabsContent value="photos" className="space-y-4">
                  {/* Filtro por categoría y botón para subir foto */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={categoryFilter === "all" ? "default" : "outline"}
                        onClick={() => setCategoryFilter("all")}
                      >
                        Todas
                      </Button>
                      {[
                        { value: "medidas", label: "Medidas" },
                        { value: "disenos", label: "Diseños" },
                        { value: "avance", label: "Avance" },
                        { value: "materiales", label: "Materiales" },
                        { value: "instalacion", label: "Instalación" },
                        { value: "entrega", label: "Entrega" },
                        { value: "otros", label: "Otros" },
                      ].map((cat) => (
                        <Button
                          key={cat.value}
                          size="sm"
                          variant={categoryFilter === cat.value ? "default" : "outline"}
                          onClick={() => setCategoryFilter(cat.value)}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                    {(user?.role === "admin" || user?.role === "super_admin" || 
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

                  {["inicial", "diseno", "corte", "enchape", "ensamble", "final"].map((stage) => {
                    // Filtrar fotos por etapa y categoría
                    const allStagePhotos = projectDetail.photos?.filter((p: any) => p.stage === stage) || [];
                    const stagePhotos = categoryFilter === "all" 
                      ? allStagePhotos 
                      : allStagePhotos.filter((p: any) => p.category === categoryFilter);
                    
                    const stageLabels: Record<string, string> = {
                      inicial: "Fotos Iniciales",
                      diseno: "Diseño",
                      corte: "Corte",
                      enchape: "Enchape",
                      ensamble: "Ensamble",
                      final: "Producto Final",
                    };
                    
                    const categoryLabels: Record<string, string> = {
                      medidas: "Medidas",
                      disenos: "Diseños",
                      avance: "Avance",
                      materiales: "Materiales",
                      instalacion: "Instalación",
                      entrega: "Entrega",
                      otros: "Otros",
                    };

                    // Determinar qué etapas puede subir cada rol
                    const canUploadStage = () => {
                      const role = user?.role;
                      if (role === "admin" || role === "super_admin") return true;
                      if (role === "disenador" && (stage === "inicial" || stage === "diseno")) return true;
                      if ((role === "jefe_taller" || role === "operario") && 
                          ["corte", "enchape", "ensamble", "final"].includes(stage)) return true;
                      return false;
                    };

                    return (
                      <Card key={stage}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              {stageLabels[stage]}
                              <Badge variant="outline">{stagePhotos.length}</Badge>
                            </div>
                            {canUploadStage() && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPhotoForm({ ...photoForm, stage: stage as any });
                                  setShowPhotoDialog(true);
                                }}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stagePhotos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin fotos en esta etapa</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {stagePhotos.map((photo: any, photoIndex: number) => {
                                const isPdf = photo.photoUrl.toLowerCase().endsWith('.pdf');
                                return (
                                  <div 
                                    key={photo.id} 
                                    className="relative group cursor-pointer"
                                    onClick={() => fileViewer.openViewer(
                                      stagePhotos.map((p: any) => ({
                                        url: p.photoUrl,
                                        title: `${stageLabels[stage]} - Archivo ${stagePhotos.indexOf(p) + 1}`,
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
                                    {/* Badge de categoría */}
                                    {photo.category && photo.category !== "otros" && (
                                      <div className="absolute top-1 left-1">
                                        <span className="text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">
                                          {categoryLabels[photo.category] || photo.category}
                                        </span>
                                      </div>
                                    )}
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
          <DialogContent className="max-w-2xl">
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
                    onValueChange={(v: any) => setPhotoForm({ ...photoForm, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medidas">Medidas</SelectItem>
                      <SelectItem value="disenos">Diseños</SelectItem>
                      <SelectItem value="avance">Fotos de Avance</SelectItem>
                      <SelectItem value="materiales">Materiales</SelectItem>
                      <SelectItem value="instalacion">Instalación</SelectItem>
                      <SelectItem value="entrega">Entrega</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {photoForm.stage && selectedProject && (
                <PhotoUploader
                  projectId={selectedProject.id}
                  stage={photoForm.stage as any}
                  maxFiles={10}
                  accept="image/*,application/pdf"
                  onUploadComplete={(urls) => {
                    // Guardar cada foto en la base de datos
                    urls.forEach((url) => {
                      uploadPhoto.mutate({
                        projectId: selectedProject.id,
                        stage: photoForm.stage as "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final",
                        category: photoForm.category,
                        photoUrl: url,
                        description: photoForm.description || undefined,
                      });
                    });
                    setShowPhotoDialog(false);
                    setPhotoForm({ stage: "", category: "otros", photoUrl: "", description: "" });
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
        <DialogContent className="max-w-lg">
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
        <DialogContent className="max-w-md">
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
    </div>
  );
}
