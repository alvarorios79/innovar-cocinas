import { useState, useEffect } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { VisualCalendar } from "@/components/VisualCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Phone, Calculator, CheckCircle2, ArrowRight, MapPin, MessageCircle, Globe } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";
import { TeamDashboard } from "@/components/TeamDashboard";
import { OperarioDashboard } from "@/components/OperarioDashboard";
import { DesignerChecklist } from "@/components/DesignerChecklist";
import { ProductionCalendar } from "@/components/ProductionCalendar";
import { OperatorDailyProjects } from "@/components/OperatorDailyProjects";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"appointment" | "advisory" | "estimate">("appointment");
  
  // Query para contar proyectos nuevos según el rol
  const { data: projects = [] } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated && ["comercial", "disenador", "jefe_taller", "operario"].includes(user?.role || ""),
  });
  
  // Calcular proyectos "nuevos" según el rol
  const getNewProjectsCount = () => {
    if (!user?.role) return 0;
    if (user.role === "comercial") {
      // Para comercial: proyectos activos (no entregados ni cancelados)
      return (projects as any[]).filter((p: any) => !['entregado', 'cancelado'].includes(p.status)).length;
    }
    if (user.role === "disenador") {
      return (projects as any[]).filter((p: any) => p.status === "adelanto_recibido").length;
    }
    if (user.role === "jefe_taller") {
      return (projects as any[]).filter((p: any) => p.status === "despiece").length;
    }
    if (user.role === "operario") {
      return (projects as any[]).filter((p: any) => ["corte", "enchape", "ensamble"].includes(p.status)).length;
    }
    return 0;
  };
  
  const newProjectsCount = getNewProjectsCount();

  // Estado para formulario de cita
  const [appointmentForm, setAppointmentForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workTypes: [] as ("cocina" | "closet" | "puertas" | "centro_tv")[], // Cambiado a array para selección múltiple
    notes: "",
  });
  
  // Estado separado para fecha y hora de la cita
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  // Estado para formulario de asesoramiento
  const [advisoryForm, setAdvisoryForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workType: "",
    preferredCallTime: "",
    notes: "",
  });

  // Estado para formulario de estimado
  const [estimateForm, setEstimateForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workType: "",
    kitchenShape: "",
    linearLength: "",
    height: "",
    materialType: "",
    additionalDetails: "",
  });

  // Obtener datos del cliente si está autenticado
  const { data: clientProfile } = trpc.clients.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Pre-llenar formularios con datos del cliente
  useEffect(() => {
    if (clientProfile) {
      const commonData = {
        name: clientProfile.name || "",
        email: clientProfile.email || "",
        whatsappPhone: clientProfile.whatsappPhone || "",
        address: clientProfile.address || "",
      };

      // Pre-llenar formulario de citas
      setAppointmentForm(prev => ({
        ...prev,
        ...commonData,
      }));

      // Pre-llenar formulario de asesoramiento
      setAdvisoryForm(prev => ({
        ...prev,
        ...commonData,
      }));

      // Pre-llenar formulario de estimado
      setEstimateForm(prev => ({
        ...prev,
        ...commonData,
      }));
    }
  }, [clientProfile]);

  // Medidor selector: solo para admin/comercial
  const canAssignMedidor = isAuthenticated && ["admin", "super_admin", "comercial"].includes(user?.role || "");
  const [selectedMedidorId, setSelectedMedidorId] = useState<number | null>(null);
  const { data: allUsers = [] } = trpc.userManagement.listAll.useQuery(undefined, { enabled: canAssignMedidor });
  const medidores = (allUsers as any[]).filter((u: any) => u.role === "medidor");

  const createClientMutation = trpc.clients.getOrCreateByWhatsApp.useMutation();
  const createAppointmentMutation = trpc.appointments.create.useMutation();
  const assignMedidorMutation = trpc.appointments.assignMedidor.useMutation();
  const createAdvisoryMutation = trpc.advisory.create.useMutation();
  const createEstimateMutation = trpc.estimates.create.useMutation();

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (appointmentForm.workTypes.length === 0) {
      toast.error("Por favor selecciona al menos un tipo de trabajo");
      return;
    }
    
    if (!appointmentDate || !appointmentTime) {
      toast.error("Por favor selecciona fecha y horario para la cita");
      return;
    }

    try {
      // Crear o obtener cliente
      const client = await createClientMutation.mutateAsync({
        name: appointmentForm.name,
        email: appointmentForm.email || undefined,
        whatsappPhone: appointmentForm.whatsappPhone,
        address: appointmentForm.address || undefined,
      });

      if (!client) {
        toast.error("Error al crear el cliente");
        return;
      }
      
      // Crear cita - enviar fecha y hora como strings separados para evitar problemas de zona horaria
      const result = await createAppointmentMutation.mutateAsync({
        clientId: client.id,
        workTypes: appointmentForm.workTypes,
        scheduledDateStr: appointmentDate, // "YYYY-MM-DD"
        scheduledTimeStr: appointmentTime, // "HH:MM"
        notes: appointmentForm.notes || undefined,
      });

      // Si admin/comercial asignó un medidor, guardar la asignación
      if (canAssignMedidor && selectedMedidorId && result.id) {
        await assignMedidorMutation.mutateAsync({
          appointmentId: result.id,
          medidorId: selectedMedidorId,
        });
      }

      toast.success("¡Cita agendada exitosamente!", {
        description: "Te contactaremos pronto por WhatsApp al " + appointmentForm.whatsappPhone,
      });

      // Abrir WhatsApp Business para notificar
      if (result.whatsappLink) {
        window.open(result.whatsappLink, "_blank");
      }

      // Limpiar formulario
      setAppointmentForm({
        name: "",
        email: "",
        whatsappPhone: "",
        address: "",
        workTypes: [],
        notes: "",
      });
      setAppointmentDate("");
      setAppointmentTime("");
      setSelectedMedidorId(null);
    } catch (error: any) {
      // Mostrar mensaje específico si el horario está ocupado
      if (error?.message?.includes("ocupado")) {
        toast.error("Horario no disponible", {
          description: "Este horario ya está ocupado. Por favor selecciona otro horario.",
        });
      } else {
        toast.error("Error al agendar la cita");
      }
      console.error(error);
    }
  };

  const handleAdvisorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!advisoryForm.workType) {
      toast.error("Por favor selecciona el tipo de trabajo");
      return;
    }

    try {
      const client = await createClientMutation.mutateAsync({
        name: advisoryForm.name,
        email: advisoryForm.email || undefined,
        whatsappPhone: advisoryForm.whatsappPhone,
        address: advisoryForm.address || undefined,
      });

      if (!client) {
        toast.error("Error al crear el cliente");
        return;
      }

      const result = await createAdvisoryMutation.mutateAsync({
        clientId: client.id,
        workType: advisoryForm.workType as any,
        notes: advisoryForm.notes || undefined,
      });

      toast.success("¡Solicitud de asesoramiento enviada!", {
        description: "Un comercial te contactará pronto al " + advisoryForm.whatsappPhone,
      });

      // Abrir WhatsApp Business para notificar
      if (result.whatsappLink) {
        window.open(result.whatsappLink, "_blank");
      }

      setAdvisoryForm({
        name: "",
        email: "",
        whatsappPhone: "",
        address: "",
        workType: "",
        preferredCallTime: "",
        notes: "",
      });
    } catch (error) {
      toast.error("Error al enviar la solicitud");
      console.error(error);
    }
  };

  const handleEstimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!estimateForm.workType) {
      toast.error("Por favor selecciona el tipo de trabajo");
      return;
    }

    try {
      const client = await createClientMutation.mutateAsync({
        name: estimateForm.name,
        email: estimateForm.email || undefined,
        whatsappPhone: estimateForm.whatsappPhone,
        address: estimateForm.address || undefined,
      });

      if (!client) {
        toast.error("Error al crear el cliente");
        return;
      }

      const result = await createEstimateMutation.mutateAsync({
        clientId: client.id,
        workType: estimateForm.workType as any,
        kitchenShape: estimateForm.kitchenShape ? estimateForm.kitchenShape as any : undefined,
        linearLength: estimateForm.linearLength ? parseFloat(estimateForm.linearLength) : undefined,
        height: estimateForm.height ? parseFloat(estimateForm.height) : undefined,
        materialType: estimateForm.materialType ? estimateForm.materialType as any : undefined,
        additionalDetails: estimateForm.additionalDetails || undefined,
      });

      toast.success("¡Estimado enviado exitosamente!", {
        description: "Revisaremos tu información y te contactaremos pronto",
      });

      // Abrir WhatsApp Business para notificar
      if (result.whatsappLink) {
        window.open(result.whatsappLink, "_blank");
      }

      setEstimateForm({
        name: "",
        email: "",
        whatsappPhone: "",
        address: "",
        workType: "",
        kitchenShape: "",
        linearLength: "",
        height: "",
        materialType: "",
        additionalDetails: "",
      });
    } catch (error) {
      toast.error("Error al enviar el estimado");
      console.error(error);
    }
  };

  // Roles del equipo de trabajo que ven el TeamDashboard
  const teamRoles = ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario", "medidor", "contador"];
  const isTeamMember = isAuthenticated && user?.role && teamRoles.includes(user.role);

  // Redirigir comercial via useEffect (no durante render)
  useEffect(() => {
    if (isAuthenticated && user?.role === "comercial") {
      setLocation("/comercial");
    }
  }, [isAuthenticated, user?.role]);

  // Redirigir medidor a su portal
  useEffect(() => {
    if (isAuthenticated && user?.role === "medidor") {
      setLocation("/medidor");
    }
  }, [isAuthenticated, user?.role]);

  // Si es operario, mostrar el OperarioDashboard simplificado
  if (isAuthenticated && user?.role === "operario") {
    return <OperarioDashboard />;
  }

  // Si es comercial, mostrar null mientras redirige
  if (isAuthenticated && user?.role === "comercial") {
    return null;
  }

  // Si es medidor, mostrar null mientras redirige a su portal
  if (isAuthenticated && user?.role === "medidor") {
    return null;
  }

  // Si es miembro del equipo, mostrar el TeamDashboard
  if (isTeamMember) {
    return <TeamDashboard />;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          {/* Main header */}
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link href="/">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-12 sm:h-14 md:h-14 w-auto cursor-pointer object-contain"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-wrap">
              {isAuthenticated ? (
                <>
                  <Link href="/portal">
                    <Button variant="ghost" size="sm" className="text-sm">Mi Portal</Button>
                  </Link>
                  {/* Enlaces para roles de trabajo */}
                  {["disenador", "jefe_taller", "operario"].includes(user?.role || "") && (
                    <>
                      <Link href="/projects">
                        <Button variant="ghost" size="sm" className="text-sm relative">
                          Proyectos
                          {newProjectsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                              {newProjectsCount}
                            </span>
                          )}
                        </Button>
                      </Link>
                      <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="text-sm">Tareas</Button>
                      </Link>
                      {user?.role === "jefe_taller" && (
                        <Link href="/calendar">
                          <Button variant="ghost" size="sm" className="text-sm">Calendario</Button>
                        </Link>
                      )}
                    </>
                  )}
                  {/* Enlaces para comercial */}
                  {user?.role === "comercial" && (
                    <>
                      <Link href="/projects">
                        <Button variant="ghost" size="sm" className="text-sm relative">
                          Proyectos
                          {newProjectsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                              {newProjectsCount}
                            </span>
                          )}
                        </Button>
                      </Link>
                      <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="text-sm">Tareas</Button>
                      </Link>
                      <Link href="/appointments-calendar">
                        <Button variant="ghost" size="sm" className="text-sm">Calendario</Button>
                      </Link>
                      <Link href="/comercial">
                        <Button variant="ghost" size="sm" className="text-sm">Panel Comercial</Button>
                      </Link>
                    </>
                  )}
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <>
                      <Link href="/quotations">
                        <Button variant="ghost" size="sm" className="text-xs">Cotizaciones</Button>
                      </Link>
                      <Link href="/projects">
                        <Button variant="ghost" size="sm" className="text-xs">Proyectos</Button>
                      </Link>
                      <Link href="/appointments-calendar">
                        <Button variant="ghost" size="sm" className="text-xs">Calendario</Button>
                      </Link>
                      <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="text-xs">Tareas</Button>
                      </Link>
                      <Link href="/admin">
                        <Button variant="ghost" size="sm" className="text-xs">Panel Admin</Button>
                      </Link>
                    </>
                  )}
                  <NotificationBell />
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/register">
                    <Button variant="outline" size="sm">Inscríbete</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm">Iniciar Sesión</Button>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 md:hidden">
              {!isAuthenticated && (
                <>
                  <Link href="/register">
                    <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-8">Inscríbete</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm" className="text-xs px-2 py-1 h-8">Iniciar</Button>
                  </Link>
                </>
              )}
              {isAuthenticated && <MobileNav />}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-6 md:py-8">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Logotipo principal grande y centrado */}
            <div className="flex justify-center mb-3 md:mb-4">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-24 sm:h-32 md:h-40 w-auto"
              />
            </div>
            
            {/* Información de contacto cerca del logo */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6 text-xs sm:text-sm text-muted-foreground mb-8 md:mb-12 px-4">
              <a href="tel:+573136802025" className="flex items-center gap-1 hover:text-primary transition-colors min-h-[44px]">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">313 680 2025</span>
              </a>
              <a 
                href="https://www.google.com/maps/place/Innovar-+Cocinas+integrales+Pereira/@4.802601,-75.8300704,18.22z/data=!4m14!1m7!3m6!1s0x8e388129491d7481:0x900411675d3b35be!2sInnovar-+Cocinas+integrales+Pereira!8m2!3d4.8026875!4d-75.8293125!16s%2Fg%2F11h5q2k28n!3m5!1s0x8e388129491d7481:0x900411675d3b35be!8m2!3d4.8026875!4d-75.8293125!16s%2Fg%2F11h5q2k28n?entry=ttu&g_ep=EgoyMDI2MDExMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors min-h-[44px]"
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">K9 vía Cerritos a Pereira</span>
                <span className="sm:hidden">Pereira</span>
              </a>
              <a 
                href="https://cocinasintegralespereira.co/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors min-h-[44px]"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Sitio Web</span>
              </a>
              <a 
                href="https://wa.me/573136802025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity min-h-[44px]"
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap font-medium">WhatsApp</span>
              </a>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight px-4">
              Transforma tu hogar con cocinas y closets de{" "}
              <span className="text-primary">calidad excepcional</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
              Diseño, fabricación e instalación de cocinas integrales, closets, puertas y centros de TV en Pereira
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Materiales premium</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Diseño personalizado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Instalación profesional</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forms Section */}
      <section className="py-12">
        <div className="container max-w-4xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="appointment" className="gap-1 sm:gap-2 flex-col sm:flex-row py-3 sm:py-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Agendar Cita</span>
                <span className="sm:hidden">Cita</span>
              </TabsTrigger>
              <TabsTrigger value="advisory" className="gap-1 sm:gap-2 flex-col sm:flex-row py-3 sm:py-2 text-xs sm:text-sm">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Asesoramiento</span>
                <span className="sm:hidden">Asesoría</span>
              </TabsTrigger>
              <TabsTrigger value="estimate" className="gap-1 sm:gap-2 flex-col sm:flex-row py-3 sm:py-2 text-xs sm:text-sm">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Estimado Previo</span>
                <span className="sm:hidden">Estimado</span>
              </TabsTrigger>
            </TabsList>

            {/* Formulario de Cita */}
            <TabsContent value="appointment">
              <Card>
                <CardHeader>
                  <CardTitle>Agenda tu cita</CardTitle>
                  <CardDescription>
                    Agenda una visita para que tomemos medidas y diseñemos tu proyecto personalizado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="apt-name">Nombre completo *</Label>
                        <Input
                          id="apt-name"
                          required
                          value={appointmentForm.name}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apt-email">Correo electrónico *</Label>
                        <Input
                          id="apt-email"
                          type="email"
                          required
                          value={appointmentForm.email}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="apt-phone">Teléfono WhatsApp *</Label>
                        <Input
                          id="apt-phone"
                          required
                          placeholder="3136802025"
                          value={appointmentForm.whatsappPhone}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, whatsappPhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de trabajo * (puedes seleccionar varios)</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {([
                            { value: "cocina" as const, label: "Cocina Integral" },
                            { value: "closet" as const, label: "Closet" },
                            { value: "puertas" as const, label: "Puertas" },
                            { value: "centro_tv" as const, label: "Centro de TV" },
                          ] as const).map((option) => (
                            <label
                              key={option.value}
                              className={clsx(
                                "flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors",
                                appointmentForm.workTypes.includes(option.value)
                                  ? "bg-primary/10 border-primary"
                                  : "hover:bg-muted"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={appointmentForm.workTypes.includes(option.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAppointmentForm({
                                      ...appointmentForm,
                                      workTypes: [...appointmentForm.workTypes, option.value],
                                    });
                                  } else {
                                    setAppointmentForm({
                                      ...appointmentForm,
                                      workTypes: appointmentForm.workTypes.filter((t) => t !== option.value),
                                    });
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apt-address">Dirección *</Label>
                      <Input
                        id="apt-address"
                        required
                        value={appointmentForm.address}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, address: e.target.value })}
                      />
                    </div>

                    <VisualCalendar
                      selectedDate={appointmentDate}
                      selectedTime={appointmentTime}
                      onDateChange={setAppointmentDate}
                      onTimeChange={setAppointmentTime}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="apt-notes">Notas adicionales</Label>
                      <Textarea
                        id="apt-notes"
                        rows={4}
                        placeholder="Cuéntanos más sobre tu proyecto..."
                        value={appointmentForm.notes}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                      />
                    </div>

                    {/* Selector de medidor — solo visible para admin/comercial */}
                    {canAssignMedidor && (medidores as any[]).length > 0 && (
                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="apt-medidor">Asignar medidor (opcional)</Label>
                        <Select
                          value={selectedMedidorId ? String(selectedMedidorId) : "none"}
                          onValueChange={(val) => setSelectedMedidorId(val === "none" ? null : Number(val))}
                        >
                          <SelectTrigger id="apt-medidor">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {(medidores as any[]).map((m: any) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Resumen de confirmación antes de agendar */}
                    {appointmentDate && appointmentTime && (() => {
                      const [year, month, day] = appointmentDate.split('-').map(Number);
                      const dateObj = new Date(year, month - 1, day, 12, 0, 0);
                      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                      const dayName = dayNames[dateObj.getDay()];
                      const monthName = monthNames[dateObj.getMonth()];
                      const [hours, minutes] = appointmentTime.split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour > 12 ? hour - 12 : hour;
                      const timeFormatted = `${displayHour}:${minutes} ${ampm}`;
                      return (
                        <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-primary font-semibold text-base">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Confirma tu cita</span>
                          </div>
                          <div className="text-center py-2">
                            <p className="text-lg font-bold text-foreground">
                              {dayName} {day} de {monthName} de {year}
                            </p>
                            <p className="text-2xl font-bold text-primary mt-1">
                              {timeFormatted}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Duración aproximada: 1 hora y 30 minutos
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Verifica que el día y la hora sean correctos antes de presionar "Agendar Cita"
                          </p>
                        </div>
                      );
                    })()}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={!appointmentDate || !appointmentTime || createAppointmentMutation.isPending}
                    >
                      {createAppointmentMutation.isPending ? (
                        <>Agendando...</>
                      ) : (
                        <>
                          Agendar Cita
                          <Calendar className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Formulario de Asesoramiento */}
            <TabsContent value="advisory">
              <Card>
                <CardHeader>
                  <CardTitle>Solicita asesoramiento telefónico</CardTitle>
                  <CardDescription>
                    Un comercial te contactará para explicarte todas las opciones y resolver tus dudas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdvisorySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adv-name">Nombre completo *</Label>
                        <Input
                          id="adv-name"
                          required
                          value={advisoryForm.name}
                          onChange={(e) => setAdvisoryForm({ ...advisoryForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adv-email">Correo electrónico</Label>
                        <Input
                          id="adv-email"
                          type="email"
                          value={advisoryForm.email}
                          onChange={(e) => setAdvisoryForm({ ...advisoryForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adv-phone">Teléfono WhatsApp *</Label>
                        <Input
                          id="adv-phone"
                          required
                          placeholder="3136802025"
                          value={advisoryForm.whatsappPhone}
                          onChange={(e) => setAdvisoryForm({ ...advisoryForm, whatsappPhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adv-work">Tipo de trabajo *</Label>
                        <Select
                          value={advisoryForm.workType}
                          onValueChange={(value) => setAdvisoryForm({ ...advisoryForm, workType: value })}
                        >
                          <SelectTrigger id="adv-work">
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cocina">Cocina Integral</SelectItem>
                            <SelectItem value="closet">Closet</SelectItem>
                            <SelectItem value="puertas">Puertas</SelectItem>
                            <SelectItem value="centro_tv">Centro de TV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adv-calltime">Horario preferido para llamada *</Label>
                      <Select
                        value={advisoryForm.preferredCallTime}
                        onValueChange={(value) => setAdvisoryForm({ ...advisoryForm, preferredCallTime: value })}
                      >
                        <SelectTrigger id="adv-calltime">
                          <SelectValue placeholder="Selecciona un horario..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Mañana (8:00 AM - 12:00 PM)</SelectItem>
                          <SelectItem value="afternoon">Tarde (12:00 PM - 5:00 PM)</SelectItem>
                          <SelectItem value="evening">Noche (5:00 PM - 8:00 PM)</SelectItem>
                          <SelectItem value="anytime">Cualquier hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adv-notes">Consulta o detalles adicionales</Label>
                      <Textarea
                        id="adv-notes"
                        placeholder="Cuéntanos qué necesitas saber..."
                        className="min-h-[100px]"
                        value={advisoryForm.notes}
                        onChange={(e) => setAdvisoryForm({ ...advisoryForm, notes: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Solicitar Asesoramiento
                      <Phone className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Formulario de Estimado */}
            <TabsContent value="estimate">
              <Card>
                <CardHeader>
                  <CardTitle>Solicita un estimado previo</CardTitle>
                  <CardDescription>
                    Si ya tienes las medidas de tu espacio, podemos darte un estimado preliminar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEstimateSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="est-name">Nombre completo *</Label>
                        <Input
                          id="est-name"
                          required
                          value={estimateForm.name}
                          onChange={(e) => setEstimateForm({ ...estimateForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-email">Correo electrónico</Label>
                        <Input
                          id="est-email"
                          type="email"
                          value={estimateForm.email}
                          onChange={(e) => setEstimateForm({ ...estimateForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="est-phone">Teléfono WhatsApp *</Label>
                        <Input
                          id="est-phone"
                          required
                          placeholder="3136802025"
                          value={estimateForm.whatsappPhone}
                          onChange={(e) => setEstimateForm({ ...estimateForm, whatsappPhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-work">Tipo de trabajo *</Label>
                        <Select
                          value={estimateForm.workType}
                          onValueChange={(value) => setEstimateForm({ ...estimateForm, workType: value })}
                        >
                          <SelectTrigger id="est-work">
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cocina">Cocina Integral</SelectItem>
                            <SelectItem value="closet">Closet</SelectItem>
                            <SelectItem value="puertas">Puertas</SelectItem>
                            <SelectItem value="centro_tv">Centro de TV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Solo mostrar campos de cocina si el tipo de trabajo es "cocina" */}
                    {estimateForm.workType === "cocina" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="est-shape">Forma de la cocina *</Label>
                          <Select
                            value={estimateForm.kitchenShape}
                            onValueChange={(value) => setEstimateForm({ ...estimateForm, kitchenShape: value })}
                          >
                            <SelectTrigger id="est-shape">
                              <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L">En forma de L</SelectItem>
                              <SelectItem value="U">En forma de U</SelectItem>
                              <SelectItem value="lineal">Lineal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="est-material">Tipo de mesón *</Label>
                          <Select
                            value={estimateForm.materialType}
                            onValueChange={(value) => setEstimateForm({ ...estimateForm, materialType: value })}
                          >
                            <SelectTrigger id="est-material">
                              <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quarzone">Quarzone</SelectItem>
                              <SelectItem value="sinterizado">Sinterizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="est-length">Largo lineal (metros) *</Label>
                        <Input
                          id="est-length"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="3.5"
                          value={estimateForm.linearLength}
                          onChange={(e) => setEstimateForm({ ...estimateForm, linearLength: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-height">Alto (metros) *</Label>
                        <Input
                          id="est-height"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="2.4"
                          value={estimateForm.height}
                          onChange={(e) => setEstimateForm({ ...estimateForm, height: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="est-details">Detalles adicionales</Label>
                      <Textarea
                        id="est-details"
                        rows={3}
                        placeholder="Describe características especiales, acabados deseados, etc."
                        value={estimateForm.additionalDetails}
                        onChange={(e) => setEstimateForm({ ...estimateForm, additionalDetails: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Enviar Estimado
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 INNOVAR Cocinas Integrales - Pereira, Colombia</p>
          <p className="mt-2">
            <a 
              href="https://www.google.com/maps/place/Innovar-+Cocinas+integrales+Pereira/@4.802601,-75.8300704,18.22z/data=!4m14!1m7!3m6!1s0x8e388129491d7481:0x900411675d3b35be!2sInnovar-+Cocinas+integrales+Pereira!8m2!3d4.8026875!4d-75.8293125!16s%2Fg%2F11h5q2k28n!3m5!1s0x8e388129491d7481:0x900411675d3b35be!8m2!3d4.8026875!4d-75.8293125!16s%2Fg%2F11h5q2k28n?entry=ttu&g_ep=EgoyMDI2MDExMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D"
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary inline-flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" />
              K9 vía Cerritos a Pereira, Pereira Risaralda
            </a>
            {" • "}
            <a href="https://cocinasintegralespereira.co/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              cocinasintegralespereira.co
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
