import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Phone, Calculator, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

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
    scheduledDate: "",
    notes: "",
  });

  // Estado para formulario de asesoramiento
  const [advisoryForm, setAdvisoryForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workType: "",
    notes: "",
  });

  // Estado para formulario de estimado
  const [estimateForm, setEstimateForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    workType: "",
    length: "",
    width: "",
    height: "",
    counterTopType: "",
    additionalDetails: "",
  });

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

      // Crear cita
      const result = await createAppointmentMutation.mutateAsync({
        clientId: client.id,
        workType: appointmentForm.workType as any,
        scheduledDate: appointmentForm.scheduledDate || undefined,
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
        scheduledDate: "",
        notes: "",
      });
    } catch (error) {
      toast.error("Error al agendar la cita");
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
        length: estimateForm.length || undefined,
        width: estimateForm.width || undefined,
        height: estimateForm.height || undefined,
        counterTopType: estimateForm.counterTopType ? estimateForm.counterTopType as any : undefined,
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
        length: "",
        width: "",
        height: "",
        counterTopType: "",
        additionalDetails: "",
      });
    } catch (error) {
      toast.error("Error al enviar el estimado");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-light.png" 
              alt="INNOVAR Cocinas Integrales" 
              className="h-12 w-auto"
            />
          </div>
          
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/portal">
                  <Button variant="ghost">Mi Portal</Button>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost">Panel Admin</Button>
                  </Link>
                )}
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Iniciar Sesión</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Transforma tu hogar con cocinas y closets de{" "}
              <span className="text-primary">calidad excepcional</span>
            </h2>
            <p className="text-xl text-muted-foreground">
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appointment" className="gap-2">
                <Calendar className="h-4 w-4" />
                Agendar Cita
              </TabsTrigger>
              <TabsTrigger value="advisory" className="gap-2">
                <Phone className="h-4 w-4" />
                Asesoramiento
              </TabsTrigger>
              <TabsTrigger value="estimate" className="gap-2">
                <Calculator className="h-4 w-4" />
                Estimado Previo
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

                    <div className="space-y-2">
                      <Label htmlFor="apt-date">Fecha preferida (opcional)</Label>
                      <Input
                        id="apt-date"
                        type="datetime-local"
                        value={appointmentForm.scheduledDate}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apt-notes">Notas adicionales</Label>
                      <Textarea
                        id="apt-notes"
                        rows={3}
                        value={appointmentForm.notes}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Agendar Cita
                      <ArrowRight className="ml-2 h-4 w-4" />
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
                    Un comercial te contactará para resolver tus dudas y orientarte en tu proyecto
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
                      <Label htmlFor="adv-notes">¿Qué te gustaría saber?</Label>
                      <Textarea
                        id="adv-notes"
                        rows={4}
                        placeholder="Cuéntanos sobre tu proyecto y tus dudas..."
                        value={advisoryForm.notes}
                        onChange={(e) => setAdvisoryForm({ ...advisoryForm, notes: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Solicitar Asesoramiento
                      <ArrowRight className="ml-2 h-4 w-4" />
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="est-length">Largo (metros)</Label>
                        <Input
                          id="est-length"
                          type="number"
                          step="0.01"
                          placeholder="3.5"
                          value={estimateForm.length}
                          onChange={(e) => setEstimateForm({ ...estimateForm, length: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-width">Ancho (metros)</Label>
                        <Input
                          id="est-width"
                          type="number"
                          step="0.01"
                          placeholder="2.5"
                          value={estimateForm.width}
                          onChange={(e) => setEstimateForm({ ...estimateForm, width: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-height">Alto (metros)</Label>
                        <Input
                          id="est-height"
                          type="number"
                          step="0.01"
                          placeholder="2.4"
                          value={estimateForm.height}
                          onChange={(e) => setEstimateForm({ ...estimateForm, height: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="est-counter">Tipo de mesón (si aplica)</Label>
                      <Select
                        value={estimateForm.counterTopType}
                        onValueChange={(value) => setEstimateForm({ ...estimateForm, counterTopType: value })}
                      >
                        <SelectTrigger id="est-counter">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cuarzo">Cuarzo</SelectItem>
                          <SelectItem value="sinterizado">Sinterizado</SelectItem>
                        </SelectContent>
                      </Select>
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
          <p>© 2025 INNOVAR Cocinas Integrales - Pereira, Colombia</p>
          <p className="mt-2">
            <a href="https://cocinasintegralespereira.co/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              cocinasintegralespereira.co
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
