import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Check, X, Image as ImageIcon, ChefHat, Shirt, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HardwareSelectorProps {
  projectId: number;
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

export function HardwareSelector({ projectId, readOnly = false }: HardwareSelectorProps) {
  const [activeTab, setActiveTab] = useState<"cocinas" | "closets" | "puertas">("cocinas");
  const [selectedOption, setSelectedOption] = useState<{ hardwareId: number; option: string } | null>(null);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [currentHardware, setCurrentHardware] = useState<HardwareItem | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: catalog, isLoading: catalogLoading } = trpc.hardwareCatalog.list.useQuery({});
  const { data: selections, isLoading: selectionsLoading, refetch: refetchSelections } = trpc.projectMaterials.getSelectedHardware.useQuery({ projectId });

  const selectMutation = trpc.projectMaterials.selectHardware.useMutation({
    onSuccess: () => {
      toast.success("Herraje seleccionado");
      refetchSelections();
      setShowOptionsDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al seleccionar herraje");
    },
  });

  const removeMutation = trpc.projectMaterials.removeHardware.useMutation({
    onSuccess: () => {
      toast.success("Herraje removido");
      refetchSelections();
    },
    onError: (error) => {
      toast.error(error.message || "Error al remover herraje");
    },
  });

  const isSelected = (hardwareId: number) => {
    return selections?.some(s => s.hardwareId === hardwareId);
  };

  const getSelection = (hardwareId: number) => {
    return selections?.find(s => s.hardwareId === hardwareId);
  };

  const handleToggle = (hardware: HardwareItem) => {
    if (readOnly) return;

    if (isSelected(hardware.id)) {
      removeMutation.mutate({ projectId, hardwareId: hardware.id });
    } else {
      // If has options, show dialog
      if (hardware.options && hardware.options.includes(",")) {
        setCurrentHardware(hardware);
        setSelectedOption({ hardwareId: hardware.id, option: "" });
        setShowOptionsDialog(true);
      } else {
        // Direct selection
        selectMutation.mutate({
          projectId,
          hardwareId: hardware.id,
          selectedOption: hardware.options || undefined,
        });
      }
    }
  };

  const handleSelectWithOption = () => {
    if (!currentHardware || !selectedOption) return;
    selectMutation.mutate({
      projectId,
      hardwareId: currentHardware.id,
      selectedOption: selectedOption.option,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cocinas": return <ChefHat className="h-4 w-4" />;
      case "closets": return <Shirt className="h-4 w-4" />;
      case "puertas": return <DoorOpen className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredCatalog = catalog?.filter(item => item.category === activeTab) || [];
  const selectedCount = {
    cocinas: selections?.filter(s => s.hardware.category === "cocinas").length || 0,
    closets: selections?.filter(s => s.hardware.category === "closets").length || 0,
    puertas: selections?.filter(s => s.hardware.category === "puertas").length || 0,
  };

  if (catalogLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cocinas" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Cocinas
            {selectedCount.cocinas > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                {selectedCount.cocinas}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closets" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Closets
            {selectedCount.closets > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                {selectedCount.closets}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="puertas" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Puertas
            {selectedCount.puertas > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                {selectedCount.puertas}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {["cocinas", "closets", "puertas"].map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog?.filter(item => item.category === category).map((hardware) => {
                const selected = isSelected(hardware.id);
                const selection = getSelection(hardware.id);

                return (
                  <Card
                    key={hardware.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selected && "ring-2 ring-primary bg-primary/5",
                      readOnly && "cursor-default"
                    )}
                    onClick={() => handleToggle(hardware)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Photo or placeholder */}
                        <div 
                          className={cn(
                            "w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden",
                            hardware.photoUrl ? "bg-white" : "bg-muted"
                          )}
                          onClick={(e) => {
                            if (hardware.photoUrl) {
                              e.stopPropagation();
                              setPhotoPreview(hardware.photoUrl);
                            }
                          }}
                        >
                          {hardware.photoUrl ? (
                            <img 
                              src={hardware.photoUrl} 
                              alt={hardware.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{hardware.name}</h4>
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                              selected ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {selected ? <Check className="h-4 w-4" /> : null}
                            </div>
                          </div>
                          {hardware.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {hardware.description}
                            </p>
                          )}
                          {selection?.selectedOption && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {selection.selectedOption}
                            </Badge>
                          )}
                          {hardware.options && !selected && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Opciones disponibles
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredCatalog.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay herrajes en esta categoría
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar opción para {currentHardware?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentHardware?.options?.split("|").map((optionGroup, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {groupIndex === 0 ? "Opciones:" : "Adicional:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {optionGroup.split(",").map((option) => {
                    const trimmedOption = option.trim();
                    const isOptionSelected = selectedOption?.option.includes(trimmedOption);
                    return (
                      <Button
                        key={trimmedOption}
                        variant={isOptionSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (!selectedOption) return;
                          let newOption = selectedOption.option;
                          if (isOptionSelected) {
                            newOption = newOption.replace(trimmedOption, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "");
                          } else {
                            newOption = newOption ? `${newOption}, ${trimmedOption}` : trimmedOption;
                          }
                          setSelectedOption({ ...selectedOption, option: newOption });
                        }}
                      >
                        {trimmedOption}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            {selectedOption?.option && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selección:</p>
                <p className="text-sm">{selectedOption.option}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOptionsDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSelectWithOption}
                disabled={!selectedOption?.option || selectMutation.isPending}
              >
                {selectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Summary */}
      {selections && selections.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Herrajes Seleccionados ({selections.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selections.map((selection) => (
                <div 
                  key={selection.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(selection.hardware.category)}
                    <span className="font-medium text-sm">{selection.hardware.name}</span>
                    {selection.selectedOption && (
                      <Badge variant="outline" className="text-xs">
                        {selection.selectedOption}
                      </Badge>
                    )}
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMutation.mutate({ projectId, hardwareId: selection.hardwareId })}
                      disabled={removeMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
