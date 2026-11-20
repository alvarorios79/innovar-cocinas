import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { registrarAlVolverDeWhatsApp } from "@/lib/whatsappEnvio";

// Sección «Seguimiento» de Cotizaciones: los mensajes que toca enviar HOY (ya redactados, cercanos y respetuosos) y los que vienen.
// Un toque abre WhatsApp con el texto listo (se puede editar) y deja registrado el envío. Nunca se escribe solo al cliente.

const MOTIVOS = ["Prefirió otra opción", "Por el precio", "Aplazó el proyecto", "No responde", "Otro motivo"];
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Bogota" });
const pesos = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

type Item = {
  quotationId: number; numero: string; cliente: string; telefono: string | null; tipoTexto: string; total: number; estado: "sent" | "approved";
  tipo: "seguimiento" | "anticipo"; step: string; etiqueta: string; due: string; porEnviar: boolean; validUntil: string | null; extension: string | null;
  mensaje: string; enlace: string | null; contactos: number; ultimoContacto: string | null;
};

function Tarjeta({ it, destacada, onAbrir }: { it: Item; destacada: boolean; onAbrir: (numero: string, cliente: string, tipo: "seguimiento" | "anticipo") => void }) {
  const utils = trpc.useUtils();
  const [texto, setTexto] = useState(it.mensaje);
  const [ampliar, setAmpliar] = useState(!!it.extension);
  const [cerrando, setCerrando] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setTexto(it.mensaje); setAmpliar(!!it.extension); }, [it.mensaje, it.extension, it.step]);
  useEffect(() => { if (destacada) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [destacada]);

  const refrescar = () => { utils.seguimientoCot.list.invalidate(); utils.quotations.listPaginatedGrouped.invalidate(); utils.quotations.list.invalidate(); };
  const registrar = trpc.seguimientoCot.registrar.useMutation({
    onSuccess: (r) => { refrescar(); toast.success(r?.nuevaValidez ? `Registrado. Validez ampliada hasta el ${fecha(r.nuevaValidez)} (mismo precio)` : "Registrado ✅"); },
    onError: (e) => { refrescar(); toast.error(e.message); },
  });
  const cerrar = trpc.seguimientoCot.cerrar.useMutation({
    onSuccess: () => { refrescar(); toast.success("Seguimiento cerrado"); },
    onError: (e) => toast.error(e.message),
  });

  const enviar = () => {
    if (!it.telefono) { toast.error("El cliente no tiene teléfono registrado"); return; }
    // WhatsApp se abre en el mismo toque (si no, el navegador lo bloquea). El envío se registra al volver al CRM (ver whatsappEnvio.ts).
    window.open(enlaceWhatsApp(), "_blank", "noopener,noreferrer");
    registrarAlVolverDeWhatsApp(confirmarEnvio);
    toast.info("Cuando termines en WhatsApp y vuelvas aquí, quedará registrado el envío");
  };
  const enlaceWhatsApp = (dominio: "wa.me" | "api" = "wa.me") => dominio === "wa.me"
    ? `https://wa.me/${it.telefono}?text=${encodeURIComponent(texto)}`
    : `https://api.whatsapp.com/send?phone=${it.telefono}&text=${encodeURIComponent(texto)}`;
  const confirmarEnvio = () => registrar.mutate({ quotationId: it.quotationId, step: it.step, accion: "enviado", extender: it.step === "s4" ? ampliar : undefined });

  const anticipo = it.tipo === "anticipo";
  return (
    <div ref={ref} className={`rounded-xl border p-3 sm:p-4 space-y-3 ${destacada ? "border-amber-400 ring-2 ring-amber-400/40" : anticipo ? "border-green-500/40 bg-green-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-white">{it.cliente} <span className="text-xs font-normal text-white/50">· {it.numero}</span></p>
          <p className="text-xs text-white/60">
            {anticipo ? "✅ Aprobada · falta el anticipo" : `Enviada · vigente hasta ${it.validUntil ? fecha(it.validUntil) : "—"}`} · {pesos(it.total)}
            {it.contactos > 0 ? ` · ${it.contactos} mensaje${it.contactos > 1 ? "s" : ""} enviado${it.contactos > 1 ? "s" : ""}` : " · primer mensaje"}
          </p>
          <p className="text-xs text-primary mt-0.5">Mensaje: {it.etiqueta}</p>
        </div>
        <button type="button" className="text-xs underline text-white/60 hover:text-white" onClick={() => onAbrir(it.numero, it.cliente, it.tipo)}>Ver cotización</button>
      </div>

      {it.porEnviar ? (
        <>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={Math.min(10, Math.max(5, texto.split("\n").length + 1))}
            className="w-full rounded-lg bg-black/30 border border-white/15 p-2.5 text-sm text-white/90 leading-relaxed focus:outline-none focus:border-primary" aria-label="Mensaje para el cliente (se puede editar)" />
          {it.extension && (
            <label className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={ampliar} onChange={(e) => setAmpliar(e.target.checked)} />
              <span>Al enviar, ampliar la validez de la cotización hasta el <b>{fecha(it.extension)}</b> con el mismo precio.
                {!ampliar && <span className="text-amber-300"> Si no la amplías, quita del mensaje la frase de la nueva fecha.</span>}</span>
            </label>
          )}
          <p className="text-[11px] text-white/45">¿WhatsApp no carga? <button type="button" className="underline" onClick={() => window.open(enlaceWhatsApp("api"), "_blank", "noopener,noreferrer")}>Abrir enlace alterno</button></p>
          {!it.telefono && <p className="text-xs text-amber-300">Este cliente no tiene teléfono registrado: agrégalo en Clientes para poder escribirle.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={enviar} disabled={!it.telefono || registrar.isPending} className="h-9 bg-primary hover:bg-primary/90 text-white">💬 Enviar por WhatsApp</Button>
            <Button type="button" variant="outline" className="h-9" disabled={registrar.isPending}
              onClick={() => registrar.mutate({ quotationId: it.quotationId, step: it.step, accion: "omitido" })}>Omitir este mensaje</Button>
            <Button type="button" variant="ghost" className="h-9 text-white/60" onClick={() => setCerrando((x) => !x)}>No seguir escribiéndole</Button>
          </div>
        </>
      ) : (
        <p className="text-xs text-white/60">Próximo mensaje: <b>{fecha(it.due)}</b>. Te avisamos ese día en la campanita.</p>
      )}

      {cerrando && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-black/25 p-2.5 text-xs">
          <span className="text-white/70">Motivo:</span>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-8 rounded bg-background border border-white/15 px-2 text-white">
            {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <Button type="button" size="sm" className="h-8" disabled={cerrar.isPending} onClick={() => cerrar.mutate({ quotationId: it.quotationId, motivo })}>Cerrar seguimiento</Button>
        </div>
      )}
    </div>
  );
}

export function SeguimientoCotizaciones({ destacarId, onAbrir }: { destacarId: number | null; onAbrir: (numero: string, cliente: string, tipo: "seguimiento" | "anticipo") => void }) {
  const { data, isLoading } = trpc.seguimientoCot.list.useQuery(undefined, { refetchInterval: 60_000 });
  if (isLoading) return <p className="text-sm text-white/50">Cargando el seguimiento…</p>;
  const hoy: Item[] = (data?.porEnviar as Item[]) || [], luego: Item[] = (data?.programados as Item[]) || [];
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/65 leading-relaxed">
        Pocos mensajes y bien espaciados, para que el cliente sepa que estamos pendientes sin sentirse presionado. Cada mensaje está redactado con cercanía y respeto; puedes editarlo antes de enviarlo.
        Hacia el final se le ofrece ampliar la validez <b>con el mismo precio</b> (una sola vez y nunca después del 15 de diciembre).
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-amber-200">Por enviar hoy ({hoy.length})</h3>
        {hoy.length === 0 ? <p className="text-sm text-white/50">Nada por enviar por ahora. 🎉</p> : hoy.map((it) => <Tarjeta key={`${it.quotationId}-${it.step}`} it={it} destacada={destacarId === it.quotationId} onAbrir={onAbrir} />)}
      </section>
      {luego.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white/70">Programados ({luego.length})</h3>
          {luego.map((it) => <Tarjeta key={`${it.quotationId}-${it.step}`} it={it} destacada={destacarId === it.quotationId} onAbrir={onAbrir} />)}
        </section>
      )}
    </div>
  );
}

/** Cantidad de mensajes por enviar hoy (para el aviso que titila en la pestaña). */
export function usePorEnviarSeguimiento(): number {
  const { data } = trpc.seguimientoCot.list.useQuery(undefined, { refetchInterval: 60_000, retry: false });
  return data?.porEnviar?.length ?? 0;
}
