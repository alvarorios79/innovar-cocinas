import { useState, useEffect } from "react";
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
import { Link } from "wouter";
import { NotificationBell } from "@/components/NotificationBell";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"appointment" | "advisory" | "estimate">("appointment");

  // Estado para formulario de cita
  const [appointmentForm, setAppointmentForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workType: "",
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

  const createClientMutation = trpc.clients.getOrCreateByWhatsApp.useMutation();
  const createAppointmentMutation = trpc.appointments.create.useMutation();
  const createAdvisoryMutation = trpc.advisory.create.useMutation();
  const createEstimateMutation = trpc.estimates.create.useMutation();

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointmentForm.workType) {
      toast.error("Por favor selecciona el tipo de trabajo");
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
      
      // Combinar fecha y hora
      const [hours, minutes] = appointmentTime.split(':');
      const scheduledDateTime = new Date(appointmentDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Crear cita
      const result = await createAppointmentMutation.mutateAsync({
        clientId: client.id,
        workType: appointmentForm.workType as any,
        scheduledDate: scheduledDateTime.toISOString(),
        notes: appointmentForm.notes || undefined,
      });

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
        workType: "",
        notes: "",
      });
      setAppointmentDate("");
      setAppointmentTime("");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          {/* Main header */}
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-16 w-auto"
              />
            </div>
            
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/portal">
                    <Button variant="ghost">Mi Portal</Button>
                  </Link>
                  {/* Enlaces para roles de trabajo */}
                  {["disenador", "jefe_taller", "operario"].includes(user?.role || "") && (
                    <>
                      <Link href="/projects">
                        <Button variant="ghost">Proyectos</Button>
                      </Link>
                      <Link href="/tasks">
                        <Button variant="ghost">Tareas</Button>
                      </Link>
                    </>
                  )}
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <>
                      <Link href="/projects">
                        <Button variant="ghost">Proyectos</Button>
                      </Link>
                      <Link href="/tasks">
                        <Button variant="ghost">Tareas</Button>
                      </Link>
                      <Link href="/admin">
                        <Button variant="ghost">Panel Admin</Button>
                      </Link>
                    </>
                  )}
                  <NotificationBell />
                </>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl()}>Iniciar Sesión</a>
                </Button>
              )}
            </nav>
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
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6 text-xs sm:text-sm text-muted-foreground mb-4 md:mb-8 px-4">
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
                        <Label htmlFor="apt-email">Correo electrónico</Label>
                        <Input
                          id="apt-email"
                          type="email"
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
                        <Label htmlFor="apt-work">Tipo de trabajo *</Label>
                        <Select
                          value={appointmentForm.workType}
                          onValueChange={(value) => setAppointmentForm({ ...appointmentForm, workType: value })}
                        >
                          <SelectTrigger id="apt-work">
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
                      <Label htmlFor="apt-address">Dirección</Label>
                      <Input
                        id="apt-address"
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

                    <Button type="submit" className="w-full" size="lg">
                      Agendar Cita
                      <Calendar className="ml-2 h-4 w-4" />
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
