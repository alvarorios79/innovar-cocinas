/**
 * Carpeta "Planos técnicos y detalles": enviar archivos al cliente por WhatsApp y dejar constancia
 * (Enviado · Visto · Recibido). El cliente ve SOLO lo que se le envió (los detalles de armado internos no).
 */
import { useState } from "react";
import { Send, Eye, CheckCircle2, EyeOff, FileText, Image as ImageIcon, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isPdfUrl } from "@/lib/fileLinks";
import { formatDateTime } from "@/lib/format";
import { confirmAction } from "@/lib/confirm";
import { toast } from "sonner";

const SHARE_ROLES = ["super_admin", "admin", "comercial"];

type FileRow = { id: number; photoUrl: string; description?: string | null };

const fileName = (f: FileRow) => f.description || (isPdfUrl(f.photoUrl) ? "Plano" : "Imagen");

export function ProjectDocsShare({ projectId, files, role }: { projectId: number; files: FileRow[]; role?: string }) {
  const canShare = SHARE_ROLES.includes(role || "");
  const utils = trpc.useUtils();
  const { data: shares = [] } = trpc.projectDocs.list.useQuery({ projectId }, { enabled: files.length > 0 });
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<{ link: string; whatsAppLink: string | null; message: string } | null>(null);

  const share = trpc.projectDocs.share.useMutation({
    onSuccess: (r) => {
      utils.projectDocs.list.invalidate({ projectId });
      setResult(r);
      if (r.whatsAppLink) window.open(r.whatsAppLink, "_blank");
      toast.success(r.sent === 1 ? "Documento marcado como enviado" : `${r.sent} documentos marcados como enviados`);
    },
    onError: (e) => toast.error(e.message),
  });
  const unshare = trpc.projectDocs.unshare.useMutation({
    onSuccess: () => { utils.projectDocs.list.invalidate({ projectId }); toast.success("El cliente ya no verá ese archivo"); },
    onError: (e) => toast.error(e.message),
  });

  const byPhoto = new Map((shares as any[]).map((s) => [s.photoId, s]));
  const sent = files.filter((f) => byPhoto.has(f.id));

  if (!files.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-white/10 space-y-2">
      {canShare && (
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => { setPicked(files.length === 1 ? [files[0].id] : []); setResult(null); setOpen(true); }}
        >
          <Send className="h-4 w-4 mr-2" /> Enviar al cliente por WhatsApp
        </Button>
      )}

      {sent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Enviados al cliente</p>
          {sent.map((f) => {
            const s = byPhoto.get(f.id);
            const hidden = !!s.hiddenAt;
            return (
              <div key={f.id} className={`rounded-md border border-white/10 px-2.5 py-2 text-xs ${hidden ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2">
                  {isPdfUrl(f.photoUrl) ? <FileText className="h-4 w-4 text-red-400 shrink-0" /> : <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />}
                  <span className="font-medium truncate flex-1">{fileName(f)}</span>
                  {canShare && !hidden && (
                    <button
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Dejar de mostrar al cliente"
                      onClick={async () => {
                        if (await confirmAction({ title: "¿Dejar de mostrar este archivo al cliente?", description: "Ya no aparecerá en su enlace. La constancia de envío se conserva.", confirmText: "Dejar de mostrar" })) {
                          unshare.mutate({ photoId: f.id });
                        }
                      }}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Send className="h-3 w-3" /> Enviado {formatDateTime(s.lastSentAt)}{s.sendCount > 1 ? ` (${s.sendCount} veces)` : ""}
                  </span>
                  {s.viewedAt && <span className="inline-flex items-center gap-1 text-blue-400"><Eye className="h-3 w-3" /> Visto {formatDateTime(s.viewedAt)}</span>}
                  {s.receivedAt
                    ? <span className="inline-flex items-center gap-1 text-green-400 font-semibold"><CheckCircle2 className="h-3 w-3" /> Recibido por {s.receivedName} · {formatDateTime(s.receivedAt)}</span>
                    : !hidden && <span className="text-amber-400">Falta que confirme "Recibido"</span>}
                  {hidden && <span>Ya no se muestra al cliente</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar al cliente</DialogTitle>
            <DialogDescription>
              Marca lo que el cliente debe ver. Los detalles internos de armado no los marques: el cliente solo verá lo que envíes.
            </DialogDescription>
          </DialogHeader>
          {!result ? (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {files.map((f) => {
                const s = byPhoto.get(f.id);
                return (
                  <label key={f.id} className="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04]">
                    <Checkbox
                      checked={picked.includes(f.id)}
                      onCheckedChange={(v) => setPicked((p) => (v ? [...p, f.id] : p.filter((x) => x !== f.id)))}
                    />
                    {isPdfUrl(f.photoUrl) ? <FileText className="h-4 w-4 text-red-400 shrink-0" /> : <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />}
                    <span className="text-sm flex-1 truncate">{fileName(f)}</span>
                    {s && !s.hiddenAt && <span className="text-[10px] text-green-400 whitespace-nowrap">{s.receivedAt ? "Recibido" : "Enviado"}</span>}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {result.whatsAppLink ? (
                <p>El mensaje está listo y quedó registrado el envío. Si WhatsApp no se abrió solo, toca <b>Abrir WhatsApp</b> y oprime <b>enviar</b>.</p>
              ) : (
                <p className="text-amber-400">El cliente no tiene WhatsApp registrado. Copia el mensaje y envíalo tú.</p>
              )}
              <div className="flex gap-2">
                {result.whatsAppLink && (
                  <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1">
                    <a href={result.whatsAppLink} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
                  </Button>
                )}
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={() => navigator.clipboard?.writeText(result.message).then(() => toast.success("Mensaje copiado"), () => toast.error("No se pudo copiar"))}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> Copiar mensaje
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  disabled={!picked.length || share.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => share.mutate({ projectId, photoIds: picked })}
                >
                  <Send className="h-4 w-4 mr-2" /> {share.isPending ? "Preparando…" : `Enviar ${picked.length || ""}`}
                </Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>Listo</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
