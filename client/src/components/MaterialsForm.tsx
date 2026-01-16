import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface MaterialsFormProps {
  projectId: number;
  readOnly?: boolean;
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

  const { data: materials, isLoading } = trpc.projectMaterials.get.useQuery({ projectId });
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

  const handlePhotoUpload = async (field: "woodPhotoUrl" | "countertopPhotoUrl" | "sinkPhotoUrl", file: File) => {
    // Convert to base64 for now - in production would upload to S3
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({ ...prev, [field]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <div className="space-y-2">
            <Label>Foto del Material</Label>
            <div className="flex items-center gap-4">
              {formData.woodPhotoUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={formData.woodPhotoUrl} alt="Madera" className="w-full h-full object-cover" />
                  {!readOnly && (
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, woodPhotoUrl: "" }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {!readOnly && (
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload("woodPhotoUrl", file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" /> Subir foto</span>
                  </Button>
                </label>
              )}
            </div>
          </div>
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
          <div className="space-y-2">
            <Label>Foto del Mesón</Label>
            <div className="flex items-center gap-4">
              {formData.countertopPhotoUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={formData.countertopPhotoUrl} alt="Mesón" className="w-full h-full object-cover" />
                  {!readOnly && (
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, countertopPhotoUrl: "" }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {!readOnly && (
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload("countertopPhotoUrl", file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" /> Subir foto</span>
                  </Button>
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lavaplatos */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700">🚰</span>
            </div>
            Lavaplatos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label>Medida</Label>
            <Input
              value={formData.sinkMeasure}
              onChange={(e) => setFormData(prev => ({ ...prev, sinkMeasure: e.target.value }))}
              placeholder="Ej: 84x50 cm, Doble poceta 100x50 cm"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Foto del Lavaplatos</Label>
            <div className="flex items-center gap-4">
              {formData.sinkPhotoUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={formData.sinkPhotoUrl} alt="Lavaplatos" className="w-full h-full object-cover" />
                  {!readOnly && (
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, sinkPhotoUrl: "" }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {!readOnly && (
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload("sinkPhotoUrl", file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" /> Subir foto</span>
                  </Button>
                </label>
              )}
            </div>
          </div>
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
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
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
