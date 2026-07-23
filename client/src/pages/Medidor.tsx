// client/src/pages/Medidor.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
  Eye,
  Upload,
  ClipboardList,
  MapPin,
  User,
  Phone,
  Ruler,
  Image as ImageIcon,
  File,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertTriangle,
  XCircle,
  CheckSquare,
  Square,
  FileCheck,
  Signature,
  Navigation,
  Calendar,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
type WorkType = "cocina" | "closet" | "puertas" | "centro_tv";
type VisitStatus = "borrador" | "enviada" | "convertida";
type TechnicalEvaluation = "viable" | "requiere_revision" | "requiere_visita";
type PhotoCategory = "general" | "ventana" | "punto_hidraulico" | "punto_gas" | "tomacorrientes" | "detalle_tecnico";

type Measurements = {
  anchoTotal?: number;
  altoCielo?: number;
  profundidad?: number;
  anchoVentana?: number;
  altoVentana?: number;
  altoVentanaPiso?: number;
  ancho?: number;
  alto?: number;
  anchoPaso?: number;
  altoPaso?: number;
  grosorPared?: number;
  anchoEspacio?: number;
  altoEspacio?: number;
  tamanoTV?: number;
};

type TechnicalChecklist = {
  puntoGas?: boolean;
  puntoHidraulico?: boolean;
  desague?: boolean;
  tomasElectricas?: boolean;
  ventanas?: boolean;
  columnas?: boolean;
  pisoNivelado?: boolean;
  techoNivelado?: boolean;
  murosTerminados?: boolean;
  pisoTerminado?: boolean;
  escuadraValidada?: boolean;
  grosorMuroValidado?: boolean;
  aperturaValidada?: boolean;
  puntoTV?: boolean;
  internet?: boolean;
  canalizaciones?: boolean;
};

type GeoLocation = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

type Visit = {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  visitCity?: string | null;
  workType: WorkType;
  status: VisitStatus;
  measurements?: Measurements;
  notes?: string;
  technicalEvaluation?: TechnicalEvaluation;
  criticalObservations?: string;
  checklist?: TechnicalChecklist;
  clientSignature?: string;
  geoLocation?: GeoLocation;
  photos?: Array<{
    id: string;
    url: string;
    fileName: string;
    category: PhotoCategory;
  }>;
  pdfs?: Array<{
    id: string;
    url: string;
    fileName: string;
    category: string;
  }>;
  createdAt: string;
  updatedAt?: string;
};

// ── Constantes ──────────────────────────────────────────────────────────────
const MEASUREMENT_FIELDS: Record<WorkType, Array<{ key: keyof Measurements; label: string; unit: string }>> = {
  cocina: [
    { key: "anchoTotal", label: "Ancho total", unit: "cm" },
    { key: "altoCielo", label: "Alto cielo", unit: "cm" },
    { key: "profundidad", label: "Profundidad", unit: "cm" },
    { key: "anchoVentana", label: "Ancho ventana", unit: "cm" },
    { key: "altoVentana", label: "Alto ventana", unit: "cm" },
    { key: "altoVentanaPiso", label: "Ventana al piso", unit: "cm" },
  ],
  closet: [
    { key: "ancho", label: "Ancho", unit: "cm" },
    { key: "alto", label: "Alto", unit: "cm" },
    { key: "profundidad", label: "Profundidad", unit: "cm" },
  ],
  puertas: [
    { key: "anchoPaso", label: "Ancho paso", unit: "cm" },
    { key: "altoPaso", label: "Alto paso", unit: "cm" },
    { key: "grosorPared", label: "Grosor pared", unit: "cm" },
  ],
  centro_tv: [
    { key: "anchoEspacio", label: "Ancho espacio", unit: "cm" },
    { key: "altoEspacio", label: "Alto espacio", unit: "cm" },
    { key: "tamanoTV", label: "Tamaño TV", unit: "pulg" },
  ],
};

