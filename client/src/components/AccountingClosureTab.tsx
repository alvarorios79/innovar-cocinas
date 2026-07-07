
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function AccountingClosureTab() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClosureId, setSelectedClosureId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Queries
  const { data: pendingProjects, isLoading: loadingPending } =
    trpc.accountingClosures.getPendingProjects.useQuery();
  const { data: closures, isLoading: loadingClosures } =
    trpc.accountingClosures.list.useQuery({});
  const { data: closureDetails } = trpc.accountingClosures.getDetails.useQuery(
    { closureId: selectedClosureId || 0 },
    { enabled: !!selectedClosureId }
  );
  const { data: previewData, isLoading: loadingPreview } =
    trpc.accountingClosures.calculatePreview.useQuery(
      { projectIds: selectedProjects },
      { enabled: selectedProjects.length > 0 }
    );

  // Mutations
  const createClosure = trpc.accountingClosures.create.useMutation({
    onSuccess: (data) => {
      toast.success("✅ Cierre contable creado exitosamente");
      utils.accountingClosures.getPendingProjects.invalidate();
      utils.accountingClosures.list.invalidate();
      // Reset form
      setPeriodStart("");
      setPeriodEnd("");
      setSelectedProjects([]);
      setShowPreview(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const confirmClosure = trpc.accountingClosures.confirm.useMutation({
    onSuccess: () => {
      toast.success("✅ Cierre contable confirmado");
      utils.accountingClosures.list.invalidate();
      setSelectedClosureId(null);
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const revertClosure = trpc.accountingClosures.revert.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Cierre revertido. ${data.projectsUnlinked} proyectos desvinculados`);
      utils.accountingClosures.list.invalidate();
      setSelectedClosureId(null);
      setShowRevertDialog(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Use real preview data from backend
  const previewTotals = useMemo(() => {
    if (!previewData) {
      return {
        totalSales: 0,
        totalProjectExpenses: 0,
        totalOperationalExpenses: 0,
        totalExpenses: 0,
        totalProfit: 0,
      };
    }
    return previewData;
  }, [previewData]);

  const handleCreateClosure = async () => {
    // Validations
    if (!periodStart) {
      toast.error("Ingresa la fecha de inicio");
      return;
    }

    if (!periodEnd) {
      toast.error("Ingresa la fecha de fin");
      return;
    }

    if (new Date(periodStart) >= new Date(periodEnd)) {
      toast.error("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    if (selectedProjects.length === 0) {
      toast.error("Selecciona al menos un proyecto");
      return;
    }

    setIsSubmitting(true);

    try {
      await createClosure.mutateAsync({
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        projectIds: selectedProjects,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProject = (projectId: number) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleConfirmClosure = async () => {
    if (!selectedClosureId) return;

    setIsSubmitting(true);
    try {
      await confirmClosure.mutateAsync({ closureId: selectedClosureId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return (
        <Badge className="bg-green-500/15 text-green-300 hover:bg-green-500/15">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/15">
        <AlertCircle className="h-3 w-3 mr-1" />
        Borrador
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* TAB Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "create" ? "default" : "ghost"}
          onClick={() => setActiveTab("create")}
          className="rounded-none border-b-2 border-transparent"
          style={
            activeTab === "create"
              ? { borderBottomColor: "rgb(13, 148, 136)" }
              : {}
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Cierre
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
          className="rounded-none border-b-2 border-transparent"
          style={
            activeTab === "history"
              ? { borderBottomColor: "rgb(13, 148, 136)" }
              : {}
          }
        >
          <Lock className="h-4 w-4 mr-2" />
          Historial
        </Button>
      </div>

      {/* CREATE TAB */}
      {activeTab === "create" && (
        <div className="space-y-4">
          {/* Period Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Período de Cierre</CardTitle>
              <CardDescription>
                Selecciona el rango de fechas para el cierre contable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart">Fecha de Inicio *</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="periodEnd">Fecha de Fin *</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Proyectos a Cerrar</CardTitle>
              <CardDescription>
                Selecciona los proyectos archivados y entregados para incluir en este cierre
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                </div>
              ) : !pendingProjects || pendingProjects.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay proyectos disponibles para cerrar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingProjects.map((project) => (
                    <div
                      key={project.projectId}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-white/[0.03] transition"
                    >
                      <Checkbox
                        checked={selectedProjects.includes(project.projectId)}
                        onCheckedChange={() => handleToggleProject(project.projectId)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{project.projectName}</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Cliente: {project.clientName}
                        </p>
                        {/* Desglose de precios NETO */}
                        <div className="mt-2 text-xs space-y-1 bg-white/[0.03] p-3 rounded border border-white/[0.10]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Precio Original:</span>
                            <span className="font-semibold">
                              ${parseFloat(project.originalPrice?.toString() || "0").toFixed(2)}
                            </span>
                          </div>
                          {parseFloat(project.discountsApplied?.toString() || "0") > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>- Descuentos:</span>
                              <span className="font-semibold">
                                -${parseFloat(project.discountsApplied?.toString() || "0").toFixed(2)}
                              </span>
                            </div>
                          )}
                          {parseFloat(project.surchargesApplied?.toString() || "0") > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>+ Recargos:</span>
                              <span className="font-semibold">
                                +${parseFloat(project.surchargesApplied?.toString() || "0").toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between font-bold text-teal-700 bg-teal-500/10 p-2 rounded">
                            <span>💰 PRECIO NETO:</span>
                            <span>
                              ${parseFloat(project.netPrice?.toString() || "0").toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview and Submit */}
          {selectedProjects.length > 0 && (
            <Card className="bg-teal-500/10 border-teal-500/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  Resumen del Cierre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#162828] p-4 rounded-lg border border-teal-500/25">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">💰 Desglose de Ingresos</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio de Cotización Original:</span>
                      <span className="font-semibold">-</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Menos: Descuentos Aplicados</span>
                      <span className="font-semibold">-</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Más: Recargos Aplicados</span>
                      <span className="font-semibold">-</span>
                    </div>
                    <div className="border-t border-white/[0.10] pt-2 mt-2 flex justify-between font-bold text-teal-700">
                      <span>= PRECIO NETO (Dinero Real):</span>
                      <span>${Number(previewTotals.totalSales).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ventas Netas</p>
                    <p className="text-2xl font-bold text-teal-600">
                      ${Number(previewTotals.totalSales).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gastos Totales</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${Number(previewTotals.totalExpenses).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${Number(previewTotals.totalProfit).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateClosure}
                    disabled={isSubmitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Cierre Contable
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loadingClosures ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : !closures || closures.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay cierres contables registrados</p>
              </CardContent>
            </Card>
          ) : (
            closures.map((closure) => (
              <Card key={closure.id} className="cursor-pointer hover:shadow-md transition">
                <CardHeader
                  onClick={() => setSelectedClosureId(closure.id)}
                  className="pb-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Cierre {closure.periodStart} a {closure.periodEnd}
                      </CardTitle>
                      <CardDescription>
                        {closure.projectCount} proyectos • {closure.createdAt}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(closure.status)}
                    </div>
                  </div>
                </CardHeader>

                {selectedClosureId === closure.id && closureDetails && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-teal-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ventas Totales</p>
                        <p className="text-2xl font-bold text-teal-600">
                          ${Number(closureDetails.totalSales).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-orange-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Gastos Totales</p>
                        <p className="text-2xl font-bold text-orange-600">
                          ${Number(closureDetails.totalExpenses).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${Number(closureDetails.totalProfit).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {closure.status === "draft" && (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowConfirmDialog(true)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirmar Cierre
                        </Button>
                        <Button
                          onClick={() => setShowRevertDialog(true)}
                          variant="outline"
                          className="flex-1"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Revertir
                        </Button>
                      </div>
                    )}

                    {closure.status === "confirmed" && (
                      <div className="bg-green-500/10 border border-green-500/25 p-4 rounded-lg">
                        <p className="text-sm text-green-300">
                          ✅ Este cierre ha sido confirmado y no puede ser modificado.
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cierre Contable</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas confirmar este cierre contable? Esta acción no puede ser
              revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClosure}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revertir Cierre Contable</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas revertir este cierre contable? Los proyectos serán desvinculados y podrán
              incluirse en un nuevo cierre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedClosureId) {
                  revertClosure.mutate({ closureId: selectedClosureId });
                }
              }}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revirtiendo...
                </>
              ) : (
                "Revertir"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
