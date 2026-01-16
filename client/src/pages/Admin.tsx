import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Phone, FileText, Users, Trash2, Plus, Bell, Key } from "lucide-react";
import { RemindersPanel } from "@/components/RemindersPanel";
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

  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    role: "user" as "user" | "admin" | "super_admin",
    password: "" as string | undefined,
  });

  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ userName: string; userEmail: string; tempPassword: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: appointments = [], isLoading: loadingAppointments } = trpc.appointments.list.useQuery();
  const { data: advisoryRequests = [], isLoading: loadingAdvisory } = trpc.advisory.list.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.list.useQuery();
  const { data: clients = [], isLoading: loadingClients } = trpc.clients.list.useQuery();
  const { data: allUsers = [], isLoading: loadingUsers } = trpc.userManagement.listAll.useQuery();

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

  const updateUserRole = trpc.userManagement.updateRole.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("Rol actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar rol");
    },
  });

  const createUser = trpc.userManagement.create.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("Usuario creado exitosamente");
      setShowCreateUserDialog(false);
      setCreateUserForm({ name: "", email: "", role: "user", password: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear usuario");
    },
  });

  const deleteUser = trpc.userManagement.delete.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("Usuario eliminado exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar usuario");
    },
  });

  const resetPassword = trpc.userManagement.resetPassword.useMutation({
    onSuccess: (data) => {
      setResetPasswordResult({
        userName: data.userName || "",
        userEmail: data.userEmail || "",
        tempPassword: data.tempPassword,
      });
      toast.success("Contraseña reseteada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al resetear contraseña");
    },
  });

  const deleteAppointment = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      toast.success("Cita eliminada exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar cita");
    },
  });

  const deleteAdvisory = trpc.advisory.delete.useMutation({
    onSuccess: () => {
      utils.advisory.list.invalidate();
      toast.success("Asesoramiento eliminado exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar asesoramiento");
    },
  });

  const deleteQuotation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      toast.success("Cotización eliminada exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar cotización");
    },
  });

  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Cliente eliminado exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar cliente");
    },
  });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    
    switch (deleteConfirm.type) {
      case "appointment":
        deleteAppointment.mutate({ id: deleteConfirm.id });
        break;
      case "advisory":
        deleteAdvisory.mutate({ id: deleteConfirm.id });
        break;
      case "quotation":
        deleteQuotation.mutate({ id: deleteConfirm.id });
        break;
      case "client":
        deleteClient.mutate({ id: deleteConfirm.id });
        break;
      case "user":
        deleteUser.mutate({ userId: deleteConfirm.id });
        break;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  console.log('[DEBUG Admin] User:', user?.email, 'Role:', user?.role, 'isAuthenticated:', isAuthenticated);

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
    console.log('[DEBUG Admin] Access denied - redirecting to home');
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

  const getCallTimeLabel = (callTime: string) => {
    const labels: Record<string, string> = {
      morning: "Mañana (8:00 AM - 12:00 PM)",
      afternoon: "Tarde (12:00 PM - 5:00 PM)",
      evening: "Noche (5:00 PM - 8:00 PM)",
      anytime: "Cualquier hora",
    };
    return labels[callTime] || callTime;
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
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <span className="hidden sm:inline">← Inicio</span>
                <span className="sm:hidden">←</span>
              </Button>
            </Link>
            <img 
              src="/logo-light.png" 
              alt="INNOVAR" 
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="hidden md:inline text-sm text-muted-foreground">Panel Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Admin</Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[100px]">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
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

        {/* Panel de Recordatorios */}
        {user && (
          <div className="mb-4 md:mb-8">
            <RemindersPanel userId={user.id} userRole={user.role} />
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger value="appointments" className="text-xs sm:text-sm px-2 py-2">Citas</TabsTrigger>
            <TabsTrigger value="advisory" className="text-xs sm:text-sm px-2 py-2">Asesoría</TabsTrigger>
            <TabsTrigger value="quotations" className="text-xs sm:text-sm px-2 py-2">Cotizaciones</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm px-2 py-2">Clientes</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm px-2 py-2">Usuarios</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Citas Agendadas</CardTitle>
                    <CardDescription>Gestiona las citas de los clientes</CardDescription>
                  </div>
                  <Link href="/#agendar-cita">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Cita
                    </Button>
                  </Link>
                </div>
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

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "appointment", id: apt.id, name: apt.client?.name || "Cita" })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Solicitudes de Asesoramiento</CardTitle>
                    <CardDescription>Clientes que solicitan asesoramiento telefónico</CardDescription>
                  </div>
                  <Link href="/#asesoramiento">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Asesoramiento
                    </Button>
                  </Link>
                </div>
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
                            {req.preferredCallTime && (
                              <p className="text-sm">
                                <span className="font-medium">Horario preferido:</span> {getCallTimeLabel(req.preferredCallTime)}
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
                          <div className="flex flex-col gap-2">
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

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "advisory", id: req.id, name: req.client?.name || "Asesoramiento" })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cotizaciones</CardTitle>
                    <CardDescription>Gestiona las cotizaciones enviadas a clientes</CardDescription>
                  </div>
                  <Link href="/#estimado-previo">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Solicitar Estimado
                    </Button>
                  </Link>
                </div>
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
                            {quot.kitchenShape && (
                              <p className="text-sm">
                                <span className="font-medium">Forma:</span>{" "}
                                {quot.kitchenShape === "L" ? "En forma de L" : quot.kitchenShape === "U" ? "En forma de U" : "Lineal"}
                              </p>
                            )}
                            {quot.measurements && (
                              <p className="text-sm">
                                <span className="font-medium">Medidas:</span> {quot.measurements}
                              </p>
                            )}
                            {quot.materialType && (
                              <p className="text-sm">
                                <span className="font-medium">Tipo de mesón:</span>{" "}
                                {quot.materialType === "quarzone" ? "Quarzone" : "Sinterizado"}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Descripción:</span> {quot.description}
                            </p>
                            {quot.materials && (
                              <p className="text-sm">
                                <span className="font-medium">Materiales adicionales:</span> {quot.materials}
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
                          <div className="flex flex-row gap-2">
                            {quot.status === "borrador" && (
                              <Button
                                size="sm"
                                onClick={() => sendQuotation.mutate({ id: quot.id })}
                              >
                                Enviar al Cliente
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "quotation", id: quot.id, name: `Cotización de ${quot.client?.name}` })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Clientes</CardTitle>
                    <CardDescription>Los clientes se crean automáticamente al agendar citas o solicitar servicios</CardDescription>
                  </div>
                </div>
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
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirm({ type: "client", id: client.id, name: client.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Administra los roles de los usuarios del sistema</CardDescription>
                  </div>
                  <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Users className="mr-2 h-4 w-4" />
                        Crear Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                          Ingresa los datos del nuevo usuario
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-name">Nombre</Label>
                          <Input
                            id="create-name"
                            value={createUserForm.name}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-email">Email</Label>
                          <Input
                            id="create-email"
                            type="email"
                            value={createUserForm.email}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-role">Rol</Label>
                          <Select
                            value={createUserForm.role}
                            onValueChange={(value: "user" | "admin" | "super_admin") => setCreateUserForm({ ...createUserForm, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuario</SelectItem>
                              {user?.role === "super_admin" && (
                                <SelectItem value="admin">Administrador</SelectItem>
                              )}
                              {user?.role === "super_admin" && (
                                <SelectItem value="super_admin">Super Administrador</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {(user?.role === "super_admin" || user?.role === "admin") && (
                          <div className="space-y-2">
                            <Label htmlFor="create-password">Contraseña (opcional)</Label>
                            <Input
                              id="create-password"
                              type="password"
                              value={createUserForm.password || ""}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                              placeholder="Mínimo 8 caracteres"
                            />
                            <p className="text-xs text-muted-foreground">
                              Si se proporciona, el usuario podrá iniciar sesión con email y contraseña
                            </p>
                          </div>
                        )}
                        <Button
                          className="w-full"
                          onClick={() => {
                            if (!createUserForm.name || !createUserForm.email) {
                              toast.error("Completa todos los campos");
                              return;
                            }
                            createUser.mutate(createUserForm);
                          }}
                          disabled={createUser.isPending}
                        >
                          {createUser.isPending ? "Creando..." : "Crear Usuario"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p>Cargando...</p>
                ) : allUsers.length === 0 ? (
                  <p className="text-muted-foreground">No hay usuarios registrados</p>
                ) : (
                  <div className="space-y-4">
                    {allUsers.map((usr) => (
                      <div key={usr.id} className="border rounded-lg p-3 sm:p-4 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{usr.name || "Sin nombre"}</h3>
                              <Badge 
                                variant={usr.role === "super_admin" || usr.role === "admin" ? "default" : "secondary"}
                                className={
                                  usr.role === "super_admin" ? "bg-red-600" :
                                  usr.role === "admin" ? "bg-blue-500" : ""
                                }
                              >
                                {usr.role === "super_admin" ? "Super Admin" :
                                 usr.role === "admin" ? "Administrador" : "Usuario"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{usr.email || "Sin email"}</p>
                            <p className="text-xs text-muted-foreground">
                              Registrado: {new Date(usr.createdAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {usr.id === user?.id && (
                              <Badge variant="outline" className="text-xs self-end">Tú</Badge>
                            )}
                            {usr.id !== user?.id && (
                              <div className="flex gap-2">
                                {/* Botón Cambiar Rol - Solo visible si tiene permisos */}
                                {(user?.role === "super_admin" || 
                                  (user?.role === "admin" && usr.role === "user")) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const newRole = 
                                        usr.role === "user" ? "admin" :
                                        usr.role === "admin" ? "user" :
                                        "user";
                                      
                                      if (window.confirm(
                                        `¿Cambiar rol de ${usr.name} a ${newRole === "admin" ? "Administrador" : "Usuario"}?`
                                      )) {
                                        updateUserRole.mutate({
                                          userId: usr.id,
                                          newRole: newRole as "user" | "admin" | "super_admin",
                                        });
                                      }
                                    }}
                                    disabled={updateUserRole.isPending}
                                  >
                                    {usr.role === "admin" ? "Quitar Admin" : "Hacer Admin"}
                                  </Button>
                                )}
                                {/* Botón Resetear Contraseña - Solo super_admin */}
                                {user?.role === "super_admin" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      if (window.confirm(
                                        `¿Resetear contraseña de ${usr.name}? Se generará una contraseña temporal.`
                                      )) {
                                        resetPassword.mutate({ userId: usr.id });
                                      }
                                    }}
                                    disabled={resetPassword.isPending}
                                  >
                                    <Key className="h-4 w-4 mr-1" />
                                    Contraseña
                                  </Button>
                                )}
                                {/* Botón Eliminar - Solo visible si tiene permisos */}
                                {(user?.role === "super_admin" || 
                                  (user?.role === "admin" && usr.role === "user")) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setDeleteConfirm({ type: "user", id: usr.id, name: usr.name || "Usuario" })}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </Button>
                                )}
                              </div>
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
        </Tabs>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {deleteConfirm?.type === "appointment" ? "cita" : deleteConfirm?.type === "advisory" ? "asesoramiento" : deleteConfirm?.type === "quotation" ? "cotización" : deleteConfirm?.type === "client" ? "cliente" : "usuario"}?</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar: <strong>{deleteConfirm?.name}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteAppointment.isPending || deleteAdvisory.isPending || deleteQuotation.isPending || deleteClient.isPending || deleteUser.isPending}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de contraseña reseteada */}
      <Dialog open={!!resetPasswordResult} onOpenChange={() => setResetPasswordResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              Contraseña Reseteada
            </DialogTitle>
            <DialogDescription>
              La contraseña ha sido cambiada exitosamente. Comparte esta información con el usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Usuario</p>
                <p className="font-semibold">{resetPasswordResult?.userName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{resetPasswordResult?.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nueva Contraseña Temporal</p>
                <p className="font-mono text-lg font-bold text-primary bg-background p-2 rounded border">
                  {resetPasswordResult?.tempPassword}
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Esta contraseña solo se mostrará una vez. Asegúrate de guardarla o compartirla ahora.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (resetPasswordResult?.tempPassword) {
                  navigator.clipboard.writeText(resetPasswordResult.tempPassword);
                  toast.success("Contraseña copiada al portapapeles");
                }
              }}
            >
              Copiar Contraseña
            </Button>
            <Button onClick={() => setResetPasswordResult(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
