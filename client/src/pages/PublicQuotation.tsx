import { useState } from "react";
import { trpc } from "@/lib/trpc";

function useTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

export default function PublicQuotation() {
  const token = useTokenFromUrl();
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notes, setNotes] = useState("");

  const { data, isLoading, error } = trpc.quotations.publicGetByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const approveMutation = trpc.quotations.publicApprove.useMutation({
    onSuccess: (res) => {
      setApproved(true);
    },
    onError: (err) => {
      alert(err.message || "Error al aprobar. Intente de nuevo.");
      setApproving(false);
    },
  });

  const handleApprove = () => {
    if (!token) return;
    setApproving(true);
    approveMutation.mutate({ token, notes: notes || undefined });
  };

  if (!token) {
    return <ErrorScreen message="Enlace no válido. Por favor use el enlace enviado por WhatsApp." />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1DB5A8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando su cotización...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorScreen message="Este enlace no es válido o ya expiró. Contáctenos para más información." />;
  }

  const isAlreadyApproved = data.status === "approved" || approved;

  return (
    <div className="min-h-screen bg-[#0a1a1a] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1DB5A8] to-[#148f84] px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold">
            N
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Innovar Cocinas de Diseño</h1>
            <p className="text-white/80 text-sm">Fábrica directa · Pereira, Risaralda</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Estado aprobado */}
        {isAlreadyApproved && (
          <div className="bg-green-900/40 border border-green-500/40 rounded-xl p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-green-400 font-bold text-xl mb-1">¡Cotización Aprobada!</h2>
            <p className="text-gray-300 text-sm">
              Gracias, {data.clientName}. Nos pondremos en contacto pronto para iniciar su proyecto.
            </p>
            {(data as any).projectId && (
              <a
                href={`/gallery?project=${(data as any).projectId}&token=${token}`}
                className="inline-flex items-center gap-2 mt-4 bg-[#1DB5A8] hover:bg-[#17a396] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                📷 Ver avance de tu proyecto →
              </a>
            )}
          </div>
        )}

        {/* Resumen de la cotización */}
        <div className="bg-[#0f2424] border border-[#1DB5A8]/20 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#1DB5A8] text-xs uppercase tracking-widest font-semibold">Cotización</p>
              <h2 className="text-white font-bold text-2xl">{data.quotationNumber}</h2>
            </div>
            <StatusBadge status={data.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Cliente</p>
              <p className="text-white font-medium">{data.clientName}</p>
            </div>
            {data.validUntil && (
              <div>
                <p className="text-gray-500 text-xs">Válida hasta</p>
                <p className="text-white font-medium">{data.validUntil}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#1DB5A8]/10 pt-4 flex justify-between items-center">
            <span className="text-gray-400">Total</span>
            <span className="text-[#1DB5A8] font-bold text-2xl">{data.total}</span>
          </div>
        </div>

        {/* Ítems */}
        {data.items.length > 0 && (
          <div className="bg-[#0f2424] border border-[#1DB5A8]/20 rounded-xl p-5">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">Detalle</h3>
            <div className="space-y-3">
              {data.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start gap-2 text-sm">
                  <span className="text-gray-300 flex-1">{item.description}</span>
                  <span className="text-white font-medium whitespace-nowrap">{item.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF */}
        {data.pdfUrl && (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#162828] border border-[#1DB5A8]/30 hover:border-[#1DB5A8] rounded-xl p-4 text-[#1DB5A8] font-medium transition-colors"
          >
            <span>📄</span>
            Ver cotización en PDF
          </a>
        )}

        {/* Botón de aprobación */}
        {!isAlreadyApproved && data.status === "sent" && (
          <div className="bg-[#0f2424] border border-[#1DB5A8]/20 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">¿Desea aprobar esta cotización?</h3>
            <p className="text-gray-400 text-sm">
              Al aprobar, nuestro equipo se comunicará con usted para coordinar los próximos pasos.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios opcionales (ej: ajustes de diseño, preferencias de color)..."
              rows={3}
              className="w-full bg-[#0a1a1a] border border-[#1DB5A8]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#1DB5A8]/60 resize-none"
            />
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-[#1DB5A8] hover:bg-[#17a396] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              {approving ? "Aprobando..." : "✅ Aprobar Cotización"}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs pt-4 pb-8">
          <p>Innovar Cocinas de Diseño · Km 9 vía Cerritos, Pereira</p>
          <p className="mt-1">WhatsApp: <a href="https://wa.me/573136802025" className="text-[#1DB5A8]">313 680 2025</a></p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    draft: { label: "Borrador", class: "bg-gray-700 text-gray-300" },
    sent: { label: "Enviada", class: "bg-blue-900/50 text-blue-300" },
    approved: { label: "Aprobada", class: "bg-green-900/50 text-green-400" },
    rejected: { label: "Rechazada", class: "bg-red-900/50 text-red-400" },
  };
  const s = map[status] ?? { label: status, class: "bg-gray-700 text-gray-300" };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.class}`}>
      {s.label}
    </span>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a1a1a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-white font-bold text-xl mb-2">Enlace no disponible</h1>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <a
          href="https://wa.me/573136802025"
          className="inline-flex items-center gap-2 bg-[#1DB5A8] text-white font-medium px-5 py-3 rounded-xl text-sm"
        >
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}
