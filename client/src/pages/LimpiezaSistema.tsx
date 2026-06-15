import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Eye, Loader2, CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecordListView from "../components/RecordListView";
import { PageHeader } from "@/components/PageHeader";
import AuditLogViewer from "../components/AuditLogViewer";

const TABLE_NAMES = [
  { key: "users", label: "Usuarios", icon: "👤" },
  { key: "clients", label: "Clientes", icon: "🏢" },
  { key: "projects", label: "Proyectos", icon: "📋" },
  { key: "quotations", label: "Cotizaciones", icon: "💰" },
  { key: "appointments", label: "Citas", icon: "📅" },
  { key: "tasks", label: "Tareas", icon: "✓" },
  { key: "notifications", label: "Notificaciones", icon: "🔔" },
  { key: "expenses", label: "Gastos", icon: "💸" },
] as const;

export default function LimpiezaSistema() {
  const [, setLocation] = useLocation();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch system record counts
  const { data: counts, isLoading: countsLoading, refetch: refetchCounts } = trpc.cleanup.getSystemRecordCounts.useQuery();

  // Delete all system data mutation
  const deleteAllMutation = trpc.cleanup.deleteAllSystemData.useMutation({
    onSuccess: (data) => {
      setIsDeleting(false);
      setDeleteSuccess(true);
      setConfirmationText("");
      refetchCounts();
      setTimeout(() => setDeleteSuccess(false), 5000);
    },
    onError: (error) => {
      setIsDeleting(false);
      setDeleteError(error.message);
      setTimeout(() => setDeleteError(null), 5000);
    },
  });

  const handleDeleteAll = () => {
    if (confirmationText !== "ELIMINAR DATOS DE PRUEBA") {
      setDeleteError("Confirmación incorrecta. Escriba: ELIMINAR DATOS DE PRUEBA");
      return;
    }

    setIsDeleting(true);
    deleteAllMutation.mutate({ confirmation: "ELIMINAR DATOS DE PRUEBA" });
  };

  const getTotalRecords = () => {
    if (!counts) return 0;
    return Object.values(counts).reduce((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <div className="max-w-screen-xl mx-auto px-4">
        {/* Navigation Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="min-h-[44px] px-4 py-3 text-base font-medium hover:bg-white/[0.05] text-white/75 border-white/[0.12]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="min-h-[44px] px-4 py-3 text-base font-medium hover:bg-white/[0.05] text-white/75 border-white/[0.12]"
          >
            <Home className="h-4 w-4 mr-2" />
            Inicio
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white/90 mb-2">🧹 Limpieza de Sistema</h1>
          <p className="text-base md:text-lg text-white/45">
            Gestiona y elimina datos de prueba generados automáticamente por el sistema
          </p>
        </div>

        {/* Critical Alert */}
        <Alert className="mb-8 border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <AlertTitle className="text-red-300 font-bold">⚠️ Zona Crítica</AlertTitle>
          <AlertDescription className="text-red-300/80 mt-2 text-sm md:text-base">
            Esta sección permite eliminar registros de prueba del sistema. Solo los registros marcados como{" "}
            <span className="font-bold">dataOrigin = "system"</span> serán eliminados. Los datos manuales (
            <span className="font-bold">dataOrigin = "manual"</span>) nunca serán afectados.
          </AlertDescription>
        </Alert>

        {/* Global Cleanup Section */}
        <Card className="mb-8 border border-white/[0.06] bg-[#162828] shadow-lg overflow-hidden" style={{ borderTop: "3px solid #EF4444" }}>
          <CardHeader className="bg-[#162828] border-b border-white/[0.06]">
            <CardTitle className="text-xl md:text-2xl text-white/90">🚨 Eliminar Todos los Datos de Prueba</CardTitle>
            <CardDescription className="text-white/45 text-sm md:text-base">
              Elimina todos los registros del sistema de una sola vez
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {countsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-red-500 mr-2" />
                <span className="text-sm md:text-base">Cargando datos...</span>
              </div>
            ) : (
              <>
                {/* Preview Table - Responsive Grid */}
                <div className="mb-6 p-4 bg-white/[0.04] rounded-lg border border-white/[0.08] overflow-x-auto">
                  <h3 className="font-bold text-white/75 mb-4 text-sm md:text-base">📊 Vista Previa de Registros a Eliminar:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TABLE_NAMES.map(({ key, label, icon }) => (
                      <div key={key} className="p-3 bg-[#162828] rounded border border-white/[0.08] min-w-[140px]" style={{ borderLeft: "3px solid #EF4444" }}>
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-sm font-medium text-white/60">{label}</div>
                        <div className="text-2xl font-bold text-red-400">
                          {counts?.[key as keyof typeof counts] || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.08]">
                    <div className="text-base md:text-lg font-bold text-white/75">
                      Total de registros a eliminar: <span className="text-red-400">{getTotalRecords()}</span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-white/75 mb-2">
                    Escriba la siguiente frase para confirmar:
                  </label>
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded mb-3 font-mono text-red-300 font-bold text-sm md:text-base">
                    ELIMINAR DATOS DE PRUEBA
                  </div>
                  <Input
                    type="text"
                    placeholder="Escriba aquí..."
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="border-2 border-red-300 focus:border-red-500 min-h-[44px] text-base"
                  />
                </div>

                {/* Status Messages */}
                {deleteSuccess && (
                  <Alert className="mb-4 border border-green-500/30 bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <AlertTitle className="text-green-300">✅ Limpieza Completada</AlertTitle>
                    <AlertDescription className="text-green-300/80 text-sm md:text-base">
                      Todos los datos de prueba han sido eliminados exitosamente.
                    </AlertDescription>
                  </Alert>
                )}

                {deleteError && (
                  <Alert className="mb-4 border border-red-500/30 bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <AlertTitle className="text-red-300">❌ Error</AlertTitle>
                    <AlertDescription className="text-red-300/80 text-sm md:text-base">{deleteError}</AlertDescription>
                  </Alert>
                )}

                {/* Delete Button - Touch Friendly */}
                <Button
                  onClick={handleDeleteAll}
                  disabled={
                    isDeleting ||
                    confirmationText !== "ELIMINAR DATOS DE PRUEBA" ||
                    getTotalRecords() === 0
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px] py-3 text-base md:text-lg"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5 mr-2" />
                      ELIMINAR TODOS LOS DATOS
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tabs for individual table management - Mobile Responsive */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="summary" className="text-xs md:text-sm">📊 Resumen</TabsTrigger>
            <TabsTrigger value="records" className="text-xs md:text-sm">📋 Registros</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs md:text-sm">📜 Auditoría</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="bg-[#162828] border border-white/[0.06]" style={{ borderTop: "3px solid #1DB5A8" }}>
              <CardHeader>
                <CardTitle className="text-lg md:text-2xl text-white/90">Resumen de Registros del Sistema</CardTitle>
                <CardDescription className="text-sm md:text-base text-white/45">
                  Cantidad de registros marcados como dataOrigin = "system" por tabla
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-400 mr-2" />
                    <span className="text-sm md:text-base text-white/55">Cargando...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {TABLE_NAMES.map(({ key, label, icon }) => (
                      <div
                        key={key}
                        className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white/[0.04] rounded-lg border border-white/[0.07] hover:bg-white/[0.07] transition gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <div className="font-semibold text-white/85 text-sm md:text-base">{label}</div>
                            <div className="text-xs md:text-sm text-white/40">
                              {counts?.[key as keyof typeof counts] || 0} registros
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="min-h-[44px] px-4 py-3 text-xs md:text-sm font-medium w-full md:w-auto"
                              onClick={() => setSelectedTable(key)}
                              disabled={(counts?.[key as keyof typeof counts] || 0) === 0}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              VER REGISTROS
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto overflow-x-auto">
                            <DialogHeader>
                              <DialogTitle className="text-lg md:text-xl">{label} - Registros del Sistema</DialogTitle>
                              <DialogDescription className="text-sm md:text-base">
                                Registros marcados como dataOrigin = "system"
                              </DialogDescription>
                            </DialogHeader>
                            {selectedTable && (
                              <RecordListView tableName={selectedTable} onRefresh={refetchCounts} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-4">
            <Card className="bg-[#162828] border border-white/[0.06]" style={{ borderTop: "3px solid #6366F1" }}>
              <CardHeader>
                <CardTitle className="text-lg md:text-2xl text-white/90">Gestión de Registros</CardTitle>
                <CardDescription className="text-sm md:text-base text-white/45">
                  Selecciona una tabla para ver y gestionar registros individuales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {TABLE_NAMES.map(({ key, label, icon }) => (
                    <Dialog key={key}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full min-h-[44px] px-4 py-3 text-base font-medium justify-start text-white/75 border-white/[0.12] hover:bg-white/[0.05]"
                          onClick={() => setSelectedTable(key)}
                          disabled={(counts?.[key as keyof typeof counts] || 0) === 0}
                        >
                          <span className="text-2xl mr-3">{icon}</span>
                          <span className="flex-1 text-left">{label}</span>
                          <span className="text-red-400 font-bold">
                            {counts?.[key as keyof typeof counts] || 0}
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto overflow-x-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg md:text-xl">{label} - Registros del Sistema</DialogTitle>
                          <DialogDescription className="text-sm md:text-base">
                            Registros marcados como dataOrigin = "system"
                          </DialogDescription>
                        </DialogHeader>
                        {selectedTable && (
                          <RecordListView tableName={selectedTable} onRefresh={refetchCounts} />
                        )}
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card className="bg-[#162828] border border-white/[0.06]" style={{ borderTop: "3px solid #F59E0B" }}>
              <CardHeader>
                <CardTitle className="text-lg md:text-2xl text-white/90">Historial de Auditoría</CardTitle>
                <CardDescription className="text-sm md:text-base text-white/45">
                  Registro de todas las operaciones de limpieza realizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <AuditLogViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
