import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Phone, FileText, Users, Trash2, Plus, Bell, Key, Wrench, CheckSquare, Square, Eye, EyeOff, Search, Cake, DollarSign, ClipboardList } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Checkbox } from "@/components/ui/checkbox";
import { RemindersPanel } from "@/components/RemindersPanel";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";
import { formatPrice } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { WhatsAppStatusPanel } from "@/components/WhatsAppStatusPanel";

import { confirmAction } from "@/lib/confirm";
// ── Levantamientos Tab ────────────────────────────────────────────────────────
const WORK_LABELS: Record<string, string> = {
  cocina: "Cocina",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro TV",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-amber-500/15 text-amber-400" },
  enviada: { label: "Enviado", className: "bg-primary/15 text-primary" },
  convertida: { label: "Convertido", className: "bg-green-500/15 text-green-400" },
};

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
  const appointmentsData: any = undefined; const loadingAppointments = false;
  const appointments: any[] = (appointmentsData as any)?.appointments || appointmentsData?.data || [];
  const totalAppointments = appointmentsData?.total || 0;
  const totalAppointmentPages = Math.ceil(totalAppointments / APPOINTMENTS_PER_PAGE) || 1;
  const quotations: any[] = []; const loadingQuotations = false;
  const clientsData: any = undefined; const loadingClients = false;
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

  const medidores = (allUsers as any[]).filter((u: any) => u.role === "medidor");

  const assignMedidorMutation = trpc.appointments.assignMedidor.useMutation({
    onSuccess: () => {
      utils.appointments.listPaginated.invalidate();
      toast.success("Medidor asignado");
    },
    onError: () => toast.error("Error al asignar medidor"),
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

  // ── Crear Cita Dialog ────────────────────────────────────────────────────────
  const [showCrearCitaDialog, setShowCrearCitaDialog] = useState(false);
  const [crearCitaForm, setCrearCitaForm] = useState({
    name: "", phone: "", address: "", workTypes: [] as string[], date: "", time: "",
  });
  const [crearCitaMedidorId, setCrearCitaMedidorId] = useState<number | null>(null);
  const [crearCitaLoading, setCrearCitaLoading] = useState(false);

  const getOrCreateClientMutation = trpc.clients.getOrCreateByWhatsApp.useMutation();
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.listPaginated.invalidate();
    },
  });

  const handleCrearCita = async () => {
    if (!crearCitaForm.name.trim() || !crearCitaForm.phone.trim() || crearCitaForm.workTypes.length === 0) {
      toast.error("Completa nombre, teléfono y al menos un tipo de trabajo");
      return;
    }
    setCrearCitaLoading(true);
    try {
      const client = await getOrCreateClientMutation.mutateAsync({
        name: crearCitaForm.name,
        whatsappPhone: crearCitaForm.phone,
        address: crearCitaForm.address || undefined,
      });
      if (!client) throw new Error("No se pudo crear el cliente");
      const result = await createAppointmentMutation.mutateAsync({
        clientId: client.id,
        workTypes: crearCitaForm.workTypes as any[],
        scheduledDateStr: crearCitaForm.date || undefined,
        scheduledTimeStr: crearCitaForm.time || undefined,
      });
      if (crearCitaMedidorId && (result as any)?.id) {
        await assignMedidorMutation.mutateAsync({ appointmentId: (result as any).id, medidorId: crearCitaMedidorId });
      }
      toast.success("Cita creada exitosamente");
      setShowCrearCitaDialog(false);
      setCrearCitaForm({ name: "", phone: "", address: "", workTypes: [], date: "", time: "" });
      setCrearCitaMedidorId(null);
    } catch (e: any) {
      toast.error(e.message || "Error al crear la cita");
    } finally {
      setCrearCitaLoading(false);
    }
  };

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

  const handleBulkDelete = async (type: 'appointments' | 'quotations' | 'users') => {
    let count = 0;
    let items: number[] = [];
    
    switch (type) {
      case 'appointments':
        count = selectedAppointments.length;
        items = selectedAppointments;
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

    if ((await confirmAction(`¿Estás seguro de eliminar ${count} ${type === 'appointments' ? 'citas' : type === 'quotations' ? 'cotizaciones' : 'usuarios'}?`))) {
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
    <div className="pb-20 md:pb-0">
      <div className="container py-4 md:py-6 px-3 md:px-4">
        <PageHeader
          title="Admin — Usuarios"
          subtitle="Crear usuarios, asignar roles y restablecer claves"
          icon={<Wrench className="h-5 w-5" />}
          showBack={false}
        />
      </div>

      <div className="container py-2 md:py-4 px-3 md:px-4">


        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">





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
                      // Roles que pertenecen al equipo de trabajo.
                      // Al agregar un nuevo colaborador con uno de estos roles, aparece
                      // automáticamente en "Equipo de Trabajo" sin modificar código.
                      const TEAM_ROLES = ['super_admin', 'admin', 'comercial', 'disenador', 'jefe_taller', 'operario', 'medidor', 'contador'];

                      // Un usuario ES del equipo si tiene un rol de equipo asignado
                      const isRealTeamMember = (u: typeof allUsers[0]) => {
                        return TEAM_ROLES.includes(u.role);
                      };

                      // Un usuario ES de prueba si tiene patrones de test en email/nombre
                      // (los miembros del equipo nunca son de prueba)
                      const isTestUser = (u: typeof allUsers[0]) => {
                        if (isRealTeamMember(u)) return false;

                        const email = (u.email || '').toLowerCase();
                        const name = (u.name || '').toLowerCase();

                        const excludedNames = ['alvaro pruebas'];
                        if (excludedNames.some(n => name === n)) return false;

                        const testEmailPatterns = ['test@', 'test.', 'prueba@', 'ejemplo@', 'example@', 'demo@', 'fake@', 'dummy@', 'admin-bulk', 'newadmin', 'newsuperadmin'];
                        const hasTestEmailPattern = testEmailPatterns.some(p => email.includes(p));

                        const testDomains = ['@test.com', '@example.com', '@prueba.com', '@demo.com', '@fake.com', '@testing.com'];
                        const hasTestDomain = testDomains.some(d => email.endsWith(d));

                        const testNamePatterns = ['cliente test', 'test client', 'usuario test', 'test user', 'cliente prueba', 'usuario prueba', 'cliente de prueba', 'test timezone', 'admin test', 'new admin', 'new super admin'];
                        const hasTestNamePattern = testNamePatterns.some(p => name.includes(p));

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
                                              usr.role === "disenador" ? "bg-teal-600" :
                                              usr.role === "jefe_taller" ? "bg-orange-600" :
                                              usr.role === "operario" ? "bg-amber-600 text-black" :
                                              usr.role === "medidor" ? "bg-purple-600" :
                                              usr.role === "contador" ? "bg-teal-600" : ""
                                            }
                                          >
                                            {usr.role === "super_admin" ? "Super Admin" :
                                             usr.role === "admin" ? "Administrador" :
                                             usr.role === "comercial" ? "Comercial" :
                                             usr.role === "disenador" ? "Diseñador" :
                                             usr.role === "jefe_taller" ? "Jefe de Taller" :
                                             usr.role === "operario" ? "Operario" :
                                             usr.role === "medidor" ? "Medidor" :
                                             usr.role === "contador" ? "Contador" : "Usuario"}
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
                                                onClick={async () => {
                                                  if ((await confirmAction(
                                                    `¿Resetear contraseña de ${usr.name}? Se generará una contraseña temporal.`
                                                  ))) {
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
                                              usr.role === "disenador" ? "bg-teal-600" :
                                              usr.role === "jefe_taller" ? "bg-orange-600" :
                                              usr.role === "operario" ? "bg-amber-600 text-black" :
                                              usr.role === "medidor" ? "bg-purple-600" :
                                              usr.role === "contador" ? "bg-teal-600" : ""
                                            }
                                          >
                                            {usr.role === "super_admin" ? "Super Admin" :
                                             usr.role === "admin" ? "Administrador" :
                                             usr.role === "comercial" ? "Comercial" :
                                             usr.role === "disenador" ? "Diseñador" :
                                             usr.role === "jefe_taller" ? "Jefe de Taller" :
                                             usr.role === "operario" ? "Operario" :
                                             usr.role === "medidor" ? "Medidor" :
                                             usr.role === "contador" ? "Contador" : "Usuario"}
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
                                            onClick={async () => {
                                              const newRole = 
                                                usr.role === "user" ? "admin" :
                                                usr.role === "admin" ? "user" :
                                                "user";
                                              if ((await confirmAction(
                                                `¿Cambiar rol de ${usr.name} a ${newRole === "admin" ? "Administrador" : "Usuario"}?`
                                              ))) {
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
                                              onClick={async () => {
                                                if ((await confirmAction(
                                                  `¿Resetear contraseña de ${usr.name}? Se generará una contraseña temporal.`
                                                ))) {
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
                              <div className="flex items-center justify-between pt-4 border-t border-dashed border-orange-500/30">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={testUsers.every(u => selectedUsers.includes(u.id))}
                                    onCheckedChange={() => toggleSelectAllUsers(testUsers)}
                                  />
                                  <h3 className="font-semibold text-lg text-white/45">⚠️ Usuarios de Prueba</h3>
                                  <Badge variant="outline" className="border-orange-500/40 text-white/45">{testUsers.length}</Badge>
                                </div>
                                <div className="flex gap-2 flex-wrap">

                                  {selectedUsers.some(id => testUsers.map(u => u.id).includes(id)) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-400 text-red-400 hover:bg-red-500/10"
                                      onClick={() => handleBulkDelete('users')}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar seleccionados ({selectedUsers.filter(id => testUsers.map(u => u.id).includes(id)).length})
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-orange-500/40 text-white/45 hover:bg-orange-500/10"
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
                              <p className="text-sm text-muted-foreground bg-orange-500/10 p-2 rounded">
                                Estos usuarios fueron detectados como cuentas de prueba basado en patrones en su email o nombre. 
                                Puedes seleccionarlos y eliminarlos para limpiar la base de datos.
                              </p>
                              <div className="space-y-3">
                                {testUsers.map((usr) => (
                                  <div key={usr.id} className="border border-orange-500/25 rounded-lg p-3 sm:p-4 space-y-2 bg-orange-500/10/50">
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
                                            <Badge variant="outline" className="border-orange-500/40 text-white/45">
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


        </Tabs>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {deleteConfirm?.type === "appointment" ? "cita" : deleteConfirm?.type === "quotation" ? "cotización" : deleteConfirm?.type === "client" ? "cliente" : "usuario"}?</DialogTitle>
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
              disabled={deleteAppointment.isPending || deleteQuotation.isPending || deleteClient.isPending || deleteUser.isPending}
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
              <Key className="h-5 w-5 text-green-400" />
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
            <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
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
              <Cake className="h-5 w-5 text-purple-500" />
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
