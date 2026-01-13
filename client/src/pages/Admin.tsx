import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Phone, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [quotationForm, setQuotationForm] = useState({
    description: "",
    materials: "",
    totalPrice: "",
    validUntil: "",
  });

  const utils = trpc.useUtils();
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.list.useQuery();
  const { data: advisoryRequests = [], isLoading: loadingAdvisory } = trpc.advisory.list.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.list.useQuery();
  const { data: clients = [], isLoading: loadingClients } = trpc.clients.list.useQuery();

  const updateAppointmentStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      toast.success("Estado actualizado");
    },
  });

  const updateAdvisoryStatus = trpc.advisory.updateStatus.useMutation({
    onSuccess: () => {
      utils.advisory.list.invalidate();
      toast.success("Estado actualizado");
    },
  });

  const createQuotation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      toast.success("Cotización creada exitosamente");
      setSelectedAppointment(null);
      setQuotationForm({
        description: "",
        materials: "",
        totalPrice: "",
        validUntil: "",
      });
    },
  });

  const sendQuotation = trpc.quotations.send.useMutation({
    onSuccess: (data) => {
      utils.quotations.list.invalidate();
      toast.success("Cotización enviada al cliente");
      
      // Abrir WhatsApp para enviar cotización
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
      }
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pendiente: { variant: "destructive", className: "bg-red-500 hover:bg-red-600" },
      confirmada: { variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
      completada: { variant: "default", className: "bg-green-500 hover:bg-green-600" },
      cancelada: { variant: "default", className: "bg-amber-700 hover:bg-amber-800" },
      contactado: { variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
      completado: { variant: "default", className: "bg-green-500 hover:bg-green-600" },
      borrador: { variant: "secondary", className: "" },
      enviada: { variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
    };

    const config = statusConfig[status] || { variant: "default", className: "" };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const getWorkTypeLabel = (workType: string) => {
    const labels: Record<string, string> = {
      cocina: "Cocina Integral",
      closet: "Closet",
      puertas: "Puertas",
      centro_tv: "Centro de TV",
    };
    return labels[workType] || workType;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No especificada";
    return new Date(date).toLocaleString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    await createQuotation.mutateAsync({
      clientId: selectedAppointment.clientId,
      appointmentId: selectedAppointment.id,
      workType: selectedAppointment.workType,
      description: quotationForm.description,
      materials: quotationForm.materials || undefined,
      totalPrice: quotationForm.totalPrice,
      validUntil: quotationForm.validUntil || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">← Volver al inicio</Button>
            </Link>
            <img 
              src="/logo-light.png" 
              alt="INNOVAR Cocinas Integrales" 
              className="h-10 w-auto"
            />
            <span className="text-sm text-muted-foreground">Panel Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter((a) => a.status === "pendiente").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asesoramiento</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {advisoryRequests.filter((a) => a.status === "pendiente").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cotizaciones</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="appointments" className="text-xs sm:text-sm px-2 py-2">Citas</TabsTrigger>
            <TabsTrigger value="advisory" className="text-xs sm:text-sm px-2 py-2">Asesoría</TabsTrigger>
            <TabsTrigger value="quotations" className="text-xs sm:text-sm px-2 py-2">Cotizaciones</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm px-2 py-2">Clientes</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Citas Agendadas</CardTitle>
                <CardDescription>Gestiona las citas de los clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <p>Cargando...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-muted-foreground">No hay citas agendadas</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-3 sm:p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{apt.client?.name}</h3>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getWorkTypeLabel(apt.workType)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">WhatsApp:</span> {apt.client?.whatsappPhone}
                            </p>
                            {apt.client?.email && (
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {apt.client?.email}
                              </p>
                            )}
                            {apt.client?.address && (
                              <p className="text-sm">
                                <span className="font-medium">Dirección:</span> {apt.client?.address}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Fecha:</span> {formatDate(apt.scheduledDate)}
                            </p>
                            {apt.notes && (
                              <p className="text-sm">
                                <span className="font-medium">Notas:</span> {apt.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Select
                              value={apt.status}
                              onValueChange={(value) =>
                                updateAppointmentStatus.mutate({ id: apt.id, status: value as any })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="confirmada">Confirmada</SelectItem>
                                <SelectItem value="completada">Completada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>

                            {apt.status === "completada" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedAppointment(apt)}
                                  >
                                    Crear Cotización
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Crear Cotización</DialogTitle>
                                    <DialogDescription>
                                      Cliente: {apt.client?.name} - {getWorkTypeLabel(apt.workType)}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={handleCreateQuotation} className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="description">Descripción del trabajo *</Label>
                                      <Textarea
                                        id="description"
                                        required
                                        rows={4}
                                        value={quotationForm.description}
                                        onChange={(e) =>
                                          setQuotationForm({ ...quotationForm, description: e.target.value })
                                        }
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="materials">Materiales</Label>
                                      <Textarea
                                        id="materials"
                                        rows={3}
                                        value={quotationForm.materials}
                                        onChange={(e) =>
                                          setQuotationForm({ ...quotationForm, materials: e.target.value })
                                        }
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="totalPrice">Precio Total (COP) *</Label>
                                        <Input
                                          id="totalPrice"
                                          type="number"
                                          required
                                          value={quotationForm.totalPrice}
                                          onChange={(e) =>
                                            setQuotationForm({ ...quotationForm, totalPrice: e.target.value })
                                          }
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label htmlFor="validUntil">Válida hasta</Label>
                                        <Input
                                          id="validUntil"
                                          type="date"
                                          value={quotationForm.validUntil}
                                          onChange={(e) =>
                                            setQuotationForm({ ...quotationForm, validUntil: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>

                                    <Button type="submit" className="w-full">
                                      Crear Cotización
                                    </Button>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advisory Tab */}
          <TabsContent value="advisory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Asesoramiento</CardTitle>
                <CardDescription>Clientes que solicitan asesoramiento telefónico</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAdvisory ? (
                  <p>Cargando...</p>
                ) : advisoryRequests.length === 0 ? (
                  <p className="text-muted-foreground">No hay solicitudes de asesoramiento</p>
                ) : (
                  <div className="space-y-4">
                    {advisoryRequests.map((req) => (
                      <div key={req.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{req.client?.name}</h3>
                              {getStatusBadge(req.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getWorkTypeLabel(req.workType)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">WhatsApp:</span> {req.client?.whatsappPhone}
                            </p>
                            {req.client?.email && (
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {req.client?.email}
                              </p>
                            )}
                            {req.notes && (
                              <p className="text-sm">
                                <span className="font-medium">Consulta:</span> {req.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Creada: {formatDate(req.createdAt)}
                            </p>
                          </div>
                          <Select
                            value={req.status}
                            onValueChange={(value) =>
                              updateAdvisoryStatus.mutate({ id: req.id, status: value as any })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="contactado">Contactado</SelectItem>
                              <SelectItem value="completado">Completado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cotizaciones</CardTitle>
                <CardDescription>Gestiona las cotizaciones enviadas a clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQuotations ? (
                  <p>Cargando...</p>
                ) : quotations.length === 0 ? (
                  <p className="text-muted-foreground">No hay cotizaciones creadas</p>
                ) : (
                  <div className="space-y-4">
                    {quotations.map((quot) => (
                      <div key={quot.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{quot.client?.name}</h3>
                              {getStatusBadge(quot.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getWorkTypeLabel(quot.workType)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Descripción:</span> {quot.description}
                            </p>
                            {quot.materials && (
                              <p className="text-sm">
                                <span className="font-medium">Materiales:</span> {quot.materials}
                              </p>
                            )}
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(quot.totalPrice)}
                            </p>
                            {quot.validUntil && (
                              <p className="text-xs text-muted-foreground">
                                Válida hasta: {formatDate(quot.validUntil)}
                              </p>
                            )}
                          </div>
                          {quot.status === "borrador" && (
                            <Button
                              size="sm"
                              onClick={() => sendQuotation.mutate({ id: quot.id })}
                            >
                              Enviar al Cliente
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Base de datos de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClients ? (
                  <p>Cargando...</p>
                ) : clients.length === 0 ? (
                  <p className="text-muted-foreground">No hay clientes registrados</p>
                ) : (
                  <div className="space-y-4">
                    {clients.map((client) => (
                      <div key={client.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold">{client.name}</h3>
                        <p className="text-sm">
                          <span className="font-medium">WhatsApp:</span> {client.whatsappPhone}
                        </p>
                        {client.email && (
                          <p className="text-sm">
                            <span className="font-medium">Email:</span> {client.email}
                          </p>
                        )}
                        {client.address && (
                          <p className="text-sm">
                            <span className="font-medium">Dirección:</span> {client.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Registrado: {formatDate(client.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
