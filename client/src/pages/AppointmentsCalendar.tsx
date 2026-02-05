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
import { Link } from "wouter";
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
} from "lucide-react";
import { toast } from "sonner";

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
}

export default function AppointmentsCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Obtener citas
  const { data: appointmentsData = [], refetch } = trpc.appointments.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial" }
  );

  // Mutación para actualizar fecha
  const updateDateMutation = trpc.appointments.updateDate.useMutation({
    onSuccess: () => {
      toast.success("Fecha de cita actualizada");
      refetch();
      setEditingAppointment(null);
      setSelectedAppointment(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar la fecha");
    },
  });

  // Procesar citas
  const appointments = useMemo(() => {
    return appointmentsData
      .filter((apt: any) => apt.scheduledDate)
      .map((apt: any) => ({
        id: apt.id,
        clientId: apt.clientId,
        clientName: apt.client?.name || "Cliente",
        clientPhone: apt.client?.whatsappPhone || apt.client?.phone,
        clientAddress: apt.client?.address,
        scheduledDate: new Date(apt.scheduledDate),
        status: apt.status,
        workTypes: apt.workTypes || [],
        notes: apt.notes,
      }));
  }, [appointmentsData]);

  // Obtener citas para una fecha específica
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      return aptDate.toDateString() === date.toDateString();
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
  const canViewCalendar = user && ["super_admin", "admin", "comercial"].includes(user.role);
  const canEditDates = user && ["super_admin", "admin"].includes(user.role);

  if (!canViewCalendar) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    setNewDate(date.toISOString().split("T")[0]);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    setNewTime(`${hours}:${minutes}`);
  };

  const handleSaveDate = () => {
    if (!editingAppointment || !newDate || !newTime) return;
    
    updateDateMutation.mutate({
      id: editingAppointment.id,
      scheduledDateStr: newDate,
      scheduledTimeStr: newTime,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-800",
      confirmada: "bg-blue-100 text-blue-800",
      completada: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      confirmada: "Confirmada",
      completada: "Completada",
      cancelada: "Cancelada",
    };
    return (
      <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container py-3 px-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-base md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              <span className="hidden sm:inline">Calendario de Citas</span>
              <span className="sm:hidden">Citas</span>
            </h1>
            <p className="hidden md:block text-sm text-gray-500">
              Citas de toma de medidas programadas
            </p>
          </div>
          <Link href="/calendar">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Instalaciones</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-4 md:py-6 px-3 md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendario */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold min-w-[180px] text-center">
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
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
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
                          ${isToday ? "ring-2 ring-blue-500" : ""}
                          ${isSelected ? "bg-blue-50 border-blue-300" : "border-gray-200 hover:border-gray-300"}
                          ${availability === "none" ? "bg-gray-100" : availability === "blocked" ? "bg-pink-100" : "bg-white"}
                        `}
                      >
                        <span className={`
                          text-sm font-medium
                          ${isToday ? "text-blue-600" : "text-gray-900"}
                          ${availability === "none" ? "text-gray-400" : availability === "blocked" ? "text-pink-600" : ""}
                        `}>
                          {date.getDate()}
                        </span>

                        {/* Indicadores de citas */}
                        {dayAppointments.length > 0 && (
                          <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 justify-center">
                            {dayAppointments.slice(0, 3).map((apt, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  apt.status === "completada" ? "bg-green-500" :
                                  apt.status === "cancelada" ? "bg-red-500" :
                                  apt.status === "confirmada" ? "bg-blue-500" :
                                  "bg-yellow-500"
                                }`}
                              />
                            ))}
                            {dayAppointments.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{dayAppointments.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda de estados de citas */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Confirmada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Completada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Cancelada</span>
                  </div>
                </div>

                {/* Leyenda de disponibilidad */}
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white border border-gray-300" />
                    <span>Disponible (Mar, Jue, Vie)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-pink-100 border border-pink-200" />
                    <span>Bloqueado (Lun, Mié, Sáb)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
                    <span>No laborable (Dom, Festivos)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral - Citas del día seleccionado */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
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
                            className="p-3 rounded-lg border bg-white hover:shadow-sm cursor-pointer transition-all"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{apt.clientName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(apt.scheduledDate).toLocaleTimeString("es-CO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {apt.workTypes.map((wt: string) => (
                                <Badge key={wt} variant="outline" className="text-xs">
                                  {WORK_TYPE_LABELS[wt] || wt}
                                </Badge>
                              ))}
                            </div>
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
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Resumen del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total citas:</span>
                    <span className="font-medium">{appointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pendientes:</span>
                    <span className="font-medium text-yellow-600">
                      {appointments.filter(a => a.status === "pendiente").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmadas:</span>
                    <span className="font-medium text-blue-600">
                      {appointments.filter(a => a.status === "confirmada").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completadas:</span>
                    <span className="font-medium text-green-600">
                      {appointments.filter(a => a.status === "completada").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialog de detalle de cita */}
      <Dialog open={!!selectedAppointment && !editingAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Detalle de Cita
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{selectedAppointment.clientName}</span>
                </div>
                {getStatusBadge(selectedAppointment.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Fecha
                  </div>
                  <div className="font-medium">
                    {new Date(selectedAppointment.scheduledDate).toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Hora
                  </div>
                  <div className="font-medium">
                    {new Date(selectedAppointment.scheduledDate).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {selectedAppointment.clientPhone && (
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </div>
                  <div className="font-medium">{selectedAppointment.clientPhone}</div>
                </div>
              )}

              {selectedAppointment.clientAddress && (
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </div>
                  <div className="font-medium">{selectedAppointment.clientAddress}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-500 mb-2">Tipos de trabajo</div>
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
                  <div className="text-sm text-gray-500">Notas</div>
                  <div className="text-sm bg-gray-50 p-2 rounded">{selectedAppointment.notes}</div>
                </div>
              )}

              {canEditDates && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleEditClick(selectedAppointment)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar Fecha
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edición de fecha */}
      <Dialog open={!!editingAppointment} onOpenChange={() => setEditingAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Editar Fecha de Cita
            </DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Cliente: <span className="font-medium">{editingAppointment.clientName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newDate">Nueva Fecha</Label>
                  <Input
                    id="newDate"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newTime">Nueva Hora</Label>
                  <select
                    id="newTime"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Seleccionar...</option>
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  {updateDateMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
