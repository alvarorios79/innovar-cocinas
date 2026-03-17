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
  MessageSquare,
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
  ArrowRight,
  XCircle,
  Box,
  ImageIcon,
  Truck,
  Hammer,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CreditCard
} from "lucide-react";
import { useEffect } from "react";
import { useFileViewer, FileViewer } from "@/components/FileViewer";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
import { ProjectResultCard } from "@/components/ProjectResultCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PaymentsSection } from "@/components/PaymentsSection";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toast } from "sonner";


// Estados del proyecto según Ruta INNOVAR (14 estados simplificados)
const PROJECT_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  contacto: { label: "Contacto", color: "bg-slate-400", icon: Clock },
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Adelanto Recibido", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: AlertCircle },
  pendiente_modelado: { label: "Pendiente Modelado 3D", color: "bg-violet-500", icon: AlertCircle },
  pendiente_render: { label: "Pendiente Renders", color: "bg-amber-500", icon: AlertCircle },
  aprobacion_final: { label: "Aprobación Final", color: "bg-green-400", icon: CheckCircle2 },
  despiece: { label: "Despiece", color: "bg-indigo-500", icon: AlertCircle },
  corte: { label: "En Corte", color: "bg-orange-500", icon: AlertCircle },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: AlertCircle },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: AlertCircle },
  listo_instalacion: { label: "Listo para Instalación", color: "bg-teal-500", icon: AlertCircle },
  entregado: { label: "Entregado", color: "bg-green-700", icon: CheckCircle2 },
};

