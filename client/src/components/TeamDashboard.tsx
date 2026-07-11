import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
import {
  Palette,
  ClipboardList,
  Calendar,
  CalendarCheck,
  Users,
  FileText,
  Wrench,
  Package,
  Truck,
  Clock,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  Briefcase,
  Target,
  TrendingUp,
  Settings,
  LayoutDashboard,
  DollarSign,
  UserCheck,
  LogOut,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DesignerChecklist } from "@/components/DesignerChecklist";
import { ProductionCalendar } from "@/components/ProductionCalendar";
import { OperatorDailyProjects } from "@/components/OperatorDailyProjects";
import { DailyMotivation } from "@/components/DailyMotivation";

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
      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
      <span className="ml-1 hidden xl:inline">Salir</span>
    </Button>
  );
}

// Configuración por rol
const roleConfig: Record<string, {
  title: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  icon: React.ReactNode;
}> = {
  disenador: {
    title: "Portal del Diseñador",
    subtitle: "Crea diseños que transforman hogares",
    color: "from-purple-500 to-indigo-600",
    bgGradient: "bg-gradient-to-br from-purple-950/30 via-transparent to-indigo-950/30",
    icon: <Palette className="h-8 w-8" />,
  },
  comercial: {
    title: "Portal Comercial",
    subtitle: "Conecta clientes con sus sueños",
    color: "from-pink-500 to-rose-600",
    bgGradient: "bg-gradient-to-br from-pink-950/30 via-transparent to-rose-950/30",
    icon: <Briefcase className="h-8 w-8" />,
  },
  jefe_taller: {
    title: "Portal Jefe de Taller",
    subtitle: "Lidera la producción con excelencia",
    color: "from-orange-500 to-amber-600",
    bgGradient: "bg-gradient-to-br from-orange-950/30 via-transparent to-amber-950/30",
    icon: <Wrench className="h-8 w-8" />,
  },
  operario: {
    title: "Portal del Operario",
    subtitle: "Construye calidad en cada detalle",
    color: "from-blue-500 to-cyan-600",
    bgGradient: "bg-gradient-to-br from-blue-950/30 via-transparent to-cyan-950/30",
    icon: <Package className="h-8 w-8" />,
  },
  admin: {
    title: "Panel Administrativo",
    subtitle: "Gestiona clientes, citas y cotizaciones",
    color: "from-teal-500 to-emerald-600",
    bgGradient: "bg-gradient-to-br from-teal-950/30 via-transparent to-emerald-950/30",
    icon: <LayoutDashboard className="h-8 w-8" />,
  },
  super_admin: {
    title: "Panel CEO",
    subtitle: "Control total del negocio",
    color: "from-gray-700 to-slate-900",
    bgGradient: "bg-gradient-to-br from-slate-950/30 via-transparent to-gray-900/30",
    icon: <Settings className="h-8 w-8" />,
  },
  medidor: {
    title: "Portal del Medidor",
    subtitle: "Precisión en cada visita",
    color: "from-amber-500 to-yellow-600",
    bgGradient: "bg-gradient-to-br from-amber-950/30 via-transparent to-yellow-950/30",
    icon: <MapPin className="h-8 w-8" />,
  },
  contador: {
    title: "Portal del Contador",
    subtitle: "Orden y control financiero",
    color: "from-violet-500 to-fuchsia-600",
    bgGradient: "bg-gradient-to-br from-violet-950/30 via-transparent to-fuchsia-950/30",
    icon: <BookOpen className="h-8 w-8" />,
  },
};

