import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
import { 
  Package, 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Play,
  Camera,
  Image,
  ArrowRight,
  MessageCircle,
  Phone,
  MapPin,
  Globe,
  LogOut,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  Upload,
  History,
  Plus,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { OperatorDailyProjects } from "@/components/OperatorDailyProjects";
import { DailyMotivation } from "@/components/DailyMotivation";
import { LazyImage } from "@/components/LazyImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Componente de botón de cerrar sesión
function LogoutButton() {
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Sesión cerrada correctamente");
      window.location.href = "/login";
    },
    onError: () => {
      toast.error("Error al cerrar sesión");
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
      <span className="ml-1 hidden xl:inline">Salir</span>
    </Button>
  );
}

const PRIORITY_CONFIG = {
  alta: { label: "Urgente", color: "bg-red-500", icon: AlertTriangle, emoji: "🔥" },
  media: { label: "Media", color: "bg-yellow-500", icon: Clock, emoji: "⚡" },
  baja: { label: "Baja", color: "bg-green-500", icon: CheckCircle2, emoji: "✅" },
};

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "bg-gray-500" },
  en_progreso: { label: "En Progreso", color: "bg-blue-500" },
  completada: { label: "Completada", color: "bg-green-500" },
};

export function OperarioDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: myTasks = [], isLoading: loadingTasks } = trpc.tasks.getMyTasks.useQuery();
  const { data: projects = [], isLoading: loadingProjects } = trpc.projects.list.useQuery();

  // Mutation para actualizar estado de tarea
  const updateTaskStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      toast.success("Tarea actualizada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar tarea");
    },
  });

  // Mutation para subir imagen
  const uploadImage = trpc.upload.image.useMutation({
    onSuccess: () => {
      toast.success("Foto subida exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir la foto");
    },
  });

  // Mutation para registrar foto en proyecto
  const uploadProjectPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate();
      utils.projects.list.invalidate();
    },
  });

  // Filtrar proyectos en producción (donde el operario trabaja)
  const productionProjects = projects.filter(p => 
    ["aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion"].includes(p.status)
  );

  // Tareas pendientes (no completadas)
  const pendingTasks = myTasks.filter(t => t.status !== "completada");
  const urgentTasks = pendingTasks.filter(t => t.priority === "alta");
  const inProgressTasks = pendingTasks.filter(t => t.status === "en_progreso");
  
  // Tareas completadas (ordenadas por fecha de completado, más recientes primero)
  const completedTasks = myTasks
    .filter(t => t.status === "completada")
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10); // Solo las últimas 10

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      aprobacion_final: "Aprobación Final",
      despiece: "En Despiece",
      corte: "En Corte",
      enchape: "En Enchape",
      ensamble: "En Ensamble",
      listo_instalacion: "En Instalación",
      entregado: "Entregado",
    };
    return statusLabels[status] || status;
  };

  const handleViewPhoto = (url: string, photos: any[]) => {
    setViewingPhoto(url);
    setAllPhotos(photos);
    setCurrentPhotoIndex(photos.findIndex(p => p.photoUrl === url) || 0);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
      setViewingPhoto(allPhotos[currentPhotoIndex - 1].photoUrl);
    } else if (direction === 'next' && currentPhotoIndex < allPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
      setViewingPhoto(allPhotos[currentPhotoIndex + 1].photoUrl);
    }
  };

  // Función para abrir el diálogo de subida de fotos
  const openUploadDialog = (projectId: number) => {
    setUploadProjectId(projectId);
    setUploadStage("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowUploadDialog(true);
  };

  // Función para manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        toast.error("El archivo es muy grande. Máximo 12MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Función para subir la foto
  const handleUploadPhoto = async () => {
    if (!selectedFile || !uploadProjectId || !uploadStage) {
      toast.error("Selecciona una etapa y una foto");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convertir archivo a base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Subir imagen a S3
        const uploadResult = await uploadImage.mutateAsync({
          fileName: selectedFile.name,
          fileData: base64,
          contentType: selectedFile.type,
          projectId: uploadProjectId,
          stage: uploadStage as any,
        });

        // Registrar foto en el proyecto
        await uploadProjectPhoto.mutateAsync({
          projectId: uploadProjectId,
          stage: uploadStage as any,
          photoUrl: uploadResult.url,
          description: `Foto subida por operario - ${new Date().toLocaleDateString("es-CO")}`,
        });

        setShowUploadDialog(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadingPhoto(false);
        toast.success("¡Foto subida exitosamente!");
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      setUploadingPhoto(false);
      toast.error("Error al subir la foto");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header Simplificado */}
      <header className="border-b bg-[#162828]/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-light.png" alt="INNOVAR" style={{ height: 36, width: 36, objectFit: "contain", flexShrink: 0 }} />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-bold text-xs text-white" style={{ letterSpacing: "0.14em" }}>INNOVAR</span>
                <span className="text-[9px]" style={{ color: "rgba(106,207,199,0.55)" }}>Cocinas de Diseño</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-2 md:gap-4">
              <NotificationBell />
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Operario
                </Badge>
                <span className="font-medium text-white/85">{user?.name}</span>
              </div>
              <LogoutButton />
              <MobileNav />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Simplificado */}
      <section className="py-4 md:py-6">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Logo y Saludo */}
            <div className="flex justify-center mb-2">
              <img src="/logo-light.png" alt="INNOVAR Cocinas Integrales"
                style={{ height: 80, width: 80, objectFit: "contain" }} />
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-4 md:p-6 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="bg-[#162828]/20 p-3 rounded-xl">
                  <Package className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">¡Hola, {user?.name?.split(' ')[0]}!</h1>
                  <p className="text-white/80 text-sm">Panel de Operario - Tareas y Proyectos</p>
                </div>
              </div>
            </div>

            {/* Frase Motivacional Diaria */}
            <DailyMotivation userName={user?.name || undefined} userBirthDate={user?.birthDate ? new Date(user.birthDate) : undefined} />
          </div>
        </div>
      </section>

      {/* Resumen Rápido */}
      <section className="py-2 md:py-3">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                <CardContent className="p-4 text-center">
                  <ClipboardList className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{pendingTasks.length}</p>
                  <p className="text-xs text-white/80">Tareas</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-red-500 to-rose-500 text-white">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{urgentTasks.length}</p>
                  <p className="text-xs text-white/80">Urgentes</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <CardContent className="p-4 text-center">
                  <Play className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                  <p className="text-xs text-white/80">En Proceso</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Botón Ver Todos los Proyectos - Tarjeta Grande */}
            <div className="mt-4">
              <Link href="/projects">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[#162828]/10 opacity-0 hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#162828]/20 rounded-xl">
                        <Package className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Ver Todos los Proyectos</h3>
                        <p className="text-sm text-white/80">Accede a la lista completa de proyectos</p>
                      </div>
                    </div>
                    <div className="p-2 bg-[#162828]/20 rounded-full">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mis Tareas */}
      <section className="py-3 md:py-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Mis Tareas
            </h2>
            
            {loadingTasks ? (
              <div className="text-center py-8 text-muted-foreground">Cargando tareas...</div>
            ) : pendingTasks.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium text-gray-800">¡Sin tareas pendientes!</p>
                  <p className="text-sm text-muted-foreground">Todas tus tareas están completadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.media;
                  const status = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendiente;
                  
                  return (
                    <Card key={task.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{priority.emoji}</span>
                              <h3 className="font-semibold text-gray-800">{task.title}</h3>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={`${priority.color} text-white border-0 text-xs`}>
                                {priority.label}
                              </Badge>
                              <Badge variant="outline" className={`${status.color} text-white border-0 text-xs`}>
                                {status.label}
                              </Badge>
                              {task.dueDate && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {new Date(task.dueDate).toLocaleDateString("es-CO")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {task.status === "pendiente" && (
                              <Button
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600"
                                onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "en_progreso" })}
                                disabled={updateTaskStatus.isPending}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {task.status === "en_progreso" && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "completada" })}
                                disabled={updateTaskStatus.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Completar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Historial de Tareas Completadas */}
            {completedTasks.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="w-full justify-between text-muted-foreground hover:text-gray-800"
                >
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historial de Completadas ({completedTasks.length})
                  </span>
                  {showCompletedTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {showCompletedTasks && (
                  <div className="mt-3 space-y-2">
                    {completedTasks.map((task) => (
                      <Card key={task.id} className="border-0 shadow-sm bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white/85 line-clamp-1">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Completada el {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString("es-CO") : "N/A"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Proyectos del Día con Checklist */}
      <section className="py-3 md:py-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <OperatorDailyProjects />
          </div>
        </div>
      </section>

      {/* Proyectos con Fotos */}
      <section className="py-3 md:py-4 pb-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Proyectos en Producción
            </h2>
            
            {loadingProjects ? (
              <div className="text-center py-8 text-muted-foreground">Cargando proyectos...</div>
            ) : productionProjects.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-800">Sin proyectos en producción</p>
                  <p className="text-sm text-muted-foreground">No hay proyectos activos en este momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {productionProjects.map((project) => (
                  <ProjectPhotoCard 
                    key={project.id} 
                    project={project}
                    isExpanded={expandedProject === project.id}
                    onToggle={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    onViewPhoto={handleViewPhoto}
                    getStatusLabel={getStatusLabel}
                    onUploadPhoto={openUploadDialog}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal de Foto */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <img 
              src={viewingPhoto || ""} 
              alt="Foto del proyecto" 
              className="w-full h-auto max-h-[80vh] object-contain bg-black"
            />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigatePhoto('prev')}
                  disabled={currentPhotoIndex === 0}
                  className="bg-[#162828]/80"
                >
                  ← Anterior
                </Button>
                <span className="bg-[#162828]/80 px-3 py-1 rounded text-sm">
                  {currentPhotoIndex + 1} / {allPhotos.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigatePhoto('next')}
                  disabled={currentPhotoIndex === allPhotos.length - 1}
                  className="bg-[#162828]/80"
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Subida de Fotos */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Subir Foto al Proyecto
            </DialogTitle>
            <DialogDescription>
              Selecciona la etapa de producción y la foto que deseas subir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Selector de etapa */}
            <div className="space-y-2">
              <Label className="font-semibold">Etapa de Producción *</Label>
              <Select value={uploadStage} onValueChange={setUploadStage}>
                <SelectTrigger className={!uploadStage ? "border-red-300" : ""}>
                  <SelectValue placeholder="Selecciona una etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diseno">🎨 Renders y Diseños</SelectItem>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="enchape">Enchape</SelectItem>
                  <SelectItem value="ensamble">Ensamble / Armado</SelectItem>
                  <SelectItem value="final">Fotos Finales</SelectItem>
                </SelectContent>
              </Select>
              {!uploadStage && <p className="text-xs text-red-500">Selecciona una etapa para continuar</p>}
            </div>

            {/* Selector de archivo */}
            <div className="space-y-2">
              <Label className="font-semibold">Foto *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className={`w-full ${ !selectedFile ? "border-red-300" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Seleccionar foto"}
              </Button>
              {!selectedFile && <p className="text-xs text-red-500">Selecciona una foto para continuar</p>}
            </div>

            {/* Preview de la imagen */}
            {previewUrl && (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={uploadingPhoto}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPhoto}
              disabled={!selectedFile || !uploadStage || uploadingPhoto}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Foto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Flotante */}
      <a
        href="https://wa.me/573136802025"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-xl hover:bg-[#128C7E] transition-all duration-300 hover:scale-110 z-50"
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}

// Componente para mostrar proyecto con fotos
function ProjectPhotoCard({ 
  project, 
  isExpanded, 
  onToggle, 
  onViewPhoto,
  getStatusLabel,
  onUploadPhoto
}: { 
  project: any; 
  isExpanded: boolean;
  onToggle: () => void;
  onViewPhoto: (url: string, photos: any[]) => void;
  getStatusLabel: (status: string) => string;
  onUploadPhoto: (projectId: number) => void;
}) {
  const { data: projectDetail } = trpc.projects.getById.useQuery(
    { id: project.id },
    { enabled: isExpanded }
  );

  const photos = projectDetail?.photos || [];
  
  // Filtrar fotos de diseño (renders, despieces, modelado)
  const designPhotos = photos.filter((p: any) => 
    p.subcategory === "renders" || 
    p.subcategory === "despieces" || 
    p.subcategory === "modelado_3d" ||
    p.subcategory === "detalles" ||
    p.stage === "diseno"
  );
  
  // Filtrar fotos de medidas (fotos iniciales, dibujo)
  const medidasPhotos = photos.filter((p: any) => 
    p.subcategory === "fotos_iniciales" || 
    p.subcategory === "dibujo" ||
    p.category === "medidas" ||
    p.stage === "inicial"
  );
  
  const stagePhotos = {
    medidas: medidasPhotos,
    disenos: designPhotos,
    corte: photos.filter((p: any) => p.stage === "corte" || p.subcategory === "corte"),
    enchape: photos.filter((p: any) => p.stage === "enchape" || p.subcategory === "enchape"),
    armado: photos.filter((p: any) => p.stage === "armado" || p.subcategory === "armado"),
    instalacion: photos.filter((p: any) => p.stage === "instalacion" || p.subcategory === "proceso_instalacion"),
    fotos_finales: photos.filter((p: any) => p.stage === "fotos_finales" || p.subcategory === "fotos_finales"),
  };

  const stageLabels: Record<string, string> = {
    medidas: "📏 Medidas y Fotos Iniciales",
    disenos: "🎨 Renders y Diseños",
    corte: "Corte",
    enchape: "Enchape",
    armado: "Armado",
    instalacion: "Instalación",
    fotos_finales: "Fotos Finales",
  };

  const workTypeEmoji: Record<string, string> = {
    cocina: "🍳",
    closet: "👔",
    puertas: "🚪",
    centro_tv: "📺",
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-0">
        {/* Header del proyecto */}
        <div 
          className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{workTypeEmoji[project.workType] || "📦"}</span>
              <div>
                <h3 className="font-bold">{project.name}</h3>
                <p className="text-sm text-white/80">{project.client?.name || "Cliente"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-[#162828]/20 text-white border-white/30 text-xs">
                {getStatusLabel(project.status)}
              </Badge>
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* Contenido expandido */}
        {isExpanded && (
          <div className="p-4 bg-gray-50">
            {/* Info básica del proyecto */}
            {projectDetail?.client && (
              <div className="mb-4 p-3 bg-[#162828] rounded-lg">
                <p className="text-sm"><strong>Cliente:</strong> {projectDetail.client.name}</p>
                {projectDetail.client.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {projectDetail.client.address}
                  </p>
                )}
              </div>
            )}

            {/* Galería de fotos por etapa */}
            {photos.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay fotos registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(stagePhotos).map(([stage, stagePhotoList]) => {
                  // Mostrar siempre la sección de diseños/renders aunque esté vacía
                  if ((stagePhotoList as any[]).length === 0 && stage !== 'disenos') return null;
                  
                  return (
                    <div key={stage}>
                      <h4 className="text-sm font-semibold text-white/85 mb-2 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUploadPhoto(project.id);
                          }}
                          className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600 hover:text-blue-700 cursor-pointer"
                          title="Subir foto para esta etapa"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        {stageLabels[stage]} ({(stagePhotoList as any[]).length})
                      </h4>
                      {(stagePhotoList as any[]).length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-[rgba(106,207,199,0.18)]">
                          <Camera className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-white/45">Sin fotos de renders disponibles</p>
                        </div>
                      ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(stagePhotoList as any[]).slice(0, 8).map((photo: any) => (
                          <div 
                            key={photo.id}
                            className="relative group"
                            onClick={() => onViewPhoto(photo.photoUrl, photos)}
                          >
                            <LazyImage
                              src={photo.photoUrl}
                              alt={`Foto ${stage}`}
                              aspectRatio="square"
                              className="rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-lg">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botones de acción */}
            <div className="mt-4 pt-4 border-t flex flex-col gap-2">
              <Button 
                size="sm" 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadPhoto(project.id);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Foto de Producción
              </Button>
              <Link href="/projects">
                <Button variant="outline" size="sm" className="w-full">
                  Ver proyecto completo <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
