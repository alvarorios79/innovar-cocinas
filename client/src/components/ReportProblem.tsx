/**
 * "¿Algo no quedó bien?" en el enlace de entrega del cliente (portal sin login).
 * El cliente cuenta qué pasó y adjunta hasta 3 fotos → se crea el caso en Postventa y se avisa a la oficina.
 * Regla del iPhone: el <input type=file> va ENCIMA de la casilla, transparente, dentro de un <label>.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Camera, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

/** Reduce la foto en el navegador (máx. 1600 px, JPEG) para que suba rápido desde el celular. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ReportProblem({ projectId, token }: { projectId: number; token: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const report = trpc.postventa.publicReport.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => toast.error(e.message),
  });

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(files).slice(0, 3 - photos.length)) out.push(await shrink(f));
      setPhotos((p) => [...p, ...out].slice(0, 3));
    } catch {
      toast.error("No se pudo leer la foto");
    } finally {
      setBusy(false);
    }
  };

  const card = { background: "#141414", border: "1px solid #2a2a2a" } as const;

  if (sent) {
    return (
      <section className="rounded-2xl p-6 text-center" style={card}>
        <CheckCircle className="h-9 w-9 text-green-400 mx-auto mb-2" />
        <p className="text-white font-semibold">¡Recibimos tu reporte!</p>
        <p className="text-sm mt-1" style={{ color: "#aaa" }}>Te escribiremos pronto por WhatsApp para coordinar la revisión.</p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="rounded-2xl p-5 text-center" style={card}>
        <p className="text-white font-semibold">¿Algo no quedó bien o necesita un ajuste?</p>
        <p className="text-sm mt-1 mb-4" style={{ color: "#aaa" }}>Tu proyecto tiene garantía. Cuéntanos y lo revisamos.</p>
        <button onClick={() => setOpen(true)} className="px-5 py-3 rounded-xl font-bold text-white"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}>
          🛠️ Reportar un problema
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl p-5" style={card}>
      <h2 className="text-white font-bold text-lg mb-1">🛠️ Reportar un problema</h2>
      <p className="text-sm mb-4" style={{ color: "#aaa" }}>Cuéntanos qué pasa y, si puedes, toma una foto.</p>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2 || text.trim().length < 5) return toast.error("Escribe tu nombre y qué pasó");
        report.mutate({ projectId, token, name: name.trim(), description: text.trim(), photos });
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={120}
          className="w-full h-12 rounded-xl px-3 text-base text-white bg-black/40 border border-white/15" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1500}
          placeholder="Ej.: la puerta del mueble de la derecha no cierra bien"
          className="w-full rounded-xl p-3 text-base text-white bg-black/40 border border-white/15" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden">
              <img src={p} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"><X className="h-3.5 w-3.5 text-white" /></button>
            </div>
          ))}
          {photos.length < 3 && (
            <label className="relative h-20 w-20 rounded-lg border border-dashed border-white/25 flex flex-col items-center justify-center text-xs cursor-pointer" style={{ color: "#aaa" }}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5 mb-1" />Foto</>}
              <input type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="h-12 px-4 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.06)" }}>Cancelar</button>
          <button type="submit" disabled={report.isPending || busy} className="flex-1 h-12 rounded-xl font-bold text-black disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{ background: "var(--primary)" }}>
            {report.isPending && <Loader2 className="h-5 w-5 animate-spin" />} Enviar reporte
          </button>
        </div>
      </form>
    </section>
  );
}
