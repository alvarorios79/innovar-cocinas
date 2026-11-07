/**
 * Interesados — una sola lista para no perder a nadie.
 * Entran solos desde la página pública "Pide tu visita" (/visita) o se anotan
 * a mano cuando alguien escribe por WhatsApp o redes. Desde aquí: escribir por
 * WhatsApp (313 680 2025), agendar la cita, programar seguimiento o descartar.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarClock, CalendarPlus, Inbox, MapPin, MessageCircle, MoreVertical, Plus, UserPlus } from "lucide-react";
import {
  LEAD_SOURCES, LEAD_WORK_TYPES, leadSourceLabel, leadStatusLabel, leadWorkTypesText,
  type LeadSource, type LeadWorkType,
} from "@shared/leads";

type View = "pendientes" | "agendados" | "descartados" | "todos";
type Lead = {
  id: number; name: string; whatsappPhone: string; workTypes: string | null; location: string | null; message: string | null;
  source: string; status: string; followUpDate: string | null; notes: string | null; createdAt: string; appointmentId: number | null;
};

const VIEWS: { value: View; label: string }[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "agendados", label: "Con cita" },
  { value: "descartados", label: "No interesados" },
  { value: "todos", label: "Todos" },
];

/** Las fechas de la BD vienen en UTC sin zona. */
const parseDb = (s: string) => new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
function timeAgo(s: string) {
  const mins = Math.round((Date.now() - parseDb(s).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d); };
const fmtDate = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }); };
const prettyPhone = (p: string) => (p.startsWith("57") && p.length === 12 ? `${p.slice(2, 5)} ${p.slice(5, 8)} ${p.slice(8)}` : `+${p}`);

function whatsappUrl(l: Lead) {
  const first = l.name.trim().split(/\s+/)[0];
  const trabajo = leadWorkTypesText(l.workTypes).toLowerCase();
  const text = `Hola ${first}, te saludamos de Innovar Cocinas de Diseño.${trabajo ? ` Recibimos tu solicitud para ${trabajo}.` : ""} ¿Qué día te queda bien para la visita?`;
  return `https://wa.me/${l.whatsappPhone}?text=${encodeURIComponent(text)}`;
}

const STATUS_STYLE: Record<string, string> = {
  nuevo: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  contactado: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  cita_agendada: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  descartado: "bg-white/5 text-gray-400 border-white/10",
};