// Función para obtener la etiqueta dinámica del estado
const getStatusLabel = (status: string, modeladoRevisionNumber?: number | null, renderRevisionNumber?: number | null): string => {
  if (status === "pendiente_modelado" && modeladoRevisionNumber && modeladoRevisionNumber > 0) {
    return `Pendiente Aprobación Modelado ${modeladoRevisionNumber}`;
  }
  if (status === "pendiente_render" && renderRevisionNumber && renderRevisionNumber > 0) {
    return `Pendiente Aprobación Render ${renderRevisionNumber}`;
  }
  return PROJECT_STATUSES[status]?.label || status;
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
  
  // Toggle para ocultar información financiera (CEO, admin, comercial)
  const [showFinancialInfo, setShowFinancialInfo] = useState(false);
  const [materialExpensesTotal, setMaterialExpensesTotal] = useState(0);
  
  // Candado para evitar clics accidentales en aprobación del cliente
  const [approvalUnlocked, setApprovalUnlocked] = useState(false);
  
  // Diálogo para enviar directo a taller (saltar diseño)
  const [showDirectToWorkshopDialog, setShowDirectToWorkshopDialog] = useState(false);

  const { data: projectDetail, isLoading, error } = trpc.projects.getById.useQuery(
    { id: projectId },
    {
      enabled: !!projectId,
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );

  // Cargar gastos de materiales del proyecto
  const { data: expensesData } = trpc.expenses.getProjectMaterialExpenses.useQuery(
    { projectId },
    {
      enabled: !!projectId,
    }
  );

  // Actualizar total de gastos cuando cambien
  useEffect(() => {
    if (expensesData?.total) {
      setMaterialExpensesTotal(expensesData.total);
    }
  }, [expensesData?.total]);

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

  // Mutación para agregar detalles del proyecto
  const createDetail = trpc.projectDetails.create.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Detalle agregado correctamente");
      setShowDetailDialog(false);
      setDetailForm({ type: "nota_importante", title: "", content: "", photoUrl: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al agregar detalle");
    },
  });

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

  // Mutaciones para enviar modelado y renders al cliente
  const sendModeladoToClient = trpc.publicGallery.sendModeladoToClient.useMutation({
    onSuccess: (data) => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar modelado");
    },
  });

  const sendRendersToClient = trpc.publicGallery.sendRendersToClient.useMutation({
    onSuccess: (data) => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar renders");
    },
  });

  const resetRendersApproval = trpc.publicGallery.resetRendersApproval.useMutation({
    onSuccess: (data) => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Aprobación de renders reiniciada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reiniciar aprobación");
    },
  });

  const resetModeladoApproval = trpc.publicGallery.resetModeladoApproval.useMutation({
    onSuccess: (data) => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Aprobacion de modelado reiniciada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reiniciar aprobacion");
    },
  });

  const sendSectionNotification = trpc.projects.sendSectionNotification.useMutation({
    onSuccess: (data) => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success(data.message || "Notificacion enviada por WhatsApp");
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar notificacion");
    },
  });

  // Funcion para enviar notificacion de seccion
  const handleSendSectionNotification = (subcategory: string) => {
    if (!projectId) return;
    // Convertir subcategory a sectionKey válido
    const sectionKey = subcategoryToSectionKey[subcategory] || "corte";
    sendSectionNotification.mutate({
      projectId,
      sectionKey,
    });
  };

  // Verificar si el usuario puede enviar notificaciones de seccion
  const canSendSectionNotification = () => {
    const role = user?.role;
    return role === "super_admin" || role === "admin";
  };

  // Mapeo de subcategory a sectionKey válido para el backend
  const subcategoryToSectionKey: Record<string, "corte" | "enchape" | "armado" | "instalacion" | "entrega"> = {
    // Fotos de avance
    corte: "corte",
    enchape: "enchape",
    armado: "armado",
    // Fotos de instalación
    proceso_instalacion: "instalacion",
    // Fotos finales
    fotos_finales: "entrega",
    // Fallback para otros valores
    fotos_iniciales: "corte",
    renders: "corte",
    despieces: "corte",
    detalles: "corte",
    modelado_3d: "corte",
    dibujo: "corte",
  };

  // Mapeo de seccion a emoji y nombre
  const sectionNotificationMap: Record<string, { emoji: string; name: string }> = {
    corte: { emoji: "📦", name: "Corte" },
    enchape: { emoji: "🎨", name: "Enchape" },
    armado: { emoji: "🔧", name: "Armado" },
    instalacion: { emoji: "🏠", name: "Instalacion" },
    entrega: { emoji: "✅", name: "Entrega" },
  }

  // Mapeo de subcategoría de foto a siguiente estado del proyecto
  const photoToNextStatus: Record<string, string> = {
    despiece: "corte",
    corte: "enchape",
    enchape: "ensamble",
    armado: "listo_instalacion",
    proceso_instalacion: "entregado",
    fotos_finales: "entregado",
  };

  // Mapeo de subcategoría a estado requerido para mostrar botón de avanzar
  // El botón aparece cuando el proyecto está en la etapa correspondiente o en etapas anteriores de producción
  const photoToCurrentStatus: Record<string, string[]> = {
    despiece: ["despiece", "pendiente_render", "aprobacion_final"],
    corte: ["corte", "despiece"],
    enchape: ["enchape", "corte"],
    armado: ["ensamble", "enchape"],
    proceso_instalacion: ["listo_instalacion", "listo_instalacion"],
    fotos_finales: ["listo_instalacion", "entregado"],
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
    corte: "despieces",  // despieces con 's' es la subcategoría correcta
    enchape: "corte",
    armado: "enchape",
    proceso_instalacion: "armado",
    fotos_finales: "proceso_instalacion",
  };

  // Verificar si la etapa anterior tiene al menos una foto
  const hasPreviousStagePhotos = (subcategory: string): boolean => {
    const previousStage = previousStageMap[subcategory];
    if (!previousStage) return true; // despiece no tiene etapa anterior
    
    const photos = projectDetail?.photos || [];
    return photos.some((p: any) => p.subcategory === previousStage);
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
    const hasPhotos = photos.some((p: any) => p.subcategory === subcategory);
    
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
    modelado_3d: "Modelado 3D",
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
      modelado_3d: ["disenador"],
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
      disenos: ["modelado_3d", "renders", "detalles", "despieces"],
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
          documento_cotizacion: ["super_admin", "admin", "comercial"],
          fotos_iniciales: ["super_admin", "admin", "comercial", "disenador"],
          dibujo: ["super_admin", "admin", "comercial", "disenador"],
          renders: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          despieces: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          detalles: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          modelado_3d: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          corte: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          enchape: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          armado: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          proceso_instalacion: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
          fotos_finales: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
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
          {error && <p className="text-red-500 mt-2">Error: {error.message}</p>}
          <p className="text-sm text-gray-500 mt-2">ID: {projectId} | Loading: {isLoading}</p>
          <Button onClick={() => window.history.back()} className="mt-4">
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
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      
      <FileViewer
        files={fileViewer.files}
        initialIndex={fileViewer.initialIndex}
        isOpen={fileViewer.isOpen}
        onClose={fileViewer.closeViewer}
      />
      
      <div className="container py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Proyectos", href: "/projects" },
            { label: projectDetail.name },
          ]}
        />
        
        {/* Header */}
        <PageHeader
          title={projectDetail.name}
          subtitle={WORK_TYPES[projectDetail.workType as keyof typeof WORK_TYPES] || projectDetail.workType}
          showBack={true}
          actions={
            <Badge className={`${PROJECT_STATUSES[projectDetail.status as keyof typeof PROJECT_STATUSES]?.color || "bg-gray-500"} text-white text-sm px-3 py-1`}>
              {getStatusLabel(projectDetail.status, (projectDetail as any).modeladoRevisionNumber, (projectDetail as any).renderRevisionNumber)}
            </Badge>
          }
        />

        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {projectDetail.client?.whatsappPhone && user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
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
          {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "jefe_taller") && (
            <Button
              variant="outline"
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500"
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
          {/* Botón Enviar directo a Taller - Solo para super_admin y admin */}
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <Button
              variant="outline"
              size="sm"
              className={`${
                ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render"].includes(projectDetail.status as string)
                  ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-600"
                  : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
              }`}
              disabled={
                !["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render"].includes(projectDetail.status as string) ||
                updateStatus.isPending
              }
              onClick={() => setShowDirectToWorkshopDialog(true)}
              title={
                ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render"].includes(projectDetail.status as string)
                  ? "Saltar etapas de diseño y enviar proyecto directamente al taller"
                  : "Solo disponible en etapas de diseño (adelanto recibido, en diseño, pendiente modelado, pendiente render)"
              }
            >
              <Hammer className="h-4 w-4 mr-1" />
              Directo a Taller
            </Button>
          )}
        </div>

        {/* Panel de Control de Diseño - Diseño Moderno */}
        {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (
          <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Header del Panel */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Centro de Control de Diseño
              </h3>
              <p className="text-teal-100 text-sm mt-1">Gestiona el envío y aprobación de diseños del cliente</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6">
              {/* Grid de Tarjetas de Acción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* Tarjeta Modelado 3D */}
                <div className={`relative rounded-xl p-5 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-200 dark:border-purple-700 hover:shadow-md' : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                      <Box className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Modelado 3D</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 
                          ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length} imagen(es) listas`
                          : 'Sin imágenes aún'}
                      </p>
                      {projectDetail.modeladoApprovedAt && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprobado por {projectDetail.modeladoApprovedBy}
                        </div>
                      )}
                    </div>
                  </div>
                  {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 && (
                    <Button
                      size="sm"
                      className={`w-full mt-4 shadow-sm ${(projectDetail.modeladoRevisionNumber || 0) >= 1 ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                      onClick={() => sendModeladoToClient.mutate({ projectId: projectDetail.id })}
                      disabled={sendModeladoToClient.isPending}
                      title={(projectDetail.modeladoRevisionNumber || 0) >= 1 ? 'Reenviar enlace de aprobación al cliente (incrementará la revisión)' : 'Enviar modelado al cliente para aprobación'}
                    >
                      <MessageCircle className={`h-4 w-4 mr-2 ${sendModeladoToClient.isPending ? 'animate-spin' : ''}`} />
                      {sendModeladoToClient.isPending ? 'Enviando...' : (projectDetail.modeladoRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.modeladoRevisionNumber || 0) + 1})` : 'Enviar Modelado'}
                    </Button>
                  )}
                </div>
                
                {/* Tarjeta Renders */}
                <div className={`relative rounded-xl p-5 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-2 border-emerald-200 dark:border-emerald-700 hover:shadow-md' : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Renders Finales</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 
                          ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length} imagen(es) listas`
                          : 'Sin imágenes aún'}
                      </p>
                      {projectDetail.rendersApprovedAt && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprobado por {projectDetail.rendersApprovedBy}
                        </div>
                      )}
                    </div>
                  </div>
                  {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 && (
                    <Button
                      size="sm"
                      className={`w-full mt-4 shadow-sm ${(projectDetail.renderRevisionNumber || 0) >= 1 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                      onClick={() => sendRendersToClient.mutate({ projectId: projectDetail.id })}
                      disabled={sendRendersToClient.isPending}
                      title={(projectDetail.renderRevisionNumber || 0) >= 1 ? 'Reenviar enlace de aprobación al cliente (incrementará la revisión)' : 'Enviar renders al cliente para aprobación'}
                    >
                      <MessageCircle className={`h-4 w-4 mr-2 ${sendRendersToClient.isPending ? 'animate-spin' : ''}`} />
                      {sendRendersToClient.isPending ? 'Enviando...' : (projectDetail.renderRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.renderRevisionNumber || 0) + 1})` : 'Enviar Renders'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Sección de Aprobación - Siempre visible */}
              {(() => {
                // Estados donde se puede aprobar internamente (admin/comercial puede aprobar en nombre del cliente)
                const isInDesignPhase = ["en_diseno", "pendiente_modelado", "pendiente_render"].includes(projectDetail.status as string);
                const isPendingApproval = (projectDetail.status as string) === "pendiente_modelado" || (projectDetail.status as string) === "pendiente_render";
                const isApproved = projectDetail.rendersApprovedAt || projectDetail.modeladoApprovedAt;
                const hasDesignContent = (projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d" || p.subcategory === "renders").length || 0) > 0;
                
                let statusMessage = "";
                let statusColor = "gray";
                
                if (isPendingApproval) {
                  statusMessage = "Esperando confirmación del cliente por WhatsApp";
                  statusColor = "amber";
                } else if (projectDetail.rendersApprovedAt) {
                  statusMessage = `Renders aprobados el ${new Date(projectDetail.rendersApprovedAt).toLocaleDateString('es-CO')}`;
                  statusColor = "green";
                } else if (projectDetail.modeladoApprovedAt) {
                  statusMessage = `Modelado aprobado el ${new Date(projectDetail.modeladoApprovedAt).toLocaleDateString('es-CO')}`;
                  statusColor = "green";
                } else if ((projectDetail.status as string) === "en_diseno") {
                  statusMessage = "En proceso de diseño - Puedes aprobar si el cliente confirma por teléfono/WhatsApp";
                  statusColor = "blue";
                } else if (!hasDesignContent) {
                  statusMessage = "Sube imágenes de modelado o renders primero";
                  statusColor = "gray";
                } else {
                  statusMessage = "Envía el diseño al cliente para solicitar aprobación";
                  statusColor = "blue";
                }
                
                return (
                  <div className={`rounded-xl p-5 border mb-4 ${
                    statusColor === "amber" ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700" :
                    statusColor === "green" ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700" :
                    statusColor === "blue" ? "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border-blue-200 dark:border-blue-700" :
                    "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg text-white ${
                        statusColor === "amber" ? "bg-amber-500" :
                        statusColor === "green" ? "bg-green-500" :
                        statusColor === "blue" ? "bg-blue-500" :
                        "bg-gray-400"
                      }`}>
                        {statusColor === "green" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${
                          statusColor === "amber" ? "text-amber-800 dark:text-amber-200" :
                          statusColor === "green" ? "text-green-800 dark:text-green-200" :
                          statusColor === "blue" ? "text-blue-800 dark:text-blue-200" :
                          "text-gray-600 dark:text-gray-400"
                        }`}>
                          {isPendingApproval ? "Pendiente de Aprobación" : isApproved ? "Diseño Aprobado" : "Aprobar en Nombre del Cliente"}
                        </h4>
                        <p className={`text-sm ${
                          statusColor === "amber" ? "text-amber-600 dark:text-amber-400" :
                          statusColor === "green" ? "text-green-600 dark:text-green-400" :
                          statusColor === "blue" ? "text-blue-600 dark:text-blue-400" :
                          "text-gray-500 dark:text-gray-500"
                        }`}>{statusMessage}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      {/* Botón de candado para desbloquear aprobación */}
                      {isInDesignPhase && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setApprovalUnlocked(!approvalUnlocked)}
                          className={`${
                            approvalUnlocked 
                              ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20" 
                              : "border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                          title={approvalUnlocked ? "Clic para bloquear" : "Clic para desbloquear y poder aprobar"}
                        >
                          {approvalUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          approveDesign.mutate({ projectId: projectDetail.id, approved: true });
                          setApprovalUnlocked(false);
                        }}
                        disabled={approveDesign.isPending || !isInDesignPhase || !approvalUnlocked}
                        className={`shadow-sm ${
                          isInDesignPhase && approvalUnlocked
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        title={!isInDesignPhase ? "Solo disponible durante el proceso de diseño" : !approvalUnlocked ? "Desbloquea primero con el candado" : "Aprobar en nombre del cliente (confirmación por teléfono/WhatsApp)"}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        variant="outline"
                        className={`${
                          isInDesignPhase && approvalUnlocked
                            ? "border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" 
                            : "border-gray-300 text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => {
                          if (isInDesignPhase && approvalUnlocked) {
                            const notes = prompt("Indica qué cambios se necesitan:");
                            if (notes) {
                              approveDesign.mutate({ projectId: projectDetail.id, approved: false, notes });
                              setApprovalUnlocked(false);
                            }
                          }
                        }}
                        disabled={approveDesign.isPending || !isInDesignPhase || !approvalUnlocked}
                        title={!isInDesignPhase ? "Solo disponible durante el proceso de diseño" : !approvalUnlocked ? "Desbloquea primero con el candado" : "Registrar cambios solicitados por el cliente"}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Solicitar Cambios
                      </Button>
                    </div>
                    {projectDetail.clientApprovalNotes && (
                      <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          <strong>📝 Últimos cambios solicitados:</strong> {projectDetail.clientApprovalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
            </div>
          </div>
        )}

        {/* Tabs con colores distintivos */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="flex md:flex-wrap overflow-x-auto md:overflow-x-visible w-full gap-1 h-auto p-1 bg-muted/50 mb-4 md:mb-4 scrollbar-hide">
            <TabsTrigger 
              value="info" 
              className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-blue-100 text-blue-700 data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-200 transition-colors rounded-md whitespace-nowrap"
            >
              <Info className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Información</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger 
              value="materials" 
              className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-purple-100 text-purple-700 data-[state=active]:bg-purple-500 data-[state=active]:text-white hover:bg-purple-200 transition-colors rounded-md whitespace-nowrap"
            >
              <Palette className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Materiales</span>
              <span className="sm:hidden">Mat.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="photos" 
              className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-green-100 text-green-700 data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-200 transition-colors rounded-md whitespace-nowrap"
            >
              <Camera className="h-4 w-4 mr-1 sm:mr-2" />
              Fotos
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-orange-100 text-orange-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white hover:bg-orange-200 transition-colors rounded-md whitespace-nowrap"
            >
              <ListTodo className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Detalles</span>
              <span className="sm:hidden">Det.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-gray-200 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-300 transition-colors rounded-md whitespace-nowrap"
            >
              <History className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
              <TabsTrigger 
                value="payments" 
                className="flex-shrink-0 md:flex-1 min-w-max md:min-w-0 text-xs sm:text-sm px-2 sm:px-4 py-2.5 bg-emerald-100 text-emerald-700 data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:bg-emerald-200 transition-colors rounded-md whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Pagos</span>
                <span className="sm:hidden">Pag.</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab Información */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
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

              {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
                <Card>
                  <CardHeader className="py-3 bg-green-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Información Financiera
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFinancialInfo(!showFinancialInfo)}
                        className="h-7 px-2 text-xs"
                      >
                        {showFinancialInfo ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Ocultar</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Mostrar</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {showFinancialInfo ? (
                    <CardContent className="text-sm space-y-3 pt-4">
                      {/* Total del proyecto */}
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Total del Proyecto</span>
                        <span className="font-bold text-lg">{formatCurrency((projectDetail as any).financialInfo?.totalAmount || 0)}</span>
                      </div>
                      
                      {/* Desglose de Pagos Dinámico */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-blue-700 mb-2">Desglose de Pagos</p>
                        <div className="space-y-1 text-xs text-blue-600">
                          {(projectDetail as any).payments && (projectDetail as any).payments.length > 0 ? (
                            (projectDetail as any).payments.map((payment: any, idx: number) => (
                              <p key={idx}>
                                • {payment.type === 'adelanto' ? 'Pago 1 (Adelanto)' :
                                   payment.type === 'saldo_final' ? 'Pago 2 (Final)' :
                                   payment.type === 'abono' ? `Abono ${idx}` : 'Otro Pago'}
                                : {formatCurrency(payment.amount)}
                              </p>
                            ))
                          ) : (
                            <p>Sin pagos registrados</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Total Pagado */}
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Total Pagado ({Math.round(((projectDetail as any).financialInfo?.totalCobrado || 0) / ((projectDetail as any).financialInfo?.totalAmount || 1) * 100)}%)</span>
                        <span className="font-semibold text-green-600">{formatCurrency((projectDetail as any).financialInfo?.totalCobrado || 0)}</span>
                      </div>
                      
                      {/* Saldo pendiente - DESTACADO */}
                      <div className={`border rounded-lg p-3 ${
                        (projectDetail as any).financialInfo?.remainingAmount > 0
                          ? "bg-amber-50 border-amber-200"
                          : "bg-green-50 border-green-200"
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${
                            (projectDetail as any).financialInfo?.remainingAmount > 0
                              ? "text-amber-800"
                              : "text-green-800"
                          }`}>
                            {(projectDetail as any).financialInfo?.remainingAmount > 0
                              ? `Saldo Pendiente (${Math.round(((projectDetail as any).financialInfo?.remainingAmount || 0) / ((projectDetail as any).financialInfo?.totalAmount || 1) * 100)}%)`
                              : "✅ Cancelado 100%"}
                          </span>
                          <span className={`font-bold text-xl ${
                            (projectDetail as any).financialInfo?.remainingAmount > 0
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}>
                            {(projectDetail as any).financialInfo?.remainingAmount > 0
                              ? formatCurrency((projectDetail as any).financialInfo?.remainingAmount || 0)
                              : "✓ Completado"}
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
                  ) : (
                    <CardContent className="py-8 flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-2">
                        <DollarSign className="h-10 w-10 text-green-600" />
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {projectDetail && user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
                <ProjectResultCard
                  totalAmount={Number((projectDetail as any).financialInfo?.totalAmount || 0)}
                  materialExpenses={materialExpensesTotal}
                  status={projectDetail.status}
                />
              )}

              <Card>
                <CardHeader className="py-3 bg-purple-50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Fechas del Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 pt-4">
                  {/* Fechas de la cotización */}
                  {(projectDetail as any).quotation?.createdAt && (
                    <p className="text-blue-600">
                      <strong>📋 Cotización creada:</strong> {formatDate((projectDetail as any).quotation.createdAt)}
                    </p>
                  )}
                  {(projectDetail as any).quotation?.validUntil && (
                    <p className={new Date((projectDetail as any).quotation.validUntil) < new Date() ? "text-red-500" : "text-blue-600"}>
                      <strong>📅 Válida hasta:</strong> {formatDate((projectDetail as any).quotation.validUntil)}
                      {new Date((projectDetail as any).quotation.validUntil) < new Date() && " (Vencida)"}
                    </p>
                  )}
                  
                  {/* Fecha de creación del proyecto */}
                  <p><strong>Creado:</strong> {formatDate(projectDetail.createdAt)}</p>
                  
                  {/* Fechas de instalación - Tentativa (roja) y Oficial (verde) - Siempre visibles */}
                  {projectDetail.tentativeInstallDate && (
                    <p className="text-red-600 font-medium">
                      <strong>🔴 Instalación tentativa:</strong> {formatDate(projectDetail.tentativeInstallDate)}
                    </p>
                  )}
                  {projectDetail.estimatedInstallDate && projectDetail.isInstallDateOfficial && (
                    <p className="text-green-600 font-medium">
                      <strong>🟢 Instalación oficial:</strong> {formatDate(projectDetail.estimatedInstallDate)}
                    </p>
                  )}
                  {projectDetail.estimatedInstallDate && !projectDetail.isInstallDateOfficial && !projectDetail.tentativeInstallDate && (
                    <p><strong>Instalación Est.:</strong> {formatDate(projectDetail.estimatedInstallDate)}</p>
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
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {photos.map((photo: any, idx: number) => {
                                  if (idx === 0) {
                                    console.log('=== PHOTO DEBUG ===');
               
                                    console.log('photoUrl:', photo.photoUrl);
                                  }
                                  return (
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
                                        src={photo.photoUrl || ''}
                                        alt={photo.description || "Foto"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          console.log('Image load error for:', photo.photoUrl);
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                                        }}
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ZoomIn className="h-6 w-6 text-white" />
                                    </div>
                                    {/* Botón eliminar - admin/comercial pueden eliminar cualquiera, colaboradores solo sus propias fotos */}
                                    {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "comercial" || 
                                      ((user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "disenador") && photo.uploadedBy === user?.id)) && (
                                      <button
                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPhotoToDelete({ id: photo.id, description: photo.description });
                                        }}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </button>                                    )})
                                  </div>
                                );
                                })})                              </div>
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
                                  {canSendSectionNotification() && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={sendSectionNotification.isPending}
                                      onClick={() => handleSendSectionNotification(subcategory)}
                                      className="w-full sm:w-auto mt-2 text-xs sm:text-sm"
                                    >
                                      {sendSectionNotification.isPending ? "Enviando..." : "📲 Notificar al cliente"}
                                    </Button>
                                  )}
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
                                  {canSendSectionNotification() && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={sendSectionNotification.isPending}
                                      onClick={() => handleSendSectionNotification(subcategory)}
                                      className="w-full sm:w-auto mt-2 text-xs sm:text-sm"
                                    >
                                      {sendSectionNotification.isPending ? "Enviando..." : "📲 Notificar al cliente"}
                                    </Button>
                                  )}
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
            {/* Sección de Historial de Revisiones del Cliente */}
            {projectDetail.clientRevisions && projectDetail.clientRevisions.length > 0 && (
              <Card className="border-orange-300 bg-orange-50/50">
                <CardHeader className="py-3 bg-gradient-to-r from-orange-500 to-orange-600">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Historial de Cambios Solicitados por el Cliente ({projectDetail.clientRevisions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {projectDetail.clientRevisions.map((revision: any, index: number) => (
                      <div key={revision.id || index} className="p-3 bg-white rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${revision.type === 'modelado_3d' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {revision.type === 'modelado_3d' ? '📎 Modelado 3D' : '🎨 Renders'} - Rev. {revision.revisionNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {revision.clientName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{revision.changes}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(revision.createdAt).toLocaleDateString('es-CO', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Mostrar último cambio si no hay historial pero sí hay nota */}
            {(!projectDetail.clientRevisions || projectDetail.clientRevisions.length === 0) && projectDetail.clientApprovalNotes && (
              <Card className="border-orange-300 bg-orange-50/50">
                <CardHeader className="py-3 bg-gradient-to-r from-orange-500 to-orange-600">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Cambios Solicitados por el Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-700">{projectDetail.clientApprovalNotes}</p>
                      {projectDetail.changesRequestedAt && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Solicitado: {new Date(projectDetail.changesRequestedAt).toLocaleDateString('es-CO', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3 bg-orange-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Notas y Detalles del Proyecto</CardTitle>
                {/* Solo Super Admin, Admin, Comercial y Diseñador pueden agregar detalles */}
                {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "comercial" || user?.role === "disenador") && (
                  <Button variant="ghost" size="sm" onClick={() => setShowDetailDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {(projectDetail as any)?.details && (projectDetail as any)?.details?.length > 0 ? (
                  <div className="space-y-3">
                    {projectDetail.details.map((detail: any) => (
                      <div key={detail.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {detail.type === "medida_especial" ? "Medida Especial" : 
                               detail.type === "nota_importante" ? "Nota Importante" : "Foto Referencia"}
                            </Badge>
                            <h5 className="font-medium break-words min-w-0">{detail.title}</h5>
                            <p className="text-sm text-muted-foreground break-words min-w-0">{detail.content}</p>
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
                        // Determinar icono y color según tipo de evento (unificado)
                        const getEventStyle = (eventType: string, newStatus: string | null) => {
                          // Estilos por tipo de evento
                          if (eventType === 'client') {
                            return { bg: 'bg-cyan-500', icon: <User className="h-3 w-3 text-white" />, label: 'Cliente' };
                          }
                          if (eventType === 'appointment') {
                            return { bg: 'bg-indigo-500', icon: <Calendar className="h-3 w-3 text-white" />, label: 'Cita' };
                          }
                          if (eventType === 'quotation') {
                            return { bg: 'bg-amber-500', icon: <FileText className="h-3 w-3 text-white" />, label: 'Cotización' };
                          }
                          // Tipo 'project' - usar colores según estado
                          if (!newStatus) return { bg: 'bg-slate-500', icon: <Clock className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          const statusLower = newStatus.toLowerCase();
                          if (statusLower.includes('cotizacion_enviada') || statusLower.includes('nuevo')) 
                            return { bg: 'bg-emerald-500', icon: <Plus className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('aprobad') || statusLower.includes('confirm') || statusLower.includes('aprobacion')) 
                            return { bg: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('adelanto') || statusLower.includes('pagado')) 
                            return { bg: 'bg-yellow-500', icon: <DollarSign className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('pendiente_modelado') || statusLower.includes('pendiente_render')) 
                            return { bg: 'bg-violet-500', icon: <AlertCircle className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('diseno') || statusLower.includes('diseño') || statusLower.includes('pendiente_cliente')) 
                            return { bg: 'bg-purple-500', icon: <Palette className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('corte') || statusLower.includes('enchape') || statusLower.includes('ensamble') || statusLower.includes('despiece')) 
                            return { bg: 'bg-orange-500', icon: <Hammer className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          if (statusLower.includes('instalacion') || statusLower.includes('entregado')) 
                            return { bg: 'bg-teal-500', icon: <Truck className="h-3 w-3 text-white" />, label: 'Proyecto' };
                          return { bg: 'bg-slate-500', icon: <Clock className="h-3 w-3 text-white" />, label: 'Proyecto' };
                        };
                        
                        const style = getEventStyle(entry.type || 'project', entry.newStatus);
                        
                        // Construir texto de acción según tipo de evento
                        let actionText = '';
                        if (entry.type === 'client') {
                          actionText = 'Contacto Inicial';
                        } else if (entry.type === 'appointment') {
                          actionText = 'Visita / Cita';
                        } else if (entry.type === 'quotation') {
                          actionText = 'Cotización';
                        } else {
                          actionText = entry.newStatus 
                            ? `Cambio de estado: ${entry.previousStatus || 'Nuevo'} → ${entry.newStatus}`
                            : 'Evento registrado';
                        }
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

          {/* Tab Pagos */}
          {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
            <TabsContent value="payments" className="space-y-4">
              <PaymentsSection 
                projectId={projectId}
                totalAmount={(projectDetail as any).financialInfo?.totalAmount || 0}
                totalPaid={(projectDetail as any).financialInfo?.totalPaid || 0}
                balance={(projectDetail as any).financialInfo?.dynamicBalance || 0}
                discounts={(projectDetail as any).financialInfo?.totalDiscounts || 0}
                surcharges={(projectDetail as any).financialInfo?.totalSurcharges || 0}
                totalCobrado={(projectDetail as any).financialInfo?.totalCobrado || 0}
                isAdmin={user?.role === "admin" || user?.role === "super_admin"}
              />
            </TabsContent>
          )}
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
                        <SelectItem value="modelado_3d">Modelado</SelectItem>
                        <SelectItem value="renders">Renders</SelectItem>
                        <SelectItem value="detalles">Detalles</SelectItem>
                        <SelectItem value="despieces">Despieces</SelectItem>
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
                category={photoForm.category as "cotizacion" | "medidas" | "disenos" | "avance" | "instalacion" | "entrega"}
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
                    // Mapear subcategoría a stage correcto para avance
                    let finalStage: "corte" | "enchape" | "ensamble" | "final" | "inicial" | "diseno" = stage as "corte" | "enchape" | "ensamble" | "final" | "inicial" | "diseno";
                    if (photoForm.category === "avance" && photoForm.subcategory) {
                      const subcategoryToStage: Record<string, "corte" | "enchape" | "ensamble" | "final" | "inicial" | "diseno"> = {
                        "corte": "corte",
                        "enchape": "enchape",
                        "armado": "ensamble",
                      };
                      finalStage = subcategoryToStage[photoForm.subcategory] || stage as "corte" | "enchape" | "ensamble" | "final" | "inicial" | "diseno";
                    }
                    
                    uploadPhoto.mutate({
                      projectId: projectId,
                      stage: finalStage as "corte" | "enchape" | "ensamble" | "final" | "inicial" | "diseno",
                      category: photoForm.category,
                      subcategory: (photoForm.category === "cotizacion" ? "documento_cotizacion" : photoForm.subcategory || undefined) as "corte" | "enchape" | "fotos_iniciales" | "dibujo" | "renders" | "despieces" | "detalles" | "modelado_3d" | "armado" | "proceso_instalacion" | "fotos_finales" | "documento_cotizacion" | undefined,
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
              disabled={!detailForm.title || !detailForm.content || createDetail.isPending}
              onClick={() => {
                createDetail.mutate({
                  projectId: projectId,
                  type: detailForm.type,
                  title: detailForm.title,
                  content: detailForm.content,
                  photoUrl: detailForm.photoUrl || undefined,
                });
              }}
            >
              {createDetail.isPending ? "Guardando..." : "Guardar Detalle"}
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

      {/* Diálogo de confirmación para Enviar directo a Taller */}
      <AlertDialog open={showDirectToWorkshopDialog} onOpenChange={setShowDirectToWorkshopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-orange-500" />
              Enviar Directo a Taller
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta acción saltará las etapas de diseño (modelado 3D, renders) y enviará el proyecto 
                directamente al estado <strong>"Aprobación Final"</strong>.
              </p>
              <p>
                Esto es útil para proyectos pequeños que se fabrican directamente en el taller sin 
                necesidad de diseño formal.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Las secciones de diseño seguirán disponibles si deseas subir archivos después.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (projectDetail?.id) {
                  updateStatus.mutate({
                    projectId: projectDetail.id,
                    newStatus: "aprobacion_final",
                    notes: "Proyecto enviado directo a taller (sin proceso de diseño formal)",
                  });
                }
                setShowDirectToWorkshopDialog(false);
              }}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Hammer className="h-4 w-4 mr-2" />
                  Sí, enviar a Taller
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
