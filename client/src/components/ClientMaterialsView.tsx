import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Image as ImageIcon, ChefHat, Shirt, DoorOpen, TreePine, Square, Droplets, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientMaterialsViewProps {
  projectId: number;
}

export function ClientMaterialsView({ projectId }: ClientMaterialsViewProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: materials, isLoading: materialsLoading } = trpc.projectMaterials.get.useQuery({ projectId });
  const { data: selections, isLoading: selectionsLoading } = trpc.projectMaterials.getSelectedHardware.useQuery({ projectId });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cocinas": return <ChefHat className="h-4 w-4" />;
      case "closets": return <Shirt className="h-4 w-4" />;
      case "puertas": return <DoorOpen className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "cocinas": return "Cocinas";
      case "closets": return "Closets";
      case "puertas": return "Puertas";
      default: return category;
    }
  };

  if (materialsLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasMaterials = materials && (materials.woodType || materials.countertopType || materials.sinkMeasure);
  
  // Filter out items without hardware first
  const selectionsToDisplay = selections?.filter((s: any) => s.hardwareCategory) || [];
  const hasHardware = selectionsToDisplay && selectionsToDisplay.length > 0;

  if (!hasMaterials && !hasHardware) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aún no se han definido los materiales para este proyecto.</p>
        <p className="text-sm mt-2">El equipo de INNOVAR está trabajando en la selección de materiales.</p>
      </div>
    );
  }

  // Group hardware by category
  type SelectionItem = NonNullable<typeof selections>[number];
  const hardwareByCategory = selectionsToDisplay.reduce((acc: Record<string, SelectionItem[]>, selection: SelectionItem) => {
    const category = selection.hardwareCategory || 'sin-categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(selection);
    return acc;
  }, {} as Record<string, SelectionItem[]>);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Materiales Base */}
      {hasMaterials && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Square className="h-5 w-5" />
              Materiales Seleccionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Madera */}
            {materials.woodType && (
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {materials.woodPhotoUrl ? (
                    <img 
                      src={materials.woodPhotoUrl} 
                      alt="Madera" 
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setPhotoPreview(materials.woodPhotoUrl)}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <TreePine className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-amber-600" />
                    Madera
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Tipo:</span> {materials.woodType === "rh" ? "RH (Resistente a Humedad)" : "Estándar"}
                  </p>
                  {materials.woodColor && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Color:</span> {materials.woodColor}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mesón */}
            {materials.countertopType && (
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {materials.countertopPhotoUrl ? (
                    <img 
                      src={materials.countertopPhotoUrl} 
                      alt="Mesón" 
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setPhotoPreview(materials.countertopPhotoUrl)}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <Square className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium flex items-center gap-2">
                    <Square className="h-4 w-4 text-gray-600" />
                    Mesón
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Tipo:</span> {
                      materials.countertopType === "granito" ? "Granito" :
                      materials.countertopType === "cuarzo" ? "Cuarzo" :
                      materials.countertopType === "sinterizado" ? "Sinterizado" :
                      materials.countertopType
                    }
                  </p>
                  {materials.countertopName && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Referencia:</span> {materials.countertopName}
                    </p>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Herrajes */}
      {hasHardware && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Herrajes Incluidos
              <Badge variant="secondary" className="ml-2">{selections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(Object.entries(hardwareByCategory || {}) as [string, SelectionItem[]][]).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
                  {getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                  <Badge variant="outline" className="ml-1">{items?.length}</Badge>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items?.map((selection) => (
                    <div 
                      key={selection.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      {/* Photo or placeholder */}
                      <div 
                        className={cn(
                          "w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden",
                          "bg-muted"
                        )}
                      >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm">{selection.hardwareName}</h5>
                        {selection.hardwarePrice && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${selection.hardwarePrice}
                          </p>
                        )}
                        {selection.selectedOption && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {selection.selectedOption}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
