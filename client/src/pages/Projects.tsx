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
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Estados del proyecto con sus configuraciones
const PROJECT_STATUSES = {
  pendiente: { label: "Pendiente", color: "bg-gray-500", icon: Clock },
  aprobado_diseno: { label: "Aprobado para Diseño", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: Paintbrush },
  pendiente_cliente: { label: "Pendiente Aprobación", color: "bg-yellow-500", icon: AlertCircle },
  corte: { label: "En Corte", color: "bg-orange-500", icon: Hammer },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: Paintbrush },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: Package },
  listo_instalacion: { label: "Listo para Instalación", color: "bg-green-500", icon: Truck },
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
    photoUrl: "",
    description: "",
  });
  const [detailForm, setDetailForm] = useState({
    type: "nota_importante" as "medida_especial" | "nota_importante" | "foto_referencia",
    title: "",
    content: "",
    photoUrl: "",
  });

  const utils = trpc.useUtils();
  
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
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.getById.invalidate();
      toast.success("Estado actualizado");
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
      setPhotoForm({ stage: "", photoUrl: "", description: "" });
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

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      pendiente: "aprobado_diseno",
      aprobado_diseno: "en_diseno",
      en_diseno: "pendiente_cliente",
      corte: "enchape",
      enchape: "ensamble",
      ensamble: "listo_instalacion",
      listo_instalacion: "entregado",
    };
    return flow[currentStatus] || null;
  };

  const canAdvanceStatus = (status: string): boolean => {
    const role = user?.role;
    if (role === "super_admin" || role === "admin") return true;
    
    if (role === "disenador") {
      return ["aprobado_diseno", "en_diseno"].includes(status);
    }
    if (role === "jefe_taller") {
      return ["corte", "enchape", "ensamble", "listo_instalacion"].includes(status);
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
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">← Inicio</Button>
            </Link>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Link href="/admin">
                <Button variant="ghost">Panel Admin</Button>
              </Link>
            )}
            <img 
              src="/logo-light.png" 
              alt="INNOVAR" 
              className="h-10 w-auto"
            />
            <span className="text-sm text-muted-foreground">Gestión de Proyectos</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getRoleLabel(user?.role || "")}</Badge>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Header con filtros y botón crear */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              Proyectos
            </h1>
            <p className="text-muted-foreground">
              {user?.role === "disenador" && "Proyectos pendientes de diseño"}
              {(user?.role === "jefe_taller" || user?.role === "operario") && "Proyectos en producción"}
              {(user?.role === "admin" || user?.role === "super_admin") && "Todos los proyectos"}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Filtro por estado */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
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
              <DialogDescription>
                {WORK_TYPES[selectedProject?.workType as keyof typeof WORK_TYPES]} - {selectedProject?.client?.name}
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
                  {/* Botón para subir foto */}
                  {(user?.role === "admin" || user?.role === "super_admin" || 
                    user?.role === "disenador" || user?.role === "jefe_taller" || user?.role === "operario") && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => setShowPhotoDialog(true)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Subir Foto
                      </Button>
                    </div>
                  )}

                  {["inicial", "diseno", "corte", "enchape", "ensamble", "final"].map((stage) => {
                    const stagePhotos = projectDetail.photos?.filter((p: any) => p.stage === stage) || [];
                    const stageLabels: Record<string, string> = {
                      inicial: "Fotos Iniciales",
                      diseno: "Diseño",
                      corte: "Corte",
                      enchape: "Enchape",
                      ensamble: "Ensamble",
                      final: "Producto Final",
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
                              {stagePhotos.map((photo: any) => (
                                <div key={photo.id} className="relative group">
                                  <img
                                    src={photo.photoUrl}
                                    alt={photo.description || "Foto del proyecto"}
                                    className="w-full h-24 object-cover rounded cursor-pointer"
                                    onClick={() => window.open(photo.photoUrl, "_blank")}
                                  />
                                  {photo.description && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                      {photo.description}
                                    </div>
                                  )}
                                </div>
                              ))}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Foto</DialogTitle>
              <DialogDescription>
                Agrega una foto al proyecto: {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!photoForm.stage || !photoForm.photoUrl || !selectedProject) {
                toast.error("Por favor completa los campos requeridos");
                return;
              }
              uploadPhoto.mutate({
                projectId: selectedProject.id,
                stage: photoForm.stage,
                photoUrl: photoForm.photoUrl,
                description: photoForm.description || undefined,
              });
            }} className="space-y-4">
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
                <Label>URL de la Foto *</Label>
                <Input
                  value={photoForm.photoUrl}
                  onChange={(e) => setPhotoForm({ ...photoForm, photoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Sube la foto a un servicio de almacenamiento y pega la URL aquí
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={photoForm.description}
                  onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                  placeholder="Descripción de la foto..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPhotoDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploadPhoto.isPending}>
                  {uploadPhoto.isPending ? "Subiendo..." : "Subir Foto"}
                </Button>
              </div>
            </form>
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
    </div>
  );
}
