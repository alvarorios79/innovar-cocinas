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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Home,
} from "lucide-react";

// Nombres de los días y meses en español
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Festivos colombianos (simplificado - se cargan del backend en producción)
const COLOMBIAN_HOLIDAYS_2025 = new Set([
  "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18",
  "2025-05-01", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20",
  "2025-08-07", "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17",
  "2025-12-08", "2025-12-25",
]);

const COLOMBIAN_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
]);

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return COLOMBIAN_HOLIDAYS_2025.has(dateStr) || COLOMBIAN_HOLIDAYS_2026.has(dateStr);
}

function getDayAvailability(date: Date): "full" | "half" | "none" {
  const day = date.getDay();
  if (day === 0 || isHoliday(date)) return "none"; // Domingo o festivo
  if (day === 6) return "half"; // Sábado
  return "full"; // Lunes a viernes
}

interface Installation {
  id: number;
  projectId: number;
  projectName: string;
  clientName: string;
  clientPhone?: string;
  address?: string | null;
  scheduledDate: Date;
  status: string;
  workType: string;
  isOfficial: boolean; // true = verde (fecha oficial), false = rojo (fecha tentativa)
}

export default function InstallationCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);

  // Obtener proyectos con instalación programada
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({});

  // Filtrar proyectos con instalación programada o fecha tentativa
  const installations = useMemo(() => {
    return projects
      .filter(p => p.scheduledInstallDate || p.estimatedInstallDate || (p as any).tentativeInstallDate || (p.status as string) === "listo_instalacion")
      .map(p => {
        // Determinar si es fecha oficial o tentativa
        const isOfficial = (p as any).isInstallDateOfficial === true || (p.status as string) === "listo_instalacion" || (p.status as string) === "entregado";
        
        // Prioridad: scheduledInstallDate > estimatedInstallDate > tentativeInstallDate
        let scheduledDate: Date;
        if (p.scheduledInstallDate) {
          scheduledDate = new Date(p.scheduledInstallDate);
        } else if (isOfficial && p.estimatedInstallDate) {
          scheduledDate = new Date(p.estimatedInstallDate);
        } else if ((p as any).tentativeInstallDate) {
          scheduledDate = new Date((p as any).tentativeInstallDate);
        } else if (p.estimatedInstallDate) {
          scheduledDate = new Date(p.estimatedInstallDate);
        } else {
          scheduledDate = new Date();
        }
        
        return {
          id: p.id,
          projectId: p.id,
          projectName: p.name,
          clientName: p.client?.name || "Cliente",
          clientPhone: p.client?.whatsappPhone,
          address: p.client?.address,
          scheduledDate,
          status: p.status,
          workType: p.workType,
          isOfficial,
        };
      });
  }, [projects]);

  // Obtener instalaciones para una fecha específica
  const getInstallationsForDate = (date: Date): Installation[] => {
    return installations.filter(inst => {
      const instDate = new Date(inst.scheduledDate);
      return instDate.toDateString() === date.toDateString();
    });
  };

  // Generar días del mes
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Días del mes anterior para completar la primera semana
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Días del mes siguiente para completar la última semana
    const endPadding = 42 - days.length; // 6 semanas * 7 días
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Navegación del calendario
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
  const canViewCalendar = user && ["super_admin", "admin", "jefe_taller"].includes(user.role);

  if (!canViewCalendar) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-gray-600 mb-4">
              Solo administradores y jefes de taller pueden ver el calendario de instalaciones.
            </p>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container py-3 md:py-4 px-3 md:px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="px-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Volver</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-base md:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-teal-600" />
                  <span className="hidden sm:inline">Calendario de Instalaciones</span>
                  <span className="sm:hidden">Instalaciones</span>
                </h1>
                <p className="hidden md:block text-sm text-gray-500">
                  Gestiona las instalaciones programadas
                </p>
              </div>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm" className="px-2 md:px-3">
                <Wrench className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Ver Proyectos</span>
              </Button>
            </Link>
          </div>
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
                {/* Encabezado de días */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_SHORT.map((day, i) => (
                    <div
                      key={day}
                      className={`text-center text-sm font-medium py-2 ${
                        i === 0 ? "text-red-500" : i === 6 ? "text-orange-500" : "text-gray-600"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Días del calendario */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dayInstallations = getInstallationsForDate(date);
                    const availability = getDayAvailability(date);
                    const isToday = date.toDateString() === today.toDateString();
                    const isPast = date < today;
                    const isSelected = selectedDate?.toDateString() === date.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          relative min-h-[80px] p-1 rounded-lg border transition-all text-left
                          ${!isCurrentMonth ? "bg-gray-100 text-gray-400" : availability === "none" ? "bg-red-400 text-white" : availability === "half" ? "bg-amber-400 text-amber-900" : "bg-white"}
                          ${isToday ? "ring-4 ring-teal-500 ring-offset-2" : ""}
                          ${isSelected ? "bg-teal-500 text-white border-teal-600" : "border-gray-200 hover:border-teal-300"}
                          ${isPast && !isToday ? "opacity-60" : ""}
                        `}
                      >
                        <div className={`
                          text-sm font-medium mb-1
                          ${isToday ? "text-teal-600" : ""}
                          ${date.getDay() === 0 ? "text-red-500" : ""}
                          ${isHoliday(date) ? "text-red-500" : ""}
                        `}>
                          {date.getDate()}
                          {isHoliday(date) && (
                            <span className="ml-1 text-xs">🎉</span>
                          )}
                        </div>

                        {/* Indicador de disponibilidad */}
                        {availability === "half" && (
                          <div className="text-[10px] text-amber-900 font-bold mb-1">Medio día</div>
                        )}
                        {availability === "none" && !isHoliday(date) && (
                          <div className="text-[10px] text-white font-bold mb-1">No laboral</div>
                        )}

                        {/* Instalaciones del día */}
                        <div className="space-y-1">
                          {dayInstallations.slice(0, 2).map((inst) => (
                            <div
                              key={inst.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInstallation(inst);
                              }}
                              className={`
                                text-[10px] px-1 py-0.5 rounded truncate cursor-pointer font-semibold
                                ${inst.status === "entregado" 
                                  ? "bg-green-500 text-white" 
                                  : inst.isOfficial
                                  ? "bg-green-500 text-white" 
                                  : "bg-red-500 text-white"
                                }
                              `}
                            >
                              {inst.projectName}
                            </div>
                          ))}
                          {dayInstallations.length > 2 && (
                            <div className="text-[10px] text-gray-500 px-1">
                              +{dayInstallations.length - 2} más
                            </div>
                          )}
                        </div>

                        {/* Indicador de conflicto */}
                        {dayInstallations.length > 1 && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border rounded"></div>
                    <span>Disponible (L-V)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-400 rounded"></div>
                    <span>Medio día (Sáb)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-400 rounded"></div>
                    <span>No laboral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Fecha tentativa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Fecha oficial</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            {/* Resumen del día seleccionado */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {selectedDate.toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayInstallations = getInstallationsForDate(selectedDate);
                    const availability = getDayAvailability(selectedDate);

                    if (availability === "none") {
                      return (
                        <div className="text-center py-4">
                          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600">
                            {isHoliday(selectedDate) ? "Día festivo" : "Domingo - No laboral"}
                          </p>
                        </div>
                      );
                    }

                    if (dayInstallations.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {availability === "half" 
                              ? "Disponible (medio día)" 
                              : "Disponible todo el día"
                            }
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {dayInstallations.length > 1 && (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded text-orange-700 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Múltiples instalaciones</span>
                          </div>
                        )}
                        {dayInstallations.map((inst) => (
                          <button
                            key={inst.id}
                            onClick={() => setSelectedInstallation(inst)}
                            className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="font-medium text-sm">{inst.projectName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              <User className="h-3 w-3 inline mr-1" />
                              {inst.clientName}
                            </div>
                            <Badge
                              variant="outline"
                              className="mt-2 text-xs"
                            >
                              {inst.workType}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Próximas instalaciones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Próximas Instalaciones</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">Cargando...</div>
                ) : (
                  <div className="space-y-3">
                    {installations
                      .filter(i => new Date(i.scheduledDate) >= today && i.status !== "entregado")
                      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                      .slice(0, 5)
                      .map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() => setSelectedInstallation(inst)}
                          className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm">{inst.projectName}</div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(inst.scheduledDate).toLocaleDateString("es-CO", {
                                day: "numeric",
                                month: "short",
                              })}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{inst.clientName}</div>
                        </button>
                      ))}
                    {installations.filter(i => new Date(i.scheduledDate) >= today && i.status !== "entregado").length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No hay instalaciones próximas
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal de detalle de instalación */}
      <Dialog open={!!selectedInstallation} onOpenChange={() => setSelectedInstallation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Instalación</DialogTitle>
          </DialogHeader>
          {selectedInstallation && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedInstallation.projectName}</h3>
                <Badge className="mt-1">{selectedInstallation.workType}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Fecha programada
                  </div>
                  <div className="font-medium">
                    {new Date(selectedInstallation.scheduledDate).toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Horario
                  </div>
                  <div className="font-medium">
                    {getDayAvailability(new Date(selectedInstallation.scheduledDate)) === "half"
                      ? "Medio día (Sábado)"
                      : "Jornada completa"
                    }
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                <div className="font-medium">{selectedInstallation.clientName}</div>
                {selectedInstallation.clientPhone && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {selectedInstallation.clientPhone}
                  </div>
                )}
              </div>

              {selectedInstallation.address && (
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </div>
                  <div className="font-medium">{selectedInstallation.address}</div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Link href={`/projects`} className="flex-1">
                  <Button className="w-full" variant="outline">
                    Ver Proyecto
                  </Button>
                </Link>
                {selectedInstallation.clientPhone && (
                  <a
                    href={`https://wa.me/57${selectedInstallation.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hola ${selectedInstallation.clientName}, le escribo de INNOVAR Cocinas de Diseño para confirmar la instalación de su ${selectedInstallation.workType} programada para el ${new Date(selectedInstallation.scheduledDate).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
