import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QuotationVersion {
  id: number;
  versionNumber: number;
  quotationNumber: string;
  total: string | number;
  createdAt: Date | string;
  status?: string;
  isAdditional?: boolean;
}

interface QuotationVersionHistoryProps {
  versions: QuotationVersion[];
  currentQuotationId: number;
  onVersionActivated?: () => void;
}

export function QuotationVersionHistory({
  versions,
  currentQuotationId,
  onVersionActivated,
}: QuotationVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const setActiveVersionMutation = trpc.quotationsVersioning.setActiveVersion.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Versión activada correctamente");
      setShowConfirmDialog(false);
      setSelectedVersion(null);
      onVersionActivated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Error al activar versión");
    },
  });

  const handleActivateVersion = (versionId: number) => {
    setSelectedVersion(versionId);
    setShowConfirmDialog(true);
  };

  const confirmActivation = () => {
    if (selectedVersion) {
      setActiveVersionMutation.mutate({
        quotationId: selectedVersion,
      });
    }
  };

  // Si solo hay una versión, no mostrar nada
  if (versions.length <= 1) {
    return null;
  }

  // Ordenar versiones por número de versión (descendente)
  const sortedVersions = [...versions].sort(
    (a, b) => (b.versionNumber || 0) - (a.versionNumber || 0)
  );

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            Historial de Versiones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedVersions.map((version) => {
            const isActive = version.id === currentQuotationId;
            const formattedDate = new Date(version.createdAt).toLocaleDateString(
              "es-CO",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            );

            return (
              <div
                key={version.id}
                className={`flex items-center justify-between p-2 rounded border ${
                  isActive
                    ? "bg-green-100 border-green-300"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium text-sm">
                      V{version.versionNumber}
                    </span>
                    <span className="text-xs text-gray-500">
                      {version.quotationNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                    <span>${Number(version.total).toLocaleString("es-CO")}</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 text-xs"
                    onClick={() => handleActivateVersion(version.id)}
                    disabled={setActiveVersionMutation.isPending}
                  >
                    {setActiveVersionMutation.isPending ? "..." : "Activar"}
                  </Button>
                )}
                {isActive && (
                  <span className="text-xs font-semibold text-green-600 ml-2">
                    Activa
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activar versión anterior</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas activar esta versión? El monto de la
              cotización se actualizará al precio de esta versión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-900">
              Esta acción es reversible. Puedes volver a cambiar a otra versión
              en cualquier momento.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActivation}
              disabled={setActiveVersionMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {setActiveVersionMutation.isPending ? "Activando..." : "Activar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
