import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Home,
  Pencil,
  Check,
  X,
  ClipboardList,
  Plus,
  Search,
  UserCheck,
  MessageCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { VisualCalendar } from "@/components/VisualCalendar";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Nombres de los días y meses en español
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Festivos colombianos 2025-2026
const COLOMBIAN_HOLIDAYS = new Set([
  "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18",
  "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20",
  "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17",
  "2025-12-08", "2025-12-25",
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
]);

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return COLOMBIAN_HOLIDAYS.has(dateStr);
}

function getDayAvailability(date: Date): "full" | "blocked" | "none" {
  const day = date.getDay();
  // Domingos y festivos - no laborables
  if (day === 0 || isHoliday(date)) return "none";
  // Días bloqueados para citas: Sábados (6), Lunes (1) y Miércoles (3)
  if (day === 6 || day === 1 || day === 3) return "blocked";
  // Días disponibles para citas: Martes, Jueves y Viernes
  return "full";
}

// Horarios disponibles
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00"
];

const WORK_TYPE_LABELS: Record<string, string> = {
  cocina: "Cocina",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  scheduledDate: Date;
  status: string;
  workTypes: string[];
  notes?: string;
  rescheduleRequestedDate?: string | null;
  rescheduleRequestedTime?: string | null;
  appointmentToken?: string | null;
}

// Helper: Drizzle retorna timestamps sin timezone ("2026-09-28 13:30:00")
// Chrome lo parsea como hora local → forzar UTC
const parseDBDate = (ds: string | Date | null | undefined): Date => {
  if (!ds) return new Date();
  if (ds instanceof Date) return ds;
  if (!ds.includes('T') && !ds.includes('Z') && !ds.includes('+')) {
    return new Date((ds as string).replace(' ', 'T') + 'Z');
  }
  return new Date(ds as string);
};

const COUNTRY_CODES = [
  { code: "57",  flag: "🇨🇴", label: "Colombia (+57)" },
  { code: "1",   flag: "🇺🇸", label: "EEUU (+1)" },
  { code: "34",  flag: "🇪🇸", label: "España (+34)" },
  { code: "41",  flag: "🇨🇭", label: "Suiza (+41)" },
  { code: "54",  flag: "🇦🇷", label: "Argentina (+54)" },
  { code: "52",  flag: "🇲🇽", label: "México (+52)" },
  { code: "44",  flag: "🇬🇧", label: "Reino Unido (+44)" },
  { code: "49",  flag: "🇩🇪", label: "Alemania (+49)" },
  { code: "33",  flag: "🇫🇷", label: "Francia (+33)" },
  { code: "39",  flag: "🇮🇹", label: "Italia (+39)" },
];

// Helper: genera link de WhatsApp al cliente con mensaje de confirmación
function buildWhatsAppConfirmLink(apt: { clientPhone?: string; clientName: string; scheduledDate: Date; workTypes: string[]; notes?: string }): string | null {
  if (!apt.clientPhone) return null;
  const phone = apt.clientPhone.replace(/[^0-9]/g, "");
  const intlPhone = phone.startsWith("57") ? phone : `57${phone}`;
  const parsedDate = parseDBDate(apt.scheduledDate as any);
  const dateStr = parsedDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Bogota" });
  const timeStr = parsedDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
  const workLabel: Record<string, string> = { cocina: "Cocina Integral", closet: "Closet", puertas: "Puertas", centro_tv: "Centro de Entretenimiento", bano: "Mueble de Baño", escalera: "Escalera", empresas: "Mobiliario Empresarial", otro: "Toma de medidas" };
  const workTypes = apt.workTypes.map(w => workLabel[w] || w).join(", ") || "Toma de medidas";
  const msg = `Hola ${apt.clientName} 👋, le escribe *INNOVAR Cocinas de Diseño*.

✅ Quedó confirmada su cita de *${workTypes}*.

📅 Fecha: ${dateStr}
⏰ Hora: ${timeStr}

📍 Estaremos en su domicilio en la hora indicada.

Cualquier duda, estamos a sus órdenes. ¡Gracias por confiar en nosotros! 🙏`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
}


