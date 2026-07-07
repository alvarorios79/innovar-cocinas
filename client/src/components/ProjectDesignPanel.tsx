import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle2, AlertCircle, Palette, Box, ImageIcon,
  MessageCircle, MessageSquare, MapPin, FileText, Clock,
  Upload, ZoomIn, Trash2, ArrowRight, RefreshCw, Lock,
  Unlock, XCircle, Camera, Plus,
} from "lucide-react";
import { useFileViewer, FileViewer } from "@/components/FileViewer";
import { PhotoUploader } from "@/components/PhotoUploader";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ── Etiquetas estáticas ───────────────────────────────────────────────────────
const categoryLabels: Record<string, string> = {
  cotizacion: "Cotización", medidas: "Medidas", disenos: "Diseños",
  avance: "Avance", instalacion: "Instalación", entrega: "Entrega",
};
const subcategoryLabels: Record<string, string> = {
  documento_cotizacion: "Documento", fotos_iniciales: "Fotos Iniciales",
  dibujo: "Dibujo", renders: "Renders", despieces: "Despieces",
  detalles: "Detalles", modelado_3d: "Modelado 3D",
  corte: "Corte", enchape: "Enchape", armado: "Armado",
  proceso_instalacion: "Proceso", fotos_finales: "Fotos Finales",
};
const photoToNextStatus: Record<string, string> = {
  despiece: "corte", corte: "enchape", enchape: "ensamble",
  armado: "listo_instalacion", proceso_instalacion: "entregado", fotos_finales: "entregado",
};
const subcategoryToSectionKey: Record<string, "corte"|"enchape"|"armado"|"instalacion"|"entrega"> = {
  corte: "corte", enchape: "enchape", armado: "armado",
  proceso_instalacion: "instalacion", fotos_finales: "entrega",
  fotos_iniciales: "corte", renders: "corte", despieces: "corte",
  detalles: "corte", modelado_3d: "corte", dibujo: "corte",
};
const previousStageMap: Record<string, string> = {
  corte: "despieces", enchape: "corte", armado: "enchape",
  proceso_instalacion: "armado", fotos_finales: "proceso_instalacion",
};