export function TeamDashboard() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const config = roleConfig[role] || roleConfig.admin;

  // Queries para obtener datos
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const { data: tasks = [] } = trpc.tasks.list.useQuery(undefined, {
    enabled: ["admin", "super_admin", "comercial", "jefe_taller", "disenador", "medidor", "contador"].includes(role),
  });
  const { data: appointments = [] } = trpc.appointments.list.useQuery(undefined, {
    enabled: ["comercial", "admin", "super_admin", "medidor"].includes(role),
  });
  const { data: quotations = [] } = trpc.quotations.list.useQuery(undefined, {
    enabled: ["comercial", "admin", "super_admin"].includes(role),
  });
  const { data: myVisits = [] } = trpc.technicalVisits.list.useQuery(undefined, {
    enabled: role === "medidor",
  });

  // Filtrar datos según el rol
  const getProjectsForRole = () => {
    switch (role) {
      case "disenador":
        return projects.filter(p => 
          ["adelanto_recibido", "en_diseno", "pendiente_modelado", "pendiente_render", "pendiente_render", "aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion", "entregado"].includes(p.status)
        );
      case "jefe_taller":
      case "operario":
        return projects.filter(p => 
          ["aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion"].includes(p.status)
        );
      case "comercial":
      case "admin":
        return projects.filter(p => 
          ["cotizacion_enviada", "cotizacion_aprobada", "adelanto_recibido"].includes(p.status)
        );
      default:
        return projects;
    }
  };

  const getTasksForRole = () => {
    return tasks.filter(t => 
      t.assignedTo === user?.id && t.status !== "completada"
    );
  };

  const myProjects = getProjectsForRole();
  const myTasks = getTasksForRole();
  const pendingAppointments = appointments.filter(a => a.status === "pendiente" || a.status === "confirmada");
  const draftQuotations = quotations.filter(q => q.status === "draft");
  const sentQuotations = quotations.filter(q => q.status === "sent");

  // Citas programadas para hoy (comparación por fecha local)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayAppointments = appointments.filter(a => {
    if (!a.scheduledDate) return false;
    const d = new Date(a.scheduledDate);
    return d >= todayStart && d <= todayEnd;
  });

  // Estadísticas por rol
  const getStats = () => {
    switch (role) {
      case "disenador": {
        const cambiosPendientes = myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).length;
        return [
          { 
            label: "En Diseño", 
            value: myProjects.filter(p => p.status === "en_diseno").length,
            icon: <Palette className="h-6 w-6" />,
            color: "bg-gradient-to-br from-purple-500 to-purple-600",
            link: "/projects"
          },
          { 
            label: "🔄 Cambios Pendientes", 
            value: cambiosPendientes,
            icon: <AlertTriangle className="h-6 w-6" />,
            color: "bg-gradient-to-br from-orange-500 to-red-500",
            link: "/projects",
            highlight: cambiosPendientes > 0
          },
          { 
            label: "Mis Tareas", 
            value: myTasks.length,
            icon: <ClipboardList className="h-6 w-6" />,
            color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
            link: "/tasks"
          },
          {
            label: "✨ Nuevos para Diseñar",
            value: myProjects.filter(p => p.status === "adelanto_recibido").length,
            icon: <Target className="h-6 w-6" />,
            color: "bg-gradient-to-br from-green-500 to-emerald-500",
            link: "/projects",
            highlight: myProjects.filter(p => p.status === "adelanto_recibido").length > 0
          },
        ];
      }
      case "comercial":
        return [
          { 
            label: "Citas Pendientes", 
            value: pendingAppointments.length,
            icon: <Calendar className="h-6 w-6" />,
            color: "bg-gradient-to-br from-pink-500 to-rose-500",
            link: "/appointments-calendar"
          },
          { 
            label: "Cotizaciones Borrador", 
            value: draftQuotations.length,
            icon: <FileText className="h-6 w-6" />,
            color: "bg-gradient-to-br from-rose-500 to-pink-500",
            link: "/quotations"
          },
          { 
            label: "Esperando Respuesta", 
            value: sentQuotations.length,
            icon: <Clock className="h-6 w-6" />,
            color: "bg-gradient-to-br from-fuchsia-500 to-purple-500",
            link: "/quotations"
          },
          { 
            label: "Mis Tareas", 
            value: myTasks.length,
            icon: <ClipboardList className="h-6 w-6" />,
            color: "bg-gradient-to-br from-purple-500 to-fuchsia-500",
            link: "/tasks"
          },
        ];
      case "admin":
        return [
          { 
            label: "Citas Pendientes", 
            value: pendingAppointments.length,
            icon: <Calendar className="h-6 w-6" />,
            color: "bg-gradient-to-br from-emerald-500 to-teal-500",
            link: "/appointments-calendar"
          },
          { 
            label: "Cotizaciones Borrador", 
            value: draftQuotations.length,
            icon: <FileText className="h-6 w-6" />,
            color: "bg-gradient-to-br from-teal-500 to-cyan-500",
            link: "/quotations"
          },
          { 
            label: "Esperando Respuesta", 
            value: sentQuotations.length,
            icon: <Clock className="h-6 w-6" />,
            color: "bg-gradient-to-br from-yellow-500 to-amber-500",
            link: "/quotations"
          },
          { 
            label: "Mis Tareas", 
            value: myTasks.length,
            icon: <ClipboardList className="h-6 w-6" />,
            color: "bg-gradient-to-br from-blue-500 to-indigo-500",
            link: "/tasks"
          },
        ];
      case "jefe_taller": {
        // Contar proyectos atrasados (más de 5 días en la misma etapa de producción)
        const overdueProjects = myProjects.filter(p => {
          if (!["despiece", "corte", "enchape", "ensamble"].includes(p.status)) return false;
          const projectAny = p as any;
          const lastChange = projectAny.statusChangedAt ? new Date(projectAny.statusChangedAt) : new Date(p.createdAt);
          const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceChange > 5;
        });
        // Contar proyectos nuevos para producción (aprobados en las últimas 48 horas)
        const newForProduction = myProjects.filter(p => {
          if (!["aprobacion_final", "despiece"].includes(p.status)) return false;
          const projectAny = p as any;
          const approvedAt = projectAny.rendersApprovedAt ? new Date(projectAny.rendersApprovedAt) : null;
          if (!approvedAt) return false;
          const hoursSinceApproval = (Date.now() - approvedAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceApproval <= 48;
        });
        return [
          ...(newForProduction.length > 0 ? [{ 
            label: "✨ Nuevos para Producción", 
            value: newForProduction.length,
            icon: <Sparkles className="h-6 w-6" />,
            color: "bg-gradient-to-br from-green-500 to-emerald-600",
            link: "/projects?new_production=true",
            highlight: true
          }] : []),
          { 
            label: "Diseño Listo", 
            value: myProjects.filter(p => ["pendiente_render", "aprobacion_final"].includes(p.status)).length,
            icon: <Palette className="h-6 w-6" />,
            color: "bg-gradient-to-br from-purple-500 to-indigo-500",
            link: "/projects?status=pendiente_render"
          },
          { 
            label: "Despiece", 
            value: myProjects.filter(p => p.status === "despiece").length,
            icon: <FileText className="h-6 w-6" />,
            color: "bg-gradient-to-br from-orange-400 to-orange-500",
            link: "/projects?status=despiece"
          },
          { 
            label: "Corte", 
            value: myProjects.filter(p => p.status === "corte").length,
            icon: <Wrench className="h-6 w-6" />,
            color: "bg-gradient-to-br from-orange-500 to-amber-500",
            link: "/projects?status=corte"
          },
          { 
            label: "Enchape", 
            value: myProjects.filter(p => p.status === "enchape").length,
            icon: <Package className="h-6 w-6" />,
            color: "bg-gradient-to-br from-amber-500 to-yellow-500",
            link: "/projects?status=enchape"
          },
          { 
            label: "Ensamble", 
            value: myProjects.filter(p => p.status === "ensamble").length,
            icon: <Wrench className="h-6 w-6" />,
            color: "bg-gradient-to-br from-teal-500 to-cyan-500",
            link: "/projects?status=ensamble"
          },
          { 
            label: "Listos Instalar", 
            value: myProjects.filter(p => p.status === "listo_instalacion").length,
            icon: <Truck className="h-6 w-6" />,
            color: "bg-gradient-to-br from-green-500 to-emerald-500",
            link: "/projects?status=listo_instalacion"
          },
          { 
            label: "Instalaciones", 
            value: myProjects.filter(p => p.status === "listo_instalacion").length,
            icon: <Calendar className="h-6 w-6" />,
            color: "bg-gradient-to-br from-blue-500 to-cyan-500",
            link: "/calendar"
          },
          ...(overdueProjects.length > 0 ? [{ 
            label: "⚠️ Atrasados (+5 días)", 
            value: overdueProjects.length,
            icon: <AlertTriangle className="h-6 w-6" />,
            color: "bg-gradient-to-br from-red-500 to-rose-600",
            link: "/projects?overdue=true",
            highlight: true
          }] : []),
          { 
            label: "Mis Tareas", 
            value: myTasks.length,
            icon: <ClipboardList className="h-6 w-6" />,
            color: "bg-gradient-to-br from-purple-500 to-fuchsia-500",
            link: "/tasks"
          },
        ];
      }
      case "operario": {
        // Proyectos en producción por etapa para el operario
        const enProduccion = myProjects.filter(p =>
          ["despiece", "corte", "enchape", "ensamble"].includes(p.status)
        );
        const listosInstalar = myProjects.filter(p => 
          ["listo_instalacion", "listo_instalacion"].includes(p.status)
        );
        return [
          { 
            label: "📦 En Producción", 
            value: enProduccion.length,
            icon: <Wrench className="h-6 w-6" />,
            color: "bg-gradient-to-br from-orange-500 to-amber-500",
            link: "/projects"
          },
          { 
            label: "🚚 Listos/Instalación", 
            value: listosInstalar.length,
            icon: <Truck className="h-6 w-6" />,
            color: "bg-gradient-to-br from-green-500 to-emerald-500",
            link: "/projects"
          },
          { 
            label: "Mis Tareas", 
            value: myTasks.length,
            icon: <ClipboardList className="h-6 w-6" />,
            color: "bg-gradient-to-br from-cyan-500 to-teal-500",
            link: "/tasks"
          },
          { 
            label: "⚠️ Urgentes", 
            value: myTasks.filter(t => t.priority === "alta").length,
            icon: <AlertTriangle className="h-6 w-6" />,
            color: "bg-gradient-to-br from-red-500 to-rose-500",
            link: "/tasks",
            highlight: myTasks.filter(t => t.priority === "alta").length > 0
          },
        ];
      }
      case "medidor":
        return [
          { label: "Visitas Pendientes", value: pendingAppointments.length, icon: <CalendarCheck className="h-6 w-6" />, color: "bg-gradient-to-br from-amber-500 to-orange-500", link: "/appointments-calendar" },
          { label: "Levantamientos", value: (myVisits as any[]).length, icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-teal-500 to-emerald-500", link: "/medidor" },
          { label: "Mis Tareas", value: myTasks.length, icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-amber-600 to-yellow-600", link: "/tasks" },
        ];
      case "contador":
        return [
          { label: "Contabilidad", value: 0, icon: <BookOpen className="h-6 w-6" />, color: "bg-gradient-to-br from-violet-500 to-fuchsia-500", link: "/contador" },
          { label: "Mis Tareas", value: myTasks.length, icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-fuchsia-500 to-violet-600", link: "/tasks" },
        ];
      default: // super_admin
        return [
          {
            label: "Proyectos Activos",
            value: projects.filter(p => !["entregado", "cancelado"].includes(p.status)).length,
            icon: <Briefcase className="h-6 w-6" />,
            color: "bg-gradient-to-br from-slate-600 to-gray-700",
            link: "/projects"
          },
          {
            label: "Citas Hoy",
            value: todayAppointments.length,
            icon: <Calendar className="h-6 w-6" />,
            color: "bg-gradient-to-br from-teal-500 to-emerald-500",
            link: "/appointments-calendar"
          },
          { 
            label: "Cotizaciones", 
            value: quotations.length,
            icon: <DollarSign className="h-6 w-6" />,
            color: "bg-gradient-to-br from-green-500 to-emerald-500",
            link: "/quotations"
          },
          { 
            label: "Tareas Equipo", 
            value: tasks.filter(t => t.status !== "completada").length,
            icon: <UserCheck className="h-6 w-6" />,
            color: "bg-gradient-to-br from-indigo-500 to-purple-500",
            link: "/tasks"
          },
        ];
    }
  };

  // Acciones rápidas por rol
  const getQuickActions = () => {
    switch (role) {
      case "disenador":
        return [
          { label: "Mis Proyectos", href: "/projects", icon: <Palette className="h-6 w-6" />, color: "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" },
          { label: "Mis Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700" },
          { label: "Calendario", href: "/calendar", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700" },
        ];
      case "comercial":
        return [
          { label: "Calendario", href: "/calendar", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700" },
          { label: "Cotizaciones", href: "/quotations", icon: <FileText className="h-6 w-6" />, color: "bg-gradient-to-br from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700" },
          { label: "Clientes", href: "/clients", icon: <Users className="h-6 w-6" />, color: "bg-gradient-to-br from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700" },
          { label: "Mis Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700" },
        ];
      case "admin":
        return [
          { label: "Panel Admin", href: "/admin", icon: <LayoutDashboard className="h-6 w-6" />, color: "bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700" },
          { label: "Proyectos", href: "/projects", icon: <Briefcase className="h-6 w-6" />, color: "bg-gradient-to-br from-slate-700 to-gray-800 hover:from-slate-800 hover:to-gray-900" },
          { label: "Calendario", href: "#calendar-selector", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700", isCalendarSelector: true },
          { label: "Cotizaciones", href: "/quotations", icon: <FileText className="h-6 w-6" />, color: "bg-gradient-to-br from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700" },
          { label: "Clientes", href: "/clients", icon: <Users className="h-6 w-6" />, color: "bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" },
          { label: "Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" },
          { label: "Contabilidad", href: "/accounting", icon: <DollarSign className="h-6 w-6" />, color: "bg-gradient-to-br from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700" },
        ];
      case "jefe_taller":
        return [
          { label: "Producción", href: "/projects", icon: <Wrench className="h-6 w-6" />, color: "bg-gradient-to-br from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700" },
          { label: "Calendario", href: "/calendar", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700" },
          { label: "Mis Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700" },
        ];
      case "operario":
        return [
          { label: "Producción", href: "/projects", icon: <Wrench className="h-6 w-6" />, color: "bg-gradient-to-br from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700" },
          { label: "Mis Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700" },
          { label: "Calendario", href: "/calendar", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" },
        ];
      case "medidor":
        return [
          { label: "Levantamientos", href: "/medidor", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700" },
          { label: "Visitas Técnicas", href: "/appointments-calendar", icon: <CalendarCheck className="h-6 w-6" />, color: "bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" },
          { label: "Mis Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700" },
        ];
      case "contador":
        return [
          { label: "Contabilidad", href: "/contador", icon: <BookOpen className="h-6 w-6" />, color: "bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700" },
          { label: "Proyectos", href: "/projects", icon: <Briefcase className="h-6 w-6" />, color: "bg-gradient-to-br from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700" },
        ];
      default: // super_admin
        return [
          { label: "Panel Admin", href: "/admin", icon: <LayoutDashboard className="h-6 w-6" />, color: "bg-gradient-to-br from-slate-700 to-gray-800 hover:from-slate-800 hover:to-gray-900" },
          { label: "Proyectos", href: "/projects", icon: <Briefcase className="h-6 w-6" />, color: "bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700" },
          { label: "Calendario", href: "#calendar-selector", icon: <Calendar className="h-6 w-6" />, color: "bg-gradient-to-br from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700", isCalendarSelector: true },
          { label: "Tareas", href: "/tasks", icon: <ClipboardList className="h-6 w-6" />, color: "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" },
          { label: "Contabilidad", href: "/accounting", icon: <DollarSign className="h-6 w-6" />, color: "bg-gradient-to-br from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700" },
        ];
    }
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  // Función para obtener el nombre del estado en español
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      contacto: "Contacto",
      cotizacion_enviada: "Cotización Enviada",
      cotizacion_aprobada: "Cotización Aprobada",
      adelanto_recibido: "Cliente Confirmado - Iniciar Diseño",
      en_diseno: "En Diseño",
      pendiente_modelado: "Pendiente Modelado 3D",
      pendiente_render: "Pendiente Renders",
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

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      contacto: "bg-[#0F2222] text-white/85 border-[rgba(106,207,199,0.12)]",
      cotizacion_enviada: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      cotizacion_aprobada: "bg-emerald-500/15 text-emerald-300 border-emerald-200",
      adelanto_recibido: "bg-green-500/15 text-green-300 border-green-500/25",
      en_diseno: "bg-purple-500/15 text-purple-300 border-purple-500/25",
      pendiente_modelado: "bg-violet-100 text-violet-300 border-violet-200",
      pendiente_render: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      aprobacion_final: "bg-indigo-500/15 text-indigo-300 border-indigo-200",
      despiece: "bg-orange-500/15 text-orange-300 border-orange-500/25",
      corte: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      enchape: "bg-rose-500/15 text-rose-300 border-rose-500/25",
      ensamble: "bg-pink-500/15 text-pink-300 border-pink-200",
      listo_instalacion: "bg-cyan-100 text-cyan-300 border-cyan-200",
      entregado: "bg-white/[0.06] text-white/85 border-[rgba(106,207,199,0.12)]",
    };
    return statusColors[status] || "bg-white/[0.06] text-white/85 border-[rgba(106,207,199,0.12)]";
  };

  return (
    <div>
      {/* Banner de bienvenida — reemplaza header + hero con logo */}
      <div
        className={`rounded-xl p-4 md:p-5 mb-4 md:mb-6 bg-gradient-to-r ${config.color} text-white shadow-sm`}
      >
        <div className="flex items-start gap-4">
          <div className="bg-[#162828]/20 p-2.5 rounded-xl shrink-0">
            {config.icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight">{config.title}</h2>
            <p className="text-white/85 text-sm mt-0.5">{config.subtitle}</p>
            <p className="text-white/70 text-xs mt-1">
              ¡Hola, <span className="font-semibold text-white">{user?.name || "Usuario"}</span>! 👋
            </p>
          </div>
        </div>
      </div>

      {/* Frase motivacional */}
      <div className="mb-6">
        <DailyMotivation userName={user?.name || undefined} userBirthDate={user?.birthDate ? new Date(user.birthDate) : undefined} />
      </div>

      {/* Estadísticas */}
      <section className="mb-6">
        <div>
          <div>
            <h2 className="text-sm font-semibold text-white/45 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              Resumen del Día
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {stats.map((stat, index) => (
                <Link key={index} href={stat.link}>
                  <Card className={`hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden bg-[#162828] ${(stat as any).highlight ? 'border border-green-400/60 shadow-lg shadow-green-400/15' : 'border border-[rgba(106,207,199,0.12)] hover:border-[rgba(106,207,199,0.35)]'}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <div className={`${stat.color} p-2 md:p-2.5 rounded-lg`}>
                          {stat.icon}
                        </div>
                        <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">{stat.value}</span>
                      </div>
                      <p className="text-[10px] md:text-xs font-semibold text-white/55 uppercase tracking-wide">{stat.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Acciones Rápidas */}
      <section className="mb-6">
        <div>
          <div>
            <h2 className="text-sm font-semibold text-white/45 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-teal-400" />
              Acciones Rápidas
            </h2>
            <div className={`grid ${quickActions.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'} gap-3`}>
              {quickActions.map((action, index) => (
                (action as any).isCalendarSelector ? (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <Button 
                        className={`w-full h-auto py-3 md:py-5 lg:py-6 flex flex-col items-center gap-2 ${action.color} text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0`}
                      >
                        <div className="bg-[#162828]/20 p-2 rounded-lg">
                          {action.icon}
                        </div>
                        <span className="font-bold text-sm md:text-base">{action.label}</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-center">Seleccionar Calendario</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-4 py-4">
                        <Link href="/appointments-calendar">
                          <Button className="w-full h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg">
                            <Calendar className="h-8 w-8" />
                            <div className="text-center">
                              <span className="font-bold text-base block">Calendario de Citas</span>
                              <span className="text-xs text-white/80">Toma de medidas programadas</span>
                            </div>
                          </Button>
                        </Link>
                        <Link href="/calendar">
                          <Button className="w-full h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg">
                            <Truck className="h-8 w-8" />
                            <div className="text-center">
                              <span className="font-bold text-base block">Calendario de Instalaciones</span>
                              <span className="text-xs text-white/80">Fechas de entrega de proyectos</span>
                            </div>
                          </Button>
                        </Link>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link key={index} href={action.href}>
                    <Button 
                      className={`w-full h-auto py-5 md:py-6 flex flex-col items-center gap-2 ${action.color} text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0`}
                    >
                      <div className="bg-[#162828]/20 p-2 rounded-lg">
                        {action.icon}
                      </div>
                      <span className="font-bold text-sm md:text-base">{action.label}</span>
                    </Button>
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Proyectos Recientes */}
      {myProjects.length > 0 && (
        <section className="mb-6">
          <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-teal-400" />
                  Proyectos Recientes
                </h2>
                <Link href="/projects">
                  <Button variant="ghost" size="sm" className="text-teal-400 font-semibold">
                    Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myProjects.slice(0, 4).map((project, index) => {
                  const projectColors = [
                    "bg-gradient-to-br from-teal-500 to-emerald-600",
                    "bg-gradient-to-br from-purple-500 to-indigo-600",
                    "bg-gradient-to-br from-orange-500 to-amber-600",
                    "bg-gradient-to-br from-pink-500 to-rose-600",
                  ];
                  return (
                    <Link key={project.id} href="/projects">
                      <Card className="bg-[#162828] border border-[rgba(106,207,199,0.12)] hover:border-[rgba(106,207,199,0.35)] hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className={`${projectColors[index % 4]} p-2 rounded-lg`}>
                              {project.workType === "cocina" && <span className="text-xl">🍳</span>}
                              {project.workType === "closet" && <span className="text-xl">👔</span>}
                              {project.workType === "puertas" && <span className="text-xl">🛏</span>}
                              {project.workType === "centro_tv" && <span className="text-xl">📺</span>}
                              {!project.workType && <Briefcase className="h-5 w-5 text-white" />}
                            </div>
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(project.status)} font-semibold text-xs`}
                            >
                              {getStatusLabel(project.status)}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-white truncate text-sm md:text-base">{project.name}</h3>
                          <p className="text-xs text-white/55 mt-1">
                            {project.workType === "cocina" && "Cocina Integral"}
                            {project.workType === "closet" && "Closet"}
                            {project.workType === "puertas" && "Puertas"}
                            {project.workType === "centro_tv" && "Centro de TV"}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
          </div>
        </section>
      )}

      {/* Tareas Pendientes */}
      {myTasks.length > 0 && (
        <section className="mb-6 pb-4">
          <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal-400" />
                  Tareas Pendientes
                </h2>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-teal-400 font-semibold">
                    Ver todas <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myTasks.slice(0, 4).map((task, index) => {
                  const taskColors = [
                    "bg-gradient-to-br from-blue-500 to-cyan-600",
                    "bg-gradient-to-br from-violet-500 to-purple-600",
                    "bg-gradient-to-br from-rose-500 to-pink-600",
                    "bg-gradient-to-br from-amber-500 to-orange-600",
                  ];
                  const priorityColors: Record<string, string> = {
                    alta: "bg-red-500/20 text-red-300 border-red-400/30",
                    media: "bg-amber-500/20 text-amber-300 border-amber-400/30",
                    baja: "bg-green-500/20 text-green-300 border-green-400/30",
                  };
                  const priorityIcons: Record<string, string> = {
                    alta: "🔥",
                    media: "⚡",
                    baja: "✅",
                  };
                  return (
                    <Link key={task.id} href="/tasks">
                      <Card className="bg-[#162828] border border-[rgba(106,207,199,0.12)] hover:border-[rgba(106,207,199,0.35)] hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className={`${taskColors[index % 4]} p-2 rounded-lg`}>
                              <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <Badge
                              variant="outline"
                              className={`${priorityColors[task.priority || "media"]} font-semibold text-xs`}
                            >
                              {priorityIcons[task.priority || "media"]} {task.priority === "alta" ? "Urgente" : task.priority === "media" ? "Media" : "Baja"}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-white truncate text-sm md:text-base">{task.title}</h3>
                          <p className="text-xs text-white/55 mt-1 line-clamp-1">
                            {task.description || "Sin descripción"}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
          </div>
        </section>
      )}

      {/* Sección especial para Diseñador: Cambios Pendientes */}
      {role === "disenador" && myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).length > 0 && (
        <section className="mb-6">
          <div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                🔄 Cambios Solicitados por Clientes
              </h2>
              <div className="space-y-3">
                {myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).map((project: any) => {
                  // Calcular tiempo transcurrido desde la solicitud de cambios
                  const changesDate = project.changesRequestedAt ? new Date(project.changesRequestedAt) : null;
                  const now = new Date();
                  let tiempoTranscurrido = "";
                  let esUrgente = false;
                  
                  if (changesDate) {
                    const diffMs = now.getTime() - changesDate.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    
                    if (diffDays > 0) {
                      tiempoTranscurrido = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
                      esUrgente = diffDays >= 2; // Urgente si lleva 2+ días
                    } else if (diffHours > 0) {
                      tiempoTranscurrido = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                      esUrgente = diffHours >= 24;
                    } else {
                      tiempoTranscurrido = "Hace menos de 1 hora";
                    }
                  }
                  
                  return (
                    <Card key={project.id} className={`border-l-4 ${esUrgente ? 'border-l-red-500 bg-red-500/10' : 'border-l-orange-500 bg-orange-500/10'} hover:shadow-lg transition-all`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={esUrgente ? "bg-red-500 text-white" : "bg-orange-500 text-white"}>
                                {esUrgente ? "🔥 URGENTE" : "🔄 Cambios Pendientes"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Rev. {project.renderRevisionNumber || 1}
                              </span>
                              {tiempoTranscurrido && (
                                <Badge variant="outline" className={`text-xs ${esUrgente ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-orange-500/30 text-orange-400 bg-orange-500/10'}`}>
                                  ⏰ {tiempoTranscurrido}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-foreground">{project.name}</h3>
                            {changesDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📅 Solicitado: {changesDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            <div className="mt-2 p-3 bg-[#162828] rounded-lg border border-orange-500/25">
                              <p className="text-sm text-white/85 font-medium mb-1">📝 Cambios solicitados:</p>
                              <p className="text-sm text-white/60">{project.clientApprovalNotes || "Sin detalles especificados"}</p>
                            </div>
                          </div>
                          <Link href={`/projects/${project.id}`}>
                            <Button size="sm" className={esUrgente ? "bg-red-600 hover:bg-red-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"}>
                              Ver Proyecto
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sección especial para Diseñador: Checklist de Entregables */}
      {role === "disenador" && myProjects.filter(p => ["adelanto_recibido", "en_diseno"].includes(p.status)).length > 0 && (
        <section className="mb-6">
          <h2 className="text-base md:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-400" />
            Proyectos en Diseño - Checklist de Entregables
          </h2>
          <div className="space-y-4">
            {myProjects.filter(p => ["adelanto_recibido", "en_diseno"].includes(p.status)).slice(0, 3).map((project: any) => (
              <DesignerChecklist
                key={project.id}
                projectId={project.id}
                projectName={project.name}
                advanceReceivedAt={project.advanceReceivedAt || project.createdAt}
                designDeadline={project.designDeadline}
                status={project.status}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sección especial para Jefe de Taller: Calendario de Producción */}
      {role === "jefe_taller" && (
        <section className="mb-6">
          <ProductionCalendar />
        </section>
      )}

      {/* Sección especial para Operario: Proyectos del Día con Checklist */}
      {role === "operario" && (
        <section className="mb-6">
          <OperatorDailyProjects />
        </section>
      )}

      {/* Espacio si no hay proyectos ni tareas */}
      {myProjects.length === 0 && myTasks.length === 0 && (
        <section className="py-8 pb-24">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-[#162828] rounded-2xl shadow-md p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-foreground mb-2">¡Todo al día!</h3>
                <p className="text-muted-foreground">No tienes proyectos ni tareas pendientes en este momento.</p>
              </div>
            </div>
          </div>
        </section>
      )}

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
