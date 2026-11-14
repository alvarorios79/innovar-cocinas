/**
 * Conocimiento de Elena — lo que la asistente de la página (cocinasintegralespereira.co) sabe y puede decir.
 * Álvaro (o la administradora) agrega, edita, apaga o borra temas; la página los lee solos en unos minutos.
 * Elena ya trae sus temas base en la página; lo que se escribe aquí se suma a eso (y no puede cambiar las reglas de precios).
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Power, Sparkles, Trash2 } from "lucide-react";
import { confirmAction } from "@/lib/confirm";

const CATEGORIAS = [
  { value: "info", label: "Información general" },
  { value: "servicio", label: "Servicio" },
  { value: "proceso", label: "Proceso" },
  { value: "zona", label: "Zona de atención" },
  { value: "garantia", label: "Garantía" },
  { value: "precio", label: "Precio (sin cifras nuevas)" },
  { value: "promocion", label: "Promoción vigente" },
] as const;

type Tema = { id: number; titulo: string; categoria: string; contenido: string; activo: number; updatedAt: string };
const vacio = { id: 0, titulo: "", categoria: "info", contenido: "" };

export default function ConocimientoElena() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.elena.list.useQuery();
  const [form, setForm] = useState<typeof vacio | null>(null);
  const refrescar = () => utils.elena.list.invalidate();
  const onError = (e: { message: string }) => toast.error(e.message);
  const crear = trpc.elena.create.useMutation({ onSuccess: () => { toast.success("Tema agregado"); setForm(null); refrescar(); }, onError });
  const editar = trpc.elena.update.useMutation({ onSuccess: () => { toast.success("Tema guardado"); setForm(null); refrescar(); }, onError });
  const activar = trpc.elena.setActive.useMutation({ onSuccess: refrescar, onError });
  const borrar = trpc.elena.remove.useMutation({ onSuccess: () => { toast.success("Tema borrado"); refrescar(); }, onError });

  const temas = (data ?? []) as Tema[];
  const guardar = () => {
    if (!form) return;
    const base = { titulo: form.titulo, categoria: form.categoria as (typeof CATEGORIAS)[number]["value"], contenido: form.contenido };
    if (form.id) editar.mutate({ id: form.id, ...base });
    else crear.mutate(base);
  };

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="Conocimiento de Elena"
        subtitle="Lo que la asistente de la página sabe y puede decir. Lo que agregue aquí lo aprende en unos minutos."
        actions={<Button onClick={() => setForm({ ...vacio })}><Plus className="h-4 w-4 mr-2" />Nuevo tema</Button>}
      />

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
        Elena ya sabe lo básico de Innovar (servicios, zonas, proceso, visita gratis en el casco urbano de Pereira, que no vende electrodomésticos).
        Aquí escribe lo que quiera <b>sumarle</b>: una promoción, un servicio nuevo, un horario especial. Los <b>precios</b> no se escriben aquí: salen solos del Motor de Cotización.
        Escriba en tono claro y breve, como se lo explicaría a un cliente.
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : temas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Todavía no hay temas propios. Elena responde con lo básico que ya trae.
        </div>
      ) : (
        <div className="space-y-3">
          {temas.map((t) => (
            <div key={t.id} className={`rounded-lg border p-4 ${t.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{t.titulo}</h3>
                    <Badge variant="outline">{CATEGORIAS.find((c) => c.value === t.categoria)?.label ?? t.categoria}</Badge>
                    {!t.activo && <Badge variant="secondary">Apagado</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{t.contenido}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setForm({ id: t.id, titulo: t.titulo, categoria: t.categoria, contenido: t.contenido })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title={t.activo ? "Apagar (Elena deja de decirlo)" : "Encender"} onClick={() => activar.mutate({ id: t.id, activo: !t.activo })}><Power className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={async () => { if (await confirmAction({ title: "¿Borrar este tema?", description: `«${t.titulo}» se borra del todo y Elena deja de saberlo.`, confirmText: "Sí, borrar", destructive: true })) borrar.mutate({ id: t.id }); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar tema" : "Nuevo tema"}</DialogTitle>
            <DialogDescription>Escriba lo que Elena debe saber. No ponga datos personales de clientes.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={form.titulo} maxLength={200} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej.: Promoción de diciembre" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Qué debe saber Elena</Label>
                <Textarea rows={6} value={form.contenido} maxLength={3000} onChange={(e) => setForm({ ...form, contenido: e.target.value })} placeholder="Escríbalo como se lo explicaría a un cliente." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form || form.titulo.trim().length < 3 || form.contenido.trim().length < 10 || crear.isPending || editar.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
