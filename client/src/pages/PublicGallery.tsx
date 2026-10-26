import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WatermarkedImage, WatermarkedFullscreenImage } from "@/components/WatermarkedImage";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight,
  X,
  Download,
  Palette,
  Box,
  CheckCircle,
  MessageSquare,
  Loader2
} from "lucide-react";

const WORK_TYPES: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export default function PublicGallery() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectId = parseInt(params.get("project") || "0");
  const token = params.get("token") || "";
  const typeParam = params.get("type");
  const photoType = (typeParam === "modelado_3d" || typeParam === "renders") ? typeParam : undefined;

  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>(photoType || "all");
  
  // Estados para diálogos de aprobación/cambios
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [clientName, setClientName] = useState("");
  const [changesText, setChangesText] = useState("");
  const [actionCompleted, setActionCompleted] = useState<"approved" | "changes" | null>(null);

  const { data, isLoading, error } = trpc.publicGallery.getProjectPhotos.useQuery(
    { projectId, token, type: photoType },
    { enabled: projectId > 0 && !!token }
  );

  // Consultar estado de aprobación
  const { data: approvalStatus } = trpc.publicGallery.getApprovalStatus.useQuery(
    { projectId, token },
    { enabled: projectId > 0 && !!token }
  );

  // Determinar si ya está aprobado según el tipo
  const isAlreadyApproved = photoType === "renders" 
    ? approvalStatus?.rendersApproved 
    : approvalStatus?.modeladoApproved;
  
  const approvedBy = photoType === "renders"
    ? approvalStatus?.rendersApprovedBy
    : approvalStatus?.modeladoApprovedBy;
    
  const approvedAt = photoType === "renders"
    ? approvalStatus?.rendersApprovedAt
    : approvalStatus?.modeladoApprovedAt;

  const approveMutation = trpc.publicGallery.approveDesign.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setShowApproveDialog(false);
      setActionCompleted("approved");
      setClientName("");
      
      // Abrir WhatsApp automáticamente para notificar al equipo
      if (result.teamWhatsAppLink) {
        // Pequeño delay para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          window.open(result.teamWhatsAppLink, "_blank");
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la aprobación");
    },
  });

  const changesMutation = trpc.publicGallery.requestChanges.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setShowChangesDialog(false);
      setActionCompleted("changes");
      setClientName("");
      setChangesText("");
      
      // Abrir WhatsApp automáticamente para notificar al equipo
      if (result.teamWhatsAppLink) {
        // Pequeño delay para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          window.open(result.teamWhatsAppLink, "_blank");
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar la solicitud");
    },
  });

  if (projectId === 0 || !token) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-muted-foreground mb-2">Enlace inválido</h1>
          <p className="text-gray-500">El enlace que recibiste no es válido. Por favor contacta a INNOVAR Cocinas.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white/[0.02] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-muted-foreground mb-2">Enlace no disponible</h1>
          <p className="text-gray-500 mb-3">Este enlace ha expirado o el proyecto ya no está disponible.</p>
          <p className="text-gray-500 text-sm">Contacta a <strong>INNOVAR Cocinas de Diseño</strong> al <a href="https://wa.me/573136802025" className="text-teal-500 underline">313 680 2025</a> para más información.</p>
        </Card>
      </div>
    );
  }

  const { project, client, photos, totalModelado, totalRenders } = data;

  // ─────────────────────────────────────────────────────────────────
  // PORTAL COMPLETO — se activa cuando no hay ?type= en la URL
  // Un solo enlace permanente que muestra todo el proceso del proyecto
  // ─────────────────────────────────────────────────────────────────
  if (!photoType) {
    const modeladoPhotos = photos.filter(p => p.subcategory === "modelado_3d");
    const rendersPhotos  = photos.filter(p => p.subcategory === "renders");
    const cortePhotos    = photos.filter((p: any) => p.stage === "corte");
    const enchapePhotos  = photos.filter((p: any) => p.stage === "enchape");
    const ensamblePhotos = photos.filter((p: any) => p.stage === "ensamble");
    const finalPhotos    = photos.filter((p: any) => p.stage === "final");
    const hasAnyPhotos   = photos.length > 0;

    const portalSelectedIndex = selectedPhoto !== null
      ? photos.findIndex(p => p.id === selectedPhoto)
      : -1;
    const portalSelectedData = portalSelectedIndex >= 0 ? photos[portalSelectedIndex] : null;

    const projectStatusLabel: Record<string, string> = {
      en_diseno: "En Diseño",
      pendiente_modelado: "Revisión Modelado 3D",
      pendiente_render: "Revisión de Renders",
      aprobacion_final: "✅ Diseño Aprobado",
      en_produccion: "🏭 En Producción",
      corte: "🔧 Corte",
      enchape: "🔩 Enchape",
      ensamble: "🔨 Ensamble",
      instalacion: "🏠 En Instalación",
      entregado: "🎉 Entregado",
    };
    const statusLabel = (project as any).status
      ? projectStatusLabel[(project as any).status as string]
      : null;

    const PhotoRow = ({ rowPhotos, sublabel }: { rowPhotos: typeof photos; sublabel?: string }) => (
      <div className="mb-5 last:mb-0">
        {sublabel && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
             style={{ color: "rgba(0,188,212,0.75)" }}>{sublabel}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rowPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: "4/3", background: "#222" }}
              onClick={() => setSelectedPhoto(photo.id)}
            >
              <WatermarkedImage
                src={photo.photoUrl}
                alt={photo.description || `Foto ${idx + 1}`}
                className="w-full h-full"
                watermarkOpacity={0.28}
                watermarkSize={26}
                watermarkPosition="bottom-right"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

        {/* ── HEADER ── */}
        <header style={{ background: "#111111", borderBottom: "1px solid #1e1e1e" }}>
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <div className="rounded-xl p-2 flex-shrink-0" style={{ background: "#ffffff" }}>
              <img src="/logo-light.png" alt="INNOVAR" className="h-10 md:h-12 object-contain" style={{ maxWidth: "120px" }} />
            </div>
            <div>
              <p className="font-bold text-white text-base md:text-lg leading-tight">INNOVAR Cocinas de Diseño</p>
              <p className="text-xs mt-0.5" style={{ color: "#00BCD4" }}>
                📍 Km 9 vía Cerritos · Pereira, Colombia
              </p>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <div style={{ background: "linear-gradient(to bottom, rgba(0,188,212,0.13) 0%, #0a0a0a 100%)", borderBottom: "1px solid #1a1a1a" }}>
          <div className="max-w-3xl mx-auto px-4 py-10 text-center">
            {client?.name && (
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#00BCD4" }}>
                Proyecto de {client.name}
              </p>
            )}
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-4">
              {WORK_TYPES[project.workType as string] || project.workType}
            </h1>
            {statusLabel && (
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(0,188,212,0.15)", color: "#00BCD4", border: "1px solid rgba(0,188,212,0.3)" }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "#00BCD4" }} />
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* ── CONTENIDO ── */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">

          {/* Sin fotos aún */}
          {!hasAnyPhotos && (
            <div className="text-center py-16 rounded-2xl" style={{ background: "#141414", border: "1px solid #222" }}>
              <div className="text-5xl mb-4">🪵</div>
              <h3 className="text-white text-xl font-bold mb-2">Tu proyecto está en marcha</h3>
              <p className="text-sm" style={{ color: "#777" }}>
                Pronto verás aquí las fotos y avances de tu {WORK_TYPES[project.workType as string]?.toLowerCase() || "proyecto"}.
              </p>
            </div>
          )}

          {/* DISEÑO 3D */}
          {(modeladoPhotos.length > 0 || rendersPhotos.length > 0) && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xl">📐</span>
                <h2 className="text-white font-bold text-lg">Diseño 3D</h2>
                <div className="flex-1 h-px" style={{ background: "#252525" }} />
              </div>
              <div className="rounded-2xl p-4 md:p-5" style={{ background: "#141414", border: "1px solid #222" }}>
                {modeladoPhotos.length > 0 && (
                  <PhotoRow
                    rowPhotos={modeladoPhotos}
                    sublabel={rendersPhotos.length > 0 ? "Modelado 3D" : undefined}
                  />
                )}
                {rendersPhotos.length > 0 && (
                  <div className={modeladoPhotos.length > 0 ? "mt-5" : ""}>
                    <PhotoRow
                      rowPhotos={rendersPhotos}
                      sublabel={modeladoPhotos.length > 0 ? "Renders" : undefined}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* FABRICACIÓN */}
          {(cortePhotos.length > 0 || enchapePhotos.length > 0 || ensamblePhotos.length > 0) && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xl">🔧</span>
                <h2 className="text-white font-bold text-lg">Proceso de Fabricación</h2>
                <div className="flex-1 h-px" style={{ background: "#252525" }} />
              </div>
              <div className="rounded-2xl p-4 md:p-5" style={{ background: "#141414", border: "1px solid #222" }}>
                {cortePhotos.length > 0    && <PhotoRow rowPhotos={cortePhotos}    sublabel="Corte" />}
                {enchapePhotos.length > 0  && <PhotoRow rowPhotos={enchapePhotos}  sublabel="Enchape" />}
                {ensamblePhotos.length > 0 && <PhotoRow rowPhotos={ensamblePhotos} sublabel="Ensamble" />}
              </div>
            </section>
          )}

          {/* INSTALACIÓN Y ENTREGA */}
          {finalPhotos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xl">🏠</span>
                <h2 className="text-white font-bold text-lg">Instalación y Entrega</h2>
                <div className="flex-1 h-px" style={{ background: "#252525" }} />
              </div>
              <div className="rounded-2xl p-4 md:p-5" style={{ background: "#141414", border: "1px solid #222" }}>
                <PhotoRow rowPhotos={finalPhotos} />
              </div>
            </section>
          )}

          {/* CONTACTO */}
          <section
            className="rounded-2xl p-6 md:p-8 text-center"
            style={{ background: "#141414", border: "1px solid rgba(0,188,212,0.2)" }}
          >
            <p className="text-sm mb-1" style={{ color: "#666" }}>¿Tienes preguntas sobre tu proyecto?</p>
            <h3 className="text-white font-bold text-xl mb-6">Contáctanos por WhatsApp</h3>
            <a
              href="https://wa.link/y3mpkk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-7 py-4 rounded-2xl text-white font-bold text-lg transition-opacity hover:opacity-90"
              style={{ background: "#25D366" }}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              313 680 2025
            </a>
            <p className="text-xs mt-4" style={{ color: "#555" }}>
              También puedes escribirnos a{" "}
              <a href="mailto:innovarcocinasarte@gmail.com" style={{ color: "#00BCD4" }}>
                innovarcocinasarte@gmail.com
              </a>
            </p>
          </section>

        </main>

        {/* ── FOOTER ── */}
        <footer className="mt-4 py-8" style={{ background: "#111111", borderTop: "1px solid #1e1e1e" }}>
          <div className="max-w-3xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 flex-shrink-0" style={{ background: "#ffffff" }}>
                <img src="/logo-light.png" alt="INNOVAR" className="h-7 object-contain" style={{ maxWidth: "80px" }} />
              </div>
              <div>
                <p className="text-white text-sm font-bold">INNOVAR Cocinas de Diseño</p>
                <a
                  href="https://cocinasintegralespereira.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline"
                  style={{ color: "#00BCD4" }}
                >
                  cocinasintegralespereira.co
                </a>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs" style={{ color: "#555" }}>
                @cocinasintegralesenpereira &nbsp;·&nbsp; @innovadisenosmodernos
              </p>
              <p className="text-xs mt-1" style={{ color: "#444" }}>
                © {new Date().getFullYear()} INNOVAR. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* ── LIGHTBOX ── */}
        {portalSelectedData && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.96)" }}
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 z-10 p-2"
              style={{ color: "rgba(255,255,255,0.75)" }}
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-8 w-8" />
            </button>
            {portalSelectedIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full"
                style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}
                onClick={e => { e.stopPropagation(); setSelectedPhoto(photos[portalSelectedIndex - 1].id); }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}
            <div
              className="relative"
              style={{ maxWidth: "90vw", maxHeight: "85vh" }}
              onClick={e => e.stopPropagation()}
            >
              <WatermarkedFullscreenImage
                src={portalSelectedData.photoUrl}
                alt={portalSelectedData.description || "Foto del proyecto"}
                watermarkOpacity={0.28}
                watermarkSize={20}
                watermarkPosition="bottom-right"
              />
              <div
                className="absolute bottom-0 left-0 right-0 p-4"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
              >
                <div className="flex items-end justify-between">
                  <div>
                    {portalSelectedData.description && (
                      <p className="text-white text-sm mb-1">{portalSelectedData.description}</p>
                    )}
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {portalSelectedIndex + 1} / {photos.length}
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{ border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.08)" }}
                    onClick={() => window.open(portalSelectedData.photoUrl, "_blank")}
                  >
                    <Download className="h-4 w-4" />
                    Ver
                  </button>
                </div>
              </div>
            </div>
            {portalSelectedIndex < photos.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full"
                style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}
                onClick={e => { e.stopPropagation(); setSelectedPhoto(photos[portalSelectedIndex + 1].id); }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Filtrar fotos según la pestaña activa
  const filteredPhotos = activeTab === "all" 
    ? photos 
    : photos.filter(p => p.subcategory === activeTab);

  // Navegación del visor
  const currentPhotoIndex = selectedPhoto !== null 
    ? filteredPhotos.findIndex(p => p.id === selectedPhoto) 
    : -1;

  const goToPrevious = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex + 1].id);
    }
  };

  const selectedPhotoData = selectedPhoto !== null 
    ? filteredPhotos.find(p => p.id === selectedPhoto) 
    : null;

  const handleApprove = () => {
    if (!clientName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    approveMutation.mutate({
      projectId,
      token,
      clientName: clientName.trim(),
      type: photoType || "modelado_3d",
    });
  };

  const handleRequestChanges = () => {
    if (!clientName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (changesText.trim().length < 10) {
      toast.error("Por favor describe los cambios que necesitas (mínimo 10 caracteres)");
      return;
    }
    changesMutation.mutate({
      projectId,
      token,
      clientName: clientName.trim(),
      type: photoType || "modelado_3d",
      changes: changesText.trim(),
    });
  };

  const designType = photoType === "renders" ? "renders" : "modelado_3d";
  const designTypeLabel = photoType === "renders" ? "Renders" : "Modelado 3D";

  return (
    <div className="min-h-screen bg-white/[0.02] flex flex-col">
      {/* Header con logo prominente y branding INNOVAR */}
      <header className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center">
            {/* Logo grande y prominente */}
            <div className="bg-white rounded-2xl p-4 shadow-xl mb-3">
              <img 
                src="/logo-light.png" 
                alt="INNOVAR Cocinas Integrales" 
                className="h-16 md:h-20 object-contain"
              />
            </div>
            {/* Slogan */}
            <p className="text-white/90 text-sm md:text-base font-medium tracking-wide">
              Diseño y Fabricación de Cocinas Integrales
            </p>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Info del proyecto */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-teal-500/15 text-teal-300 hover:bg-teal-500/15">
            {WORK_TYPES[project.workType] || project.workType}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {project.name}
          </h1>
          {client && (
            <p className="text-muted-foreground">
              Diseño exclusivo para <span className="font-medium">{client.name}</span>
            </p>
          )}
        </div>

        {/* Mensaje de ya aprobado (desde la base de datos) */}
        {isAlreadyApproved && !actionCompleted && (
          <Card className="mb-6 p-6 bg-green-500/10 border-green-500/25">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="font-semibold text-green-300">¡{designTypeLabel} Aprobado!</h3>
                <p className="text-green-300 text-sm">
                  {approvedBy && `Aprobado por ${approvedBy}`}
                  {approvedAt && ` el ${new Date(approvedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
                <p className="text-green-400 text-sm mt-1">
                  {photoType === "modelado_3d" 
                    ? "Nuestro equipo está preparando los renders finales."
                    : "Tu proyecto está en producción. Pronto te contactaremos."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Mensaje de acción completada */}
        {actionCompleted && (
          <Card className={`mb-6 p-6 ${actionCompleted === "approved" ? "bg-green-500/10 border-green-500/25" : "bg-blue-500/10 border-blue-500/25"}`}>
            <div className="flex items-center gap-3">
              {actionCompleted === "approved" ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <div>
                    <h3 className="font-semibold text-green-300">¡Diseño Aprobado!</h3>
                    <p className="text-green-300 text-sm">
                      Gracias por aprobar el {designTypeLabel}. Nuestro equipo continuará con los siguientes pasos.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <MessageSquare className="h-8 w-8 text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-blue-300">Cambios Solicitados</h3>
                    <p className="text-blue-300 text-sm">
                      Hemos recibido tu solicitud. Nuestro equipo de diseño revisará los cambios y te contactará pronto.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Pestañas de filtro */}
        {!photoType && (totalModelado > 0 || totalRenders > 0) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Todas ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="modelado_3d" className="flex items-center gap-1" disabled={totalModelado === 0}>
                <Box className="h-4 w-4" />
                Modelado ({totalModelado})
              </TabsTrigger>
              <TabsTrigger value="renders" className="flex items-center gap-1" disabled={totalRenders === 0}>
                <Palette className="h-4 w-4" />
                Renders ({totalRenders})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Galería de fotos con marca de agua */}
        {filteredPhotos.length === 0 ? (
          <Card className="text-center p-12">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay imágenes disponibles en esta categoría</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <Card 
                key={photo.id} 
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <div className="relative aspect-[4/3] bg-white/[0.06]">
                  <WatermarkedImage
                    src={photo.photoUrl}
                    alt={photo.description || `Imagen ${index + 1}`}
                    className="w-full h-full"
                    watermarkOpacity={0.35}
                    watermarkSize={30}
                    watermarkPosition="bottom-right"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge 
                    className={`absolute top-2 left-2 ${
                      photo.subcategory === "modelado_3d" 
                        ? "bg-purple-500 hover:bg-purple-500" 
                        : "bg-green-500 hover:bg-green-500"
                    }`}
                  >
                    {photo.subcategory === "modelado_3d" ? "Modelado 3D" : "Render"}
                  </Badge>
                </div>
                {photo.description && (
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{photo.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sección de aprobación - Solo mostrar si hay fotos, no se ha completado una acción y no está ya aprobado */}
        {filteredPhotos.length > 0 && !actionCompleted && !isAlreadyApproved && (
          <Card className="mt-8 p-6 bg-gradient-to-r from-amber-950/30 to-orange-950/30 border-amber-500/25">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ¿Qué te parece el {designTypeLabel}?
              </h3>
              <p className="text-muted-foreground mb-6">
                Revisa las imágenes y dinos si estás conforme o si necesitas algún cambio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Aprobar {designTypeLabel}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-amber-500 text-amber-300 hover:bg-amber-500/15"
                  onClick={() => setShowChangesDialog(true)}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Solicitar Cambios
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Mensaje de contacto */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-gradient-to-r from-teal-950/30 to-emerald-950/30 border-teal-500/25">
            <p className="text-muted-foreground mb-2">
              ¿Tienes alguna pregunta?
            </p>
            <p className="text-teal-300 font-medium">
              Contáctanos por WhatsApp: <a href="https://wa.me/573136802025" className="underline">313 680 2025</a>
            </p>
          </Card>
        </div>
      </main>

      {/* Footer con branding INNOVAR */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo pequeño en footer */}
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-2">
                <img 
                  src="/logo-light.png" 
                  alt="INNOVAR" 
                  className="h-8 object-contain"
                />
              </div>
              <div>
                <p className="text-white font-semibold">INNOVAR</p>
                <p className="text-gray-400 text-xs">Cocinas Integrales</p>
              </div>
            </div>
            
            {/* Información de contacto */}
            <div className="text-center md:text-right">
              <p className="text-teal-400 font-medium">313 680 2025</p>
              <p className="text-gray-400 text-sm">K9 vía Cerritos a Pereira</p>
              <p className="text-gray-500 text-xs mt-1">
                © {new Date().getFullYear()} Todos los derechos reservados
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Diálogo de Aprobación */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Aprobar {designTypeLabel}
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar el {designTypeLabel.toLowerCase()} de tu proyecto? 
              {photoType === "modelado_3d" 
                ? " Una vez aprobado, continuaremos con los renders finales."
                : " Una vez aprobado, procederemos con la producción de tu proyecto."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Tu nombre completo</Label>
              <Input
                id="clientName"
                placeholder="Ej: María García"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveMutation.isPending || !clientName.trim()}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sí, Aprobar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Solicitar Cambios */}
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-400" />
              Solicitar Cambios
            </DialogTitle>
            <DialogDescription>
              Describe los cambios que necesitas en el {designTypeLabel.toLowerCase()}. 
              Nuestro equipo de diseño revisará tu solicitud y te contactará.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientNameChanges">Tu nombre completo</Label>
              <Input
                id="clientNameChanges"
                placeholder="Ej: María García"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changes">¿Qué cambios necesitas?</Label>
              <Textarea
                id="changes"
                placeholder="Describe los cambios que te gustaría ver en el diseño..."
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Mínimo 10 caracteres. Sé lo más específico posible.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChangesDialog(false)}
              disabled={changesMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleRequestChanges}
              disabled={changesMutation.isPending || !clientName.trim() || changesText.trim().length < 10}
            >
              {changesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de imagen a pantalla completa con marca de agua */}
      {selectedPhotoData && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Botón cerrar */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navegación anterior */}
          {currentPhotoIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Imagen con marca de agua */}
          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <WatermarkedFullscreenImage
              src={selectedPhotoData.photoUrl}
              alt={selectedPhotoData.description || "Imagen del proyecto"}
              watermarkOpacity={0.3}
              watermarkSize={20}
              watermarkPosition="bottom-right"
            />
            
            {/* Info de la imagen */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge 
                    className={`mb-2 ${
                      selectedPhotoData.subcategory === "modelado_3d" 
                        ? "bg-purple-500" 
                        : "bg-green-500"
                    }`}
                  >
                    {selectedPhotoData.subcategory === "modelado_3d" ? "Modelado 3D" : "Render Final"}
                  </Badge>
                  {selectedPhotoData.description && (
                    <p className="text-white/90 text-sm">{selectedPhotoData.description}</p>
                  )}
                  <p className="text-white/60 text-xs mt-1">
                    {currentPhotoIndex + 1} de {filteredPhotos.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/50 hover:bg-white/20"
                  onClick={() => window.open(selectedPhotoData.photoUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          </div>

          {/* Navegación siguiente */}
          {currentPhotoIndex < filteredPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
