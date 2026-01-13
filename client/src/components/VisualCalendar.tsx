import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VisualCalendarProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function VisualCalendar({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: VisualCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // Obtener configuración
  const { data: config } = trpc.availability.getConfig.useQuery();
  
  // Obtener horarios disponibles para la fecha seleccionada
  const { data: slots } = trpc.availability.getAvailableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  useEffect(() => {
    if (slots) {
      setAvailableSlots(slots);
    }
  }, [slots]);

  // Generar días del mes
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Agregar días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Agregar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth();
  const allowedDays = config?.allowedDays || [2, 4, 5];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Verificar si un día está permitido
  const isDayAllowed = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false; // No permitir días pasados
    return allowedDays.includes(date.getDay());
  };

  // Obtener clase CSS para el día
  const getDayClass = (date: Date | null) => {
    if (!date) return "";
    
    const dateStr = date.toISOString().split('T')[0];
    const isSelected = dateStr === selectedDate;
    const isAllowed = isDayAllowed(date);
    const isToday = date.toDateString() === new Date().toDateString();

    return cn(
      "h-10 sm:h-12 w-full rounded-md flex items-center justify-center text-sm sm:text-base cursor-pointer transition-colors touch-manipulation",
      {
        "bg-red-100 text-red-700 cursor-not-allowed": !isAllowed,
        "hover:bg-primary/10 active:bg-primary/20": isAllowed && !isSelected,
        "bg-primary text-primary-foreground": isSelected,
        "font-bold border-2 border-primary": isToday && !isSelected,
      }
    );
  };

  // Manejar clic en día
  const handleDayClick = (date: Date | null) => {
    if (!date || !isDayAllowed(date)) return;
    const dateStr = date.toISOString().split('T')[0];
    onDateChange(dateStr);
    onTimeChange(""); // Limpiar hora seleccionada
  };

  // Navegar mes
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Formatear hora
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Obtener todos los horarios posibles
  const allTimeSlots = config?.timeSlots?.map(slot => slot.start) || [];

  return (
    <div className="space-y-6">
      {/* Calendario */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Button variant="outline" size="sm" onClick={previousMonth} className="h-10 w-10 p-0">
            ←
          </Button>
          <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
            <CalendarIcon className="h-4 w-4" />
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-10 w-10 p-0">
            →
          </Button>
        </div>

        {/* Nombres de días */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {dayNames.map(name => (
            <div key={name} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
              {name}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((date, index) => (
            <div
              key={index}
              className={getDayClass(date)}
              onClick={() => handleDayClick(date)}
            >
              {date ? date.getDate() : ""}
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-white border border-gray-300"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-primary"></div>
            <span>Seleccionado</span>
          </div>
        </div>
      </Card>

      {/* Horarios disponibles */}
      {selectedDate && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" />
            <h3 className="font-semibold">Selecciona un horario</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {allTimeSlots.map((slot) => {
              const isAvailable = availableSlots.includes(slot);
              const isSelected = selectedTime === slot;
              
              return (
                <Button
                  key={slot}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={!isAvailable}
                  onClick={() => onTimeChange(slot)}
                  className={cn(
                    "justify-start",
                    {
                      "bg-red-100 text-red-700 hover:bg-red-100 border-red-300": !isAvailable,
                      "bg-green-100 text-green-700 hover:bg-green-200 border-green-300": isAvailable && !isSelected,
                    }
                  )}
                >
                  {formatTime(slot)}
                  {!isAvailable && " (Ocupado)"}
                </Button>
              );
            })}
          </div>

          {availableSlots.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No hay horarios disponibles para esta fecha
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-100 border border-green-300"></div>
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-100 border border-red-300"></div>
              <span>Ocupado</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Horarios: 8am-12pm y 2pm-5pm • Duración: 1.5 horas
          </p>
        </Card>
      )}
    </div>
  );
}
