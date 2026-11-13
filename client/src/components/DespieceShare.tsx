/**
 * Carpeta "Despieces": enviar los PDF al jefe de taller por WhatsApp (pedido de Álvaro, 12 nov 2026).
 * El mensaje lleva un enlace por archivo que abre el PDF directo en el celular, sin pedir clave.
 * Solo diseñador y super admin. Al tocar "Enviar" también le llega el aviso en la campanita.
 */
import { useState } from "react";
import { Send, FileText, Copy, Hammer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isPdfUrl } from "@/lib/fileLinks";
import { toast } from "sonner";

const SEND_ROLES = ["super_admin", "disenador"];

type FileRow = { id: number; photoUrl: string; description?: string | null };

export function DespieceShare({ projectId, files, role }: { projectId: number; files: FileRow[]; role?: string }) {
  const pdfs = files.filter((f) => isPdfUrl(f.photoUrl));
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const { data, isFetching, error } = trpc.projectDocs.workshopShare.useQuery(
    { projectId, photoIds: picked },
    { enabled: open && picked.length > 0 },
  );
  const notify = trpc.projectDocs.notifyWorkshop.useMutation();

  if (!SEND_ROLES.includes(role || "") || !pdfs.length) return null;

  const sent = () => {
    notify.mutate({ projectId, count: picked.length });
    toast.success("Listo: en WhatsApp solo falta oprimir enviar");
  };
  const ready = !!data && !isFetching;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-white/10">
      <Button
        size="sm"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        onClick={() => { setPicked(pdfs.map((f) => f.id)); setOpen(true); }}
      >
        <Hammer className="h-4 w-4 mr-2" /> Enviar al taller por WhatsApp
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar despiece al taller</DialogTitle>
            <DialogDescription>
              Marca los PDF. Al jefe de taller le llega un enlace por cada uno: lo abre en el celular sin clave y lo puede guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {pdfs.map((f, i) => (
              <label key={f.id} className="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04]">
                <Checkbox
                  checked={picked.includes(f.id)}
                  onCheckedChange={(v) => setPicked((p) => (v ? [...p, f.id] : p.filter((x) => x !== f.id)))}
                />
                <FileText className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-sm flex-1 truncate">{f.description || (pdfs.length === 1 ? "Despiece" : `Despiece ${i + 1}`)}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}

          {picked.length > 0 && (
            <div className="space-y-2">
              {!ready && <p className="text-xs text-muted-foreground">Preparando el mensaje…</p>}
              {ready && data.recipients.map((r) =>
                r.whatsAppLink ? (
                  <Button key={r.id} asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <a href={r.whatsAppLink} target="_blank" rel="noopener noreferrer" onClick={sent}>
                      <Send className="h-4 w-4 mr-2" /> Enviar a {r.name}
                    </a>
                  </Button>
                ) : (
                  <p key={r.id} className="text-xs text-amber-400">
                    {r.name} no tiene celular registrado en Usuarios. Usa «Elegir contacto en WhatsApp».
                  </p>
                ),
              )}
              {ready && (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={data.anyoneLink} target="_blank" rel="noopener noreferrer" onClick={sent}>Elegir contacto en WhatsApp</a>
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => navigator.clipboard?.writeText(data.message).then(() => toast.success("Mensaje copiado"), () => toast.error("No se pudo copiar"))}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copiar
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
