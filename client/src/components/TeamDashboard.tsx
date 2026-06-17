import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { DailyMotivation } from "@/components/DailyMotivation";
import { CEOControlCenter } from "@/components/CEOControlCenter";
import { DesignerChecklist } from "@/components/DesignerChecklist";
import { ProductionCalendar } from "@/components/ProductionCalendar";
import { OperatorDailyProjects } from "@/components/OperatorDailyProjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Calendar,
  CalendarCheck,
  ClipboardList,
  DollarSign,
  Shield,
  Users,
  KanbanSquare,
  Palette,
  Wrench,
  Truck,
  BarChart3,
  AlertTriangle,
  Briefcase,
  Package,
  Sparkles,
  Target,
  Clock,
  ArrowRight,
  MessageCircle,
  Star,
} from "lucide-react";

// ── Acento por rol ────────────────────────────────────────────────────────────
const roleAccent: Record<string, string> = {
  super_admin: "#1DB5A8",
  admin:       "#1DB5A8",
  comercial:   "#EC4899",
  disenador:   "#6366F1",
  jefe_taller: "#F97316",
  operario:    "#3B82F6",
};

// ── Quick-action item ─────────────────────────────────────────────────────────
type QuickAction = {
  label: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
  isCalendarSelector?: boolean;
};

// ── Stat item ─────────────────────────────────────────────────────────────────
type Stat = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  href: string;
  helper?: string;
  highlight?: boolean;
};

// ── Rol header config ─────────────────────────────────────────────────────────
const roleHeader: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
  super_admin: {
    title: "Panel CEO",
    subtitle: "Control total del negocio",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  admin: {
    title: "Panel Administrativo",
    subtitle: "Gestiona clientes, citas y cotizaciones",
    icon: <Shield className="h-5 w-5" />,
  },
  comercial: {
    title: "Portal Comercial",
    subtitle: "Conecta clientes con sus sueños",
    icon: <KanbanSquare className="h-5 w-5" />,
  },
  disenador: {
    title: "Portal del Diseñador",
    subtitle: "Crea diseños que transforman hogares",
    icon: <Palette className="h-5 w-5" />,
  },
  jefe_taller: {
    title: "Portal Jefe de Taller",
    subtitle: "Lidera la producción con excelencia",
    icon: <Wrench className="h-5 w-5" />,
  },
  operario: {
    title: "Portal del Operario",
    subtitle: "Construye calidad en cada detalle",
    icon: <Package className="h-5 w-5" />,
  },
};

