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
  History
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

// Estados que ya pagaron el adelanto del 60%
const PAID_ADVANCE_STATUSES = [
  "adelanto_recibido",
  "en_diseno",
  "pendiente_cliente",
  "aprobacion_final",
  "corte",
  "enchape",
  "ensamble",
  "listo_instalacion",
  "instalacion_programada",
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
  
  // Filtros para fotos
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");

  // Query para detalle del proyecto
  const { data: projectDetail, isLoading } = trpc.projects.getById.useQuery(
    { id: project.id },
    { enabled: !!project.id }
  );

  // DEBUG: Log financialInfo
  useEffect(() => {
    if (projectDetail) {
      console.log('ProjectDetail loaded:', {
        id: projectDetail.id,
        financialInfo: (projectDetail as any).financialInfo,
        quotation: (projectDetail as any).quotation,
        advanceReceiptUrl: projectDetail.advanceReceiptUrl,
      });
    }
  }, [projectDetail]);

  // Mutations
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

  if (isLoading || !projectDetail) {
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
      renders: [],
      despieces: [],
      detalles: [],
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
  const getFilteredFolders = () => {
    if (categoryFilter === "all") return photosByFolder;
    
    const categoryToFolders: Record<string, string[]> = {
      cotizacion: ["documento_cotizacion"],
      medidas: ["fotos_iniciales", "dibujo"],
      disenos: ["renders", "despieces", "detalles"],
      avance: ["corte", "enchape", "armado"],
      instalacion: ["proceso_instalacion"],
      entrega: ["fotos_finales"],
    };
    
    const allowedFolders = categoryToFolders[categoryFilter] || [];
    const filtered: Record<string, any[]> = {};
    
    allowedFolders.forEach(folder => {
      if (subcategoryFilter === "all" || subcategoryFilter === folder) {
        filtered[folder] = photosByFolder[folder] || [];
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
    renders: "Renders",
    despieces: "Despieces",
    detalles: "Detalles",
    corte: "Corte",
    enchape: "Enchape",
    armado: "Armado",
    proceso_instalacion: "Proceso",
    fotos_finales: "Fotos Finales",
  };

  // Permisos de subida por carpeta según rol
  const canUploadToFolder = (folder: string) => {
    const role = user?.role;
    const uploadPermissions: Record<string, string[]> = {
      documento_cotizacion: ["super_admin", "admin"],
      fotos_iniciales: ["super_admin", "admin"],
      dibujo: ["super_admin", "admin"],
      renders: ["disenador"],
      despieces: ["disenador"],
      detalles: ["disenador"],
      corte: ["jefe_taller", "operario"],
      enchape: ["jefe_taller", "operario"],
      armado: ["jefe_taller", "operario"],
      proceso_instalacion: ["jefe_taller", "operario"],
      fotos_finales: ["jefe_taller", "operario"],
    };
    const allowedRoles = uploadPermissions[folder] || [];
    return allowedRoles.includes(role || "");
  };

  // DEBUG: Log en cada render - v2
  const fi = (projectDetail as any).financialInfo;
  console.log('RENDER v2 - financialInfo:', fi);
  if (fi) {
    console.log('Total:', fi.totalAmount, 'Advance:', fi.advanceAmount);
  }
  
  return (
    <div className="bg-muted/30 rounded-lg mt-2 p-3 sm:p-4 border border-border">
      {/* Header con botones de acción */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{project.name}</h3>
          <Badge className={`${PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]?.color || "bg-gray-500"} text-white`}>
            {PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]?.label || project.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón WhatsApp */}
          {projectDetail.client && projectDetail.client.whatsappPhone && (user?.role === "admin" || user?.role === "super_admin") && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => {
                const baseUrl = window.location.origin;
                const portalUrl = `${baseUrl}/portal?project=${project.id}`;
                const workTypeLabel = WORK_TYPES[project.workType as keyof typeof WORK_TYPES] || project.workType;
                const statusLabel = PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]?.label || project.status;
                
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
      {projectDetail.status === "pendiente_cliente" && 
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

      {/* Tabs con colores distintivos */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="info" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-blue-100 text-blue-700 data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-200 transition-colors"
          >
            <Info className="h-4 w-4 mr-1 hidden sm:inline" />
            Información
          </TabsTrigger>
          <TabsTrigger 
            value="materials" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-purple-100 text-purple-700 data-[state=active]:bg-purple-500 data-[state=active]:text-white hover:bg-purple-200 transition-colors"
          >
            <Palette className="h-4 w-4 mr-1 hidden sm:inline" />
            Materiales
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-green-100 text-green-700 data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-200 transition-colors"
          >
            <Camera className="h-4 w-4 mr-1 hidden sm:inline" />
            Fotos
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-orange-100 text-orange-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white hover:bg-orange-200 transition-colors"
          >
            <ListTodo className="h-4 w-4 mr-1 hidden sm:inline" />
            Detalles
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3 py-2 bg-gray-200 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-300 transition-colors"
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
                {user?.role !== "disenador" && (
                  <>
                    <p><strong>Teléfono:</strong> {projectDetail.client?.whatsappPhone}</p>
                    <p><strong>Email:</strong> {projectDetail.client?.email || "N/A"}</p>
                  </>
                )}
                <p><strong>Dirección:</strong> {projectDetail.client?.address || "N/A"}</p>
              </CardContent>
            </Card>

            {/* Información Financiera Simple - Solo si ya pagó el 60% */}
            {user?.role !== "disenador" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (() => {
              // Calcular valores financieros directamente
              const quotationTotal = (projectDetail as any).quotation?.total ? Number((projectDetail as any).quotation.total) : 0;
              const projectAdvance = projectDetail.advanceAmount ? Number(projectDetail.advanceAmount) : 0;
              const totalAmount = quotationTotal || (projectAdvance ? Math.round(projectAdvance / 0.6) : 0);
              const advanceAmount = projectAdvance || (totalAmount ? Math.round(totalAmount * 0.6) : 0);
              const remainingAmount = totalAmount - advanceAmount;
              
              return (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      Información Financiera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total del Proyecto</span>
                      <span className="font-medium">
                        {totalAmount > 0 
                          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalAmount)
                          : "$0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adelanto Pagado (60%)</span>
                      <span className="font-medium text-green-600">
                        {advanceAmount > 0
                          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(advanceAmount)
                          : "$0"}
                      </span>
                    </div>
                    <div className="flex justify-between bg-yellow-100 p-2 rounded">
                      <span className="text-yellow-700">Saldo Pendiente (40%)</span>
                      <span className="font-medium text-yellow-700">
                        {remainingAmount > 0
                          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(remainingAmount)
                          : "$0"}
                      </span>
                    </div>
                    
                    {/* Enlace al recibo del adelanto */}
                    {projectDetail.advanceReceiptUrl && (
                      <div className="pt-2 border-t">
                        <a 
                          href={projectDetail.advanceReceiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          Ver Recibo del Adelanto
                        </a>
                      </div>
                    )}
                  </CardContent>
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
                <p><strong>Creado:</strong> {new Date(projectDetail.createdAt).toLocaleDateString("es-CO")}</p>
                {projectDetail.quotationApprovedAt && user?.role !== "disenador" && (
                  <p><strong>Cotización aprobada:</strong> {new Date(projectDetail.quotationApprovedAt).toLocaleDateString("es-CO")}</p>
                )}
                {projectDetail.advanceReceivedAt && user?.role !== "disenador" && (
                  <p><strong>Adelanto recibido:</strong> {new Date(projectDetail.advanceReceivedAt).toLocaleDateString("es-CO")}</p>
                )}
                {projectDetail.estimatedInstallDate && projectDetail.status !== "entregado" && (
                  <p className={`font-medium ${
                    new Date(projectDetail.estimatedInstallDate) < new Date() 
                      ? "text-red-600" 
                      : "text-green-600"
                  }`}>
                    <strong>Entrega estimada:</strong> {new Date(projectDetail.estimatedInstallDate).toLocaleDateString("es-CO")}
                  </p>
                )}
                {projectDetail.deliveredAt && (
                  <p className="text-green-600 font-medium">
                    <strong>Entregado:</strong> {new Date(projectDetail.deliveredAt).toLocaleDateString("es-CO")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Información Financiera Prominente - Solo si ya pagó el 60% y hay total de cotización */}
          {user?.role !== "disenador" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (projectDetail as any).financialInfo && (projectDetail as any).financialInfo.totalAmount > 0 && (
            <Card className={`border-2 ${
              projectDetail.status === "entregado" && (projectDetail as any).financialInfo.remainingAmount > 0
                ? "border-red-400 bg-red-50"
                : projectDetail.status === "entregado"
                  ? "border-green-400 bg-green-50"
                  : "border-blue-400 bg-blue-50"
            }`}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  Información Financiera del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total del Proyecto */}
                  <div className="text-center p-3 bg-white/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total del Proyecto</p>
                    <p className="text-xl font-bold text-gray-800">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.totalAmount)}
                    </p>
                  </div>
                  
                  {/* Adelanto Pagado */}
                  <div className="text-center p-3 bg-green-100/50 rounded-lg">
                    <p className="text-xs text-green-700 mb-1">Adelanto Pagado (60%)</p>
                    <p className="text-xl font-bold text-green-700">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.advanceAmount)}
                    </p>
                    {projectDetail.advanceReceivedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Recibido: {new Date(projectDetail.advanceReceivedAt).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                  
                  {/* Saldo Pendiente */}
                  <div className={`text-center p-3 rounded-lg ${
                    (projectDetail as any).financialInfo.remainingAmount > 0
                      ? "bg-red-100/50"
                      : "bg-green-100/50"
                  }`}>
                    <p className={`text-xs mb-1 ${
                      (projectDetail as any).financialInfo.remainingAmount > 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}>
                      {(projectDetail as any).financialInfo.remainingAmount > 0 ? "Saldo Pendiente (40%)" : "Pagado Completamente"}
                    </p>
                    <p className={`text-xl font-bold ${
                      (projectDetail as any).financialInfo.remainingAmount > 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}>
                      {(projectDetail as any).financialInfo.remainingAmount > 0
                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((projectDetail as any).financialInfo.remainingAmount)
                        : "✓ Completado"
                      }
                    </p>
                    {projectDetail.status === "entregado" && (projectDetail as any).financialInfo.remainingAmount > 0 && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
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
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
                        <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-white/50 rounded">
                          <div>
                            <span className={`font-medium ${
                              payment.type === 'adelanto' ? 'text-blue-600' :
                              payment.type === 'saldo_final' ? 'text-green-600' :
                              payment.type === 'abono' ? 'text-purple-600' : 'text-gray-600'
                            }`}>
                              {payment.type === 'adelanto' ? 'Adelanto' :
                               payment.type === 'saldo_final' ? 'Saldo Final' :
                               payment.type === 'abono' ? 'Abono' : 'Otro'}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(payment.paymentDate).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <span className="font-bold text-green-700">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(payment.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comprobante de pago y PDF de cotización - Solo si ya pagó el 60% */}
          {user?.role !== "disenador" && PAID_ADVANCE_STATUSES.includes(projectDetail.status) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectDetail.advanceReceiptUrl && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-green-800 mb-2">Comprobante de pago:</p>
                    <a 
                      href={projectDetail.advanceReceiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Ver comprobante
                    </a>
                  </CardContent>
                </Card>
              )}
              {(projectDetail as any).quotationPdfUrl && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-blue-800 mb-2">Cotización aprobada:</p>
                    <a 
                      href={(projectDetail as any).quotationPdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
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
                        variant="ghost"
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
                          setPhotoForm({ ...photoForm, stage: folderToStageMap[folder] as any, subcategory: folder });
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
                              <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded flex flex-col items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <FileText className="h-6 w-6 text-red-500" />
                                <span className="text-xs text-muted-foreground mt-1">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={photo.photoUrl}
                                alt={photo.description || "Foto del proyecto"}
                                className="w-full h-20 object-cover rounded hover:opacity-80 transition-opacity"
                              />
                            )}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="h-4 w-4 text-white drop-shadow-lg" />
                            </div>
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
            projectDetail.history?.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 bg-background rounded border">
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
            ))
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
              >
                {createDetail.isPending ? "Guardando..." : "Guardar"}
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
    </div>
  );
}
