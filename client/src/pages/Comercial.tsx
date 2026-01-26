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
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";

export default function Comercial() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [scheduleDialog, setScheduleDialog] = useState<{ projectId: number; projectName: string; tentativeDate: Date | null } | null>(null);
  const [installDate, setInstallDate] = useState("");

  const utils = trpc.useUtils();
  
  // Queries
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.list.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.list.useQuery();
  const { data: projects = [], isLoading: loadingProjects } = trpc.projects.list.useQuery();

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

  // Citas del día
  const todayAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.scheduledDate);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === today.getTime() && apt.status === "pending";
  });

  // Proyectos en ensamble (para programar instalación)
  const projectsInEnsamble = projects.filter((p: any) => p.status === "ensamble");

  // Proyectos con instalación programada (tienen fecha de instalación y están en producción)
  const projectsWithInstallDate = projects.filter((p: any) => 
    p.estimatedInstallDate && 
    ["corte", "enchape", "ensamble", "instalacion"].includes(p.status)
  ).sort((a: any, b: any) => 
    new Date(a.estimatedInstallDate).getTime() - new Date(b.estimatedInstallDate).getTime()
  );

  // Cotizaciones activas (enviadas, pendientes de aprobación)
  const activeQuotations = quotations.filter((q: any) => q.status === "sent");

  // Cotizaciones por vencer (vencen en 3 días o menos)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const expiringQuotations = quotations.filter((q: any) => {
    if (q.status !== "sent") return false;
    const validUntil = new Date(q.validUntil);
    return validUntil <= threeDaysFromNow && validUntil >= today;
  });

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

  // Manejar programación de instalación
  const handleScheduleInstall = () => {
    if (!scheduleDialog || !installDate) return;
    updateInstallDate.mutate({
      projectId: scheduleDialog.projectId,
      estimatedInstallDate: new Date(installDate + 'T12:00:00'),
      reason: "Instalación programada por comercial"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <img src="/logo-light.png" alt="INNOVAR" className="h-10 cursor-pointer" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Panel Comercial</h1>
                <p className="text-sm text-slate-500">Hola, {user.name} 👋</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">Volver al Inicio</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Acciones Rápidas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CreateQuickClientDialog 
              trigger={
                <Button className="h-16 text-lg gap-2 bg-emerald-500 hover:bg-emerald-600">
                  <Users className="h-5 w-5" />
                  + Nuevo Cliente
                </Button>
              }
            />
            <Link href="/admin?tab=appointments">
              <Button className="w-full h-16 text-lg gap-2 bg-blue-500 hover:bg-blue-600">
                <Calendar className="h-5 w-5" />
                + Nueva Cita
              </Button>
            </Link>
            <Link href="/quotation/new">
              <Button className="w-full h-16 text-lg gap-2 bg-cyan-500 hover:bg-cyan-600">
                <FileText className="h-5 w-5" />
                + Nueva Cotización
              </Button>
            </Link>
          </div>
        </section>

        {/* Programar Instalación - Proyectos en Ensamble */}
        {projectsInEnsamble.length > 0 && (
          <section>
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-800">🔔 Programar Instalación</CardTitle>
                </div>
                <CardDescription className="text-orange-700">
                  Proyectos en ensamble - Coordinar fecha con cliente y taller
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectsInEnsamble.map((project: any) => (
                  <div key={project.id} className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{project.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-600">
                          {project.client?.phone && (
                            <a href={`tel:${project.client.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                              <Phone className="h-4 w-4" />
                              {project.client.phone}
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
                        className="bg-orange-500 hover:bg-orange-600"
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
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-800">🗓️ Instalaciones Programadas</CardTitle>
                </div>
                <CardDescription className="text-green-700">
                  Próximas instalaciones confirmadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectsWithInstallDate.slice(0, 5).map((project: any) => {
                    const daysRemaining = getDaysRemaining(project.estimatedInstallDate);
                    const isUrgent = new Date(project.estimatedInstallDate) <= threeDaysFromNow;
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className={`bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isUrgent ? 'border-yellow-300' : 'border-green-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-slate-800">{project.name}</h3>
                              <p className="text-sm text-slate-500">
                                {formatDate(project.estimatedInstallDate)} • Estado: {project.status}
                              </p>
                            </div>
                            <Badge className={isUrgent ? 'bg-yellow-500' : 'bg-green-500'}>
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <CardTitle>📅 Citas del Día</CardTitle>
                </div>
                <CardDescription>
                  {todayAppointments.length === 0 
                    ? "No hay citas programadas para hoy" 
                    : `${todayAppointments.length} cita(s) pendiente(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Sin citas para hoy</p>
                ) : (
                  <div className="space-y-2">
                    {todayAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-slate-50 rounded-lg p-3 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{apt.client?.name || "Cliente"}</h3>
                            <p className="text-sm text-slate-500">
                              {new Date(apt.scheduledDate).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {apt.client?.phone && (
                            <a href={`tel:${apt.client.phone}`}>
                              <Button size="sm" variant="outline">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/admin?tab=appointments">
                  <Button variant="ghost" className="w-full mt-3 text-blue-600">
                    Ver todas las citas <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Cotizaciones Activas */}
          <section>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <CardTitle>📋 Cotizaciones Activas</CardTitle>
                </div>
                <CardDescription>
                  {activeQuotations.length === 0 
                    ? "No hay cotizaciones pendientes" 
                    : `${activeQuotations.length} cotización(es) esperando aprobación`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeQuotations.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Sin cotizaciones activas</p>
                ) : (
                  <div className="space-y-2">
                    {activeQuotations.slice(0, 5).map((quot: any) => (
                      <Link key={quot.id} href={`/quotation/${quot.id}`}>
                        <div className="bg-slate-50 rounded-lg p-3 border hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{quot.client?.name || quot.quotationNumber}</h3>
                              <p className="text-sm text-slate-500">
                                {formatPrice(quot.total)} • Vence: {formatDate(quot.validUntil)}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-cyan-600">
                              {getDaysRemaining(quot.validUntil)}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <Link href="/admin?tab=quotations">
                  <Button variant="ghost" className="w-full mt-3 text-cyan-600">
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
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-800">⚠️ Por Vencer</CardTitle>
                </div>
                <CardDescription className="text-red-700">
                  Cotizaciones que vencen en los próximos 3 días - ¡Contactar al cliente!
                </CardDescription>
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
                          {quot.client?.phone && (
                            <a href={`tel:${quot.client.phone}`}>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
                                <Phone className="h-4 w-4 mr-1" />
                                Llamar
                              </Button>
                            </a>
                          )}
                          <Link href={`/quotation/${quot.id}`}>
                            <Button size="sm" className="bg-red-500 hover:bg-red-600">
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
      </main>

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
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateInstallDate.isPending ? "Guardando..." : "Confirmar Fecha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
