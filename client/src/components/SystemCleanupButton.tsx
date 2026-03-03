import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

export function SystemCleanupButton() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<any>(null);

  const cleanupMutation = trpc.system.cleanupData.useMutation({
    onSuccess: (data) => {
      setCleanupResults(data);
      setShowResults(true);
      setConfirmText("");
      toast.success("Limpieza completada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error durante la limpieza");
      setConfirmText("");
    },
  });

  const handleOpenDialog = () => {
    setShowConfirmDialog(true);
    setShowResults(false);
    setCleanupResults(null);
  };

  const handleExecuteCleanup = () => {
    if (confirmText !== "CONFIRMAR") {
      toast.error('Debes escribir exactamente "CONFIRMAR" para proceder');
      return;
    }
    cleanupMutation.mutate();
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpenDialog}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Ejecutar Limpieza del Sistema
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Limpieza del Sistema
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los registros marcados como "system" (dataOrigin = 'system'). 
              Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>

          {!showResults ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                <p className="text-sm text-red-900">
                  <strong>Advertencia:</strong> Se eliminarán todos los registros del sistema que fueron creados automáticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-text" className="text-red-700 font-semibold">
                  Escribe "CONFIRMAR" para proceder:
                </Label>
                <Input
                  id="confirm-text"
                  placeholder="CONFIRMAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  className="border-red-300"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setConfirmText("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleExecuteCleanup}
                  disabled={cleanupMutation.isPending || confirmText !== "CONFIRMAR"}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {cleanupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Limpiando...
                    </>
                  ) : (
                    "Ejecutar Limpieza"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                <p className="text-sm text-green-900 font-semibold">
                  ✅ Limpieza completada exitosamente
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usuarios eliminados:</span>
                  <span className="font-semibold">{cleanupResults?.usersDeleted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Clientes eliminados:</span>
                  <span className="font-semibold">{cleanupResults?.clientsDeleted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Proyectos eliminados:</span>
                  <span className="font-semibold">{cleanupResults?.projectsDeleted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cotizaciones eliminadas:</span>
                  <span className="font-semibold">{cleanupResults?.quotationsDeleted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Citas eliminadas:</span>
                  <span className="font-semibold">{cleanupResults?.appointmentsDeleted || 0}</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setShowResults(false);
                  setCleanupResults(null);
                }}
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
