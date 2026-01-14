import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  ListTodo, 
  Plus, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Play,
  User,
  Bell
} from "lucide-react";
import { RemindersPanel } from "@/components/RemindersPanel";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITY_CONFIG = {
  alta: { label: "Alta", color: "bg-red-500", icon: AlertTriangle },
  media: { label: "Media", color: "bg-yellow-500", icon: Clock },
  baja: { label: "Baja", color: "bg-green-500", icon: CheckCircle2 },
};

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "bg-gray-500" },
  en_progreso: { label: "En Progreso", color: "bg-blue-500" },
  completada: { label: "Completada", color: "bg-green-500" },
};

export default function Tasks() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "media" as "alta" | "media" | "baja",
    assignedTo: "",
    projectId: "",
    dueDate: "",
  });

  const utils = trpc.useUtils();
  
  const { data: myTasks = [], isLoading: loadingTasks } = trpc.tasks.getMyTasks.useQuery();
  const { data: assignableUsers = [] } = trpc.tasks.getAssignableUsers.useQuery();
  const { data: projects = [] } = trpc.projects.list.useQuery();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      toast.success("Tarea creada exitosamente");
      setShowCreateDialog(false);
      setCreateForm({ title: "", description: "", priority: "media", assignedTo: "", projectId: "", dueDate: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear tarea");
    },
  });

  const updateTaskStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  // Verificar permisos
  const allowedRoles = ["admin", "super_admin", "disenador", "jefe_taller", "operario"];
  if (!isAuthenticated || !allowedRoles.includes(user?.role || "")) {
    setLocation("/");
    return null;
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.assignedTo) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    await createTask.mutateAsync({
      title: createForm.title,
      description: createForm.description || undefined,
      priority: createForm.priority,
      assignedTo: parseInt(createForm.assignedTo),
      projectId: createForm.projectId ? parseInt(createForm.projectId) : undefined,
      dueDate: createForm.dueDate ? new Date(createForm.dueDate) : undefined,
    });
  };

  const filteredTasks = statusFilter === "all" 
    ? myTasks 
    : myTasks.filter((t: any) => t.status === statusFilter);

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    if (!config) return <Badge>{priority}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return <Badge>{status}</Badge>;
    
    return (
      <Badge className={`${config.color} text-white`}>
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

  const pendingCount = myTasks.filter((t: any) => t.status === "pendiente").length;
  const inProgressCount = myTasks.filter((t: any) => t.status === "en_progreso").length;
  const completedCount = myTasks.filter((t: any) => t.status === "completada").length;

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
            <Link href="/projects" className="hidden md:block">
              <Button variant="ghost" size="sm">Proyectos</Button>
            </Link>
            <img 
              src="/logo-light.png" 
              alt="INNOVAR" 
              className="h-8 md:h-10 w-auto"
            />
            <span className="hidden lg:inline text-sm text-muted-foreground">Mis Tareas</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Badge variant="outline" className="text-xs md:text-sm">{getRoleLabel(user?.role || "")}</Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[100px]">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("pendiente")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("en_progreso")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Play className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("completada")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Recordatorios */}
        {user && (
          <div className="mb-4 md:mb-6">
            <RemindersPanel userId={user.id} userRole={user.role} compact />
          </div>
        )}

        {/* Header con filtros y botón crear */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodo className="h-6 w-6" />
              Mis Tareas
            </h1>
            <p className="text-muted-foreground">
              Gestiona tus tareas asignadas
            </p>
          </div>

          <div className="flex gap-2">
            {/* Filtro por estado */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completada">Completadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón crear tarea */}
            {assignableUsers.length > 0 && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Tarea</DialogTitle>
                    <DialogDescription>
                      Asigna una tarea a un miembro del equipo
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        placeholder="Describe la tarea..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        placeholder="Detalles adicionales..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Asignar a *</Label>
                        <Select 
                          value={createForm.assignedTo} 
                          onValueChange={(v) => setCreateForm({ ...createForm, assignedTo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableUsers.map((u: any) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.name} ({getRoleLabel(u.role)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select 
                          value={createForm.priority} 
                          onValueChange={(v: any) => setCreateForm({ ...createForm, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Proyecto (opcional)</Label>
                        <Select 
                          value={createForm.projectId} 
                          onValueChange={(v) => setCreateForm({ ...createForm, projectId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin proyecto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin proyecto</SelectItem>
                            {projects.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha límite</Label>
                        <Input
                          type="date"
                          value={createForm.dueDate}
                          onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createTask.isPending}>
                        {createTask.isPending ? "Creando..." : "Crear Tarea"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Lista de tareas */}
        {loadingTasks ? (
          <div className="text-center py-8">Cargando tareas...</div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === "all" ? "No tienes tareas asignadas" : `No hay tareas ${STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label.toLowerCase()}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task: any) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Info de la tarea */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{task.title}</h3>
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground space-y-1">
                        {task.project && (
                          <p><strong>Proyecto:</strong> {task.project.name}</p>
                        )}
                        <p>
                          <strong>Asignada por:</strong> {task.assignedByUser?.name || "N/A"}
                        </p>
                        {task.dueDate && (
                          <p>
                            <strong>Fecha límite:</strong> {new Date(task.dueDate).toLocaleDateString("es-CO")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-2">
                      {task.status === "pendiente" && (
                        <Button
                          size="sm"
                          variant="outline"
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
                          onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "completada" })}
                          disabled={updateTaskStatus.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Completar
                        </Button>
                      )}
                      {task.status === "completada" && (
                        <Badge variant="outline" className="justify-center">
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                          Completada
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
