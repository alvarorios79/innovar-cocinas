import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle, MessageCircle } from "lucide-react";

// Helper: parsea fechas de Drizzle (sin timezone) como UTC
function parseDBDate(ds: string | Date | null | undefined): Date | null {
  if (!ds) return null;
  if (ds instanceof Date) return ds;
  if (!ds.includes('T') && !ds.includes('Z') && !ds.includes('+'))
    return new Date((ds as string).replace(' ', 'T') + 'Z');
  return new Date(ds as string);
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente:                  { label: "Pendiente de confirmación", color: "text-yellow-400", icon: <Clock className="h-5 w-5" /> },
  confirmada:                 { label: "Confirmada",                color: "text-green-400",  icon: <CheckCircle2 className="h-5 w-5" /> },
  enviada:                    { label: "Confirmada",                color: "text-green-400",  icon: <CheckCircle2 className="h-5 w-5" /> },
  cancelada:                  { label: "Cancelada",                 color: "text-red-400",    icon: <XCircle className="h-5 w-5" /> },
  completada:                 { label: "Completada",                color: "text-teal-400",   icon: <CheckCircle2 className="h-5 w-5" /> },
  reagendamiento_solicitado:  { label: "Reagendamiento solicitado", color: "text-orange-400", icon: <RefreshCw className="h-5 w-5" /> },
};

