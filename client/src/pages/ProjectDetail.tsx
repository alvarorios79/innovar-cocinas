import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ZoomIn,
  MessageCircle,
  FileDown,
  Plus,
  ArrowLeft,
  Info,
  Palette,
  Camera,
  ListTodo,
  History,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Receipt,
  Trash2,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { useFileViewer, FileViewer } from "@/components/FileViewer";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { toast } from "sonner";


const PROJECT_STATUSES = {
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Adelanto Recibido", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: AlertCircle },
  pendiente_cliente: { label: "Diseño Listo", color: "bg-yellow-500", icon: AlertCircle },
  aprobacion_final: { label: "Aprobación Final", color: "bg-green-400", icon: CheckCircle2 },
  corte: { label: "En Corte", color: "bg-orange-500", icon: AlertCircle },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: AlertCircle },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: AlertCircle },
  listo_instalacion: { label: "Listo para Instalación", color: "bg-teal-500", icon: AlertCircle },
  instalacion_programada: { label: "Instalación Programada", color: "bg-teal-600", icon: AlertCircle },
  entregado: { label: "Entregado", color: "bg-green-700", icon: CheckCircle2 },
};

const WORK_TYPES = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export default function ProjectDetail() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const utils = trpc.useUtils();
  const fileViewer = useFileViewer();
  
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDateDialog, setShowEditDateDialog] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  const [photoForm, setPhotoForm] = useState({
    category: "medidas" as "cotizacion" | "medidas" | "disenos" | "avance" | "instalacion" | "entrega",
    subcategory: "" as string,
    photoUrls: [] as string[],
    description: "",
  });
  const [detailForm, setDetailForm] = useState({
    type: "nota_importante" as "medida_especial" | "nota_importante" | "foto_referencia",
    title: "",
    content: "",
    photoUrl: "",
  });
  const [editDateForm, setEditDateForm] = useState({
    estimatedInstallDate: "",
    reason: "",
  });
  const [photoToDelete, setPhotoToDelete] = useState<{ id: number; description?: string } | null>(null);
  const [advanceConfirmDialog, setAdvanceConfirmDialog] = useState<{ open: boolean; subcategory: string; nextStatus: string; hasPhotos: boolean }>({ open: false, subcategory: "", nextStatus: "", hasPhotos: false });

  const { data: projectDetail, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Archivo subido exitosamente");
      setShowPhotoDialog(false);
      setPhotoForm({ category: "medidas", subcategory: "", photoUrls: [], description: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir archivo");
    },
  });

  const deletePhoto = trpc.projectPhotos.delete.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Foto eliminada correctamente");
      setPhotoToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar foto");
    },
  });

  // Nota: addDetail se maneja con una mutación genérica o se implementará después

  const updateDate = trpc.projects.updateEstimatedDate.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      setShowEditDateDialog(false);
      setEditDateForm({ estimatedInstallDate: "", reason: "" });
      toast.success("Fecha actualizada correctamente");
    },
  });

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Diseño procesado correctamente");
    },
  });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Proyecto avanzado a la siguiente etapa");
    },
    onError: (error) => {
      toast.error(error.message || "Error al avanzar el proyecto");
    },
  });

  // Mapeo de subcategoría de foto a siguiente estado del proyecto
  const photoToNextStatus: Record<string, string> = {
    despiece: "corte",
    corte: "enchape",
    enchape: "ensamble",
    armado: "listo_instalacion",
    proceso_instalacion: "entregado",
  };

  // Mapeo de subcategoría a estado requerido para mostrar botón de avanzar
  // El botón aparece cuando el proyecto está en la etapa correspondiente o en etapas anteriores de producción
  const photoToCurrentStatus: Record<string, string[]> = {
    despiece: ["despiece", "pendiente_cliente", "aprobacion_final"],
    corte: ["corte", "despiece"],
    enchape: ["enchape", "corte"],
    armado: ["ensamble", "enchape"],
    proceso_instalacion: ["instalacion_programada", "listo_instalacion"],
  };

  // Verificar si el usuario tiene rol permitido para avanzar
  const canShowAdvanceButton = (subcategory: string) => {
    const role = user?.role;
    const allowedRoles = ["super_admin", "admin", "jefe_taller", "operario"];
    if (!role || !allowedRoles.includes(role)) return false;
    return !!photoToNextStatus[subcategory];
  };

  // Mapeo de subcategoría a la etapa anterior requerida
  const previousStageMap: Record<string, string> = {
    corte: "despiece",
    enchape: "corte",
    armado: "enchape",
    proceso_instalacion: "armado",
  };

  // Verificar si la etapa anterior tiene al menos una foto
  const hasPreviousStagePhotos = (subcategory: string): boolean => {
    const previousStage = previousStageMap[subcategory];
    if (!previousStage) return true; // despiece no tiene etapa anterior
    
    const photos = projectDetail?.photos || [];
    return photos.some(p => p.subcategory === previousStage);
  };

  // Verificar si se puede subir fotos a esta etapa
  const canUploadToStage = (subcategory: string): { allowed: boolean; message?: string } => {
    // Siempre permitir para admin y super_admin
    if (user?.role === "super_admin" || user?.role === "admin") {
      return { allowed: true };
    }
    
    // Verificar si la etapa anterior tiene fotos
    if (!hasPreviousStagePhotos(subcategory)) {
      const previousStage = previousStageMap[subcategory];
      const previousLabel = subcategoryLabels[previousStage] || previousStage;
      return { 
        allowed: false, 
        message: `Debe completar la etapa de ${previousLabel} primero (subir al menos 1 foto)` 
      };
    }
    
    return { allowed: true };
  };

  // Abrir diálogo de confirmación para avanzar
  const openAdvanceConfirmDialog = (subcategory: string) => {
    const nextStatus = photoToNextStatus[subcategory];
    const photos = projectDetail?.photos || [];
    const hasPhotos = photos.some(p => p.subcategory === subcategory);
    
    setAdvanceConfirmDialog({
      open: true,
      subcategory,
      nextStatus: nextStatus || "",
      hasPhotos
    });
  };

  const handleAdvanceFromPhoto = () => {
    const { subcategory, nextStatus } = advanceConfirmDialog;
    if (!nextStatus || !projectDetail?.id) return;
    
    updateStatus.mutate({
      projectId: projectDetail.id,
      newStatus: nextStatus as any,
    });
    setAdvanceConfirmDialog({ open: false, subcategory: "", nextStatus: "", hasPhotos: false });
  };

  // Nota: exportPdf se implementará después

  const handleExportPdf = () => {
    toast.info("Función de exportar PDF en desarrollo");
  };

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
    modelado: "Modelado",
    corte: "Corte",
    enchape: "Enchape",
    armado: "Armado",
    proceso_instalacion: "Proceso",
    fotos_finales: "Fotos Finales",
  };

  const canUploadToFolder = (folder: string) => {
    const role = user?.role;
    const uploadPermissions: Record<string, string[]> = {
      documento_cotizacion: ["super_admin", "admin"],
      fotos_iniciales: ["super_admin", "admin"],
      dibujo: ["super_admin", "admin"],
      renders: ["disenador"],
      despieces: ["disenador"],
      detalles: ["disenador"],
      modelado: ["disenador"],
      corte: ["jefe_taller", "operario"],
      enchape: ["jefe_taller", "operario"],
      armado: ["jefe_taller", "operario"],
      proceso_instalacion: ["jefe_taller", "operario"],
      fotos_finales: ["jefe_taller", "operario"],
    };
    const allowedRoles = uploadPermissions[folder] || [];
    return allowedRoles.includes(role || "");
  };

  const getFilteredFolders = () => {
    const role = user?.role;
    const allFolders = {
      cotizacion: ["documento_cotizacion"],
      medidas: ["fotos_iniciales", "dibujo"],
      disenos: ["renders", "despieces", "detalles", "modelado"],
      avance: ["corte", "enchape", "armado"],
      instalacion: ["proceso_instalacion"],
      entrega: ["fotos_finales"],
    };

    if (role === "super_admin" || role === "admin") {
      return allFolders;
    }

    const filtered: Record<string, string[]> = {};
    Object.entries(allFolders).forEach(([category, subcategories]) => {
      const allowedSubs = subcategories.filter((sub) => {
        const viewPermissions: Record<string, string[]> = {
          documento_cotizacion: ["super_admin", "admin"],
          fotos_iniciales: ["super_admin", "admin", "disenador"],
          dibujo: ["super_admin", "admin", "disenador"],
          renders: ["super_admin", "admin", "disenador", "jefe_taller"],
          despieces: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          detalles: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          modelado: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          corte: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          enchape: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          armado: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          proceso_instalacion: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
          fotos_finales: ["super_admin", "admin", "disenador", "jefe_taller", "operario"],
        };
        return viewPermissions[sub]?.includes(role || "") ?? false;
      });
      if (allowedSubs.length > 0) {
        filtered[category] = allowedSubs;
      }
    });

    return filtered;
  };

  const filteredFolders = getFilteredFolders();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container py-8">
          <p>Debes iniciar sesión para ver este proyecto.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectDetail) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container py-8">
          <p>Proyecto no encontrado.</p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (!value) return "$0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "No definida";
    return new Date(date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      
      <FileViewer
        files={fileViewer.files}
        initialIndex={fileViewer.initialIndex}
        isOpen={fileViewer.isOpen}
        onClose={fileViewer.closeViewer}
      />
      
      <div className="container py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{projectDetail.name}</h1>
              <p className="text-muted-foreground">
                {WORK_TYPES[projectDetail.workType as keyof typeof WORK_TYPES] || projectDetail.workType}
              </p>
            </div>
          </div>
          <Badge className={`${PROJECT_STATUSES[projectDetail.status as keyof typeof PROJECT_STATUSES]?.color || "bg-gray-500"} text-white text-sm px-3 py-1`}>
            {PROJECT_STATUSES[projectDetail.status as keyof typeof PROJECT_STATUSES]?.label || projectDetail.status}
          </Badge>
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {projectDetail.client?.whatsappPhone && user?.role !== "disenador" && (
            <Button
              variant="outline"
              size="sm"
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              onClick={() => {
                const phone = projectDetail.client?.whatsappPhone?.replace(/\D/g, "");
                window.open(`https://wa.me/57${phone}`, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={generatingPdf}>
            <FileDown className="h-4 w-4 mr-1" />
            {generatingPdf ? "Generando..." : "Exportar PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPhotoDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Subir Foto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDetailDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar Nota
          </Button>
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditDateForm({
                  estimatedInstallDate: projectDetail.estimatedInstallDate 
                    ? new Date(projectDetail.estimatedInstallDate).toISOString().split("T")[0] 
                    : "",
                  reason: "",
                });
                setShowEditDateDialog(true);
              }}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Editar Fechas
            </Button>
          )}
        </div>

        {/* Alerta de aprobación */}
        {projectDetail.status === "pendiente_cliente" && 
          (user?.role === "admin" || user?.role === "super_admin") && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
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

        {/* Tabs con colores distintivos */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1 bg-muted/50 mb-4">
            <TabsTrigger 
              value="info" 
              className="flex-1 min-w-[100px] text-sm px-4 py-2.5 bg-blue-100 text-blue-700 data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-200 transition-colors rounded-md"
            >
              <Info className="h-4 w-4 mr-2" />
              Información
            </TabsTrigger>
            <TabsTrigger 
              value="materials" 
              className="flex-1 min-w-[100px] text-sm px-4 py-2.5 bg-purple-100 text-purple-700 data-[state=active]:bg-purple-500 data-[state=active]:text-white hover:bg-purple-200 transition-colors rounded-md"
            >
              <Palette className="h-4 w-4 mr-2" />
              Materiales
            </TabsTrigger>
            <TabsTrigger 
              value="photos" 
              className="flex-1 min-w-[100px] text-sm px-4 py-2.5 bg-green-100 text-green-700 data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-200 transition-colors rounded-md"
            >
              <Camera className="h-4 w-4 mr-2" />
              Fotos
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="flex-1 min-w-[100px] text-sm px-4 py-2.5 bg-orange-100 text-orange-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white hover:bg-orange-200 transition-colors rounded-md"
            >
              <ListTodo className="h-4 w-4 mr-2" />
              Detalles
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex-1 min-w-[100px] text-sm px-4 py-2.5 bg-gray-200 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-300 transition-colors rounded-md"
            >
              <History className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Tab Información */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-3 bg-blue-50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 pt-4">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <strong>Nombre:</strong> {projectDetail.client?.name}
                  </p>
                  {user?.role !== "disenador" && (
                    <>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <strong>Teléfono:</strong> {projectDetail.client?.whatsappPhone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <strong>Email:</strong> {projectDetail.client?.email || "N/A"}
                      </p>
                    </>
                  )}
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <strong>Dirección:</strong> {projectDetail.client?.address || "N/A"}
                  </p>
                </CardContent>
              </Card>

              {user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                <Card>
                  <CardHeader className="py-3 bg-green-50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Información Financiera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 pt-4">
                    {/* Total del proyecto */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Total del Proyecto</span>
                      <span className="font-bold text-lg">{formatCurrency((projectDetail as any).financialInfo?.totalAmount || 0)}</span>
                    </div>
                    
                    {/* Adelanto pagado */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Adelanto Pagado (60%)</span>
                      <span className="font-semibold text-green-600">{formatCurrency((projectDetail as any).financialInfo?.advanceAmount || 0)}</span>
                    </div>
                    
                    {/* Saldo pendiente - DESTACADO */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-amber-800">Saldo Pendiente (40%)</span>
                        <span className="font-bold text-xl text-amber-600">
                          {formatCurrency((projectDetail as any).financialInfo?.remainingAmount || 0)}
                        </span>
                      </div>
                      {projectDetail.status === "entregado" && (projectDetail as any).financialInfo?.remainingAmount > 0 && (
                        <p className="text-xs text-amber-700 mt-1">
                          ⚠️ Proyecto entregado - Pendiente de cobro
                        </p>
                      )}
                    </div>
                    
                    {/* Botones de documentos */}
                    <div className="flex gap-2 pt-2">
                      {projectDetail.advanceReceiptUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => fileViewer.openViewer([{ url: projectDetail.advanceReceiptUrl!, title: "Comprobante de Pago" }], 0)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Ver Recibo 60%
                        </Button>
                      )}
                      {(projectDetail as any).quotationPdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => fileViewer.openViewer([{ url: (projectDetail as any).quotationPdfUrl!, title: "PDF Cotización" }], 0)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Cotización
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-3 bg-purple-50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Fechas del Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 pt-4">
                  <p><strong>Creado:</strong> {formatDate(projectDetail.createdAt)}</p>
                  <p><strong>Instalación Est.:</strong> {formatDate(projectDetail.estimatedInstallDate)}</p>
                  {projectDetail.deliveredAt && (
                    <p><strong>Entregado:</strong> {formatDate(projectDetail.deliveredAt)}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {((projectDetail as any).file3dUrl || (projectDetail as any).fileDesgloseUrl) && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Archivos de Diseño</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(projectDetail as any).file3dUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileViewer.openViewer([{ url: (projectDetail as any).file3dUrl!, title: "Archivo 3D" }], 0)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver 3D
                    </Button>
                  )}
                  {(projectDetail as any).fileDesgloseUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileViewer.openViewer([{ url: (projectDetail as any).fileDesgloseUrl!, title: "Despiece" }], 0)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Despiece
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Materiales */}
          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader className="py-3 bg-purple-50">
                <CardTitle className="text-sm">Materiales Seleccionados</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <MaterialsForm
                  projectId={projectDetail.id}
                  readOnly={user?.role === "disenador" || (user?.role !== "admin" && user?.role !== "super_admin")}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 bg-purple-50">
                <CardTitle className="text-sm">Herrajes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <HardwareSelector
                  projectId={projectDetail.id}
                  readOnly={user?.role === "disenador" || (user?.role !== "admin" && user?.role !== "super_admin")}
                  showOnlySelected={user?.role === "disenador"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Fotos */}
          <TabsContent value="photos" className="space-y-4">
            {Object.entries(filteredFolders).map(([category, subcategories]) => (
              <Card key={category}>
                <CardHeader className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
                  <CardTitle className="text-base font-bold text-white tracking-wide">
                    {categoryLabels[category] || category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {subcategories.map((subcategory) => {
                      const photos = projectDetail.photos?.filter(
                        (p: any) => p.category === category && p.subcategory === subcategory
                      ) || [];
                      return (
                        <div key={subcategory} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-base text-emerald-700 flex items-center gap-2">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                              {subcategoryLabels[subcategory] || subcategory}
                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${photos.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                              </span>
                            </h5>
                            {canUploadToFolder(subcategory) && (() => {
                              const uploadCheck = canUploadToStage(subcategory);
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!uploadCheck.allowed}
                                  title={uploadCheck.message || "Subir foto"}
                                  onClick={() => {
                                    if (!uploadCheck.allowed) {
                                      toast.error(uploadCheck.message);
                                      return;
                                    }
                                    setPhotoForm({
                                      ...photoForm,
                                      category: category as any,
                                      subcategory,
                                    });
                                    setShowPhotoDialog(true);
                                  }}
                                >
                                  <Upload className={`h-4 w-4 ${!uploadCheck.allowed ? 'text-gray-300' : ''}`} />
                                </Button>
                              );
                            })()}
                          </div>
                          {photos.length > 0 ? (
                            <>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {photos.map((photo: any, idx: number) => (
                                  <div
                                    key={photo.id}
                                    className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                                    onClick={() => fileViewer.openViewer(
                                      photos.map((p: any) => ({ url: p.photoUrl, title: p.description || "Foto" })),
                                      idx
                                    )}
                                  >
                                    {photo.photoUrl?.toLowerCase().endsWith('.pdf') || photo.photoUrl?.includes('application/pdf') ? (
                                      <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center">
                                        <FileText className="h-10 w-10 text-red-500" />
                                        <span className="text-xs text-red-600 mt-1 font-medium">PDF</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={photo.photoUrl}
                                        alt={photo.description || "Foto"}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ZoomIn className="h-6 w-6 text-white" />
                                    </div>
                                    {/* Botón eliminar solo para super_admin y admin */}
                                    {(user?.role === "super_admin" || user?.role === "admin") && (
                                      <button
                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPhotoToDelete({ id: photo.id, description: photo.description });
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {/* Botón de avanzar etapa - siempre visible para roles permitidos */}
                              {canShowAdvanceButton(subcategory) && (
                                <div className="mt-3 pt-3 border-t border-dashed border-emerald-200">
                                  <Button
                                    onClick={() => openAdvanceConfirmDialog(subcategory)}
                                    disabled={updateStatus.isPending}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
                                  >
                                    {updateStatus.isPending ? (
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                    )}
                                    Avanzar a {photoToNextStatus[subcategory] === "corte" ? "Corte" :
                                               photoToNextStatus[subcategory] === "enchape" ? "Enchape" :
                                               photoToNextStatus[subcategory] === "ensamble" ? "Ensamble" :
                                               photoToNextStatus[subcategory] === "listo_instalacion" ? "Listo para Instalación" :
                                               photoToNextStatus[subcategory] === "entregado" ? "Entregado" : "Siguiente Etapa"}
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <Camera className="h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400 font-medium">Sin fotos aún</p>
                                {canUploadToFolder(subcategory) && (
                                  <p className="text-xs text-gray-400 mt-1">Haz clic en el botón de subir para agregar</p>
                                )}
                              </div>
                              {/* Botón de avanzar etapa - siempre visible para roles permitidos */}
                              {canShowAdvanceButton(subcategory) && (
                                <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
                                  <Button
                                    onClick={() => openAdvanceConfirmDialog(subcategory)}
                                    disabled={updateStatus.isPending}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                                  >
                                    {updateStatus.isPending ? (
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                    )}
                                    Avanzar a {photoToNextStatus[subcategory] === "corte" ? "Corte" :
                                               photoToNextStatus[subcategory] === "enchape" ? "Enchape" :
                                               photoToNextStatus[subcategory] === "ensamble" ? "Ensamble" :
                                               photoToNextStatus[subcategory] === "listo_instalacion" ? "Listo para Instalación" :
                                               photoToNextStatus[subcategory] === "entregado" ? "Entregado" : "Siguiente Etapa"}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tab Detalles */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader className="py-3 bg-orange-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Notas y Detalles del Proyecto</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {projectDetail.details && projectDetail.details.length > 0 ? (
                  <div className="space-y-3">
                    {projectDetail.details.map((detail: any) => (
                      <div key={detail.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {detail.type === "medida_especial" ? "Medida Especial" : 
                               detail.type === "nota_importante" ? "Nota Importante" : "Foto Referencia"}
                            </Badge>
                            <h5 className="font-medium">{detail.title}</h5>
                            <p className="text-sm text-muted-foreground">{detail.content}</p>
                          </div>
                          {detail.photoUrl && (
                            <img
                              src={detail.photoUrl}
                              alt={detail.title}
                              className="w-16 h-16 object-cover rounded cursor-pointer"
                              onClick={() => fileViewer.openViewer([{ url: detail.photoUrl, title: detail.title }], 0)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay detalles registrados</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Historial */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="py-3 bg-gradient-to-r from-slate-600 to-slate-700">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial del Proyecto
                  {projectDetail.history && projectDetail.history.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {projectDetail.history.length} eventos
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {projectDetail.history && projectDetail.history.length > 0 ? (
                  <div className="relative">
                    {/* Línea vertical de timeline */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-purple-500"></div>
                    <div className="space-y-4">
                      {projectDetail.history.map((entry: any, index: number) => {
                        // Determinar icono y color según tipo de acción
                        // Construir texto de acción a partir de fromStatus y toStatus
                        const actionText = entry.toStatus 
                          ? `Cambio de estado: ${entry.fromStatus || 'Nuevo'} → ${entry.toStatus}`
                          : 'Evento registrado';
                        
                        const getActionStyle = (toStatus: string | undefined | null) => {
                          if (!toStatus) return { bg: 'bg-slate-500', icon: <Clock className="h-3 w-3 text-white" /> };
                          const statusLower = toStatus.toLowerCase();
                          if (statusLower.includes('cotizacion_enviada') || statusLower.includes('nuevo')) 
                            return { bg: 'bg-emerald-500', icon: <Plus className="h-3 w-3 text-white" /> };
                          if (statusLower.includes('aprobad') || statusLower.includes('confirm')) 
                            return { bg: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3 text-white" /> };
                          if (statusLower.includes('adelanto') || statusLower.includes('pagado')) 
                            return { bg: 'bg-yellow-500', icon: <DollarSign className="h-3 w-3 text-white" /> };
                          if (statusLower.includes('foto') || statusLower.includes('imagen')) 
                            return { bg: 'bg-blue-500', icon: <Camera className="h-3 w-3 text-white" /> };
                          if (statusLower.includes('diseno') || statusLower.includes('diseño')) 
                            return { bg: 'bg-purple-500', icon: <Palette className="h-3 w-3 text-white" /> };
                          if (statusLower.includes('instalacion') || statusLower.includes('entregado')) 
                            return { bg: 'bg-orange-500', icon: <RefreshCw className="h-3 w-3 text-white" /> };
                          return { bg: 'bg-slate-500', icon: <Clock className="h-3 w-3 text-white" /> };
                        };
                        const style = getActionStyle(entry.toStatus);
                        return (
                          <div key={entry.id} className="relative flex items-start gap-4 pl-8">
                            {/* Punto del timeline */}
                            <div className={`absolute left-2 w-5 h-5 rounded-full ${style.bg} flex items-center justify-center shadow-md`}>
                              {style.icon}
                            </div>
                            {/* Contenido */}
                            <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-800">{actionText}</p>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(entry.createdAt).toLocaleDateString("es-CO", { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                              {entry.notes && (
                                <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2 italic">
                                  "{entry.notes}"
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {new Date(entry.createdAt).toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}
                                {entry.user && (
                                  <>
                                    <span>•</span>
                                    <User className="h-3 w-3" />
                                    {entry.user.name}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-16 w-16 text-gray-200 mb-4" />
                    <p className="text-gray-400 font-medium">Sin historial aún</p>
                    <p className="text-xs text-gray-300 mt-1">Los eventos del proyecto aparecerán aquí</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogos */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Subir Archivos (JPG / PDF)</DialogTitle>
            <DialogDescription>Agrega fotos o documentos PDF al proyecto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select
                value={photoForm.category}
                onValueChange={(v) => setPhotoForm({ ...photoForm, category: v as any, subcategory: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona la categoría" /></SelectTrigger>
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
            {photoForm.category && photoForm.category !== "cotizacion" && (
              <div className="space-y-2">
                <Label>Subcategoría *</Label>
                <Select
                  value={photoForm.subcategory}
                  onValueChange={(v) => setPhotoForm({ ...photoForm, subcategory: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona subcategoría" /></SelectTrigger>
                  <SelectContent>
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
                        <SelectItem value="modelado">Modelado</SelectItem>
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

            {(photoForm.category === "cotizacion" || photoForm.subcategory) && (
              <PhotoUploader
                projectId={projectId}
                stage={photoForm.category === "cotizacion" ? "inicial" : 
                       photoForm.category === "medidas" ? "inicial" :
                       photoForm.category === "disenos" ? "diseno" :
                       photoForm.category === "avance" ? "corte" :
                       photoForm.category === "instalacion" ? "final" : "final"}
                maxFiles={10}
                accept="image/*,application/pdf"
                onUploadComplete={(urls) => {
                  // Guardar cada archivo en la base de datos
                  const stage = photoForm.category === "cotizacion" ? "inicial" : 
                               photoForm.category === "medidas" ? "inicial" :
                               photoForm.category === "disenos" ? "diseno" :
                               photoForm.category === "avance" ? "corte" :
                               photoForm.category === "instalacion" ? "final" : "final";
                  urls.forEach((url) => {
                    uploadPhoto.mutate({
                      projectId: projectId,
                      stage: stage,
                      category: photoForm.category,
                      subcategory: (photoForm.category === "cotizacion" ? "documento_cotizacion" : photoForm.subcategory || undefined) as "corte" | "enchape" | "fotos_iniciales" | "dibujo" | "renders" | "despieces" | "detalles" | "modelado" | "armado" | "proceso_instalacion" | "fotos_finales" | "documento_cotizacion" | undefined,
                      photoUrl: url,
                      description: photoForm.description || undefined,
                    });
                  });
                  setShowPhotoDialog(false);
                  setPhotoForm({ category: "medidas", subcategory: "", photoUrls: [], description: "" });
                }}
              />
            )}

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                value={photoForm.description}
                onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                placeholder="Descripción de los archivos..."
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Detalle</DialogTitle>
            <DialogDescription>Agrega una nota o detalle importante</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={detailForm.type}
                onValueChange={(v) => setDetailForm({ ...detailForm, type: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota_importante">Nota Importante</SelectItem>
                  <SelectItem value="medida_especial">Medida Especial</SelectItem>
                  <SelectItem value="foto_referencia">Foto de Referencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input
                value={detailForm.title}
                onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                placeholder="Título del detalle"
              />
            </div>
            <div>
              <Label>Contenido</Label>
              <Textarea
                value={detailForm.content}
                onChange={(e) => setDetailForm({ ...detailForm, content: e.target.value })}
                placeholder="Descripción o contenido"
              />
            </div>
            {detailForm.type === "foto_referencia" && (
              <div>
                <Label>Foto</Label>
                <PhotoUploader
                  onUploadComplete={(urls: string[]) => {
                    if (urls.length > 0) {
                      setDetailForm({ ...detailForm, photoUrl: urls[0] });
                    }
                  }}
                  maxFiles={1}
                />
                {detailForm.photoUrl && (
                  <img src={detailForm.photoUrl} alt="Preview" className="w-20 h-20 object-cover rounded mt-2" />
                )}
              </div>
            )}
            <Button
              className="w-full"
              disabled={!detailForm.title}
              onClick={() => {
                toast.info("Función de agregar detalle en desarrollo");
                setShowDetailDialog(false);
              }}
            >
              Guardar Detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDateDialog} onOpenChange={setShowEditDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fecha de Instalación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha Estimada de Instalación</Label>
              <Input
                type="date"
                value={editDateForm.estimatedInstallDate}
                onChange={(e) => setEditDateForm({ ...editDateForm, estimatedInstallDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Motivo del cambio</Label>
              <Textarea
                value={editDateForm.reason}
                onChange={(e) => setEditDateForm({ ...editDateForm, reason: e.target.value })}
                placeholder="Explica el motivo del cambio de fecha"
              />
            </div>
            <Button
              className="w-full"
              disabled={!editDateForm.estimatedInstallDate || updateDate.isPending}
              onClick={() => {
                updateDate.mutate({
                  projectId: projectDetail.id,
                  estimatedInstallDate: new Date(editDateForm.estimatedInstallDate),
                  reason: editDateForm.reason,
                });
              }}
            >
              {updateDate.isPending ? "Guardando..." : "Guardar Fecha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar foto */}
      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La foto {photoToDelete?.description ? `"${photoToDelete.description}"` : ''} será eliminada permanentemente del proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (photoToDelete) {
                  deletePhoto.mutate({ id: photoToDelete.id });
                }
              }}
            >
              {deletePhoto.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación para avanzar etapa */}
      <AlertDialog open={advanceConfirmDialog.open} onOpenChange={(open) => !open && setAdvanceConfirmDialog({ open: false, subcategory: "", nextStatus: "", hasPhotos: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {advanceConfirmDialog.hasPhotos 
                ? "¿Avanzar a la siguiente etapa?" 
                : "⚠️ Sin fotos en esta etapa"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {advanceConfirmDialog.hasPhotos ? (
                <>
                  El proyecto pasará de <strong>{subcategoryLabels[advanceConfirmDialog.subcategory] || advanceConfirmDialog.subcategory}</strong> a{" "}
                  <strong>
                    {advanceConfirmDialog.nextStatus === "corte" ? "Corte" :
                     advanceConfirmDialog.nextStatus === "enchape" ? "Enchape" :
                     advanceConfirmDialog.nextStatus === "ensamble" ? "Ensamble" :
                     advanceConfirmDialog.nextStatus === "listo_instalacion" ? "Listo para Instalación" :
                     advanceConfirmDialog.nextStatus === "entregado" ? "Entregado" : "Siguiente Etapa"}
                  </strong>.
                  <br /><br />
                  ¿Está seguro de continuar?
                </>
              ) : (
                <>
                  No hay fotos subidas en la etapa de <strong>{subcategoryLabels[advanceConfirmDialog.subcategory] || advanceConfirmDialog.subcategory}</strong>.
                  <br /><br />
                  Se recomienda subir al menos una foto antes de avanzar para documentar el progreso del proyecto.
                  <br /><br />
                  ¿Desea avanzar de todas formas?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={advanceConfirmDialog.hasPhotos 
                ? "bg-emerald-500 hover:bg-emerald-600" 
                : "bg-amber-500 hover:bg-amber-600"}
              onClick={handleAdvanceFromPhoto}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Avanzando..." : (advanceConfirmDialog.hasPhotos ? "Sí, avanzar" : "Avanzar sin fotos")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