const TECHNICAL_CHECKLIST: Record<WorkType, Array<{ key: keyof TechnicalChecklist; label: string }>> = {
  cocina: [
    { key: "puntoGas", label: "Punto de gas" },
    { key: "puntoHidraulico", label: "Punto hidráulico" },
    { key: "desague", label: "Desagüe" },
    { key: "tomasElectricas", label: "Tomas eléctricas" },
    { key: "ventanas", label: "Ventanas" },
    { key: "columnas", label: "Columnas" },
    { key: "pisoNivelado", label: "Piso nivelado" },
    { key: "techoNivelado", label: "Techo nivelado" },
  ],
  closet: [
    { key: "murosTerminados", label: "Muros terminados" },
    { key: "pisoTerminado", label: "Piso terminado" },
    { key: "tomasElectricas", label: "Tomas eléctricas" },
    { key: "ventanas", label: "Ventanas cercanas" },
  ],
  puertas: [
    { key: "escuadraValidada", label: "Escuadra validada" },
    { key: "grosorMuroValidado", label: "Grosor de muro validado" },
    { key: "aperturaValidada", label: "Apertura validada" },
  ],
  centro_tv: [
    { key: "tomasElectricas", label: "Tomas eléctricas" },
    { key: "puntoTV", label: "Punto TV" },
    { key: "internet", label: "Internet" },
    { key: "canalizaciones", label: "Canalizaciones" },
  ],
};

