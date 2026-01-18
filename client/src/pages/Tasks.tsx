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
  Bell,
  Users,
  Eye,
  Trash2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RemindersPanel } from "@/components/RemindersPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [userFilter, setUserFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("mis-tareas");
  
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "media" as "alta" | "media" | "baja",
    assignedTo: "",
    projectId: "",
    dueDate: "",
  });
  
  // Estados para selección múltiple
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  const utils = trpc.useUtils();
  
  // Verificar si el usuario puede ver todas las tareas
  const canViewAllTasks = ["admin", "super_admin", "comercial", "jefe_taller"].includes(user?.role || "");
  
  const { data: myTasks = [], isLoading: loadingMyTasks } = trpc.tasks.getMyTasks.useQuery();
  const { data: allTasks = [], isLoading: loadingAllTasks } = trpc.tasks.list.useQuery(undefined, {
    enabled: canViewAllTasks,
  });
  const { data: assignableUsers = [] } = trpc.tasks.getAssignableUsers.useQuery();
  const { data: projects = [] } = trpc.projects.list.useQuery();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
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
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      toast.success("Tarea eliminada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar tarea");
    },
  });

  // Funciones para selección múltiple
  const toggleSelectTask = (id: number) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTasks = (tasks: any[]) => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleBulkDelete = (tasks: any[]) => {
    const count = selectedTasks.length;
    if (count === 0) return;

    if (confirm(`¿Estás seguro de eliminar ${count} ${count === 1 ? 'tarea' : 'tareas'}?`)) {
      // Eliminar cada tarea individualmente
      selectedTasks.forEach(id => {
        deleteTask.mutate({ id });
      });
      
      // Limpiar selección
      setSelectedTasks([]);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  // Verificar permisos
  const allowedRoles = ["admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario"];
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

  // Filtrar tareas según el tab activo
  const getFilteredTasks = (tasks: any[]) => {
    let filtered = tasks;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((t: any) => t.status === statusFilter);
    }
    
    if (userFilter !== "all") {
      filtered = filtered.filter((t: any) => t.assignedTo === parseInt(userFilter));
    }
    
    return filtered;
  };

  const filteredMyTasks = getFilteredTasks(myTasks);
  const filteredAllTasks = getFilteredTasks(allTasks);

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
      comercial: "Comercial",
      disenador: "Diseñador",
      jefe_taller: "Jefe de Taller",
      operario: "Operario",
      user: "Cliente",
    };
    return labels[role] || role;
  };

  // Estadísticas para mis tareas
  const myPendingCount = myTasks.filter((t: any) => t.status === "pendiente").length;
  const myInProgressCount = myTasks.filter((t: any) => t.status === "en_progreso").length;
  const myCompletedCount = myTasks.filter((t: any) => t.status === "completada").length;

  // Estadísticas para todas las tareas (supervisión)
  const allPendingCount = allTasks.filter((t: any) => t.status === "pendiente").length;
  const allInProgressCount = allTasks.filter((t: any) => t.status === "en_progreso").length;
  const allCompletedCount = allTasks.filter((t: any) => t.status === "completada").length;

  // Obtener usuarios únicos de las tareas para el filtro
  const uniqueUsers = canViewAllTasks 
    ? Array.from(new Map(allTasks.map((t: any) => [t.assignedTo, t.assignedToUser])).values()).filter(Boolean)
    : [];

  // Estadísticas por usuario
  const getUserStats = () => {
    const stats: Record<number, { name: string; role: string; pending: number; inProgress: number; completed: number }> = {};
    
    allTasks.forEach((t: any) => {
      if (!stats[t.assignedTo]) {
        stats[t.assignedTo] = {
          name: t.assignedToUser?.name || "Sin asignar",
          role: t.assignedToUser?.role || "",
          pending: 0,
          inProgress: 0,
          completed: 0,
        };
      }
      
      if (t.status === "pendiente") stats[t.assignedTo].pending++;
      else if (t.status === "en_progreso") stats[t.assignedTo].inProgress++;
      else if (t.status === "completada") stats[t.assignedTo].completed++;
    });
    
    return Object.entries(stats).map(([id, data]) => ({ id: parseInt(id), ...data }));
  };

  const renderTaskCard = (task: any, showAssignedTo: boolean = false) => (
    <Card key={task.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox individual */}
          <Checkbox
            checked={selectedTasks.includes(task.id)}
            onCheckedChange={() => toggleSelectTask(task.id)}
            className="mt-1"
          />
          
          <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4">
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
              {showAssignedTo && task.assignedToUser && (
                <p className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <strong>Asignada a:</strong> {task.assignedToUser.name} ({getRoleLabel(task.assignedToUser.role)})
                </p>
              )}
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
        </div>
      </CardContent>
    </Card>
  );

  const renderTaskList = (tasks: any[], isLoading: boolean, showAssignedTo: boolean = false) => {
    if (isLoading) {
      return <div className="text-center py-8">Cargando tareas...</div>;
    }
    
    if (tasks.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === "all" && userFilter === "all" 
                ? "No hay tareas" 
                : "No hay tareas con los filtros seleccionados"}
            </p>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Controles de selección múltiple */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedTasks.length === tasks.length && tasks.length > 0}
              onCheckedChange={() => toggleSelectAllTasks(tasks)}
            />
            <span className="text-sm font-medium">
              Seleccionar todas ({tasks.length})
            </span>
          </div>
          {selectedTasks.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkDelete(tasks)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar ({selectedTasks.length})
            </Button>
          )}
        </div>
        
        <div className="grid gap-4">
          {tasks.map((task: any) => renderTaskCard(task, showAssignedTo))}
        </div>
      </div>
    );
  };

  const renderFilters = (showUserFilter: boolean = false) => (
    <div className="flex flex-wrap gap-2">
      {/* Filtro por estado */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="pendiente">Pendientes</SelectItem>
          <SelectItem value="en_progreso">En Progreso</SelectItem>
          <SelectItem value="completada">Completadas</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro por usuario (solo en vista de supervisión) */}
      {showUserFilter && uniqueUsers.length > 0 && (
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usuarios</SelectItem>
            {uniqueUsers.map((u: any) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
                    value={createForm.projectId || "none"} 
                    onValueChange={(v) => setCreateForm({ ...createForm, projectId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
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
  );

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
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="hidden lg:inline text-sm text-muted-foreground">Tareas</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <NotificationBell />
            <Badge variant="outline" className="text-xs md:text-sm">{getRoleLabel(user?.role || "")}</Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[100px]">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Panel de Recordatorios */}
        {user && (
          <div className="mb-4 md:mb-6">
            <RemindersPanel userId={user.id} userRole={user.role} compact />
          </div>
        )}

        {/* Tabs para usuarios con permisos de supervisión */}
        {canViewAllTasks ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="mis-tareas" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Mis Tareas
              </TabsTrigger>
              <TabsTrigger value="supervision" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Supervisión
              </TabsTrigger>
            </TabsList>

            {/* Tab: Mis Tareas */}
            <TabsContent value="mis-tareas" className="space-y-4">
              {/* Stats de mis tareas */}
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("pendiente")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myPendingCount}</div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("en_progreso")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                    <Play className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myInProgressCount}</div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("completada")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myCompletedCount}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Header con filtros */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ListTodo className="h-6 w-6" />
                    Mis Tareas
                  </h1>
                  <p className="text-muted-foreground">
                    Tareas asignadas a ti
                  </p>
                </div>
                {renderFilters(false)}
              </div>

              {/* Lista de mis tareas */}
              {renderTaskList(filteredMyTasks, loadingMyTasks, false)}
            </TabsContent>

            {/* Tab: Supervisión */}
            <TabsContent value="supervision" className="space-y-4">
              {/* Stats globales */}
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("pendiente")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{allPendingCount}</div>
                    <p className="text-xs text-muted-foreground">Total del equipo</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("en_progreso")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                    <Play className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{allInProgressCount}</div>
                    <p className="text-xs text-muted-foreground">Total del equipo</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("completada")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{allCompletedCount}</div>
                    <p className="text-xs text-muted-foreground">Total del equipo</p>
                  </CardContent>
                </Card>
              </div>

              {/* Resumen por usuario */}
              {getUserStats().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Resumen por Usuario
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {getUserStats().map((stat) => (
                        <div 
                          key={stat.id} 
                          className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => setUserFilter(stat.id.toString())}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{stat.name}</p>
                              <p className="text-xs text-muted-foreground">{getRoleLabel(stat.role)}</p>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline" className="bg-gray-100">
                              <Clock className="h-3 w-3 mr-1" />
                              {stat.pending}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-100 text-blue-700">
                              <Play className="h-3 w-3 mr-1" />
                              {stat.inProgress}
                            </Badge>
                            <Badge variant="outline" className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {stat.completed}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Header con filtros */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Todas las Tareas
                  </h1>
                  <p className="text-muted-foreground">
                    Vista de supervisión del equipo
                  </p>
                </div>
                {renderFilters(true)}
              </div>

              {/* Lista de todas las tareas */}
              {renderTaskList(filteredAllTasks, loadingAllTasks, true)}
            </TabsContent>
          </Tabs>
        ) : (
          /* Vista normal para usuarios sin permisos de supervisión */
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
              <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("pendiente")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myPendingCount}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("en_progreso")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                  <Play className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myInProgressCount}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("completada")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myCompletedCount}</div>
                </CardContent>
              </Card>
            </div>

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
              {renderFilters(false)}
            </div>

            {/* Lista de tareas */}
            {renderTaskList(filteredMyTasks, loadingMyTasks, false)}
          </>
        )}
      </div>
    </div>
  );
}
