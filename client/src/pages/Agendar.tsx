import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, Phone, MapPin, User, Calendar, MessageCircle,
  ChefHat, DoorOpen, Tv2, ShowerHead, Package, IdCard, Clock,
  ChevronLeft, ChevronRight,
} from "lucide-react";

type WorkType = "cocina" | "closet" | "puertas" | "centro_tv" | "mueble_bano" | "otro";

const WORK_TYPES: { value: WorkType; label: string; icon: React.ReactNode }[] = [
  { value: "cocina",      label: "Cocina Integral",  icon: <ChefHat className="h-5 w-5" /> },
  { value: "closet",      label: "Closet",           icon: <Package className="h-5 w-5" /> },
  { value: "puertas",     label: "Puertas",          icon: <DoorOpen className="h-5 w-5" /> },
  { value: "centro_tv",   label: "Centro de TV",     icon: <Tv2 className="h-5 w-5" /> },
  { value: "mueble_bano", label: "Mueble de Baño",   icon: <ShowerHead className="h-5 w-5" /> },
  { value: "otro",        label: "Otro",             icon: <Package className="h-5 w-5" /> },
];

const DAY_NAMES_SHORT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES_LONG = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

// Días permitidos: martes=2, jueves=4, viernes=5
const ALLOWED_DAYS = [2, 4, 5];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_NAMES_LONG[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

// Componente de calendario personalizado
function BookingCalendar({
  selectedDate,
  onSelect,
  disabled,
}: {
  selectedDate: string;
  onSelect: (d: string) => void;
  disabled?: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = firstDay.getDay();

  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0f1f2e", border: "1px solid rgba(0,188,212,0.35)" }}>
      {/* Navegación mes */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: "rgba(0,188,212,0.08)" }}>
        <button type="button" onClick={prevMonth} disabled={!canGoPrev || disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
          style={{ background: canGoPrev ? "rgba(0,188,212,0.15)" : "transparent", color: canGoPrev ? "#00BCD4" : "#4b5563" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-white font-bold text-base tracking-wide">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} disabled={disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: "rgba(0,188,212,0.15)", color: "#00BCD4" }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAY_NAMES_SHORT.map((d, i) => (
          <div key={d} className="text-center py-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              ALLOWED_DAYS.includes(i) ? "text-teal-400" : "text-gray-600"
            }`}>{d}</span>
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;

          const dateStr = toDateStr(date);
          const dayOfWeek = date.getDay();
          const isPast = date < today;
          const isAllowed = ALLOWED_DAYS.includes(dayOfWeek);
          const isSelected = dateStr === selectedDate;
          const isAvailable = isAllowed && !isPast;
          const isUnavailable = !isAvailable;

          if (isSelected) {
            return (
              <button key={dateStr} type="button" onClick={() => onSelect(dateStr)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all"
                style={{ background: "linear-gradient(135deg, #00BCD4, #0097A7)", color: "#fff", boxShadow: "0 4px 16px rgba(0,188,212,0.45)" }}>
                <span>{date.getDate()}</span>
              </button>
            );
          }

          if (isAvailable) {
            return (
              <button key={dateStr} type="button" disabled={disabled}
                onClick={() => onSelect(dateStr)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all group"
                style={{ background: "rgba(0,188,212,0.1)", border: "1px solid rgba(0,188,212,0.3)", color: "#e2e8f0" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,188,212,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#00BCD4"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,188,212,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}>
                <span>{date.getDate()}</span>
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#00BCD4" }} />
              </button>
            );
          }

          // No disponible (día incorrecto o pasado)
          return (
            <div key={dateStr}
              className="aspect-square rounded-xl flex items-center justify-center text-sm cursor-not-allowed"
              style={{ color: "#2d3748" }}>
              {date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-5 py-3 text-xs"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="flex items-center gap-1.5 text-teal-400">
          <span className="w-3 h-3 rounded-md inline-block" style={{ background: "rgba(0,188,212,0.3)", border: "1px solid rgba(0,188,212,0.5)" }} />
          Disponible
        </span>
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="w-3 h-3 rounded-md inline-block" style={{ background: "rgba(255,255,255,0.03)" }} />
          No disponible
        </span>
      </div>
    </div>
  );
}

export default function Agendar() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({
    name: "",
    whatsappPhone: "",
    address: "",
    identificationNumber: "",
    notes: "",
  });
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedInfo, setBookedInfo] = useState<{ name: string; date: string; time: string; phone: string } | null>(null);

  const { data: slots } = trpc.availability.getAvailableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const createClientMutation = trpc.clients.getOrCreateByWhatsApp.useMutation();
  const createAppointmentMutation = trpc.appointments.create.useMutation();

  useEffect(() => { setSelectedTime(""); }, [selectedDate]);

  const toggleWorkType = (wt: WorkType) => {
    setWorkTypes(prev =>
      prev.includes(wt) ? prev.filter(x => x !== wt) : [...prev, wt]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.whatsappPhone.trim()) { toast.error("El teléfono WhatsApp es obligatorio"); return; }
    if (!form.address.trim()) { toast.error("La dirección es obligatoria"); return; }
    if (workTypes.length === 0) { toast.error("Selecciona al menos un tipo de trabajo"); return; }
    if (!selectedDate || !selectedTime) { toast.error("Selecciona fecha y horario para la visita"); return; }

    try {
      const client = await createClientMutation.mutateAsync({
        name: form.name.trim(),
        whatsappPhone: form.whatsappPhone.trim(),
        address: form.address.trim(),
        identificationNumber: form.identificationNumber.trim() || undefined,
      });

      if (!client) { toast.error("Error al registrar los datos"); return; }

      await createAppointmentMutation.mutateAsync({
        clientId: client.id,
        workTypes,
        scheduledDateStr: selectedDate,
        scheduledTimeStr: selectedTime,
        notes: form.notes.trim() || undefined,
      });

      setBookedInfo({
        name: form.name,
        date: formatDateLabel(selectedDate),
        time: formatTime(selectedTime),
        phone: form.whatsappPhone,
      });
      setStep("success");
    } catch (err: any) {
      if (err?.message?.includes("ocupado")) {
        toast.error("Horario no disponible", { description: "Ese horario ya está ocupado. Por favor elige otro." });
      } else {
        toast.error("Error al agendar", { description: err?.message || "Intenta de nuevo" });
      }
    }
  };

  // — Pantalla de éxito —
  if (step === "success" && bookedInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0d2d2a 60%, #0f172a 100%)" }}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg, #00BCD4, #0097A7)" }}>
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Visita agendada!</h1>
            <p className="text-teal-300">Te esperamos para diseñar juntos tu espacio ideal</p>
          </div>
          <div className="rounded-2xl p-6 text-left space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.3)" }}>
            <div className="flex items-center gap-3 text-gray-200"><User className="h-4 w-4 text-teal-400 shrink-0" /><span>{bookedInfo.name}</span></div>
            <div className="flex items-center gap-3 text-gray-200"><Calendar className="h-4 w-4 text-teal-400 shrink-0" /><span className="capitalize">{bookedInfo.date}</span></div>
            <div className="flex items-center gap-3 text-gray-200"><Clock className="h-4 w-4 text-teal-400 shrink-0" /><span>{bookedInfo.time}</span></div>
            <div className="flex items-center gap-3 text-gray-200"><Phone className="h-4 w-4 text-teal-400 shrink-0" /><span>{bookedInfo.phone}</span></div>
          </div>
          <p className="text-sm text-gray-400">Recibirás confirmación por WhatsApp. Nuestro equipo se comunicará contigo pronto.</p>
          <a
            href={`https://wa.me/573136802025?text=${encodeURIComponent("Hola! Acabo de agendar una visita. Mi nombre es " + bookedInfo.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <MessageCircle className="h-5 w-5" /> Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const availableSlots = slots ?? [];
  const isPending = createClientMutation.isPending || createAppointmentMutation.isPending;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f172a 0%, #0d2d2a 50%, #0f172a 100%)" }}>

      {/* ── HEADER / BRAND ─────────────────────────────────── */}
      <div className="text-center pt-10 pb-8 px-4">
        <img src="/logo-original.png" alt="INNOVAR" className="h-16 mx-auto mb-5 object-contain" />

        {/* Nombre de la marca — muy visible */}
        <div className="space-y-1 mb-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: "#00BCD4", letterSpacing: "-0.02em" }}>
            INNOVAR
          </h1>
          <p className="text-base md:text-lg font-semibold text-gray-300 tracking-widest uppercase" style={{ letterSpacing: "0.18em" }}>
            Cocinas de Diseño
          </p>
        </div>

        <div className="w-16 h-0.5 mx-auto my-4 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #00BCD4, transparent)" }} />

        <h2 className="text-xl md:text-2xl font-bold text-white">Agenda tu visita gratuita</h2>
        <p className="text-teal-400 mt-1 text-sm">Diseño y fabricación de muebles a medida · Pereira y alrededores</p>
      </div>

      {/* ── FORMULARIO ─────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Datos personales */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h3 className="text-teal-400 font-semibold text-xs uppercase tracking-widest">Tus datos</h3>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Nombre completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input placeholder="Tu nombre" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400" disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">WhatsApp *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input placeholder="Ej: 313 680 2025" value={form.whatsappPhone} type="tel"
                  onChange={e => setForm(f => ({ ...f, whatsappPhone: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400" disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Dirección *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input placeholder="Dirección donde realizaremos la visita" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400" disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Cédula <span className="text-gray-600 font-normal">(opcional)</span></Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input placeholder="Número de identificación" value={form.identificationNumber}
                  onChange={e => setForm(f => ({ ...f, identificationNumber: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400" disabled={isPending} />
              </div>
            </div>
          </div>

          {/* Tipo de trabajo */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h3 className="text-teal-400 font-semibold text-xs uppercase tracking-widest">¿Qué necesitas? *</h3>
            <div className="grid grid-cols-2 gap-2">
              {WORK_TYPES.map(wt => {
                const selected = workTypes.includes(wt.value);
                return (
                  <button key={wt.value} type="button" onClick={() => toggleWorkType(wt.value)} disabled={isPending}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                      selected ? "border-teal-400 bg-teal-400/20 text-teal-300" : "border-white/10 bg-white/5 text-gray-300 hover:border-teal-500/40 hover:bg-teal-500/10"
                    }`}>
                    <span className={selected ? "text-teal-400" : "text-gray-500"}>{wt.icon}</span>
                    <span className="flex-1 leading-tight">{wt.label}</span>
                    {selected && <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendario */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <div>
              <h3 className="text-teal-400 font-semibold text-xs uppercase tracking-widest">Elige el día de tu visita *</h3>
              <p className="text-gray-500 text-xs mt-1">Los días con punto azul tienen horarios disponibles</p>
            </div>

            <BookingCalendar selectedDate={selectedDate} onSelect={setSelectedDate} disabled={isPending} />

            {/* Horarios — aparecen al elegir día */}
            {selectedDate && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-400" />
                  <span className="text-white text-sm font-medium capitalize">{formatDateLabel(selectedDate)}</span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-amber-400 text-sm font-medium">No hay horarios disponibles para este día</p>
                    <p className="text-gray-500 text-xs mt-1">Por favor selecciona otro día en el calendario</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map(slot => (
                      <button key={slot} type="button" disabled={isPending}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          selectedTime === slot
                            ? "border-teal-400 bg-teal-400/25 text-teal-300 shadow shadow-teal-500/20"
                            : "border-white/10 bg-white/5 text-gray-300 hover:border-teal-500/50 hover:bg-teal-500/10"
                        }`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h3 className="text-teal-400 font-semibold text-xs uppercase tracking-widest">Observaciones <span className="text-gray-600 normal-case font-normal">(opcional)</span></h3>
            <Textarea
              placeholder="Cuéntanos algo sobre tu proyecto: medidas aproximadas, estilo que buscas, preguntas..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400 min-h-[90px] resize-none"
              disabled={isPending}
            />
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isPending}
            className="w-full h-14 text-white font-bold text-base rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)" }}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Agendando visita...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Confirmar visita
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-gray-600 pb-2">
            Al agendar aceptas que nos comuniquemos por WhatsApp para confirmar la visita.
          </p>
        </form>
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href="https://wa.me/573136802025?text=Hola%20INNOVAR%20Cocinas%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-semibold text-sm shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 8px 24px rgba(37,211,102,0.45)" }}
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span>¿Tienes dudas?</span>
      </a>
    </div>
  );
}
