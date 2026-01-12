import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, FileText, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Portal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const utils = trpc.useUtils();
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.getMyAppointments.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.getMyQuotations.useQuery();
  const { data: estimates = [], isLoading: loadingEstimates } = trpc.estimates.getMyEstimates.useQuery();

  const rescheduleAppointment = trpc.appointments.reschedule.useMutation({
    onSuccess: () => {
      utils.appointments.getMyAppointments.invalidate();
      toast.success("Cita reagendada exitosamente");
      setSelectedAppointment(null);
      setRescheduleDate("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reagendar la cita");
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendiente: "secondary",
      confirmada: "default",
      completada: "outline",
      cancelada: "destructive",
      borrador: "secondary",
      enviada: "default",
    };

    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleDate) return;

    await rescheduleAppointment.mutateAsync({
      id: selectedAppointment.id,
      scheduledDate: rescheduleDate,
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
            <h1 className="text-xl font-bold">Mi Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bienvenido, {user?.name}</CardTitle>
            <CardDescription>
              Aquí puedes ver tus citas, reagendarlas y consultar tus cotizaciones
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appointments">Mis Citas</TabsTrigger>
            <TabsTrigger value="quotations">Cotizaciones</TabsTrigger>
            <TabsTrigger value="estimates">Estimados Previos</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mis Citas</CardTitle>
                <CardDescription>Visualiza y reagenda tus citas</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <p>Cargando...</p>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tienes citas agendadas</p>
                    <Link href="/">
                      <Button className="mt-4">Agendar una cita</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getWorkTypeLabel(apt.workType)}</h3>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">Fecha:</span> {formatDate(apt.scheduledDate)}
                            </p>
                            {apt.notes && (
                              <p className="text-sm text-muted-foreground">{apt.notes}</p>
                            )}
                          </div>
                          {(apt.status === "pendiente" || apt.status === "confirmada") && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedAppointment(apt)}
                                >
                                  Reagendar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reagendar Cita</DialogTitle>
                                  <DialogDescription>
                                    {getWorkTypeLabel(apt.workType)} - {formatDate(apt.scheduledDate)}
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleReschedule} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="newDate">Nueva fecha y hora</Label>
                                    <Input
                                      id="newDate"
                                      type="datetime-local"
                                      required
                                      value={rescheduleDate}
                                      onChange={(e) => setRescheduleDate(e.target.value)}
                                    />
                                  </div>
                                  <Button type="submit" className="w-full">
                                    Confirmar Reagendamiento
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
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
                <CardTitle>Mis Cotizaciones</CardTitle>
                <CardDescription>Revisa las cotizaciones que hemos preparado para ti</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQuotations ? (
                  <p>Cargando...</p>
                ) : quotations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aún no tienes cotizaciones. Después de tu visita, generaremos una cotización personalizada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quotations.map((quot) => (
                      <div key={quot.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getWorkTypeLabel(quot.workType)}</h3>
                              {getStatusBadge(quot.status)}
                            </div>
                            <p className="text-sm">{quot.description}</p>
                            {quot.materials && (
                              <div className="mt-2">
                                <p className="text-sm font-medium">Materiales:</p>
                                <p className="text-sm text-muted-foreground">{quot.materials}</p>
                              </div>
                            )}
                            <div className="mt-3">
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(quot.totalPrice)}
                              </p>
                            </div>
                            {quot.validUntil && (
                              <p className="text-xs text-muted-foreground">
                                Válida hasta: {formatDate(quot.validUntil)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Creada: {formatDate(quot.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimates Tab */}
          <TabsContent value="estimates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estimados Previos</CardTitle>
                <CardDescription>Estimados que enviaste con medidas previas</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEstimates ? (
                  <p>Cargando...</p>
                ) : estimates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No has enviado estimados previos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {estimates.map((est) => (
                      <div key={est.id} className="border rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold">{getWorkTypeLabel(est.workType)}</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {est.length && (
                            <div>
                              <span className="font-medium">Largo:</span> {est.length}m
                            </div>
                          )}
                          {est.width && (
                            <div>
                              <span className="font-medium">Ancho:</span> {est.width}m
                            </div>
                          )}
                          {est.height && (
                            <div>
                              <span className="font-medium">Alto:</span> {est.height}m
                            </div>
                          )}
                        </div>
                        {est.counterTopType && (
                          <p className="text-sm">
                            <span className="font-medium">Tipo de mesón:</span>{" "}
                            {est.counterTopType === "cuarzo" ? "Cuarzo" : "Sinterizado"}
                          </p>
                        )}
                        {est.additionalDetails && (
                          <p className="text-sm text-muted-foreground">{est.additionalDetails}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Enviado: {formatDate(est.createdAt)}
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
