import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, FileText, LogOut, FolderKanban, CheckCircle2, Clock, Hammer, Paintbrush, Package, Truck, AlertCircle, Image as ImageIcon, ThumbsUp, ThumbsDown, Wrench, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ClientMaterialsView } from "@/components/ClientMaterialsView";
import { ProjectTimeline } from "@/components/ProjectTimeline";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Portal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedProjectForPhoto, setSelectedProjectForPhoto] = useState<any>(null);
  const [photoDescription, setPhotoDescription] = useState("");
  
  // Estados para aprobar/rechazar cotizaciones
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Estado para mostrar timeline expandido
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.getMyAppointments.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.getMyQuotations.useQuery();
  const { data: estimates = [], isLoading: loadingEstimates } = trpc.estimates.getMyEstimates.useQuery();
  const { data: myProjects = [], isLoading: loadingProjects } = trpc.projects.getMyProjects.useQuery();

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: (_, variables) => {
      utils.projects.getMyProjects.invalidate();
      toast.success(variables.approved ? "Diseño aprobado exitosamente" : "Diseño rechazado, se enviará a revisión");
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la aprobación");
    },
  });

  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => {
      utils.projects.getMyProjects.invalidate();
      toast.success("Foto subida exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir la foto");
    },
  });

  const rescheduleAppointment = trpc.appointments.reschedule.useMutation({
    onSuccess: () => {
      utils.appointments.getMyAppointments.invalidate();
      toast.success("Cita reagendada exitosamente");
      setSelectedAppointment(null);
      setRescheduleDate("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reagendar la cita");
    },
  });

  // Mutation para aprobar cotización
  const approveQuotation = trpc.quotations.clientApprove.useMutation({
    onSuccess: () => {
      utils.quotations.getMyQuotations.invalidate();
      toast.success("¡Cotización aprobada exitosamente! Nos pondremos en contacto contigo pronto.");
      setShowApproveDialog(false);
      setSelectedQuotation(null);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al aprobar la cotización");
    },
  });

  // Mutation para rechazar cotización
  const rejectQuotation = trpc.quotations.clientReject.useMutation({
    onSuccess: () => {
      utils.quotations.getMyQuotations.invalidate();
      toast.success("Cotización rechazada. Gracias por tu retroalimentación.");
      setShowRejectDialog(false);
      setSelectedQuotation(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al rechazar la cotización");
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Traducir status de cotizaciones de inglés a español
  const translateQuotationStatus = (status: string): string => {
    const translations: Record<string, string> = {
      draft: "borrador",
      sent: "enviada",
      approved: "aprobada",
      rejected: "rechazada",
    };
    return translations[status] || status;
  };

  const getStatusBadge = (status: string) => {
    // Traducir el status si viene en inglés
    const translatedStatus = translateQuotationStatus(status);
    
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string, label: string }> = {
      pendiente: { variant: "destructive", className: "bg-red-500 hover:bg-red-600", label: "Pendiente" },
      confirmada: { variant: "default", className: "bg-blue-500 hover:bg-blue-600", label: "Confirmada" },
      completada: { variant: "default", className: "bg-green-500 hover:bg-green-600", label: "Completada" },
      cancelada: { variant: "default", className: "bg-amber-700 hover:bg-amber-800", label: "Cancelada" },
      borrador: { variant: "secondary", className: "", label: "Borrador" },
      enviada: { variant: "default", className: "bg-blue-500 hover:bg-blue-600", label: "Enviada" },
      aprobada: { variant: "default", className: "bg-green-500 hover:bg-green-600", label: "Aprobada" },
      rechazada: { variant: "destructive", className: "bg-red-500 hover:bg-red-600", label: "Rechazada" },
    };

    const config = statusConfig[translatedStatus] || { variant: "default", className: "", label: translatedStatus };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getWorkTypeLabel = (workType: string | string[]) => {
    const labels: Record<string, string> = {
      cocina: "Cocina Integral",
      closet: "Closet",
      puertas: "Puertas",
      centro_tv: "Centro de TV",
    };
    
    if (Array.isArray(workType)) {
      return workType.map(wt => labels[wt] || wt).join(", ");
    }
    
    return labels[workType] || workType;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No especificada";
    return new Date(date).toLocaleString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  // Configuración de estados de proyecto
  const PROJECT_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
    pendiente: { label: "Pendiente", color: "bg-gray-500", icon: Clock },
    aprobado_diseno: { label: "Aprobado para Diseño", color: "bg-blue-500", icon: CheckCircle2 },
    en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: Paintbrush },
    pendiente_cliente: { label: "Pendiente tu Aprobación", color: "bg-yellow-500", icon: AlertCircle },
    corte: { label: "En Corte", color: "bg-orange-500", icon: Hammer },
    enchape: { label: "En Enchape", color: "bg-orange-600", icon: Paintbrush },
    ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: Package },
    listo_instalacion: { label: "Listo para Instalación", color: "bg-green-500", icon: Truck },
    entregado: { label: "Entregado", color: "bg-green-700", icon: CheckCircle2 },
  };

  const getProjectStatusBadge = (status: string) => {
    const config = PROJECT_STATUSES[status];
    if (!config) return <Badge>{status}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getProgressPercentage = (status: string): number => {
    const statusOrder = ["pendiente", "aprobado_diseno", "en_diseno", "pendiente_cliente", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"];
    const index = statusOrder.indexOf(status);
    return Math.round(((index + 1) / statusOrder.length) * 100);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleDate) return;

    await rescheduleAppointment.mutateAsync({
      id: selectedAppointment.id,
      scheduledDate: rescheduleDate,
    });
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
            <h1 className="text-lg md:text-xl font-bold">Mi Portal</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[120px]">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} className="px-2 md:px-3">
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Welcome Card */}
        <Card className="mb-4 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Bienvenido, {user?.name}</CardTitle>
            <CardDescription>
              Aquí puedes ver tus citas, reagendarlas y consultar tus cotizaciones
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Mis Proyectos</TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs sm:text-sm">Mis Citas</TabsTrigger>
            <TabsTrigger value="quotations" className="text-xs sm:text-sm">Cotizaciones</TabsTrigger>
            <TabsTrigger value="estimates" className="text-xs sm:text-sm">Estimados</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Mis Proyectos
                </CardTitle>
                <CardDescription>Sigue el progreso de tus proyectos en tiempo real</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProjects ? (
                  <p>Cargando...</p>
                ) : myProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tienes proyectos activos</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Una vez que aceptes una cotización, tu proyecto aparecerá aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myProjects.map((project: any) => (
                      <div key={project.id} className="border rounded-lg p-4 space-y-4">
                        {/* Header del proyecto */}
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getWorkTypeLabel(project.workType)}
                            </p>
                          </div>
                          {getProjectStatusBadge(project.status)}
                        </div>

                        {/* Barra de progreso */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progreso</span>
                            <span>{getProgressPercentage(project.status)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${getProgressPercentage(project.status)}%` }}
                            />
                          </div>
                        </div>

                        {/* Fecha estimada de entrega */}
                        {project.estimatedInstallDate && project.status !== "entregado" && (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            new Date(project.estimatedInstallDate) < new Date() 
                              ? "bg-red-50 border border-red-200" 
                              : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? "bg-yellow-50 border border-yellow-200"
                                : "bg-green-50 border border-green-200"
                          }`}>
                            <Truck className={`h-5 w-5 ${
                              new Date(project.estimatedInstallDate) < new Date() 
                                ? "text-red-600" 
                                : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`} />
                            <div>
                              <p className={`text-sm font-medium ${
                                new Date(project.estimatedInstallDate) < new Date() 
                                  ? "text-red-800" 
                                  : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                    ? "text-yellow-800"
                                    : "text-green-800"
                              }`}>
                                {new Date(project.estimatedInstallDate) < new Date() 
                                  ? "Fecha de entrega vencida" 
                                  : "Fecha estimada de instalación"}
                              </p>
                              <p className={`text-sm ${
                                new Date(project.estimatedInstallDate) < new Date() 
                                  ? "text-red-600" 
                                  : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}>
                                {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Fecha de instalación programada */}
                        {project.scheduledInstallDate && project.status !== "entregado" && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">Instalación Programada</p>
                              <p className="text-sm text-blue-600">
                                {new Date(project.scheduledInstallDate).toLocaleDateString("es-CO", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Proyecto entregado */}
                        {project.status === "entregado" && project.deliveredAt && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-800">¡Proyecto Entregado!</p>
                              <p className="text-sm text-green-600">
                                Entregado el {new Date(project.deliveredAt).toLocaleDateString("es-CO", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Botón para subir fotos de referencia */}
                        {["pendiente", "aprobado_diseno", "en_diseno"].includes(project.status) && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProjectForPhoto(project);
                                setShowPhotoDialog(true);
                              }}
                            >
                              <ImageIcon className="h-4 w-4 mr-1" />
                              Subir Fotos de Referencia
                            </Button>
                          </div>
                        )}

                        {/* Aprobación de diseño */}
                        {project.status === "pendiente_cliente" && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Acción Requerida: Aprobar Diseño
                            </h4>
                            <p className="text-sm text-yellow-700 mb-4">
                              El diseño 3D de tu proyecto está listo. Por favor revísalo y apruébalo para continuar con la producción.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveDesign.mutate({ projectId: project.id, approved: true })}
                                disabled={approveDesign.isPending}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Aprobar Diseño
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const notes = prompt("Por favor indica qué cambios necesitas:");
                                  if (notes) {
                                    approveDesign.mutate({ projectId: project.id, approved: false, notes });
                                  }
                                }}
                                disabled={approveDesign.isPending}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Solicitar Cambios
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Sección de Materiales */}
                        <div className="space-y-3">
                          <details className="group">
                            <summary className="font-medium flex items-center gap-2 cursor-pointer list-none">
                              <Wrench className="h-4 w-4" />
                              Ver Materiales y Herrajes
                              <span className="text-xs text-muted-foreground ml-auto group-open:hidden">Clic para expandir</span>
                              <span className="text-xs text-muted-foreground ml-auto hidden group-open:inline">Clic para cerrar</span>
                            </summary>
                            <div className="mt-4">
                              <ClientMaterialsView projectId={project.id} />
                            </div>
                          </details>
                        </div>

                        {/* Galería de fotos por etapa */}
                        {project.photos && project.photos.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Fotos del Proceso
                            </h4>
                            {["inicial", "diseno", "corte", "enchape", "ensamble", "final"].map((stage) => {
                              const stagePhotos = project.photos.filter((p: any) => p.stage === stage);
                              if (stagePhotos.length === 0) return null;
                              
                              const stageLabels: Record<string, string> = {
                                inicial: "Fotos Iniciales",
                                diseno: "Diseño",
                                corte: "Corte",
                                enchape: "Enchape",
                                ensamble: "Ensamble",
                                final: "Producto Final",
                              };

                              return (
                                <div key={stage} className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">{stageLabels[stage]}</p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {stagePhotos.map((photo: any) => (
                                      <img
                                        key={photo.id}
                                        src={photo.photoUrl}
                                        alt={photo.description || "Foto del proyecto"}
                                        className="w-full h-20 sm:h-24 object-cover rounded cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(photo.photoUrl, "_blank")}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Timeline del Proyecto */}
                        <div className="space-y-3">
                          <details className="group" open={expandedProjectId === project.id}>
                            <summary 
                              className="font-medium flex items-center gap-2 cursor-pointer list-none"
                              onClick={(e) => {
                                e.preventDefault();
                                setExpandedProjectId(expandedProjectId === project.id ? null : project.id);
                              }}
                            >
                              <Clock className="h-4 w-4" />
                              Ver Timeline del Proyecto
                              <span className="text-xs text-muted-foreground ml-auto">
                                {expandedProjectId === project.id ? "Clic para cerrar" : "Clic para expandir"}
                              </span>
                            </summary>
                            {expandedProjectId === project.id && (
                              <div className="mt-4">
                                <ProjectTimeline 
                                  project={project}
                                  onApproveQuotation={() => {
                                    // Buscar la cotización asociada al proyecto
                                    const quot = quotations.find((q: any) => q.projectId === project.id || q.status === "sent");
                                    if (quot) {
                                      setSelectedQuotation(quot);
                                      setShowApproveDialog(true);
                                    }
                                  }}
                                  onRejectQuotation={() => {
                                    const quot = quotations.find((q: any) => q.projectId === project.id || q.status === "sent");
                                    if (quot) {
                                      setSelectedQuotation(quot);
                                      setShowRejectDialog(true);
                                    }
                                  }}
                                  onApproveDesign={() => {
                                    approveDesign.mutate({ projectId: project.id, approved: true });
                                  }}
                                  onRequestChanges={() => {
                                    const notes = prompt("Por favor indica qué cambios necesitas:");
                                    if (notes) {
                                      approveDesign.mutate({ projectId: project.id, approved: false, notes });
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </details>
                        </div>

                        {/* Fecha de creación */}
                        <p className="text-xs text-muted-foreground">
                          Creado: {formatDate(project.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mis Citas</CardTitle>
                <CardDescription>Visualiza y reagenda tus citas</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <p>Cargando...</p>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tienes citas agendadas</p>
                    <Link href="/">
                      <Button className="mt-4">Agendar una cita</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getWorkTypeLabel(apt.workTypes)}</h3>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">Fecha:</span> {formatDate(apt.scheduledDate)}
                            </p>
                            {apt.notes && (
                              <p className="text-sm text-muted-foreground">{apt.notes}</p>
                            )}
                          </div>
                          {(apt.status === "pendiente" || apt.status === "confirmada") && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedAppointment(apt)}
                                >
                                  Reagendar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reagendar Cita</DialogTitle>
                                  <DialogDescription>
                                    {getWorkTypeLabel(apt.workTypes)} - {formatDate(apt.scheduledDate)}
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleReschedule} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="newDate">Nueva fecha y hora</Label>
                                    <Input
                                      id="newDate"
                                      type="datetime-local"
                                      required
                                      value={rescheduleDate}
                                      onChange={(e) => setRescheduleDate(e.target.value)}
                                    />
                                  </div>
                                  <Button type="submit" className="w-full">
                                    Confirmar Reagendamiento
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mis Cotizaciones</CardTitle>
                <CardDescription>Revisa las cotizaciones que hemos preparado para ti</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQuotations ? (
                  <p>Cargando...</p>
                ) : quotations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aún no tienes cotizaciones. Después de tu visita, generaremos una cotización personalizada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quotations.map((quot: any) => {
                      // Verificar si es una cotización enviada (en inglés o español)
                      const isSent = quot.status === "sent" || quot.status === "enviada";
                      const isApproved = quot.status === "approved" || quot.status === "aprobada";
                      const isRejected = quot.status === "rejected" || quot.status === "rechazada";
                      
                      return (
                      <div key={quot.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getWorkTypeLabel(quot.productType)}</h3>
                              {getStatusBadge(quot.status)}
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">Número:</span> {quot.quotationNumber}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Vendedor:</span> {quot.vendorName}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Trabajo:</span> {quot.productType}
                            </p>
                            <div className="mt-3">
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(quot.total)}
                              </p>
                            </div>
                            {quot.validUntil && (
                              <p className="text-xs text-muted-foreground">
                                Válida hasta: {formatDate(quot.validUntil)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Creada: {formatDate(quot.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Botones de aprobar/rechazar para cotizaciones enviadas */}
                        {isSent && (
                          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setSelectedQuotation(quot);
                                setShowApproveDialog(true);
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Aprobar Cotización
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                setSelectedQuotation(quot);
                                setShowRejectDialog(true);
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                        
                        {/* Mensaje para cotizaciones aprobadas */}
                        {isApproved && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-800">¡Cotización Aprobada!</p>
                              <p className="text-xs text-green-600">Nos pondremos en contacto contigo para los siguientes pasos.</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Mensaje para cotizaciones rechazadas */}
                        {isRejected && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                            <X className="h-5 w-5 text-red-600" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Cotización Rechazada</p>
                              {quot.rejectionReason && (
                                <p className="text-xs text-red-600">Motivo: {quot.rejectionReason}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimates Tab */}
          <TabsContent value="estimates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estimados Previos</CardTitle>
                <CardDescription>Estimados que enviaste con medidas previas</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEstimates ? (
                  <p>Cargando...</p>
                ) : estimates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No has enviado estimados previos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {estimates.map((est) => (
                      <div key={est.id} className="border rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold">{getWorkTypeLabel(est.workType)}</h3>
                        {est.kitchenShape && (
                          <p className="text-sm">
                            <span className="font-medium">Forma de cocina:</span>{" "}
                            {est.kitchenShape === "L" ? "En forma de L" : est.kitchenShape === "U" ? "En forma de U" : "Lineal"}
                          </p>
                        )}
                        {(est.linearLength || est.height) && (
                          <p className="text-sm">
                            <span className="font-medium">Medidas:</span>
                            {est.linearLength && ` Largo lineal: ${est.linearLength}m`}
                            {est.linearLength && est.height && ` |`}
                            {est.height && ` Alto: ${est.height}m`}
                          </p>
                        )}
                        {est.materialType && (
                          <p className="text-sm">
                            <span className="font-medium">Tipo de mesón:</span>{" "}
                            {est.materialType === "quarzone" ? "Quarzone" : "Sinterizado"}
                          </p>
                        )}
                        {est.additionalDetails && (
                          <p className="text-sm text-muted-foreground">{est.additionalDetails}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Enviado: {formatDate(est.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo para subir fotos de referencia */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subir Fotos de Referencia</DialogTitle>
            <DialogDescription>
              Sube fotos de referencia para tu proyecto: {selectedProjectForPhoto?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Puedes subir fotos de inspiración, imágenes del espacio actual, o cualquier referencia 
              que ayude al diseñador a entender mejor lo que buscas.
            </p>

            {selectedProjectForPhoto && (
              <PhotoUploader
                projectId={selectedProjectForPhoto.id}
                stage="inicial"
                maxFiles={10}
                accept="image/*,application/pdf"
                onUploadComplete={(urls) => {
                  // Guardar cada foto en la base de datos
                  urls.forEach((url) => {
                    uploadPhoto.mutate({
                      projectId: selectedProjectForPhoto.id,
                      stage: "inicial",
                      category: "medidas", // Fotos del cliente van a "medidas" por defecto
                      subcategory: "fotos_iniciales",
                      photoUrl: url,
                      description: photoDescription || "Foto de referencia del cliente",
                    });
                  });
                  setShowPhotoDialog(false);
                  setSelectedProjectForPhoto(null);
                  setPhotoDescription("");
                }}
              />
            )}

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                placeholder="Describe qué muestran estas fotos o qué te gustaría lograr..."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para aprobar cotización */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Aprobar Cotización
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar la cotización {selectedQuotation?.quotationNumber}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedQuotation && getWorkTypeLabel(selectedQuotation.productType)}</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {selectedQuotation && formatPrice(selectedQuotation.total)}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Notas adicionales (opcional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Agrega cualquier comentario o solicitud especial..."
                rows={3}
              />
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                Al aprobar esta cotización, nuestro equipo se pondrá en contacto contigo para coordinar 
                el adelanto del 60% y comenzar con el proceso de diseño.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setSelectedQuotation(null);
                setApprovalNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedQuotation) {
                  approveQuotation.mutate({
                    id: selectedQuotation.id,
                    notes: approvalNotes || undefined,
                  });
                }
              }}
              disabled={approveQuotation.isPending}
            >
              {approveQuotation.isPending ? "Procesando..." : "Confirmar Aprobación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para rechazar cotización */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Rechazar Cotización
            </DialogTitle>
            <DialogDescription>
              Por favor, indícanos el motivo del rechazo para poder mejorar nuestra oferta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedQuotation && getWorkTypeLabel(selectedQuotation.productType)}</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {selectedQuotation && formatPrice(selectedQuotation.total)}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Motivo del rechazo <span className="text-red-500">*</span></Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: El precio está fuera de mi presupuesto, preferí otra opción, etc."
                rows={3}
                required
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedQuotation(null);
                setRejectionReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuotation && rejectionReason.trim()) {
                  rejectQuotation.mutate({
                    id: selectedQuotation.id,
                    reason: rejectionReason,
                  });
                } else {
                  toast.error("Por favor, indica el motivo del rechazo");
                }
              }}
              disabled={rejectQuotation.isPending || !rejectionReason.trim()}
            >
              {rejectQuotation.isPending ? "Procesando..." : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
