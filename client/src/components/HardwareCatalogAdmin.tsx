import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Upload, Pencil, Trash2, Image, X, ZoomIn } from "lucide-react";

const categoryLabels: Record<string, string> = {
  cocinas: "Cocinas",
  closets: "Closets",
  puertas: "Puertas",
};

export function HardwareCatalogAdmin() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    category: "cocinas" as "cocinas" | "closets" | "puertas",
    name: "",
    description: "",
    options: "",
    price: "",
  });

  const utils = trpc.useUtils();
  const { data: catalog = [], isLoading } = trpc.hardwareCatalog.list.useQuery({});

  const createHardware = trpc.hardwareCatalog.create.useMutation({
    onSuccess: () => {
      utils.hardwareCatalog.list.invalidate();
      toast.success("Herraje agregado exitosamente");
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar herraje");
    },
  });

  const updateHardware = trpc.hardwareCatalog.update.useMutation({
    onSuccess: () => {
      utils.hardwareCatalog.list.invalidate();
      toast.success("Herraje actualizado exitosamente");
      setEditingItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar herraje");
    },
  });

  const deleteHardware = trpc.hardwareCatalog.delete.useMutation({
    onSuccess: () => {
      utils.hardwareCatalog.list.invalidate();
      toast.success("Herraje eliminado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar herraje");
    },
  });

  const uploadPhoto = trpc.hardwareCatalog.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.hardwareCatalog.list.invalidate();
      toast.success("Foto subida exitosamente");
      setUploadingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al subir foto");
      setUploadingId(null);
    },
  });

  const resetForm = () => {
    // Usar la categoría actualmente seleccionada en el filtro, o "cocinas" si es "all"
    const defaultCategory = selectedCategory === "all" ? "cocinas" : selectedCategory as "cocinas" | "closets" | "puertas";
    setForm({
      category: defaultCategory,
      name: "",
      description: "",
      options: "",
      price: "",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, hardwareId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setUploadingId(hardwareId);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadPhoto.mutate({
        hardwareId,
        photoData: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const priceValue = form.price ? parseFloat(form.price) : undefined;
    
    if (editingItem) {
      updateHardware.mutate({
        id: editingItem.id,
        name: form.name,
        description: form.description,
        options: form.options,
        price: priceValue,
      });
    } else {
      createHardware.mutate({
        category: form.category,
        name: form.name,
        description: form.description,
        options: form.options,
        price: priceValue,
      });
    }
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setForm({
      category: item.category,
      name: item.name,
      description: item.description || "",
      options: item.options || "",
      price: item.price || "",
    });
  };

  const filteredCatalog = selectedCategory === "all" 
    ? catalog 
    : catalog.filter((item: any) => item.category === selectedCategory);

  // Agrupar por categoría
  const groupedCatalog = filteredCatalog.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Catálogo de Herrajes</CardTitle>
            <CardDescription>Gestiona el catálogo de herrajes con fotos para mostrar a los clientes</CardDescription>
          </div>
          <Dialog open={showAddDialog || !!editingItem} onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              setEditingItem(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm(); // Pre-seleccionar la categoría actual
                setShowAddDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Herraje
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar Herraje" : "Agregar Nuevo Herraje"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modifica los datos del herraje" : "Ingresa los datos del nuevo herraje"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2 p-3 bg-blue-500/10 rounded-lg border-2 border-blue-500/25">
                  <Label className="text-base font-semibold text-blue-300">Categoría *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value: "cocinas" | "closets" | "puertas") => 
                      setForm({ ...form, category: value })
                    }
                  >
                    <SelectTrigger className="bg-[#162828]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cocinas">Cocinas</SelectItem>
                      <SelectItem value="closets">Closets</SelectItem>
                      <SelectItem value="puertas">Puertas</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-700">El herraje se agregará a la categoría: <strong>{categoryLabels[form.category]}</strong></p>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Bisagras cierre lento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descripción del herraje..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opciones disponibles</Label>
                  <Textarea
                    value={form.options}
                    onChange={(e) => setForm({ ...form, options: e.target.value })}
                    placeholder="Ej: Acero / Estándar, Cromado / Negro"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio (incluye instalación)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Ej: 150000"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingItem(null);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createHardware.isPending || updateHardware.isPending}
                >
                  {editingItem ? "Guardar Cambios" : "Agregar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            Todos ({catalog.length})
          </Button>
          {["cocinas", "closets", "puertas"].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryLabels[cat]} ({catalog.filter((item: any) => item.category === cat).length})
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando catálogo...</div>
        ) : filteredCatalog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay herrajes en el catálogo. Agrega el primero.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCatalog).map(([category, items]: [string, any]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Badge variant="secondary">{categoryLabels[category]}</Badge>
                  <span className="text-muted-foreground text-sm">({items.length} herrajes)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-md transition-shadow"
                    >
                      {/* Imagen */}
                      <div className="relative aspect-video bg-muted rounded-md overflow-hidden group">
                        {item.photoUrl ? (
                          <>
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                            <div 
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              onClick={() => setPreviewImage(item.photoUrl)}
                            >
                              <ZoomIn className="h-8 w-8 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Image className="h-8 w-8 mb-2" />
                            <span className="text-xs">Sin foto</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        {item.price && (
                          <p className="text-lg font-semibold text-primary mt-2">
                            ${parseFloat(item.price).toLocaleString('es-CO')}
                          </p>
                        )}
                        {item.options && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Opciones:</span> {item.options}
                          </p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-2 border-t">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => handleFileChange(e, item.id)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setUploadingId(item.id);
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => handleFileChange(e as any, item.id);
                            input.click();
                          }}
                          disabled={uploadingId === item.id}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadingId === item.id ? "Subiendo..." : "Foto"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${item.name}"?`)) {
                              deleteHardware.mutate({ id: item.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal de vista previa de imagen */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-[#162828]/20"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={previewImage}
            alt="Vista previa"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Card>
  );
}
