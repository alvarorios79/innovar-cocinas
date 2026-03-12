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
  showOnlySelected?: boolean;
}

interface HardwareItem {
  id: number;
  category: string;
  name: string;
  description: string | null;
  options: string | null;
  photoUrl: string | null;
}

export function HardwareSelector({ projectId, readOnly = false, showOnlySelected = false }: HardwareSelectorProps) {
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

  const filteredCatalog = catalog?.filter((item: any) => item.category === activeTab) || [];
  const selectedCount = {
    cocinas: selections?.filter((s: any) => s?.hardwareCategory === "cocinas").length || 0,
    closets: selections?.filter((s: any) => s?.hardwareCategory === "closets").length || 0,
    puertas: selections?.filter((s: any) => s?.hardwareCategory === "puertas").length || 0,
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
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="cocinas" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Cocinas</span>
            <span className="sm:hidden">Coc.</span>
            {selectedCount.cocinas > 0 && (
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 bg-primary text-primary-foreground text-xs px-1.5">
                {selectedCount.cocinas}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closets" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Shirt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Closets</span>
            <span className="sm:hidden">Clos.</span>
            {selectedCount.closets > 0 && (
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 bg-primary text-primary-foreground text-xs px-1.5">
                {selectedCount.closets}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="puertas" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Puertas</span>
            <span className="sm:hidden">Ptas.</span>
            {selectedCount.puertas > 0 && (
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 bg-primary text-primary-foreground text-xs px-1.5">
                {selectedCount.puertas}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {["cocinas", "closets", "puertas"].map((category) => {
          // Si showOnlySelected, filtrar solo los herrajes seleccionados
          const itemsToShow = showOnlySelected 
            ? catalog?.filter((item: any) => item.category === category && isSelected(item.id))
            : catalog?.filter((item: any) => item.category === category);
          
          return (
          <TabsContent key={category} value={category} className="mt-4">
            {showOnlySelected && (!itemsToShow || itemsToShow.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay herrajes seleccionados en esta categoría</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {itemsToShow?.map((hardware: any) => {
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
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center text-center">
                        {/* Photo or placeholder */}
                        <div 
                          className={cn(
                            "w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden mb-3",
                            hardware.photoUrl ? "bg-white border" : "bg-muted"
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
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="w-full">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm leading-tight">{hardware.name}</h4>
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                              selected ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {selected ? <Check className="h-3 w-3" /> : null}
                            </div>
                          </div>
                          {hardware.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {hardware.description}
                            </p>
                          )}
                          {selection?.selectedOption && (
                            <Badge variant="outline" className="text-xs">
                              {selection.selectedOption}
                            </Badge>
                          )}
                          {hardware.options && !selected && (
                            <p className="text-xs text-muted-foreground italic">
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
            )}
          </TabsContent>
        );
        })}
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
                    {getCategoryIcon((selection as any)?.hardwareCategory)}
                    <span className="font-medium text-sm">{(selection as any)?.hardwareName}</span>
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
