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
  Trash2,
  ArrowUpDown,
  Calendar,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  ArrowLeft
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RemindersPanel } from "@/components/RemindersPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("fecha_limite");
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
  
  // Estado para confirmación de recordatorio
  const [reminderConfirm, setReminderConfirm] = useState<{ open: boolean; taskId: number | null; taskTitle: string; assigneeName: string }>({
    open: false,
    taskId: null,
    taskTitle: "",
    assigneeName: ""
  });

  // Estado para reasignación masiva
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [taskPage, setTaskPage] = useState(1);
  const TASKS_PER_PAGE = 10;
  
  // Estado para diálogo de WhatsApp después de crear tarea o enviar recordatorio
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppLink, setWhatsAppLink] = useState<string | null>(null);
  const [assignedUserName, setAssignedUserName] = useState<string | null>(null);
  const [whatsAppDialogType, setWhatsAppDialogType] = useState<"tarea" | "recordatorio">("tarea");

  const utils = trpc.useUtils();
  
  // Verificar si el usuario puede ver todas las tareas
  const canViewAllTasks = ["admin", "super_admin", "comercial", "jefe_taller"].includes(user?.role || "");
  
  const { data: myTasksData, isLoading: loadingMyTasks } = trpc.tasks.listPaginated.useQuery({
    page: taskPage,
    limit: TASKS_PER_PAGE,
    assignedTo: user?.id
  });
  const myTasks = myTasksData?.data || [];
  const { data: allTasksData, isLoading: loadingAllTasks } = trpc.tasks.listPaginated.useQuery(
    { page: taskPage, limit: TASKS_PER_PAGE },
    { enabled: canViewAllTasks }
  );
  const allTasks = allTasksData?.data || [];
  const { data: assignableUsers = [] } = trpc.tasks.getAssignableUsers.useQuery();
  const { data: projects = [] } = trpc.projects.list.useQuery();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: (result) => {
      utils.tasks.getMyTasks.invalidate();
      utils.tasks.listPaginated.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      toast.success("Tarea creada exitosamente");
      setShowCreateDialog(false);
      setCreateForm({ title: "", description: "", priority: "media", assignedTo: "", projectId: "", dueDate: "" });
      
      // Mostrar diálogo de WhatsApp si hay enlace disponible
      if (result.whatsAppLink) {
        setWhatsAppLink(result.whatsAppLink);
        setAssignedUserName(result.assignedUserName);
        setWhatsAppDialogType("tarea");
        setShowWhatsAppDialog(true);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear tarea");
    },
  });

  const updateTaskStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      utils.tasks.listPaginated.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const sendReminder = trpc.tasks.sendReminder.useMutation({
    onSuccess: (result) => {
      toast.success("Recordatorio enviado correctamente");
      setReminderConfirm({ open: false, taskId: null, taskTitle: "", assigneeName: "" });
      
      // Mostrar diálogo de WhatsApp si hay enlace disponible
      if (result.whatsAppLink) {
        setWhatsAppLink(result.whatsAppLink);
        setAssignedUserName(result.assignedUserName);
        setWhatsAppDialogType("recordatorio");
        setShowWhatsAppDialog(true);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar recordatorio");
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.getMyTasks.invalidate();
      utils.tasks.listPaginated.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      toast.success("Tarea eliminada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar tarea");
    },
  });

  const bulkReassign = trpc.tasks.bulkReassign.useMutation({
    onSuccess: (result) => {
      utils.tasks.getMyTasks.invalidate();
      utils.tasks.listPaginated.invalidate();
      if (canViewAllTasks) {
        utils.tasks.list.invalidate();
      }
      if (result.reassignedCount === result.totalRequested) {
        toast.success(`${result.reassignedCount} ${result.reassignedCount === 1 ? 'tarea reasignada' : 'tareas reasignadas'} a ${result.newAssigneeName}`);
      } else {
        toast.warning(`${result.reassignedCount} de ${result.totalRequested} tareas reasignadas a ${result.newAssigneeName}`);
        if (result.errors) {
          result.errors.forEach(err => toast.error(err));
        }
      }
      setSelectedTasks([]);
      setShowReassignDialog(false);
      setReassignTo("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reasignar tareas");
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

    // Filtrar solo las tareas que el usuario puede eliminar
    const deletableTasks = selectedTasks.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && canDeleteTask(task);
    });

    if (deletableTasks.length === 0) {
      toast.error("No tienes permisos para eliminar las tareas seleccionadas");
      return;
    }

    const skippedCount = count - deletableTasks.length;
    let confirmMessage = `¿Estás seguro de eliminar ${deletableTasks.length} ${deletableTasks.length === 1 ? 'tarea' : 'tareas'}?`;
    if (skippedCount > 0) {
      confirmMessage += `\n\n(${skippedCount} ${skippedCount === 1 ? 'tarea no puede ser eliminada' : 'tareas no pueden ser eliminadas'} por falta de permisos)`;
    }

    if (confirm(confirmMessage)) {
      // Eliminar cada tarea individualmente
      deletableTasks.forEach(id => {
        deleteTask.mutate({ id });
      });
      
      // Limpiar selección
      setSelectedTasks([]);
    }
  };

  const handleBulkReassign = () => {
    if (selectedTasks.length === 0 || !reassignTo) return;
    
    bulkReassign.mutate({
      taskIds: selectedTasks,
      newAssignedTo: parseInt(reassignTo),
    });
  };

  // Verificar si el usuario puede reasignar tareas
  const canReassignTasks = ["super_admin", "admin", "comercial", "jefe_taller"].includes(user?.role || "");

  // Verificar si el usuario puede eliminar una tarea específica
  const canDeleteTask = (task: any) => {
    const isAdmin = user?.role === "admin" || user?.role === "super_admin";
    const isCreator = task.assignedBy === user?.id;
    const isJefeTaller = user?.role === "jefe_taller";
    
    // Admin y super_admin pueden eliminar cualquier tarea
    if (isAdmin) return true;
    
    // Solo el creador puede eliminar
    if (!isCreator) return false;
    
    // Jefe de taller solo puede eliminar tareas completadas
    if (isJefeTaller && task.status !== "completada") return false;
    
    return true;
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

  // Filtrar y ordenar tareas
  const getFilteredTasks = (tasks: any[]) => {
    let filtered = tasks;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((t: any) => t.status === statusFilter);
    }
    
    if (userFilter !== "all") {
      filtered = filtered.filter((t: any) => t.assignedTo === parseInt(userFilter));
    }
    
    // Filtro por fecha de vencimiento
    if (dueDateFilter !== "all") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const in3Days = new Date(now);
      in3Days.setDate(in3Days.getDate() + 3);
      
      filtered = filtered.filter((t: any) => {
        if (!t.dueDate) return false; // Sin fecha límite no aplica
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        switch (dueDateFilter) {
          case "vencidas":
            // Tareas vencidas (fecha límite ya pasó)
            return dueDate < now && t.status !== "completada";
          case "hoy":
            // Vencen hoy
            return dueDate.getTime() === now.getTime() && t.status !== "completada";
          case "proximas":
            // Vencen en los próximos 3 días (incluyendo hoy)
            return dueDate >= now && dueDate <= in3Days && t.status !== "completada";
          case "urgentes":
            // Vencidas o vencen hoy
            return dueDate <= now && t.status !== "completada";
          default:
            return true;
        }
      });
    }
    
    // Ordenar según la opción seleccionada
    const priorityOrder = { alta: 1, media: 2, baja: 3 };
    
    switch (sortOrder) {
      case "fecha_limite":
        filtered = [...filtered].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case "prioridad":
        filtered = [...filtered].sort((a, b) => {
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
        });
        break;
      case "recientes":
        filtered = [...filtered].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      case "antiguas":
        filtered = [...filtered].sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;
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
              {/* Historial de recordatorios */}
              {task.reminderCount > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-amber-200">
                  <p className="flex items-center gap-1 text-amber-600">
                    <Bell className="h-3 w-3" />
                    <strong>Recordatorios enviados:</strong> {task.reminderCount}
                  </p>
                  {task.lastReminderSentAt && (
                    <p className="text-amber-500">
                      <strong>Último:</strong> {new Date(task.lastReminderSentAt).toLocaleString("es-CO", { 
                        dateStyle: "short", 
                        timeStyle: "short" 
                      })}
                      {task.lastReminderSentByUser && ` por ${task.lastReminderSentByUser.name}`}
                    </p>
                  )}
                </div>
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
            {/* Botón de recordatorio - solo para tareas no completadas y si el usuario puede enviar */}
            {task.status !== "completada" && (task.assignedBy === user?.id || user?.role === "admin" || user?.role === "super_admin") && (
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={() => setReminderConfirm({
                  open: true,
                  taskId: task.id,
                  taskTitle: task.title,
                  assigneeName: task.assignedToUser?.name || "el usuario asignado"
                })}
                disabled={sendReminder.isPending}
              >
                <Bell className="h-4 w-4 mr-1" />
                Recordar
              </Button>
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
            <div className="flex items-center gap-2">
              {canReassignTasks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReassignDialog(true)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Reasignar ({selectedTasks.length})
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkDelete(tasks)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar ({selectedTasks.length})
              </Button>
            </div>
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

      {/* Filtro por vencimiento */}
      <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
        <SelectTrigger className={`w-[160px] ${dueDateFilter !== 'all' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}`}>
          <Clock className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Vencimiento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las fechas</SelectItem>
          <SelectItem value="urgentes">
            <span className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Urgentes (vencidas/hoy)
            </span>
          </SelectItem>
          <SelectItem value="vencidas">
            <span className="flex items-center gap-2 text-red-500">
              Vencidas
            </span>
          </SelectItem>
          <SelectItem value="hoy">
            <span className="flex items-center gap-2 text-amber-600">
              Vencen hoy
            </span>
          </SelectItem>
          <SelectItem value="proximas">
            <span className="flex items-center gap-2 text-yellow-600">
              Próximas (3 días)
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Selector de ordenamiento */}
      <Select value={sortOrder} onValueChange={setSortOrder}>
        <SelectTrigger className="w-[160px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fecha_limite">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha límite
            </span>
          </SelectItem>
          <SelectItem value="prioridad">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Prioridad
            </span>
          </SelectItem>
          <SelectItem value="recientes">
            <span className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Más recientes
            </span>
          </SelectItem>
          <SelectItem value="antiguas">
            <span className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              Más antiguas
            </span>
          </SelectItem>
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
      {/* AlertDialog de confirmación para enviar recordatorio */}
      <AlertDialog open={reminderConfirm.open} onOpenChange={(open) => setReminderConfirm({ ...reminderConfirm, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Enviar Recordatorio
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas enviar un recordatorio a <strong>{reminderConfirm.assigneeName}</strong> sobre la tarea:
              <br />
              <span className="font-medium text-foreground">"{reminderConfirm.taskTitle}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (reminderConfirm.taskId) {
                  sendReminder.mutate({ taskId: reminderConfirm.taskId });
                }
                setReminderConfirm({ open: false, taskId: null, taskTitle: "", assigneeName: "" });
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Sí, enviar recordatorio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de reasignación masiva */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Reasignar Tareas
            </DialogTitle>
            <DialogDescription>
              Selecciona el usuario al que deseas reasignar las {selectedTasks.length} {selectedTasks.length === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reassign-user">Asignar a</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger id="reassign-user">
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{u.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {getRoleLabel(u.role)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Las tareas completadas no serán reasignadas. El nuevo asignado recibirá una notificación por cada tarea.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignDialog(false);
                setReassignTo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkReassign}
              disabled={!reassignTo || bulkReassign.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkReassign.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Reasignando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Reasignar {selectedTasks.length} {selectedTasks.length === 1 ? 'tarea' : 'tareas'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

              {/* Botón atrás */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="w-fit gap-2 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>

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

      {/* Diálogo WhatsApp para notificar al usuario asignado */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {whatsAppDialogType === "recordatorio" ? "Enviar Recordatorio por WhatsApp" : "Notificar por WhatsApp"}
            </DialogTitle>
            <DialogDescription>
              {whatsAppDialogType === "recordatorio" 
                ? `El recordatorio fue enviado exitosamente${assignedUserName ? ` a ${assignedUserName}` : ''}. ¿Deseas enviarle también un mensaje por WhatsApp?`
                : `La tarea fue creada exitosamente y se envió una notificación interna${assignedUserName ? ` a ${assignedUserName}` : ''}. ¿Deseas enviarle también un mensaje por WhatsApp?`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowWhatsAppDialog(false);
                setWhatsAppLink(null);
                setAssignedUserName(null);
              }}
            >
              No, solo notificación
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (whatsAppLink) {
                  window.open(whatsAppLink, "_blank");
                }
                setShowWhatsAppDialog(false);
                setWhatsAppLink(null);
                setAssignedUserName(null);
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
