/**
 * Portal del Técnico de Medidas — INNOVAR Cocinas Integrales
 * Diseño móvil-first para uso en campo con iPad/iPhone.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera, FileText, Plus, Send, ChevronRight, ChevronLeft,
  Trash2, CheckCircle2, Clock, X, Ruler, Home, ArrowLeft,
  Loader2, FileUp, Maximize2,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type WorkType = "cocina" | "closet" | "puertas" | "centro_tv";
type VisitStatus = "borrador" | "enviada" | "convertida";

type Visit = {
  id: number;
  clientName: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  workType: WorkType;
  status: VisitStatus;
  createdAt: string;
  measurements?: Record<string, unknown> | null;
  notes?: string | null;
  photos?: Photo[];
};

type Photo = {
  id: number;
  photoUrl: string;
  category: string;
  description?: string | null;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  cocina:    "🍳 Cocina",
  closet:    "🪞 Closet",
  puertas:   "🚪 Puertas",
  centro_tv: "📺 Centro TV",
};

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; icon: typeof Clock }> = {
  borrador:   { label: "Borrador",   color: "bg-gray-100 text-gray-700",    icon: Clock },
  enviada:    { label: "Enviada",    color: "bg-blue-100 text-blue-700",     icon: Send },
  convertida: { label: "Convertida", color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
};

// Campos de medidas por tipo de trabajo
const MEASUREMENT_FIELDS: Record<WorkType, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cocina: [
    { key: "anchoTotal",    label: "Ancho total del espacio",   unit: "cm", placeholder: "Ej: 340" },
    { key: "altoCielo",     label: "Alto del cielo raso",       unit: "cm", placeholder: "Ej: 250" },
    { key: "profundidad",   label: "Profundidad disponible",    unit: "cm", placeholder: "Ej: 65" },
    { key: "anchoVentana",  label: "Ancho ventana (si aplica)", unit: "cm", placeholder: "Ej: 80" },
    { key: "altoVentana",   label: "Alto ventana (si aplica)",  unit: "cm", placeholder: "Ej: 60" },
    { key: "altoVentanaPiso", label: "Ventana desde el piso",  unit: "cm", placeholder: "Ej: 90" },
  ],
  closet: [
    { key: "ancho",         label: "Ancho del nicho/espacio",   unit: "cm", placeholder: "Ej: 200" },
    { key: "alto",          label: "Alto disponible",           unit: "cm", placeholder: "Ej: 240" },
    { key: "profundidad",   label: "Profundidad",               unit: "cm", placeholder: "Ej: 60" },
  ],
  puertas: [
    { key: "anchoPaso",     label: "Ancho del paso",            unit: "cm", placeholder: "Ej: 90" },
    { key: "altoPaso",      label: "Alto del paso",             unit: "cm", placeholder: "Ej: 210" },
    { key: "grosorPared",   label: "Grosor de la pared",        unit: "cm", placeholder: "Ej: 15" },
  ],
  centro_tv: [
    { key: "anchoEspacio",  label: "Ancho del espacio",         unit: "cm", placeholder: "Ej: 280" },
    { key: "altoEspacio",   label: "Alto disponible",           unit: "cm", placeholder: "Ej: 220" },
    { key: "tamanoTV",      label: "Tamaño del TV",             unit: '"',  placeholder: "Ej: 65" },
  ],
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function Medidor() {
  const { user } = useAuth();
  const [view, setView]           = useState<"list" | "new" | "detail">("list");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Form nueva visita
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", clientAddress: "",
    workType: "cocina" as WorkType,
  });

  const utils = trpc.useUtils();

  // Queries & mutations
  const { data: visits = [], isLoading } = trpc.technicalVisits.list.useQuery(undefined, {
    enabled: view === "list",
    refetchOnWindowFocus: false,
  });

  const { data: visitDetail, refetch: refetchDetail, isLoading: isLoadingDetail } = trpc.technicalVisits.getById.useQuery(
    { visitId: selectedVisit?.id ?? 0 },
    { enabled: view === "detail" && !!selectedVisit, refetchOnWindowFocus: false }
  );

  const createVisit    = trpc.technicalVisits.create.useMutation();
  const updateVisit    = trpc.technicalVisits.update.useMutation();
  const addPhoto       = trpc.technicalVisits.addPhoto.useMutation();
  const deletePhoto    = trpc.technicalVisits.deletePhoto.useMutation();
  const compressPdf    = trpc.technicalVisits.compressPdf.useMutation();
  const submitVisit    = trpc.technicalVisits.submit.useMutation();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef   = useRef<HTMLInputElement>(null);

  // ── Medidas locales (se guardan al cambiar) ──────────────────────────────
  const [localMeasurements, setLocalMeasurements] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes]               = useState("");
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [localClientData, setLocalClientData]     = useState<Partial<{ clientName: string; clientPhone: string; clientAddress: string; workType: WorkType }>>({});
  const [savingClientData, setSavingClientData]   = useState(false);

  // ── Acciones ─────────────────────────────────────────────────────────────

  const handleCreateVisit = async () => {
    if (!form.clientName.trim()) { toast.error("El nombre del cliente es requerido"); return; }
    try {
      const { id } = await createVisit.mutateAsync(form);
      toast.success("Visita creada");
      utils.technicalVisits.list.invalidate();
      setSelectedVisit({ id, ...form, status: "borrador", createdAt: new Date().toISOString() });
      setLocalMeasurements({});
      setLocalNotes("");
      setView("detail");
    } catch { toast.error("Error al crear la visita"); }
  };

  const handleSaveClientData = async () => {
    if (!visitDetail) return;
    if (!localClientData.clientName && !(visit as any)?.clientName) { toast.error("El nombre es requerido"); return; }
    setSavingClientData(true);
    try {
      await updateVisit.mutateAsync({
        visitId:       visitDetail.id,
        clientName:    localClientData.clientName   ?? (visit as any)?.clientName,
        clientPhone:   localClientData.clientPhone  ?? (visit as any)?.clientPhone,
        clientAddress: localClientData.clientAddress ?? (visit as any)?.clientAddress,
        workType:      (localClientData.workType     ?? (visit as any)?.workType) as WorkType,
      });
      toast.success("Datos del cliente guardados");
      refetchDetail();
    } catch { toast.error("Error guardando datos"); }
    finally { setSavingClientData(false); }
  };

  const handleSaveMeasurements = async () => {
    if (!visitDetail) return;
    setSavingMeasurements(true);
    try {
      await updateVisit.mutateAsync({
        visitId:      visitDetail.id,
        measurements: localMeasurements as any,
        notes:        localNotes,
      });
      toast.success("Medidas guardadas");
    } catch { toast.error("Error guardando medidas"); }
    finally { setSavingMeasurements(false); }
  };

  // Inicializar medidas locales cuando carga el detalle (useEffect, nunca durante render)
  const initMeasurements = useCallback((v: typeof visitDetail) => {
    if (!v) return;
    setLocalMeasurements((v.measurements as Record<string, string>) ?? {});
    setLocalNotes(v.notes ?? "");
    setLocalClientData({});
  }, []);

  useEffect(() => {
    if (visitDetail) initMeasurements(visitDetail);
  }, [visitDetail?.id]);

  // Subir foto desde cámara o galería
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) { toast.error("Visita no cargada aún, espera un momento"); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error("Máximo 12MB por archivo"); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fileData = ev.target?.result as string;
      try {
        await addPhoto.mutateAsync({
          visitId,
          fileName:    file.name,
          fileData,
          contentType: file.type,
          category:    "foto",
        });
        toast.success("Foto subida");
        refetchDetail();
      } catch { toast.error("Error subiendo foto"); }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Subir y comprimir PDF de GoodNotes
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) { toast.error("Visita no cargada aún, espera un momento"); return; }
    if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("El PDF supera el límite de 50MB"); return; }

    const originalMb = (file.size / (1024 * 1024)).toFixed(1);
    toast.info(`Comprimiendo PDF (${originalMb}MB)...`);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fileData = ev.target?.result as string;
      try {
        const result = await compressPdf.mutateAsync({
          visitId,
          fileName: file.name,
          fileData,
          category: "pdf_plano",
        });
        toast.success(
          `PDF comprimido: ${result.originalKb}KB → ${result.compressedKb}KB (${result.savedPercent}% menos)`
        );
        refetchDetail();
      } catch { toast.error("Error procesando PDF"); }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await deletePhoto.mutateAsync({ photoId });
      toast.success("Archivo eliminado");
      refetchDetail();
    } catch { toast.error("Error eliminando archivo"); }
  };

  const handleSubmit = async () => {
    if (!visitDetail) return;
    if (!confirm("¿Enviar esta visita al equipo para cotizar?")) return;
    try {
      await submitVisit.mutateAsync({ visitId: visitDetail.id });
      toast.success("¡Visita enviada! El equipo recibirá la notificación.");
      utils.technicalVisits.list.invalidate();
      refetchDetail();
    } catch { toast.error("Error enviando visita"); }
  };

  // ── Render: Lista de visitas ──────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="min-h-screen bg-[#0C1A1A] text-white">
        {/* Header */}
        <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <h1 className="text-lg font-bold text-[#1DB5A8]">Visitas Técnicas</h1>
              <p className="text-xs text-gray-400">INNOVAR Cocinas Integrales</p>
            </div>
            <Button
              onClick={() => { setForm({ clientName: "", clientPhone: "", clientAddress: "", workType: "cocina" }); setView("new"); }}
              className="bg-[#1DB5A8] hover:bg-[#17a396] text-white text-sm px-3 py-2 h-auto"
            >
              <Plus className="h-4 w-4 mr-1" /> Nueva visita
            </Button>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1DB5A8]" />
            </div>
          )}

          {!isLoading && visits.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Ruler className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Sin visitas aún</p>
              <p className="text-sm mt-1">Crea tu primera visita técnica</p>
            </div>
          )}

          {(visits as Visit[]).map((visit) => {
            const cfg = STATUS_CONFIG[visit.status];
            return (
              <button
                key={visit.id}
                onClick={() => {
                  setSelectedVisit(visit);
                  setView("detail");
                }}
                className="w-full bg-[#162828] border border-[#1DB5A8]/10 rounded-xl p-4 text-left hover:border-[#1DB5A8]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{visit.clientName}</p>
                    <p className="text-sm text-gray-400 truncate mt-0.5">
                      {WORK_TYPE_LABELS[visit.workType]}
                      {visit.clientAddress && ` · ${visit.clientAddress}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(visit.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render: Nueva visita ──────────────────────────────────────────────────

  if (view === "new") {
    return (
      <div className="min-h-screen bg-[#0C1A1A] text-white">
        <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <button onClick={() => setView("list")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">Nueva Visita Técnica</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Tipo de trabajo */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Tipo de trabajo *</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, workType: key }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                    form.workType === key
                      ? "border-[#1DB5A8] bg-[#1DB5A8]/10 text-[#1DB5A8]"
                      : "border-[#1DB5A8]/20 bg-[#162828] text-gray-300 hover:border-[#1DB5A8]/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 block">Datos del cliente</label>
            <Input
              placeholder="Nombre completo *"
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              className="bg-[#162828] border-[#1DB5A8]/20 text-white placeholder:text-gray-500 focus:border-[#1DB5A8] h-12"
            />
            <Input
              placeholder="Teléfono / WhatsApp"
              value={form.clientPhone}
              onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
              className="bg-[#162828] border-[#1DB5A8]/20 text-white placeholder:text-gray-500 focus:border-[#1DB5A8] h-12"
              type="tel"
            />
            <Input
              placeholder="Dirección / Barrio"
              value={form.clientAddress}
              onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))}
              className="bg-[#162828] border-[#1DB5A8]/20 text-white placeholder:text-gray-500 focus:border-[#1DB5A8] h-12"
            />
          </div>

          <Button
            onClick={handleCreateVisit}
            disabled={createVisit.isPending || !form.clientName.trim()}
            className="w-full bg-[#1DB5A8] hover:bg-[#17a396] text-white h-12 text-base font-semibold"
          >
            {createVisit.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
            Crear visita y agregar medidas
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Detalle de visita ─────────────────────────────────────────────

  const visit = visitDetail ?? selectedVisit;
  const isEditable = visit?.status === "borrador";
  const measurements = (visitDetail?.measurements as Record<string, string>) ?? {};
  const fields = MEASUREMENT_FIELDS[visit?.workType ?? "cocina"];

  const photos = (visitDetail?.photos ?? []) as Photo[];
  const fotos   = photos.filter(p => p.category === "foto");
  const pdfs    = photos.filter(p => p.category === "pdf_plano" || p.category === "pdf_medidas");

  return (
    <div className="min-h-screen bg-[#0C1A1A] text-white pb-24">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxUrl(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}

      {/* Header */}
      <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => { setView("list"); utils.technicalVisits.list.invalidate(); }} className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{visit?.clientName}</h1>
            <p className="text-xs text-gray-400">{visit ? WORK_TYPE_LABELS[visit.workType] : ""}</p>
          </div>
          {visit?.status && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_CONFIG[visit.status as VisitStatus].color}`}>
              {STATUS_CONFIG[visit.status as VisitStatus].label}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">

        {/* ── Sección: Datos del cliente (editable en borrador) ── */}
        {isEditable && (
          <section>
            <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" /> Datos del cliente
            </h2>
            <div className="space-y-2">
              {[
                { key: "clientName",    label: "Nombre *",            type: "text", placeholder: "Nombre completo" },
                { key: "clientPhone",   label: "Teléfono",             type: "tel",  placeholder: "WhatsApp / celular" },
                { key: "clientAddress", label: "Dirección / Barrio",   type: "text", placeholder: "Dirección o barrio" },
              ].map(f => (
                <div key={f.key} className="bg-[#162828] rounded-xl px-4 py-2 border border-[#1DB5A8]/10">
                  <label className="text-xs text-gray-400">{f.label}</label>
                  <Input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(localClientData as any)[f.key] ?? (visit as any)?.[f.key] ?? ""}
                    onChange={e => setLocalClientData(d => ({ ...d, [f.key]: e.target.value }))}
                    className="bg-transparent border-0 text-white placeholder:text-gray-600 p-0 h-7 focus-visible:ring-0 text-sm"
                  />
                </div>
              ))}
              {/* Tipo de trabajo */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLocalClientData(d => ({ ...d, workType: key }))}
                    className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                      (localClientData.workType ?? visit?.workType) === key
                        ? "border-[#1DB5A8] bg-[#1DB5A8]/10 text-[#1DB5A8]"
                        : "border-[#1DB5A8]/20 bg-[#162828] text-gray-300"
                    }`}
                  >{label}</button>
                ))}
              </div>
              <Button
                onClick={handleSaveClientData}
                disabled={savingClientData}
                className="w-full mt-1 bg-[#162828] hover:bg-[#1c3535] border border-[#1DB5A8]/40 text-[#1DB5A8] h-9 text-sm"
              >
                {savingClientData ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Guardar datos cliente
              </Button>
            </div>
          </section>
        )}

        {/* ── Sección: Medidas ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Medidas
          </h2>
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key} className="flex items-center gap-3 bg-[#162828] rounded-xl px-4 py-3 border border-[#1DB5A8]/10">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-400">{field.label}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      disabled={!isEditable}
                      value={localMeasurements[field.key] ?? ""}
                      onChange={e => setLocalMeasurements(m => ({ ...m, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="flex-1 bg-transparent text-white text-base font-medium outline-none placeholder:text-gray-600 disabled:opacity-60"
                    />
                    <span className="text-gray-500 text-sm flex-shrink-0">{field.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notas de la visita */}
          <div className="mt-3">
            <Textarea
              disabled={!isEditable}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              placeholder="Notas adicionales: columnas, tuberías, tomas de corriente, observaciones del cliente..."
              className="bg-[#162828] border-[#1DB5A8]/20 text-white placeholder:text-gray-500 focus:border-[#1DB5A8] resize-none h-28 disabled:opacity-60"
            />
          </div>

          {isEditable && (
            <Button
              onClick={handleSaveMeasurements}
              disabled={savingMeasurements}
              className="w-full mt-3 bg-[#162828] hover:bg-[#1c3535] border border-[#1DB5A8]/40 text-[#1DB5A8] h-11"
            >
              {savingMeasurements ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar medidas
            </Button>
          )}
        </section>

        {/* ── Sección: Fotos ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Fotos del espacio
          </h2>

          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {fotos.map(photo => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.photoUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setLightboxUrl(photo.photoUrl)}
                  />
                  {isEditable && (
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
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
          )}

          {/* Debug: mostrar estado temporalmente */}
          <p className="text-xs text-gray-500 mb-2">Estado: {visit?.status ?? "sin visita"} | editable: {isEditable ? "sí" : "no"}</p>

          {isEditable && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />
              <button
                type="button"
                disabled={addPhoto.isPending || isLoadingDetail}
                onClick={() => {
                  if (!photoInputRef.current) {
                    toast.error("DEBUG: ref es null — contactar soporte");
                    return;
                  }
                  toast.info("DEBUG: abriendo selector...");
                  photoInputRef.current.click();
                }}
                className="w-full h-11 rounded-md border border-[#1DB5A8]/40 bg-[#162828] flex items-center justify-center gap-2 text-[#1DB5A8] text-sm font-medium hover:bg-[#1c3535] transition-colors disabled:opacity-50"
              >
                {isLoadingDetail
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Cargando visita...</>
                  : addPhoto.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                    : <><Camera className="h-4 w-4" /> {fotos.length > 0 ? "Agregar más fotos" : "Tomar / subir fotos"}</>}
              </button>
            </>
          )}
        </section>

        {/* ── Sección: PDFs de GoodNotes ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-1 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Planos anotados (GoodNotes)
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Exporta tu nota de GoodNotes como PDF y súbela aquí. El sistema la comprimirá automáticamente.
          </p>

          {pdfs.length > 0 && (
            <div className="space-y-2 mb-3">
              {pdfs.map(pdf => (
                <div key={pdf.id} className="flex items-center gap-3 bg-[#162828] rounded-xl px-4 py-3 border border-[#1DB5A8]/10">
                  <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{pdf.description ?? "Plano"}</p>
                    <a href={pdf.photoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#1DB5A8] underline">
                      Ver PDF
                    </a>
                  </div>
                  {isEditable && (
                    <button onClick={() => handleDeletePhoto(pdf.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditable && (
            <>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />
              <button
                type="button"
                disabled={compressPdf.isPending || isLoadingDetail}
                onClick={() => pdfInputRef.current?.click()}
                className="w-full h-11 rounded-md border border-[#1DB5A8]/40 bg-[#162828] flex items-center justify-center gap-2 text-[#1DB5A8] text-sm font-medium hover:bg-[#1c3535] transition-colors disabled:opacity-50"
              >
                {isLoadingDetail
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Cargando visita...</>
                  : compressPdf.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Comprimiendo...</>
                    : <><FileUp className="h-4 w-4" /> Subir PDF de GoodNotes</>}
              </button>
            </>
          )}
        </section>

        {/* ── Botón: Enviar visita ── */}
        {isEditable && (
          <section className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitVisit.isPending}
              className="w-full bg-[#1DB5A8] hover:bg-[#17a396] text-white h-14 text-base font-bold rounded-xl"
            >
              {submitVisit.isPending
                ? <Loader2 className="h-5 w-5 animate-spin mr-2" />
                : <Send className="h-5 w-5 mr-2" />}
              Enviar al equipo para cotizar
            </Button>
            <p className="text-xs text-center text-gray-500 mt-2">
              El admin y el comercial recibirán notificación inmediata
            </p>
          </section>
        )}

        {visit?.status === "enviada" && (
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
            <Send className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-300 font-medium text-sm">Visita enviada al equipo</p>
            <p className="text-blue-400/70 text-xs mt-1">El equipo la revisará y generará la cotización</p>
          </div>
        )}

        {visit?.status === "convertida" && (
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-green-300 font-medium text-sm">¡Cotización generada!</p>
            <p className="text-green-400/70 text-xs mt-1">Esta visita ya fue convertida en cotización</p>
          </div>
        )}
      </div>
    </div>
  );
}