const PHOTO_CATEGORIES: Array<{ value: PhotoCategory; label: string }> = [
  { value: "general", label: "Foto general" },
  { value: "ventana", label: "Ventana" },
  { value: "punto_hidraulico", label: "Punto hidráulico" },
  { value: "punto_gas", label: "Punto gas" },
  { value: "tomacorrientes", label: "Tomacorrientes" },
  { value: "detalle_tecnico", label: "Detalle técnico" },
];

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  borrador: { label: "Borrador", color: "text-slate-400", bg: "bg-slate-500/20", icon: <Clock className="h-4 w-4" /> },
  enviada: { label: "Enviada", color: "text-blue-400", bg: "bg-blue-500/20", icon: <Send className="h-4 w-4" /> },
  convertida: { label: "Convertida", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const EVALUATION_CONFIG: Record<TechnicalEvaluation, { label: string; color: string; bg: string; icon: React.ReactNode; description: string }> = {
  viable: {
    label: "Proyecto viable",
    color: "text-emerald-400",
    bg: "bg-emerald-500/20 border-emerald-500/40",
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: "El proyecto puede proceder sin problemas técnicos",
  },
  requiere_revision: {
    label: "Requiere revisión técnica",
    color: "text-amber-400",
    bg: "bg-amber-500/20 border-amber-500/40",
    icon: <AlertTriangle className="h-5 w-5" />,
    description: "Se necesitan ajustes o validaciones adicionales",
  },
  requiere_visita: {
    label: "Requiere visita adicional",
    color: "text-red-400",
    bg: "bg-red-500/20 border-red-500/40",
    icon: <XCircle className="h-5 w-5" />,
    description: "Se necesita una segunda visita para completar el levantamiento",
  },
};

// ── Componente SignaturePad ──────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }: { onSave: (signature: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1DB5A8";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 200;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-[#1DB5A8]/40 rounded-lg overflow-hidden bg-white" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={clearSignature} variant="outline" className="flex-1 border-[#1DB5A8]/40 text-[#1DB5A8]">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
        <Button type="button" onClick={saveSignature} className="flex-1 bg-[#1DB5A8] hover:bg-[#17a396] text-white">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Guardar firma
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function Medidor() {
  const searchStr = useSearch();

  // Pre-fill desde cita agendada: /medidor?from=apt&id=X&name=...&phone=...&address=...&workType=...
  const prefill = useMemo(() => {
    const p = new URLSearchParams(searchStr);
    if (p.get("from") === "apt") {
      return {
        appointmentId: p.get("id") || "",
        name: p.get("name") || "",
        phone: p.get("phone") || "",
        address: p.get("address") || "",
        workType: (p.get("workType") || "") as WorkType | "",
      };
    }
    return null;
  }, [searchStr]);

  const [manualPrefill, setManualPrefill] = useState<{
    appointmentId: string;
    name: string;
    phone: string;
    address: string;
    workType: WorkType | "";
  } | null>(null);
  const effectivePrefill = manualPrefill || prefill;

  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [visitDetail, setVisitDetail] = useState<Visit | null>(null);
  const [showSignature, setShowSignature] = useState(false);

  // Auto-abrir formulario nuevo si viene desde cita (URL o clic en cita asignada)
  useEffect(() => {
    if (effectivePrefill) setView("new");
  }, [effectivePrefill]);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<PhotoCategory>("general");

  // Estados locales
  const [localMeasurements, setLocalMeasurements] = useState<Measurements>({});
  const [localNotes, setLocalNotes] = useState("");
  const [localEvaluation, setLocalEvaluation] = useState<TechnicalEvaluation | undefined>();
  const [localCriticalObservations, setLocalCriticalObservations] = useState("");
  const [localChecklist, setLocalChecklist] = useState<TechnicalChecklist>({});

  // Queries
  const { data: visits = [], refetch: refetchVisits } = trpc.technicalVisits.list.useQuery(undefined, {
    enabled: view === "list",
  });

  // Citas asignadas al medidor (filtradas por el servidor)
  const { data: assignedAppointments = [] } = trpc.appointments.list.useQuery(undefined, {
    enabled: view === "list",
  });
  const pendingAppointments = (assignedAppointments as any[]).filter(
    (a: any) => a.status === "pendiente" || a.status === "confirmada"
  );

  const { data: detailData, refetch: refetchDetail } = trpc.technicalVisits.getById.useQuery(
    { visitId: selectedVisit?.id || "" },
    {
      enabled: view === "detail" && !!selectedVisit,
    }
  );

  // Sincronizar detailData con visitDetail (onSuccess deprecado en tRPC v11)
  useEffect(() => {
    if (detailData) setVisitDetail(detailData as any);
  }, [detailData]);

  // Mutations
  const createVisit = trpc.technicalVisits.create.useMutation();
  const updateVisit = trpc.technicalVisits.update.useMutation();
  const addPhoto = trpc.technicalVisits.addPhoto.useMutation();
  const deletePhoto = trpc.technicalVisits.deletePhoto.useMutation();
  const compressPdf = trpc.technicalVisits.compressPdf.useMutation();
  const submitVisit = trpc.technicalVisits.submit.useMutation();
  const saveSignature = trpc.technicalVisits.saveSignature.useMutation();

  // Efecto para inicializar datos
  useEffect(() => {
    if (visitDetail) {
      setLocalMeasurements(visitDetail.measurements || {});
      setLocalNotes(visitDetail.notes || "");
      setLocalEvaluation(visitDetail.technicalEvaluation);
      setLocalCriticalObservations(visitDetail.criticalObservations || "");
      setLocalChecklist(visitDetail.checklist || {});
    }
  }, [visitDetail?.id]);

  // Capturar geolocalización
  const captureGeoLocation = async (): Promise<GeoLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // Handlers
  const handleCreateVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const formData = {
      clientName: form.get("clientName") as string,
      clientPhone: form.get("clientPhone") as string,
      clientAddress: form.get("clientAddress") as string,
      workType: form.get("workType") as WorkType,
    };

    try {
      const geo = await captureGeoLocation();
      const { id } = await createVisit.mutateAsync({ ...formData, geoLocation: geo ?? undefined });
      setSelectedVisit({ id, ...formData, status: "borrador", createdAt: new Date().toISOString(), geoLocation: geo ?? undefined });
      setLocalMeasurements({});
      setLocalNotes("");
      setLocalEvaluation(undefined);
      setLocalCriticalObservations("");
      setLocalChecklist({});
      setView("detail");
      toast.success("Visita creada");
    } catch (error) {
      toast.error("Error al crear visita");
    }
  };

  const handleSaveMeasurements = async () => {
    if (!visitDetail) return;
    try {
      await updateVisit.mutateAsync({
        visitId: visitDetail.id,
        measurements: localMeasurements,
        notes: localNotes,
        technicalEvaluation: localEvaluation,
        criticalObservations: localCriticalObservations,
        checklist: localChecklist,
      });
      toast.success("Medidas guardadas");
    } catch (error) {
      toast.error("Error al guardar medidas");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) {
      toast.error("No hay visita seleccionada");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await addPhoto.mutateAsync({
          visitId,
          fileName: file.name,
          fileData: base64,
          contentType: file.type,
          category: selectedPhotoCategory,
        });
        toast.success("Foto subida");
        refetchDetail();
        refetchVisits();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Error al subir foto");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhoto.mutateAsync({ photoId });
      toast.success("Foto eliminada");
      refetchDetail();
      refetchVisits();
    } catch (error) {
      toast.error("Error al eliminar foto");
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const visitId = visitDetail?.id ?? selectedVisit?.id;
    if (!visitId) {
      toast.error("No hay visita seleccionada");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await compressPdf.mutateAsync({
          visitId,
          fileName: file.name,
          fileData: base64,
          category: "pdf_plano",
        });
        toast.success(`PDF comprimido: ${result.savedPercent}% de reducción`);
        refetchVisits();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Error al subir PDF");
    }
  };

  const handleSaveSignature = async (signature: string) => {
    if (!visitDetail) return;
    try {
      await saveSignature.mutateAsync({ visitId: visitDetail.id, signature });
      toast.success("Firma guardada");
      setShowSignature(false);
    } catch (error) {
      toast.error("Error al guardar firma");
    }
  };

  const handleSubmitVisit = async () => {
    if (!visitDetail) return;
    try {
      await submitVisit.mutateAsync({ visitId: visitDetail.id });
      toast.success("Levantamiento técnico enviado al equipo");
      setView("list");
      setSelectedVisit(null);
      setVisitDetail(null);
    } catch (error) {
      toast.error("Error al enviar levantamiento");
    }
  };

  // Calcular completitud
  const calculateCompletion = (): number => {
    if (!visitDetail) return 0;
    let score = 0;
    let max = 0;

    if (visitDetail.measurements && Object.keys(visitDetail.measurements).length > 0) score += 20;
    max += 20;

    if (visitDetail.photos && visitDetail.photos.length > 0) score += 30;
    max += 30;

    if (visitDetail.pdfs && visitDetail.pdfs.length > 0) score += 20;
    max += 20;

    if (visitDetail.checklist && Object.keys(visitDetail.checklist).length > 0) score += 15;
    max += 15;

    if (visitDetail.clientSignature) score += 15;
    max += 15;

    return Math.round((score / max) * 100);
  };

  const visit = visitDetail ?? selectedVisit;
  const isEditable = visit?.status === "borrador";
  const completion = calculateCompletion();

  // ── Vistas ────────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="min-h-screen bg-[#0C1A1A] pb-24">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Levantamientos Técnicos</h1>
            <Button onClick={() => setView("new")} className="bg-[#1DB5A8] hover:bg-[#17a396] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>

          {/* Citas asignadas pendientes */}
          {pendingAppointments.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[#1DB5A8] uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Citas asignadas ({pendingAppointments.length})
              </h2>
              <div className="space-y-3">
                {pendingAppointments.map((apt: any) => {
                  const aptDate = apt.scheduledDate ? new Date(apt.scheduledDate) : null;
                  const wtLabels: Record<string, string> = {
                    cocina: "Cocina Integral", closet: "Closet",
                    puertas: "Puertas", centro_tv: "Centro de TV",
                  };
                  const workTypeText = apt.workTypes?.map((wt: string) => wtLabels[wt] || wt).join(", ") || "";
                  return (
                    <div key={apt.id} className="bg-teal-900/25 border border-[#1DB5A8]/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{apt.client?.name || "Cliente"}</h3>
                          {workTypeText && <p className="text-sm text-[#1DB5A8]">{workTypeText}</p>}
                          {apt.client?.address && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.client.address}</span>
                            </p>
                          )}
                          {apt.client?.whatsappPhone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {apt.client.whatsappPhone}
                            </p>
                          )}
                        </div>
                        {aptDate && (
                          <div className="ml-3 text-right flex-shrink-0">
                            <p className="text-xs text-slate-300 font-medium">
                              {aptDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-sm text-[#1DB5A8] font-semibold">
                              {aptDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          setManualPrefill({
                            appointmentId: String(apt.id),
                            name: apt.client?.name || "",
                            phone: apt.client?.whatsappPhone || "",
                            address: apt.client?.address || "",
                            workType: (apt.workTypes?.[0] || "") as WorkType | "",
                          });
                          setView("new");
                        }}
                        className="w-full h-9 bg-[#1DB5A8] hover:bg-[#17a396] text-white text-sm"
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Iniciar levantamiento
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visits.length > 0 && (
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Levantamientos
            </h2>
          )}

          <div className="space-y-3">
            {(visits as any[]).map((visit: Visit) => (
              <div
                key={visit.id}
                onClick={() => {
                  setSelectedVisit(visit);
                  setView("detail");
                }}
                className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 cursor-pointer hover:border-[#1DB5A8]/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">{visit.clientName}</h3>
                    <p className="text-sm text-[#1DB5A8]">{WORK_TYPE_LABELS[visit.workType]}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[visit.status].bg} ${STATUS_CONFIG[visit.status].color} flex items-center gap-1`}>
                    {STATUS_CONFIG[visit.status].icon}
                    {STATUS_CONFIG[visit.status].label}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(visit.createdAt).toLocaleDateString()}
                  </span>
                  {visit.geoLocation && (
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      GPS
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "new") {
    return (
      <div className="min-h-screen bg-[#0C1A1A] pb-24">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={() => { setView("list"); setManualPrefill(null); }} variant="outline" size="icon" className="border-[#1DB5A8]/40 text-[#1DB5A8]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Nueva Visita Técnica</h1>
          </div>

          {effectivePrefill && (
            <div className="bg-teal-900/30 border border-teal-500/40 rounded-lg p-3 mb-4 text-sm text-teal-300">
              Datos pre-llenados desde cita agendada #{effectivePrefill.appointmentId}
            </div>
          )}

          <form onSubmit={handleCreateVisit} className="space-y-4">
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1DB5A8] mb-2">Nombre del cliente *</label>
                <Input name="clientName" required defaultValue={effectivePrefill?.name || ""} className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1DB5A8] mb-2">Teléfono WhatsApp *</label>
                <Input name="clientPhone" required defaultValue={effectivePrefill?.phone || ""} className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1DB5A8] mb-2">Dirección *</label>
                <Input name="clientAddress" required defaultValue={effectivePrefill?.address || ""} className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1DB5A8] mb-2">Tipo de trabajo *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((type) => (
                    <label key={type} className="relative">
                      <input
                        type="radio"
                        name="workType"
                        value={type}
                        required
                        defaultChecked={effectivePrefill?.workType === type}
                        className="peer sr-only"
                      />
                      <div className="border border-[#1DB5A8]/20 rounded-lg p-3 cursor-pointer peer-checked:bg-[#1DB5A8]/20 peer-checked:border-[#1DB5A8] transition-colors">
                        <p className="text-sm font-medium text-white">{WORK_TYPE_LABELS[type]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 bg-[#1DB5A8] hover:bg-[#17a396] text-white font-semibold">
              <Plus className="h-5 w-5 mr-2" />
              Crear visita
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Vista: Detalle
  if (view === "detail" && visit) {
    return (
      <div className="min-h-screen bg-[#0C1A1A] pb-24">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={() => setView("list")} variant="outline" size="icon" className="border-[#1DB5A8]/40 text-[#1DB5A8]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{visit.clientName}</h1>
              <p className="text-sm text-[#1DB5A8]">{WORK_TYPE_LABELS[visit.workType]}</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[visit.status].bg} ${STATUS_CONFIG[visit.status].color}`}>
              {STATUS_CONFIG[visit.status].label}
            </div>
          </div>

          {/* Barra de completitud */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#1DB5A8]">Completitud del levantamiento</span>
                <span className="text-sm font-bold text-white">{completion}%</span>
              </div>
              <div className="w-full bg-[#0C1A1A] rounded-full h-2">
                <div className="bg-[#1DB5A8] h-2 rounded-full transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
          )}

          {/* Geolocalización */}
          {visit.geoLocation && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 flex items-center gap-3">
              <Navigation className="h-5 w-5 text-[#1DB5A8]" />
              <div>
                <p className="text-sm font-semibold text-white">Ubicación registrada</p>
                <p className="text-xs text-slate-400">
                  {visit.geoLocation.latitude.toFixed(6)}, {visit.geoLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(visit.geoLocation.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Datos del cliente */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-[#1DB5A8]" />
                Datos del cliente
              </h2>
              <Input
                value={visit.clientName}
                onChange={(e) => updateVisit.mutateAsync({ visitId: visit.id, clientName: e.target.value })}
                placeholder="Nombre"
                className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white"
              />
              <Input
                value={visit.clientPhone || ""}
                onChange={(e) => updateVisit.mutateAsync({ visitId: visit.id, clientPhone: e.target.value })}
                placeholder="Teléfono"
                className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white"
              />
              <Input
                value={visit.clientAddress || ""}
                onChange={(e) => updateVisit.mutateAsync({ visitId: visit.id, clientAddress: e.target.value })}
                placeholder="Dirección"
                className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white"
              />
            </div>
          )}

          {/* Medidas */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Ruler className="h-5 w-5 text-[#1DB5A8]" />
                Medidas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MEASUREMENT_FIELDS[visit.workType].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-[#1DB5A8] mb-1">{field.label}</label>
                    <Input
                      type="number"
                      value={localMeasurements[field.key] || ""}
                      onChange={(e) => setLocalMeasurements({ ...localMeasurements, [field.key]: parseFloat(e.target.value) })}
                      placeholder="0"
                      className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white h-10"
                    />
                    <span className="text-xs text-slate-400">{field.unit}</span>
                  </div>
                ))}
              </div>
              <Textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Notas adicionales..."
                className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white min-h-[100px]"
              />
              <Button onClick={handleSaveMeasurements} className="w-full bg-[#1DB5A8] hover:bg-[#17a396] text-white">
                <Save className="h-4 w-4 mr-2" />
                Guardar medidas
              </Button>
            </div>
          )}

          {/* Checklist técnico */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-[#1DB5A8]" />
                Checklist técnico
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {TECHNICAL_CHECKLIST[visit.workType].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 p-2 rounded hover:bg-[#0C1A1A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!localChecklist[item.key]}
                      onChange={(e) => setLocalChecklist({ ...localChecklist, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded border-[#1DB5A8]/40 text-[#1DB5A8] focus:ring-[#1DB5A8]"
                    />
                    <span className="text-sm text-white">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Evaluación técnica */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#1DB5A8]" />
                Evaluación técnica
              </h2>
              <div className="space-y-2">
                {(Object.keys(EVALUATION_CONFIG) as TechnicalEvaluation[]).map((evalType) => (
                  <label
                    key={evalType}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      localEvaluation === evalType ? EVALUATION_CONFIG[evalType].bg : "border-[#1DB5A8]/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation"
                      value={evalType}
                      checked={localEvaluation === evalType}
                      onChange={(e) => setLocalEvaluation(e.target.value as TechnicalEvaluation)}
                      className="mt-1 h-4 w-4 text-[#1DB5A8] focus:ring-[#1DB5A8]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {EVALUATION_CONFIG[evalType].icon}
                        <span className={`font-semibold ${EVALUATION_CONFIG[evalType].color}`}>
                          {EVALUATION_CONFIG[evalType].label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{EVALUATION_CONFIG[evalType].description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Textarea
                value={localCriticalObservations}
                onChange={(e) => setLocalCriticalObservations(e.target.value)}
                placeholder="Observaciones críticas (tuberías, columnas, redes eléctricas, etc.)..."
                className="bg-[#0C1A1A] border-[#1DB5A8]/20 text-white min-h-[80px]"
              />
            </div>
          )}

          {/* Fotos */}
          <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#1DB5A8]" />
              Fotos del espacio
            </h2>
            {isEditable && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1DB5A8]">Categoría de la foto</label>
                <select
                  value={selectedPhotoCategory}
                  onChange={(e) => setSelectedPhotoCategory(e.target.value as PhotoCategory)}
                  className="w-full bg-[#0C1A1A] border border-[#1DB5A8]/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {visit.photos?.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover rounded-lg cursor-pointer" onClick={() => window.open(photo.url, "_blank")} />
                  {isEditable && (
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isEditable && (
              <label className="relative block overflow-hidden rounded-lg border-2 border-dashed border-[#1DB5A8]/40 hover:border-[#1DB5A8] transition-colors cursor-pointer">
                <div className="flex flex-col items-center justify-center py-8">
                  <Camera className="h-8 w-8 text-[#1DB5A8] mb-2" />
                  <span className="text-sm text-[#1DB5A8] font-medium">Subir fotos</span>
                </div>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
            )}
          </div>

          {/* PDFs */}
          <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1DB5A8]" />
              Planos y documentos
            </h2>
            <div className="space-y-2">
              {visit.pdfs?.map((pdf) => (
                <div key={pdf.id} className="flex items-center justify-between bg-[#0C1A1A] rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-[#1DB5A8]" />
                    <span className="text-sm text-white truncate">{pdf.fileName}</span>
                  </div>
                  <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="text-[#1DB5A8] hover:underline text-sm">
                    Ver PDF
                  </a>
                </div>
              ))}
            </div>
            {isEditable && (
              <label className="relative block overflow-hidden rounded-lg border-2 border-dashed border-[#1DB5A8]/40 hover:border-[#1DB5A8] transition-colors cursor-pointer">
                <div className="flex flex-col items-center justify-center py-6">
                  <FileText className="h-8 w-8 text-[#1DB5A8] mb-2" />
                  <span className="text-sm text-[#1DB5A8] font-medium">Subir PDF (GoodNotes, planos, etc.)</span>
                </div>
                <input type="file" accept=".pdf" onChange={handlePdfUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
            )}
          </div>

          {/* Firma digital */}
          {isEditable && (
            <div className="bg-[#162828] border border-[#1DB5A8]/20 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Signature className="h-5 w-5 text-[#1DB5A8]" />
                Firma del cliente
              </h2>
              {visit.clientSignature ? (
                <div className="space-y-3">
                  <img src={visit.clientSignature} alt="Firma del cliente" className="w-full border border-[#1DB5A8]/20 rounded-lg bg-white" />
                  <p className="text-xs text-slate-400 text-center">El cliente confirmó la visita y las medidas tomadas</p>
                  <Button onClick={() => setShowSignature(true)} variant="outline" className="w-full border-[#1DB5A8]/40 text-[#1DB5A8]">
                    <Signature className="h-4 w-4 mr-2" />
                    Volver a firmar
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowSignature(true)} className="w-full bg-[#1DB5A8] hover:bg-[#17a396] text-white">
                  <Signature className="h-4 w-4 mr-2" />
                  Capturar firma del cliente
                </Button>
              )}
            </div>
          )}

          {/* Modal de firma */}
          {showSignature && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-[#162828] border border-[#1DB5A8]/40 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-white mb-4">Firma del cliente</h3>
                <p className="text-sm text-slate-400 mb-4">El técnico realizó la visita y tomó las medidas.</p>
                <SignaturePad onSave={handleSaveSignature} onCancel={() => setShowSignature(false)} />
              </div>
            </div>
          )}

          {/* Resumen antes de enviar */}
          {isEditable && showSummary && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-[#162828] border border-[#1DB5A8]/40 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Resumen del levantamiento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="text-white font-medium">{visit.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo de trabajo:</span>
                    <span className="text-white font-medium">{WORK_TYPE_LABELS[visit.workType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fotos:</span>
                    <span className="text-white font-medium">{visit.photos?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PDFs:</span>
                    <span className="text-white font-medium">{visit.pdfs?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Medidas:</span>
                    <span className="text-white font-medium">{Object.keys(localMeasurements).length} campos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Evaluación:</span>
                    <span className={`font-medium ${localEvaluation ? EVALUATION_CONFIG[localEvaluation].color : "text-slate-400"}`}>
                      {localEvaluation ? EVALUATION_CONFIG[localEvaluation].label : "No definida"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Firma:</span>
                    <span className="text-white font-medium">{visit.clientSignature ? "✓ Capturada" : "✗ Pendiente"}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => setShowSummary(false)} variant="outline" className="flex-1 border-[#1DB5A8]/40 text-[#1DB5A8]">
                    Volver
                  </Button>
                  <Button onClick={handleSubmitVisit} className="flex-1 bg-[#1DB5A8] hover:bg-[#17a396] text-white">
                    <Send className="h-4 w-4 mr-2" />
                    Finalizar levantamiento
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Banner de estado */}
          {visit.status === "enviada" && (
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-blue-400">Levantamiento enviado</p>
                <p className="text-xs text-blue-300">El equipo de diseño está revisando la información</p>
              </div>
            </div>
          )}

          {visit.status === "convertida" && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Proyecto aprobado</p>
                <p className="text-xs text-emerald-300">El levantamiento fue convertido en proyecto</p>
              </div>
            </div>
          )}

          {/* Botón de enviar */}
          {isEditable && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0C1A1A]/95 backdrop-blur border-t border-[#1DB5A8]/20">
              <div className="max-w-lg mx-auto flex gap-3">
                <Button onClick={() => setShowSummary(true)} className="flex-1 h-14 bg-[#1DB5A8] hover:bg-[#17a396] text-white font-semibold text-lg">
                  <Send className="h-5 w-5 mr-2" />
                  Finalizar levantamiento técnico
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}