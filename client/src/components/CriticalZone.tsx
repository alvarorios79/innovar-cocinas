import { useState } from "react";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

// Simple toast notification using console
const useToast = () => ({
  toast: (props: any) => {
    console.log(`[${props.variant || 'info'}] ${props.title}: ${props.description}`);
    // In a real app, this would show a toast notification
  },
});

/**
 * Zona Crítica - System Data Management
 * 
 * This component provides a dedicated area for managing system-generated test data.
 * It allows admins to view and delete system data (dataOrigin = 'system') separately
 * from operational data (dataOrigin = 'manual').
 */
export function CriticalZone() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Query for system data counts
  const systemDataCountsQuery = trpc.system.getSystemDataCounts.useQuery();
  
  // Queries for system data
  const systemClientsQuery = trpc.system.getSystemClients.useQuery();
  const systemQuotationsQuery = trpc.system.getSystemQuotations.useQuery();
  const systemProjectsQuery = trpc.system.getSystemProjects.useQuery();
  const systemAppointmentsQuery = trpc.system.getSystemAppointments.useQuery();

  // Mutations for deletion
  const deleteSystemClientsMutation = trpc.system.deleteSystemClients.useMutation({
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Clientes del sistema eliminados correctamente",
      });
      systemClientsQuery.refetch();
      setConfirmDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystemQuotationsMutation = trpc.system.deleteSystemQuotations.useMutation({
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Cotizaciones del sistema eliminadas correctamente",
      });
      systemQuotationsQuery.refetch();
      setConfirmDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystemProjectsMutation = trpc.system.deleteSystemProjects.useMutation({
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Proyectos del sistema eliminados correctamente",
      });
      systemProjectsQuery.refetch();
      setConfirmDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystemAppointmentsMutation = trpc.system.deleteSystemAppointments.useMutation({
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Citas del sistema eliminadas correctamente",
      });
      systemAppointmentsQuery.refetch();
      setConfirmDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const cleanupSystemDataMutation = trpc.system.cleanupData.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Éxito",
        description: data.message,
      });
      systemClientsQuery.refetch();
      systemQuotationsQuery.refetch();
      systemProjectsQuery.refetch();
      systemAppointmentsQuery.refetch();
      setConfirmDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Error durante la limpieza",
        variant: "destructive",
      });
    },
  });

  // Use counts from query for faster preview
  const systemClientsCount = Number(systemDataCountsQuery.data?.clients ?? 0);
  const systemQuotationsCount = Number(systemDataCountsQuery.data?.quotations ?? 0);
  const systemProjectsCount = Number(systemDataCountsQuery.data?.projects ?? 0);
  const systemAppointmentsCount = Number(systemDataCountsQuery.data?.appointments ?? 0);
  const systemTasksCount = Number(systemDataCountsQuery.data?.tasks ?? 0);

  const totalSystemData = systemClientsCount + systemQuotationsCount + systemProjectsCount + systemAppointmentsCount + systemTasksCount;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-300">Zona Crítica - Gestión de Datos del Sistema</h3>
          <p className="text-sm text-red-300 mt-1">
            Esta sección contiene datos generados automáticamente por el sistema para pruebas. 
            Procede con cuidado al eliminar datos.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-red-500/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-300">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{String(systemClientsCount)}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-300">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{String(systemQuotationsCount)}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-300">Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{String(systemProjectsCount)}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-300">Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{String(systemAppointmentsCount)}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>


      </div>

      {/* Detailed Management */}
      <Card className="border-red-500/25">
        <CardHeader>
          <CardTitle className="text-red-300">Gestión de Datos del Sistema</CardTitle>
          <CardDescription>
            Total de registros del sistema: <span className="font-semibold text-red-600">{String(totalSystemData)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="clients">Clientes ({String(systemClientsCount)})</TabsTrigger>
              <TabsTrigger value="quotations">Cotizaciones ({String(systemQuotationsCount)})</TabsTrigger>
              <TabsTrigger value="projects">Proyectos ({String(systemProjectsCount)})</TabsTrigger>
              <TabsTrigger value="appointments">Citas ({String(systemAppointmentsCount)})</TabsTrigger>
            </TabsList>

            {/* Clientes */}
            <TabsContent value="clients" className="space-y-4">
              {systemClientsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : systemClientsCount === 0 ? (
                <p className="text-sm text-gray-500">No hay clientes del sistema</p>
              ) : (
                <>
                  <div className="bg-white/[0.03] p-3 rounded text-sm">
                    <p className="font-medium text-foreground">{String(systemClientsCount)} clientes del sistema encontrados</p>
                    <p className="text-muted-foreground text-xs mt-1">Estos clientes fueron generados automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "clients" ? (
                    <div className="bg-red-500/10 border border-red-500/25 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-300">
                        ¿Confirmas que deseas eliminar {String(systemClientsCount)} clientes del sistema?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSystemClientsMutation.mutate()}
                          disabled={deleteSystemClientsMutation.isPending}
                        >
                          {deleteSystemClientsMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete("clients")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Clientes del Sistema
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* Cotizaciones */}
            <TabsContent value="quotations" className="space-y-4">
              {systemQuotationsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : systemQuotationsCount === 0 ? (
                <p className="text-sm text-gray-500">No hay cotizaciones del sistema</p>
              ) : (
                <>
                  <div className="bg-white/[0.03] p-3 rounded text-sm">
                    <p className="font-medium text-foreground">{String(systemQuotationsCount)} cotizaciones del sistema encontradas</p>
                    <p className="text-muted-foreground text-xs mt-1">Estas cotizaciones fueron generadas automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "quotations" ? (
                    <div className="bg-red-500/10 border border-red-500/25 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-300">
                        ¿Confirmas que deseas eliminar {String(systemQuotationsCount)} cotizaciones del sistema?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSystemQuotationsMutation.mutate()}
                          disabled={deleteSystemQuotationsMutation.isPending}
                        >
                          {deleteSystemQuotationsMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete("quotations")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Cotizaciones del Sistema
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* Proyectos */}
            <TabsContent value="projects" className="space-y-4">
              {systemProjectsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : systemProjectsCount === 0 ? (
                <p className="text-sm text-gray-500">No hay proyectos del sistema</p>
              ) : (
                <>
                  <div className="bg-white/[0.03] p-3 rounded text-sm">
                    <p className="font-medium text-foreground">{String(systemProjectsCount)} proyectos del sistema encontrados</p>
                    <p className="text-muted-foreground text-xs mt-1">Estos proyectos fueron generados automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "projects" ? (
                    <div className="bg-red-500/10 border border-red-500/25 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-300">
                        ¿Confirmas que deseas eliminar {String(systemProjectsCount)} proyectos del sistema?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSystemProjectsMutation.mutate()}
                          disabled={deleteSystemProjectsMutation.isPending}
                        >
                          {deleteSystemProjectsMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete("projects")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Proyectos del Sistema
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* Citas */}
            <TabsContent value="appointments" className="space-y-4">
              {systemAppointmentsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : systemAppointmentsCount === 0 ? (
                <p className="text-sm text-gray-500">No hay citas del sistema</p>
              ) : (
                <>
                  <div className="bg-white/[0.03] p-3 rounded text-sm">
                    <p className="font-medium text-foreground">{String(systemAppointmentsCount)} citas del sistema encontradas</p>
                    <p className="text-muted-foreground text-xs mt-1">Estas citas fueron generadas automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "appointments" ? (
                    <div className="bg-red-500/10 border border-red-500/25 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-300">
                        ¿Confirmas que deseas eliminar {String(systemAppointmentsCount)} citas del sistema?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSystemAppointmentsMutation.mutate()}
                          disabled={deleteSystemAppointmentsMutation.isPending}
                        >
                          {deleteSystemAppointmentsMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete("appointments")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Citas del Sistema
                    </Button>
                  )}
                </>
              )}
            </TabsContent>


          </Tabs>
        </CardContent>
      </Card>

      {/* System Cleanup Section */}
      <Card className="border-red-300 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-300">Limpieza Completa del Sistema</CardTitle>
          <CardDescription className="text-red-300">
            Elimina todos los datos del sistema (dataOrigin = 'system') de una vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmDelete === "cleanup" ? (
            <div className="bg-red-500/15 border border-red-300 p-4 rounded space-y-3">
              <p className="text-sm font-medium text-red-300">
                ⚠️ ¿Confirmas que deseas ejecutar la limpieza completa del sistema?
              </p>
              <p className="text-xs text-red-300">
                Se eliminarán {totalSystemData} registros del sistema en total.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cleanupSystemDataMutation.mutate()}
                  disabled={cleanupSystemDataMutation.isPending}
                >
                  {cleanupSystemDataMutation.isPending ? "Limpiando..." : "Sí, ejecutar limpieza"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border border-red-500/25 space-y-2">
                <p className="text-sm font-medium text-foreground">Vista Previa de Datos a Eliminar:</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="font-semibold text-red-600">{String(systemClientsCount)}</p>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Cotizaciones</p>
                    <p className="font-semibold text-red-600">{String(systemQuotationsCount)}</p>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Proyectos</p>
                    <p className="font-semibold text-red-600">{String(systemProjectsCount)}</p>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Citas</p>
                    <p className="font-semibold text-red-600">{String(systemAppointmentsCount)}</p>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-red-600">{String(totalSystemData)}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete("cleanup")}
                disabled={totalSystemData === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Ejecutar Limpieza del Sistema
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            systemDataCountsQuery.refetch();
            systemClientsQuery.refetch();
            systemQuotationsQuery.refetch();
            systemProjectsQuery.refetch();
            systemAppointmentsQuery.refetch();
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar Datos
        </Button>
      </div>
    </div>
  );
}
