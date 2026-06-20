/**
 * Portal del Técnico de Medidas — INNOVAR Cocinas Integrales
 * Diseño móvil-first para uso en campo con iPad/iPhone/Android.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera, FileText, Plus, Send, ChevronRight,
  Trash2, CheckCircle2, Clock, X, Ruler, Home, ArrowLeft,
  Loader2, FileUp, Maximize2, MapPin, PenLine, CheckSquare, Square,
  ClipboardList,
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
  borrador:   { label: "Borrador",   color: "bg-gray-100 text-gray-700",   icon: Clock },
  enviada:    { label: "Enviada",    color: "bg-blue-100 text-blue-700",    icon: Send },
  convertida: { label: "Convertida", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

// Campos de medidas por tipo de trabajo
const MEASUREMENT_FIELDS: Record<WorkType, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cocina: [
    { key: "anchoTotal",      label: "Ancho total del espacio",   unit: "cm", placeholder: "Ej: 340" },
    { key: "altoCielo",       label: "Alto del cielo raso",       unit: "cm", placeholder: "Ej: 250" },
    { key: "profundidad",     label: "Profundidad disponible",    unit: "cm", placeholder: "Ej: 65"  },
    { key: "anchoVentana",    label: "Ancho ventana (si aplica)", unit: "cm", placeholder: "Ej: 80"  },
    { key: "altoVentana",     label: "Alto ventana (si aplica)",  unit: "cm", placeholder: "Ej: 60"  },
    { key: "altoVentanaPiso", label: "Ventana desde el piso",     unit: "cm", placeholder: "Ej: 90"  },
  ],
  closet: [
    { key: "ancho",       label: "Ancho del nicho/espacio", unit: "cm", placeholder: "Ej: 200" },
    { key: "alto",        label: "Alto disponible",          unit: "cm", placeholder: "Ej: 240" },
    { key: "profundidad", label: "Profundidad",              unit: "cm", placeholder: "Ej: 60"  },
  ],
  puertas: [
    { key: "anchoPaso",   label: "Ancho del paso",      unit: "cm", placeholder: "Ej: 90"  },
    { key: "altoPaso",    label: "Alto del paso",        unit: "cm", placeholder: "Ej: 210" },
    { key: "grosorPared", label: "Grosor de la pared",   unit: "cm", placeholder: "Ej: 15"  },
  ],
  centro_tv: [
    { key: "anchoEspacio", label: "Ancho del espacio",  unit: "cm", placeholder: "Ej: 280" },
    { key: "altoEspacio",  label: "Alto disponible",    unit: "cm", placeholder: "Ej: 220" },
    { key: "tamanoTV",     label: "Tamaño del TV",      unit: '"',  placeholder: "Ej: 65"  },
  ],
};

// Checklist por tipo de trabajo
const CHECKLIST_ITEMS: Record<WorkType, { key: string; label: string }[]> = {
  cocina: [
    { key: "medidas_tomadas",    label: "Medidas del espacio tomadas" },
    { key: "foto_frontal",       label: "Foto frontal del espacio" },
    { key: "fotos_laterales",    label: "Fotos laterales / esquinas" },
    { key: "corriente_marcada",  label: "Tomas de corriente identificadas" },
    { key: "tuberias_marcadas",  label: "Tuberías / desagüe verificados" },
    { key: "ventana_verificada", label: "Ventana verificada (si aplica)" },
    { key: "plano_subido",       label: "Plano GoodNotes subido" },
    { key: "cliente_conforme",   label: "Cliente conforme con la visita" },
  ],
  closet: [
    { key: "medidas_tomadas",   label: "Medidas del nicho tomadas" },
    { key: "foto_frontal",      label: "Foto frontal del espacio" },
    { key: "foto_interior",     label: "Foto interior del nicho" },
    { key: "electrico_marcado", label: "Puntos eléctricos verificados" },
    { key: "plano_subido",      label: "Plano GoodNotes subido" },
    { key: "cliente_conforme",  label: "Cliente conforme con la visita" },
  ],
  puertas: [
    { key: "medidas_tomadas",  label: "Medidas del vano tomadas" },
    { key: "foto_frontal",     label: "Foto del vano tomada" },
    { key: "grosor_verificado", label: "Grosor de pared verificado" },
    { key: "apertura_definida", label: "Lado de apertura definido" },
    { key: "plano_subido",     label: "Plano GoodNotes subido" },
    { key: "cliente_conforme", label: "Cliente conforme con la visita" },
  ],
  centro_tv: [
    { key: "medidas_tomadas",   label: "Medidas del espacio tomadas" },
    { key: "foto_frontal",      label: "Foto frontal tomada" },
    { key: "tv_verificado",     label: "Tamaño del TV confirmado" },
    { key: "corriente_marcada", label: "Tomas de corriente identificadas" },
    { key: "plano_subido",      label: "Plano GoodNotes subido" },
    { key: "cliente_conforme",  label: "Cliente conforme con la visita" },
  ],
};

// ── Evaluación técnica del espacio ───────────────────────────────────────────

type EvalOption = { value: string; label: string };

type EvalField = {
  key: string;
  label: string;
  options: EvalOption[];
  hasNote?: boolean; // campo de texto adicional cuando aplica
};

const EVALUACION_FIELDS: EvalField[] = [
  {
    key: "tipoParedes",
    label: "Tipo de paredes",
    options: [
      { value: "bloque",   label: "Bloque / Ladrillo" },
      { value: "concreto", label: "Concreto / Vaciado" },
      { value: "drywall",  label: "Drywall" },
      { value: "mixto",    label: "Mixto" },
    ],
  },
  {
    key: "estadoParedes",
    label: "Estado de las paredes",
    options: [
      { value: "bueno",             label: "Bueno — listo para instalar" },
      { value: "requiere_repello",  label: "Requiere repello / nivelación" },
      { value: "requiere_demolicion", label: "Requiere demolición parcial" },
    ],
  },
  {
    key: "electricidad",
    label: "Instalación eléctrica",
    options: [
      { value: "adecuada",           label: "Adecuada — lista" },
      { value: "requiere_revision",  label: "Requiere revisión" },
      { value: "requiere_ampliacion", label: "Requiere ampliación" },
      { value: "sin_instalacion",    label: "Sin instalación existente" },
    ],
  },
  {
    key: "tomacorrientes",
    label: "Tomacorrientes en el área",
    options: [
      { value: "suficientes", label: "Suficientes y bien ubicados" },
      { value: "pocos",       label: "Pocos — se deben agregar" },
      { value: "ninguno",     label: "Ninguno en el área" },
    ],
  },
  {
    key: "nivoPiso",
    label: "Nivel del piso",
    options: [
      { value: "nivelado",           label: "Nivelado — sin problema" },
      { value: "desnivel_leve",      label: "Desnivel leve (< 2 cm)" },
      { value: "desnivel_importante", label: "Desnivel importante (> 2 cm)" },
    ],
  },
  {
    key: "acceso",
    label: "Acceso para instalación",
    options: [
      { value: "facil",     label: "Fácil — entrada directa" },
      { value: "escaleras", label: "Por escaleras" },
      { value: "ascensor",  label: "Edificio con ascensor" },
      { value: "dificil",   label: "Difícil — requiere planeación" },
    ],
  },
  {
    key: "demolicion",
    label: "Requiere demolición o adecuación previa",
    options: [
      { value: "no",           label: "No — espacio libre" },
      { value: "mueble_viejo", label: "Sí — retirar mueble existente" },
      { value: "obra_civil",   label: "Sí — obra civil previa" },
    ],
    hasNote: true,
  },
];

// Categorías de fotos
const PHOTO_CATEGORIES = [
  { value: "foto",          label: "📷 General" },
  { value: "foto_frontal",  label: "🏠 Frontal" },
  { value: "foto_lateral",  label: "↔️ Lateral" },
  { value: "foto_techo",    label: "⬆️ Techo" },
  { value: "foto_electrico", label: "⚡ Eléctrico" },
  { value: "foto_plomeria", label: "💧 Plomería" },
];

// ── Componente: Firma del cliente ─────────────────────────────────────────────

function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    e.preventDefault();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#162828] rounded-2xl p-4 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <PenLine className="h-4 w-4 text-[#1DB5A8]" /> Firma del cliente
        </h3>
        <p className="text-xs text-gray-400 mb-3">Pida al cliente que firme con el dedo o el lápiz</p>
        <div className="bg-white rounded-xl overflow-hidden border-2 border-[#1DB5A8]/40 mb-3">
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            className="w-full touch-none cursor-crosshair"
            style={{ height: "160px" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white h-10 text-sm">
            Cancelar
          </Button>
          <Button onClick={clear} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white h-10 text-sm">
            Borrar
          </Button>
          <Button
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas && hasDrawn) onSave(canvas.toDataURL("image/png"));
            }}
            disabled={!hasDrawn}
            className="flex-1 bg-[#1DB5A8] hover:bg-[#17a396] text-white h-10 text-sm disabled:opacity-40"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Barra de progreso ─────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  const color = percent < 40 ? "bg-red-500" : percent < 75 ? "bg-yellow-400" : "bg-[#1DB5A8]";
  return (
    <div className="bg-[#162828] rounded-xl px-4 py-3 border border-[#1DB5A8]/10">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">Completitud de la visita</span>
        <span className={`text-xs font-bold ${percent >= 75 ? "text-[#1DB5A8]" : percent >= 40 ? "text-yellow-400" : "text-red-400"}`}>
          {percent}%
        </span>
      </div>
      <div className="h-1.5 bg-[#0C1A1A] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Medidor() {
  const { user, logout } = useAuth();
  const [view, setView]               = useState<"list" | "new" | "detail">("list");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showPhotoCategories, setShowPhotoCategories] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState("foto");

  // Form nueva visita
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", clientAddress: "",
    workType: "cocina" as WorkType,
  });

  // Estado local del detalle
  const [localMeasurements, setLocalMeasurements] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes]               = useState("");
  const [localChecklist, setLocalChecklist]       = useState<Record<string, boolean>>({});
  const [localEval, setLocalEval]                 = useState<Record<string, string>>({});
  const [localGeo, setLocalGeo]                   = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading]               = useState(false);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [localClientData, setLocalClientData]     = useState<Partial<{ clientName: string; clientPhone: string; clientAddress: string; workType: WorkType }>>({});
  const [savingClientData, setSavingClientData]   = useState(false);

  // Refs para inputs de archivo — solución cross-browser (Chrome, Safari, Firefox)
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef   = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Queries & mutations
  const { data: visits = [], isLoading } = trpc.technicalVisits.list.useQuery(undefined, {
    enabled: view === "list",
    refetchOnWindowFocus: false,
  });

  const { data: visitDetail, refetch: refetchDetail } = trpc.technicalVisits.getById.useQuery(
    { visitId: selectedVisit?.id ?? 0 },
    { enabled: view === "detail" && !!selectedVisit, refetchOnWindowFocus: false }
  );

  const updateVisit = trpc.technicalVisits.update.useMutation();
  const addPhoto    = trpc.technicalVisits.addPhoto.useMutation();
  const deletePhoto = trpc.technicalVisits.deletePhoto.useMutation();
  const compressPdf = trpc.technicalVisits.compressPdf.useMutation();
  const submitVisit = trpc.technicalVisits.submit.useMutation();

  // ── Datos derivados ──────────────────────────────────────────────────────

  const visit      = visitDetail ?? selectedVisit;
  const isEditable = visit?.status === "borrador";

  // Soporte multi-tipo: si la visita tiene _workTypes en measurements, mostrar secciones por cada tipo
  const visitMeas   = (visit?.measurements as Record<string, any>) ?? {};
  const activeWorkTypes: WorkType[] = Array.isArray(visitMeas._workTypes) && visitMeas._workTypes.length > 1
    ? visitMeas._workTypes as WorkType[]
    : [visit?.workType ?? "cocina"];
  const isMultiType = activeWorkTypes.length > 1;

  // Para multi-tipo: claves prefijadas con "{tipo}_" para evitar colisiones
  const fields = isMultiType
    ? activeWorkTypes.flatMap(wt =>
        MEASUREMENT_FIELDS[wt].map(f => ({ ...f, key: `${wt}_${f.key}`, _wt: wt as WorkType }))
      )
    : MEASUREMENT_FIELDS[visit?.workType ?? "cocina"].map(f => ({ ...f, _wt: undefined as WorkType | undefined }));

  const checklistItems = isMultiType
    ? activeWorkTypes.flatMap(wt =>
        CHECKLIST_ITEMS[wt].map(item => ({ ...item, key: `${wt}_${item.key}`, _wt: wt as WorkType }))
      )
    : CHECKLIST_ITEMS[visit?.workType ?? "cocina"].map(item => ({ ...item, _wt: undefined as WorkType | undefined }));

  const photos  = (visitDetail?.photos ?? []) as Photo[];
  const fotos   = photos.filter(p => p.category.startsWith("foto") || p.category === "firma");
  const pdfs    = photos.filter(p => p.category === "pdf_plano" || p.category === "pdf_medidas");
  const firmas  = photos.filter(p => p.category === "firma");

  // ── Barra de progreso ────────────────────────────────────────────────────

  const completionPercent = useMemo(() => {
    if (!visit) return 0;
    const evalCompleted = EVALUACION_FIELDS.filter(f => !!localEval[f.key]).length;
    const checks = [
      !!visit.clientName,
      !!(visit.clientPhone || visit.clientAddress),
      fields.filter(f => !!localMeasurements[f.key]).length >= Math.ceil(fields.length / 2),
      fotos.length > 0,
      pdfs.length > 0,
      !!localNotes.trim(),
      checklistItems.filter(it => localChecklist[it.key]).length >= Math.ceil(checklistItems.length * 0.6),
      evalCompleted >= Math.ceil(EVALUACION_FIELDS.length * 0.7),
      firmas.length > 0,
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }, [visit, fields, localMeasurements, fotos, pdfs, localNotes, localChecklist, localEval, firmas, checklistItems]);

  // ── Inicializar estado al cargar detalle ──────────────────────────────────

  const initFromDetail = useCallback((v: typeof visitDetail) => {
    if (!v) return;
    const meas = (v.measurements as Record<string, any>) ?? {};
    const { _checklist, _geo, _evaluacion, _workTypes, ...numericMeasurements } = meas;
    setLocalMeasurements(numericMeasurements as Record<string, string>);
    setLocalChecklist((_checklist as Record<string, boolean>) ?? {});
    setLocalEval((_evaluacion as Record<string, string>) ?? {});
    if (_geo) setLocalGeo(_geo);
    setLocalNotes(v.notes ?? "");
    setLocalClientData({});
  }, []);

  useEffect(() => {
    if (visitDetail) initFromDetail(visitDetail);
  }, [visitDetail?.id]);

  // ── Geolocalización al abrir visita editable ──────────────────────────────

  useEffect(() => {
    if (view !== "detail" || !isEditable || localGeo) return;
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocalGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  }, [view, isEditable]);

  // ── Acciones ─────────────────────────────────────────────────────────────

  const handleSaveClientData = async () => {
    if (!visitDetail) return;
    setSavingClientData(true);
    try {
      await updateVisit.mutateAsync({
        visitId:       visitDetail.id,
        clientName:    localClientData.clientName    ?? visit?.clientName,
        clientPhone:   localClientData.clientPhone   ?? visit?.clientPhone ?? undefined,
        clientAddress: localClientData.clientAddress ?? visit?.clientAddress ?? undefined,
        workType:      (localClientData.workType     ?? visit?.workType) as WorkType,
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
        measurements: {
          ...localMeasurements,
          _checklist:  localChecklist,
          _evaluacion: localEval,
          ...(localGeo ? { _geo: localGeo } : {}),
        } as any,
        notes: localNotes,
      });
      toast.success("Guardado");
    } catch { toast.error("Error guardando"); }
    finally { setSavingMeasurements(false); }
  };

  // ── Upload helpers ────────────────────────────────────────────────────────

  const uploadPhotoFile = async (file: File, visitId: number, category = "foto") => {
    if (file.size > 12 * 1024 * 1024) { toast.error("Máximo 12MB por foto"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await addPhoto.mutateAsync({
          visitId,
          fileName:    file.name,
          fileData:    ev.target?.result as string,
          contentType: file.type,
          category:    category as any,
        });
        toast.success("Foto subida");
        refetchDetail();
      } catch (err: any) {
        toast.error(`Error foto: ${err?.message ?? "desconocido"}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadPdfFile = async (file: File, visitId: number) => {
    if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("El PDF supera el límite de 50MB"); return; }
    toast.info(`Comprimiendo PDF (${(file.size / 1048576).toFixed(1)}MB)...`);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const result = await compressPdf.mutateAsync({
          visitId,
          fileName: file.name,
          fileData: ev.target?.result as string,
          category: "pdf_plano",
        });
        toast.success(`PDF listo: ${result.originalKb}KB → ${result.compressedKb}KB (${result.savedPercent}% menos)`);
        refetchDetail();
      } catch (err: any) {
        toast.error(`Error PDF: ${err?.message ?? "desconocido"}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePickPhotos = () => {
    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) { toast.error("Visita no cargada"); return; }
    setShowPhotoCategories(true);
  };

  const confirmPickPhotos = (category: string) => {
    setSelectedPhotoCategory(category);
    setShowPhotoCategories(false);
    setTimeout(() => photoInputRef.current?.click(), 100);
  };

  const handlePickPdf = () => {
    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) { toast.error("Visita no cargada"); return; }
    pdfInputRef.current?.click();
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await deletePhoto.mutateAsync({ photoId });
      toast.success("Eliminado");
      refetchDetail();
    } catch { toast.error("Error eliminando"); }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    setShowSignature(false);
    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) return;
    // Convertir data URL a File
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `firma-${Date.now()}.png`, { type: "image/png" });
    await uploadPhotoFile(file, visitId, "firma");
    toast.success("Firma guardada");
  };

  const handleSubmit = async () => {
    if (!visitDetail) return;

    // ── Validación de campos obligatorios ────────────────────────────────────
    const errores: string[] = [];

    // 1. Teléfono del cliente
    if (!visit?.clientPhone?.trim()) {
      errores.push("📞 Teléfono del cliente — es obligatorio para poder contactarlo");
    }

    // 2. Al menos el 50% de medidas completadas
    const camposLlenos = fields.filter(f => !!localMeasurements[f.key]).length;
    const minMedidas   = Math.ceil(fields.length / 2);
    if (camposLlenos < minMedidas) {
      errores.push(`📐 Medidas — completa al menos ${minMedidas} de ${fields.length} campos (tienes ${camposLlenos})`);
    }

    // 3. Evaluación técnica — campos críticos
    const evalObligatorios: Record<string, string> = {
      tipoParedes:   "Tipo de paredes",
      estadoParedes: "Estado de las paredes",
      electricidad:  "Instalación eléctrica",
      demolicion:    "Requiere demolición / adecuación",
    };
    for (const [key, label] of Object.entries(evalObligatorios)) {
      if (!localEval[key]) {
        errores.push(`🔍 Evaluación técnica — "${label}" es obligatorio`);
      }
    }

    // 4. Al menos 1 foto
    const fotosReales = photos.filter(p => p.category !== "firma" && !p.category.startsWith("pdf"));
    if (fotosReales.length === 0) {
      errores.push("📸 Fotos — sube al menos 1 foto del espacio");
    }

    if (errores.length > 0) {
      toast.error("Completa los campos obligatorios antes de enviar:", {
        description: errores.join("\n"),
        duration: 8000,
      });
      return;
    }

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
        <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <h1 className="text-lg font-bold text-[#1DB5A8]">Mis Visitas Técnicas</h1>
              <p className="text-xs text-gray-400">{user?.name ?? "INNOVAR"}</p>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors border border-gray-600 hover:border-red-400 rounded-lg px-2 py-1.5"
            >
              <X className="h-3.5 w-3.5" /> Salir
            </button>
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
              <p className="text-lg font-medium">Sin visitas asignadas</p>
              <p className="text-sm mt-1">El admin o comercial te asignará visitas aquí</p>
            </div>
          )}

          {(visits as Visit[]).map((visit) => {
            const cfg = STATUS_CONFIG[visit.status];
            return (
              <button
                key={visit.id}
                onClick={() => { setSelectedVisit(visit); setView("detail"); }}
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
                      {(visit as any).scheduledDate
                        ? `📅 ${new Date((visit as any).scheduledDate).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : new Date(visit.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
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

  // ── Render: Detalle de visita ─────────────────────────────────────────────

  const visitId = visitDetail?.id ?? selectedVisit?.id;

  return (
    <div className="min-h-screen bg-[#0C1A1A] text-white pb-24">

      {/* Inputs de archivo — hidden, para compatibilidad Chrome/Safari/Firefox */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          const id = visitDetail?.id ?? selectedVisit?.id;
          if (!id) return;
          Array.from(e.target.files ?? []).forEach(f => uploadPhotoFile(f, id, selectedPhotoCategory));
          e.target.value = "";
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const id = visitDetail?.id ?? selectedVisit?.id;
          if (!id) return;
          const f = e.target.files?.[0];
          if (f) uploadPdfFile(f, id);
          e.target.value = "";
        }}
      />

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

      {/* Modal: seleccionar categoría de foto */}
      {showPhotoCategories && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-[#162828] rounded-2xl p-4 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-3 text-center">¿Qué tipo de foto?</h3>
            <div className="grid grid-cols-2 gap-2">
              {PHOTO_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => confirmPickPhotos(cat.value)}
                  className="p-3 rounded-xl border border-[#1DB5A8]/30 bg-[#0C1A1A] text-white text-sm hover:border-[#1DB5A8] hover:bg-[#1DB5A8]/10 transition-colors text-left"
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setShowPhotoCategories(false)}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white h-10 text-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Firma del cliente */}
      {showSignature && (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={() => setShowSignature(false)}
        />
      )}

      {/* Header */}
      <div className="bg-[#162828] border-b border-[#1DB5A8]/20 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => { setView("list"); utils.technicalVisits.list.invalidate(); }}
            className="text-gray-400 hover:text-white"
          >
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

        {/* ── Barra de progreso ── */}
        <ProgressBar percent={completionPercent} />

        {/* ── Geolocalización ── */}
        {isEditable && (
          <div className="flex items-center gap-2 bg-[#162828] rounded-xl px-4 py-2.5 border border-[#1DB5A8]/10">
            <MapPin className={`h-4 w-4 flex-shrink-0 ${localGeo ? "text-[#1DB5A8]" : "text-gray-500"}`} />
            {geoLoading ? (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Obteniendo ubicación...
              </span>
            ) : localGeo ? (
              <span className="text-xs text-[#1DB5A8]">
                Ubicación: {localGeo.lat.toFixed(5)}, {localGeo.lng.toFixed(5)}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Ubicación no disponible</span>
            )}
          </div>
        )}

        {/* ── Datos del cliente ── */}
        {isEditable && (
          <section>
            <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" /> Datos del cliente
            </h2>
            <div className="space-y-2">
              {[
                { key: "clientName",    label: "Nombre *",          type: "text", placeholder: "Nombre completo" },
                { key: "clientPhone",   label: "Teléfono",           type: "tel",  placeholder: "WhatsApp / celular" },
                { key: "clientAddress", label: "Dirección / Barrio", type: "text", placeholder: "Dirección o barrio" },
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

        {/* ── Medidas ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Medidas
          </h2>
          <div className="space-y-3">
            {fields.map((field, idx) => {
              const showTypeHeader = isMultiType && (idx === 0 || fields[idx - 1]?._wt !== field._wt);
              return (
                <div key={field.key}>
                  {showTypeHeader && field._wt && (
                    <p className="text-xs font-semibold text-[#1DB5A8]/70 uppercase tracking-widest mb-2 mt-1">
                      {WORK_TYPE_LABELS[field._wt]}
                    </p>
                  )}
                  <div className="flex items-center gap-3 bg-[#162828] rounded-xl px-4 py-3 border border-[#1DB5A8]/10">
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
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <Textarea
              disabled={!isEditable}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              placeholder="Notas: columnas, tuberías, tomas de corriente, observaciones del cliente..."
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

        {/* ── Checklist de verificación ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Checklist de verificación
          </h2>
          <div className="space-y-2">
            {checklistItems.map((item, idx) => {
              const checked = !!localChecklist[item.key];
              const showTypeHeader = isMultiType && (idx === 0 || checklistItems[idx - 1]?._wt !== item._wt);
              return (
                <div key={item.key}>
                  {showTypeHeader && item._wt && (
                    <p className="text-xs font-semibold text-[#1DB5A8]/70 uppercase tracking-widest mb-1 mt-2">
                      {WORK_TYPE_LABELS[item._wt]}
                    </p>
                  )}
                  <button
                    disabled={!isEditable}
                    onClick={() => setLocalChecklist(c => ({ ...c, [item.key]: !checked }))}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                      checked
                        ? "bg-[#1DB5A8]/10 border-[#1DB5A8]/40 text-white"
                        : "bg-[#162828] border-[#1DB5A8]/10 text-gray-400"
                    } disabled:opacity-70`}
                  >
                    {checked
                      ? <CheckCircle2 className="h-4 w-4 text-[#1DB5A8] flex-shrink-0" />
                      : <Square className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                    <span className="text-sm">{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {isEditable && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Toca cada ítem para marcarlo. Se guarda junto con las medidas.
            </p>
          )}
        </section>

        {/* ── Evaluación técnica del espacio ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-1 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Evaluación técnica del espacio
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Esta información la usarán el diseñador y el jefe de taller para planear la instalación.
          </p>
          <div className="space-y-4">
            {EVALUACION_FIELDS.map(field => (
              <div key={field.key}>
                <p className="text-xs font-medium text-gray-300 mb-2">{field.label}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {field.options.map(opt => {
                    const selected = localEval[field.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!isEditable}
                        onClick={() => setLocalEval(e => ({ ...e, [field.key]: opt.value }))}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-60 ${
                          selected
                            ? "border-[#1DB5A8] bg-[#1DB5A8]/10 text-white"
                            : "border-[#1DB5A8]/15 bg-[#162828] text-gray-400 hover:border-[#1DB5A8]/40"
                        }`}
                      >
                        <span className={`inline-block w-3 h-3 rounded-full border mr-2 flex-shrink-0 align-middle ${
                          selected ? "bg-[#1DB5A8] border-[#1DB5A8]" : "border-gray-500"
                        }`} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {/* Nota adicional si el campo lo requiere y hay valor seleccionado */}
                {field.hasNote && localEval[field.key] && localEval[field.key] !== "no" && (
                  <input
                    type="text"
                    disabled={!isEditable}
                    placeholder="Describe qué requiere..."
                    value={localEval[`${field.key}_nota`] ?? ""}
                    onChange={e => setLocalEval(ev => ({ ...ev, [`${field.key}_nota`]: e.target.value }))}
                    className="mt-2 w-full bg-[#162828] border border-[#1DB5A8]/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#1DB5A8] disabled:opacity-60"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Fotos ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Fotos del espacio
          </h2>

          {fotos.filter(p => p.category !== "firma").length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {fotos.filter(p => p.category !== "firma").map(photo => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.photoUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setLightboxUrl(photo.photoUrl)}
                  />
                  {/* Etiqueta de categoría */}
                  {photo.category !== "foto" && (
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
                      {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label.split(" ")[1] ?? photo.category}
                    </span>
                  )}
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

          {isEditable && (
            <Button
              type="button"
              onClick={handlePickPhotos}
              disabled={addPhoto.isPending}
              className="w-full h-11 bg-[#162828] hover:bg-[#1c3535] border border-[#1DB5A8]/40 text-[#1DB5A8] text-sm font-medium"
            >
              {addPhoto.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Subiendo...</>
                : <><Camera className="h-4 w-4 mr-2" /> {fotos.filter(p => p.category !== "firma").length > 0 ? "Agregar más fotos" : "Tomar / subir fotos"}</>}
            </Button>
          )}
        </section>

        {/* ── PDFs de GoodNotes ── */}
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
                      className="text-xs text-[#1DB5A8] underline">Ver PDF</a>
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
            <Button
              type="button"
              onClick={handlePickPdf}
              disabled={compressPdf.isPending}
              className="w-full h-11 bg-[#162828] hover:bg-[#1c3535] border border-[#1DB5A8]/40 text-[#1DB5A8] text-sm font-medium"
            >
              {compressPdf.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Comprimiendo...</>
                : <><FileUp className="h-4 w-4 mr-2" /> Subir PDF de GoodNotes</>}
            </Button>
          )}
        </section>

        {/* ── Firma del cliente ── */}
        <section>
          <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
            <PenLine className="h-4 w-4" /> Firma del cliente
          </h2>

          {firmas.length > 0 ? (
            <div className="space-y-2">
              {firmas.map(f => (
                <div key={f.id} className="relative bg-white rounded-xl overflow-hidden border border-[#1DB5A8]/30">
                  <img src={f.photoUrl} alt="Firma" className="w-full h-24 object-contain p-2" />
                  {isEditable && (
                    <button
                      onClick={() => handleDeletePhoto(f.id)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : isEditable ? (
            <Button
              type="button"
              onClick={() => setShowSignature(true)}
              className="w-full h-11 bg-[#162828] hover:bg-[#1c3535] border border-[#1DB5A8]/40 text-[#1DB5A8] text-sm font-medium"
            >
              <PenLine className="h-4 w-4 mr-2" /> Capturar firma del cliente
            </Button>
          ) : (
            <p className="text-sm text-gray-500 italic">Sin firma registrada</p>
          )}
        </section>

        {/* ── Botón de envío ── */}
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
