import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar } from "lucide-react";

interface AppointmentSchedulerProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function AppointmentScheduler({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: AppointmentSchedulerProps) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // Obtener configuración de horarios
  const { data: config } = trpc.availability.getConfig.useQuery();
  
  // Obtener horarios disponibles cuando cambia la fecha
  const { data: slots, refetch } = trpc.availability.getAvailableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  useEffect(() => {
    if (slots) {
      setAvailableSlots(slots);
      // Si el horario seleccionado ya no está disponible, limpiarlo
      if (selectedTime && !slots.includes(selectedTime)) {
        onTimeChange("");
      }
    }
  }, [slots, selectedTime]);

  // Generar fechas disponibles (próximos 60 días, solo martes, jueves y viernes)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();
    const allowedDays = config?.allowedDays || [2, 4, 5]; // Martes, Jueves, Viernes
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (allowedDays.includes(date.getDay())) {
        const dateStr = date.toISOString().split('T')[0];
        const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
        const label = `${dayName} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        dates.push({ value: dateStr, label });
      }
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  // Formatear horarios para mostrar
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apt-date">
          <Calendar className="inline h-4 w-4 mr-1" />
          Fecha de la cita *
        </Label>
        <Select value={selectedDate} onValueChange={onDateChange}>
          <SelectTrigger id="apt-date">
            <SelectValue placeholder="Selecciona una fecha (Mar, Jue, Vie)" />
          </SelectTrigger>
          <SelectContent>
            {availableDates.map((date) => (
              <SelectItem key={date.value} value={date.value}>
                {date.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Solo disponible martes, jueves y viernes
        </p>
      </div>

      {selectedDate && (
        <div className="space-y-2">
          <Label htmlFor="apt-time">Horario disponible *</Label>
          <Select value={selectedTime} onValueChange={onTimeChange}>
            <SelectTrigger id="apt-time">
              <SelectValue placeholder="Selecciona un horario" />
            </SelectTrigger>
            <SelectContent>
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {formatTime(slot)} (1.5 horas)
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No hay horarios disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Horarios: 8am-12pm y 2pm-5pm • Duración: 1.5 horas
          </p>
        </div>
      )}
    </div>
  );
}
