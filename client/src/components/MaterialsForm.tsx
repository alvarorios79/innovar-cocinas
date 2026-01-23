import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface MaterialsFormProps {
  projectId: number;
  readOnly?: boolean;
}

// Función para comprimir imagen antes de subir
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Redimensionar si es muy grande
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con compresión
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function MaterialsForm({ projectId, readOnly = false }: MaterialsFormProps) {
  const [formData, setFormData] = useState({
    woodType: "" as "rh" | "estandar" | "",
    woodColor: "",
    woodPhotoUrl: "",
    countertopType: "" as "granito" | "cuarzo" | "sinterizado" | "",
    countertopName: "",
    countertopPhotoUrl: "",
    sinkMeasure: "",
    sinkPhotoUrl: "",
    notes: "",
  });

  const [uploadingPhoto, setUploadingPhoto] = useState<"wood" | "countertop" | "sink" | null>(null);

  const { data: materials, isLoading } = trpc.projectMaterials.get.useQuery({ projectId });
  
  const uploadPhotoMutation = trpc.projectMaterials.uploadPhoto.useMutation({
    onError: (error) => {
      toast.error(error.message || "Error al subir la foto");
      setUploadingPhoto(null);
    },
  });

  const saveMutation = trpc.projectMaterials.save.useMutation({
    onSuccess: () => {
      toast.success("Materiales guardados correctamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al guardar materiales");
    },
  });

  useEffect(() => {
    if (materials) {
      setFormData({
        woodType: materials.woodType || "",
        woodColor: materials.woodColor || "",
        woodPhotoUrl: materials.woodPhotoUrl || "",
        countertopType: materials.countertopType || "",
        countertopName: materials.countertopName || "",
        countertopPhotoUrl: materials.countertopPhotoUrl || "",
        sinkMeasure: materials.sinkMeasure || "",
        sinkPhotoUrl: materials.sinkPhotoUrl || "",
        notes: materials.notes || "",
      });
    }
  }, [materials]);

  const handleSave = () => {
    saveMutation.mutate({
      projectId,
      woodType: formData.woodType || undefined,
      woodColor: formData.woodColor || undefined,
      woodPhotoUrl: formData.woodPhotoUrl || undefined,
      countertopType: formData.countertopType || undefined,
      countertopName: formData.countertopName || undefined,
      countertopPhotoUrl: formData.countertopPhotoUrl || undefined,
      sinkMeasure: formData.sinkMeasure || undefined,
      sinkPhotoUrl: formData.sinkPhotoUrl || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handlePhotoUpload = async (
    photoType: "wood" | "countertop" | "sink",
    fieldName: "woodPhotoUrl" | "countertopPhotoUrl" | "sinkPhotoUrl",
    file: File
  ) => {
    try {
      setUploadingPhoto(photoType);
      
      // Comprimir imagen antes de subir
      toast.info("Comprimiendo imagen...");
      const compressedBase64 = await compressImage(file);
      
      // Subir a S3
      toast.info("Subiendo imagen...");
      const result = await uploadPhotoMutation.mutateAsync({
        projectId,
        photoType,
        photoData: compressedBase64,
        fileName: file.name,
      });
      
      // Actualizar el formulario con la URL de S3
      setFormData(prev => ({ ...prev, [fieldName]: result.url }));
      toast.success("Foto subida correctamente");
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = (fieldName: "woodPhotoUrl" | "countertopPhotoUrl" | "sinkPhotoUrl") => {
    setFormData(prev => ({ ...prev, [fieldName]: "" }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderPhotoSection = (
    photoType: "wood" | "countertop" | "sink",
    fieldName: "woodPhotoUrl" | "countertopPhotoUrl" | "sinkPhotoUrl",
    label: string,
    photoUrl: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
            <img src={photoUrl} alt={label} className="w-full h-full object-cover" />
            {!readOnly && (
              <button
                onClick={() => handleRemovePhoto(fieldName)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
            {uploadingPhoto === photoType ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
        {!readOnly && (
          <label className="cursor-pointer">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPhoto !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validar tamaño máximo (10MB antes de comprimir)
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error("La imagen es muy grande. Máximo 10MB.");
                    return;
                  }
                  handlePhotoUpload(photoType, fieldName, file);
                }
              }}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              asChild
              disabled={uploadingPhoto !== null}
            >
              <span>
                {uploadingPhoto === photoType ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir foto
                  </>
                )}
              </span>
            </Button>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Madera */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700">🪵</span>
            </div>
            Madera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Tipo de Madera</Label>
              <Select
                value={formData.woodType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, woodType: value as "rh" | "estandar" }))}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rh">RH (Resistente a la Humedad)</SelectItem>
                  <SelectItem value="estandar">Estándar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color / Referencia</Label>
              <Input
                value={formData.woodColor}
                onChange={(e) => setFormData(prev => ({ ...prev, woodColor: e.target.value }))}
                placeholder="Ej: Roble Natural, Wengue"
                disabled={readOnly}
              />
            </div>
          </div>
          {renderPhotoSection("wood", "woodPhotoUrl", "Foto del Material", formData.woodPhotoUrl)}
        </CardContent>
      </Card>

      {/* Mesón */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-slate-700">🪨</span>
            </div>
            Mesón
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Tipo de Mesón</Label>
              <Select
                value={formData.countertopType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, countertopType: value as "granito" | "cuarzo" | "sinterizado" }))}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="granito">Granito</SelectItem>
                  <SelectItem value="cuarzo">Cuarzo</SelectItem>
                  <SelectItem value="sinterizado">Sinterizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre / Referencia</Label>
              <Input
                value={formData.countertopName}
                onChange={(e) => setFormData(prev => ({ ...prev, countertopName: e.target.value }))}
                placeholder="Ej: Blanco Carrara, Negro Absoluto"
                disabled={readOnly}
              />
            </div>
          </div>
          {renderPhotoSection("countertop", "countertopPhotoUrl", "Foto del Mesón", formData.countertopPhotoUrl)}
        </CardContent>
      </Card>

      {/* Notas adicionales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notas Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Observaciones sobre los materiales..."
            rows={3}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      {/* Botón guardar */}
      {!readOnly && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || uploadingPhoto !== null}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Materiales
          </Button>
        </div>
      )}
    </div>
  );
}
