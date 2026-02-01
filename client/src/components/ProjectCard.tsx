import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Hammer, 
  Paintbrush, 
  Package, 
  Truck,
  FileText,
  MessageCircle,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  FileDown,
  Upload,
  Plus,
  ZoomIn,
  Pencil
} from "lucide-react";

// Estados del proyecto según Ruta INNOVAR
const PROJECT_STATUSES = {
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Cliente Confirmado - Iniciar Diseño", color: "bg-blue-500", icon: CheckCircle2 },
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

interface ProjectCardProps {
  project: any;
  projectDetail?: any;
  user: any;
  onAdvanceStatus: (projectId: number, newStatus: string) => void;
  onApproveDesign?: (projectId: number, approved: boolean, notes?: string) => void;
  onExportPdf?: (projectId: number, projectName: string) => void;
  onWhatsApp?: (project: any) => void;
  onUploadPhoto?: (project: any) => void;
  onAddDetail?: (project: any) => void;
  onEditDate?: (project: any) => void;
  onViewPhoto?: (url: string, allPhotos: any[]) => void;
  isUpdating?: boolean;
  generatingPdf?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function ProjectCard({
  project,
  projectDetail,
  user,
  onAdvanceStatus,
  onApproveDesign,
  onExportPdf,
  onWhatsApp,
  onUploadPhoto,
  onAddDetail,
  onEditDate,
  onViewPhoto,
  isUpdating = false,
  generatingPdf = false,
  isExpanded = false,
  onToggleExpand,
}: ProjectCardProps) {
  const [activeTab, setActiveTab] = useState("info");

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

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      cotizacion_enviada: "cotizacion_aprobada",
      cotizacion_aprobada: "adelanto_recibido",
      adelanto_recibido: "en_diseno",
      en_diseno: "pendiente_cliente",
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

  const detail = projectDetail || project;

  // Verificar si es un proyecto nuevo para el diseñador (listo para comenzar a diseñar)
  const isNewForDesigner = user?.role === "disenador" && project.status === "adelanto_recibido";
  // Verificar si es un proyecto en progreso del diseñador
  const isInProgressForDesigner = user?.role === "disenador" && ["en_diseno", "pendiente_cliente", "aprobacion_final"].includes(project.status);

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'} ${isNewForDesigner ? 'ring-2 ring-purple-500 bg-purple-50/50' : ''}`}>
      <CardContent className="p-0">
        {/* Header del proyecto - siempre visible */}
        <div 
          className="p-4 cursor-pointer"
          onClick={onToggleExpand}
        >
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* Info básica */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-base sm:text-lg truncate max-w-[200px] sm:max-w-none">
                  {project.name}
                </h3>
                {getStatusBadge(project.status)}
                {isNewForDesigner && (
                  <Badge className="bg-purple-600 text-white animate-pulse">
                    ✨ Nuevo para Diseñar
                  </Badge>
                )}
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
                {project.estimatedInstallDate && project.status !== "entregado" && (
                  <p className={`flex items-center gap-1 font-medium ${
                    new Date(project.estimatedInstallDate) < new Date() 
                      ? "text-red-600" 
                      : new Date(project.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}>
                    <Truck className="h-3 w-3" />
                    Entrega: {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO")}
                    {new Date(project.estimatedInstallDate) < new Date() && " ⚠️"}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones rápidas y botón expandir */}
            <div className="flex items-center gap-2">
              {canAdvanceStatus(project.status) && getNextStatus(project.status) && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = getNextStatus(project.status);
                    if (nextStatus) {
                      onAdvanceStatus(project.id, nextStatus);
                    }
                  }}
                  disabled={isUpdating}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Avanzar
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido expandible */}
        {isExpanded && detail && (
          <div className="border-t px-4 pb-4">
            {/* Acciones del proyecto */}
            <div className="flex flex-wrap gap-2 py-3 border-b">
              {project.client?.whatsappPhone && (user?.role === "admin" || user?.role === "super_admin") && onWhatsApp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => onWhatsApp(project)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              )}
              {onExportPdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportPdf(project.id, project.name)}
                  disabled={generatingPdf}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  {generatingPdf ? "Generando..." : "PDF"}
                </Button>
              )}
              {onUploadPhoto && (user?.role !== "user") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUploadPhoto(project)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Fotos
                </Button>
              )}
              {onAddDetail && (user?.role !== "user") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddDetail(project)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Detalle
                </Button>
              )}
            </div>

            {/* Alerta de aprobación pendiente */}
            {detail.status === "pendiente_cliente" && 
              (user?.role === "admin" || user?.role === "super_admin") && 
              onApproveDesign && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-3">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pendiente de Aprobación del Cliente
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Puedes aprobar el diseño en nombre del cliente si este no usa la aplicación.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onApproveDesign(detail.id, true)}
                    disabled={isUpdating}
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
                        onApproveDesign(detail.id, false, notes);
                      }
                    }}
                    disabled={isUpdating}
                  >
                    Solicitar Cambios
                  </Button>
                </div>
              </div>
            )}

            {/* Tabs de contenido */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
                <TabsTrigger value="dates" className="text-xs sm:text-sm">Fechas</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs sm:text-sm">Fotos</TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-3 space-y-3">
                {/* Información del cliente */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p><strong>Nombre:</strong> {detail.client?.name}</p>
                    {user?.role !== "disenador" && user?.role !== "jefe_taller" && user?.role !== "operario" && (
                      <>
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {detail.client?.whatsappPhone}
                        </p>
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {detail.client?.email || "N/A"}
                        </p>
                      </>
                    )}
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {detail.client?.address || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Medidas iniciales */}
                {detail.initialMeasurements && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Medidas Iniciales</h4>
                    <p className="text-sm whitespace-pre-wrap">{detail.initialMeasurements}</p>
                  </div>
                )}

                {/* Detalles del proyecto */}
                {detail.details?.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Notas y Detalles</h4>
                    <div className="space-y-2">
                      {detail.details.slice(0, 3).map((d: any) => (
                        <div key={d.id} className="text-sm border-l-2 border-primary pl-2">
                          <p className="font-medium">{d.title}</p>
                          <p className="text-muted-foreground truncate">{d.content}</p>
                        </div>
                      ))}
                      {detail.details.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{detail.details.length - 3} más...</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dates" className="mt-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Fechas del Proyecto
                    </h4>
                    {onEditDate && (user?.role === "admin" || user?.role === "super_admin" || user?.role === "jefe_taller") && detail.status !== "entregado" && (
                      <Button variant="ghost" size="sm" onClick={() => onEditDate(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p><strong>Creado:</strong> {new Date(detail.createdAt).toLocaleDateString("es-CO")}</p>
                    {detail.quotationApprovedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                      <p><strong>Cotización aprobada:</strong> {new Date(detail.quotationApprovedAt).toLocaleDateString("es-CO")}</p>
                    )}
                    {detail.advanceReceivedAt && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                      <p><strong>Adelanto recibido:</strong> {new Date(detail.advanceReceivedAt).toLocaleDateString("es-CO")}</p>
                    )}
                    {detail.designDeadline && (
                      <p className={new Date(detail.designDeadline) < new Date() && detail.status === "en_diseno" ? "text-red-600 font-medium" : ""}>
                        <strong>Límite diseño:</strong> {new Date(detail.designDeadline).toLocaleDateString("es-CO")}
                        {new Date(detail.designDeadline) < new Date() && detail.status === "en_diseno" && " (Vencido)"}
                      </p>
                    )}
                    {detail.designDeliveredAt && (
                      <p><strong>Diseño entregado:</strong> {new Date(detail.designDeliveredAt).toLocaleDateString("es-CO")}</p>
                    )}
                    {detail.clientApprovedAt && (
                      <p><strong>Aprobación cliente:</strong> {new Date(detail.clientApprovedAt).toLocaleDateString("es-CO")}</p>
                    )}
                    {detail.estimatedInstallDate && detail.status !== "entregado" && (
                      <p className={`font-medium ${
                        new Date(detail.estimatedInstallDate) < new Date() 
                          ? "text-red-600" 
                          : new Date(detail.estimatedInstallDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}>
                        <strong>Entrega estimada:</strong> {new Date(detail.estimatedInstallDate).toLocaleDateString("es-CO")}
                      </p>
                    )}
                    {detail.scheduledInstallDate && detail.status !== "entregado" && (
                      <p className="text-blue-600 font-medium">
                        <strong>Instalación:</strong> {new Date(detail.scheduledInstallDate).toLocaleDateString("es-CO")}
                      </p>
                    )}
                    {detail.deliveredAt && (
                      <p className="text-green-600 font-medium">
                        <strong>Entregado:</strong> {new Date(detail.deliveredAt).toLocaleDateString("es-CO")}
                      </p>
                    )}
                  </div>

                  {/* Comprobante y PDF de cotización */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.advanceReceiptUrl && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                      <a 
                        href={detail.advanceReceiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline bg-green-50 px-2 py-1 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Ver comprobante
                      </a>
                    )}
                    {(detail as any).quotationPdfUrl && user?.role !== "disenador" && user?.role !== "jefe_taller" && (
                      <a 
                        href={(detail as any).quotationPdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                      >
                        <FileText className="h-4 w-4" />
                        Ver cotización PDF
                      </a>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="mt-3">
                {detail.photos?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay fotos registradas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {detail.photos?.slice(0, 12).map((photo: any) => (
                      <div 
                        key={photo.id} 
                        className="aspect-square rounded overflow-hidden cursor-pointer relative group"
                        onClick={() => onViewPhoto?.(photo.photoUrl, detail.photos)}
                      >
                        <img 
                          src={photo.photoUrl} 
                          alt={photo.description || "Foto"} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {detail.photos?.length > 12 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    +{detail.photos.length - 12} fotos más
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                {detail.history?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin historial de cambios</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detail.history?.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                        <div className="h-2 w-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p>
                            <span className="font-medium">{entry.fromStatus || "Inicio"}</span>
                            {" → "}
                            <span className="font-medium">{entry.toStatus}</span>
                          </p>
                          {entry.notes && (
                            <p className="text-muted-foreground text-xs truncate">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString("es-CO")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
