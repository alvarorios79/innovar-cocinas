// Panel Comercial de Martha - Versión corregida
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Calendar, 
  Phone, 
  FileText, 
  Users, 
  Plus, 
  AlertTriangle,
  Wrench,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  Globe,
  MessageCircle,
  Briefcase,
  Gift,
  Cake,
  Heart,
  LogOut,
  Sparkles,
  TrendingUp,
  DollarSign,
  ClipboardList,
  Target,
  Palette,
  Package,
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
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
      className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
      <span className="ml-1 hidden xl:inline">Salir</span>
    </Button>
  );
}

export default function Comercial() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [scheduleDialog, setScheduleDialog] = useState<{ projectId: number; projectName: string; tentativeDate: Date | null } | null>(null);
  const [installDate, setInstallDate] = useState("");

  const utils = trpc.useUtils();
  
  // Queries - TODAS las queries igual que CEO
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.list.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.list.useQuery();
  const { data: projects = [], isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: tasks = [] } = trpc.tasks.list.useQuery();

  // Mutation para programar instalación
  const updateInstallDate = trpc.projects.updateEstimatedDate.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Fecha de instalación programada");
      setScheduleDialog(null);
      setInstallDate("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al programar instalación");
    },
  });

  // Filtros de datos
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Cumpleaños de clientes hoy o próximos 7 días
  const getUpcomingBirthdays = () => {
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    return clients.filter((client: any) => {
      if (!client.birthDate) return false;
      const birthDate = new Date(client.birthDate);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      // Si ya pasó este año, verificar el próximo año
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearBirthday >= today && thisYearBirthday <= sevenDaysFromNow;
    }).map((client: any) => {
      const birthDate = new Date(client.birthDate);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...client, daysUntil, birthdayDate: thisYearBirthday };
    }).sort((a: any, b: any) => a.daysUntil - b.daysUntil);
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  // Citas del día
  const todayAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.scheduledDate);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === today.getTime() && apt.status === "pending";
  });

  // Citas pendientes (todas)
  const pendingAppointments = appointments.filter((a: any) => a.status === "pendiente" || a.status === "confirmada" || a.status === "pending");

  // TODOS los proyectos activos (no entregados ni cancelados) - IGUAL QUE CEO
  const activeProjects = projects.filter((p: any) => !["entregado", "cancelado"].includes(p.status));

  // Proyectos en ensamble (para programar instalación)
  const projectsInEnsamble = projects.filter((p: any) => p.status === "ensamble");

  // Proyectos con instalación programada
  const projectsWithInstallDate = projects.filter((p: any) => 
    p.estimatedInstallDate && 
    ["corte", "enchape", "ensamble", "instalacion"].includes(p.status)
  ).sort((a: any, b: any) => 
    new Date(a.estimatedInstallDate).getTime() - new Date(b.estimatedInstallDate).getTime()
  );

  // Cotizaciones
  const draftQuotations = quotations.filter((q: any) => q.status === "draft");
  const activeQuotations = quotations.filter((q: any) => q.status === "sent");

  // Cotizaciones por vencer (vencen en 3 días o menos)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const expiringQuotations = quotations.filter((q: any) => {
    if (q.status !== "sent") return false;
    const validUntil = new Date(q.validUntil);
    return validUntil <= threeDaysFromNow && validUntil >= today;
  });

  // Tareas del usuario
  const myTasks = tasks.filter((t: any) => t.assignedTo === user?.id && t.status !== "completada");

  // Formatear fecha
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Calcular días restantes
  const getDaysRemaining = (date: Date | string) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;
    return `${diffDays} días`;
  };

  // Formatear precio
  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
  };

  // Obtener etiqueta del estado
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      cotizacion_enviada: "Cotización Enviada",
      cotizacion_aprobada: "Cotización Aprobada",
      adelanto_recibido: "Adelanto Recibido",
      en_diseno: "En Diseño",
      pendiente_cliente: "Pendiente Cliente",
      aprobacion_final: "Aprobación Final",
      despiece: "En Despiece",
      corte: "En Corte",
      enchape: "En Enchape",
      ensamble: "En Ensamble",
      listo_instalacion: "Listo Instalación",
      instalacion_programada: "Instalación Programada",
      entregado: "Entregado",
    };
    return statusLabels[status] || status;
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      cotizacion_enviada: "bg-blue-100 text-blue-700",
      cotizacion_aprobada: "bg-emerald-100 text-emerald-700",
      adelanto_recibido: "bg-green-100 text-green-700",
      en_diseno: "bg-purple-100 text-purple-700",
      pendiente_cliente: "bg-yellow-100 text-yellow-700",
      aprobacion_final: "bg-indigo-100 text-indigo-700",
      despiece: "bg-orange-100 text-orange-700",
      corte: "bg-amber-100 text-amber-700",
      enchape: "bg-rose-100 text-rose-700",
      ensamble: "bg-pink-100 text-pink-700",
      listo_instalacion: "bg-cyan-100 text-cyan-700",
      instalacion_programada: "bg-teal-100 text-teal-700",
      entregado: "bg-gray-100 text-gray-700",
    };
    return statusColors[status] || "bg-gray-100 text-gray-700";
  };

  // Manejar programación de instalación
  const handleScheduleInstall = () => {
    if (!scheduleDialog || !installDate) return;
    updateInstallDate.mutate({
      projectId: scheduleDialog.projectId,
      estimatedInstallDate: new Date(installDate + 'T12:00:00'),
      reason: "Instalación programada por comercial"
    });
  };

  // Enviar mensaje de cumpleaños por WhatsApp
  const sendBirthdayWhatsApp = (client: any) => {
    const phone = (client.whatsappPhone || client.phone || "").replace(/\D/g, '');
    if (!phone) {
      toast.error("El cliente no tiene número de WhatsApp registrado");
      return;
    }
    const message = encodeURIComponent(
      `🎂 ¡Feliz cumpleaños, ${client.name}! 🎉\n\n` +
      `De parte de todo el equipo de INNOVAR Cocinas Integrales, te deseamos un día lleno de alegría y bendiciones.\n\n` +
      `¡Que todos tus sueños se hagan realidad! 💕\n\n` +
      `Un abrazo,\n${user?.name || 'INNOVAR Cocinas'}`
    );
    window.open(`https://wa.me/57${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    setLocation("/login");
    return null;
  }

  // Solo comercial, admin y super_admin pueden acceder
  if (!["comercial", "admin", "super_admin"].includes(user.role)) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link href="/">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-10 sm:h-12 md:h-14 w-auto cursor-pointer object-contain"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Calendario</Button>
              </Link>
              <Link href="/quotations">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Cotizaciones</Button>
              </Link>
              <Link href="/clients">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Clientes</Button>
              </Link>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Proyectos</Button>
              </Link>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Mis Tareas</Button>
              </Link>
              <div className="ml-2">
                <NotificationBell />
              </div>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <span className="text-xs text-pink-600 hidden lg:block">Comercial</span>
                <span className="text-sm font-medium hidden lg:block">{user?.name}</span>
                <LogoutButton />
              </div>
            </nav>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-3 md:hidden">
              <NotificationBell />
              <MobileNav />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section con Logo y Contacto */}
      <section className="py-5 md:py-6">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            {/* Logo grande */}
            <div className="flex justify-center">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-16 sm:h-20 md:h-24 w-auto"
              />
            </div>
            
            {/* Información de contacto */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
              <a href="tel:3136802025" className="flex items-center gap-1 hover:text-pink-600 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                <span>313 680 2025</span>
              </a>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">K9 vía Cerritos a Pereira</span>
                <span className="sm:hidden">Cerritos, Pereira</span>
              </span>
              <a href="https://innovarcocinasintegrales.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-pink-600 transition-colors">
                <Globe className="h-3.5 w-3.5" />
                <span>Sitio Web</span>
              </a>
              <a 
                href="https://wa.me/573136802025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-[#25D366] text-white px-2.5 py-1 rounded-full hover:bg-[#128C7E] transition-colors font-medium text-xs"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Título del Portal - Banner Rosa Elegante */}
            <div className="mt-4 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xl">
              <div className="flex items-center justify-center gap-3 mb-1">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Portal Comercial</h1>
              </div>
              <p className="text-white/90 text-sm md:text-base">Conecta clientes con sus sueños</p>
              <p className="mt-2 text-white/80 text-sm">
                ¡Hola, <span className="font-bold text-white">{user?.name || "Usuario"}</span>! 👋
              </p>
            </div>

            {/* Frase Motivacional Diaria */}
            <div className="mt-4">
              <DailyMotivation userName={user?.name || undefined} userBirthDate={user?.birthDate ? new Date(user.birthDate) : undefined} />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-8 space-y-6">
        {/* Cumpleaños de Clientes */}
        {upcomingBirthdays.length > 0 && (
          <section>
            <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-100 p-2 rounded-full">
                    <Cake className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle className="text-pink-800 flex items-center gap-2">
                      🎂 Cumpleaños de Clientes
                      <Heart className="h-4 w-4 text-pink-500 animate-pulse" />
                    </CardTitle>
                    <CardDescription className="text-pink-600">
                      ¡No olvides felicitarlos! Un detalle marca la diferencia 💕
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingBirthdays.slice(0, 5).map((client: any) => (
                  <div key={client.id} className="bg-white rounded-lg p-3 border border-pink-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${client.daysUntil === 0 ? 'bg-pink-500 text-white animate-bounce' : 'bg-pink-100 text-pink-600'}`}>
                          <Gift className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{client.name}</h3>
                          <p className="text-sm text-pink-600">
                            {client.daysUntil === 0 ? (
                              <span className="font-bold">🎉 ¡Hoy es su cumpleaños!</span>
                            ) : client.daysUntil === 1 ? (
                              <span>Mañana - {formatDate(client.birthdayDate)}</span>
                            ) : (
                              <span>En {client.daysUntil} días - {formatDate(client.birthdayDate)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => sendBirthdayWhatsApp(client)}
                        className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md"
                        size="sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Felicitar por WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Resumen del Día - IGUAL QUE CEO */}
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" />
            Resumen del Día
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/projects">
              <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{activeProjects.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/90">Proyectos Activos</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/calendar">
              <Card className="bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{pendingAppointments.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/90">Citas Pendientes</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/quotations">
              <Card className="bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{quotations.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/90">Cotizaciones</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/tasks">
              <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{myTasks.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/90">Mis Tareas</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Acciones Rápidas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-pink-500" />
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <CreateQuickClientDialog 
              trigger={
                <Button className="h-16 text-lg gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg hover:shadow-xl transition-all w-full">
                  <Users className="h-5 w-5" />
                  + Nuevo Cliente
                </Button>
              }
            />
            <Link href="/admin?tab=appointments">
              <Button className="w-full h-16 text-lg gap-2 bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all">
                <Calendar className="h-5 w-5" />
                + Nueva Cita
              </Button>
            </Link>
            <Link href="/quotation/new">
              <Button className="w-full h-16 text-lg gap-2 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all">
                <FileText className="h-5 w-5" />
                + Nueva Cotización
              </Button>
            </Link>
            <Link href="/tasks">
              <Button className="w-full h-16 text-lg gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all">
                <CheckCircle className="h-5 w-5" />
                Mis Tareas
              </Button>
            </Link>
          </div>
        </section>

        {/* PROYECTOS ACTIVOS - IGUAL QUE CEO */}
        {activeProjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-pink-500" />
                Proyectos Activos
              </h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="text-pink-600 font-semibold">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeProjects.slice(0, 6).map((project: any, index: number) => {
                const projectColors = [
                  "bg-gradient-to-br from-pink-500 to-rose-600",
                  "bg-gradient-to-br from-purple-500 to-indigo-600",
                  "bg-gradient-to-br from-orange-500 to-amber-600",
                  "bg-gradient-to-br from-fuchsia-500 to-pink-600",
                  "bg-gradient-to-br from-teal-500 to-emerald-600",
                  "bg-gradient-to-br from-blue-500 to-cyan-600",
                ];
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className={`${projectColors[index % 6]} hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-md hover:scale-[1.02] overflow-hidden`}>
                      <CardContent className="p-4 text-white">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="bg-white/20 p-2 rounded-lg">
                            {project.workType === "cocina" && <span className="text-xl">🍳</span>}
                            {project.workType === "closet" && <span className="text-xl">👔</span>}
                            {project.workType === "puertas" && <span className="text-xl">🛏</span>}
                            {project.workType === "centro_tv" && <span className="text-xl">📺</span>}
                            {!project.workType && <Briefcase className="h-5 w-5" />}
                          </div>
                          <Badge 
                            variant="outline" 
                            className="bg-white/20 text-white border-white/30 font-semibold text-xs"
                          >
                            {getStatusLabel(project.status)}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-white truncate text-sm md:text-base">{project.name}</h3>
                        <p className="text-xs text-white/80 mt-1">
                          {project.client?.name || "Sin cliente asignado"}
                        </p>
                        {project.estimatedInstallDate && (
                          <p className="text-xs text-white/70 mt-1">
                            📅 Entrega: {formatDate(project.estimatedInstallDate)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Programar Instalación - Proyectos en Ensamble */}
        {projectsInEnsamble.length > 0 && (
          <section>
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Wrench className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-orange-800">🔔 Programar Instalación</CardTitle>
                    <CardDescription className="text-orange-700">
                      Proyectos en ensamble - Coordinar fecha con cliente y taller
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectsInEnsamble.map((project: any) => (
                  <div key={project.id} className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{project.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-600">
                          {project.client?.whatsappPhone && (
                            <a href={`tel:${project.client.whatsappPhone}`} className="flex items-center gap-1 hover:text-pink-600">
                              <Phone className="h-4 w-4" />
                              {project.client.whatsappPhone}
                            </a>
                          )}
                          {project.tentativeInstallDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Entrega: {formatDate(project.tentativeInstallDate)}
                              <Badge variant="outline" className="ml-1 text-orange-600 border-orange-300">
                                {getDaysRemaining(project.tentativeInstallDate)}
                              </Badge>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => setScheduleDialog({
                          projectId: project.id,
                          projectName: project.name,
                          tentativeDate: project.tentativeInstallDate ? new Date(project.tentativeInstallDate) : null
                        })}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Programar Instalación
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Instalaciones Programadas */}
        {projectsWithInstallDate.length > 0 && (
          <section>
            <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <Truck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-emerald-800">🗓️ Instalaciones Programadas</CardTitle>
                    <CardDescription className="text-emerald-700">
                      Próximas instalaciones confirmadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectsWithInstallDate.slice(0, 5).map((project: any) => {
                    const daysRemaining = getDaysRemaining(project.estimatedInstallDate);
                    const isUrgent = new Date(project.estimatedInstallDate) <= threeDaysFromNow;
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className={`bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isUrgent ? 'border-yellow-300' : 'border-emerald-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-slate-800">{project.name}</h3>
                              <p className="text-sm text-slate-500">
                                {formatDate(project.estimatedInstallDate)} • {getStatusLabel(project.status)}
                              </p>
                            </div>
                            <Badge className={isUrgent ? 'bg-yellow-500' : 'bg-emerald-500'}>
                              {daysRemaining}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Citas del Día */}
          <section>
            <Card className="shadow-md border-pink-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-100 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle className="text-pink-800">📅 Citas del Día</CardTitle>
                    <CardDescription>
                      {todayAppointments.length === 0 
                        ? "No hay citas programadas para hoy" 
                        : `${todayAppointments.length} cita(s) pendiente(s)`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Sin citas para hoy</p>
                ) : (
                  <div className="space-y-2">
                    {todayAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{apt.client?.name || "Cliente"}</h3>
                            <p className="text-sm text-slate-500">
                              {new Date(apt.scheduledDate).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {apt.client?.whatsappPhone && (
                            <a href={`tel:${apt.client.whatsappPhone}`}>
                              <Button size="sm" variant="outline" className="border-pink-300 text-pink-600 hover:bg-pink-100">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/calendar">
                  <Button variant="ghost" className="w-full mt-3 text-pink-600 hover:text-pink-700 hover:bg-pink-50">
                    Ver todas las citas <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Cotizaciones Activas */}
          <section>
            <Card className="shadow-md border-pink-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-rose-100 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-rose-800">📋 Cotizaciones Activas</CardTitle>
                    <CardDescription>
                      {activeQuotations.length === 0 
                        ? "No hay cotizaciones pendientes" 
                        : `${activeQuotations.length} cotización(es) esperando aprobación`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeQuotations.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Sin cotizaciones activas</p>
                ) : (
                  <div className="space-y-2">
                    {activeQuotations.slice(0, 5).map((quot: any) => (
                      <div key={quot.id} className="bg-rose-50 rounded-lg p-3 border border-rose-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <Link href={`/quotation/${quot.id}`} className="flex-1 cursor-pointer">
                            <div>
                              <h3 className="font-medium">{quot.client?.name || quot.quotationNumber}</h3>
                              <p className="text-sm text-slate-500">
                                {formatPrice(quot.total)} • Vence: {formatDate(quot.validUntil)}
                              </p>
                            </div>
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-rose-600 border-rose-300">
                              {getDaysRemaining(quot.validUntil)}
                            </Badge>
                            {quot.client?.whatsappPhone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const phone = quot.client.whatsappPhone.replace(/\D/g, '');
                                  const message = encodeURIComponent(
                                    `Hola ${quot.client.name}, le escribo de INNOVAR Cocinas Integrales. ` +
                                    `Quería hacer seguimiento a la cotización ${quot.quotationNumber} por valor de ${formatPrice(quot.total)}. ` +
                                    `¿Ha tenido oportunidad de revisarla?`
                                  );
                                  window.open(`https://wa.me/57${phone}?text=${message}`, '_blank');
                                }}
                              >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/quotations">
                  <Button variant="ghost" className="w-full mt-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                    Ver todas las cotizaciones <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Cotizaciones Por Vencer */}
        {expiringQuotations.length > 0 && (
          <section>
            <Card className="border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-red-100 p-2 rounded-full animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-red-800">⚠️ Por Vencer</CardTitle>
                    <CardDescription className="text-red-700">
                      Cotizaciones que vencen en los próximos 3 días - ¡Contactar al cliente!
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringQuotations.map((quot: any) => (
                    <div key={quot.id} className="bg-white rounded-lg p-3 border border-red-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-800">{quot.client?.name || quot.quotationNumber}</h3>
                          <p className="text-sm text-red-600">
                            {formatPrice(quot.total)} • Vence: {formatDate(quot.validUntil)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {quot.client?.whatsappPhone && (
                            <a href={`tel:${quot.client.whatsappPhone}`}>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
                                <Phone className="h-4 w-4 mr-1" />
                                Llamar
                              </Button>
                            </a>
                          )}
                          <Link href={`/quotation/${quot.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600">
                              Ver Cotización
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Tareas Pendientes */}
        {myTasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-pink-500" />
                Mis Tareas Pendientes
              </h2>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-pink-600 font-semibold">
                  Ver todas <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myTasks.slice(0, 4).map((task: any, index: number) => {
                const taskColors = [
                  "bg-gradient-to-br from-pink-500 to-rose-600",
                  "bg-gradient-to-br from-violet-500 to-purple-600",
                  "bg-gradient-to-br from-fuchsia-500 to-pink-600",
                  "bg-gradient-to-br from-rose-500 to-pink-600",
                ];
                const priorityIcons: Record<string, string> = {
                  alta: "🔥",
                  media: "⚡",
                  baja: "✅",
                };
                return (
                  <Link key={task.id} href="/tasks">
                    <Card className={`${taskColors[index % 4]} hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-md hover:scale-[1.02] overflow-hidden`}>
                      <CardContent className="p-4 text-white">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="bg-white/20 p-2 rounded-lg">
                            <ClipboardList className="h-5 w-5" />
                          </div>
                          <Badge 
                            variant="outline" 
                            className="bg-white/20 text-white border-white/30 font-semibold text-xs"
                          >
                            {priorityIcons[task.priority || "media"]} {task.priority === "alta" ? "Urgente" : task.priority === "media" ? "Media" : "Baja"}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-white truncate text-sm md:text-base">{task.title}</h3>
                        <p className="text-xs text-white/80 mt-1 line-clamp-1">
                          {task.description || "Sin descripción"}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Botón flotante de WhatsApp */}
      <a 
        href="https://wa.me/573136802025" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#128C7E] transition-colors z-50"
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* Dialog para programar instalación */}
      <Dialog open={!!scheduleDialog} onOpenChange={(open) => !open && setScheduleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Instalación</DialogTitle>
            <DialogDescription>
              {scheduleDialog?.projectName}
              {scheduleDialog?.tentativeDate && (
                <span className="block mt-1">
                  Fecha de entrega (día 25): {formatDate(scheduleDialog.tentativeDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="installDate">Fecha de Instalación</Label>
              <Input
                id="installDate"
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-slate-500 mt-1">
                Programa la instalación días antes de la fecha de entrega
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleScheduleInstall}
              disabled={!installDate || updateInstallDate.isPending}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            >
              {updateInstallDate.isPending ? "Guardando..." : "Confirmar Fecha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
