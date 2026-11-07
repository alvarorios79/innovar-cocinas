/**
 * Página pública "Pide tu visita" (/visita y /agendar).
 * El cliente deja nombre, WhatsApp, qué trabajo necesita y dónde.
 * NO escoge día ni hora: el equipo le escribe por WhatsApp (313 680 2025) y agenda.
 * Se puede marcar de dónde viene el enlace: /visita?origen=instagram | facebook | tiktok | web
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChefHat, DoorOpen, MapPin, MessageCircle, Package, Phone, ShowerHead, Shirt, Tv2, User } from "lucide-react";
import { INNOVAR_WHATSAPP, LEAD_SOURCE_VALUES, LEAD_WORK_TYPES, type LeadSource, type LeadWorkType } from "@shared/leads";

const ICONS: Record<LeadWorkType, React.ReactNode> = {
  cocina: <ChefHat className="h-6 w-6" />,
  closet: <Shirt className="h-6 w-6" />,
  mueble_bano: <ShowerHead className="h-6 w-6" />,
  centro_tv: <Tv2 className="h-6 w-6" />,
  puertas: <DoorOpen className="h-6 w-6" />,
  otro: <Package className="h-6 w-6" />,
};

const COUNTRY_CODES = [
  { code: "57", label: "🇨🇴 +57" },
  { code: "1", label: "🇺🇸 +1" },
  { code: "34", label: "🇪🇸 +34" },
  { code: "52", label: "🇲🇽 +52" },
  { code: "54", label: "🇦🇷 +54" },
  { code: "41", label: "🇨🇭 +41" },
];

const waLink = (text: string) => `https://wa.me/${INNOVAR_WHATSAPP}?text=${encodeURIComponent(text)}`;

export default function PideTuVisita() {
  const origin = useMemo<LeadSource | undefined>(() => {
    const o = new URLSearchParams(window.location.search).get("origen")?.toLowerCase();
    return o && (LEAD_SOURCE_VALUES as readonly string[]).includes(o) ? (o as LeadSource) : undefined;
  }, []);

  const [form, setForm] = useState({ name: "", phone: "", countryCode: "57", location: "", message: "", website: "" });
  const [workTypes, setWorkTypes] = useState<LeadWorkType[]>([]);
  const [done, setDone] = useState(false);
  const request = trpc.leads.publicRequest.useMutation();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = (w: LeadWorkType) => setWorkTypes(p => (p.includes(w) ? p.filter(x => x !== w) : [...p, w]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Escribe tu nombre");
    if (form.phone.replace(/\D/g, "").length < 7) return toast.error("Escribe tu número de WhatsApp");
    if (!workTypes.length) return toast.error("Elige qué trabajo necesitas");
    try {
      await request.mutateAsync({
        name: form.name, whatsappPhone: form.phone, countryCode: form.countryCode, workTypes,
        location: form.location || undefined, message: form.message || undefined, origin, website: form.website || undefined,
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast.error(err?.message || "No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.");
    }
  };

  const bg = { background: "linear-gradient(160deg, #0f172a 0%, #0d2d2a 50%, #0f172a 100%)" };
  const waBtn = { background: "linear-gradient(135deg, #25D366, #128C7E)" };
  const firstName = form.name.trim().split(/\s+/)[0] || "";

  if (done) {
    const trabajos = LEAD_WORK_TYPES.filter(w => workTypes.includes(w.value)).map(w => w.label.toLowerCase()).join(", ");
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bg}>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg, #00BCD4, #0097A7)" }}>
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">¡Listo{firstName ? `, ${firstName}` : ""}!</h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Recibimos tu solicitud. Te escribiremos por WhatsApp desde el <span className="text-white font-semibold">313 680 2025</span> para acordar el día de la visita.
            </p>
          </div>
          <a href={waLink(`Hola, soy ${form.name.trim()}. Acabo de pedir una visita para ${trabajos}.`)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-semibold text-white text-lg" style={waBtn}>
            <MessageCircle className="h-6 w-6" /> Escribir ahora por WhatsApp
          </a>
          <p className="text-sm text-gray-400">Si prefieres, escríbenos tú primero y te atendemos de una vez.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={bg}>
      <div className="text-center pt-10 pb-6 px-4">
        <img src="/logo-original.png" alt="INNOVAR Cocinas de Diseño" className="h-16 mx-auto mb-4 object-contain" />
        <h1 className="text-4xl font-black tracking-tight" style={{ color: "#00BCD4" }}>INNOVAR</h1>
        <p className="text-sm font-semibold text-gray-300 uppercase" style={{ letterSpacing: "0.18em" }}>Cocinas de Diseño</p>
        <div className="w-16 h-0.5 mx-auto my-5 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #00BCD4, transparent)" }} />
        <h2 className="text-2xl font-bold text-white">Pide tu visita gratuita</h2>
        <p className="text-gray-300 mt-2 text-base">Déjanos tus datos y te escribimos por WhatsApp para acordar el día.</p>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Qué necesita */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <h3 className="text-white font-semibold text-lg">¿Qué necesitas?</h3>
            <div className="grid grid-cols-2 gap-3">
              {LEAD_WORK_TYPES.map(w => {
                const on = workTypes.includes(w.value);
                return (
                  <button key={w.value} type="button" onClick={() => toggle(w.value)} aria-pressed={on}
                    className={`flex items-center gap-3 rounded-xl px-3 py-4 text-left font-medium transition-colors ${on ? "text-white" : "text-gray-200"}`}
                    style={on ? { background: "rgba(0,188,212,0.25)", border: "2px solid #00BCD4" } : { background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.12)" }}>
                    <span className={on ? "text-teal-300" : "text-gray-400"}>{ICONS[w.value]}</span>
                    <span className="leading-tight">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Datos */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)" }}>
            <div className="space-y-1.5">
              <Label className="text-gray-200">Tu nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input value={form.name} onChange={set("name")} placeholder="Nombre y apellido" autoComplete="name"
                  className="pl-9 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-200">Tu WhatsApp</Label>
              <div className="flex gap-2">
                <select value={form.countryCode} onChange={set("countryCode")} aria-label="Código de país"
                  className="h-12 rounded-md bg-white/10 border border-white/20 text-white px-2 text-base">
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="text-black">{c.label}</option>)}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input value={form.phone} onChange={set("phone")} placeholder="300 123 4567" type="tel" inputMode="tel" autoComplete="tel-national"
                    className="pl-9 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-200">¿Dónde es? <span className="text-gray-500 font-normal">(barrio o ciudad)</span></Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input value={form.location} onChange={set("location")} placeholder="Ej: Cerritos, Pereira"
                  className="pl-9 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-200">Cuéntanos algo más <span className="text-gray-500 font-normal">(opcional)</span></Label>
              <Textarea value={form.message} onChange={set("message")} placeholder="Medidas aproximadas, estilo que te gusta, para cuándo lo necesitas…"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 min-h-[80px] text-base" />
            </div>
            {/* Campo trampa contra robots: oculto para las personas */}
            <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off"
              aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          </div>

          <Button type="submit" disabled={request.isPending} className="w-full h-14 text-white font-bold text-lg rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)" }}>
            {request.isPending ? "Enviando…" : "Pedir mi visita"}
          </Button>
          <p className="text-center text-sm text-gray-400">Te contactaremos por WhatsApp desde el 313 680 2025.</p>
        </form>
      </div>

      <a href={waLink("Hola Innovar, quiero información.")} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-white font-semibold shadow-2xl" style={waBtn}>
        <MessageCircle className="h-5 w-5" /> <span>Escríbenos</span>
      </a>
    </div>
  );
}