// ── Quick-action card ─────────────────────────────────────────────────────────
function ActionCard({ label, href, icon, accent, onClick }: QuickAction & { onClick?: () => void }) {
  const inner = (
    <div
      className="bg-[#162828] rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:bg-[#1c3232] transition-all cursor-pointer border border-white/[0.06] hover:border-white/[0.14] group"
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 34, height: 34, background: `${accent}1A`, color: accent }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-white/75 group-hover:text-white/95 transition-colors leading-tight">
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 ml-auto text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
    </div>
  );

  if (onClick) return <button className="w-full text-left" onClick={onClick}>{inner}</button>;
  return <Link href={href}>{inner}</Link>;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function TeamDashboard() {
  const { user } = useAuth();
  const role = (user?.role as string) || "user";
  const accent = roleAccent[role] ?? "#1DB5A8";
  const header = roleHeader[role] ?? roleHeader.admin;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const { data: tasks = [] } = trpc.tasks.list.useQuery();
  const { data: appointments = [] } = trpc.appointments.list.useQuery(undefined, {
    enabled: ["comercial", "admin", "super_admin"].includes(role),
  });
  const { data: quotations = [] } = trpc.quotations.list.useQuery(undefined, {
    enabled: ["comercial", "admin", "super_admin"].includes(role),
  });

  // ── Datos filtrados ────────────────────────────────────────────────────────
  const myProjects = (() => {
    switch (role) {
      case "disenador":
        return projects.filter(p =>
          ["adelanto_recibido","en_diseno","pendiente_modelado","pendiente_render",
           "aprobacion_final","despiece","corte","enchape","ensamble","listo_instalacion","entregado"].includes(p.status)
        );
      case "jefe_taller":
      case "operario":
        return projects.filter(p =>
          ["aprobacion_final","despiece","corte","enchape","ensamble","listo_instalacion"].includes(p.status)
        );
      case "comercial":
      case "admin":
        return projects.filter(p =>
          ["cotizacion_enviada","cotizacion_aprobada","adelanto_recibido"].includes(p.status)
        );
      default:
        return projects;
    }
  })();

  const myTasks = tasks.filter(t => t.assignedTo === user?.id && t.status !== "completada");
  const pendingAppointments = appointments.filter(a => ["pendiente","confirmada"].includes(a.status));
  const draftQuotations = quotations.filter(q => q.status === "draft");
  const sentQuotations = quotations.filter(q => q.status === "sent");

  // ── Stats por rol ──────────────────────────────────────────────────────────
  const stats: Stat[] = (() => {
    switch (role) {
      case "disenador": {
        const cambios = myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).length;
        const nuevos  = myProjects.filter(p => p.status === "adelanto_recibido").length;
        return [
          { label: "En Diseño",           value: myProjects.filter(p => p.status === "en_diseno").length, icon: <Palette className="h-4 w-4" />,      accent: "#6366F1", href: "/projects" },
          { label: "Cambios Pendientes",   value: cambios,  icon: <AlertTriangle className="h-4 w-4" />, accent: cambios > 0 ? "#EF4444" : "#F59E0B", href: "/projects", highlight: cambios > 0, helper: cambios > 0 ? "Revisión solicitada" : undefined },
          { label: "Nuevos para Diseñar",  value: nuevos,   icon: <Sparkles className="h-4 w-4" />,      accent: "#22C55E", href: "/projects", highlight: nuevos > 0 },
          { label: "Mis Tareas",           value: myTasks.length, icon: <ClipboardList className="h-4 w-4" />, accent: "#1DB5A8", href: "/tasks" },
        ];
      }
      case "comercial":
        return [
          { label: "Citas Pendientes",       value: pendingAppointments.length, icon: <CalendarCheck className="h-4 w-4" />, accent: "#F59E0B", href: "/appointments-calendar" },
          { label: "Cotizaciones Borrador",   value: draftQuotations.length,     icon: <FileText className="h-4 w-4" />,      accent: "#3B82F6", href: "/quotations" },
          { label: "Esperando Respuesta",     value: sentQuotations.length,      icon: <Clock className="h-4 w-4" />,         accent: "#A78BFA", href: "/quotations" },
          { label: "Mis Tareas",              value: myTasks.length,             icon: <ClipboardList className="h-4 w-4" />, accent: "#1DB5A8", href: "/tasks" },
        ];
      case "admin":
        return [
          { label: "Citas Pendientes",       value: pendingAppointments.length, icon: <CalendarCheck className="h-4 w-4" />, accent: "#F59E0B", href: "/appointments-calendar" },
          { label: "Cotizaciones Borrador",   value: draftQuotations.length,     icon: <FileText className="h-4 w-4" />,      accent: "#3B82F6", href: "/quotations" },
          { label: "Esperando Respuesta",     value: sentQuotations.length,      icon: <Clock className="h-4 w-4" />,         accent: "#A78BFA", href: "/quotations" },
          { label: "Mis Tareas",              value: myTasks.length,             icon: <ClipboardList className="h-4 w-4" />, accent: "#1DB5A8", href: "/tasks" },
        ];
      case "jefe_taller": {
        const overdue = myProjects.filter(p => {
          if (!["despiece","corte","enchape","ensamble"].includes(p.status)) return false;
          const last = (p as any).statusChangedAt ? new Date((p as any).statusChangedAt) : new Date(p.createdAt);
          return Math.floor((Date.now() - last.getTime()) / 86400000) > 5;
        });
        const nuevosProd = myProjects.filter(p => {
          if (!["aprobacion_final","despiece"].includes(p.status)) return false;
          const ap = (p as any).rendersApprovedAt ? new Date((p as any).rendersApprovedAt) : null;
          return ap ? (Date.now() - ap.getTime()) / 3600000 <= 48 : false;
        });
        return [
          ...(nuevosProd.length > 0 ? [{ label: "Nuevos para Producción", value: nuevosProd.length, icon: <Sparkles className="h-4 w-4" />, accent: "#22C55E", href: "/projects", highlight: true }] : []),
          { label: "Despiece",        value: myProjects.filter(p => p.status === "despiece").length,         icon: <FileText className="h-4 w-4" />,     accent: "#F59E0B", href: "/projects" },
          { label: "Corte",           value: myProjects.filter(p => p.status === "corte").length,            icon: <Wrench className="h-4 w-4" />,       accent: "#F97316", href: "/projects" },
          { label: "Enchape",         value: myProjects.filter(p => p.status === "enchape").length,          icon: <Package className="h-4 w-4" />,      accent: "#EAB308", href: "/projects" },
          { label: "Ensamble",        value: myProjects.filter(p => p.status === "ensamble").length,         icon: <Wrench className="h-4 w-4" />,       accent: "#1DB5A8", href: "/projects" },
          { label: "Listos Instalar", value: myProjects.filter(p => p.status === "listo_instalacion").length, icon: <Truck className="h-4 w-4" />,       accent: "#22C55E", href: "/projects" },
          ...(overdue.length > 0 ? [{ label: "Atrasados +5 días", value: overdue.length, icon: <AlertTriangle className="h-4 w-4" />, accent: "#EF4444", href: "/projects", highlight: true, helper: "Requieren atención" }] : []),
          { label: "Mis Tareas",      value: myTasks.length, icon: <ClipboardList className="h-4 w-4" />,    accent: "#6366F1", href: "/tasks" },
        ];
      }
      case "operario": {
        const urgentes = myTasks.filter(t => t.priority === "alta").length;
        return [
          { label: "En Producción",      value: myProjects.filter(p => ["despiece","corte","enchape","ensamble"].includes(p.status)).length, icon: <Wrench className="h-4 w-4" />,       accent: "#F97316", href: "/projects" },
          { label: "Listos / Instalación",value: myProjects.filter(p => p.status === "listo_instalacion").length, icon: <Truck className="h-4 w-4" />,  accent: "#22C55E", href: "/projects" },
          { label: "Mis Tareas",          value: myTasks.length, icon: <ClipboardList className="h-4 w-4" />,                                              accent: "#1DB5A8", href: "/tasks" },
          { label: "Urgentes",            value: urgentes, icon: <AlertTriangle className="h-4 w-4" />,                                                   accent: urgentes > 0 ? "#EF4444" : "#94A3B8", href: "/tasks", highlight: urgentes > 0 },
        ];
      }
      default: // super_admin
        return [
          { label: "Proyectos Activos", value: projects.filter(p => !["entregado","cancelado"].includes(p.status)).length, icon: <FolderKanban className="h-4 w-4" />, accent: "#1DB5A8", href: "/projects" },
          { label: "Citas Hoy",         value: pendingAppointments.length, icon: <CalendarCheck className="h-4 w-4" />,                                                  accent: "#F59E0B", href: "/appointments-calendar" },
          { label: "Cotizaciones",      value: quotations.length,           icon: <FileText className="h-4 w-4" />,                                                      accent: "#3B82F6", href: "/quotations" },
          { label: "Tareas Equipo",     value: tasks.filter(t => t.status !== "completada").length, icon: <ClipboardList className="h-4 w-4" />,                         accent: "#6366F1", href: "/tasks" },
        ];
    }
  })();

  // ── Quick actions por rol ──────────────────────────────────────────────────
  const quickActions: QuickAction[] = (() => {
    switch (role) {
      case "disenador":
        return [
          { label: "Mis Proyectos", href: "/projects",  icon: <FolderKanban className="h-4 w-4" />, accent: "#8B5CF6" },
          { label: "Diseño",        href: "/design",    icon: <Palette className="h-4 w-4" />,      accent: "#EC4899" },
          { label: "Mis Tareas",    href: "/tasks",     icon: <ClipboardList className="h-4 w-4" />, accent: "#22C55E" },
          { label: "Instalaciones", href: "/calendar",  icon: <Truck className="h-4 w-4" />,        accent: "#F97316" },
        ];
      case "comercial":
        return [
          { label: "Pipeline",      href: "/comercial",               icon: <KanbanSquare className="h-4 w-4" />,  accent: "#1DB5A8" },
          { label: "Cotizaciones",  href: "/quotations",              icon: <FileText className="h-4 w-4" />,       accent: "#6366F1" },
          { label: "Citas",         href: "/appointments-calendar",   icon: <CalendarCheck className="h-4 w-4" />, accent: "#3B82F6" },
          { label: "Clientes",      href: "/clients",                 icon: <Users className="h-4 w-4" />,          accent: "#0EA5E9" },
          { label: "Mis Tareas",    href: "/tasks",                   icon: <ClipboardList className="h-4 w-4" />, accent: "#22C55E" },
        ];
      case "admin":
        return [
          { label: "Dashboard",     href: "/ceo-dashboard",           icon: <LayoutDashboard className="h-4 w-4" />, accent: "#1DB5A8" },
          { label: "Pipeline",      href: "/comercial",               icon: <KanbanSquare className="h-4 w-4" />,    accent: "#1DB5A8" },
          { label: "Proyectos",     href: "/projects",                icon: <FolderKanban className="h-4 w-4" />,    accent: "#8B5CF6" },
          { label: "Citas",         href: "/appointments-calendar",   icon: <CalendarCheck className="h-4 w-4" />,  accent: "#3B82F6" },
          { label: "Cotizaciones",  href: "/quotations",              icon: <FileText className="h-4 w-4" />,        accent: "#6366F1" },
          { label: "Contabilidad",  href: "/accounting",              icon: <DollarSign className="h-4 w-4" />,     accent: "#10B981" },
          { label: "Tareas",        href: "/tasks",                   icon: <ClipboardList className="h-4 w-4" />,  accent: "#22C55E" },
        ];
      case "jefe_taller":
        return [
          { label: "Producción",    href: "/projects",  icon: <Wrench className="h-4 w-4" />,        accent: "#F97316" },
          { label: "Instalaciones", href: "/calendar",  icon: <Truck className="h-4 w-4" />,         accent: "#F59E0B" },
          { label: "Mis Tareas",    href: "/tasks",     icon: <ClipboardList className="h-4 w-4" />, accent: "#22C55E" },
        ];
      case "operario":
        return [
          { label: "Producción",    href: "/projects",  icon: <Wrench className="h-4 w-4" />,        accent: "#F97316" },
          { label: "Mis Tareas",    href: "/tasks",     icon: <ClipboardList className="h-4 w-4" />, accent: "#22C55E" },
          { label: "Instalaciones", href: "/calendar",  icon: <Truck className="h-4 w-4" />,         accent: "#3B82F6" },
        ];
      default: // super_admin
        return [
          { label: "Dashboard",       href: "/ceo-dashboard",         icon: <LayoutDashboard className="h-4 w-4" />, accent: "#1DB5A8" },
          { label: "Pipeline",        href: "/comercial",             icon: <KanbanSquare className="h-4 w-4" />,    accent: "#1DB5A8" },
          { label: "Proyectos",       href: "/projects",              icon: <FolderKanban className="h-4 w-4" />,    accent: "#8B5CF6" },
          { label: "Calendario",      href: "/appointments-calendar", icon: <CalendarCheck className="h-4 w-4" />,  accent: "#3B82F6", isCalendarSelector: true },
          { label: "Tareas",          href: "/tasks",                 icon: <ClipboardList className="h-4 w-4" />,  accent: "#22C55E" },
          { label: "Contabilidad",    href: "/accounting",            icon: <DollarSign className="h-4 w-4" />,     accent: "#10B981" },
          { label: "Admin",           href: "/admin",                 icon: <Shield className="h-4 w-4" />,         accent: "#94A3B8" },
        ];
    }
  })();

  // ── Estado / badge del proyecto ────────────────────────────────────────────
  const statusLabel: Record<string, string> = {
    contacto: "Contacto", cotizacion_enviada: "Cot. Enviada",
    cotizacion_aprobada: "Cot. Aprobada", adelanto_recibido: "Confirmado",
    en_diseno: "En Diseño", pendiente_modelado: "Modelado 3D",
    pendiente_render: "Renders", aprobacion_final: "Aprobación",
    despiece: "Despiece", corte: "Corte", enchape: "Enchape",
    ensamble: "Ensamble", listo_instalacion: "Instalación", entregado: "Entregado",
  };

  const statusAccent: Record<string, string> = {
    contacto: "#94A3B8", cotizacion_enviada: "#3B82F6", cotizacion_aprobada: "#22C55E",
    adelanto_recibido: "#10B981", en_diseno: "#6366F1", pendiente_modelado: "#8B5CF6",
    pendiente_render: "#F59E0B", aprobacion_final: "#1DB5A8",
    despiece: "#F97316", corte: "#EAB308", enchape: "#EC4899",
    ensamble: "#A78BFA", listo_instalacion: "#22C55E", entregado: "#94A3B8",
  };

  const projectIcon: Record<string, string> = {
    cocina: "🍳", closet: "👔", puertas: "🚪", centro_tv: "📺",
  };

  return (
    <div className="pb-8">
      {/* ── Header de rol ──────────────────────────────────────────────────── */}
      <PageHeader
        title={header.title}
        subtitle={`${header.subtitle} · ¡Hola, ${user?.name?.split(" ")[0] || "Usuario"}! 👋`}
        icon={header.icon}
      />

      {/* ── Frase motivacional ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <DailyMotivation
          userName={user?.name || undefined}
          userBirthDate={user?.birthDate ? new Date(user.birthDate) : undefined}
        />
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(106,207,199,0.55)" }}>
          Resumen del Día
        </p>
        <KpiGrid cols={stats.length <= 3 ? 3 : 4}>
          {stats.map((s, i) => (
            <KpiCard
              key={i}
              label={s.label}
              value={s.value}
              icon={s.icon}
              accent={s.accent}
              href={s.href}
              helper={s.helper}
              className={s.highlight && s.value > 0 ? "ring-1 ring-offset-1 ring-offset-[#0C1A1A]" : ""}
            />
          ))}
        </KpiGrid>
      </section>

      {/* ── Acciones rápidas ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(106,207,199,0.55)" }}>
          Acciones Rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {quickActions.map((action, i) =>
            action.isCalendarSelector ? (
              <Dialog key={i}>
                <DialogTrigger asChild>
                  <button className="w-full text-left">
                    <div className="bg-[#162828] rounded-xl p-3 sm:p-4 flex items-center gap-3 hover:bg-[#1c3232] transition-all cursor-pointer border border-white/[0.06] hover:border-white/[0.14] group">
                      <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, background: `${action.accent}1A`, color: action.accent }}>
                        {action.icon}
                      </div>
                      <span className="text-sm font-medium text-white/75 group-hover:text-white/95 transition-colors leading-tight">{action.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-auto text-white/20 group-hover:text-white/50 shrink-0" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" style={{ background: "#162828", border: "1px solid rgba(106,207,199,0.18)" }}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Seleccionar Calendario</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3 py-2">
                    <Link href="/appointments-calendar">
                      <div className="bg-[#0C1A1A] rounded-xl p-4 flex items-center gap-3 hover:bg-[#1c3232] cursor-pointer border border-white/[0.06] hover:border-[#F59E0B]/40 group transition-all">
                        <div className="flex items-center justify-center rounded-lg" style={{ width: 38, height: 38, background: "#F59E0B1A", color: "#F59E0B" }}><CalendarCheck className="h-5 w-5" /></div>
                        <div><p className="text-sm font-semibold text-white/90">Calendario de Citas</p><p className="text-xs text-white/45">Toma de medidas programadas</p></div>
                      </div>
                    </Link>
                    <Link href="/calendar">
                      <div className="bg-[#0C1A1A] rounded-xl p-4 flex items-center gap-3 hover:bg-[#1c3232] cursor-pointer border border-white/[0.06] hover:border-[#1DB5A8]/40 group transition-all">
                        <div className="flex items-center justify-center rounded-lg" style={{ width: 38, height: 38, background: "#1DB5A81A", color: "#1DB5A8" }}><Truck className="h-5 w-5" /></div>
                        <div><p className="text-sm font-semibold text-white/90">Calendario de Instalaciones</p><p className="text-xs text-white/45">Fechas de entrega de proyectos</p></div>
                      </div>
                    </Link>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <ActionCard key={i} {...action} />
            )
          )}
        </div>
      </section>

      {/* ── CEO Control Center ─────────────────────────────────────────────── */}
      {role === "super_admin" && (
        <section className="mb-6">
          <CEOControlCenter />
        </section>
      )}

      {/* ── Proyectos recientes ────────────────────────────────────────────── */}
      {myProjects.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(106,207,199,0.55)" }}>
              Proyectos Recientes
            </p>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" style={{ color: "#1DB5A8" }}>
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {myProjects.slice(0, 4).map((project) => {
              const ac = statusAccent[project.status] ?? "#94A3B8";
              return (
                <Link key={project.id} href="/projects">
                  <div
                    className="bg-[#162828] rounded-xl p-4 flex items-center gap-3 hover:bg-[#1c3232] cursor-pointer transition-all border border-white/[0.06] hover:border-white/[0.14]"
                    style={{ borderLeft: `3px solid ${ac}` }}
                  >
                    <div className="flex items-center justify-center rounded-lg text-lg shrink-0" style={{ width: 36, height: 36, background: `${ac}18` }}>
                      {projectIcon[project.workType || ""] ?? <Briefcase className="h-4 w-4" style={{ color: ac }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/85 truncate">{project.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: ac }}>{statusLabel[project.status] ?? project.status}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tareas pendientes ──────────────────────────────────────────────── */}
      {myTasks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(106,207,199,0.55)" }}>
              Mis Tareas Pendientes
            </p>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" style={{ color: "#1DB5A8" }}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {myTasks.slice(0, 4).map((task) => {
              const priorityAccent = task.priority === "alta" ? "#EF4444" : task.priority === "media" ? "#F59E0B" : "#22C55E";
              const priorityLabel  = task.priority === "alta" ? "Urgente" : task.priority === "media" ? "Media" : "Baja";
              return (
                <Link key={task.id} href="/tasks">
                  <div
                    className="bg-[#162828] rounded-xl p-4 flex items-center gap-3 hover:bg-[#1c3232] cursor-pointer transition-all border border-white/[0.06] hover:border-white/[0.14]"
                    style={{ borderLeft: `3px solid ${priorityAccent}` }}
                  >
                    <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, background: `${priorityAccent}18`, color: priorityAccent }}>
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/85 truncate">{task.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: priorityAccent }}>{priorityLabel}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sección especial: Diseñador — cambios pendientes ──────────────── */}
      {role === "disenador" && myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(106,207,199,0.55)" }}>
            Cambios Solicitados por Clientes
          </p>
          <div className="space-y-2.5">
            {myProjects.filter(p => p.status === "en_diseno" && (p as any).clientApprovalNotes).map((project: any) => {
              const changesDate = project.changesRequestedAt ? new Date(project.changesRequestedAt) : null;
              const diffDays = changesDate ? Math.floor((Date.now() - changesDate.getTime()) / 86400000) : 0;
              const urgent = diffDays >= 2;
              const ac = urgent ? "#EF4444" : "#F59E0B";
              return (
                <div key={project.id} className="bg-[#162828] rounded-xl p-4 border border-white/[0.06]" style={{ borderLeft: `3px solid ${ac}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ac}20`, color: ac }}>
                          {urgent ? "🔥 URGENTE" : "🔄 Cambios Pendientes"}
                        </span>
                        {changesDate && (
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            Hace {diffDays > 0 ? `${diffDays}d` : "hoy"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white/85 truncate">{project.name}</p>
                      <p className="text-xs mt-1.5 text-white/50 line-clamp-2">{project.clientApprovalNotes}</p>
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      <Button size="sm" className="shrink-0 text-xs h-8" style={{ background: ac, color: "#fff" }}>
                        Ver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sección especial: Diseñador — checklist ───────────────────────── */}
      {role === "disenador" && myProjects.filter(p => ["adelanto_recibido","en_diseno"].includes(p.status)).length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(106,207,199,0.55)" }}>
            Proyectos en Diseño — Checklist
          </p>
          <div className="space-y-4">
            {myProjects.filter(p => ["adelanto_recibido","en_diseno"].includes(p.status)).slice(0, 3).map((project: any) => (
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

      {/* ── Sección especial: Jefe de Taller — calendario producción ─────── */}
      {role === "jefe_taller" && (
        <section className="mb-6">
          <ProductionCalendar />
        </section>
      )}

      {/* ── Sección especial: Operario — proyectos del día ────────────────── */}
      {role === "operario" && (
        <section className="mb-6">
          <OperatorDailyProjects />
        </section>
      )}

      {/* ── Estado vacío ───────────────────────────────────────────────────── */}
      {myProjects.length === 0 && myTasks.length === 0 && (
        <div className="bg-[#162828] rounded-xl p-8 text-center border border-white/[0.06]">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-base font-bold text-white/85 mb-1">¡Todo al día!</h3>
          <p className="text-sm text-white/45">No tienes proyectos ni tareas pendientes en este momento.</p>
        </div>
      )}

      {/* ── WhatsApp flotante ──────────────────────────────────────────────── */}
      <a
        href="https://wa.me/573136802025"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 text-white p-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-110 z-50"
        style={{ background: "#25D366" }}
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
}
