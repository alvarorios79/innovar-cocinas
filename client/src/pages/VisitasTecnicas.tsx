/**
 * Panel de Visitas Técnicas — Vista Admin/Comercial
 * Muestra todas las visitas enviadas por medidores.
 * Permite ver detalles y crear cotización desde la visita.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ruler, Camera, FileText, ChevronRight, Loader2,
  CheckCircle2, Clock, Send, User, MapPin, Phone,
  FileSpreadsheet, Eye, Maximize2, X, ArrowLeft,
  ClipboardList, PenLine, Square,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Tipos ────────────────────────────────────────────────────────────────────

type WorkType = "cocina" | "closet" | "puertas" | "centro_tv";
type VisitStatus = "borrador" | "enviada" | "convertida";

type Photo = {
  id: number;
  photoUrl: string;
  category: string;
  description?: string | null;
};

type Visit = {
  id: number;
  clientName: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  workType: WorkType;
  status: VisitStatus;
  createdAt: string;
  notes?: string | null;
  measurements?: Record<string, unknown> | null;
  photos?: Photo[];
  quotationId?: number | null;
  createdByUser?: { name: string } | null;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  cocina:    "🍳 Cocina",
  closet:    "🪞 Closet",
  puertas:   "🚪 Puertas",
  centro_tv: "📺 Centro TV",
};

const MEASUREMENT_LABELS: Record<string, Record<string, string>> = {
  cocina: {
    anchoTotal: "Ancho total", altoCielo: "Alto cielo",
    profundidad: "Profundidad", anchoVentana: "Ancho ventana",
    altoVentana: "Alto ventana", altoVentanaPiso: "Ventana desde piso",
  },
  closet:    { ancho: "Ancho", alto: "Alto", profundidad: "Profundidad" },
  puertas:   { anchoPaso: "Ancho paso", altoPaso: "Alto paso", grosorPared: "Grosor pared" },
  centro_tv: { anchoEspacio: "Ancho espacio", altoEspacio: "Alto espacio", tamanoTV: "Tamaño TV" },
};

const MEASUREMENT_UNITS: Record<string, string> = {
  tamanoTV: '"', default: "cm",
};

const STATUS_CONFIG: Record<VisitStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  borrador:   { label: "Borrador",   variant: "outline" },
  enviada:    { label: "Enviada",    variant: "default" },
  convertida: { label: "Convertida", variant: "secondary" },
};

// Etiquetas legibles para la evaluación técnica
const EVAL_LABELS: Record<string, Record<string, string>> = {
  tipoParedes:    { bloque: "Bloque / Ladrillo", concreto: "Concreto", drywall: "Drywall", mixto: "Mixto" },
  estadoParedes:  { bueno: "✅ Bueno", requiere_repello: "⚠️ Requiere repello", requiere_demolicion: "🔴 Requiere demolición" },
  electricidad:   { adecuada: "✅ Adecuada", requiere_revision: "⚠️ Requiere revisión", requiere_ampliacion: "⚠️ Requiere ampliación", sin_instalacion: "🔴 Sin instalación" },
  tomacorrientes: { suficientes: "✅ Suficientes", pocos: "⚠️ Pocos", ninguno: "🔴 Ninguno" },
  nivoPiso:       { nivelado: "✅ Nivelado", desnivel_leve: "⚠️ Desnivel leve", desnivel_importante: "🔴 Desnivel importante" },
  acceso:         { facil: "✅ Fácil", escaleras: "Escaleras", ascensor: "Ascensor", dificil: "⚠️ Difícil" },
  demolicion:     { no: "✅ No requiere", mueble_viejo: "⚠️ Retirar mueble", obra_civil: "🔴 Obra civil previa" },
};

const EVAL_FIELD_LABELS: Record<string, string> = {
  tipoParedes: "Tipo de paredes", estadoParedes: "Estado paredes",
  electricidad: "Electricidad", tomacorrientes: "Tomacorrientes",
  nivoPiso: "Nivel del piso", acceso: "Acceso", demolicion: "Demolición",
};

const CHECKLIST_LABELS: Record<string, string> = {
  medidas_tomadas: "Medidas tomadas", foto_frontal: "Foto frontal",
  fotos_laterales: "Fotos laterales", corriente_marcada: "Corriente identificada",
  tuberias_marcadas: "Tuberías verificadas", ventana_verificada: "Ventana verificada",
  plano_subido: "Plano subido", cliente_conforme: "Cliente conforme",
  foto_interior: "Foto interior", electrico_marcado: "Eléctrico marcado",
  grosor_verificado: "Grosor verificado", apertura_definida: "Apertura definida",
  tv_verificado: "TV verificado",
};

const PHOTO_CAT_LABELS: Record<string, string> = {
  foto: "General", foto_frontal: "Frontal", foto_lateral: "Lateral",
  foto_techo: "Techo", foto_electrico: "Eléctrico", foto_plomeria: "Plomería",
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function VisitasTecnicas() {
  const [, navigate] = useLocation();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter]       = useState<VisitStatus | "todas">("enviada");

  const { data: visits = [], isLoading } = trpc.technicalVisits.list.useQuery(
    statusFilter !== "todas" ? { status: statusFilter } : undefined,
    { refetchOnWindowFocus: false }
  );

  const { data: visitDetail, isLoading: loadingDetail } = trpc.technicalVisits.getById.useQuery(
    { visitId: selectedVisitId ?? 0 },
    { enabled: !!selectedVisitId, refetchOnWindowFocus: false }
  );

  const handleCreateQuotation = (visit: Visit) => {
    // Navega a la creación de cotización pasando los datos del cliente como query params
    navigate(`/quotations?fromVisit=${visit.id}&clientName=${encodeURIComponent(visit.clientName)}&clientPhone=${encodeURIComponent(visit.clientPhone ?? "")}&workType=${visit.workType}`);
  };

  // ── Vista detalle ────────────────────────────────────────────────────────

  if (selectedVisitId !== null) {
    const visit = visitDetail as Visit | undefined;
    const photos = (visit?.photos ?? []) as Photo[];
    const fotos  = photos.filter(p => p.category !== "firma" && !p.category?.startsWith("pdf"));
    const pdfs   = photos.filter(p => p.category?.startsWith("pdf"));
    const firmas = photos.filter(p => p.category === "firma");
    const rawMeasurements = (visit?.measurements ?? {}) as Record<string, any>;
    const { _checklist, _evaluacion, _geo, ...measurements } = rawMeasurements;
    const checklist:  Record<string, boolean> = (_checklist  as any) ?? {};
    const evaluacion: Record<string, string>  = (_evaluacion as any) ?? {};
    const geo: { lat: number; lng: number } | null = (_geo as any) ?? null;
    const fields = visit ? (MEASUREMENT_LABELS[visit.workType] ?? {}) : {};

    return (
      <div className="min-h-screen bg-[#0C1A1A] text-white">
        {/* Lightbox */}
        {lightboxUrl && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxUrl(null)}>
              <X className="h-8 w-8" />
            </button>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded" />
          </div>
        )}

        {/* Header detalle */}
        <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <button onClick={() => setSelectedVisitId(null)} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{visit?.clientName ?? "Cargando..."}</h1>
              <p className="text-sm text-gray-400">
                {visit ? WORK_TYPE_LABELS[visit.workType] : ""}
                {visit?.clientAddress && ` · ${visit.clientAddress}`}
              </p>
            </div>
            {visit?.status === "enviada" && (
              <Button
                onClick={() => visit && handleCreateQuotation(visit)}
                className="bg-[#1DB5A8] hover:bg-[#17a396] text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Crear cotización
              </Button>
            )}
            {visit?.status === "convertida" && (
              <Badge className="bg-green-600 text-white">✓ Cotización creada</Badge>
            )}
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1DB5A8]" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Datos del cliente */}
            <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10">
              <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                <User className="h-4 w-4" /> Datos del cliente
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="h-4 w-4 text-gray-500" /> {visit?.clientName}
                </div>
                {visit?.clientPhone && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="h-4 w-4 text-gray-500" /> {visit.clientPhone}
                  </div>
                )}
                {visit?.clientAddress && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-gray-500" /> {visit.clientAddress}
                  </div>
                )}
                {geo && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs pt-1">
                    <MapPin className="h-3.5 w-3.5 text-[#1DB5A8]" />
                    <a
                      href={`https://maps.google.com/?q=${geo.lat},${geo.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1DB5A8] underline"
                    >
                      Ver en Google Maps ({geo.lat.toFixed(4)}, {geo.lng.toFixed(4)})
                    </a>
                  </div>
                )}
                <div className="pt-2 text-xs text-gray-500">
                  Visita creada: {visit ? new Date(visit.createdAt).toLocaleDateString("es-CO", {
                    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : ""}
                </div>
                {(visit as any)?.createdByUser?.name && (
                  <div className="text-xs text-gray-500">Medidor: {(visit as any).createdByUser.name}</div>
                )}
              </div>
            </div>

            {/* Medidas */}
            <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10">
              <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Medidas registradas
              </h2>
              {Object.keys(fields).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(fields).map(([key, label]) => {
                    const value = measurements[key];
                    const unit  = MEASUREMENT_UNITS[key] ?? MEASUREMENT_UNITS.default;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{label}</span>
                        <span className={`font-medium ${value ? "text-white" : "text-gray-600"}`}>
                          {value ? `${value} ${unit}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sin medidas registradas</p>
              )}
            </div>

            {/* Evaluación técnica */}
            {Object.keys(evaluacion).filter(k => !k.endsWith("_nota")).length > 0 && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Evaluación técnica del espacio
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(EVAL_FIELD_LABELS).map(([key, label]) => {
                    const val  = evaluacion[key];
                    const nota = evaluacion[`${key}_nota`];
                    if (!val) return null;
                    return (
                      <div key={key} className="bg-[#0C1A1A] rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className="text-sm text-white font-medium">
                          {EVAL_LABELS[key]?.[val] ?? val}
                        </p>
                        {nota && <p className="text-xs text-gray-400 mt-1 italic">{nota}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checklist */}
            {Object.keys(checklist).length > 0 && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Checklist del medidor
                </h2>
                <div className="space-y-2">
                  {Object.entries(checklist).map(([key, done]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-[#1DB5A8] flex-shrink-0" />
                        : <Square className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                      <span className={done ? "text-gray-300" : "text-gray-600 line-through"}>
                        {CHECKLIST_LABELS[key] ?? key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {visit?.notes && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas del técnico
                </h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{visit.notes}</p>
              </div>
            )}

            {/* Firma */}
            {firmas.length > 0 && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <PenLine className="h-4 w-4" /> Firma del cliente
                </h2>
                {firmas.map(f => (
                  <div key={f.id} className="bg-white rounded-lg overflow-hidden">
                    <img src={f.photoUrl} alt="Firma" className="w-full h-24 object-contain p-2" />
                  </div>
                ))}
              </div>
            )}

            {/* Fotos */}
            {fotos.length > 0 && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Fotos del espacio ({fotos.length})
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {fotos.map(photo => (
                    <div key={photo.id} className="relative aspect-square">
                      <img
                        src={photo.photoUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxUrl(photo.photoUrl)}
                      />
                      {photo.category !== "foto" && (
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                          {PHOTO_CAT_LABELS[photo.category] ?? photo.category}
                        </span>
                      )}
                      <button
                        onClick={() => setLightboxUrl(photo.photoUrl)}
                        className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1"
                      >
                        <Maximize2 className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDFs */}
            {pdfs.length > 0 && (
              <div className="bg-[#162828] rounded-xl p-5 border border-[#1DB5A8]/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Planos GoodNotes ({pdfs.length})
                </h2>
                <div className="space-y-2">
                  {pdfs.map(pdf => (
                    <div key={pdf.id} className="flex items-center gap-3 bg-[#0C1A1A] rounded-lg px-4 py-3">
                      <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{pdf.description ?? "Plano"}</p>
                      </div>
                      <a
                        href={pdf.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1DB5A8] hover:text-[#17a396] flex items-center gap-1 text-sm"
                      >
                        <Eye className="h-4 w-4" /> Ver PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA crear cotización */}
            {visit?.status === "enviada" && (
              <div className="md:col-span-2">
                <Button
                  onClick={() => visit && handleCreateQuotation(visit)}
                  className="w-full bg-[#1DB5A8] hover:bg-[#17a396] text-white h-12 text-base font-semibold"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  Crear cotización para {visit.clientName}
                </Button>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }

  // ── Vista lista ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0C1A1A] text-white">
      {/* Header */}
      <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-[#1DB5A8] flex items-center gap-2">
            <Ruler className="h-6 w-6" /> Visitas Técnicas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Medidas y fotos de campo para cotización</p>

          {/* Filtros */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {(["todas", "enviada", "convertida", "borrador"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === s
                    ? "border-[#1DB5A8] bg-[#1DB5A8]/10 text-[#1DB5A8]"
                    : "border-[#1DB5A8]/20 text-gray-400 hover:border-[#1DB5A8]/40"
                }`}
              >
                {s === "todas" ? "Todas" : s === "enviada" ? "Pendientes de cotizar" : s === "convertida" ? "Cotizadas" : "Borradores"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1DB5A8]" />
          </div>
        )}

        {!isLoading && (visits as Visit[]).length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Ruler className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Sin visitas en esta categoría</p>
          </div>
        )}

        <div className="space-y-3">
          {(visits as Visit[]).map(visit => {
            const cfg = STATUS_CONFIG[visit.status];
            const photoCount = visit.photos?.length ?? 0;
            return (
              <button
                key={visit.id}
                onClick={() => setSelectedVisitId(visit.id)}
                className="w-full bg-[#162828] border border-[#1DB5A8]/10 rounded-xl p-5 text-left hover:border-[#1DB5A8]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-white text-base">{visit.clientName}</p>
                      <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                      <span className="text-sm text-gray-400">{WORK_TYPE_LABELS[visit.workType]}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {visit.clientAddress && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {visit.clientAddress}
                        </span>
                      )}
                      {visit.clientPhone && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {visit.clientPhone}
                        </span>
                      )}
                      {photoCount > 0 && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Camera className="h-3.5 w-3.5" /> {photoCount} archivo{photoCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(visit.createdAt).toLocaleDateString("es-CO", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {visit.status === "enviada" && (
                      <span className="text-xs bg-[#1DB5A8]/10 text-[#1DB5A8] border border-[#1DB5A8]/30 px-2 py-1 rounded-full">
                        Lista para cotizar
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