// Botón para enviar WhatsApp de confirmación al cliente (sin query al servidor)
function buildWhatsAppLink(apt: any): string | null {
  const phone = apt.clientPhone;
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
  const name = apt.clientName || "cliente";
  let dateStr = "";
  let timeStr = "";
  if (apt.scheduledDate) {
    const d = new Date(apt.scheduledDate);
    dateStr = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
    timeStr = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
  }
  let msg = `Hola ${name} 👋, le escribe *INNOVAR Cocinas de Diseño*.

`;
  msg += `✅ Le confirmamos su cita de visita de toma de medidas.

`;
  if (dateStr) { msg += `📅 *Fecha:* ${dateStr}
⏰ *Hora:* ${timeStr}

`; }
  msg += `📍 Estaremos en su domicilio a la hora acordada.

`;
  if (apt.appointmentToken) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://app.cocinasintegralespereira.co";
    msg += `🔗 *Ver / cancelar / reagendar su cita:*
${base}/cita?token=${apt.appointmentToken}

`;
  }
  msg += `Cualquier duda, estamos a sus órdenes. ¡Gracias por su confianza! 🙏`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
}

function SendWhatsAppButton({ apt }: { apt: any }) {
  const link = buildWhatsAppLink(apt);
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white"
      style={{ background: "#25D366" }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      WhatsApp
    </a>
  );
}

