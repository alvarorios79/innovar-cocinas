import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Lock, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface QuotationVersioningProps {
  quotationId: number;
  quotationNumber: string;
  status: string;
  isLocked: boolean;
  versionNumber: number;
  baseQuotationId?: number | null;
  parentQuotationId?: number | null;
  isAdditional: boolean;
}

export function QuotationVersioning({
  quotationId,
  quotationNumber,
  status,
  isLocked,
  versionNumber,
  baseQuotationId,
  parentQuotationId,
  isAdditional,
}: QuotationVersioningProps) {
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedVersionForAction, setSelectedVersionForAction] = useState<{ id: number; versionNumber: number; action: 'activate' | 'delete' } | null>(null);
  const utils = trpc.useUtils();

  // Obtener cadena de versiones
  const { data: versionChainData } = trpc.quotationsVersioning.getVersionChain.useQuery(
    { quotationId },
    { enabled: !!quotationId }
  );
  const versionChain = versionChainData?.versions ?? [];

  // Crear nueva versión
  const createVersion = trpc.quotationsVersioning.createVersion.useMutation({
    onSuccess: () => {
      toast.success("Nueva versión creada exitosamente");
      setShowVersionDialog(false);
      utils.quotations.list.invalidate();
      utils.quotations.listPaginated.invalidate();
      utils.quotationsVersioning.getVersionChain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear la versión");
    },
  });

  const handleCreateVersion = () => {
    createVersion.mutate({ quotationId });
  };

  // Activar versión anterior
  const setActiveVersion = trpc.quotationsVersioning.setActiveVersion.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedVersionForAction(null);
      utils.quotations.list.invalidate();
      utils.quotations.listPaginated.invalidate();
      utils.quotationsVersioning.getVersionChain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al activar versión");
    },
  });

  // Eliminar versión
  const deleteVersion = trpc.quotationsVersioning.deleteVersion.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedVersionForAction(null);
      utils.quotations.list.invalidate();
      utils.quotations.listPaginated.invalidate();
      utils.quotationsVersioning.getVersionChain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar versión");
    },
  });

  const handleVersionAction = () => {
    if (!selectedVersionForAction) return;
    
    if (selectedVersionForAction.action === 'activate') {
      setActiveVersion.mutate({ quotationId: selectedVersionForAction.id });
    } else if (selectedVersionForAction.action === 'delete') {
      deleteVersion.mutate({ quotationId: selectedVersionForAction.id });
    }
  };

  // Verificar si puede crear versión: solo si está aprobada y no bloqueada
  const canCreateVersion = status === "approved" && !isLocked;

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Copy className="h-4 w-4 text-blue-600" />
              Versionado de Cotización
            </CardTitle>
            {isLocked && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Bloqueada
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Información de versión actual */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Versión actual:</span>
              <p className="font-semibold text-blue-700">v{versionNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>
              <p className="font-semibold">{isAdditional ? "Adicional" : "Base"}</p>
            </div>
          </div>

          {/* Listado de versiones */}
          {versionChain && versionChain.length > 0 && (
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs font-medium text-muted-foreground mb-2">Historial de versiones:</p>
              <div className="space-y-2">
                {versionChain.map((version: any, index: number) => {
                  const isActive = version.id === quotationId;
                  const isBase = index === 0;
                  return (
                    <div key={version.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isActive ? "default" : "outline"}
                          className={
                            isActive
                              ? "bg-blue-600 text-white"
                              : "border-blue-200 text-blue-700"
                          }
                        >
                          v{version.versionNumber}
                          {isActive && " (vigente)"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ${Number(version.total || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {!isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                            title="Activar esta versión"
                            onClick={() => setSelectedVersionForAction({ id: version.id, versionNumber: version.versionNumber, action: 'activate' })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {!isBase && !isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                            title="Eliminar esta versión"
                            onClick={() => setSelectedVersionForAction({ id: version.id, versionNumber: version.versionNumber, action: 'delete' })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botón crear versión */}
          <Button
            size="sm"
            variant={canCreateVersion ? "default" : "outline"}
            className={canCreateVersion ? "bg-blue-600 hover:bg-blue-700 text-white w-full" : "w-full opacity-50"}
            onClick={() => setShowVersionDialog(true)}
            disabled={!canCreateVersion || createVersion.isPending}
            title={
              !canCreateVersion
                ? "Solo se pueden crear versiones de cotizaciones aprobadas y desbloqueadas"
                : "Crear nueva versión de esta cotización"
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {createVersion.isPending ? "Creando..." : "Crear Nueva Versión"}
          </Button>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para crear versión */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Versión</DialogTitle>
            <DialogDescription>
              Se creará una nueva versión de la cotización {quotationNumber}. La versión actual será v{versionNumber} y la nueva será v{versionNumber + 1}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground">
              • Se copiarán todos los items de la cotización actual
            </p>
            <p className="text-sm text-muted-foreground">
              • La nueva versión será marcada como "Adicional"
            </p>
            <p className="text-sm text-muted-foreground">
              • Ambas versiones tendrán la misma cotización base como referencia
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={createVersion.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createVersion.isPending ? "Creando..." : "Crear Versión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar acción */}
      <AlertDialog open={!!selectedVersionForAction} onOpenChange={(open) => !open && setSelectedVersionForAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedVersionForAction?.action === 'activate' ? 'Activar Versión' : 'Eliminar Versión'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedVersionForAction?.action === 'activate' 
                ? `¿Estás seguro de que deseas activar la versión V${selectedVersionForAction?.versionNumber}? El proyecto se vinculará a esta versión.`
                : `¿Estás seguro de que deseas eliminar la versión V${selectedVersionForAction?.versionNumber}? Esta acción no se puede deshacer.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVersionAction}
              disabled={setActiveVersion.isPending || deleteVersion.isPending}
              className={selectedVersionForAction?.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {setActiveVersion.isPending || deleteVersion.isPending 
                ? 'Procesando...' 
                : selectedVersionForAction?.action === 'activate' ? 'Activar' : 'Eliminar'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
