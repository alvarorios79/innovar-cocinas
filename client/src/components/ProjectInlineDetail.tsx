import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ImageIcon,
  ZoomIn,
  MessageCircle,
  FileDown,
  Plus,
  Pencil,
  ChevronUp,
  Info,
  Palette,
  Camera,
  ListTodo,
  History,
  Box,
  RefreshCw,
  XCircle,
  Send,
  Sparkles,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react";
import { useFileViewer } from "@/components/FileViewer";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { LazyImage } from "@/components/LazyImage";
import { toast } from "sonner";

const PROJECT_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  contacto: { label: "Contacto", color: "bg-slate-400", icon: Clock },
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Cliente Confirmado - Iniciar Diseño", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: AlertCircle },
  pendiente_modelado: { label: "Pendiente Modelado 3D", color: "bg-violet-500", icon: AlertCircle },
  pendiente_render: { label: "Pendiente Renders", color: "bg-amber-500", icon: AlertCircle },
  aprobacion_final: { label: "Aprobación Final", color: "bg-green-400", icon: CheckCircle2 },
  despiece: { label: "Despiece", color: "bg-indigo-500", icon: AlertCircle },
  corte: { label: "En Corte", color: "bg-orange-500", icon: AlertCircle },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: AlertCircle },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: AlertCircle },
  listo_instalacion: { label: "En Instalación", color: "bg-teal-500", icon: AlertCircle },
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

// Estados que ya pagaron el adelanto del 60%
const PAID_ADVANCE_STATUSES = [
  "adelanto_recibido",
  "en_diseno",
  "pendiente_modelado",
  "pendiente_render",
  "pendiente_render",
  "aprobacion_final",
  "corte",
  "enchape",
  "ensamble",
  "listo_instalacion",
  "listo_instalacion",
  "entregado"
];

const WORK_TYPES = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

interface ProjectInlineDetailProps {
  project: any;
  user: any;
  onCollapse: () => void;
  onExportPdf: (projectId: number, projectName: string) => void;
  generatingPdf: boolean;
}

