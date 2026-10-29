import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Plus,
  DollarSign,
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
import { Checkbox } from "@/components/ui/checkbox";

// Formatea números en formato colombiano: $1.234.567,89
const fmt = (n: number | string | undefined | null) =>
  parseFloat(n?.toString() || "0").toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function AccountingClosureTab() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClosureId, setSelectedClosureId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertReason, setRevertReason] = useState("");

  // Queries
  const { data: pendingProjects, isLoading: loadingPending } =
    trpc.accountingClosures.getPendingProjects.useQuery();
  const { data: closures, isLoading: loadingClosures } =
    trpc.accountingClosures.list.useQuery({});
  const { data: closureDetails } = trpc.accountingClosures.getDetails.useQuery(
    { closureId: selectedClosureId || 0 },
    { enabled: !!selectedClosureId }
  );
  const { data: previewData } =
    trpc.accountingClosures.calculatePreview.useQuery(
      { projectIds: selectedProjects },
      { enabled: selectedProjects.length > 0 }
    );

  // Mutations
  const createClosure = trpc.accountingClosures.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Cierre contable creado exitosamente");
      utils.accountingClosures.getPendingProjects.invalidate();
      utils.accountingClosures.list.invalidate();
      setPeriodStart("");
      setPeriodEnd("");
      setSelectedProjects([]);
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

  const revertClosure = trpc.accountingClosures.revert.useMutation({
    onSuccess: (data: any) => {
      toast.success(`✅ Cierre revertido. ${data.projectsUnlinked} proyectos desvinculados`);
      utils.accountingClosures.list.invalidate();
      utils.accountingClosures.getPendingProjects.invalidate();
      setSelectedClosureId(null);
      setShowRevertDialog(false);
      setRevertReason("");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const previewTotals = useMemo(() => {
    if (!previewData) {
      return { totalSales: 0, totalProjectExpenses: 0, totalOperationalExpenses: 0, totalExpenses: 0, totalProfit: 0 };
    }
    return previewData;
  }, [previewData]);

  // Select All
  const allProjectIds = (pendingProjects || []).map((p) => p.projectId);
  const allSelected = allProjectIds.length > 0 && allProjectIds.every((id) => selectedProjects.includes(id));
  const someSelected = allProjectIds.some((id) => selectedProjects.includes(id)) && !allSelected;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(allProjectIds);
    }
  };

  const handleToggleProject = (projectId: number) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleCreateClosure = async () => {
    if (!periodStart) { toast.error("Ingresa la fecha de inicio"); return; }
    if (!periodEnd) { toast.error("Ingresa la fecha de fin"); return; }
    if (new Date(periodStart) >= new Date(periodEnd)) { toast.error("La fecha de inicio debe ser anterior a la fecha de fin"); return; }
    if (selectedProjects.length === 0) { toast.error("Selecciona al menos un proyecto"); return; }
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

  const handleConfirmClosure = async () => {
    if (!selectedClosureId) return;
    setIsSubmitting(true);
    try {
      await confirmClosure.mutateAsync({ closureId: selectedClosureId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertClosure = async () => {
    if (!selectedClosureId) return;
    if (revertReason.trim().length < 10) {
      toast.error("Ingresa un motivo de al menos 10 caracteres");
      return;
    }
    revertClosure.mutate({ closureId: selectedClosureId, reason: revertReason.trim() });
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
          style={activeTab === "create" ? { borderBottomColor: "rgb(13, 148, 136)" } : {}}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Cierre
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
          className="rounded-none border-b-2 border-transparent"
          style={activeTab === "history" ? { borderBottomColor: "rgb(13, 148, 136)" } : {}}
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
              <CardDescription>Selecciona el rango de fechas para el cierre contable</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart">Fecha de Inicio *</Label>
                  <Input id="periodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label htmlFor="periodEnd">Fecha de Fin *</Label>
                  <Input id="periodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Proyectos a Cerrar</CardTitle>
              <CardDescription>Selecciona los proyectos archivados y entregados para incluir en este cierre</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
                </div>
              ) : !pendingProjects || pendingProjects.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay proyectos disponibles para cerrar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All row */}
                  <div
                    className="flex items-center gap-3 p-3 border rounded-lg bg-teal-500/10 border-teal-500/30 cursor-pointer"
                    onClick={handleToggleAll}
                  >
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleToggleAll}
                      className="border-teal-400 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      style={{ width: 20, height: 20 }}
                    />
                    <span className="font-semibold text-teal-300 text-sm">
                      {allSelected ? "Deseleccionar todos" : someSelected ? `${selectedProjects.length} seleccionados — Seleccionar todos` : `Seleccionar todos (${allProjectIds.length})`}
                    </span>
                  </div>

                  {pendingProjects.map((project) => {
                    const isChecked = selectedProjects.includes(project.projectId);
                    return (
                      <div
                        key={project.projectId}
                        className={`flex items-start gap-3 p-4 border rounded-lg transition cursor-pointer ${
                          isChecked
                            ? "border-teal-500/60 bg-teal-500/10"
                            : "border-white/10 hover:bg-white/[0.03]"
                        }`}
                        onClick={() => handleToggleProject(project.projectId)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleProject(project.projectId)}
                          className="mt-1 border-teal-400 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                          style={{ width: 20, height: 20 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{project.projectName}</p>
                          <p className="text-sm text-muted-foreground mb-2">Cliente: {project.clientName}</p>
                          <div className="mt-2 text-xs space-y-1 bg-white/[0.03] p-3 rounded border border-white/[0.10]">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Precio Original:</span>
                              <span className="font-semibold">${fmt(project.originalPrice)}</span>
                            </div>
                            {parseFloat(project.discountsApplied?.toString() || "0") > 0 && (
                              <div className="flex justify-between text-red-400">
                                <span>- Descuentos:</span>
                                <span className="font-semibold">-${fmt(project.discountsApplied)}</span>
                              </div>
                            )}
                            {parseFloat(project.surchargesApplied?.toString() || "0") > 0 && (
                              <div className="flex justify-between text-green-400">
                                <span>+ Recargos:</span>
                                <span className="font-semibold">+${fmt(project.surchargesApplied)}</span>
                              </div>
                            )}
                            <div className="border-t border-white/[0.15] pt-2 mt-2 flex justify-between font-bold text-teal-300 bg-teal-500/10 p-2 rounded">
                              <span>💰 PRECIO NETO:</span>
                              <span>${fmt(project.netPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview and Submit */}
          {selectedProjects.length > 0 && (
            <Card className="bg-teal-500/10 border-teal-500/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-teal-400" />
                  Resumen del Cierre ({selectedProjects.length} proyectos)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#162828] p-4 rounded-lg border border-teal-500/25">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">💰 Desglose de Ingresos</p>
                  <div className="space-y-2 text-sm">
                    <div className="border-t border-white/[0.10] pt-2 mt-2 flex justify-between font-bold text-teal-300">
                      <span>= PRECIO NETO (Dinero Real):</span>
                      <span>${fmt(previewTotals.totalSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ventas Netas</p>
                    <p className="text-xl font-bold text-teal-400">${fmt(previewTotals.totalSales)}</p>
                  </div>
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gastos Totales</p>
                    <p className="text-xl font-bold text-orange-400">${fmt(previewTotals.totalExpenses)}</p>
                  </div>
                  <div className="bg-[#162828] p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                    <p className="text-xl font-bold text-green-400">${fmt(previewTotals.totalProfit)}</p>
                  </div>
                </div>

                <Button
                  onClick={handleCreateClosure}
                  disabled={isSubmitting}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Crear Cierre Contable</>
                  )}
                </Button>
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
              <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
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
                <CardHeader onClick={() => setSelectedClosureId(closure.id === selectedClosureId ? null : closure.id)} className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Cierre {closure.periodStart} → {closure.periodEnd}
                      </CardTitle>
                      <CardDescription>{closure.projectCount} proyectos • {closure.createdAt}</CardDescription>
                    </div>
                    <div className="text-right">{getStatusBadge(closure.status)}</div>
                  </div>
                </CardHeader>

                {selectedClosureId === closure.id && closureDetails && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-teal-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ventas Totales</p>
                        <p className="text-xl font-bold text-teal-400">${fmt(closureDetails.totalSales)}</p>
                      </div>
                      <div className="bg-orange-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Gastos Totales</p>
                        <p className="text-xl font-bold text-orange-400">${fmt(closureDetails.totalExpenses)}</p>
                      </div>
                      <div className="bg-green-500/10 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                        <p className="text-xl font-bold text-green-400">${fmt(closureDetails.totalProfit)}</p>
                      </div>
                    </div>

                    {closure.status === "draft" && (
                      <div className="flex gap-3">
                        <Button onClick={() => setShowConfirmDialog(true)} className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirmar Cierre
                        </Button>
                        <Button onClick={() => setShowRevertDialog(true)} variant="outline" className="flex-1">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Revertir
                        </Button>
                      </div>
                    )}

                    {closure.status === "confirmed" && (
                      <div className="bg-green-500/10 border border-green-500/25 p-4 rounded-lg">
                        <p className="text-sm text-green-300">✅ Este cierre ha sido confirmado y no puede ser modificado.</p>
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
              ¿Estás seguro de que deseas confirmar este cierre contable? Esta acción bloqueará los proyectos incluidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClosure} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirmando...</> : "Confirmar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={(open) => { setShowRevertDialog(open); if (!open) setRevertReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revertir Cierre Contable</AlertDialogTitle>
            <AlertDialogDescription>
              Los proyectos serán desvinculados y podrán incluirse en un nuevo cierre. Ingresa el motivo de la reversión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Label>Motivo de la reversión *</Label>
            <Textarea
              placeholder="Describe por qué se revierte este cierre (mínimo 10 caracteres)..."
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              className="min-h-[80px]"
            />
            {revertReason.length > 0 && revertReason.length < 10 && (
              <p className="text-xs text-red-400">Mínimo 10 caracteres ({revertReason.length}/10)</p>
            )}
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertClosure}
              disabled={revertClosure.isPending || revertReason.trim().length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              {revertClosure.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Revirtiendo...</> : "Revertir"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
