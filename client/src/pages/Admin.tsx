import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Phone, FileText, Users, Trash2, Plus, Bell, Key, Wrench, CheckSquare, Square, Eye, EyeOff, Search, Cake, DollarSign } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RemindersPanel } from "@/components/RemindersPanel";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { HardwareCatalogAdmin } from "@/components/HardwareCatalogAdmin";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";
import { SystemCleanupButton } from "@/components/SystemCleanupButton";
import { formatPrice } from "@/lib/formatters";

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
    birthDate: "" as string | undefined,
  });

  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ userName: string; userEmail: string; tempPassword: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editBirthdayUser, setEditBirthdayUser] = useState<{ id: number; name: string; birthDate: string | null } | null>(null);
  const [editPhoneUser, setEditPhoneUser] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', whatsappPhone: '', address: '' });
  
  // Sincronizar editFormData cuando cambia editingClient
  useEffect(() => {
    if (editingClient) {
      setEditFormData({
        name: editingClient.name || '',
        email: editingClient.email || '',
        whatsappPhone: editingClient.whatsappPhone || '',
        address: editingClient.address || ''
      });
    }
  }, [editingClient]);
  
  // Estados para selección múltiple
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [selectedAdvisory, setSelectedAdvisory] = useState<number[]>([]);
  const [selectedQuotations, setSelectedQuotations] = useState<number[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSortBy, setClientSortBy] = useState<"name-asc" | "name-desc" | "date-asc" | "date-desc">("date-desc");
  const [clientPage, setClientPage] = useState(1);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const CLIENTS_PER_PAGE = 10;
  const APPOINTMENTS_PER_PAGE = 10;

  const utils = trpc.useUtils();
  const { data: appointmentsData, isLoading: loadingAppointments } = trpc.appointments.listPaginated.useQuery({ page: appointmentPage, limit: APPOINTMENTS_PER_PAGE });
  const appointments: any[] = (appointmentsData as any)?.appointments || appointmentsData?.data || [];
  const totalAppointments = appointmentsData?.total || 0;
  const totalAppointmentPages = Math.ceil(totalAppointments / APPOINTMENTS_PER_PAGE) || 1;
  const { data: advisoryRequests = [], isLoading: loadingAdvisory } = trpc.advisory.list.useQuery();
  const { data: quotations = [], isLoading: loadingQuotations } = trpc.quotations.list.useQuery();
  const { data: clientsData, isLoading: loadingClients } = trpc.clients.listPaginated.useQuery({ page: clientPage, limit: CLIENTS_PER_PAGE });
  const clients = clientsData?.clients || [];
  const totalClients = clientsData?.total || 0;
  const totalClientPages = Math.ceil(totalClients / CLIENTS_PER_PAGE) || 1;
  const { data: allUsers = [], isLoading: loadingUsers } = trpc.userManagement.listAll.useQuery();

  const updateAppointmentStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      utils.appointments.listPaginated.invalidate();
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
      utils.appointments.list.invalidate();
      utils.appointments.listPaginated.invalidate();
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

  const sendQuotation = trpc.quotations.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.appointments.list.invalidate();
      utils.appointments.listPaginated.invalidate();
      toast.success("Cotización enviada al cliente");
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
      setCreateUserForm({ name: "", email: "", role: "user", password: "", birthDate: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear usuario");
    },
  });

  const deleteUser = trpc.userManagement.delete.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("Usuario eliminado exitosamente");
    },
  });

  const deleteTestUsers = trpc.userManagement.deleteTestUsers.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar usuario");
    },
  });

  const updateBirthDate = trpc.userManagement.updateBirthDate.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("🎂 Fecha de cumpleaños actualizada");
      setEditBirthdayUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar cumpleaños");
    },
  });

  const updateUserPhone = trpc.userManagement.updatePhone.useMutation({
    onSuccess: () => {
      utils.userManagement.listAll.invalidate();
      toast.success("📱 Teléfono actualizado");
      setEditPhoneUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar teléfono");
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
      utils.appointments.listPaginated.invalidate();
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
  });

  const deleteClient = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.listPaginated.invalidate();
      toast.success("Cliente eliminado exitosamente");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar cliente");
    },
  });

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.listPaginated.invalidate();
      toast.success("Cliente actualizado exitosamente");
      setEditingClient(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar cliente");
    },
  });

  // Funciones para selección múltiple
  const toggleSelectAppointment = (id: number) => {
    setSelectedAppointments(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAppointments = () => {
    if (selectedAppointments.length === appointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(appointments.map((a: any) => a.id));
    }
  };

  const toggleSelectAdvisory = (id: number) => {
    setSelectedAdvisory(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAdvisory = () => {
    if (selectedAdvisory.length === advisoryRequests.length) {
      setSelectedAdvisory([]);
    } else {
      setSelectedAdvisory(advisoryRequests.map(a => a.id));
    }
  };

  const toggleSelectQuotation = (id: number) => {
    setSelectedQuotations(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllQuotations = () => {
    if (selectedQuotations.length === quotations.length) {
      setSelectedQuotations([]);
    } else {
      setSelectedQuotations(quotations.map(q => q.id));
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUsers = (usersList: any[]) => {
    const userIds = usersList.map(u => u.id);
    if (userIds.every(id => selectedUsers.includes(id))) {
      setSelectedUsers(prev => prev.filter(id => !userIds.includes(id)));
    } else {
      setSelectedUsers(prev => Array.from(new Set([...prev, ...userIds])));
    }
  };

  const handleBulkDelete = (type: 'appointments' | 'advisory' | 'quotations' | 'users') => {
    let count = 0;
    let items: number[] = [];
    
    switch (type) {
      case 'appointments':
        count = selectedAppointments.length;
        items = selectedAppointments;
        break;
      case 'advisory':
        count = selectedAdvisory.length;
        items = selectedAdvisory;
        break;
      case 'quotations':
        count = selectedQuotations.length;
        items = selectedQuotations;
        break;
      case 'users':
        count = selectedUsers.length;
        items = selectedUsers;
        break;
    }

    if (count === 0) return;

    if (confirm(`¿Estás seguro de eliminar ${count} ${type === 'appointments' ? 'citas' : type === 'advisory' ? 'asesoramientos' : type === 'quotations' ? 'cotizaciones' : 'usuarios'}?`)) {
      // Eliminar cada item individualmente
      if (type === 'users') {
        // Para usuarios, eliminamos uno por uno esperando confirmación
        items.forEach(id => {
          deleteUser.mutate({ userId: id });
        });
      } else {
        items.forEach(id => {
          switch (type) {
            case 'appointments':
              deleteAppointment.mutate({ id });
              break;
            case 'advisory':
              deleteAdvisory.mutate({ id });
              break;
            case 'quotations':
              deleteQuotation.mutate({ id });
              break;
          }
        });
      }

      // Limpiar selección
      switch (type) {
        case 'appointments':
          setSelectedAppointments([]);
          break;
        case 'advisory':
          setSelectedAdvisory([]);
          break;
        case 'quotations':
          setSelectedQuotations([]);
          break;
        case 'users':
          setSelectedUsers([]);
          break;
      }
    }
  };

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

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
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

  const getWorkTypeLabel = (workType: string | string[]) => {
    const labels: Record<string, string> = {
      cocina: "Cocina Integral",
      closet: "Closet",
      puertas: "Puertas",
      centro_tv: "Centro de TV",
    };
    
    if (Array.isArray(workType)) {
      return workType.map(wt => labels[wt] || wt).join(", ");
    }
    
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
      timeZone: "America/Bogota",
    });
  };



  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    // TODO: Implementar nuevo formulario con items dinámicos
    toast.info("Formulario de cotizaciones en desarrollo");
    /*
    await createQuotation.mutateAsync({
      clientId: selectedAppointment.clientId,
      vendorName: "Alvaro Gutierrez",
      workType: selectedAppointment.workTypes[0] || "cocina",
      items: [],
    });
    */
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
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[100px] lg:max-w-none">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-8 px-3 md:px-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Citas Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {appointments.filter((a: any) => a.status === "pendiente").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Asesoramiento</CardTitle>
              <Phone className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {advisoryRequests.filter((a) => a.status === "pendiente").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyan-50 border-cyan-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-900">Cotizaciones</CardTitle>
              <FileText className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-700">{quotations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Clientes</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{clients.length}</div>
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto gap-2 bg-transparent p-1">
            <TabsTrigger 
              value="appointments" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-100 transition-colors"
            >
              Citas
            </TabsTrigger>
            <TabsTrigger 
              value="advisory" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white hover:bg-orange-100 transition-colors"
            >
              Asesoría
            </TabsTrigger>
            <TabsTrigger 
              value="quotations" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white hover:bg-cyan-100 transition-colors"
            >
              Cotizaciones
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-100 transition-colors"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-slate-500 data-[state=active]:text-white hover:bg-slate-100 transition-colors"
            >
              Usuarios
            </TabsTrigger>
            <TabsTrigger 
              value="hardware" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-rose-500 data-[state=active]:text-white hover:bg-rose-100 transition-colors"
            >
              Herrajes
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white hover:bg-purple-100 transition-colors"
            >
              Proyectos
            </TabsTrigger>
            {(user?.role === "super_admin" || user?.role === "admin") && (
              <Link href="/profitability-dashboard">
                <Button variant="outline" className="text-xs sm:text-sm px-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Rentabilidad
                </Button>
              </Link>
            )}
            {user?.role === "super_admin" && (
              <>
                <TabsTrigger 
                  value="pricing" 
                  className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white hover:bg-emerald-100 transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Precios
                </TabsTrigger>
                <TabsTrigger 
                  value="system-zone" 
                  className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-red-100 transition-colors"
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  Limpieza
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Citas Agendadas</CardTitle>
                    <CardDescription>Gestiona las citas de los clientes</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedAppointments.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={() => handleBulkDelete('appointments')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar ({selectedAppointments.length})
                      </Button>
                    )}
                    <Link href="/#agendar-cita">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Cita
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <p>Cargando...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-muted-foreground">No hay citas agendadas</p>
                ) : (
                  <div className="space-y-4">
                    {/* Checkbox Seleccionar Todo */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedAppointments.length === appointments.length && appointments.length > 0}
                        onCheckedChange={toggleSelectAllAppointments}
                      />
                      <span className="text-sm font-medium">
                        Seleccionar todas ({appointments.length})
                      </span>
                    </div>
                    
                    {appointments.map((apt: any) => (
                      <div key={apt.id} className="border rounded-lg p-3 sm:p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          {/* Checkbox individual */}
                          <Checkbox
                            checked={selectedAppointments.includes(apt.id)}
                            onCheckedChange={() => toggleSelectAppointment(apt.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{apt.client?.name}</h3>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getWorkTypeLabel(apt.workTypes)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">WhatsApp:</span> {apt.client?.whatsappPhone}
                            </p>
                            {apt.client?.email && (
                              <p className="text-sm break-words min-w-0">
                                <span className="font-medium">Email:</span> {apt.client?.email}
                              </p>
                            )}
                            {apt.client?.address && (
                              <p className="text-sm break-words min-w-0">
                                <span className="font-medium">Dirección:</span> {apt.client?.address}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Fecha:</span> {formatDate(apt.scheduledDate)}
                            </p>
                            {apt.notes && (
                              <p className="text-sm break-words min-w-0">
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
                              <SelectTrigger className="w-full sm:w-[140px]">
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
                                      Cliente: {apt.client?.name} - {getWorkTypeLabel(apt.workTypes)}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              {totalAppointmentPages > 1 && (
                <div className="flex items-center justify-between border-t p-4 gap-2">
                  <Button variant="outline" size="sm" disabled={appointmentPage === 1} onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}>← Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {appointmentPage} de {totalAppointmentPages} ({totalAppointments} registros)</span>
                  <Button variant="outline" size="sm" disabled={appointmentPage === totalAppointmentPages} onClick={() => setAppointmentPage(p => Math.min(totalAppointmentPages, p + 1))}>Siguiente →</Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Advisory Tab */}
          <TabsContent value="advisory" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Solicitudes de Asesoramiento</CardTitle>
                    <CardDescription>Clientes que solicitan asesoramiento telefónico</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedAdvisory.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={() => handleBulkDelete('advisory')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar ({selectedAdvisory.length})
                      </Button>
                    )}
                    <Link href="/#asesoramiento">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Asesoramiento
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAdvisory ? (
                  <p>Cargando...</p>
                ) : advisoryRequests.length === 0 ? (
                  <p className="text-muted-foreground">No hay solicitudes de asesoramiento</p>
                ) : (
                  <div className="space-y-4">
                    {/* Checkbox Seleccionar Todo */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedAdvisory.length === advisoryRequests.length && advisoryRequests.length > 0}
                        onCheckedChange={toggleSelectAllAdvisory}
                      />
                      <span className="text-sm font-medium">
                        Seleccionar todas ({advisoryRequests.length})
                      </span>
                    </div>
                    
                    {advisoryRequests.map((req) => (
                      <div key={req.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          {/* Checkbox individual */}
                          <Checkbox
                            checked={selectedAdvisory.includes(req.id)}
                            onCheckedChange={() => toggleSelectAdvisory(req.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 flex items-start justify-between">
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
                              <p className="text-sm break-words min-w-0">
                                <span className="font-medium">Email:</span> {req.client?.email}
                              </p>
                            )}
                            {req.preferredCallTime && (
                              <p className="text-sm">
                                <span className="font-medium">Horario preferido:</span> {getCallTimeLabel(req.preferredCallTime)}
                              </p>
                            )}
                            {req.notes && (
                              <p className="text-sm break-words min-w-0">
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
                              <SelectTrigger className="w-full sm:w-[140px]">
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-3">
            <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-cyan-700">Sistema de Cotizaciones</CardTitle>
                    <CardDescription>Crea y gestiona cotizaciones profesionales con PDF y envío automático</CardDescription>
                  </div>
                  <Link href="/quotations">
                    <Button size="lg" className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                      <FileText className="h-5 w-5" />
                      Ir a Cotizaciones
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-cyan-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold">
                      1
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Items Dinámicos</div>
                      <p className="text-xs text-muted-foreground">Múltiples items con descripción detallada</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-cyan-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold">
                      2
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">PDF Profesional</div>
                      <p className="text-xs text-muted-foreground">Genera PDFs con logo y diseño corporativo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-cyan-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold">
                      3
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Envío Automático</div>
                      <p className="text-xs text-muted-foreground">Envía por email con un solo clic</p>
                    </div>
                  </div>
                </div>
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
                  <div className="flex gap-2">
                    <CreateQuickClientDialog 
                      onClientCreated={() => {
                        utils.clients.list.invalidate();
                        utils.clients.listPaginated.invalidate();
                        setClientPage(1);
                      }}
                    />
                    {selectedClients.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar ${selectedClients.length} cliente(s)?`)) {
                            selectedClients.forEach(id => deleteClient.mutate({ id }));
                            setSelectedClients([]);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar {selectedClients.length} seleccionado(s)
                      </Button>
                    )}
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
                    {/* Barra de búsqueda y ordenamiento */}
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nombre, teléfono o email..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={clientSortBy} onValueChange={(value: any) => setClientSortBy(value)}>
                              <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">Más recientes</SelectItem>
                          <SelectItem value="date-asc">Más antiguos</SelectItem>
                          <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(() => {
                      // Filtrar clientes
                      const filteredClients = clients.filter(client => {
                        const query = clientSearchQuery.toLowerCase();
                        return (
                          client.name.toLowerCase().includes(query) ||
                          client.whatsappPhone.includes(query) ||
                          (client.email && client.email.toLowerCase().includes(query))
                        );
                      });
                      
                      // Ordenar clientes
                      const sortedClients = [...filteredClients].sort((a, b) => {
                        switch (clientSortBy) {
                          case "name-asc":
                            return a.name.localeCompare(b.name);
                          case "name-desc":
                            return b.name.localeCompare(a.name);
                          case "date-asc":
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                          case "date-desc":
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                          default:
                            return 0;
                        }
                      });
                      
                      if (sortedClients.length === 0) {
                        return <p className="text-muted-foreground text-center py-8">No se encontraron clientes</p>;
                      }
                      
                      return (
                        <>
                          {clientSearchQuery && (
                            <p className="text-sm text-muted-foreground">
                              {sortedClients.length} de {clients.length} cliente(s) encontrado(s)
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              checked={selectedClients.length === sortedClients.length && sortedClients.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedClients(sortedClients.map(c => c.id));
                                } else {
                                  setSelectedClients([]);
                                }
                              }}
                            />
                            <span className="text-sm font-medium">Seleccionar todos</span>
                          </div>
                          
                          {sortedClients.map((client) => (
                            <div key={client.id} className="border rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedClients.includes(client.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedClients([...selectedClients, client.id]);
                                    } else {
                                      setSelectedClients(selectedClients.filter(id => id !== client.id));
                                    }
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{client.name}</h3>
                                    {client.internalManagement && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        Gestión interna
                                      </span>
                                    )}
                                  </div>
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
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingClient(client);
                                      setEditFormData({
                                        name: client.name || '',
                                        email: client.email || '',
                                        whatsappPhone: client.whatsappPhone || '',
                                        address: client.address || ''
                                      });
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setDeleteConfirm({ type: "client", id: client.id, name: client.name })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
              {totalClientPages > 1 && (
                <div className="flex items-center justify-between border-t p-4 gap-2">
                  <Button variant="outline" size="sm" disabled={clientPage === 1} onClick={() => setClientPage(p => Math.max(1, p - 1))}>← Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {clientPage} de {totalClientPages} ({totalClients} registros)</span>
                  <Button variant="outline" size="sm" disabled={clientPage === totalClientPages} onClick={() => setClientPage(p => Math.min(totalClientPages, p + 1))}>Siguiente →</Button>
                </div>
              )}
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
                            <div className="relative">
                              <Input
                                id="create-password"
                                type={showPassword ? "text" : "password"}
                                value={createUserForm.password || ""}
                                onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                                placeholder="Mínimo 8 caracteres"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Si se proporciona, el usuario podrá iniciar sesión con email y contraseña
                            </p>
                          </div>
                        )}
                        {/* Campo de cumpleaños - Solo visible para Super Admin */}
                        {user?.role === "super_admin" && createUserForm.role !== "user" && (
                          <div className="space-y-2">
                            <Label htmlFor="create-birthdate">
                              🎂 Fecha de Cumpleaños (opcional)
                            </Label>
                            <Input
                              id="create-birthdate"
                              type="date"
                              value={createUserForm.birthDate || ""}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, birthDate: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                              El colaborador recibirá un mensaje especial el día de su cumpleaños
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
                  <div className="space-y-6">
                    {/* Equipo de Trabajo, Clientes Reales y Usuarios de Prueba */}
                    {(() => {
                      // Equipo de trabajo REAL - definido por emails específicos
                      const realTeamEmails = [
                        'mcfy8jgnym@privaterelay.appleid.com', // Alvaro Rios - Super Admin
                        'alejoile300@gmail.com',                // Alejo Gutiérrez - Diseñador
                        'martha79s@hotmail.com',                // Martha Serna - Comercial
                        'jefe.taller@innovar.temp',             // Luis Cardoso - Jefe de Taller
                        'operario@innovar.temp'                 // Daniel Beltran - Operario
                      ];
                      
                      // Función para verificar si es del equipo de trabajo real
                      const isRealTeamMember = (u: typeof allUsers[0]) => {
                        const email = (u.email || '').toLowerCase();
                        return realTeamEmails.includes(email);
                      };
                      
                      // Función para detectar usuarios de prueba
                      const isTestUser = (u: typeof allUsers[0]) => {
                        // Si es del equipo real, NO es usuario de prueba
                        if (isRealTeamMember(u)) return false;
                        
                        const email = (u.email || '').toLowerCase();
                        const name = (u.name || '').toLowerCase();
                        
                        // Lista de usuarios excluidos adicionales (clientes reales que podrían parecer de prueba)
                        const excludedNames = ['alvaro pruebas'];
                        if (excludedNames.some(n => name === n)) return false;
                        
                        // Cualquier usuario con rol del equipo que NO esté en la lista real es de prueba
                        const teamRoles = ['super_admin', 'admin', 'comercial', 'disenador', 'jefe_taller', 'operario'];
                        if (teamRoles.includes(u.role)) return true;
                        
                        // Patrones específicos en email
                        const testEmailPatterns = ['test@', 'test.', 'prueba@', 'ejemplo@', 'example@', 'demo@', 'fake@', 'dummy@', 'admin-bulk', 'newadmin', 'newsuperadmin'];
                        const hasTestEmailPattern = testEmailPatterns.some(p => email.includes(p));
                        
                        // Dominios de prueba (excluye @innovar.temp porque el equipo real lo usa)
                        const testDomains = ['@test.com', '@example.com', '@prueba.com', '@demo.com', '@fake.com', '@testing.com'];
                        const hasTestDomain = testDomains.some(d => email.endsWith(d));
                        
                        // Nombres que claramente son de prueba
                        const testNamePatterns = ['cliente test', 'test client', 'usuario test', 'test user', 'cliente prueba', 'usuario prueba', 'cliente de prueba', 'test timezone', 'admin test', 'new admin', 'new super admin'];
                        const hasTestNamePattern = testNamePatterns.some(p => name.includes(p));
                        
                        // Email genérico de prueba
                        const isGenericTestEmail = (email.startsWith('test') || email.startsWith('prueba') || email.startsWith('cliente-test') || email.startsWith('admin-bulk') || email.startsWith('newadmin') || email.startsWith('newsuperadmin'));
                        
                        return hasTestEmailPattern || hasTestDomain || hasTestNamePattern || isGenericTestEmail;
                      };
                      
                      // Separar en 3 categorías
                      const teamUsers = allUsers.filter(isRealTeamMember);
                      const testUsers = allUsers.filter(u => !isRealTeamMember(u) && isTestUser(u));
                      const regularUsers = allUsers.filter(u => !isRealTeamMember(u) && !isTestUser(u));
                      
                      return (
                        <>
                          {teamUsers.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={teamUsers.every(u => selectedUsers.includes(u.id))}
                                    onCheckedChange={() => toggleSelectAllUsers(teamUsers)}
                                  />
                                  <h3 className="font-semibold text-lg">Equipo de Trabajo</h3>
                                  <Badge variant="outline">{teamUsers.length}</Badge>
                                </div>
                                {selectedUsers.some(id => teamUsers.map(u => u.id).includes(id)) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleBulkDelete('users')}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar seleccionados ({selectedUsers.filter(id => teamUsers.map(u => u.id).includes(id)).length})
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-3">
                                {teamUsers.map((usr) => (
                                  <div key={usr.id} className="border rounded-lg p-3 sm:p-4 bg-muted/30">
                                    {/* Fila principal: checkbox + info + badge */}
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={selectedUsers.includes(usr.id)}
                                        onCheckedChange={() => toggleSelectUser(usr.id)}
                                        className="mt-1 shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-semibold truncate">{usr.name || "Sin nombre"}</h3>
                                          <Badge 
                                            variant={usr.role === "super_admin" || usr.role === "admin" ? "default" : "secondary"}
                                            className={
                                              usr.role === "super_admin" ? "bg-red-600" :
                                              usr.role === "admin" ? "bg-blue-500" :
                                              usr.role === "comercial" ? "bg-green-600" :
                                              usr.role === "disenador" ? "bg-cyan-600" :
                                              usr.role === "jefe_taller" ? "bg-orange-600" :
                                              usr.role === "operario" ? "bg-yellow-600 text-black" : ""
                                            }
                                          >
                                            {usr.role === "super_admin" ? "Super Admin" :
                                             usr.role === "admin" ? "Administrador" :
                                             usr.role === "comercial" ? "Comercial" :
                                             usr.role === "disenador" ? "Diseñador" :
                                             usr.role === "jefe_taller" ? "Jefe de Taller" :
                                             usr.role === "operario" ? "Operario" : "Usuario"}
                                          </Badge>
                                          {usr.id === user?.id && (
                                            <Badge variant="outline" className="text-xs">Tú</Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{usr.email || "Sin email"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Registrado: {new Date(usr.createdAt).toLocaleDateString('es-ES')}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Fila de botones de acción - responsive */}
                                    {user?.role === "super_admin" && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 min-w-0 sm:flex-none sm:w-auto"
                                            onClick={() => setEditBirthdayUser({ 
                                              id: usr.id, 
                                              name: usr.name || "Usuario", 
                                              birthDate: (usr as any).birthDate || null 
                                            })}
                                          >
                                            <Cake className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">Cumpleaños</span>
                                            <span className="sm:hidden">🎂</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 min-w-0 sm:flex-none sm:w-auto"
                                            onClick={() => setEditPhoneUser({ 
                                              id: usr.id, 
                                              name: usr.name || "Usuario", 
                                              phone: (usr as any).phone || "" 
                                            })}
                                          >
                                            <Phone className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">Teléfono</span>
                                            <span className="sm:hidden">📞</span>
                                          </Button>
                                          {usr.id !== user?.id && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                className="flex-1 min-w-0 sm:flex-none sm:w-auto"
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
                                                <span className="hidden sm:inline">Contraseña</span>
                                                <span className="sm:hidden">🔑</span>
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1 min-w-0 sm:flex-none sm:w-auto"
                                                onClick={() => {
                                                  setDeleteConfirm({ type: "user", id: usr.id, name: usr.name || "Usuario" });
                                                }}
                                                disabled={deleteUser.isPending}
                                              >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                <span className="hidden sm:inline">Eliminar</span>
                                                <span className="sm:hidden">🗑️</span>
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Usuarios Regulares */}
                          {regularUsers.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={regularUsers.every(u => selectedUsers.includes(u.id))}
                                    onCheckedChange={() => toggleSelectAllUsers(regularUsers)}
                                  />
                                  <h3 className="font-semibold text-lg">Usuarios Registrados</h3>
                                  <Badge variant="outline">{regularUsers.length}</Badge>
                                </div>
                                {selectedUsers.some(id => regularUsers.map(u => u.id).includes(id)) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleBulkDelete('users')}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar seleccionados ({selectedUsers.filter(id => regularUsers.map(u => u.id).includes(id)).length})
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-3">
                                {regularUsers.map((usr) => (
                                  <div key={usr.id} className="border rounded-lg p-3 sm:p-4">
                                    {/* Fila principal: checkbox + info */}
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={selectedUsers.includes(usr.id)}
                                        onCheckedChange={() => toggleSelectUser(usr.id)}
                                        className="mt-1 shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-semibold truncate">{usr.name || "Sin nombre"}</h3>
                                          <Badge 
                                            variant={usr.role === "super_admin" || usr.role === "admin" ? "default" : "secondary"}
                                            className={
                                              usr.role === "super_admin" ? "bg-red-600" :
                                              usr.role === "admin" ? "bg-blue-500" :
                                              usr.role === "comercial" ? "bg-green-600" :
                                              usr.role === "disenador" ? "bg-cyan-600" :
                                              usr.role === "jefe_taller" ? "bg-orange-600" :
                                              usr.role === "operario" ? "bg-yellow-600 text-black" : ""
                                            }
                                          >
                                            {usr.role === "super_admin" ? "Super Admin" :
                                             usr.role === "admin" ? "Administrador" :
                                             usr.role === "comercial" ? "Comercial" :
                                             usr.role === "disenador" ? "Diseñador" :
                                             usr.role === "jefe_taller" ? "Jefe de Taller" :
                                             usr.role === "operario" ? "Operario" : "Usuario"}
                                          </Badge>
                                          {usr.id === user?.id && (
                                            <Badge variant="outline" className="text-xs">Tú</Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{usr.email || "Sin email"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Registrado: {new Date(usr.createdAt).toLocaleDateString('es-ES')}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Fila de botones de acción - responsive */}
                                    {usr.id !== user?.id && usr.role !== "super_admin" && (user?.role === "super_admin" || (user?.role === "admin" && usr.role === "user")) && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        <div className="flex flex-wrap gap-2">
                                          {/* Botón Cambiar Rol */}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 min-w-0 sm:flex-none sm:w-auto"
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
                                            <span className="hidden sm:inline">{usr.role === "admin" ? "Quitar Admin" : "Hacer Admin"}</span>
                                            <span className="sm:hidden">{usr.role === "admin" ? "⬇️ Rol" : "⬆️ Rol"}</span>
                                          </Button>
                                          {/* Botón Resetear Contraseña - Solo super_admin */}
                                          {user?.role === "super_admin" && (
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              className="flex-1 min-w-0 sm:flex-none sm:w-auto"
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
                                              <span className="hidden sm:inline">Contraseña</span>
                                              <span className="sm:hidden">🔑</span>
                                            </Button>
                                          )}
                                          {/* Botón Eliminar */}
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1 min-w-0 sm:flex-none sm:w-auto"
                                            onClick={() => setDeleteConfirm({ type: "user", id: usr.id, name: usr.name || "Usuario" })}
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">Eliminar</span>
                                            <span className="sm:hidden">🗑️</span>
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Usuarios de Prueba */}
                          {testUsers.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between pt-4 border-t border-dashed border-orange-300">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={testUsers.every(u => selectedUsers.includes(u.id))}
                                    onCheckedChange={() => toggleSelectAllUsers(testUsers)}
                                  />
                                  <h3 className="font-semibold text-lg text-orange-600">⚠️ Usuarios de Prueba</h3>
                                  <Badge variant="outline" className="border-orange-400 text-orange-600">{testUsers.length}</Badge>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => {
                                      if (confirm(`🧹 LIMPIEZA DEL SISTEMA\n\nSe eliminarán en cascada:\n• ${testUsers.length} usuarios de prueba\n• Todos los clientes de prueba asociados\n• Todas las citas de clientes de prueba\n• Todas las cotizaciones de clientes de prueba\n• Todos los proyectos de clientes de prueba\n\n⚠️ Esta acción NO se puede deshacer.\n\n¿Continuar?`)) {
                                        const testUserIds = testUsers.map(u => u.id);
                                        deleteTestUsers.mutate({ userIds: testUserIds }, {
                                          onSuccess: (result: any) => {
                                            const msg = `🧹 Limpieza completada:\n• ${result.deletedUsers || result.deleted} usuarios\n• ${result.deletedClients || 0} clientes\n• ${result.deletedAppointments || 0} citas\n• ${result.deletedQuotations || 0} cotizaciones\n• ${result.deletedProjects || 0} proyectos`;
                                            toast.success(msg, { duration: 8000 });
                                            utils.userManagement.listAll.invalidate();
                                            setSelectedUsers([]);
                                          },
                                          onError: (error) => {
                                            toast.error(`Error: ${error.message}`);
                                          }
                                        });
                                      }
                                    }}
                                    disabled={deleteTestUsers.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deleteTestUsers.isPending ? 'Limpiando...' : `🧹 Limpieza del Sistema`}
                                  </Button>
                                  {selectedUsers.some(id => testUsers.map(u => u.id).includes(id)) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-400 text-red-600 hover:bg-red-50"
                                      onClick={() => handleBulkDelete('users')}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar seleccionados ({selectedUsers.filter(id => testUsers.map(u => u.id).includes(id)).length})
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-orange-400 text-orange-600 hover:bg-orange-50"
                                    onClick={() => {
                                      const testUserIds = testUsers.map(u => u.id);
                                      setSelectedUsers(prev => {
                                        const allSelected = testUserIds.every(id => prev.includes(id));
                                        if (allSelected) return prev.filter(id => !testUserIds.includes(id));
                                        return Array.from(new Set([...prev, ...testUserIds]));
                                      });
                                    }}
                                  >
                                    Seleccionar todos
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground bg-orange-50 p-2 rounded">
                                Estos usuarios fueron detectados como cuentas de prueba basado en patrones en su email o nombre. 
                                Puedes seleccionarlos y eliminarlos para limpiar la base de datos.
                              </p>
                              <div className="space-y-3">
                                {testUsers.map((usr) => (
                                  <div key={usr.id} className="border border-orange-200 rounded-lg p-3 sm:p-4 space-y-2 bg-orange-50/50">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={selectedUsers.includes(usr.id)}
                                        onCheckedChange={() => toggleSelectUser(usr.id)}
                                        className="mt-1"
                                      />
                                      <div className="flex items-start justify-between gap-4 flex-1">
                                        <div className="space-y-1 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold">{usr.name || "Sin nombre"}</h3>
                                            <Badge variant="outline" className="border-orange-400 text-orange-600">
                                              Prueba
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground">{usr.email || "Sin email"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Registrado: {new Date(usr.createdAt).toLocaleDateString('es-ES')}
                                          </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          {(user?.role === "super_admin" || user?.role === "admin") && (
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
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hardware Catalog Tab */}
          <TabsContent value="hardware" className="space-y-4">
            <HardwareCatalogAdmin />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Gestión de Proyectos
                </CardTitle>
                <CardDescription>
                  Accede a todos los proyectos de la empresa. Haz clic en el botón para ir a la página completa de proyectos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/projects">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Todos los Proyectos
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Config Tab - Solo Super Admin */}
          {user?.role === "super_admin" && (
            <TabsContent value="pricing" className="space-y-4">
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Configuración de Precios
                  </CardTitle>
                  <CardDescription>
                    Administra todos los precios del sistema de cotizaciones desde un panel dedicado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/pricing-config">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Abrir Panel de Precios
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {user?.role === "super_admin" && (
            <TabsContent value="system-zone" className="space-y-4">
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <Wrench className="h-5 w-5" />
                    Zona Crítica del Sistema
                  </CardTitle>
                  <CardDescription>
                    Operaciones de mantenimiento y limpieza del sistema. Úsalas con cuidado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h3 className="font-semibold text-red-900 mb-2">🧹 LIMPIEZA DE SISTEMA</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Accede al módulo completo de limpieza de datos del sistema para inspeccionar, filtrar y eliminar registros de prueba de forma segura.
                    </p>
                    <Link href="/limpieza-sistema">
                      <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <Wrench className="h-4 w-4 mr-2" />
                        Ir a LIMPIEZA DE SISTEMA
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
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

      {/* Diálogo para editar cumpleaños */}
      <Dialog open={!!editBirthdayUser} onOpenChange={() => setEditBirthdayUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Fecha de Cumpleaños
            </DialogTitle>
            <DialogDescription>
              Configura la fecha de cumpleaños de {editBirthdayUser?.name}. El colaborador recibirá un mensaje especial ese día.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-birthdate">Fecha de Cumpleaños</Label>
              <Input
                id="edit-birthdate"
                type="date"
                value={editBirthdayUser?.birthDate || ""}
                onChange={(e) => setEditBirthdayUser(prev => prev ? { ...prev, birthDate: e.target.value } : null)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (editBirthdayUser) {
                    updateBirthDate.mutate({
                      userId: editBirthdayUser.id,
                      birthDate: editBirthdayUser.birthDate || null,
                    });
                  }
                }}
                disabled={updateBirthDate.isPending}
              >
                {updateBirthDate.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (editBirthdayUser) {
                    updateBirthDate.mutate({
                      userId: editBirthdayUser.id,
                      birthDate: null,
                    });
                  }
                }}
                disabled={updateBirthDate.isPending}
              >
                Quitar Fecha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar teléfono */}
      <Dialog open={!!editPhoneUser} onOpenChange={() => setEditPhoneUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              Teléfono de WhatsApp
            </DialogTitle>
            <DialogDescription>
              Configura el teléfono de {editPhoneUser?.name} para recibir notificaciones por WhatsApp cuando se soliciten cambios en proyectos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Número de Teléfono</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="3001234567"
                value={editPhoneUser?.phone || ""}
                onChange={(e) => setEditPhoneUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
              <p className="text-xs text-muted-foreground">Ingresa solo los 10 dígitos sin espacios ni guiones</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (editPhoneUser) {
                    updateUserPhone.mutate({
                      userId: editPhoneUser.id,
                      phone: editPhoneUser.phone || null,
                    });
                  }
                }}
                disabled={updateUserPhone.isPending}
              >
                {updateUserPhone.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (editPhoneUser) {
                    updateUserPhone.mutate({
                      userId: editPhoneUser.id,
                      phone: null,
                    });
                  }
                }}
                disabled={updateUserPhone.isPending}
              >
                Quitar Teléfono
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición de cliente */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                placeholder="Nombre del cliente"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="cliente@example.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                placeholder="3001234567"
                value={editFormData.whatsappPhone}
                onChange={(e) => setEditFormData(prev => ({ ...prev, whatsappPhone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                placeholder="Dirección del cliente"
                value={editFormData.address}
                onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (editingClient) {
                    updateClient.mutate({
                      id: editingClient.id,
                      ...editFormData
                    });
                  }
                }}
                disabled={updateClient.isPending}
              >
                {updateClient.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingClient(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