export function ProjectInlineDetail({ 
  project, 
  user, 
  onCollapse,
  onExportPdf,
  generatingPdf
}: ProjectInlineDetailProps) {
  const utils = trpc.useUtils();
  const fileViewer = useFileViewer();
  
  console.log("Render ProjectInlineDetail");
  console.log("Project:", project);
  console.log("Project ID:", project?.id);
  // Estados para diálogos
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showEditDateDialog, setShowEditDateDialog] = useState(false);
  
  // Estados para formularios
  const [photoForm, setPhotoForm] = useState({
    stage: "" as "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final" | "",
    category: "medidas" as "cotizacion" | "medidas" | "disenos" | "avance" | "instalacion" | "entrega",
    subcategory: "" as string,
    photoUrl: "",
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
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [designerWhatsAppLink, setDesignerWhatsAppLink] = useState<string | null>(null);
  const [showDesignerWhatsAppDialog, setShowDesignerWhatsAppDialog] = useState(false);
  const [designerName, setDesignerName] = useState<string | null>(null);
  
  // Filtros para fotos
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  
  // Toggle para ocultar información financiera (CEO, admin, comercial)
  const [showFinancialInfo, setShowFinancialInfo] = useState(false);
  
  // Estados para alertas inteligentes
  const [closedAlerts, setClosedAlerts] = useState<Set<string>>(new Set());
  const closeAlert = (alertId: string) => {
    setClosedAlerts(prev => new Set(prev).add(alertId));
  };
  const isAlertClosed = (alertId: string) => closedAlerts.has(alertId);

  // Query para detalle del proyecto
  const { data: projectDetail, isLoading } = trpc.projects.getById.useQuery(
    { id: project.id },
    { enabled: !!project.id }
  );

  // Query para resumen financiero
  // @ts-ignore - Procedimiento tRPC no reconocido por TypeScript (problema de caché de tipos)
  const { data: financialSummary, isLoading: isLoadingFinancial, refetch: refetchFinancial, error: financialError } = trpc.projects.getFinancialSummary.useQuery(
    { projectId: project.id },
    { enabled: !!project.id }
  );
  
  // Debug
  useEffect(() => {
    console.log("Financial Summary Debug:", {
      projectId: project.id,
      financialSummary,
      isLoadingFinancial,
      financialError: financialError?.message,
      userRole: user?.role
    });
  }, [financialSummary, isLoadingFinancial, financialError, project.id, user?.role]);


  // Mutations
  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      refetchFinancial();
      setShowPhotoDialog(false);
      setPhotoForm({ stage: "", category: "medidas", subcategory: "", photoUrl: "", description: "" });
      toast.success("Foto subida exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir foto");
    },
  });

  const deletePhoto = trpc.projectPhotos.delete.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      refetchFinancial();
      toast.success("Foto eliminada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar foto");
    },
  });

  const createDetail = trpc.projectDetails.create.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      refetchFinancial();
      toast.success("Detalle agregado exitosamente");
      setShowDetailDialog(false);
      setDetailForm({ type: "nota_importante", title: "", content: "", photoUrl: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al agregar detalle");
    },
  });

  const updateEstimatedDate = trpc.projects.updateEstimatedDate.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      utils.projects.list.invalidate();
      refetchFinancial();
      toast.success("Fecha estimada actualizada");
      setShowEditDateDialog(false);
      setEditDateForm({ estimatedInstallDate: "", reason: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar fecha");
    },
  });

  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: (result, variables) => {
      utils.projects.list.invalidate();
      utils.projects.getById.invalidate();
      refetchFinancial();
      
      if (variables.approved) {
        toast.success("Diseño aprobado exitosamente");
      } else {
        // Mostrar mensaje con información del diseñador notificado
        if (result.designerNotified) {
          toast.success(`Cambios registrados. Se notificó al diseñador${result.designerName ? ` (${result.designerName})` : ''} y se creó una tarea.`);
        } else {
          toast.success("Cambios registrados. El proyecto volvió a diseño.");
        }
        
        // Mostrar diálogo con botón de WhatsApp si hay enlace disponible
        if (result.designerWhatsAppLink) {
          setDesignerWhatsAppLink(result.designerWhatsAppLink as string);
          setDesignerName(result.designerName || null);
          setShowDesignerWhatsAppDialog(true);
        }
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la aprobación");
    },
  });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.getById.invalidate();
      toast.success("Proyecto avanzado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al avanzar el proyecto");
    },
  });

  const resetRendersApproval = trpc.publicGallery.resetRendersApproval.useMutation({
    onSuccess: (result) => {
      utils.projects.getById.invalidate();
      refetchFinancial();
      toast.success(result.message);
      // Abrir WhatsApp si hay enlace
      if (result.whatsAppLink) {
        setTimeout(() => {
          window.open(result.whatsAppLink as string, "_blank");
        }, 1000);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al solicitar nueva aprobación");
    },
  });

  const resetModeladoApproval = trpc.publicGallery.resetModeladoApproval.useMutation({
    onSuccess: (result) => {
      utils.projects.getById.invalidate();
      refetchFinancial();
      toast.success(result.message);
      // Abrir WhatsApp si hay enlace
      if (result.whatsAppLink) {
        setTimeout(() => {
          window.open(result.whatsAppLink as string, "_blank");
        }, 1000);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al solicitar nueva aprobación");
    },
  });

  const sendModeladoToClient = trpc.publicGallery.sendModeladoToClient.useMutation({
    onSuccess: (result) => {
      utils.projects.getById.invalidate();
      utils.projects.list.invalidate();
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar modelado");
    },
  });

  const updateSkipDesignProcess = trpc.projects.updateSkipDesignProcess.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      toast.success("Configuración actualizada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const sendDirectlyToWorkshop = trpc.projects.sendDirectlyToWorkshop.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.getById.invalidate();
      toast.success("Proyecto enviado a taller exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar a taller");
    },
  });

  const sendRendersToClient = trpc.publicGallery.sendRendersToClient.useMutation({
    onSuccess: (result) => {
      utils.projects.getById.invalidate();
      utils.projects.list.invalidate();
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar renders");
    },
  });

  // Helper function to get margin color
  const getMarginColor = (rentabilidad: number) => {
    if (rentabilidad >= 20) return { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-300" };
    if (rentabilidad >= 10) return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-300" };
    return { bg: "bg-red-500/15/50", text: "text-red-300", border: "border-red-300" };
  };

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  if (isLoading || isLoadingFinancial || !projectDetail) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg mt-2">
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // Organizar fotos por carpeta/subcategoría
  const organizePhotosByFolder = () => {
    const photos = projectDetail.photos || [];
    const folders: Record<string, any[]> = {
      documento_cotizacion: [],
      fotos_iniciales: [],
      dibujo: [],
      modelado_3d: [],
      renders: [],
      detalles: [],
      despieces: [],
      corte: [],
      enchape: [],
      armado: [],
      proceso_instalacion: [],
      fotos_finales: [],
    };
    
    photos.forEach((photo: any) => {
      const subcategory = photo.subcategory || "fotos_iniciales";
      if (folders[subcategory]) {
        folders[subcategory].push(photo);
      }
    });
    
    return folders;
  };

  const photosByFolder = organizePhotosByFolder();

  // Filtrar fotos según categoría y subcategoría seleccionadas
  // Permisos de visualización por carpeta según rol
  const canViewFolder = (folder: string) => {
    const role = user?.role;
    const viewPermissions: Record<string, string[]> = {
      documento_cotizacion: ["super_admin", "admin", "comercial"],
      fotos_iniciales: ["super_admin", "admin", "comercial", "disenador"],
      dibujo: ["super_admin", "admin", "comercial", "disenador"],
      modelado_3d: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      renders: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      detalles: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      despieces: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      corte: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      enchape: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      armado: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      proceso_instalacion: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
      fotos_finales: ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"],
    };
    return viewPermissions[folder]?.includes(role || "") ?? false;
  };

  const getFilteredFolders = () => {
    // Primero filtrar por permisos de visualización según rol
    const roleFilteredFolders: Record<string, any[]> = {};
    Object.entries(photosByFolder).forEach(([folder, photos]) => {
      if (canViewFolder(folder)) {
        roleFilteredFolders[folder] = photos;
      }
    });

    if (categoryFilter === "all") return roleFilteredFolders;
    
    const categoryToFolders: Record<string, string[]> = {
      cotizacion: ["documento_cotizacion"],
      medidas: ["fotos_iniciales", "dibujo"],
      disenos: ["modelado_3d", "renders", "detalles", "despieces"],
      avance: ["corte", "enchape", "armado"],
      instalacion: ["proceso_instalacion"],
      entrega: ["fotos_finales"],
    };
    
    const allowedFolders = categoryToFolders[categoryFilter] || [];
    const filtered: Record<string, any[]> = {};
    
    allowedFolders.forEach(folder => {
      if ((subcategoryFilter === "all" || subcategoryFilter === folder) && canViewFolder(folder)) {
        filtered[folder] = roleFilteredFolders[folder] || [];
      }
    });
    
    return filtered;
  };

  const filteredFolders = getFilteredFolders();

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
    modelado_3d: "Modelado 3D",
    renders: "Renders",
    detalles: "Detalles",
    despieces: "Despieces",
    corte: "Corte",
    enchape: "Enchape",
    armado: "Armado",
    proceso_instalacion: "Proceso",
    fotos_finales: "Fotos Finales",
  };

  // Permisos de subida por carpeta según rol y estado del proyecto
  const canUploadToFolder = (folder: string) => {
    const role = user?.role;
    const status = projectDetail?.status;
    
    // Carpetas de producción que se habilitan desde aprobacion_final
    const productionFolders = ["corte", "enchape", "armado", "proceso_instalacion", "fotos_finales"];
    const productionStates = ["aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "entregado"];
    
    const uploadPermissions: Record<string, string[]> = {
      documento_cotizacion: ["super_admin", "admin", "comercial"],
      fotos_iniciales: ["super_admin", "admin", "comercial"],
      dibujo: ["super_admin", "admin"],
      modelado_3d: ["super_admin", "admin", "disenador"],
      renders: ["super_admin", "admin", "disenador"],
      detalles: ["super_admin", "admin", "disenador"],
      despieces: ["super_admin", "admin", "disenador"],
      corte: ["super_admin", "admin", "jefe_taller", "operario"],
      enchape: ["super_admin", "admin", "jefe_taller", "operario"],
      armado: ["super_admin", "admin", "jefe_taller", "operario"],
      proceso_instalacion: ["super_admin", "admin", "jefe_taller", "operario"],
      fotos_finales: ["super_admin", "admin", "jefe_taller", "operario"],
    };
    const allowedRoles = uploadPermissions[folder] || [];
    
    // Para carpetas de producción, verificar que el proyecto esté en un estado apropiado
    if (productionFolders.includes(folder)) {
      // jefe_taller y operario solo pueden subir si el proyecto está en aprobacion_final o posterior
      // PERO admin y super_admin pueden subir en CUALQUIER estado
      if ((role === "jefe_taller" || role === "operario") && !productionStates.includes(status || "")) {
        return false;
      }
    }
    
    return allowedRoles.includes(role || "");
  };

  
  return (
    <div className="bg-muted/30 rounded-lg mt-2 p-3 sm:p-4 border border-border">
      {/* Header con botones de acción */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{project.name}</h3>
          <Badge className={`${PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]?.color || "bg-gray-500"} text-white`}>
            {getStatusLabel(project.status, (project as any).modeladoRevisionNumber, (project as any).renderRevisionNumber)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón WhatsApp */}
          {projectDetail.client && projectDetail.client.whatsappPhone && (user?.role === "admin" || user?.role === "super_admin") && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-400 border-green-600 hover:bg-green-500/10"
              onClick={() => {
                const baseUrl = window.location.origin;
                const portalUrl = `${baseUrl}/portal?project=${project.id}`;
                const workTypeLabel = WORK_TYPES[project.workType as keyof typeof WORK_TYPES] || project.workType;
                const statusLabel = getStatusLabel(project.status, (project as any).modeladoRevisionNumber, (project as any).renderRevisionNumber);
                
                const message = `Hola ${projectDetail.client?.name}, te escribimos de INNOVAR Cocinas Integrales.\n\nTu proyecto "${project.name}" (${workTypeLabel}) está en estado: ${statusLabel}.\n\nPuedes ver el seguimiento en:\n${portalUrl}\n\n¿Tienes alguna pregunta?`;
                
                setWhatsAppMessage(message);
                setWhatsAppPhone(projectDetail.client?.whatsappPhone || "");
                setShowWhatsAppDialog(true);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
          )}
          {/* Botón Exportar PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportPdf(project.id, project.name)}
            disabled={generatingPdf}
          >
            <FileDown className="h-4 w-4 mr-1" />
            {generatingPdf ? "..." : "PDF"}
          </Button>
          {/* Botón Colapsar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapse}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Acciones según estado y rol */}
      
      {/* Acción para Diseñador: Iniciar Diseño (adelanto_recibido -> en_diseno) */}
      {projectDetail.status === "adelanto_recibido" && 
        (user?.role === "disenador" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-purple-500/10 border border-purple-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto Listo para Diseño
          </h4>
          <p className="text-sm text-purple-300 mb-4">
            El cliente ya pagó el adelanto. Puedes comenzar a trabajar en el diseño.
          </p>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "en_diseno" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Iniciar Diseño
          </Button>
        </div>
      )}

      {/* Acción para Diseñador: Entregar Diseño (en_diseno -> pendiente_render) */}
      {projectDetail.status === "en_diseno" && 
        (user?.role === "disenador" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto en Diseño
          </h4>
          <p className="text-sm text-blue-300 mb-4">
            Cuando termines los renders, modelado y despieces, envía el diseño al cliente para su aprobación.
          </p>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "pendiente_render" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Entregar Diseño al Cliente
          </Button>
        </div>
      )}

      {/* Checkbox para Enviar Directamente a Taller (solo admin/super_admin) */}
      {(projectDetail.status === "cotizacion_aprobada" || projectDetail.status === "adelanto_recibido") &&
        (user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="skipDesign"
              checked={Boolean(projectDetail.skipDesignProcess)}
              onChange={(e) => {
                updateSkipDesignProcess.mutate({
                  projectId: projectDetail.id,
                  skipDesignProcess: e.target.checked,
                });
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="skipDesign" className="cursor-pointer flex-1">
              <span className="font-medium text-blue-300">
                ☐ Enviar directamente a taller (sin proceso de diseño)
              </span>
              <p className="text-xs text-blue-300 mt-1">
                Marca esto si el cliente no requiere diseño, modelado ni render
              </p>
            </label>
          </div>
        </div>
      )}

      {/* Botón para Enviar Directamente a Taller */}
      {(projectDetail.status === "cotizacion_aprobada" || projectDetail.status === "adelanto_recibido") &&
        (user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (
        <>
          {projectDetail.skipDesignProcess ? (
            <div className="bg-orange-500/10 border border-orange-500/25 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-300 mb-2 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar Directamente a Taller
              </h4>
              <p className="text-sm text-orange-300 mb-4">
                Este proyecto saltará el proceso de diseño y irá directamente a producción.
              </p>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => sendDirectlyToWorkshop.mutate({ projectId: projectDetail.id })}
                disabled={sendDirectlyToWorkshop.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar a Taller Ahora
              </Button>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.10] rounded-lg p-4 mb-4">
              <h4 className="font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Enviar a Taller (Deshabilitado)
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Este proyecto requiere pasar por el proceso de diseño.
                <br />
                <strong>Marca la opción arriba si deseas saltarlo.</strong>
              </p>
              <Button
                size="sm"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Enviar a Taller (Bloqueado)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Acción para Diseñador: Pasar a Producción (aprobacion_final -> despiece) */}
      {projectDetail.status === "aprobacion_final" && 
        (user?.role === "disenador" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-green-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Diseño Aprobado por el Cliente
          </h4>
          <p className="text-sm text-green-300 mb-4">
            El cliente aprobó el diseño. Cuando tengas listo el despiece, pasa el proyecto a producción para que el jefe de taller pueda comenzar.
          </p>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "despiece" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Pasar a Producción (Despiece)
          </Button>
        </div>
      )}

      {/* Acciones para Jefe de Taller: Avanzar por etapas de producción */}
      
      {/* Despiece -> Corte */}
      {projectDetail.status === "despiece" && 
        (user?.role === "jefe_taller" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-orange-500/10 border border-orange-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-orange-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto en Despiece
          </h4>
          <p className="text-sm text-orange-300 mb-4">
            Revisa el despiece del diseñador. Cuando esté listo, pasa el proyecto a corte.
          </p>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "corte" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Iniciar Corte
          </Button>
        </div>
      )}

      {/* Corte -> Enchape */}
      {projectDetail.status === "corte" && 
        (user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-orange-500/10 border border-orange-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-orange-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto en Corte
          </h4>
          <p className="text-sm text-orange-300 mb-4">
            Cuando termines el corte de todas las piezas, avanza a la etapa de enchape.
          </p>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "enchape" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Pasar a Enchape
          </Button>
        </div>
      )}

      {/* Enchape -> Ensamble */}
      {projectDetail.status === "enchape" && 
        (user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-orange-500/10 border border-orange-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-orange-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto en Enchape
          </h4>
          <p className="text-sm text-orange-300 mb-4">
            Cuando termines el enchape de todas las piezas, avanza a la etapa de ensamble.
          </p>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "ensamble" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Pasar a Ensamble
          </Button>
        </div>
      )}

      {/* Ensamble -> En Instalación */}
      {projectDetail.status === "ensamble" && 
        (user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-teal-500/10 border border-teal-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-teal-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proyecto en Ensamble
          </h4>
          <p className="text-sm text-teal-300 mb-4">
            Cuando termines el ensamble, marca el proyecto como listo para instalación.
          </p>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "listo_instalacion" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Marcar En Instalación
          </Button>
        </div>
      )}

      {/* En Instalación -> Instalación Programada */}
      {projectDetail.status === "listo_instalacion" && 
        (user?.role === "jefe_taller" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-teal-500/10 border border-teal-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-teal-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Proyecto En Instalación
          </h4>
          <p className="text-sm text-teal-300 mb-4">
            Coordina con el cliente la fecha de instalación y programa la entrega.
          </p>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "listo_instalacion" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Programar Instalación
          </Button>
        </div>
      )}

      {/* Instalación Programada -> Entregado */}
      {projectDetail.status === "listo_instalacion" && 
        (user?.role === "jefe_taller" || user?.role === "admin" || user?.role === "super_admin") && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-green-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Instalación Programada
          </h4>
          <p className="text-sm text-green-300 mb-4">
            Cuando completes la instalación, marca el proyecto como entregado.
          </p>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => updateStatus.mutate({ projectId: projectDetail.id, newStatus: "entregado" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Marcar como Entregado
          </Button>
        </div>
      )}

      {/* Panel de Control de Diseño - Diseño Moderno */}
      {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (
        <div className="mb-4 rounded-xl overflow-hidden shadow-lg border border-white/[0.10]">
          {/* Header del Panel */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Centro de Control de Diseño
            </h3>
            <p className="text-teal-100 text-xs mt-1">Gestiona el envío y aprobación de diseños del cliente</p>
          </div>
          
          <div className="bg-[#162828] p-4">
            {/* Grid de Tarjetas de Acción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

              {/* Tarjeta Modelado 3D */}
              <div className={`relative rounded-lg p-4 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-purple-500/15 border-2 border-purple-500/25 hover:shadow-md' : 'bg-white/[0.03] border-2 border-dashed border-white/[0.15]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-purple-500 text-white' : 'bg-white/[0.10] text-muted-foreground'}`}>
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">Modelado 3D</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 
                        ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length} imagen(es) listas`
                        : 'Sin imágenes aún'}
                    </p>
                    {projectDetail.modeladoApprovedAt && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprobado por {projectDetail.modeladoApprovedBy}
                      </div>
                    )}
                  </div>
                </div>
                {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 && (
                  <Button
                    size="sm"
                    className={`w-full mt-3 shadow-sm text-xs ${(projectDetail.modeladoRevisionNumber || 0) >= 1 ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                    onClick={() => sendModeladoToClient.mutate({ projectId: projectDetail.id })}
                    disabled={sendModeladoToClient.isPending}
                    title={(projectDetail.modeladoRevisionNumber || 0) >= 1 ? 'Reenviar enlace de aprobación al cliente (incrementará la revisión)' : 'Enviar modelado al cliente para aprobación'}
                  >
                    <Send className={`h-3 w-3 mr-1 ${sendModeladoToClient.isPending ? 'animate-spin' : ''}`} />
                    {sendModeladoToClient.isPending ? 'Enviando...' : (projectDetail.modeladoRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.modeladoRevisionNumber || 0) + 1})` : 'Enviar Modelado'}
                  </Button>
                )}
              </div>
              
              {/* Tarjeta Renders */}
              <div className={`relative rounded-lg p-4 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-emerald-500/15 border-2 border-emerald-500/25 hover:shadow-md' : 'bg-white/[0.03] border-2 border-dashed border-white/[0.15]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-emerald-500 text-white' : 'bg-white/[0.10] text-muted-foreground'}`}>
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">Renders Finales</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 
                        ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length} imagen(es) listas`
                        : 'Sin imágenes aún'}
                    </p>
                    {projectDetail.rendersApprovedAt && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprobado por {projectDetail.rendersApprovedBy}
                      </div>
                    )}
                  </div>
                </div>
                {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 && (
                  <Button
                    size="sm"
                    className={`w-full mt-3 shadow-sm text-xs ${(projectDetail.renderRevisionNumber || 0) >= 1 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                    onClick={() => sendRendersToClient.mutate({ projectId: projectDetail.id })}
                    disabled={sendRendersToClient.isPending}
                    title={(projectDetail.renderRevisionNumber || 0) >= 1 ? 'Reenviar enlace de aprobación al cliente (incrementará la revisión)' : 'Enviar renders al cliente para aprobación'}
                  >
                    <Send className={`h-3 w-3 mr-1 ${sendRendersToClient.isPending ? 'animate-spin' : ''}`} />
                    {sendRendersToClient.isPending ? 'Enviando...' : (projectDetail.renderRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.renderRevisionNumber || 0) + 1})` : 'Enviar Renders'}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Sección de Aprobación - Siempre visible */}
            {(() => {
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
              } else if (!hasDesignContent) {
                statusMessage = "Sube imágenes de modelado o renders primero";
                statusColor = "gray";
              } else {
                statusMessage = "Envía el diseño al cliente para solicitar aprobación";
                statusColor = "blue";
              }
              
              return (
                <div className={`rounded-lg p-4 border mb-3 ${
                  statusColor === "amber" ? "bg-amber-500/10 border-amber-500/25" :
                  statusColor === "green" ? "bg-green-500/10 border-green-500/25" :
                  statusColor === "blue" ? "bg-blue-500/10 border-blue-500/25" :
                  "bg-white/[0.03] border-white/[0.10]"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg text-white ${
                      statusColor === "amber" ? "bg-amber-500" :
                      statusColor === "green" ? "bg-green-500" :
                      statusColor === "blue" ? "bg-blue-500" :
                      "bg-gray-400"
                    }`}>
                      {statusColor === "green" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${
                        statusColor === "amber" ? "text-amber-300" :
                        statusColor === "green" ? "text-green-300" :
                        statusColor === "blue" ? "text-blue-300" :
                        "text-muted-foreground"
                      }`}>
                        {isPendingApproval ? "Pendiente de Aprobación" : isApproved ? "Diseño Aprobado" : "Aprobación del Cliente"}
                      </h4>
                      <p className={`text-xs ${
                        statusColor === "amber" ? "text-amber-400" :
                        statusColor === "green" ? "text-green-400" :
                        statusColor === "blue" ? "text-blue-400" :
                        "text-muted-foreground"
                      }`}>{statusMessage}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveDesign.mutate({ projectId: projectDetail.id, approved: true })}
                      disabled={approveDesign.isPending || !isPendingApproval}
                      className={`shadow-sm text-xs ${
                        isPendingApproval 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-white/[0.08] text-muted-foreground cursor-not-allowed"
                      }`}
                      title={!isPendingApproval ? "Solo disponible cuando hay diseño pendiente de aprobación" : ""}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobar Diseño
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs ${
                        isPendingApproval 
                          ? "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                          : "border-white/[0.15] text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (isPendingApproval) {
                          const notes = prompt("Indica qué cambios se necesitan:");
                          if (notes) {
                            approveDesign.mutate({ projectId: projectDetail.id, approved: false, notes });
                          }
                        }
                      }}
                      disabled={approveDesign.isPending || !isPendingApproval}
                      title={!isPendingApproval ? "Solo disponible cuando hay diseño pendiente de aprobación" : ""}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Solicitar Cambios
                    </Button>
                  </div>
                  {projectDetail.clientApprovalNotes && (
                    <div className="mt-3 p-2 bg-orange-500/15 rounded border border-orange-500/25">
                      <p className="text-xs text-orange-300">
                        <strong>📝 Últimos cambios solicitados:</strong> {projectDetail.clientApprovalNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Sección Nueva Aprobación */}
            {(() => {
              const hasRenders = (projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length || 0) > 0;
              const modeladoBlocked = hasRenders;
              
              return (
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/25">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-300 text-sm">Solicitar Nueva Aprobación</h4>
                      <p className="text-xs text-blue-400">Si el cliente solicitó cambios después de aprobar</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Modelado */}
                    <div className={`p-3 rounded-lg ${modeladoBlocked ? 'bg-white/[0.06] opacity-60' : projectDetail.modeladoApprovedAt ? 'bg-purple-500/15' : 'bg-white/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${modeladoBlocked ? 'text-muted-foreground' : projectDetail.modeladoApprovedAt ? 'text-purple-300' : 'text-muted-foreground'}`}>Modelado 3D</span>
                        {projectDetail.modeladoApprovedAt && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      </div>
                      <p className={`text-xs mb-2 ${modeladoBlocked ? 'text-muted-foreground' : projectDetail.modeladoApprovedAt ? 'text-purple-400' : 'text-muted-foreground'}`}>
                        {modeladoBlocked 
                          ? 'Bloqueado - Ya hay renders'
                          : projectDetail.modeladoApprovedAt 
                            ? `Aprobado el ${new Date(projectDetail.modeladoApprovedAt).toLocaleDateString('es-CO')}`
                            : 'Sin aprobar'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`w-full text-xs ${modeladoBlocked ? 'border-white/[0.15] text-gray-400 cursor-not-allowed' : projectDetail.modeladoApprovedAt ? 'border-purple-500/40 text-purple-300 hover:bg-purple-500/20' : 'border-white/[0.15] text-gray-400'}`}
                        onClick={() => !modeladoBlocked && projectDetail.modeladoApprovedAt && resetModeladoApproval.mutate({ projectId: projectDetail.id })}
                        disabled={modeladoBlocked || !projectDetail.modeladoApprovedAt || resetModeladoApproval.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${resetModeladoApproval.isPending ? 'animate-spin' : ''}`} />
                        {modeladoBlocked ? 'Bloqueado' : 'Nueva Aprobación'}
                      </Button>
                    </div>
                    {/* Renders */}
                    <div className={`p-3 rounded-lg ${projectDetail.rendersApprovedAt ? 'bg-emerald-500/15' : hasRenders ? 'bg-amber-500/10 border border-amber-500/25' : 'bg-white/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${projectDetail.rendersApprovedAt ? 'text-emerald-300' : hasRenders ? 'text-amber-300' : 'text-muted-foreground'}`}>Renders</span>
                        {projectDetail.rendersApprovedAt && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {hasRenders && !projectDetail.rendersApprovedAt && <AlertCircle className="h-3 w-3 text-amber-500" />}
                      </div>
                      <p className={`text-xs mb-2 ${projectDetail.rendersApprovedAt ? 'text-emerald-400' : hasRenders ? 'text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                        {projectDetail.rendersApprovedAt 
                          ? `Aprobado el ${new Date(projectDetail.rendersApprovedAt).toLocaleDateString('es-CO')}`
                          : hasRenders
                            ? 'Pendiente aprobación del cliente'
                            : 'Sin renders aún'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`w-full text-xs ${hasRenders ? 'border-amber-400 text-amber-300 hover:bg-amber-500/15' : 'border-white/[0.15] text-gray-400'}`}
                        onClick={() => hasRenders && resetRendersApproval.mutate({ projectId: projectDetail.id })}
                        disabled={!hasRenders || resetRendersApproval.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${resetRendersApproval.isPending ? 'animate-spin' : ''}`} />
                        {projectDetail.rendersApprovedAt ? 'Nueva Revisión' : 'Enviar Revisión'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Panel de Fotos de Referencia para Jefe de Taller y Operario */}
      {(user?.role === "jefe_taller" || user?.role === "operario") && (
        <div className="mb-4 rounded-xl overflow-hidden shadow-lg border border-white/[0.10]">
          {/* Header del Panel */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Fotos de Referencia del Diseño
            </h3>
            <p className="text-purple-100 text-xs mt-1">Modelado 3D y Renders aprobados por el cliente</p>
          </div>
          
          <div className="bg-[#162828] p-4">
            {/* Grid de Fotos de Modelado y Renders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sección Modelado */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-purple-400" />
                  <span className="font-semibold text-sm text-foreground">Modelado 3D</span>
                  <Badge variant="outline" className="text-xs">
                    {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length || 0} fotos
                  </Badge>
                  {projectDetail.modeladoApprovedAt && (
                    <Badge className="bg-green-500/15 text-green-300 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobado
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").slice(0, 6).map((photo: any, idx: number) => (
                    <div
                      key={photo.id || idx}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-purple-500/25 cursor-pointer hover:border-purple-500/40 transition-all hover:scale-105"
                      onClick={() => fileViewer.openViewer(
                        (projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d") || []).map((p: any, i: number) => ({
                          url: p.photoUrl,
                          title: `Modelado 3D - Imagen ${i + 1}`,
                          description: p.description,
                          type: p.photoUrl.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const,
                        })),
                        idx
                      )}
                    >
                      <LazyImage
                        src={photo.photoUrl}
                        alt={`Modelado ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {(projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length || 0) === 0 && (
                    <div className="col-span-3 text-center py-4 text-gray-400 text-sm">
                      Sin fotos de modelado
                    </div>
                  )}
                </div>
              </div>

              {/* Sección Renders */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold text-sm text-foreground">Renders Finales</span>
                  <Badge variant="outline" className="text-xs">
                    {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length || 0} fotos
                  </Badge>
                  {projectDetail.rendersApprovedAt && (
                    <Badge className="bg-green-500/15 text-green-300 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobado
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").slice(0, 6).map((photo: any, idx: number) => (
                    <div
                      key={photo.id || idx}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-amber-500/25 cursor-pointer hover:border-amber-400 transition-all hover:scale-105"
                      onClick={() => fileViewer.openViewer(
                        (projectDetail.photos?.filter((p: any) => p.subcategory === "renders") || []).map((p: any, i: number) => ({
                          url: p.photoUrl,
                          title: `Render Final - Imagen ${i + 1}`,
                          description: p.description,
                          type: p.photoUrl.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const,
                        })),
                        idx
                      )}
                    >
                      <LazyImage
                        src={photo.photoUrl}
                        alt={`Render ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {(projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length || 0) === 0 && (
                    <div className="col-span-3 text-center py-4 text-gray-400 text-sm">
                      Sin renders
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sección Despieces si existen */}
            {(projectDetail.photos?.filter((p: any) => p.subcategory === "despieces").length || 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.10]">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-sm text-foreground">Despieces</span>
                  <Badge variant="outline" className="text-xs">
                    {projectDetail.photos?.filter((p: any) => p.subcategory === "despieces").length} archivos
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {projectDetail.photos?.filter((p: any) => p.subcategory === "despieces").slice(0, 8).map((photo: any, idx: number) => (
                    <div
                      key={photo.id || idx}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-blue-500/25 cursor-pointer hover:border-blue-400 transition-all hover:scale-105"
                      onClick={() => fileViewer.openViewer(
                        (projectDetail.photos?.filter((p: any) => p.subcategory === "despieces") || []).map((p: any, i: number) => ({
                          url: p.photoUrl,
                          title: `Despiece - Archivo ${i + 1}`,
                          description: p.description,
                          type: p.photoUrl.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const,
                        })),
                        idx
                      )}
                    >
                      <LazyImage
                        src={photo.photoUrl}
                        alt={`Despiece ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs con colores distintivos */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="info" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-blue-500/15 text-blue-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-500/20 transition-colors"
          >
            <Info className="h-4 w-4 mr-1 hidden sm:inline" />
            Información
          </TabsTrigger>
          <TabsTrigger 
            value="materials" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-purple-500/15 text-purple-300 data-[state=active]:bg-purple-500 data-[state=active]:text-white hover:bg-purple-500/20 transition-colors"
          >
            <Palette className="h-4 w-4 mr-1 hidden sm:inline" />
            Materiales
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-green-500/15 text-green-300 data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-500/20 transition-colors"
          >
            <Camera className="h-4 w-4 mr-1 hidden sm:inline" />
            Fotos
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-orange-500/15 text-orange-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white hover:bg-orange-500/20 transition-colors"
          >
            <ListTodo className="h-4 w-4 mr-1 hidden sm:inline" />
            Detalles
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-white/[0.10] text-muted-foreground data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-300 transition-colors"
          >
            <History className="h-4 w-4 mr-1 hidden sm:inline" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab Información */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Información del Cliente */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Nombre:</strong> {projectDetail.client?.name}</p>
                {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
                  <>
                    <p><strong>Teléfono:</strong> {projectDetail.client?.whatsappPhone}</p>
                    <p><strong>Email:</strong> {projectDetail.client?.email || "N/A"}</p>
                  </>
                )}
                <p><strong>Dirección:</strong> {projectDetail.client?.address || "N/A"}</p>
              </CardContent>
            </Card>

            {/* Información Financiera Simple - Solo si ya pagó el 60% */}
            {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (() => {
              // Calcular valores financieros directamente
              const quotationTotal = (projectDetail as any).quotation?.total ? Number((projectDetail as any).quotation.total) : 0;
              const projectAdvance = projectDetail.advanceAmount ? Number(projectDetail.advanceAmount) : 0;
              const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
              const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
              const remainingAmount = totalAmount - advanceAmount;
              
              return (
                <Card className="border-blue-500/25 bg-blue-500/10">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        Información Financiera
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFinancialInfo(!showFinancialInfo)}
                        className="h-8 px-2"
                      >
                        {showFinancialInfo ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Ocultar</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Mostrar</>
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showFinancialInfo && (() => {
                    // Calcular total pagado desde el array de payments
                    const totalPaid = (projectDetail as any).payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                    const percentagePaid = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
                    const percentagePending = 100 - percentagePaid;
                    
                    return (
                      <CardContent className="text-sm space-y-3">
                        {/* Total del Proyecto */}
                        <div className="flex justify-between pb-2 border-b">
                          <span className="text-muted-foreground font-medium">Total del Proyecto</span>
                          <span className="font-bold text-lg">
                            {totalAmount > 0 
                              ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalAmount)
                              : "$0"}
                          </span>
                        </div>
                        
                        {/* Desglose de Pagos */}
                        {(projectDetail as any).payments && (projectDetail as any).payments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium text-xs">Desglose de Pagos:</p>
                            {(projectDetail as any).payments.map((payment: any, idx: number) => (
                              <div key={idx} className="flex justify-between pl-2 text-xs">
                                <span className="text-muted-foreground">
                                  {payment.type === 'adelanto' ? '• Pago 1 (Adelanto)' :
                                   payment.type === 'saldo_final' ? '• Pago 2 (Final)' :
                                   payment.type === 'abono' ? '• Abono' : '• Otro Pago'}
                                </span>
                                <span className="font-medium text-green-400">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(payment.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Total Pagado y Saldo */}
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Pagado</span>
                            <span className="font-bold text-green-400">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPaid)} ({percentagePaid}%)
                            </span>
                          </div>
                          <div className={`flex justify-between p-2 rounded ${
                            remainingAmount <= 0 
                              ? 'bg-green-500/15' 
                              : 'bg-yellow-500/15'
                          }`}>
                            <span className={remainingAmount <= 0 ? 'text-green-400' : 'text-yellow-300'}>
                              {remainingAmount <= 0 ? 'Estado' : 'Saldo Pendiente'}
                            </span>
                            <span className={`font-bold ${
                              remainingAmount <= 0 
                                ? 'text-green-400' 
                                : 'text-yellow-300'
                            }`}>
                              {remainingAmount <= 0 
                                ? '✅ Cancelado 100%' 
                                : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(remainingAmount) + ` (${percentagePending}%)`
                              }
                            </span>
                          </div>
                        </div>
                        {/* Enlace al recibo del adelanto */}
                        {projectDetail.advanceReceiptUrl && (
                          <div className="pt-2 border-t">
                            <a 
                              href={projectDetail.advanceReceiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              Ver Recibo del Adelanto
                            </a>
                          </div>
                        )}
                      </CardContent>
                    );
                  })()}
                </Card>
              );
            })()}

            {/* Fechas del Proyecto */}
            <Card>
              <CardHeader className="py-3">
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
              <CardContent className="text-sm space-y-1">
                {/* Fechas de la cotización */}
                {(projectDetail as any).quotation?.createdAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                  <p className="text-blue-400">
                    <strong>📋 Cotización creada:</strong> {new Date((projectDetail as any).quotation.createdAt).toLocaleDateString("es-CO")}
                  </p>
                )}
                {(projectDetail as any).quotation?.validUntil && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                  <p className={new Date((projectDetail as any).quotation.validUntil) < new Date() ? "text-red-500" : "text-blue-400"}>
                    <strong>📅 Válida hasta:</strong> {new Date((projectDetail as any).quotation.validUntil).toLocaleDateString("es-CO")}
                    {new Date((projectDetail as any).quotation.validUntil) < new Date() && " (Vencida)"}
                  </p>
                )}
                
                {/* Fechas del proyecto */}
                <p><strong>Creado:</strong> {new Date(projectDetail.createdAt).toLocaleDateString("es-CO")}</p>
                {projectDetail.quotationApprovedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                  <p><strong>Cotización aprobada:</strong> {new Date(projectDetail.quotationApprovedAt).toLocaleDateString("es-CO")}</p>
                )}
                {projectDetail.advanceReceivedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                  <p><strong>Adelanto recibido:</strong> {new Date(projectDetail.advanceReceivedAt).toLocaleDateString("es-CO")}</p>
                )}
                
                {/* Fechas de instalación - Tentativa (roja) u Oficial (verde) */}
                {projectDetail.tentativeInstallDate && !projectDetail.isInstallDateOfficial && projectDetail.status !== "entregado" && (
                  <p className="text-red-400 font-medium">
                    <strong>🔴 Instalación tentativa:</strong> {new Date(projectDetail.tentativeInstallDate).toLocaleDateString("es-CO")}
                  </p>
                )}
                {projectDetail.estimatedInstallDate && projectDetail.isInstallDateOfficial && projectDetail.status !== "entregado" && (
                  <p className="text-green-400 font-medium">
                    <strong>🟢 Instalación oficial:</strong> {new Date(projectDetail.estimatedInstallDate).toLocaleDateString("es-CO")}
                  </p>
                )}
                {projectDetail.estimatedInstallDate && !projectDetail.isInstallDateOfficial && !projectDetail.tentativeInstallDate && projectDetail.status !== "entregado" && (
                  <p className={`font-medium ${
                    new Date(projectDetail.estimatedInstallDate) < new Date() 
                      ? "text-red-400" 
                      : "text-green-400"
                  }`}>
                    <strong>Entrega estimada:</strong> {new Date(projectDetail.estimatedInstallDate).toLocaleDateString("es-CO")}
                  </p>
                )}
                {projectDetail.deliveredAt && (
                  <p className="text-green-400 font-medium">
                    <strong>Entregado:</strong> {new Date(projectDetail.deliveredAt).toLocaleDateString("es-CO")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Información Financiera Prominente - Solo si ya pagó el 60% y hay total de cotización */}
          {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (projectDetail as any).financialInfo && (projectDetail as any).financialInfo.totalAmount > 0 && (
            <Card className={`border-2 ${
              projectDetail.status === "entregado" && (projectDetail as any).financialInfo.remainingAmount > 0
                ? "border-red-400 bg-red-500/10"
                : projectDetail.status === "entregado"
                  ? "border-green-400 bg-green-500/10"
                  : "border-blue-400 bg-blue-500/10"
            }`}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    Información Financiera del Proyecto
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFinancialInfo(!showFinancialInfo)}
                    className="h-8 px-2"
                  >
                    {showFinancialInfo ? (
                      <><EyeOff className="h-4 w-4 mr-1" /> Ocultar</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-1" /> Mostrar</>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showFinancialInfo && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total del Proyecto */}
                  <div className="text-center p-3 bg-[#162828]/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total del Proyecto</p>
                    <p className="text-xl font-bold text-foreground">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.totalAmount)}
                    </p>
                  </div>
                  
                  {/* Total Cobrado */}
                  <div className="text-center p-3 bg-green-500/15/50 rounded-lg">
                    <p className="text-xs text-green-400 mb-1">Total Cobrado</p>
                    <p className="text-lg font-bold text-green-400">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.totalCobrado || 0)}
                    </p>
                  </div>
                  
                  {/* Desglose de Pagos Dinámico */}
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/25">
                    <p className="text-xs font-semibold text-blue-300 mb-2">Desglose de Pagos</p>
                    <div className="space-y-1 text-xs text-blue-400">
                      {projectDetail.payments && projectDetail.payments.length > 0 ? (
                        projectDetail.payments.map((payment: any, idx: number) => (
                          <p key={idx}>
                            • {payment.type === 'adelanto' ? 'Pago 1 (Adelanto)' :
                               payment.type === 'saldo_final' ? 'Pago 2 (Final)' :
                               payment.type === 'abono' ? `Abono ${idx}` : 'Otro Pago'}
                            : {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(payment.amount)}
                          </p>
                        ))
                      ) : (
                        <p>Sin pagos registrados</p>
                      )}
                    </div>
                  </div>
                  
                   {/* Descuentos */}
                   <div className="text-center p-3 bg-purple-500/15/50 rounded-lg">
                     <p className="text-xs text-purple-300 mb-1">Descuentos</p>
                     <p className="text-lg font-bold text-purple-300">
                       -{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.totalDiscounts || 0)}
                     </p>
                   </div>
                   
                   {/* Recargos */}
                   <div className="text-center p-3 bg-orange-500/15/50 rounded-lg">
                     <p className="text-xs text-orange-300 mb-1">Recargos</p>
                     <p className="text-lg font-bold text-orange-300">
                       +{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.totalSurcharges || 0)}
                     </p>
                   </div>
                   
                   {/* Saldo Pendiente */}
                   <div className={`text-center p-3 rounded-lg ${
                     (projectDetail as any).financialInfo.remainingAmount > 0
                       ? "bg-red-500/15/50"
                       : "bg-green-500/15/50"
                   }`}>
                     <p className={`text-xs mb-1 font-semibold ${
                       (projectDetail as any).financialInfo.remainingAmount > 0
                         ? "text-yellow-400"
                         : "text-green-400"
                     }`}>
                       {(projectDetail as any).financialInfo.remainingAmount > 0 
                         ? `Saldo Pendiente (${Math.round(((projectDetail as any).financialInfo.remainingAmount / (projectDetail as any).financialInfo.totalAmount) * 100)}%)`
                         : "✅ Cancelado 100%"}
                     </p>
                     <p className={`text-xl font-bold ${
                       (projectDetail as any).financialInfo.remainingAmount > 0
                         ? "text-red-300"
                         : "text-green-400"
                     }`}>
                       {(projectDetail as any).financialInfo.remainingAmount > 0
                         ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.remainingAmount)
                         : "✓ Completado"
                       }
                     </p>
                     {projectDetail.status === "entregado" && (projectDetail as any).financialInfo.remainingAmount > 0 && (
                       <p className="text-xs text-red-400 mt-1 font-medium">
                         ⚠️ Pendiente de cobro
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Barra de progreso de pago */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progreso de pago</span>
                    <span>{(projectDetail as any).financialInfo.paymentProgress || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/[0.10] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        (projectDetail as any).financialInfo.isPaid
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${(projectDetail as any).financialInfo.paymentProgress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Historial de Pagos */}
                {(projectDetail as any).payments && (projectDetail as any).payments.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Historial de Pagos</h4>
                    <div className="space-y-2">
                      {(projectDetail as any).payments.map((payment: any) => (
                        <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-[#162828]/50 rounded">
                          <div>
                            <span className={`font-medium ${
                              payment.type === 'adelanto' ? 'text-blue-400' :
                              payment.type === 'saldo_final' ? 'text-green-400' :
                              payment.type === 'abono' ? 'text-purple-400' : 'text-muted-foreground'
                            }`}>
                              {payment.type === 'adelanto' ? 'Adelanto' :
                               payment.type === 'saldo_final' ? 'Saldo Final' :
                               payment.type === 'abono' ? 'Abono' : 'Otro'}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(payment.paymentDate).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <span className="font-bold text-green-400">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(payment.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          )}

          {/* ALERTAS INTELIGENTES */}
          {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && financialSummary && (
            <div className="space-y-2">
              {/* Alerta de Margen Crítico (< 5%) */}
              {!isAlertClosed("critical-margin") && financialSummary.rentabilidad < 5 && (
                <div className="flex items-center justify-between p-4 bg-red-900 text-white rounded-lg border border-red-700 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚨</span>
                    <div>
                      <p className="font-bold">Proyecto en zona crítica de rentabilidad</p>
                      <p className="text-sm text-red-100">Rentabilidad: {financialSummary.rentabilidad.toFixed(2)}% - Revisar costos inmediatamente</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeAlert("critical-margin")}
                    className="text-white hover:bg-red-800"
                  >
                    ✕
                  </Button>
                </div>
              )}
              
              {/* Alerta de Margen Bajo (5-10%) */}
              {!isAlertClosed("low-margin") && financialSummary.rentabilidad >= 5 && financialSummary.rentabilidad < 10 && (
                <div className="flex items-center justify-between p-4 bg-red-600 text-white rounded-lg border border-red-500 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚨</span>
                    <div>
                      <p className="font-bold">Margen bajo detectado</p>
                      <p className="text-sm text-red-100">Rentabilidad: {financialSummary.rentabilidad.toFixed(2)}% - Revisar costos</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeAlert("low-margin")}
                    className="text-white hover:bg-red-700"
                  >
                    ✕
                  </Button>
                </div>
              )}
              
              {/* Alerta de Margen Moderado (10-15%) */}
              {!isAlertClosed("moderate-margin") && financialSummary.rentabilidad >= 10 && financialSummary.rentabilidad < 15 && (
                <div className="flex items-center justify-between p-4 bg-yellow-500 text-foreground rounded-lg border border-yellow-600 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠</span>
                    <div>
                      <p className="font-bold">Margen moderado</p>
                      <p className="text-sm text-foreground">Rentabilidad: {financialSummary.rentabilidad.toFixed(2)}% - Monitorear costos</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeAlert("moderate-margin")}
                    className="text-foreground hover:bg-yellow-600"
                  >
                    ✕
                  </Button>
                </div>
              )}
              
              {/* Alerta de Saldo Vencido */}
              {!isAlertClosed("overdue-balance") && financialSummary.saldoPendiente > 0 && projectDetail && (
                (() => {
                  const estimatedDate = projectDetail.estimatedInstallDate ? new Date(projectDetail.estimatedInstallDate) : null;
                  if (!estimatedDate) return null;
                  const today = new Date();
                  const daysOverdue = Math.floor((today.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24));
                  return daysOverdue > 7 ? (
                    <div className="flex items-center justify-between p-4 bg-orange-500 text-white rounded-lg border border-orange-600 shadow-md">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠</span>
                        <div>
                          <p className="font-bold">Cliente con saldo pendiente vencido</p>
                          <p className="text-sm text-orange-100">Vencimiento: {daysOverdue} días - Saldo: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(financialSummary.saldoPendiente)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => closeAlert("overdue-balance")}
                        className="text-white hover:bg-orange-600"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : null;
                })()
              )}
            </div>
          )}

          {/* Resumen financiero compacto */}
          {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && financialSummary && (
            <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
              financialSummary.margen < 0
                ? "border-red-500/30 bg-red-500/10"
                : financialSummary.rentabilidad < 10
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-green-500/30 bg-green-500/10"
            }`}>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-white/45 mb-0.5">Saldo pendiente</p>
                  <p className={`text-base font-bold ${financialSummary.saldoPendiente > 0 ? "text-yellow-300" : "text-green-300"}`}>
                    {financialSummary.saldoPendiente > 0 ? formatCurrency(financialSummary.saldoPendiente) : "✓ Pagado"}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 hidden sm:block" />
                <div>
                  <p className="text-xs text-white/45 mb-0.5">Rentabilidad</p>
                  <p className={`text-base font-bold ${getMarginColor(financialSummary.rentabilidad).text}`}>
                    {financialSummary.rentabilidad.toFixed(1)}%
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 hidden sm:block" />
                <div>
                  <p className="text-xs text-white/45 mb-0.5">Gastos registrados</p>
                  <p className="text-base font-bold text-orange-300">
                    {formatCurrency(financialSummary.totalGastos)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comprobante de pago y PDF de cotización - Solo si ya pagó el 60% */}
          {user?.role !== "disenador" && user?.role !== "jefe_taller" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectDetail.advanceReceiptUrl && (
                <Card className="bg-green-500/10 border-green-500/25">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-green-300 mb-2">Comprobante de pago:</p>
                    <a 
                      href={projectDetail.advanceReceiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Ver comprobante
                    </a>
                  </CardContent>
                </Card>
              )}
              {(projectDetail as any).quotationPdfUrl && (
                <Card className="bg-blue-500/10 border-blue-500/25">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-blue-300 mb-2">Cotización aprobada:</p>
                    <a 
                      href={(projectDetail as any).quotationPdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Ver PDF de cotización
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Medidas iniciales */}
          {projectDetail.initialMeasurements && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Medidas Iniciales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{projectDetail.initialMeasurements}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Materiales */}
        <TabsContent value="materials" className="space-y-6 mt-4">
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

        {/* Tab Fotos */}
        <TabsContent value="photos" className="space-y-4 mt-4">
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
              {Object.entries(categoryLabels).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={categoryFilter === value ? "default" : "outline"}
                  onClick={() => { setCategoryFilter(value); setSubcategoryFilter("all"); }}
                  className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                >
                  {label}
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

          {/* Galería de fotos organizada por carpetas */}
          {Object.entries(filteredFolders).map(([folder, folderPhotos]) => {
            if (folderPhotos.length === 0 && categoryFilter !== "all") return null;
            
            return (
              <Card key={folder}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      {subcategoryLabels[folder]}
                      <Badge variant="outline">{folderPhotos.length}</Badge>
                    </div>
                    {canUploadToFolder(folder) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => {
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
                          setPhotoForm({ 
                            ...photoForm, 
                            stage: folderToStageMap[folder] as any, 
                            category: folderToCategoryMap[folder] as any,
                            subcategory: folder 
                          });
                          setShowPhotoDialog(true);
                        }}
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                    )}
                  </CardTitle>
                  {/* Botón de Solicitar Nueva Aprobación para modelado */}
                  {folder === "modelado_3d" && projectDetail.modeladoApprovedAt && (user?.role === "super_admin" || user?.role === "admin") && (
                    <div className="mt-2 p-2 bg-blue-500/10 rounded-md border border-blue-500/25">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-blue-300">
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          Aprobado por {projectDetail.modeladoApprovedBy} el {new Date(projectDetail.modeladoApprovedAt).toLocaleDateString('es-CO')}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-blue-500 text-blue-300 hover:bg-blue-500/15"
                          onClick={() => resetModeladoApproval.mutate({ projectId: projectDetail.id, notifyClient: true })}
                          disabled={resetModeladoApproval.isPending}
                        >
                          {resetModeladoApproval.isPending ? "Enviando..." : "Solicitar Nueva Aprobación"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Botón de Solicitar Nueva Aprobación para renders */}
                  {folder === "renders" && projectDetail.rendersApprovedAt && (user?.role === "super_admin" || user?.role === "admin") && (
                    <div className="mt-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/25">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-amber-300">
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          Aprobado por {projectDetail.rendersApprovedBy} el {new Date(projectDetail.rendersApprovedAt).toLocaleDateString('es-CO')}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500 text-amber-300 hover:bg-amber-500/15"
                          onClick={() => resetRendersApproval.mutate({ projectId: projectDetail.id, notifyClient: true })}
                          disabled={resetRendersApproval.isPending}
                        >
                          {resetRendersApproval.isPending ? "Enviando..." : "Solicitar Nueva Aprobación"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {folderPhotos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin fotos en esta carpeta</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {folderPhotos.map((photo: any, photoIndex: number) => {
                        const isPdf = photo.photoUrl.toLowerCase().endsWith('.pdf');
                        return (
                          <div 
                            key={photo.id} 
                            className="relative group cursor-pointer"
                            onClick={() => fileViewer.openViewer(
                              folderPhotos.map((p: any) => ({
                                url: p.photoUrl,
                                title: `${subcategoryLabels[folder]} - Archivo ${folderPhotos.indexOf(p) + 1}`,
                                description: p.description,
                                type: p.photoUrl.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const,
                              })),
                              photoIndex
                            )}
                          >
                            {isPdf ? (
                              <div className="w-full h-20 bg-white/[0.06] rounded flex flex-col items-center justify-center hover:bg-white/[0.10] transition-colors">
                                <FileText className="h-6 w-6 text-red-500" />
                                <span className="text-xs text-muted-foreground mt-1">PDF</span>
                              </div>
                            ) : (
                              <LazyImage
                                src={photo.photoUrl}
                                alt={photo.description || "Foto del proyecto"}
                                className="w-full h-20 rounded"
                              />
                            )}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="h-4 w-4 text-white drop-shadow-lg" />
                            </div>
                            {/* Botón eliminar - admin/comercial pueden eliminar cualquiera, colaboradores solo sus propias fotos */}
                            {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial" || 
                              ((user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "disenador") && photo.uploadedBy === user?.id)) && (
                              <button
                                className="absolute bottom-1 right-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("¿Estás seguro de eliminar esta foto?")) {
                                    deletePhoto.mutate({ id: photo.id });
                                  }
                                }}
                                disabled={deletePhoto.isPending}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
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

        {/* Tab Detalles */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Botón para agregar detalle */}
          {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial" ||
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

          {(projectDetail as any)?.details?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No hay detalles registrados</p>
              </CardContent>
            </Card>
          ) : (
            (projectDetail as any)?.details?.map((detail: any) => (
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

        {/* Tab Historial */}
        <TabsContent value="history" className="space-y-2 mt-4">
          {projectDetail.history?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Sin historial de cambios</p>
              </CardContent>
            </Card>
          ) : (
            projectDetail.history?.map((entry: any) => {
              // Determinar el rol del usuario que hizo el cambio
              const changedByUser = entry.changedByUser;
              const roleLabels: Record<string, string> = {
                super_admin: "Super Admin",
                admin: "Administrador",
                comercial: "Comercial",
                disenador: "Diseñador",
                jefe_taller: "Jefe de Taller",
                operario: "Operario",
                user: "Cliente",
              };
              const roleLabel = changedByUser ? roleLabels[changedByUser.role] || changedByUser.role : null;
              const userName = changedByUser?.name || "Sistema";
              
              // Determinar si fue una aprobación del cliente o admin
              const isApproval = entry.toStatus === "aprobacion_final" || 
                                 entry.toStatus === "cotizacion_aprobada" ||
                                 entry.notes?.toLowerCase().includes("aprobó");
              const isClientApproval = isApproval && changedByUser?.role === "user";
              const isAdminApproval = isApproval && (changedByUser?.role === "admin" || changedByUser?.role === "super_admin");
              
              return (
                <div key={entry.id} className={`flex items-start gap-3 p-3 bg-background rounded border ${
                  isApproval ? "border-green-300 bg-green-500/10" : ""
                }`}>
                  <div className={`h-2 w-2 mt-2 rounded-full ${
                    isApproval ? "bg-green-500" : "bg-primary"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">
                      <strong>{entry.fromStatus ? (PROJECT_STATUSES[entry.fromStatus as keyof typeof PROJECT_STATUSES]?.label || entry.fromStatus) : "Inicio"}</strong>
                      {" → "}
                      <strong>{PROJECT_STATUSES[entry.toStatus as keyof typeof PROJECT_STATUSES]?.label || entry.toStatus}</strong>
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("es-CO")}
                      </p>
                      {changedByUser && (
                        <Badge variant="outline" className={`text-xs ${
                          isClientApproval ? "bg-blue-500/15 text-blue-300 border-blue-500/40" :
                          isAdminApproval ? "bg-amber-500/15 text-amber-300 border-amber-500/40" :
                          "bg-white/[0.06]"
                        }`}>
                          {isClientApproval && "👤 "}
                          {isAdminApproval && "👑 "}
                          {userName} ({roleLabel})
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo para subir foto */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Subir Fotos</DialogTitle>
            <DialogDescription>
              Agrega fotos al proyecto: {project.name}
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
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={photoForm.description}
                onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                placeholder="Describe la foto..."
                rows={2}
              />
            </div>

            <PhotoUploader
              projectId={project.id}
              stage={photoForm.stage || undefined}
              category={photoForm.category || undefined}
              onUploadComplete={(urls) => {
                if (photoForm.stage && urls.length > 0) {
                  urls.forEach(url => {
                    uploadPhoto.mutate({
                      projectId: project.id,
                      stage: photoForm.stage as any,
                      category: photoForm.category,
                      subcategory: (photoForm.subcategory || undefined) as any,
                      photoUrl: url,
                      description: photoForm.description || undefined,
                    });
                  });
                } else if (!photoForm.stage) {
                  toast.error("Selecciona la etapa primero");
                }
              }}
              accept="image/*,.pdf"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar detalle */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Detalle</DialogTitle>
            <DialogDescription>
              Agrega una nota, medida especial o foto de referencia
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Detalle</Label>
              <Select 
                value={detailForm.type} 
                onValueChange={(v: any) => setDetailForm({ ...detailForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota_importante">Nota Importante</SelectItem>
                  <SelectItem value="medida_especial">Medida Especial</SelectItem>
                  <SelectItem value="foto_referencia">Foto de Referencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={detailForm.title}
                onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                placeholder="Título del detalle"
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

            {detailForm.type === "foto_referencia" && (
              <PhotoUploader
                onUploadComplete={(urls) => {
                  if (urls.length > 0) {
                    setDetailForm({ ...detailForm, photoUrl: urls[0] });
                  }
                }}
                accept="image/*"
              />
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!detailForm.title || !detailForm.content) {
                    toast.error("Completa los campos requeridos");
                    return;
                  }
                  createDetail.mutate({
                    projectId: project.id,
                    type: detailForm.type,
                    title: detailForm.title,
                    content: detailForm.content,
                    photoUrl: detailForm.photoUrl || undefined,
                  });
                }}
                disabled={createDetail.isPending}
                className="w-full"
              >
                {createDetail.isPending ? "Guardando..." : "Guardar Detalle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar fecha */}
      <Dialog open={showEditDateDialog} onOpenChange={setShowEditDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fecha Estimada</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nueva Fecha Estimada</Label>
              <Input
                type="date"
                value={editDateForm.estimatedInstallDate}
                onChange={(e) => setEditDateForm({ ...editDateForm, estimatedInstallDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo del Cambio</Label>
              <Textarea
                value={editDateForm.reason}
                onChange={(e) => setEditDateForm({ ...editDateForm, reason: e.target.value })}
                placeholder="Explica el motivo del cambio..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!editDateForm.estimatedInstallDate) {
                    toast.error("Selecciona una fecha");
                    return;
                  }
                  updateEstimatedDate.mutate({
                    projectId: project.id,
                    estimatedInstallDate: new Date(editDateForm.estimatedInstallDate),
                    reason: editDateForm.reason || undefined,
                  });
                }}
                disabled={updateEstimatedDate.isPending}
              >
                {updateEstimatedDate.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={whatsAppMessage}
              onChange={(e) => setWhatsAppMessage(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const phone = whatsAppPhone.replace(/\D/g, "");
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsAppMessage)}`;
                  window.open(url, "_blank");
                  setShowWhatsAppDialog(false);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo WhatsApp para notificar al diseñador */}
      <Dialog open={showDesignerWhatsAppDialog} onOpenChange={setShowDesignerWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-400" />
              Notificar al Diseñador
            </DialogTitle>
            <DialogDescription>
              Se ha creado una tarea y notificación para el diseñador{designerName ? ` (${designerName})` : ''}. 
              ¿Deseas enviarle también un mensaje por WhatsApp?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDesignerWhatsAppDialog(false);
                setDesignerWhatsAppLink(null);
              }}
            >
              No, solo notificación
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (designerWhatsAppLink) {
                  window.open(designerWhatsAppLink, "_blank");
                }
                setShowDesignerWhatsAppDialog(false);
                setDesignerWhatsAppLink(null);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Sí, abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
