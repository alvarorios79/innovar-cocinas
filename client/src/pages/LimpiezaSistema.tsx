import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Eye, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecordListView from "../components/RecordListView";
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🧹 LIMPIEZA DE SISTEMA</h1>
          <p className="text-lg text-gray-600">
            Gestiona y elimina datos de prueba generados automáticamente por el sistema
          </p>
        </div>

        {/* Critical Alert */}
        <Alert className="mb-8 border-2 border-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-bold">⚠️ Zona Crítica</AlertTitle>
          <AlertDescription className="text-red-800 mt-2">
            Esta sección permite eliminar registros de prueba del sistema. Solo los registros marcados como{" "}
            <span className="font-bold">dataOrigin = "system"</span> serán eliminados. Los datos manuales (
            <span className="font-bold">dataOrigin = "manual"</span>) nunca serán afectados.
          </AlertDescription>
        </Alert>

        {/* Global Cleanup Section */}
        <Card className="mb-8 border-2 border-red-400 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl">🚨 ELIMINAR TODOS LOS DATOS DE PRUEBA</CardTitle>
            <CardDescription className="text-red-100">
              Elimina todos los registros del sistema de una sola vez
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {countsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-red-500 mr-2" />
                <span>Cargando datos...</span>
              </div>
            ) : (
              <>
                {/* Preview Table */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">📊 Vista Previa de Registros a Eliminar:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {TABLE_NAMES.map(({ key, label, icon }) => (
                      <div key={key} className="p-3 bg-white rounded border border-gray-200">
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-sm font-medium text-gray-700">{label}</div>
                        <div className="text-2xl font-bold text-red-600">
                          {counts?.[key as keyof typeof counts] || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-lg font-bold text-gray-900">
                      Total de registros a eliminar: <span className="text-red-600">{getTotalRecords()}</span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Escriba la siguiente frase para confirmar:
                  </label>
                  <div className="p-3 bg-red-100 border border-red-300 rounded mb-3 font-mono text-red-900 font-bold">
                    ELIMINAR DATOS DE PRUEBA
                  </div>
                  <Input
                    type="text"
                    placeholder="Escriba aquí..."
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="border-2 border-red-300 focus:border-red-500"
                  />
                </div>

                {/* Status Messages */}
                {deleteSuccess && (
                  <Alert className="mb-4 border-green-500 bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-900">✅ Limpieza Completada</AlertTitle>
                    <AlertDescription className="text-green-800">
                      Todos los datos de prueba han sido eliminados exitosamente.
                    </AlertDescription>
                  </Alert>
                )}

                {deleteError && (
                  <Alert className="mb-4 border-red-500 bg-red-50">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-900">❌ Error</AlertTitle>
                    <AlertDescription className="text-red-800">{deleteError}</AlertDescription>
                  </Alert>
                )}

                {/* Delete Button */}
                <Button
                  onClick={handleDeleteAll}
                  disabled={
                    isDeleting ||
                    confirmationText !== "ELIMINAR DATOS DE PRUEBA" ||
                    getTotalRecords() === 0
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-lg"
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

        {/* Tabs for individual table management */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">📊 Resumen</TabsTrigger>
            <TabsTrigger value="records">📋 Registros</TabsTrigger>
            <TabsTrigger value="audit">📜 Auditoría</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Registros del Sistema</CardTitle>
                <CardDescription>
                  Cantidad de registros marcados como dataOrigin = "system" por tabla
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                    <span>Cargando...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {TABLE_NAMES.map(({ key, label, icon }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{label}</div>
                            <div className="text-sm text-gray-500">
                              {counts?.[key as keyof typeof counts] || 0} registros
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTable(key)}
                              disabled={(counts?.[key as keyof typeof counts] || 0) === 0}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              VER REGISTROS
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{label} - Registros del Sistema</DialogTitle>
                              <DialogDescription>
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
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Registros por Tabla</CardTitle>
                <CardDescription>
                  Selecciona una tabla para ver y eliminar registros individuales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {TABLE_NAMES.map(({ key, label, icon }) => (
                    <Dialog key={key}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50"
                          onClick={() => setSelectedTable(key)}
                          disabled={(counts?.[key as keyof typeof counts] || 0) === 0}
                        >
                          <span className="text-3xl">{icon}</span>
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-xs text-gray-500">
                            {counts?.[key as keyof typeof counts] || 0} registros
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{label}</DialogTitle>
                          <DialogDescription>
                            Gestiona registros del sistema para {label.toLowerCase()}
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

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Auditoría</CardTitle>
                <CardDescription>
                  Historial de todas las operaciones de limpieza realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
