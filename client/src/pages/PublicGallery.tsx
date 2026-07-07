import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WatermarkedImage, WatermarkedFullscreenImage } from "@/components/WatermarkedImage";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight,
  X,
  Download,
  Palette,
  Box,
  CheckCircle,
  MessageSquare,
  Loader2
} from "lucide-react";

const WORK_TYPES: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export default function PublicGallery() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectId = parseInt(params.get("project") || "0");
  const token = params.get("token") || "";
  const photoType = params.get("type") as "modelado_3d" | "renders" | undefined;

  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>(photoType || "all");
  
  // Estados para diálogos de aprobación/cambios
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [clientName, setClientName] = useState("");
  const [changesText, setChangesText] = useState("");
  const [actionCompleted, setActionCompleted] = useState<"approved" | "changes" | null>(null);

  const { data, isLoading, error } = trpc.publicGallery.getProjectPhotos.useQuery(
    { projectId, token, type: photoType },
    { enabled: projectId > 0 && !!token }
  );

  // Consultar estado de aprobación
  const { data: approvalStatus } = trpc.publicGallery.getApprovalStatus.useQuery(
    { projectId, token },
    { enabled: projectId > 0 && !!token }
  );

  // Determinar si ya está aprobado según el tipo
  const isAlreadyApproved = photoType === "renders" 
    ? approvalStatus?.rendersApproved 
    : approvalStatus?.modeladoApproved;
  
  const approvedBy = photoType === "renders"
    ? approvalStatus?.rendersApprovedBy
    : approvalStatus?.modeladoApprovedBy;
    
  const approvedAt = photoType === "renders"
    ? approvalStatus?.rendersApprovedAt
    : approvalStatus?.modeladoApprovedAt;

  const approveMutation = trpc.publicGallery.approveDesign.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setShowApproveDialog(false);
      setActionCompleted("approved");
      setClientName("");
      
      // Abrir WhatsApp automáticamente para notificar al equipo
      if (result.teamWhatsAppLink) {
        // Pequeño delay para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          window.open(result.teamWhatsAppLink, "_blank");
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la aprobación");
    },
  });

  const changesMutation = trpc.publicGallery.requestChanges.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setShowChangesDialog(false);
      setActionCompleted("changes");
      setClientName("");
      setChangesText("");
      
      // Abrir WhatsApp automáticamente para notificar al equipo
      if (result.teamWhatsAppLink) {
        // Pequeño delay para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          window.open(result.teamWhatsAppLink, "_blank");
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar la solicitud");
    },
  });

  if (projectId === 0 || !token) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-muted-foreground mb-2">Enlace inválido</h1>
          <p className="text-gray-500">El enlace que recibiste no es válido. Por favor contacta a INNOVAR Cocinas.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-muted-foreground mb-2">Proyecto no encontrado</h1>
          <p className="text-gray-500">No pudimos encontrar el proyecto solicitado.</p>
        </Card>
      </div>
    );
  }

  const { project, client, photos, totalModelado, totalRenders } = data;

  // Filtrar fotos según la pestaña activa
  const filteredPhotos = activeTab === "all" 
    ? photos 
    : photos.filter(p => p.subcategory === activeTab);

  // Navegación del visor
  const currentPhotoIndex = selectedPhoto !== null 
    ? filteredPhotos.findIndex(p => p.id === selectedPhoto) 
    : -1;

  const goToPrevious = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex + 1].id);
    }
  };

  const selectedPhotoData = selectedPhoto !== null 
    ? filteredPhotos.find(p => p.id === selectedPhoto) 
    : null;

  const handleApprove = () => {
    if (!clientName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    approveMutation.mutate({
      projectId,
      token,
      clientName: clientName.trim(),
      type: photoType || "modelado_3d",
    });
  };

  const handleRequestChanges = () => {
    if (!clientName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (changesText.trim().length < 10) {
      toast.error("Por favor describe los cambios que necesitas (mínimo 10 caracteres)");
      return;
    }
    changesMutation.mutate({
      projectId,
      token,
      clientName: clientName.trim(),
      type: photoType || "modelado_3d",
      changes: changesText.trim(),
    });
  };

  const designType = photoType === "renders" ? "renders" : "modelado_3d";
  const designTypeLabel = photoType === "renders" ? "Renders" : "Modelado 3D";

  return (
    <div className="min-h-screen bg-white/[0.02] flex flex-col">
      {/* Header con logo prominente y branding INNOVAR */}
      <header className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center">
            {/* Logo grande y prominente */}
            <div className="bg-white rounded-2xl p-4 shadow-xl mb-3">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-16 md:h-20 object-contain"
              />
            </div>
            {/* Slogan */}
            <p className="text-white/90 text-sm md:text-base font-medium tracking-wide">
              Diseño y Fabricación de Cocinas Integrales
            </p>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Info del proyecto */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-teal-500/15 text-teal-700 hover:bg-teal-500/15">
            {WORK_TYPES[project.workType] || project.workType}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {project.name}
          </h1>
          {client && (
            <p className="text-muted-foreground">
              Diseño exclusivo para <span className="font-medium">{client.name}</span>
            </p>
          )}
        </div>

        {/* Mensaje de ya aprobado (desde la base de datos) */}
        {isAlreadyApproved && !actionCompleted && (
          <Card className="mb-6 p-6 bg-green-500/10 border-green-500/25">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-300">¡{designTypeLabel} Aprobado!</h3>
                <p className="text-green-700 text-sm">
                  {approvedBy && `Aprobado por ${approvedBy}`}
                  {approvedAt && ` el ${new Date(approvedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
                <p className="text-green-600 text-sm mt-1">
                  {photoType === "modelado_3d" 
                    ? "Nuestro equipo está preparando los renders finales."
                    : "Tu proyecto está en producción. Pronto te contactaremos."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Mensaje de acción completada */}
        {actionCompleted && (
          <Card className={`mb-6 p-6 ${actionCompleted === "approved" ? "bg-green-500/10 border-green-500/25" : "bg-blue-500/10 border-blue-500/25"}`}>
            <div className="flex items-center gap-3">
              {actionCompleted === "approved" ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-300">¡Diseño Aprobado!</h3>
                    <p className="text-green-700 text-sm">
                      Gracias por aprobar el {designTypeLabel}. Nuestro equipo continuará con los siguientes pasos.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-300">Cambios Solicitados</h3>
                    <p className="text-blue-700 text-sm">
                      Hemos recibido tu solicitud. Nuestro equipo de diseño revisará los cambios y te contactará pronto.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Pestañas de filtro */}
        {!photoType && (totalModelado > 0 || totalRenders > 0) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Todas ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="modelado_3d" className="flex items-center gap-1" disabled={totalModelado === 0}>
                <Box className="h-4 w-4" />
                Modelado ({totalModelado})
              </TabsTrigger>
              <TabsTrigger value="renders" className="flex items-center gap-1" disabled={totalRenders === 0}>
                <Palette className="h-4 w-4" />
                Renders ({totalRenders})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Galería de fotos con marca de agua */}
        {filteredPhotos.length === 0 ? (
          <Card className="text-center p-12">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay imágenes disponibles en esta categoría</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <Card 
                key={photo.id} 
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <div className="relative aspect-[4/3] bg-white/[0.06]">
                  <WatermarkedImage
                    src={photo.photoUrl}
                    alt={photo.description || `Imagen ${index + 1}`}
                    className="w-full h-full"
                    watermarkOpacity={0.35}
                    watermarkSize={30}
                    watermarkPosition="bottom-right"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge 
                    className={`absolute top-2 left-2 ${
                      photo.subcategory === "modelado_3d" 
                        ? "bg-purple-500 hover:bg-purple-500" 
                        : "bg-green-500 hover:bg-green-500"
                    }`}
                  >
                    {photo.subcategory === "modelado_3d" ? "Modelado 3D" : "Render"}
                  </Badge>
                </div>
                {photo.description && (
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{photo.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sección de aprobación - Solo mostrar si hay fotos, no se ha completado una acción y no está ya aprobado */}
        {filteredPhotos.length > 0 && !actionCompleted && !isAlreadyApproved && (
          <Card className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500/25">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ¿Qué te parece el {designTypeLabel}?
              </h3>
              <p className="text-muted-foreground mb-6">
                Revisa las imágenes y dinos si estás conforme o si necesitas algún cambio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Aprobar {designTypeLabel}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-amber-500 text-amber-700 hover:bg-amber-500/15"
                  onClick={() => setShowChangesDialog(true)}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Solicitar Cambios
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Mensaje de contacto */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-500/25">
            <p className="text-muted-foreground mb-2">
              ¿Tienes alguna pregunta?
            </p>
            <p className="text-teal-700 font-medium">
              Contáctanos por WhatsApp: <a href="https://wa.me/573136802025" className="underline">313 680 2025</a>
            </p>
          </Card>
        </div>
      </main>

      {/* Footer con branding INNOVAR */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo pequeño en footer */}
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-2">
                <img 
                  src="/logo-light.png" 
                  alt="INNOVAR" 
                  className="h-8 object-contain"
                />
              </div>
              <div>
                <p className="text-white font-semibold">INNOVAR</p>
                <p className="text-gray-400 text-xs">Cocinas Integrales</p>
              </div>
            </div>
            
            {/* Información de contacto */}
            <div className="text-center md:text-right">
              <p className="text-teal-400 font-medium">313 680 2025</p>
              <p className="text-gray-400 text-sm">K9 vía Cerritos a Pereira</p>
              <p className="text-gray-500 text-xs mt-1">
                © {new Date().getFullYear()} Todos los derechos reservados
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Diálogo de Aprobación */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aprobar {designTypeLabel}
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar el {designTypeLabel.toLowerCase()} de tu proyecto? 
              {photoType === "modelado_3d" 
                ? " Una vez aprobado, continuaremos con los renders finales."
                : " Una vez aprobado, procederemos con la producción de tu proyecto."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Tu nombre completo</Label>
              <Input
                id="clientName"
                placeholder="Ej: María García"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveMutation.isPending || !clientName.trim()}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sí, Aprobar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Solicitar Cambios */}
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Solicitar Cambios
            </DialogTitle>
            <DialogDescription>
              Describe los cambios que necesitas en el {designTypeLabel.toLowerCase()}. 
              Nuestro equipo de diseño revisará tu solicitud y te contactará.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientNameChanges">Tu nombre completo</Label>
              <Input
                id="clientNameChanges"
                placeholder="Ej: María García"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changes">¿Qué cambios necesitas?</Label>
              <Textarea
                id="changes"
                placeholder="Describe los cambios que te gustaría ver en el diseño..."
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Mínimo 10 caracteres. Sé lo más específico posible.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChangesDialog(false)}
              disabled={changesMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleRequestChanges}
              disabled={changesMutation.isPending || !clientName.trim() || changesText.trim().length < 10}
            >
              {changesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de imagen a pantalla completa con marca de agua */}
      {selectedPhotoData && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Botón cerrar */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navegación anterior */}
          {currentPhotoIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Imagen con marca de agua */}
          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <WatermarkedFullscreenImage
              src={selectedPhotoData.photoUrl}
              alt={selectedPhotoData.description || "Imagen del proyecto"}
              watermarkOpacity={0.3}
              watermarkSize={20}
              watermarkPosition="bottom-right"
            />
            
            {/* Info de la imagen */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge 
                    className={`mb-2 ${
                      selectedPhotoData.subcategory === "modelado_3d" 
                        ? "bg-purple-500" 
                        : "bg-green-500"
                    }`}
                  >
                    {selectedPhotoData.subcategory === "modelado_3d" ? "Modelado 3D" : "Render Final"}
                  </Badge>
                  {selectedPhotoData.description && (
                    <p className="text-white/90 text-sm">{selectedPhotoData.description}</p>
                  )}
                  <p className="text-white/60 text-xs mt-1">
                    {currentPhotoIndex + 1} de {filteredPhotos.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/50 hover:bg-white/20"
                  onClick={() => window.open(selectedPhotoData.photoUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          </div>

          {/* Navegación siguiente */}
          {currentPhotoIndex < filteredPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