export default function Interesados() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<View>("pendientes");
  const [showNew, setShowNew] = useState(false);
  const [noteFor, setNoteFor] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState("");
  const [dateFor, setDateFor] = useState<Lead | null>(null);
  const [customDate, setCustomDate] = useState("");

  const allowed = !!user && ["super_admin", "admin", "comercial"].includes(user.role);
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.leads.list.useQuery({ view }, { enabled: allowed });
  const { data: counts } = trpc.leads.counts.useQuery(undefined, { enabled: allowed });
  const refresh = () => { utils.leads.list.invalidate(); utils.leads.counts.invalidate(); };
  const update = trpc.leads.update.useMutation({ onSuccess: refresh, onError: e => toast.error(e.message) });
  const remove = trpc.leads.remove.useMutation({ onSuccess: () => { refresh(); toast.success("Interesado eliminado"); } });

  const today = todayStr();
  const list = useMemo(() => {
    const r = rows as Lead[];
    if (view !== "pendientes") return r;
    // Primero los nuevos, luego seguimientos vencidos/hoy, luego el resto
    const rank = (l: Lead) => (l.status === "nuevo" ? 0 : l.followUpDate && l.followUpDate <= today ? 1 : 2);
    return [...r].sort((a, b) => rank(a) - rank(b));
  }, [rows, view, today]);

  if (loading) return null;
  if (!isAuthenticated || !user) { setLocation("/login"); return null; }
  if (!allowed) { setLocation("/"); return null; }

  const setFollowUp = (l: Lead, date: string | null) => {
    update.mutate({ id: l.id, followUpDate: date, status: l.status === "nuevo" ? "contactado" : undefined },
      { onSuccess: () => toast.success(date ? `Seguimiento: ${fmtDate(date)}` : "Seguimiento quitado") });
    setDateFor(null);
  };

  return (
    <div className="pb-24 md:pb-6">
      <PageHeader
        title="Interesados"
        subtitle="Personas que piden visita o escriben por WhatsApp"
        icon={<Inbox className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button onClick={() => setShowNew(true)} className="gap-1.5 text-white" style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}>
            <UserPlus className="h-4 w-4" /> Nuevo interesado
          </Button>
        }
      />

      <div className="container max-w-3xl space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 border border-amber-500/30 bg-amber-500/10">
            <div className="text-xs uppercase tracking-wide text-amber-300/80 font-semibold">Sin contestar</div>
            <div className="text-3xl font-bold text-amber-300">{counts?.nuevos ?? 0}</div>
          </div>
          <div className="rounded-xl p-4 border border-sky-500/30 bg-sky-500/10">
            <div className="text-xs uppercase tracking-wide text-sky-300/80 font-semibold">Seguimientos para hoy</div>
            <div className="text-3xl font-bold text-sky-300">{counts?.seguimientosHoy ?? 0}</div>
          </div>
        </div>

        {/* Filtro */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {VIEWS.map(v => (
            <button key={v.value} onClick={() => setView(v.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${view === v.value ? "bg-teal-500/20 border-teal-400 text-teal-200" : "border-white/10 text-gray-400 hover:text-gray-200"}`}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-center text-gray-400 py-10">Cargando…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-14 text-gray-400 space-y-2">
            <Inbox className="h-10 w-10 mx-auto opacity-50" />
            <p>{view === "pendientes" ? "No hay interesados pendientes. ¡Todo al día!" : "No hay nada en esta lista."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(l => {
              const due = l.followUpDate && l.followUpDate <= today && (l.status === "nuevo" || l.status === "contactado");
              return (
                <div key={l.id} className={`rounded-xl p-4 border ${l.status === "nuevo" ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white text-base">{l.name}</h3>
                        <Badge variant="outline" className={STATUS_STYLE[l.status]}>{leadStatusLabel(l.status)}</Badge>
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        {prettyPhone(l.whatsappPhone)} · {leadSourceLabel(l.source)} · {timeAgo(l.createdAt)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0" aria-label="Más opciones"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {l.status === "nuevo" && <DropdownMenuItem onClick={() => update.mutate({ id: l.id, status: "contactado" })}>Marcar como contactado</DropdownMenuItem>}
                        {l.status !== "descartado" && l.status !== "cita_agendada" && (
                          <DropdownMenuItem onClick={() => update.mutate({ id: l.id, status: "descartado", followUpDate: null }, { onSuccess: () => toast.success("Marcado: no le interesó") })}>No le interesó</DropdownMenuItem>
                        )}
                        {l.status === "descartado" && <DropdownMenuItem onClick={() => update.mutate({ id: l.id, status: "contactado" })}>Volver a pendientes</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => { setNoteFor(l); setNoteText(l.notes || ""); }}>Escribir nota</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={() => { if (confirm(`¿Eliminar a ${l.name} de la lista?`)) remove.mutate({ id: l.id }); }}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-2 space-y-1 text-sm">
                    {l.workTypes && <div className="text-teal-300 font-medium">{leadWorkTypesText(l.workTypes)}</div>}
                    {l.location && <div className="text-gray-300 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-500" />{l.location}</div>}
                    {l.message && <p className="text-gray-300 italic whitespace-pre-line">“{l.message}”</p>}
                    {l.notes && <p className="text-gray-400 whitespace-pre-line">📝 {l.notes}</p>}
                    {l.followUpDate && l.status !== "cita_agendada" && l.status !== "descartado" && (
                      <div className={`flex items-center gap-1.5 ${due ? "text-sky-300 font-semibold" : "text-gray-400"}`}>
                        <CalendarClock className="h-3.5 w-3.5" /> Volver a escribir: {fmtDate(l.followUpDate)}{due ? " (hoy)" : ""}
                      </div>
                    )}
                  </div>

                  {l.status !== "descartado" && l.status !== "cita_agendada" && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <a href={whatsappUrl(l)} target="_blank" rel="noopener noreferrer"
                        onClick={() => { if (l.status === "nuevo") update.mutate({ id: l.id, status: "contactado" }); }}
                        className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                      <Button variant="outline" className="gap-1.5 h-auto py-2.5" onClick={() => setLocation(`/appointments-calendar?interesado=${l.id}`)}>
                        <CalendarPlus className="h-4 w-4" /> Agendar
                      </Button>
                      <Button variant="outline" className="gap-1.5 h-auto py-2.5" onClick={() => { setDateFor(l); setCustomDate(l.followUpDate || ""); }}>
                        <CalendarClock className="h-4 w-4" /> Seguir
                      </Button>
                    </div>
                  )}
                  {l.status === "cita_agendada" && (
                    <Button variant="link" className="px-0 mt-1 text-emerald-300" onClick={() => setLocation("/appointments-calendar")}>Ver en el calendario de citas →</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center pt-2">
          Enlace para compartir: <span className="text-gray-300 select-all">{window.location.origin}/visita</span>
        </p>
      </div>

      <NewLeadDialog open={showNew} onClose={() => setShowNew(false)} onCreated={() => { refresh(); setView("pendientes"); }} />

      {/* Seguimiento */}
      <Dialog open={!!dateFor} onOpenChange={o => !o && setDateFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cuándo volver a escribirle?</DialogTitle>
            <DialogDescription>{dateFor?.name}. Ese día te llega el recordatorio.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {[{ l: "Mañana", d: 1 }, { l: "En 3 días", d: 3 }, { l: "En 1 semana", d: 7 }].map(o => (
              <Button key={o.d} variant="outline" onClick={() => dateFor && setFollowUp(dateFor, addDays(o.d))}>{o.l}</Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Otra fecha</Label>
            <div className="flex gap-2">
              <Input type="date" value={customDate} min={today} onChange={e => setCustomDate(e.target.value)} />
              <Button disabled={!customDate} onClick={() => dateFor && setFollowUp(dateFor, customDate)}>Guardar</Button>
            </div>
          </div>
          {dateFor?.followUpDate && <Button variant="ghost" className="text-gray-400" onClick={() => dateFor && setFollowUp(dateFor, null)}>Quitar seguimiento</Button>}
        </DialogContent>
      </Dialog>

      {/* Nota */}
      <Dialog open={!!noteFor} onOpenChange={o => !o && setNoteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nota sobre {noteFor?.name}</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ej: pidió precio de cocina en L de 3 m, llamar después del 15" className="min-h-[110px]" />
          <DialogFooter>
            <Button onClick={() => { if (noteFor) update.mutate({ id: noteFor.id, notes: noteText.trim() || null }, { onSuccess: () => toast.success("Nota guardada") }); setNoteFor(null); }}>Guardar nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewLeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const empty = { name: "", phone: "", location: "", message: "", source: "whatsapp" as LeadSource, followUp: "" };
  const [f, setF] = useState(empty);
  const [types, setTypes] = useState<LeadWorkType[]>([]);
  const create = trpc.leads.create.useMutation({
    onSuccess: () => { toast.success("Interesado guardado"); setF(empty); setTypes([]); onCreated(); onClose(); },
    onError: e => toast.error(e.message.includes("WhatsApp") ? e.message : "Revisa el nombre y el número"),
  });
  const toggle = (w: LeadWorkType) => setTypes(p => (p.includes(w) ? p.filter(x => x !== w) : [...p, w]));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Nuevo interesado</DialogTitle>
          <DialogDescription>Anota a quien escribió por WhatsApp o redes para no perderle el rastro.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nombre del cliente" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="300 123 4567" type="tel" inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label>¿Qué necesita?</Label>
            <div className="flex flex-wrap gap-2">
              {LEAD_WORK_TYPES.map(w => (
                <button key={w.value} type="button" onClick={() => toggle(w.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${types.includes(w.value) ? "bg-teal-500/20 border-teal-400 text-teal-200" : "border-white/15 text-gray-300"}`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>¿Por dónde llegó?</Label>
            <div className="flex flex-wrap gap-2">
              {LEAD_SOURCES.filter(s => s.value !== "web").map(s => (
                <button key={s.value} type="button" onClick={() => setF({ ...f, source: s.value })}
                  className={`px-3 py-1.5 rounded-full text-sm border ${f.source === s.value ? "bg-teal-500/20 border-teal-400 text-teal-200" : "border-white/15 text-gray-300"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Barrio o ciudad <span className="text-gray-500 font-normal">(opcional)</span></Label>
            <Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="Ej: Dosquebradas" />
          </div>
          <div className="space-y-1.5">
            <Label>Nota <span className="text-gray-500 font-normal">(opcional)</span></Label>
            <Textarea value={f.message} onChange={e => setF({ ...f, message: e.target.value })} placeholder="Qué preguntó, presupuesto, para cuándo…" />
          </div>
          <div className="space-y-1.5">
            <Label>Volver a escribirle <span className="text-gray-500 font-normal">(opcional)</span></Label>
            <div className="flex flex-wrap gap-2">
              {[{ l: "Mañana", d: 1 }, { l: "En 3 días", d: 3 }, { l: "En 1 semana", d: 7 }].map(o => {
                const v = addDays(o.d);
                return (
                  <button key={o.d} type="button" onClick={() => setF({ ...f, followUp: f.followUp === v ? "" : v })}
                    className={`px-3 py-1.5 rounded-full text-sm border ${f.followUp === v ? "bg-sky-500/20 border-sky-400 text-sky-200" : "border-white/15 text-gray-300"}`}>
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={create.isPending || f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 7}
            onClick={() => create.mutate({
              name: f.name, whatsappPhone: f.phone, workTypes: types, source: f.source,
              location: f.location || undefined, message: f.message || undefined, followUpDate: f.followUp || null,
            })}>
            {create.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
