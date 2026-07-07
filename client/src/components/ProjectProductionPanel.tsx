import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Upload, ZoomIn, Trash2, ArrowRight, RefreshCw, Camera, FileText, Box, Palette } from "lucide-react";
import { useFileViewer, FileViewer } from "@/components/FileViewer";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ── Etiquetas estáticas ───────────────────────────────────────────────────────
const subcategoryLabels: Record<string, string> = {
  corte: "Corte", enchape: "Enchape", armado: "Armado",
};
const photoToNextStatus: Record<string, string> = {
  corte: "enchape", enchape: "ensamble", armado: "listo_instalacion",
};
const photoToCurrentStatus: Record<string, string[]> = {
  corte: ["corte","despiece"], enchape: ["enchape","corte"], armado: ["ensamble","enchape"],
};
const subcategoryToSectionKey: Record<string, "corte"|"enchape"|"armado"|"instalacion"|"entrega"> = {
  corte: "corte", enchape: "enchape", armado: "armado",
};
const previousStageMap: Record<string, string> = {
  enchape: "corte", armado: "enchape",
};

// ── Componente principal ──────────────────────────────────────────────────────
export function ProjectProductionPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const fileViewer = useFileViewer();

  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoForm, setPhotoForm] = useState({
    subcategory: "corte" as "corte"|"enchape"|"armado",
    description: "",
  });
  const [photoToDelete, setPhotoToDelete] = useState<{ id: number; description?: string } | null>(null);
  const [advanceConfirmDialog, setAdvanceConfirmDialog] = useState<{
    open: boolean; subcategory: string; nextStatus: string; hasPhotos: boolean;
  }>({ open: false, subcategory: "", nextStatus: "", hasPhotos: false });

  // Consultas
  const { data: projectDetail, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId, staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true }
  );

  // Mutaciones
  const invalidate = () => utils.projects.getById.invalidate({ id: projectId });

  const uploadPhoto = trpc.projectPhotos.upload.useMutation({
    onSuccess: () => { invalidate(); toast.success("Archivo subido"); setShowPhotoDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deletePhoto = trpc.projectPhotos.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Foto eliminada"); setPhotoToDelete(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => { invalidate(); toast.success("Proyecto avanzado"); },
    onError: (e) => toast.error(e.message),
  });
  const sendSectionNotification = trpc.projects.sendSectionNotification.useMutation({
    onSuccess: (data) => { invalidate(); toast.success(data.message || "Notificación enviada"); },
    onError: (e) => toast.error(e.message),
  });

  // Helpers
  const canUploadToFolder = (folder: string) => {
    const role = user?.role;
    const perms: Record<string, string[]> = {
      corte: ["jefe_taller","operario"], enchape: ["jefe_taller","operario"], armado: ["jefe_taller","operario"],
    };
    return (perms[folder] || ["super_admin","admin"]).includes(role || "") ||
           ["super_admin","admin"].includes(role || "");
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

  // Subcategorías de avance
  const avanceSubcategories = ["corte", "enchape", "armado"] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }
  if (!projectDetail) {
    return <p className="text-sm text-muted-foreground p-4">Proyecto no encontrado.</p>;
  }

  return (
    <div className="space-y-4 pb-6">

      {/* ── Materiales ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 bg-orange-50">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-orange-600" />
            Materiales Seleccionados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <MaterialsForm
            projectId={projectDetail.id}
            readOnly={user?.role === "disenador" || (user?.role !== "admin" && user?.role !== "super_admin")}
          />
        </CardContent>
      </Card>

      {/* ── Herrajes ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 bg-orange-50">
          <CardTitle className="text-sm flex items-center gap-2">
            <Box className="h-4 w-4 text-orange-600" />
            Herrajes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <HardwareSelector
            projectId={projectDetail.id}
            readOnly={user?.role !== "admin" && user?.role !== "super_admin"}
            showOnlySelected={false}
          />
        </CardContent>
      </Card>

      {/* ── Fotos de Avance ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 bg-gradient-to-r from-orange-500 to-amber-500">
          <CardTitle className="text-base font-bold text-white">Avance de Producción</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {avanceSubcategories.map((subcategory) => {
              const photos = projectDetail.photos?.filter(
                (p: any) => p.category === "avance" && p.subcategory === subcategory
              ) || [];
              return (
                <div key={subcategory} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-sm text-orange-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      {subcategoryLabels[subcategory] || subcategory}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${photos.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-100 text-gray-500'}`}>
                        {photos.length} fotos
                      </span>
                    </h5>
                    {canUploadToFolder(subcategory) && (() => {
                      const uc = canUploadToStage(subcategory);
                      return (
                        <Button variant="ghost" size="sm" disabled={!uc.allowed} title={uc.message || "Subir foto"}
                          onClick={() => { if (!uc.allowed) { toast.error(uc.message); return; } setPhotoForm({ subcategory: subcategory as any, description: "" }); setShowPhotoDialog(true); }}>
                          <Upload className={`h-4 w-4 ${!uc.allowed ? 'text-gray-300' : ''}`} />
                        </Button>
                      );
                    })()}
                  </div>
                  {photos.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {photos.map((photo: any, idx: number) => (
                          <div key={photo.id}
                            className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                            onClick={() => fileViewer.openViewer(photos.map((p: any) => ({ url: p.photoUrl, title: p.description || "Foto" })), idx)}>
                            <img src={photo.photoUrl || ''} alt={photo.description || "Foto"} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                            {(user?.role === "super_admin" || user?.role === "admin" ||
                              ((user?.role === "jefe_taller" || user?.role === "operario") && photo.uploadedBy === user?.id)) && (
                              <button
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                onClick={(e) => { e.stopPropagation(); setPhotoToDelete({ id: photo.id, description: photo.description }); }}>
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {canShowAdvanceButton(subcategory) && photoToCurrentStatus[subcategory]?.includes(projectDetail.status as string) && (
                        <Button size="sm" onClick={() => openAdvanceConfirmDialog(subcategory)} disabled={updateStatus.isPending}
                          className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold">
                          {updateStatus.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                          Avanzar etapa
                        </Button>
                      )}
                      {canSendSectionNotification() && (
                        <Button size="sm" variant="outline" disabled={sendSectionNotification.isPending}
                          onClick={() => handleSendSectionNotification(subcategory)}
                          className="w-full mt-2 text-xs">
                          {sendSectionNotification.isPending ? "Enviando..." : "📲 Notificar al cliente"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-white/[0.03] rounded-lg border-2 border-dashed border-white/[0.12]">
                      <Camera className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400 font-medium">Sin fotos aún</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Diálogos ────────────────────────────────────────────────────── */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Subir Fotos de Avance</DialogTitle>
            <DialogDescription>Fotos de avance de producción — {subcategoryLabels[photoForm.subcategory]}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={photoForm.subcategory} onValueChange={(v) => setPhotoForm({ ...photoForm, subcategory: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="enchape">Enchape</SelectItem>
                  <SelectItem value="armado">Armado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PhotoUploader
              projectId={projectId}
              stage={photoForm.subcategory === "corte" ? "corte" : photoForm.subcategory === "enchape" ? "enchape" : "ensamble"}
              category="avance"
              maxFiles={10}
              accept="image/*"
              onUploadComplete={(urls) => {
                const stageMap: Record<string, any> = { corte: "corte", enchape: "enchape", armado: "ensamble" };
                urls.forEach((url) => {
                  uploadPhoto.mutate({ projectId, stage: stageMap[photoForm.subcategory] || "corte", category: "avance", subcategory: photoForm.subcategory as any, photoUrl: url, description: photoForm.description || undefined });
                });
                setShowPhotoDialog(false);
              }}
            />
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input value={photoForm.description} onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })} placeholder="Descripción de las fotos..." />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => { if (photoToDelete) deletePhoto.mutate({ id: photoToDelete.id }); }}>
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
                ? <>El proyecto pasará a <strong>{advanceConfirmDialog.nextStatus === "enchape" ? "Enchape" : advanceConfirmDialog.nextStatus === "ensamble" ? "Ensamble" : advanceConfirmDialog.nextStatus === "listo_instalacion" ? "En Instalación" : "Siguiente Etapa"}</strong>. ¿Continuar?</>
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
