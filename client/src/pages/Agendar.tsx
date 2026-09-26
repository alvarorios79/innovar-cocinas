import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Phone, MapPin, User, Calendar, MessageCircle, ChefHat, DoorOpen, Tv2, ShowerHead, Package, IdCard, Clock } from "lucide-react";

type WorkType = "cocina" | "closet" | "puertas" | "centro_tv" | "mueble_bano" | "otro";

const WORK_TYPES: { value: WorkType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "cocina",      label: "Cocina Integral",    icon: <ChefHat className="h-5 w-5" />,    color: "border-teal-400 bg-teal-50 text-teal-700" },
  { value: "closet",      label: "Closet",             icon: <Package className="h-5 w-5" />,    color: "border-purple-400 bg-purple-50 text-purple-700" },
  { value: "puertas",     label: "Puertas",            icon: <DoorOpen className="h-5 w-5" />,   color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "centro_tv",   label: "Centro de TV",       icon: <Tv2 className="h-5 w-5" />,        color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "mueble_bano", label: "Mueble de Baño",     icon: <ShowerHead className="h-5 w-5" />, color: "border-cyan-400 bg-cyan-50 text-cyan-700" },
  { value: "otro",        label: "Otro",               icon: <Package className="h-5 w-5" />,    color: "border-gray-400 bg-gray-50 text-gray-700" },
];

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

  const { data: config } = trpc.availability.getConfig.useQuery();
  const { data: slots } = trpc.availability.getAvailableSlots.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const createClientMutation = trpc.clients.getOrCreateByWhatsApp.useMutation();
  const createAppointmentMutation = trpc.appointments.create.useMutation();

  // Reset hora cuando cambia la fecha
  useEffect(() => { setSelectedTime(""); }, [selectedDate]);

  const toggleWorkType = (wt: WorkType) => {
    setWorkTypes(prev =>
      prev.includes(wt) ? prev.filter(x => x !== wt) : [...prev, wt]
    );
  };

  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();
    const allowedDays = config?.allowedDays || [2, 4, 5];
    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (allowedDays.includes(date.getDay())) {
        const dateStr = date.toISOString().split("T")[0];
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const label = `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
        dates.push({ value: dateStr, label });
      }
    }
    return dates;
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
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

      // Formatear fecha para mostrar
      const d = new Date(selectedDate + "T12:00:00");
      const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const dateLabel = `${dayNames[d.getDay()]} ${d.getDate()} de ${monthNames[d.getMonth()]}`;

      setBookedInfo({ name: form.name, date: dateLabel, time: formatTime(selectedTime), phone: form.whatsappPhone });
      setStep("success");
    } catch (err: any) {
      if (err?.message?.includes("ocupado")) {
        toast.error("Horario no disponible", { description: "Ese horario ya está ocupado. Por favor elige otro." });
      } else {
        toast.error("Error al agendar", { description: err?.message || "Intenta de nuevo" });
      }
    }
  };

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
            <div className="flex items-center gap-3 text-gray-200">
              <User className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{bookedInfo.name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-200">
              <Calendar className="h-4 w-4 text-teal-400 shrink-0" />
              <span className="capitalize">{bookedInfo.date}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-200">
              <Clock className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{bookedInfo.time}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-200">
              <Phone className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{bookedInfo.phone}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400">Recibirás confirmación por WhatsApp. Nuestro equipo se comunicará contigo pronto.</p>
          <a
            href={`https://wa.me/573136802025?text=${encodeURIComponent("Hola! Acabo de agendar una visita en la página. Mi nombre es " + bookedInfo.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <MessageCircle className="h-5 w-5" />
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const availableDates = getAvailableDates();
  const availableSlots = slots ?? [];
  const isPending = createClientMutation.isPending || createAppointmentMutation.isPending;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f172a 0%, #0d2d2a 50%, #0f172a 100%)" }}>
      {/* Header */}
      <div className="text-center pt-8 pb-6 px-4">
        <img src="/logo-original.png" alt="INNOVAR Cocinas de Diseño" className="h-16 mx-auto mb-4 object-contain" />
        <h1 className="text-2xl md:text-3xl font-bold text-white">Agenda tu visita gratuita</h1>
        <p className="text-teal-300 mt-2 text-sm md:text-base">Diseño y fabricación de muebles a medida · Pereira y alrededores</p>
      </div>

      {/* Formulario */}
      <div className="max-w-lg mx-auto px-4 pb-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Datos personales */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h2 className="text-teal-400 font-semibold text-sm uppercase tracking-wide">Tus datos</h2>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Nombre completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-teal-400"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">WhatsApp *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Ej: 313 680 2025"
                  value={form.whatsappPhone}
                  onChange={e => setForm(f => ({ ...f, whatsappPhone: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-teal-400"
                  type="tel"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Dirección *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Dirección donde realizaremos la visita"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-teal-400"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Cédula <span className="text-gray-500">(opcional)</span></Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número de identificación"
                  value={form.identificationNumber}
                  onChange={e => setForm(f => ({ ...f, identificationNumber: e.target.value }))}
                  className="pl-9 h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-teal-400"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Tipo de trabajo */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h2 className="text-teal-400 font-semibold text-sm uppercase tracking-wide">¿Qué necesitas? *</h2>
            <div className="grid grid-cols-2 gap-2">
              {WORK_TYPES.map(wt => {
                const selected = workTypes.includes(wt.value);
                return (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => toggleWorkType(wt.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                      selected
                        ? "border-teal-400 bg-teal-400/20 text-teal-300"
                        : "border-white/15 bg-white/5 text-gray-300 hover:border-white/30"
                    }`}
                    disabled={isPending}
                  >
                    <span className={selected ? "text-teal-400" : "text-gray-500"}>{wt.icon}</span>
                    {wt.label}
                    {selected && <CheckCircle2 className="h-4 w-4 text-teal-400 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h2 className="text-teal-400 font-semibold text-sm uppercase tracking-wide">Fecha y hora *</h2>
            <p className="text-gray-400 text-xs">Disponible martes, jueves y viernes</p>

            <div className="space-y-1">
              <Label className="text-gray-200 text-sm">Fecha</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate} disabled={isPending}>
                <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white focus:border-teal-400">
                  <SelectValue placeholder="Selecciona una fecha" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDate && (
              <div className="space-y-1">
                <Label className="text-gray-200 text-sm">Horario</Label>
                {availableSlots.length === 0 ? (
                  <p className="text-amber-400 text-sm py-2">No hay horarios disponibles para esta fecha. Elige otro día.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedTime === slot
                            ? "border-teal-400 bg-teal-400/20 text-teal-300"
                            : "border-white/15 bg-white/5 text-gray-300 hover:border-white/30"
                        }`}
                        disabled={isPending}
                      >
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
            <h2 className="text-teal-400 font-semibold text-sm uppercase tracking-wide">Observaciones <span className="text-gray-500 normal-case font-normal">(opcional)</span></h2>
            <Textarea
              placeholder="Cuéntanos algo adicional sobre tu proyecto, medidas aproximadas, estilo que buscas..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-teal-400 min-h-[90px] resize-none"
              disabled={isPending}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-14 text-white font-bold text-base rounded-xl"
            style={{ background: "linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)" }}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Agendando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Confirmar visita
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 pb-2">
            Al agendar aceptas que nos comuniquemos contigo por WhatsApp para confirmar la visita.
          </p>
        </form>
      </div>
    </div>
  );
}
