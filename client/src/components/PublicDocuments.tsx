/**
 * Enlace del cliente con los planos técnicos y detalles que se le enviaron
 * (`/gallery?project=X&token=Y&type=documentos`). Sin login: el token es la autenticación.
 * El cliente (o su maestro de obra) ve, descarga y confirma "Recibido" con su nombre.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { FileText, Image as ImageIcon, Download, Eye, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function longDate(v?: string | Date | null): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function PublicDocuments({ projectId, token }: { projectId: number; token: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.projectDocs.publicList.useQuery(
    { projectId, token },
    { enabled: projectId > 0 && !!token, refetchOnWindowFocus: false },
  );
  const [name, setName] = useState("");
  const confirm = trpc.projectDocs.confirmReceived.useMutation({
    onSuccess: () => { utils.projectDocs.publicList.invalidate({ projectId, token }); toast.success("¡Gracias! Quedó confirmado"); },
    onError: (e) => toast.error(e.message),
  });

  const docs = data?.docs ?? [];
  const pending = docs.filter((d) => !d.receivedAt);
  const lastReceived = docs.filter((d) => d.receivedAt).sort((a, b) => +new Date(b.receivedAt as any) - +new Date(a.receivedAt as any))[0];
  const fileUrl = (id: number) => `/api/files/shared?project=${projectId}&token=${encodeURIComponent(token)}&doc=${id}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      <header style={{ background: "#111111", borderBottom: "1px solid #1e1e1e" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="rounded-xl p-2 flex-shrink-0" style={{ background: "#ffffff" }}>
            <img src="/logo-light.png" alt="INNOVAR" className="h-10 object-contain" style={{ maxWidth: "110px" }} />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight">INNOVAR Cocinas de Diseño</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>Planos técnicos y detalles</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
        ) : error || !data ? (
          <div className="text-center py-16">
            <p className="text-white font-semibold mb-2">Enlace no válido</p>
            <p className="text-sm" style={{ color: "#999" }}>Pídele a Innovar que te envíe el enlace de nuevo.</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-white text-xl font-bold">
                {data.clientFirstName ? `Hola ${data.clientFirstName}, estos son` : "Estos son"} los documentos de tu proyecto
              </h1>
              <p className="text-sm mt-1" style={{ color: "#aaa" }}>
                Puedes verlos, descargarlos y reenviar este enlace a tu maestro de obra, plomero o electricista.
              </p>
            </div>

            {docs.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: "#999" }}>Por ahora no hay documentos para ti.</p>
            ) : (
              <div className="space-y-3">
                {docs.map((d) => (
                  <div key={d.id} className="rounded-2xl p-4" style={{ background: "#141414", border: "1px solid #222" }}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl p-2.5 shrink-0" style={{ background: d.isPdf ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)" }}>
                        {d.isPdf ? <FileText className="h-6 w-6 text-red-400" /> : <ImageIcon className="h-6 w-6 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold break-words">{d.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#888" }}>Enviado el {longDate(d.sentAt as any)}</p>
                        {d.receivedAt && (
                          <p className="text-xs mt-1 inline-flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3.5 w-3.5" /> Recibido por {d.receivedName}
                          </p>
                        )}
                      </div>
                    </div>
                    {!d.isPdf && (
                      <img src={d.url} alt={d.name} className="mt-3 w-full rounded-xl" loading="lazy" />
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: "#222", border: "1px solid #333" }}>
                        <Eye className="h-4 w-4" /> Ver
                      </a>
                      <a href={fileUrl(d.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-black"
                        style={{ background: "var(--primary)" }}>
                        <Download className="h-4 w-4" /> Descargar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pending.length > 0 ? (
              <section className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(37,211,102,0.14), #141414 70%)", border: "1px solid rgba(37,211,102,0.35)" }}>
                <h2 className="text-white font-bold text-lg mb-1">✅ Confirma que {pending.length === 1 ? "lo recibiste" : "los recibiste"}</h2>
                <p className="text-sm mb-4" style={{ color: "#aaa" }}>
                  Escribe tu nombre y toca <b>Recibido</b>. Así queda constancia de que {pending.length === 1 ? "el documento te llegó" : "los documentos te llegaron"}.
                </p>
                <form
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) confirm.mutate({ projectId, token, name: name.trim() }); }}
                >
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    maxLength={120}
                    className="bg-black/40 border-white/15 text-white h-12 text-base"
                  />
                  <button
                    type="submit"
                    disabled={name.trim().length < 2 || confirm.isPending}
                    className="h-12 px-6 rounded-xl font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    style={{ background: "#25D366" }}
                  >
                    {confirm.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />} Recibido
                  </button>
                </form>
              </section>
            ) : docs.length > 0 && lastReceived ? (
              <section className="rounded-2xl p-5 text-center" style={{ background: "#141414", border: "1px solid rgba(37,211,102,0.35)" }}>
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-white font-semibold">¡Gracias, {lastReceived.receivedName}!</p>
                <p className="text-sm mt-1" style={{ color: "#aaa" }}>Confirmaste que recibiste los documentos el {longDate(lastReceived.receivedAt as any)}.</p>
              </section>
            ) : null}

            <a href="https://wa.me/573136802025" target="_blank" rel="noopener noreferrer"
              className="block text-center text-sm py-3" style={{ color: "var(--primary)" }}>
              ¿Dudas sobre el plano? Escríbenos por WhatsApp
            </a>
          </>
        )}
      </main>
    </div>
  );
}