export default function AppointmentsCalendar() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [assigningMedidor, setAssigningMedidor] = useState(false);
  const [selectedMedidorId, setSelectedMedidorId] = useState<number | null>(null);
  const [editMedidorId, setEditMedidorId] = useState<number | null>(null);

  // Estado para nueva cita
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newClientSearch, setNewClientSearch] = useState("");
  const [newClientId, setNewClientId] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newWorkTypes, setNewWorkTypes] = useState<string[]>([]);
  const [newAptDate, setNewAptDate] = useState("");
  const [newAptTime, setNewAptTime] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("57");
  const [newIdentificationNumber, setNewIdentificationNumber] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [newMedidorId, setNewMedidorId] = useState<number | null>(null);

  // Obtener citas
  const { data: appointmentsData = [], refetch } = trpc.appointments.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial" || user?.role === "medidor" }
  );

  // Mutación para actualizar fecha
  const updateDateMutation = trpc.appointments.updateDate.useMutation({
    onSuccess: (data) => {
      toast.success("Fecha de cita actualizada");
      refetch();
      setEditingAppointment(null);
      setSelectedAppointment(null);
      if (data?.whatsappLink) {
        toast("Notificar al cliente por WhatsApp", {
          duration: 15000,
          action: { label: "Enviar WhatsApp", onClick: () => window.open(data.whatsappLink!, "_blank") },
        });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar la fecha");
    },
  });

  // Asignar medidor desde detalle
  const assignMedidorDetailMutation = trpc.appointments.assignMedidor.useMutation({
    onSuccess: () => {
      toast.success("Medidor asignado");
      refetch();
      setAssigningMedidor(false);
      setSelectedAppointment(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al asignar medidor");
    },
  });

  // Medidores para detalle (load when dialog open)
  const { data: detailMedidoresData = [] } = trpc.appointments.listMedidores.useQuery(undefined, {
    enabled: !!selectedAppointment || !!editingAppointment,
  });
  const detailMedidores = detailMedidoresData as { id: number; name: string }[];

  // Buscar clientes para nueva cita
  const { data: clientsData } = trpc.clients.listPaginated.useQuery(
    { search: newClientSearch || undefined, limit: 10, page: 1 },
    { enabled: showNewDialog && newClientSearch.length >= 2 }
  );
  const clientResults = (clientsData?.clients ?? []) as { id: number; name: string; whatsappPhone?: string; phone?: string; address?: string }[];

  // Mutación para crear cita
  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: (data) => {
      toast.success("Cita creada exitosamente");
      // Mostrar link de WhatsApp al admin si no se envió automáticamente
      if (data?.whatsappClientLink && !data?.whatsappAutoSent) {
        toast("Notificar al cliente por WhatsApp", {
          duration: 15000,
          action: {
            label: "Enviar por WhatsApp",
            onClick: () => window.open(data.whatsappClientLink, "_blank"),
          },
        });
      }
      refetch();
      setShowNewDialog(false);
      setNewClientSearch("");
      setNewClientId(null);
      setNewClientName("");
      setNewWorkTypes([]);
      setNewAptDate("");
      setNewAptTime("");
      setNewNotes("");
      setNewClientPhone("");
      setNewClientAddress("");
      setNewCountryCode("57");
      setNewIdentificationNumber("");
      setIsNewClient(false);
      setNewMedidorId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear la cita");
    },
  });

  // Mutación para marcar como enviada
  const markSentMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      refetch();
      setSelectedAppointment(prev =>
        prev && prev.id === variables.id ? { ...prev, status: variables.status } : prev
      );
      toast.success("Cita marcada como enviada ✓");
    },
    onError: (err) => {
      toast.error(err.message || "Error al actualizar el estado");
    },
  });

  // Mutación para eliminar cita
  const cancelAppointmentMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      setSelectedAppointment(null);
      toast.success("Cita cancelada");
    },
    onError: () => toast.error("Error al cancelar la cita"),
  });

  const deleteAppointmentMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAppointment(null);
      toast.success("Cita eliminada");
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar la cita");
    },
  });

  // Mutación para confirmar reagendamiento solicitado por cliente
  const confirmRescheduleMutation = trpc.availability.confirmReschedule.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success("Reagendamiento confirmado ✓");
      if (data?.whatsappLink) {
        toast("Notificar al cliente por WhatsApp", {
          duration: 15000,
          action: { label: "Enviar WhatsApp", onClick: () => window.open(data.whatsappLink!, "_blank") },
        });
      }
    },
    onError: (err) => toast.error(err.message || "Error al confirmar"),
  });

  // Mutación para crear cliente nuevo
  const createClientMutation = trpc.clients.createQuick.useMutation({
    onError: (error) => {
      toast.error(error.message || "Error al crear el cliente");
    },
  });

  // canCreateAppointment must be declared before medidoresData (used in 'enabled')
  const canCreateAppointment = user && ["super_admin", "admin", "comercial"].includes(user.role);

  // Medidores disponibles
  const { data: medidoresData = [] } = trpc.appointments.listMedidores.useQuery(undefined, {
    enabled: showNewDialog && !!canCreateAppointment,
  });
  const medidores = medidoresData as { id: number; name: string }[];

  // Asignar medidor
  const assignMedidorMutation = trpc.appointments.assignMedidor.useMutation({
    onError: (error) => {
      toast.error("Error al asignar medidor: " + (error.message || "Error desconocido"));
    },
  });

  const handleCreateAppointment = async () => {
    if (newWorkTypes.length === 0) return;
    let clientId = newClientId;

    if (isNewClient) {
      if (!newClientName || newClientName.length < 2 || !newClientPhone || newClientPhone.length < 10) return;
      try {
        const newClient = await createClientMutation.mutateAsync({
          name: newClientName,
          whatsappPhone: `${newCountryCode}${newClientPhone.replace(/\D/g, "")}`,
          address: newClientAddress || undefined,
          identificationNumber: newIdentificationNumber || undefined,
          internalManagement: true,
        });
        clientId = (newClient as any)?.client?.id ?? (newClient as any)?.id ?? null;
      } catch {
        return;
      }
    }

    if (!clientId) return;
    try {
      const result = await createMutation.mutateAsync({
        clientId,
        workTypes: newWorkTypes as any,
        scheduledDateStr: newAptDate || undefined,
        scheduledTimeStr: newAptTime || undefined,
        notes: newNotes || undefined,
        bypassDayRestriction: user?.role === "super_admin",
      });
      if (newMedidorId && result?.id) {
        await assignMedidorMutation.mutateAsync({
          appointmentId: result.id,
          medidorId: newMedidorId,
        });
      }
    } catch {
      // errors handled by mutations
    }
  };


  // Procesar citas - filtrar solo citas de hoy en adelante
  const appointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Inicio del día actual
    
    return appointmentsData
      .filter((apt: any) => {
        if (!apt.scheduledDate) return false;
        const aptStr = new Date(apt.scheduledDate).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
        const todayStr = today.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
        return aptStr >= todayStr;
      })
      .map((apt: any) => ({
        id: apt.id,
        clientId: apt.clientId,
        clientName: apt.client?.name || "Cliente",
        clientPhone: apt.client?.whatsappPhone || apt.client?.phone,
        clientAddress: apt.client?.address,
        scheduledDate: parseDBDate(apt.scheduledDate),
        status: apt.status,
        workTypes: apt.workTypes || [],
        notes: apt.notes,
        appointmentToken: apt.appointmentToken ?? null,
        rescheduleRequestedDate: apt.rescheduleRequestedDate ?? null,
        rescheduleRequestedTime: apt.rescheduleRequestedTime ?? null,
        assignedMedidorId: apt.assignedMedidorId ?? null,
      }));
  }, [appointmentsData]);

  // Obtener citas para una fecha específica
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const targetStr = date.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    return appointments.filter(apt => {
      const aptStr = new Date(apt.scheduledDate).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      return aptStr === targetStr;
    });
  };

  // Generar días del mes
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Navegación
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Verificar permisos
  const canViewCalendar = user && ["super_admin", "admin", "comercial", "medidor"].includes(user.role);
  const canEditDates = user && ["super_admin", "admin"].includes(user.role);

  if (!canViewCalendar) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No tienes permisos para ver este calendario.</p>
            <Link href="/">
              <Button className="mt-4">Volver al Inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditClick = (apt: Appointment) => {
    setEditingAppointment(apt);
    const date = new Date(apt.scheduledDate);
    // Extraer fecha y hora en zona horaria de Colombia
    const colombiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
    const colombiaTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date);
    setNewDate(colombiaDate);
    setNewTime(colombiaTime === "24:00" ? "00:00" : colombiaTime);
    // Pre-cargar medidor asignado
    setEditMedidorId((apt as any).assignedMedidorId ?? null);
  };

  const handleSaveDate = async () => {
    if (!editingAppointment || !newDate || !newTime) return;
    await updateDateMutation.mutateAsync({
      id: editingAppointment.id,
      scheduledDateStr: newDate,
      scheduledTimeStr: newTime,
    });
    // Asignar medidor si cambió
    if (editMedidorId !== ((editingAppointment as any).assignedMedidorId ?? null)) {
      assignMedidorDetailMutation.mutate({
        appointmentId: editingAppointment.id,
        medidorId: editMedidorId,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: "bg-yellow-500/15 text-yellow-400",
      confirmada: "bg-blue-500/20 text-blue-300",
      completada: "bg-green-500/15 text-green-400",
      cancelada: "bg-red-500/15 text-red-400",
      enviada: "bg-teal-500/20 text-teal-300",
    };
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      confirmada: "Confirmada",
      completada: "Completada",
      cancelada: "Cancelada",
      enviada: "Enviada ✓",
    };
    return (
      <Badge className={styles[status] || "bg-white/[0.08] text-white/70"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="container py-4 md:py-6 px-3 md:px-4">
        <PageHeader
          title="Calendario de Citas"
          subtitle="Citas de toma de medidas programadas"
          icon={<Calendar className="h-5 w-5" />}
          showBack={true}
          actions={
            <div className="flex items-center gap-2">
              {canCreateAppointment && (
                <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4" />
                  <span>Nueva Cita</span>
                </Button>
              )}
              {user?.role !== "medidor" && (
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Instalaciones</span>
                  </Button>
                </Link>
              )}
            </div>
          }
        />
      </div>

      <main className="container py-4 md:py-6 px-3 md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendario */}
          <div className="lg:col-span-3">
            <Card className="bg-[#162828] border border-white/[0.06] overflow-hidden" style={{ borderTop: "3px solid #1DB5A8" }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold min-w-0 md:min-w-[180px] text-center">
                      {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS_SHORT.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-white/40 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dayAppointments = getAppointmentsForDate(date);
                    const availability = getDayAvailability(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          relative p-1 md:p-2 min-h-[60px] md:min-h-[80px] rounded-lg border transition-all
                          ${!isCurrentMonth ? "opacity-40" : ""}
                          ${isToday ? "ring-2 ring-teal-500" : ""}
                          ${isSelected ? "bg-teal-500/20 border-teal-500/50" : "border-white/[0.08] hover:border-white/[0.18]"}
                          ${availability === "none" ? "bg-transparent" : availability === "blocked" ? "bg-white/[0.03]" : "bg-white/[0.07]"}
                        `}
                      >
                        <div className="flex flex-col items-start leading-tight">
                          <span className={`text-[10px] font-normal ${availability === "none" ? "text-white/15" : availability === "blocked" ? "text-white/20" : "text-white/35"}`}>
                            {DAYS_SHORT[date.getDay()]}
                          </span>
                          <span className={`text-sm font-semibold ${isToday ? "text-teal-400" : availability === "none" ? "text-white/20" : availability === "blocked" ? "text-white/30" : "text-white/85"}`}>
                            {date.getDate()}
                          </span>
                        </div>

                        {/* Indicadores de citas */}
                        {dayAppointments.length > 0 && (
                          <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 justify-center">
                            {dayAppointments.slice(0, 3).map((apt, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  apt.status === "completada" ? "bg-green-400" :
                                  apt.status === "cancelada" ? "bg-red-400" :
                                  apt.status === "confirmada" ? "bg-blue-400" :
                                  "bg-yellow-400"
                                }`}
                              />
                            ))}
                            {dayAppointments.length > 3 && (
                              <span className="text-[10px] text-white/35">+{dayAppointments.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda de estados de citas */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span>Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span>Confirmada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span>Completada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span>Cancelada</span>
                  </div>
                </div>

                {/* Leyenda de disponibilidad */}
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#162828] border border-white/[0.15]" />
                    <span>Disponible (Mar, Jue, Vie)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white/[0.05] border border-white/[0.12]" />
                    <span>Bloqueado (Lun, Mié, Sáb)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-white/[0.07]" />
                    <span>No laborable (Dom, Festivos)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral - Citas del día seleccionado */}
          <div className="lg:col-span-1">
            <Card className="bg-[#162828] border border-white/[0.06] overflow-hidden" style={{ borderTop: "3px solid #1DB5A8" }}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-400" />
                  {selectedDate ? (
                    <>Citas del {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}</>
                  ) : (
                    <>Selecciona un día</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <>
                    {getAppointmentsForDate(selectedDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay citas programadas para este día
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {getAppointmentsForDate(selectedDate).map(apt => (
                          <div
                            key={apt.id}
                            className="p-3 rounded-lg border bg-[#162828] hover:shadow-sm cursor-pointer transition-all"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{apt.clientName}</p>
                                <p className="text-xs text-white/40 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(apt.scheduledDate).toLocaleTimeString("es-CO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "America/Bogota",
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {getStatusBadge(apt.status)}
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {apt.workTypes.map((wt: string) => (
                                <Badge key={wt} variant="outline" className="text-xs">
                                  {WORK_TYPE_LABELS[wt] || wt}
                                </Badge>
                              ))}
                            </div>
                            {/* Botón WhatsApp — igual que cotizaciones */}
                            {buildWhatsAppConfirmLink(apt) && apt.status !== "enviada" && (
                              <Button
                                size="sm"
                                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                                disabled={markSentMutation.isPending || !apt.clientPhone}
                                title={!apt.clientPhone ? "El cliente no tiene teléfono WhatsApp registrado" : "Enviar confirmación de cita por WhatsApp"}
                                onClick={e => {
                                  e.stopPropagation();
                                  window.open(buildWhatsAppConfirmLink(apt)!, "_blank", "noopener,noreferrer");
                                  markSentMutation.mutate({ id: apt.id, status: "enviada" });
                                }}
                              >
                                {markSentMutation.isPending
                                  ? <span className="h-4 w-4 mr-1 inline-block animate-spin">⏳</span>
                                  : <MessageCircle className="h-4 w-4 mr-1" />
                                }
                                WhatsApp
                              </Button>
                            )}
                            {apt.status === "reagendamiento_solicitado" && apt.rescheduleRequestedDate && apt.rescheduleRequestedTime && (
                              <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-xs text-orange-300 font-medium mb-1">📅 Solicitud de reagendamiento</p>
                                <p className="text-xs text-white/70 mb-2">
                                  {apt.rescheduleRequestedDate} a las {apt.rescheduleRequestedTime}
                                </p>
                                <Button
                                  size="sm"
                                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs"
                                  disabled={confirmRescheduleMutation.isPending}
                                  onClick={e => {
                                    e.stopPropagation();
                                    confirmRescheduleMutation.mutate({ id: apt.id });
                                  }}
                                >
                                  {confirmRescheduleMutation.isPending ? "⏳ Confirmando..." : "✓ Confirmar reagendamiento"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Haz clic en un día para ver las citas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Resumen */}
            <Card className="mt-4 bg-[#162828] border border-white/[0.06] overflow-hidden" style={{ borderTop: "3px solid #6366F1" }}>
              <CardHeader>
                <CardTitle className="text-sm">Resumen del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/45">Total citas:</span>
                    <span className="font-medium">{appointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/45">Pendientes:</span>
                    <span className="font-medium text-yellow-400">
                      {appointments.filter(a => a.status === "pendiente").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/45">Confirmadas:</span>
                    <span className="font-medium text-teal-400">
                      {appointments.filter(a => a.status === "confirmada").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/45">Completadas:</span>
                    <span className="font-medium text-green-400">
                      {appointments.filter(a => a.status === "completada").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialog Nueva Cita */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-400" />
              Nueva Cita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Buscar / crear cliente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Cliente *</Label>
                <button
                  type="button"
                  className="text-xs text-teal-400 hover:text-teal-300 underline"
                  onClick={() => {
                    setIsNewClient(!isNewClient);
                    setNewClientId(null);
                    setNewClientName("");
                    setNewClientSearch("");
                    setNewClientPhone("");
                    setNewClientAddress("");
                  }}
                >
                  {isNewClient ? "Buscar cliente existente" : "Crear nuevo cliente"}
                </button>
              </div>

              {isNewClient ? (
                /* Modo nuevo cliente */
                <Input
                  placeholder="Nombre completo del cliente *"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="mt-1"
                />
              ) : newClientId ? (
                /* Cliente seleccionado */
                <div className="flex items-center justify-between p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg mt-1">
                  <div>
                    <span className="font-medium text-sm">{newClientName}</span>
                    {newClientPhone && <div className="text-xs text-white/40">{newClientPhone}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setNewClientId(null); setNewClientName(""); setNewClientSearch(""); setNewClientPhone(""); setNewClientAddress(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                /* Búsqueda */
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={newClientSearch}
                    onChange={(e) => setNewClientSearch(e.target.value)}
                    className="pl-9"
                  />
                  {newClientSearch.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#162828] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {clientResults.length > 0 ? (
                        clientResults.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                            onClick={() => { setNewClientId(c.id); setNewClientName(c.name); setNewClientPhone(c.whatsappPhone || c.phone || ""); setNewClientAddress(c.address || ""); setNewClientSearch(""); }}
                          >
                            <div className="font-medium">{c.name}</div>
                            {c.whatsappPhone && <div className="text-xs text-white/40">{c.whatsappPhone}</div>}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-white/40">
                          No encontrado —{" "}
                          <button
                            className="text-teal-400 underline"
                            onClick={() => { setIsNewClient(true); setNewClientName(newClientSearch); setNewClientSearch(""); }}
                          >
                            crear como nuevo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <Label className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-white/40" />
                Teléfono / WhatsApp
              </Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={newCountryCode}
                  onChange={(e) => setNewCountryCode(e.target.value)}
                  className="bg-[#162828] border border-white/[0.10] text-white rounded-md px-2 py-2 text-sm"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.flag} +{cc.code}</option>
                  ))}
                </select>
                <Input
                  placeholder="Número de teléfono o WhatsApp"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Cédula / ID */}
            <div>
              <Label className="flex items-center gap-1">
                Cédula / Identificación
              </Label>
              <Input
                placeholder="Número de identificación (opcional)"
                value={newIdentificationNumber}
                onChange={(e) => setNewIdentificationNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Dirección */}
            <div>
              <Label className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-white/40" />
                Dirección
              </Label>
              <Input
                placeholder="Dirección del proyecto"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Asignar medidor */}
            {canCreateAppointment && (
              <div>
                <Label className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-white/40" />
                  Asignar medidor
                </Label>
                <select
                  value={newMedidorId ?? ""}
                  onChange={(e) => setNewMedidorId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full mt-1 bg-[#162828] border border-white/[0.10] text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {medidores.length === 0 ? (
                    <option disabled>Cargando medidores...</option>
                  ) : (
                    medidores.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Tipos de trabajo */}
            <div>
              <Label>Tipos de trabajo *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(WORK_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`wt-${key}`}
                      checked={newWorkTypes.includes(key)}
                      onCheckedChange={(checked) => {
                        setNewWorkTypes(checked
                          ? [...newWorkTypes, key]
                          : newWorkTypes.filter((w) => w !== key)
                        );
                      }}
                    />
                    <label htmlFor={`wt-${key}`} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Fecha y hora */}
            <div>
              <Label>Fecha y hora (opcional)</Label>
              <div className="mt-2">
                <VisualCalendar
                  selectedDate={newAptDate}
                  selectedTime={newAptTime}
                  onDateChange={(date) => { setNewAptDate(date); setNewAptTime(""); }}
                  onTimeChange={(time) => setNewAptTime(time)}
                  bypassDayRestriction={user?.role === "super_admin"}
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={(!newClientId && !isNewClient) || (isNewClient && (!newClientName || newClientName.length < 2 || !newClientPhone || newClientPhone.length < 10)) || newWorkTypes.length === 0 || createMutation.isPending || createClientMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {createMutation.isPending || createClientMutation.isPending ? "Creando..." : "Crear Cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            {/* Dialog de detalle de cita */}
      <Dialog open={!!selectedAppointment && !editingAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-400" />
              Detalle de Cita
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-white/45" />
                  <span className="font-medium">{selectedAppointment.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAppointment.status)}
                  {selectedAppointment.status !== "enviada" && (
                    <button
                      onClick={() => markSentMutation.mutate({ id: selectedAppointment.id, status: "enviada" })}
                      className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30 transition-colors"
                      title="Marcar esta cita como ya enviada al cliente"
                    >
                      Marcar enviada
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/45 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Fecha
                  </div>
                  <div className="font-medium">
                    {new Date(selectedAppointment.scheduledDate).toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "America/Bogota",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/45 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Hora
                  </div>
                  <div className="font-medium">
                    {new Date(selectedAppointment.scheduledDate).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Bogota",
                    })}
                  </div>
                </div>
              </div>

              {selectedAppointment.clientPhone && (
                <div>
                  <div className="text-sm text-white/45 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </div>
                  <div className="font-medium">{selectedAppointment.clientPhone}</div>
                </div>
              )}

              {(selectedAppointment as any).appointmentToken && (
                <div>
                  <div className="text-sm text-white/45 flex items-center gap-1">
                    <span>🔗</span>
                    Enlace del cliente (cancelar / reagendar)
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`${window.location.origin}/cita?token=${(selectedAppointment as any).appointmentToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 text-xs underline truncate max-w-[220px]"
                    >
                      /cita?token={(selectedAppointment as any).appointmentToken?.slice(0, 12)}...
                    </a>
                    <button
                      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/cita?token=${(selectedAppointment as any).appointmentToken}`);
                        toast.success("Enlace copiado");
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {selectedAppointment.clientAddress && (
                <div>
                  <div className="text-sm text-white/45 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </div>
                  <div className="font-medium">{selectedAppointment.clientAddress}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-white/45 mb-2">Tipos de trabajo</div>
                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.workTypes.map((wt: string) => (
                    <Badge key={wt} variant="secondary">
                      {WORK_TYPE_LABELS[wt] || wt}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <div className="text-sm text-white/45">Notas</div>
                  <div className="text-sm bg-white/[0.04] p-2 rounded">{selectedAppointment.notes}</div>
                </div>
              )}

              {canEditDates && (
                <div className="space-y-3">
                  {/* Asignar medidor */}
                  <div>
                    <p className="text-sm text-white/45 mb-1 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" />
                      Asignar medidor
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={selectedMedidorId ?? ""}
                        onChange={(e) => setSelectedMedidorId(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 bg-[#162828] border border-white/[0.10] text-white rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Sin asignar</option>
                        {detailMedidores.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={assignMedidorDetailMutation.isPending}
                        onClick={() => {
                          if (!selectedAppointment) return;
                          assignMedidorDetailMutation.mutate({
                            appointmentId: selectedAppointment.id,
                            medidorId: selectedMedidorId,
                          });
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        {assignMedidorDetailMutation.isPending ? "..." : "Asignar"}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <div className="flex gap-2">
                      {selectedAppointment.status !== "cancelada" && selectedAppointment.status !== "completada" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!confirm("¿Cancelar esta cita? El estado cambiará a Cancelada (el registro se conserva).")) return;
                            cancelAppointmentMutation.mutate({ id: selectedAppointment.id, status: "cancelada" });
                          }}
                          disabled={cancelAppointmentMutation.isPending}
                          className="gap-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <XCircle className="h-4 w-4" />
                          {cancelAppointmentMutation.isPending ? "..." : "Cancelar"}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
                          deleteAppointmentMutation.mutate({ id: selectedAppointment.id });
                        }}
                        disabled={deleteAppointmentMutation.isPending}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleteAppointmentMutation.isPending ? "..." : "Eliminar"}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <SendWhatsAppButton apt={selectedAppointment} />
                      <Button
                        variant="outline"
                        onClick={() => handleEditClick(selectedAppointment)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar Fecha
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              )}

              {user?.role === "medidor" && (
                <DialogFooter>
                  <Button
                    onClick={() => {
                      const apt = selectedAppointment;
                      const params = new URLSearchParams({
                        from: "apt",
                        id: String(apt.id),
                        name: apt.clientName || "",
                        phone: apt.clientPhone || "",
                        address: apt.clientAddress || "",
                        workType: apt.workTypes?.[0] || "",
                      });
                      navigate(`/medidor?${params.toString()}`);
                    }}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Iniciar Levantamiento
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edición de fecha - usa VisualCalendar con las mismas restricciones */}
      <Dialog open={!!editingAppointment} onOpenChange={() => setEditingAppointment(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-400" />
              Reagendar Cita
            </DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <div className="text-sm text-white/55">
                Cliente: <span className="font-medium">{editingAppointment.clientName}</span>
              </div>

              <VisualCalendar
                selectedDate={newDate}
                selectedTime={newTime}
                onDateChange={(date) => {
                  setNewDate(date);
                  setNewTime("");
                }}
                onTimeChange={(time) => setNewTime(time)}
                excludeId={editingAppointment?.id}
              />

              {/* Selector de medidor */}
              {canEditDates && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Asignar medidor</label>
                  <select
                    value={editMedidorId ?? ""}
                    onChange={(e) => setEditMedidorId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Sin asignar</option>
                    {detailMedidores.length === 0
                      ? <option disabled>Cargando...</option>
                      : detailMedidores.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))
                    }
                  </select>
                </div>
              )}

              {newDate && newTime && (
                <div className="bg-teal-500/10 border border-teal-500/25 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-teal-300">Nueva fecha seleccionada:</p>
                  <p className="text-teal-300/80">
                    {new Date(newDate + "T12:00:00").toLocaleDateString("es-CO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "America/Bogota",
                    })}{" "}
                    a las{" "}
                    {(() => {
                      const [h, m] = newTime.split(":");
                      const hour = parseInt(h);
                      const ampm = hour >= 12 ? "PM" : "AM";
                      const displayHour = hour > 12 ? hour - 12 : hour;
                      return `${displayHour}:${m} ${ampm}`;
                    })()}
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditingAppointment(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveDate}
                  disabled={!newDate || !newTime || updateDateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {updateDateMutation.isPending ? "Guardando..." : "Reagendar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
