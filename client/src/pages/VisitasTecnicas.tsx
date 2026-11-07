/**
 * Panel de Visitas Técnicas — Vista Admin/Comercial
 * Muestra todas las visitas enviadas por medidores.
 * Permite ver detalles y crear cotización desde la visita.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getChecklistView } from "@/lib/visitChecklist";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Ruler, Camera, FileText, ChevronRight, Loader2,
  CheckCircle2, Clock, Send, User, MapPin, Phone,
  FileSpreadsheet, Eye, Maximize2, X, ArrowLeft,
  ClipboardList, PenLine, Square, Plus, UserCheck, Trash2,
} from "lucide-react";
import { useLocation } from "wouter";

import { confirmAction } from "@/lib/confirm";
// ── Tipos ────────────────────────────────────────────────────────────────────

type WorkType = "cocina" | "closet" | "puertas" | "centro_tv";
type VisitStatus = "borrador" | "enviada" | "cot_hecha" | "cot_enviada";

type Photo = {
  id: number;
  url: string;
  category: string;
  caption?: string | null;
  description?: string | null;
};

type Pdf = {
  id: string;
  url: string;
  fileName?: string | null;
  originalFileName?: string | null;
  createdAt: string;
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
  checklist?: Record<string, boolean> | null;
  technicalEvaluation?: string | null;
  criticalObservations?: string | null;
  clientSignature?: string | null;
  photos?: Photo[];
  pdfs?: Pdf[];
  quotationId?: number | null;
  createdByUser?: { name: string } | null;
  geoLocation?: { latitude: number; longitude: number; timestamp: string } | null;
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
  cot_hecha:   { label: "Cot. Hecha",   variant: "secondary" },
  cot_enviada: { label: "Cot. Enviada", variant: "default"   },
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

// Helper: Drizzle retorna timestamps sin timezone → forzar UTC para Colombia
const parseDBDate = (ds: string | Date | null | undefined): Date => {
  if (!ds) return new Date();
  if (ds instanceof Date) return ds;
  if (!(ds as string).includes('T') && !(ds as string).includes('Z') && !(ds as string).includes('+')) {
    return new Date((ds as string).replace(' ', 'T') + 'Z');
  }
  return new Date(ds as string);
};

export default function VisitasTecnicas() {
  const { user } = useAuth();
  const isManager = ["super_admin", "admin", "comercial"].includes(user?.role ?? "");
  const isSuperAdmin = user?.role === "super_admin";
  const [, navigate] = useLocation();
  // Si llegan desde un proyecto (?visitId=..&from=/projects/..) se abre directo ese levantamiento y "volver" regresa al proyecto
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const backTo = urlParams?.get("from") && urlParams.get("from")!.startsWith("/") ? urlParams.get("from")! : null;
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(() => {
    const v = urlParams?.get("visitId");
    return v && /^\d+$/.test(v) ? Number(v) : null;
  });
  const [lightboxUrl, setLightboxUrl]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter]       = useState<VisitStatus | "todas">("todas");
  // Pregunta de seguridad para borrar un levantamiento con cotización/proyecto (solo super_admin)
  const [quotedToDelete, setQuotedToDelete]   = useState<{ id: number; clientName: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");


  const utils = trpc.useUtils();

  // El servidor no filtra por estado: el filtro de pestañas se aplica aquí abajo
  const { data: visits = [], isLoading } = trpc.technicalVisits.list.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  const { data: visitDetail, isLoading: loadingDetail } = trpc.technicalVisits.getById.useQuery(
    { visitId: selectedVisitId ?? 0 },
    { enabled: !!selectedVisitId, refetchOnWindowFocus: false }
  );

  // Eliminar levantamiento (borrado lógico: deletedAt). Antes el botón llamaba
  // a una mutación que no existía y no hacía nada.
  const deleteVisitMutation = trpc.technicalVisits.delete.useMutation({
    onSuccess: () => {
      toast.success("Levantamiento eliminado");
      utils.technicalVisits.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Error eliminando levantamiento"),
  });

  const handleCreateQuotation = (visit: Visit) => {
    // Usar clientId si está disponible, si no URL params como fallback
    const clientParam = (visit as any).clientId
      ? `&clientId=${(visit as any).clientId}`
      : `&clientName=${encodeURIComponent(visit.clientName)}&clientPhone=${encodeURIComponent(visit.clientPhone ?? "")}`;
    // Para visitas multi-tipo, pasar todos los workTypes desde measurements._workTypes
    const visitMeas = (visit as any).measurements as Record<string, any> | null;
    const multiTypes: string[] | undefined = Array.isArray(visitMeas?._workTypes) && visitMeas._workTypes.length > 1
      ? visitMeas._workTypes
      : undefined;
    const workTypeParam = multiTypes
      ? `&workTypes=${encodeURIComponent(multiTypes.join(","))}`
      : `&workType=${visit.workType}`;
    navigate(`/quotations?fromVisit=${visit.id}${clientParam}${workTypeParam}`);
  };

  // ── Vista detalle ────────────────────────────────────────────────────────

  if (selectedVisitId !== null) {
    const visit = visitDetail as Visit | undefined;
    const photos = (visit?.photos ?? []) as Photo[];
    const fotos  = photos.filter(p => p.category !== "firma" && !p.category?.startsWith("pdf"));
    const pdfs   = photos.filter(p => p.category?.startsWith("pdf"));
    const firmas = photos.filter(p => p.category === "firma");
    const rawMeasurements = (visit?.measurements ?? {}) as Record<string, any>;
    const measurements = rawMeasurements;
    const checklist: Record<string, boolean> = (visit?.checklist ?? {}) as Record<string, boolean>;
    const technicalEval = visit?.technicalEvaluation ?? null;
    const criticalObs   = visit?.criticalObservations ?? null;
    const visiblePdfs   = visit?.pdfs ?? [];
    const geoRaw = (visit as any)?.geoLocation ?? null;
    const rawLat = (visit as any)?.geoLat ?? (visit as any)?.latitude ?? (visit as any)?.lat;
    const rawLng = (visit as any)?.geoLng ?? (visit as any)?.longitude ?? (visit as any)?.lng;
    const measGeo = (measurements as any)?._geo;
    const geo: { lat: number; lng: number } | null =
      (geoRaw && geoRaw.latitude && geoRaw.longitude) ? { lat: geoRaw.latitude, lng: geoRaw.longitude } :
      (rawLat && rawLng) ? { lat: parseFloat(String(rawLat)), lng: parseFloat(String(rawLng)) } :
      (measGeo?.latitude && measGeo?.longitude) ? { lat: parseFloat(String(measGeo.latitude)), lng: parseFloat(String(measGeo.longitude)) } :
      null;
    // Tipos de trabajo activos en el levantamiento (estructura nueva del Medidor)
    const ALL_WORK_TYPES = ["cocina", "closet", "puertas", "centro_tv", "mueble_bano", "otro"] as const;
    const WORK_TYPE_LABELS_LOCAL: Record<string, string> = {
      cocina: "Cocina Integral", closet: "Closet", puertas: "Puertas",
      centro_tv: "Centro de TV", mueble_bano: "Mueble de Baño", otro: "Otro",
    };
    const activeWorkTypes = ALL_WORK_TYPES.filter(wt => !!(measurements as any)[`_tipo_${wt}`]);

    return (
      <div className="min-h-screen bg-background text-white">
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
        <div className="bg-card border-b border-primary/20 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <button onClick={() => { if (backTo) navigate(backTo); else setSelectedVisitId(null); }} className="text-gray-400 hover:text-white" title={backTo ? "Volver al proyecto" : "Volver a la lista"}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{visit?.clientName ?? "Cargando..."}</h1>
              <p className="text-sm text-gray-400">
                {visit ? WORK_TYPE_LABELS[visit.workType] : ""}
                {visit?.clientAddress && ` · ${visit.clientAddress}`}
              </p>
            </div>
            {isManager && visit?.status === "enviada" && (
              <Button
                onClick={() => visit && handleCreateQuotation(visit)}
                className="bg-primary hover:bg-primary text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Crear cotización
              </Button>
            )}
            {isManager && (visit?.status === "cot_hecha" || visit?.status === "cot_enviada") && (
              <Button
                variant="outline"
                onClick={() => navigate(`/medidor?visitId=${visit?.id}`)}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar información
              </Button>
            )}
            {(visit?.status === "cot_hecha" || visit?.status === "cot_enviada") && (
              <Badge className="bg-green-600 text-white">✓ Cotización creada</Badge>
            )}
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Datos del cliente */}
            <div className="bg-card rounded-xl p-5 border border-primary/10">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
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

                {(visit as any)?.assignedToUser?.name && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>Medidor: <span className="text-primary font-medium">{(visit as any).assignedToUser.name}</span></span>
                  </div>
                )}
                {(visit as any)?.scheduledDate && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>Programada: {new Date((visit as any).scheduledDate).toLocaleDateString("es-CO", {
                      weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}</span>
                  </div>
                )}
                <div className="pt-2 text-xs text-gray-500 border-t border-white/5">
                  Creada: {visit ? new Date(visit.createdAt).toLocaleDateString("es-CO", {
                    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : ""}
                  {(visit as any)?.createdByUser?.name && ` · por ${(visit as any).createdByUser.name}`}
                </div>
              </div>
            </div>

            {/* GPS */}
            {geo && (
              <div className="bg-card rounded-xl p-5 border border-primary/20 md:col-span-2">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Ubicación GPS
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://maps.google.com/?q=${geo.lat},${geo.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Ver en Google Maps
                  </a>
                  <span className="text-gray-400 text-sm font-mono">{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Medidas */}
            <div className="bg-card rounded-xl p-5 border border-primary/10">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                <Ruler className="h-4 w-4" /> Medidas registradas
              </h2>
              {activeWorkTypes.length > 0 ? (
                <div className="space-y-4">
                  {activeWorkTypes.map(wt => {
                    const wtLabel = WORK_TYPE_LABELS_LOCAL[wt] ?? wt;
                    if (wt === "cocina") {
                      const forma = (measurements as any)._cocina_forma;
                      const ancho = (measurements as any)._cocina_ancho;
                      const alto  = (measurements as any)._cocina_alto;
                      const prof  = (measurements as any)._cocina_profundo;
                      return (
                        <div key={wt}>
                          <p className="text-xs font-bold text-primary mb-2">{wtLabel}</p>
                          <div className="space-y-1 text-sm">
                            {forma && <div className="flex justify-between"><span className="text-gray-400">Forma</span><span className="text-white font-medium">{forma}</span></div>}
                            {ancho && <div className="flex justify-between"><span className="text-gray-400">Ancho</span><span className="text-white font-medium">{ancho} cm</span></div>}
                            {alto  && <div className="flex justify-between"><span className="text-gray-400">Alto</span><span className="text-white font-medium">{alto} cm</span></div>}
                            {prof  && <div className="flex justify-between"><span className="text-gray-400">Profundo</span><span className="text-white font-medium">{prof} cm</span></div>}
                            {!forma && !ancho && !alto && !prof && <p className="text-gray-500 text-xs">Sin medidas</p>}
                          </div>
                        </div>
                      );
                    }
                    const unidades: Array<Record<string, any>> = (measurements as any)[`_${wt}_unidades`] ?? [{}];
                    return (
                      <div key={wt}>
                        <p className="text-xs font-bold text-primary mb-2">{wtLabel}</p>
                        <div className="space-y-2">
                          {unidades.map((unit: any, idx: number) => (
                            <div key={idx} className="bg-background rounded-lg px-3 py-2 text-sm space-y-1">
                              {unidades.length > 1 && <p className="text-primary/70 text-xs font-semibold">#{idx + 1}{unit.descripcion ? ` — ${unit.descripcion}` : ""}</p>}
                              {unidades.length === 1 && unit.descripcion && <p className="text-gray-400 text-xs">{unit.descripcion}</p>}
                              <div className="flex gap-4 flex-wrap">
                                {unit.ancho   && <span className="text-gray-300">Ancho: <span className="text-white font-medium">{unit.ancho} cm</span></span>}
                                {unit.alto    && <span className="text-gray-300">Alto: <span className="text-white font-medium">{unit.alto} cm</span></span>}
                                {unit.profundo && <span className="text-gray-300">Profundo: <span className="text-white font-medium">{unit.profundo} cm</span></span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sin medidas registradas</p>
              )}
            </div>

            {/* Evaluación técnica */}
            {(technicalEval || criticalObs) && (
              <div className="bg-card rounded-xl p-5 border border-primary/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Evaluación técnica
                </h2>
                {technicalEval && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Viabilidad del proyecto</p>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      technicalEval === "viable" ? "bg-green-500/20 text-green-400" :
                      technicalEval === "requiere_revision" ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {technicalEval === "viable" ? "✅ Viable" :
                       technicalEval === "requiere_revision" ? "⚠️ Requiere revisión" :
                       "🔴 Requiere visita adicional"}
                    </span>
                  </div>
                )}
                {criticalObs && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Observaciones críticas</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{criticalObs}</p>
                  </div>
                )}
              </div>
            )}

            {/* Checklist */}
            {Object.keys(checklist).length > 0 && (() => {
              const view = getChecklistView(checklist as Record<string, unknown>, CHECKLIST_LABELS);
              return (
                <div className="bg-card rounded-xl p-5 border border-primary/10">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Checklist del medidor
                  </h2>
                  {view.general.length > 0 && (
                    <div className="space-y-2">
                      {view.general.map(({ key, label, done }) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {done
                            ? <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            : <Square className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                          <span className={done ? "text-gray-300" : "text-gray-600 line-through"}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {view.electro.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-primary mb-2">Electrodomésticos que llevará la cocina</p>
                      <div className="flex flex-wrap gap-2">
                        {view.electro.map((l) => (
                          <span key={l} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {view.closet.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-primary mb-2">Accesorios del closet</p>
                      <div className="flex flex-wrap gap-2">
                        {view.closet.map((l) => (
                          <span key={l} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {view.nota && (
                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-300 mb-1">Nota especial del medidor</p>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{view.nota}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Notas */}
            {visit?.notes && (
              <div className="bg-card rounded-xl p-5 border border-primary/10">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas del técnico
                </h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{visit.notes}</p>
              </div>
            )}

            {/* Firma */}
            {(firmas.length > 0 || visit?.clientSignature) && (
              <div className="bg-card rounded-xl p-5 border border-primary/10">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                  <PenLine className="h-4 w-4" /> Firma del cliente
                </h2>
                {firmas.map(f => (
                  <div key={f.id} className="bg-white rounded-lg overflow-hidden">
                    <img src={f.url} alt="Firma" className="w-full h-24 object-contain p-2" />
                  </div>
                ))}
                {firmas.length === 0 && visit?.clientSignature && (
                  <div className="bg-white rounded-lg overflow-hidden">
                    <img src={visit.clientSignature} alt="Firma" className="w-full h-24 object-contain p-2" />
                  </div>
                )}
              </div>
            )}

            {/* Fotos */}
            {fotos.length > 0 && (
              <div className="bg-card rounded-xl p-5 border border-primary/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Fotos del espacio ({fotos.length})
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {fotos.map(photo => (
                    <div key={photo.id} className="relative aspect-square">
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxUrl(photo.url)}
                      />
                      {photo.category !== "foto" && (
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                          {PHOTO_CAT_LABELS[photo.category] ?? photo.category}
                        </span>
                      )}
                      <button
                        onClick={() => setLightboxUrl(photo.url)}
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
            {visiblePdfs.length > 0 && (
              <div className="bg-card rounded-xl p-5 border border-primary/10 md:col-span-2">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Planos GoodNotes ({visiblePdfs.length})
                </h2>
                <div className="space-y-2">
                  {visiblePdfs.map(pdf => (
                    <div key={pdf.id} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3">
                      <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{pdf.originalFileName ?? "Plano"}</p>
                      </div>
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary flex items-center gap-1 text-sm"
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
                  className="w-full bg-primary hover:bg-primary text-white h-12 text-base font-semibold"
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
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="bg-card border-b border-primary/20 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">Portal de Medidor</p>
              <h1 className="text-xl font-bold text-white">Levantamientos</h1>
            </div>
          </div>

          {/* Filtros — diseñador solo ve "Todas" (sus levantamientos ya tienen proyecto) */}
          {user?.role !== "disenador" && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {(["todas", "enviada", "cot_hecha", "cot_enviada"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    statusFilter === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-primary/20 text-gray-400 hover:border-primary/40"
                  }`}
                >
                  {s === "todas" ? "Todas" : s === "enviada" ? "Listas para cotizar" : s === "cot_hecha" ? "Cot. Hecha" : "Cot. Enviada"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (visits as unknown as Visit[]).filter(v => v.status !== "borrador").length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Ruler className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Sin visitas en esta categoría</p>
          </div>
        )}

        <div className="space-y-3">
          {(visits as unknown as Visit[]).filter(v => {
            if (statusFilter === "todas") return v.status !== "borrador";
            return v.status === statusFilter;
          }).map(visit => {
            const cfg = STATUS_CONFIG[visit.status];
            const photoCount = visit.photos?.length ?? 0;
            return (
              <button
                key={visit.id}
                onClick={() => {
                  if (!isManager) {
                    navigate(`/medidor?visitId=${visit.id}`);
                  } else {
                    setSelectedVisitId(visit.id);
                  }
                }}
                className="w-full bg-card border border-primary/10 rounded-xl p-5 text-left hover:border-primary/40 transition-colors"
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
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {(visit as any).assignedToUser ? (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> {(visit as any).assignedToUser.name}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Sin medidor asignado
                        </span>
                      )}
                      {(visit as any).scheduledDate && (
                        <span className="text-xs text-gray-400">
                          📅 {parseDBDate((visit as any).scheduledDate).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Bogota" })}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(visit.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {visit.status === "enviada" && (
                      <span className="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full">
                        Lista para cotizar
                      </span>
                    )}
                    {(() => {
                      // Con cotización o proyecto: solo super_admin, con pregunta de seguridad
                      const quoted = visit.status === "cot_hecha" || visit.status === "cot_enviada" || (visit as any).projectId != null;
                      return quoted ? isSuperAdmin : true;
                    })() && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const quoted = visit.status === "cot_hecha" || visit.status === "cot_enviada" || (visit as any).projectId != null;
                          if (quoted) {
                            setDeleteConfirmText("");
                            setQuotedToDelete({ id: visit.id, clientName: visit.clientName });
                            return;
                          }
                          if (!(await confirmAction("¿Eliminar este levantamiento? Esta acción no se puede deshacer."))) return;
                          try {
                            await deleteVisitMutation.mutateAsync({ id: visit.id });
                          } catch (err: any) {
                            // onError handles toast
                          }
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 ml-1"
                        title="Eliminar levantamiento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pregunta de seguridad: borrar levantamiento con cotización (solo super_admin) ── */}
      <Dialog open={!!quotedToDelete} onOpenChange={open => { if (!open) setQuotedToDelete(null); }}>
        <DialogContent className="bg-card border border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Eliminar levantamiento con cotización
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              El levantamiento de <span className="font-semibold text-white">{quotedToDelete?.clientName}</span> ya
              tiene cotización o proyecto. Si lo eliminas, <span className="text-red-300">deja de verse en el proyecto</span> (medidas,
              checklist, fotos y planos) para el diseñador y el taller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <label className="text-xs text-gray-400 block">
              Para confirmar escribe <span className="font-mono font-bold text-white">ELIMINAR</span>
            </label>
            <Input
              autoFocus
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="bg-background border-red-500/30 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuotedToDelete(null)} className="text-gray-400">
              Cancelar
            </Button>
            <Button
              disabled={deleteConfirmText.trim().toUpperCase() !== "ELIMINAR" || deleteVisitMutation.isPending}
              onClick={async () => {
                if (!quotedToDelete) return;
                try {
                  await deleteVisitMutation.mutateAsync({ id: quotedToDelete.id });
                  setQuotedToDelete(null);
                } catch {
                  // onError muestra el aviso
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteVisitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