// ── Componente principal ──────────────────────────────────────────────────────
export function ProjectDesignPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const fileViewer = useFileViewer();

  // Estado
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoForm, setPhotoForm] = useState({
    category: "disenos" as "cotizacion"|"medidas"|"disenos"|"avance"|"instalacion"|"entrega",
    subcategory: "" as string,
    description: "",
  });
  const [photoToDelete, setPhotoToDelete] = useState<{ id: number; description?: string } | null>(null);
  const [advanceConfirmDialog, setAdvanceConfirmDialog] = useState<{
    open: boolean; subcategory: string; nextStatus: string; hasPhotos: boolean;
  }>({ open: false, subcategory: "", nextStatus: "", hasPhotos: false });
  const [approvalUnlocked, setApprovalUnlocked] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailForm, setDetailForm] = useState({
    type: "nota_importante" as "medida_especial"|"nota_importante"|"foto_referencia",
    title: "", content: "", photoUrl: "",
  });

  // Consultas
  const { data: projectDetail, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId, staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true }
  );
  const clientId = (projectDetail as any)?.clientId;
  const projectStatus = (projectDetail as any)?.status ?? "";
  const DESIGNER_STATUSES = [
    "adelanto_recibido","en_diseno","pendiente_modelado","pendiente_render",
    "aprobacion_final","despiece","corte","enchape","ensamble","listo_instalacion","entregado",
  ];
  const canSeeVisitData =
    ["admin","super_admin","comercial"].includes(user?.role ?? "") ||
    (user?.role === "disenador" && DESIGNER_STATUSES.includes(projectStatus));
  const { data: clientVisits } = trpc.technicalVisits.listByClientId.useQuery(
    { clientId: clientId ?? 0 },
    { enabled: !!clientId && canSeeVisitData }
  );

  // Mutaciones
  const invalidate = () => utils.projects.getById.invalidate({ id: projectId });

  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => { invalidate(); toast.success("Archivo subido"); setShowPhotoDialog(false); setPhotoForm({ category: "disenos", subcategory: "", description: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const deletePhoto = trpc.projectPhotos.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Foto eliminada"); setPhotoToDelete(null); },
    onError: (e) => toast.error(e.message),
  });
  const approveDesign = trpc.projects.approveDesign.useMutation({
    onSuccess: () => { invalidate(); toast.success("Diseño procesado"); },
  });
  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => { invalidate(); toast.success("Proyecto avanzado"); },
    onError: (e) => toast.error(e.message),
  });
  const sendModeladoToClient = trpc.publicGallery.sendModeladoToClient.useMutation({
    onSuccess: (data) => { invalidate(); toast.success(data.message); },
    onError: (e) => toast.error(e.message),
  });
  const sendRendersToClient = trpc.publicGallery.sendRendersToClient.useMutation({
    onSuccess: (data) => { invalidate(); toast.success(data.message); },
    onError: (e) => toast.error(e.message),
  });
  const createDetail = trpc.projectDetails.create.useMutation({
    onSuccess: () => { invalidate(); toast.success("Detalle agregado"); setShowDetailDialog(false); setDetailForm({ type: "nota_importante", title: "", content: "", photoUrl: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const sendSectionNotification = trpc.projects.sendSectionNotification.useMutation({
    onSuccess: (data) => { invalidate(); toast.success(data.message || "Notificación enviada"); },
    onError: (e) => toast.error(e.message),
  });

  // Funciones helper
  const canUploadToFolder = (folder: string) => {
    const role = user?.role;
    const perms: Record<string, string[]> = {
      documento_cotizacion: ["super_admin","admin"],
      fotos_iniciales: ["super_admin","admin"],
      dibujo: ["super_admin","admin"],
      renders: ["disenador"],
      despieces: ["disenador"],
      detalles: ["disenador"],
      modelado_3d: ["disenador"],
    };
    return (perms[folder] || []).includes(role || "");
  };

  const hasPreviousStagePhotos = (subcategory: string): boolean => {
    const prev = previousStageMap[subcategory];
    if (!prev) return true;
    return (projectDetail?.photos || []).some((p: any) => p.subcategory === prev);
  };

  const canUploadToStage = (subcategory: string): { allowed: boolean; message?: string } => {
    if (user?.role === "super_admin" || user?.role === "admin") return { allowed: true };
    if (!hasPreviousStagePhotos(subcategory)) {
      const prev = previousStageMap[subcategory];
      return { allowed: false, message: `Debe completar ${subcategoryLabels[prev] || prev} primero` };
    }
    return { allowed: true };
  };

  const canShowAdvanceButton = (subcategory: string) => {
    const role = user?.role;
    if (!["super_admin","admin","jefe_taller","operario"].includes(role || "")) return false;
    return !!photoToNextStatus[subcategory];
  };

  const canSendSectionNotification = () =>
    user?.role === "super_admin" || user?.role === "admin";

  const handleSendSectionNotification = (subcategory: string) => {
    const sectionKey = subcategoryToSectionKey[subcategory] || "corte";
    sendSectionNotification.mutate({ projectId, sectionKey });
  };

  const openAdvanceConfirmDialog = (subcategory: string) => {
    const nextStatus = photoToNextStatus[subcategory];
    const hasPhotos = (projectDetail?.photos || []).some((p: any) => p.subcategory === subcategory);
    setAdvanceConfirmDialog({ open: true, subcategory, nextStatus: nextStatus || "", hasPhotos });
  };

  const handleAdvanceFromPhoto = () => {
    const { nextStatus } = advanceConfirmDialog;
    if (!nextStatus || !projectDetail?.id) return;
    updateStatus.mutate({ projectId: projectDetail.id, newStatus: nextStatus as any });
    setAdvanceConfirmDialog({ open: false, subcategory: "", nextStatus: "", hasPhotos: false });
  };

  // Carpetas filtradas por rol para diseño
  const getDesignFolders = () => {
    const role = user?.role;
    const allFolders: Record<string, string[]> = {
      cotizacion: ["documento_cotizacion"],
      medidas: ["fotos_iniciales", "dibujo"],
      disenos: ["modelado_3d", "renders", "detalles", "despieces"],
    };
    if (role === "super_admin" || role === "admin") return allFolders;
    const viewPerms: Record<string, string[]> = {
      documento_cotizacion: ["super_admin","admin","comercial"],
      fotos_iniciales: ["super_admin","admin","comercial","disenador"],
      dibujo: ["super_admin","admin","comercial","disenador"],
      renders: ["super_admin","admin","comercial","disenador","jefe_taller","operario"],
      despieces: ["super_admin","admin","comercial","disenador","jefe_taller","operario"],
      detalles: ["super_admin","admin","comercial","disenador","jefe_taller","operario"],
      modelado_3d: ["super_admin","admin","comercial","disenador","jefe_taller","operario"],
    };
    const filtered: Record<string, string[]> = {};
    Object.entries(allFolders).forEach(([cat, subs]) => {
      const allowed = subs.filter(s => viewPerms[s]?.includes(role || ""));
      if (allowed.length > 0) filtered[cat] = allowed;
    });
    return filtered;
  };
  const designFolders = getDesignFolders();

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }
  if (!projectDetail) {
    return <p className="text-sm text-muted-foreground p-4">Proyecto no encontrado.</p>;
  }

  return (
    <div className="space-y-4 pb-6">

      {/* ── Centro de Control de Diseño ─────────────────────────────────── */}
      {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "comercial") && (
        <div className="mb-4 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Centro de Control de Diseño
            </h3>
            <p className="text-teal-100 text-sm mt-1">Gestiona el envío y aprobación de diseños del cliente</p>
          </div>
          <div className="bg-[#162828] dark:bg-gray-900 p-6">
            {/* Tarjetas Modelado 3D y Renders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Modelado 3D */}
              <div className={`relative rounded-xl p-5 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-200 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'}`}>
                    <Box className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Modelado 3D</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0
                        ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length} imagen(es) listas`
                        : 'Sin imágenes aún'}
                    </p>
                    {projectDetail.modeladoApprovedAt && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprobado por {projectDetail.modeladoApprovedBy}
                      </div>
                    )}
                  </div>
                </div>
                {projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d").length > 0 && (
                  <Button
                    size="sm"
                    className={`w-full mt-4 shadow-sm ${(projectDetail.modeladoRevisionNumber || 0) >= 1 ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                    onClick={() => sendModeladoToClient.mutate({ projectId: projectDetail.id })}
                    disabled={sendModeladoToClient.isPending}
                  >
                    <MessageCircle className={`h-4 w-4 mr-2 ${sendModeladoToClient.isPending ? 'animate-spin' : ''}`} />
                    {sendModeladoToClient.isPending ? 'Enviando...' : (projectDetail.modeladoRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.modeladoRevisionNumber || 0) + 1})` : 'Enviar Modelado'}
                  </Button>
                )}
              </div>

              {/* Renders */}
              <div className={`relative rounded-xl p-5 transition-all duration-300 ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-2 border-emerald-200 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'}`}>
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Renders Finales</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0
                        ? `${projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length} imagen(es) listas`
                        : 'Sin imágenes aún'}
                    </p>
                    {projectDetail.rendersApprovedAt && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprobado por {projectDetail.rendersApprovedBy}
                      </div>
                    )}
                  </div>
                </div>
                {projectDetail.photos?.filter((p: any) => p.subcategory === "renders").length > 0 && (
                  <Button
                    size="sm"
                    className={`w-full mt-4 shadow-sm ${(projectDetail.renderRevisionNumber || 0) >= 1 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                    onClick={() => sendRendersToClient.mutate({ projectId: projectDetail.id })}
                    disabled={sendRendersToClient.isPending}
                  >
                    <MessageCircle className={`h-4 w-4 mr-2 ${sendRendersToClient.isPending ? 'animate-spin' : ''}`} />
                    {sendRendersToClient.isPending ? 'Enviando...' : (projectDetail.renderRevisionNumber || 0) >= 1 ? `Reenviar (Rev. ${(projectDetail.renderRevisionNumber || 0) + 1})` : 'Enviar Renders'}
                  </Button>
                )}
              </div>
            </div>

            {/* Sección de Aprobación */}
            {(() => {
              const isInDesignPhase = ["en_diseno","pendiente_modelado","pendiente_render"].includes(projectDetail.status as string);
              const isPendingApproval = ["pendiente_modelado","pendiente_render"].includes(projectDetail.status as string);
              const isApproved = projectDetail.rendersApprovedAt || projectDetail.modeladoApprovedAt;
              const hasDesignContent = (projectDetail.photos?.filter((p: any) => p.subcategory === "modelado_3d" || p.subcategory === "renders").length || 0) > 0;
              let statusMessage = "";
              let statusColor = "gray";
              if (isPendingApproval) { statusMessage = "Esperando confirmación del cliente por WhatsApp"; statusColor = "amber"; }
              else if (projectDetail.rendersApprovedAt) { statusMessage = `Renders aprobados el ${new Date(projectDetail.rendersApprovedAt).toLocaleDateString('es-CO')}`; statusColor = "green"; }
              else if (projectDetail.modeladoApprovedAt) { statusMessage = `Modelado aprobado el ${new Date(projectDetail.modeladoApprovedAt).toLocaleDateString('es-CO')}`; statusColor = "green"; }
              else if ((projectDetail.status as string) === "en_diseno") { statusMessage = "En proceso de diseño"; statusColor = "blue"; }
              else if (!hasDesignContent) { statusMessage = "Sube imágenes de modelado o renders primero"; statusColor = "gray"; }
              else { statusMessage = "Envía el diseño al cliente para solicitar aprobación"; statusColor = "blue"; }
              return (
                <div className={`rounded-xl p-5 border mb-4 ${
                  statusColor === "amber" ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700" :
                  statusColor === "green" ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700" :
                  statusColor === "blue" ? "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border-blue-200 dark:border-blue-700" :
                  "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg text-white ${statusColor === "amber" ? "bg-amber-500" : statusColor === "green" ? "bg-green-500" : statusColor === "blue" ? "bg-blue-500" : "bg-gray-400"}`}>
                      {statusColor === "green" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${statusColor === "amber" ? "text-amber-800 dark:text-amber-200" : statusColor === "green" ? "text-green-800 dark:text-green-200" : statusColor === "blue" ? "text-blue-800 dark:text-blue-200" : "text-gray-600 dark:text-gray-400"}`}>
                        {isPendingApproval ? "Pendiente de Aprobación" : isApproved ? "Diseño Aprobado" : "Aprobar en Nombre del Cliente"}
                      </h4>
                      <p className={`text-sm ${statusColor === "amber" ? "text-amber-600 dark:text-amber-400" : statusColor === "green" ? "text-green-600 dark:text-green-400" : statusColor === "blue" ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>{statusMessage}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    {isInDesignPhase && (
                      <Button variant="outline" size="sm"
                        onClick={() => setApprovalUnlocked(!approvalUnlocked)}
                        className={approvalUnlocked ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20" : "border-gray-300 text-gray-500 hover:bg-gray-50"}>
                        {approvalUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button
                      onClick={() => { approveDesign.mutate({ projectId: projectDetail.id, approved: true }); setApprovalUnlocked(false); }}
                      disabled={approveDesign.isPending || !isInDesignPhase || !approvalUnlocked}
                      className={isInDesignPhase && approvalUnlocked ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" : "bg-gray-300 text-gray-500 cursor-not-allowed"}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />Aprobar
                    </Button>
                    <Button variant="outline"
                      className={isInDesignPhase && approvalUnlocked ? "border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" : "border-gray-300 text-gray-400 cursor-not-allowed"}
                      onClick={() => {
                        if (isInDesignPhase && approvalUnlocked) {
                          const notes = prompt("Indica qué cambios se necesitan:");
                          if (notes) { approveDesign.mutate({ projectId: projectDetail.id, approved: false, notes }); setApprovalUnlocked(false); }
                        }
                      }}
                      disabled={approveDesign.isPending || !isInDesignPhase || !approvalUnlocked}>
                      <XCircle className="h-4 w-4 mr-2" />Solicitar Cambios
                    </Button>
                  </div>
                  {projectDetail.clientApprovalNotes && (
                    <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        <strong>📝 Últimos cambios solicitados:</strong> {projectDetail.clientApprovalNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Datos de Visita Técnica ─────────────────────────────────────── */}
      {clientVisits && clientVisits.length > 0 && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="py-3 bg-gradient-to-r from-purple-600 to-violet-600">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Datos de Visita Técnica ({clientVisits.length} visita{clientVisits.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {clientVisits.map((visit: any) => {
              const meas = visit.measurements ?? {};
              const checklist = meas._checklist ?? {};
              const evaluacion = meas._evaluacion ?? {};
              const geo = meas._geo;
              const measureKeys = Object.keys(meas).filter(k => !k.startsWith("_"));
              const fotosVisita = (visit.photos ?? []).filter((p: any) => !p.category?.startsWith("pdf"));
              const pdfsVisita = (visit.photos ?? []).filter((p: any) => p.category?.startsWith("pdf"));
              return (
                <div key={visit.id} className="border rounded-lg p-4 space-y-3 bg-purple-50/30">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-purple-800">{visit.clientName}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{visit.workType}</span>
                    {visit.status === "enviada" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Enviada</span>}
                    {geo && (
                      <a href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 underline flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Ver ubicación
                      </a>
                    )}
                  </div>
                  {measureKeys.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-1">📐 Medidas</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {measureKeys.map(k => (
                          <div key={k} className="text-xs bg-white border rounded px-2 py-1">
                            <span className="text-gray-500 capitalize">{k.replace(/_/g," ")}: </span>
                            <span className="font-medium">{String(meas[k])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {visit.notes && <p className="text-xs text-gray-600 italic border-l-2 border-purple-300 pl-2">{visit.notes}</p>}
                  {Object.keys(evaluacion).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-1">🔍 Evaluación</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {Object.entries(evaluacion).map(([k, v]: any) => (
                          <div key={k} className="text-xs flex items-center gap-1">
                            <span>{v === "bueno" ? "🟢" : v === "regular" ? "🟡" : "🔴"}</span>
                            <span className="text-gray-600 capitalize">{k.replace(/_/g," ")}: </span>
                            <span className="font-medium capitalize">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fotosVisita.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 mb-1">📷 Fotos ({fotosVisita.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {fotosVisita.map((p: any) => (
                          <div key={p.id} className="aspect-square rounded overflow-hidden cursor-pointer"
                            onClick={() => fileViewer.openViewer(fotosVisita.map((x: any) => ({ url: x.photoUrl, title: x.description ?? "Foto" })), fotosVisita.indexOf(p))}>
                            <img src={p.photoUrl} alt={p.description ?? "foto"} className="w-full h-full object-cover hover:opacity-80" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pdfsVisita.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pdfsVisita.map((p: any) => (
                        <a key={p.id} href={p.photoUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 hover:bg-red-100">
                          <FileText className="h-3 w-3" />
                          {p.category === "pdf_plano" ? "Plano" : "PDF Medidas"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Carpetas de diseño ──────────────────────────────────────────── */}
      {Object.entries(designFolders).map(([category, subcategories]) => (
        <Card key={category}>
          <CardHeader className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
            <CardTitle className="text-base font-bold text-white tracking-wide">
              {categoryLabels[category] || category}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {(subcategories as string[]).map((subcategory) => {
                const photos = projectDetail.photos?.filter(
                  (p: any) => p.category === category && p.subcategory === subcategory
                ) || [];
                return (
                  <div key={subcategory} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-base text-emerald-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        {subcategoryLabels[subcategory] || subcategory}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${photos.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </h5>
                      {canUploadToFolder(subcategory) && (() => {
                        const uc = canUploadToStage(subcategory);
                        return (
                          <Button variant="ghost" size="sm" disabled={!uc.allowed} title={uc.message || "Subir foto"}
                            onClick={() => { if (!uc.allowed) { toast.error(uc.message); return; } setPhotoForm({ ...photoForm, category: category as any, subcategory }); setShowPhotoDialog(true); }}>
                            <Upload className={`h-4 w-4 ${!uc.allowed ? 'text-gray-300' : ''}`} />
                          </Button>
                        );
                      })()}
                    </div>
                    {photos.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {photos.map((photo: any, idx: number) => (
                            <div key={photo.id}
                              className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                              onClick={() => fileViewer.openViewer(photos.map((p: any) => ({ url: p.photoUrl, title: p.description || "Foto" })), idx)}>
                              {photo.photoUrl?.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center">
                                  <FileText className="h-10 w-10 text-red-500" />
                                  <span className="text-xs text-red-600 mt-1 font-medium">PDF</span>
                                </div>
                              ) : (
                                <img src={photo.photoUrl || ''} alt={photo.description || "Foto"} className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'; }} />
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="h-6 w-6 text-white" />
                              </div>
                              {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "comercial" ||
                                ((user?.role === "jefe_taller" || user?.role === "operario" || user?.role === "disenador") && photo.uploadedBy === user?.id)) && (
                                <button
                                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                  onClick={(e) => { e.stopPropagation(); setPhotoToDelete({ id: photo.id, description: photo.description }); }}>
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {canShowAdvanceButton(subcategory) && (
                          <div className="mt-3 pt-3 border-t border-dashed border-emerald-200">
                            <Button onClick={() => openAdvanceConfirmDialog(subcategory)} disabled={updateStatus.isPending}
                              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold">
                              {updateStatus.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                              Avanzar etapa
                            </Button>
                            {canSendSectionNotification() && (
                              <Button size="sm" variant="outline" disabled={sendSectionNotification.isPending}
                                onClick={() => handleSendSectionNotification(subcategory)}
                                className="w-full mt-2 text-xs">
                                {sendSectionNotification.isPending ? "Enviando..." : "📲 Notificar al cliente"}
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Camera className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400 font-medium">Sin fotos aún</p>
                        {canUploadToFolder(subcategory) && <p className="text-xs text-gray-400 mt-1">Haz clic en el botón de subir para agregar</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Revisiones del cliente ──────────────────────────────────────── */}
      {projectDetail.clientRevisions && projectDetail.clientRevisions.length > 0 && (
        <Card className="border-purple-300 bg-purple-50/50">
          <CardHeader className="py-3 bg-gradient-to-r from-purple-500 to-purple-600">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Revisiones del Cliente ({projectDetail.clientRevisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {projectDetail.clientRevisions.map((revision: any, index: number) => (
                <div key={revision.id || index} className="p-3 bg-[#162828] rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${revision.type === 'modelado_3d' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {revision.type === 'modelado_3d' ? '📎 Modelado 3D' : '🎨 Renders'} - Rev. {revision.revisionNumber}
                    </span>
                    <span className="text-xs text-gray-500">{revision.clientName}</span>
                  </div>
                  <p className="text-sm text-gray-700">{revision.changes}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(revision.createdAt).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {(!projectDetail.clientRevisions || projectDetail.clientRevisions.length === 0) && projectDetail.clientApprovalNotes && (
        <Card className="border-orange-300 bg-orange-50/50">
          <CardHeader className="py-3 bg-gradient-to-r from-orange-500 to-orange-600">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />Cambios Solicitados por el Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="p-3 bg-[#162828] rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700">{projectDetail.clientApprovalNotes}</p>
              {projectDetail.changesRequestedAt && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Solicitado: {new Date(projectDetail.changesRequestedAt).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Notas y Detalles ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 bg-orange-50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Notas y Detalles del Proyecto</CardTitle>
          {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "comercial" || user?.role === "disenador") && (
            <Button variant="ghost" size="sm" onClick={() => setShowDetailDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Agregar
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {(projectDetail as any)?.details?.length > 0 ? (
            <div className="space-y-3">
              {projectDetail.details.map((detail: any) => (
                <div key={detail.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {detail.type === "medida_especial" ? "Medida Especial" : detail.type === "nota_importante" ? "Nota Importante" : "Foto Referencia"}
                      </Badge>
                      <h5 className="font-medium break-words min-w-0">{detail.title}</h5>
                      <p className="text-sm text-muted-foreground break-words min-w-0">{detail.content}</p>
                    </div>
                    {detail.photoUrl && (
                      <img src={detail.photoUrl} alt={detail.title} className="w-16 h-16 object-cover rounded cursor-pointer"
                        onClick={() => fileViewer.openViewer([{ url: detail.photoUrl, title: detail.title }], 0)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay detalles registrados</p>
          )}
        </CardContent>
      </Card>

      {/* ── Diálogos ────────────────────────────────────────────────────── */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Subir Archivos (JPG / PDF)</DialogTitle>
            <DialogDescription>Agrega fotos o documentos PDF al proyecto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={photoForm.category} onValueChange={(v) => setPhotoForm({ ...photoForm, category: v as any, subcategory: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecciona la categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cotizacion">Cotización</SelectItem>
                  <SelectItem value="medidas">Medidas</SelectItem>
                  <SelectItem value="disenos">Diseños</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {photoForm.category !== "cotizacion" && (
              <div className="space-y-2">
                <Label>Subcategoría *</Label>
                <Select value={photoForm.subcategory} onValueChange={(v) => setPhotoForm({ ...photoForm, subcategory: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona subcategoría" /></SelectTrigger>
                  <SelectContent>
                    {photoForm.category === "medidas" && (<><SelectItem value="fotos_iniciales">Fotos Iniciales</SelectItem><SelectItem value="dibujo">Dibujo</SelectItem></>)}
                    {photoForm.category === "disenos" && (<><SelectItem value="modelado_3d">Modelado 3D</SelectItem><SelectItem value="renders">Renders</SelectItem><SelectItem value="detalles">Detalles</SelectItem><SelectItem value="despieces">Despieces</SelectItem></>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(photoForm.category === "cotizacion" || photoForm.subcategory) && (
              <PhotoUploader
                projectId={projectId}
                stage={photoForm.category === "disenos" ? "diseno" : "inicial"}
                category={photoForm.category as any}
                maxFiles={10}
                accept="image/*,application/pdf"
                onUploadComplete={(urls) => {
                  urls.forEach((url) => {
                    uploadPhoto.mutate({
                      projectId,
                      stage: photoForm.category === "disenos" ? "diseno" : "inicial",
                      category: photoForm.category,
                      subcategory: (photoForm.category === "cotizacion" ? "documento_cotizacion" : photoForm.subcategory || undefined) as any,
                      photoUrl: url,
                      description: photoForm.description || undefined,
                    });
                  });
                  setShowPhotoDialog(false);
                  setPhotoForm({ category: "disenos", subcategory: "", description: "" });
                }}
              />
            )}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input value={photoForm.description} onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })} placeholder="Descripción de los archivos..." />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Detalle</DialogTitle><DialogDescription>Agrega una nota o detalle importante</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={detailForm.type} onValueChange={(v) => setDetailForm({ ...detailForm, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota_importante">Nota Importante</SelectItem>
                  <SelectItem value="medida_especial">Medida Especial</SelectItem>
                  <SelectItem value="foto_referencia">Foto de Referencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Título</Label><Input value={detailForm.title} onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })} placeholder="Título del detalle" /></div>
            <div><Label>Contenido</Label><Textarea value={detailForm.content} onChange={(e) => setDetailForm({ ...detailForm, content: e.target.value })} placeholder="Descripción o contenido" /></div>
            {detailForm.type === "foto_referencia" && (
              <div>
                <Label>Foto</Label>
                <PhotoUploader onUploadComplete={(urls: string[]) => { if (urls.length > 0) setDetailForm({ ...detailForm, photoUrl: urls[0] }); }} maxFiles={1} />
                {detailForm.photoUrl && <img src={detailForm.photoUrl} alt="Preview" className="w-20 h-20 object-cover rounded mt-2" />}
              </div>
            )}
            <Button className="w-full" disabled={!detailForm.title || !detailForm.content || createDetail.isPending}
              onClick={() => createDetail.mutate({ projectId, type: detailForm.type, title: detailForm.title, content: detailForm.content, photoUrl: detailForm.photoUrl || undefined })}>
              {createDetail.isPending ? "Guardando..." : "Guardar Detalle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600"
              onClick={() => { if (photoToDelete) deletePhoto.mutate({ id: photoToDelete.id }); }}>
              {deletePhoto.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={advanceConfirmDialog.open} onOpenChange={(open) => !open && setAdvanceConfirmDialog({ open: false, subcategory: "", nextStatus: "", hasPhotos: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{advanceConfirmDialog.hasPhotos ? "¿Avanzar a la siguiente etapa?" : "⚠️ Sin fotos en esta etapa"}</AlertDialogTitle>
            <AlertDialogDescription>
              {advanceConfirmDialog.hasPhotos
                ? <>El proyecto pasará a <strong>{advanceConfirmDialog.nextStatus === "corte" ? "Corte" : advanceConfirmDialog.nextStatus === "enchape" ? "Enchape" : advanceConfirmDialog.nextStatus === "ensamble" ? "Ensamble" : advanceConfirmDialog.nextStatus === "listo_instalacion" ? "En Instalación" : advanceConfirmDialog.nextStatus === "entregado" ? "Entregado" : "Siguiente Etapa"}</strong>. ¿Continuar?</>
                : <>No hay fotos en <strong>{subcategoryLabels[advanceConfirmDialog.subcategory] || advanceConfirmDialog.subcategory}</strong>. ¿Avanzar de todas formas?</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={advanceConfirmDialog.hasPhotos ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"}
              onClick={handleAdvanceFromPhoto} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Avanzando..." : advanceConfirmDialog.hasPhotos ? "Sí, avanzar" : "Avanzar sin fotos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FileViewer viewer={fileViewer} />
    </div>
  );
}
