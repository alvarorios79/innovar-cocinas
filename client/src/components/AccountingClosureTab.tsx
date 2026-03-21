"use client";

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

  // Calculate totals for preview
  const previewTotals = useMemo(() => {
    if (!pendingProjects) return { sales: 0, expenses: 0, profit: 0 };

    const selected = pendingProjects.filter((p) =>
      selectedProjects.includes(p.projectId)
    );

    let sales = 0;
    let expenses = 0;

    selected.forEach((project) => {
      const amount = project.totalAmount
        ? parseFloat(project.totalAmount.toString())
        : 0;
      sales += amount;
      // Note: expenses would need to be calculated from the database
    });

    return {
      sales,
      expenses,
      profit: sales - expenses,
    };
  }, [pendingProjects, selectedProjects]);

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
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
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
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Cierre
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
          className="rounded-none border-b-2 border-transparent"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Historial
        </Button>
      </div>

      {/* CREATE TAB */}
      {activeTab === "create" && (
        <div className="space-y-6">
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
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedProjects.includes(project.projectId)}
                        onCheckedChange={() => handleToggleProject(project.projectId)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{project.projectName}</p>
                        <p className="text-sm text-gray-600">
                          Cliente: {project.clientName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${parseFloat(project.totalAmount?.toString() || "0").toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview and Submit */}
          {selectedProjects.length > 0 && (
            <Card className="bg-teal-50 border-teal-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  Resumen del Cierre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Ventas Totales</p>
                    <p className="text-2xl font-bold text-teal-600">
                      ${Number(previewTotals.sales).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Gastos Totales</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${Number(previewTotals.expenses).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Ganancia Neta</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${Number(previewTotals.profit).toFixed(2)}
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
              <Card key={closure.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Período: {new Date(closure.periodStart).toLocaleDateString()} -{" "}
                        {new Date(closure.periodEnd).toLocaleDateString()}
                      </CardTitle>
                      <CardDescription>
                        {closure.projectCount} proyecto
                        {closure.projectCount !== 1 ? "s" : ""} incluido
                        {closure.projectCount !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    {getStatusBadge(closure.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ventas</p>
                      <p className="text-xl font-bold text-teal-600">
                        ${Number(closure.totalSales).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gastos</p>
                      <p className="text-xl font-bold text-orange-600">
                        ${Number(closure.totalExpenses).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ganancia</p>
                      <p className="text-xl font-bold text-green-600">
                        ${Number(closure.totalProfit).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {closure.status === "draft" && (
                    <Button
                      onClick={() => {
                        setSelectedClosureId(closure.id);
                        setShowConfirmDialog(true);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Cierre
                    </Button>
                  )}

                  {closure.status === "confirmed" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Lock className="h-4 w-4" />
                        <span>Cierre confirmado y bloqueado</span>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedClosureId(closure.id);
                          setShowRevertDialog(true);
                        }}
                        variant="outline"
                        className="w-full text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revertir Cierre
                      </Button>
                    </div>
                  )}
                </CardContent>
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
              ¿Estás seguro de que deseas confirmar este cierre? Una vez confirmado, no podrá ser
              editado.
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
              ¿Estás seguro de que deseas revertir este cierre? Los proyectos volverán a estar
              archivados y serán elegibles para un nuevo cierre. Esta acción no se puede deshacer
              fácilmente.
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
              disabled={revertClosure.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {revertClosure.isPending ? (
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
