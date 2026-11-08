import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Check, X, Image as ImageIcon, ChefHat, Shirt, DoorOpen, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HARDWARE_CATEGORY_LABELS } from "@shared/materials";

interface HardwareSelectorProps {
  projectId: number;
  /** Solo consulta (taller): muestra únicamente lo seleccionado, sin catálogo ni botones */
  readOnly?: boolean;
}

interface HardwareItem {
  id: number;
  category: string;
  name: string;
  description: string | null;
  options: string | null;
  photoUrl: string | null;
}

const CATEGORIES = ["cocinas", "closets", "puertas"] as const;
type Category = (typeof CATEGORIES)[number];

const CategoryIcon = ({ category, className = "h-4 w-4" }: { category: string; className?: string }) => {
  switch (category) {
    case "cocinas": return <ChefHat className={className} />;
    case "closets": return <Shirt className={className} />;
    case "puertas": return <DoorOpen className={className} />;
    default: return null;
  }
};

/**
 * Herrajes del proyecto. Por defecto muestra SOLO los herrajes que lleva el proyecto.
 * Quien puede elegir (oficina) abre el catálogo con "Agregar / cambiar herrajes".
 */
export function HardwareSelector({ projectId, readOnly = false }: HardwareSelectorProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Category>("cocinas");
  const [optionDraft, setOptionDraft] = useState("");
  const [currentHardware, setCurrentHardware] = useState<HardwareItem | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // El catálogo completo solo se pide cuando se abre (el taller nunca lo carga)
  const { data: catalog, isLoading: catalogLoading } = trpc.hardwareCatalog.list.useQuery({}, { enabled: catalogOpen && !readOnly });
  const { data: selections, isLoading: selectionsLoading, refetch: refetchSelections } =
    trpc.projectMaterials.getSelectedHardware.useQuery({ projectId });

  const selectMutation = trpc.projectMaterials.selectHardware.useMutation({
    onSuccess: () => {
      toast.success("Herraje agregado al proyecto");
      refetchSelections();
      setCurrentHardware(null);
    },
    onError: (error) => toast.error(error.message || "Error al seleccionar herraje"),
  });

  const removeMutation = trpc.projectMaterials.removeHardware.useMutation({
    onSuccess: () => {
      toast.success("Herraje quitado del proyecto");
      refetchSelections();
    },
    onError: (error) => toast.error(error.message || "Error al quitar herraje"),
  });

  const getSelection = (hardwareId: number) => selections?.find((s) => s.hardwareId === hardwareId);

  const handleToggle = (hardware: HardwareItem) => {
    if (readOnly) return;
    if (getSelection(hardware.id)) {
      removeMutation.mutate({ projectId, hardwareId: hardware.id });
    } else if (hardware.options && hardware.options.includes(",")) {
      setCurrentHardware(hardware);
      setOptionDraft("");
    } else {
      selectMutation.mutate({ projectId, hardwareId: hardware.id, selectedOption: hardware.options || undefined });
    }
  };

  if (selectionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selected = selections ?? [];
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: selected.filter((s) => s.hardware?.category === cat),
  })).filter((g) => g.items.length > 0);
  const others = selected.filter((s) => !CATEGORIES.includes(s.hardware?.category as Category));
  const countBy = (cat: string) => selected.filter((s) => s.hardware?.category === cat).length;

  return (
    <div className="space-y-4">
      {/* ── Lo que lleva el proyecto ── */}
      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aún no se han seleccionado herrajes para este proyecto.
        </p>
      ) : (
        <div className="space-y-4">
          {[...grouped, ...(others.length ? [{ cat: "otros", items: others }] : [])].map((g) => (
            <div key={g.cat}>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                <CategoryIcon category={g.cat} className="h-3.5 w-3.5" />
                {HARDWARE_CATEGORY_LABELS[g.cat] ?? "Otros"} ({g.items.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {g.items.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5">
                    <button
                      type="button"
                      className={cn(
                        "w-14 h-14 rounded-md overflow-hidden flex items-center justify-center shrink-0",
                        s.hardware?.photoUrl ? "bg-white border" : "bg-muted cursor-default"
                      )}
                      onClick={() => s.hardware?.photoUrl && setPhotoPreview(s.hardware.photoUrl)}
                    >
                      {s.hardware?.photoUrl ? (
                        <img src={s.hardware.photoUrl} alt={s.hardware?.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight break-words">{s.hardware?.name ?? "Herraje"}</p>
                      {s.selectedOption && (
                        <p className="text-xs text-primary mt-0.5 break-words">{s.selectedOption}</p>
                      )}
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        title="Quitar del proyecto"
                        onClick={() => removeMutation.mutate({ projectId, hardwareId: s.hardwareId })}
                        disabled={removeMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCatalogOpen(true)}>
          {selected.length === 0 ? <Plus className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
          {selected.length === 0 ? "Agregar herrajes" : "Agregar / cambiar herrajes"}
        </Button>
      )}

      {/* ── Catálogo (solo oficina) ── */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catálogo de herrajes</DialogTitle>
            <DialogDescription>Toca un herraje para agregarlo o quitarlo del proyecto. Los marcados con ✓ ya están incluidos.</DialogDescription>
          </DialogHeader>

          {catalogLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
              <TabsList>
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="gap-1.5">
                    <CategoryIcon category={cat} />
                    {HARDWARE_CATEGORY_LABELS[cat]}
                    {countBy(cat) > 0 && (
                      <Badge className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">{countBy(cat)}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIES.map((cat) => {
                const items = (catalog ?? []).filter((item) => item.category === cat) as HardwareItem[];
                return (
                  <TabsContent key={cat} value={cat} className="mt-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No hay herrajes en esta categoría.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {items.map((hardware) => {
                          const sel = getSelection(hardware.id);
                          return (
                            <button
                              type="button"
                              key={hardware.id}
                              onClick={() => handleToggle(hardware)}
                              disabled={selectMutation.isPending || removeMutation.isPending}
                              className={cn(
                                "relative rounded-lg border p-3 text-center transition-all hover:border-primary/60",
                                sel ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border bg-surface"
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                                  sel ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}
                              >
                                {sel && <Check className="h-3 w-3" />}
                              </span>
                              <div
                                className={cn(
                                  "w-16 h-16 mx-auto rounded-md flex items-center justify-center overflow-hidden mb-2",
                                  hardware.photoUrl ? "bg-white border" : "bg-muted"
                                )}
                              >
                                {hardware.photoUrl ? (
                                  <img src={hardware.photoUrl} alt={hardware.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <p className="font-semibold text-xs sm:text-sm leading-tight">{hardware.name}</p>
                              {sel?.selectedOption ? (
                                <p className="text-xs text-primary mt-1">{sel.selectedOption}</p>
                              ) : hardware.options && hardware.options.includes(",") ? (
                                <p className="text-xs text-muted-foreground italic mt-1">Con opciones</p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setCatalogOpen(false)}>Listo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Elegir opción de un herraje ── */}
      <Dialog open={!!currentHardware} onOpenChange={(o) => !o && setCurrentHardware(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opción para {currentHardware?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentHardware?.options?.split("|").map((optionGroup, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <p className="text-sm text-muted-foreground">{groupIndex === 0 ? "Opciones:" : "Adicional:"}</p>
                <div className="flex flex-wrap gap-2">
                  {optionGroup.split(",").map((option) => {
                    const opt = option.trim();
                    const parts = optionDraft ? optionDraft.split(", ") : [];
                    const isOn = parts.includes(opt);
                    return (
                      <Button
                        key={opt}
                        variant={isOn ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOptionDraft((isOn ? parts.filter((p) => p !== opt) : [...parts, opt]).join(", "))}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            {optionDraft && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selección:</p>
                <p className="text-sm">{optionDraft}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentHardware(null)}>Cancelar</Button>
              <Button
                onClick={() =>
                  currentHardware &&
                  selectMutation.mutate({ projectId, hardwareId: currentHardware.id, selectedOption: optionDraft })
                }
                disabled={!optionDraft || selectMutation.isPending}
              >
                {selectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Foto ampliada ── */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {photoPreview && <img src={photoPreview} alt="Vista previa" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