export default function CitaPublica() {
  const [, params] = useLocation().split("?");
  const token = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("token") ?? "";

  const [view, setView] = useState<"main" | "cancel_confirm" | "reschedule" | "done">("main");
  const [reqDate, setReqDate] = useState("");
  const [reqTime, setReqTime] = useState("");
  const [reqMsg, setReqMsg] = useState("");

  const { data, isLoading, error } = trpc.appointments.getByToken.useQuery(
    { token },
    { enabled: token.length > 10, retry: false }
  );

  const { data: slots } = trpc.appointments.getAvailableSlots.useQuery(
    { date: reqDate },
    { enabled: view === "reschedule" && reqDate.length === 10 }
  );

  const cancelMutation = trpc.appointments.cancelByToken.useMutation({
    onSuccess: () => { setView("done"); },
    onError: (e) => toast.error(e.message),
  });

  const rescheduleMutation = trpc.appointments.requestRescheduleByToken.useMutation({
    onSuccess: () => { setView("done"); },
    onError: (e) => toast.error(e.message),
  });

  const parsedDate = data ? parseDBDate(data.scheduledDate) : null;
  const dateStr = parsedDate?.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }) ?? "";
  const timeStr = parsedDate?.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }) ?? "";
  const statusInfo = data ? (STATUS_LABELS[data.status] ?? { label: data.status, color: "text-white", icon: null }) : null;

  // Generar fechas disponibles: próximos 30 días
  const availableDatesForPicker = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split("T")[0];
  });

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0d2d2a 60%)" }}>
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-white text-lg">Enlace inválido. Por favor usa el link que te enviamos por WhatsApp.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0d2d2a 60%)" }}>
      <div className="text-center">
        <div className="h-10 w-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Cargando tu cita...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0d2d2a 60%)" }}>
      <div className="text-center p-8">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-white text-lg">Cita no encontrada o enlace expirado.</p>
        <a href="https://wa.me/573136802025" target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
          <MessageCircle className="h-4 w-4" /> Contáctanos por WhatsApp
        </a>
      </div>
    </div>
  );

  const isEditable = !["cancelada", "completada"].includes(data.status);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #0d2d2a 60%)" }}>
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="text-2xl font-bold text-white tracking-wide">INNOVAR</div>
        <div className="text-xs text-white/50 tracking-widest uppercase">Cocinas de Diseño</div>
      </div>

      <div className="w-full max-w-md bg-white/[0.05] border border-white/10 rounded-2xl p-6 shadow-2xl">

        {/* ── Vista principal ── */}
        {view === "main" && (
          <>
            <h1 className="text-xl font-semibold text-white mb-1">Tu cita de visita</h1>
            <p className="text-white/50 text-sm mb-5">Hola, <span className="text-teal-300 font-medium">{data.clientName}</span></p>

            {/* Status badge */}
            <div className={`flex items-center gap-2 mb-5 ${statusInfo?.color}`}>
              {statusInfo?.icon}
              <span className="font-medium">{statusInfo?.label}</span>
            </div>

            {/* Detalles */}
            <div className="space-y-3 mb-6">
              {parsedDate && (
                <>
                  <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3">
                    <Calendar className="h-5 w-5 text-teal-400 shrink-0" />
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wide">Fecha</div>
                      <div className="text-white font-medium capitalize">{dateStr}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3">
                    <Clock className="h-5 w-5 text-teal-400 shrink-0" />
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wide">Hora</div>
                      <div className="text-white font-medium">{timeStr}</div>
                    </div>
                  </div>
                </>
              )}
              {data.workTypes.length > 0 && (
                <div className="bg-white/[0.04] rounded-xl p-3">
                  <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Servicio</div>
                  <div className="flex flex-wrap gap-2">
                    {data.workTypes.map(wt => (
                      <span key={wt} className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded-lg text-sm">
                        {data.workTypeLabels[wt] ?? wt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acciones */}
            {isEditable && data.status !== "reagendamiento_solicitado" && (
              <div className="space-y-3">
                <Button
                  className="w-full font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
                  onClick={() => setView("reschedule")}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Solicitar reagendamiento
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={() => setView("cancel_confirm")}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar mi cita
                </Button>
              </div>
            )}

            {data.status === "reagendamiento_solicitado" && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-orange-300 text-sm text-center">
                Tu solicitud de reagendamiento fue recibida. El equipo te contactará pronto para confirmar el nuevo horario.
              </div>
            )}

            {!isEditable && (
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white/50 text-sm text-center">
                Esta cita no puede modificarse.
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <a href="https://wa.me/573136802025" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-green-400 transition-colors">
                <MessageCircle className="h-4 w-4" /> ¿Necesitas ayuda? Escríbenos
              </a>
            </div>
          </>
        )}

        {/* ── Confirmar cancelación ── */}
        {view === "cancel_confirm" && (
          <>
            <div className="text-center mb-6">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-white">¿Cancelar la cita?</h2>
              <p className="text-white/50 text-sm mt-2">Esta acción no se puede deshacer. Para reagendar, escríbenos por WhatsApp.</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={() => cancelMutation.mutate({ token })}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelando..." : "Sí, cancelar mi cita"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setView("main")}>
                Volver
              </Button>
            </div>
          </>
        )}

        {/* ── Solicitar reagendamiento ── */}
        {view === "reschedule" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-1">Solicitar reagendamiento</h2>
            <p className="text-white/50 text-sm mb-5">Elige la fecha y hora que prefieres. El equipo confirmará el cambio.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Fecha preferida *</label>
                <input
                  type="date"
                  value={reqDate}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  onChange={e => { setReqDate(e.target.value); setReqTime(""); }}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
                />
              </div>

              {reqDate && (
                <div>
                  <label className="text-sm text-white/60 block mb-2">Horario preferido *</label>
                  {slots && (slots as string[]).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {(slots as string[]).map(slot => (
                        <button key={slot}
                          onClick={() => setReqTime(slot)}
                          className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                            reqTime === slot
                              ? "bg-teal-500 text-white"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : slots ? (
                    <p className="text-white/40 text-sm">No hay horarios disponibles para esa fecha.</p>
                  ) : (
                    <div className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )}

              <div>
                <label className="text-sm text-white/60 block mb-1">Mensaje (opcional)</label>
                <Textarea
                  value={reqMsg}
                  onChange={e => setReqMsg(e.target.value)}
                  placeholder="Ej: Prefiero por la tarde si es posible"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
                  disabled={!reqDate || !reqTime || rescheduleMutation.isPending}
                  onClick={() => rescheduleMutation.mutate({ token, requestedDate: reqDate, requestedTime: reqTime, message: reqMsg || undefined })}
                >
                  {rescheduleMutation.isPending ? "Enviando..." : "Enviar solicitud"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setView("main")}>
                  Volver
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Confirmación final ── */}
        {view === "done" && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-14 w-14 text-teal-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {cancelMutation.isSuccess ? "Cita cancelada" : "¡Solicitud enviada!"}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              {cancelMutation.isSuccess
                ? "Tu cita ha sido cancelada. Si necesitas agendar de nuevo, escríbenos."
                : "Recibimos tu solicitud. El equipo te contactará pronto para confirmar el nuevo horario."}
            </p>
            <a href="https://wa.me/573136802025" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              <MessageCircle className="h-4 w-4" /> Escribir al equipo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
