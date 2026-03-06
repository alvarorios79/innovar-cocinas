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

  const systemClientsCount = systemClientsQuery.data?.length ?? 0;
  const systemQuotationsCount = systemQuotationsQuery.data?.length ?? 0;
  const systemProjectsCount = systemProjectsQuery.data?.length ?? 0;
  const systemAppointmentsCount = systemAppointmentsQuery.data?.length ?? 0;

  const totalSystemData = systemClientsCount + systemQuotationsCount + systemProjectsCount + systemAppointmentsCount;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Zona Crítica - Gestión de Datos del Sistema</h3>
          <p className="text-sm text-red-800 mt-1">
            Esta sección contiene datos generados automáticamente por el sistema para pruebas. 
            Procede con cuidado al eliminar datos.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{systemClientsCount}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{systemQuotationsCount}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{systemProjectsCount}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{systemAppointmentsCount}</div>
            <p className="text-xs text-red-700 mt-1">del sistema</p>
          </CardContent>
        </Card>


      </div>

      {/* Detailed Management */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Gestión de Datos del Sistema</CardTitle>
          <CardDescription>
            Total de registros del sistema: <span className="font-semibold text-red-600">{totalSystemData}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="clients">Clientes ({systemClientsCount})</TabsTrigger>
              <TabsTrigger value="quotations">Cotizaciones ({systemQuotationsCount})</TabsTrigger>
              <TabsTrigger value="projects">Proyectos ({systemProjectsCount})</TabsTrigger>
              <TabsTrigger value="appointments">Citas ({systemAppointmentsCount})</TabsTrigger>
            </TabsList>

            {/* Clientes */}
            <TabsContent value="clients" className="space-y-4">
              {systemClientsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : systemClientsCount === 0 ? (
                <p className="text-sm text-gray-500">No hay clientes del sistema</p>
              ) : (
                <>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-medium text-gray-900">{systemClientsCount} clientes del sistema encontrados</p>
                    <p className="text-gray-600 text-xs mt-1">Estos clientes fueron generados automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "clients" ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-900">
                        ¿Confirmas que deseas eliminar {systemClientsCount} clientes del sistema?
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
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-medium text-gray-900">{systemQuotationsCount} cotizaciones del sistema encontradas</p>
                    <p className="text-gray-600 text-xs mt-1">Estas cotizaciones fueron generadas automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "quotations" ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-900">
                        ¿Confirmas que deseas eliminar {systemQuotationsCount} cotizaciones del sistema?
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
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-medium text-gray-900">{systemProjectsCount} proyectos del sistema encontrados</p>
                    <p className="text-gray-600 text-xs mt-1">Estos proyectos fueron generados automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "projects" ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-900">
                        ¿Confirmas que deseas eliminar {systemProjectsCount} proyectos del sistema?
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
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-medium text-gray-900">{systemAppointmentsCount} citas del sistema encontradas</p>
                    <p className="text-gray-600 text-xs mt-1">Estas citas fueron generadas automáticamente para pruebas</p>
                  </div>
                  {confirmDelete === "appointments" ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded space-y-3">
                      <p className="text-sm font-medium text-red-900">
                        ¿Confirmas que deseas eliminar {systemAppointmentsCount} citas del sistema?
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

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
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
