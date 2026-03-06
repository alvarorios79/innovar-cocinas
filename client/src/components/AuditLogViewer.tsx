import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AuditLogViewer() {
  const [page, setPage] = useState(1);

  // Fetch audit log
  const { data: auditData, isLoading } = trpc.cleanup.getAuditLog.useQuery({
    page,
    pageSize: 50,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Cargando registro de auditoría...</span>
      </div>
    );
  }

  const logs = auditData?.logs || [];
  const totalCount = auditData?.totalCount || 0;
  const totalPages = auditData?.totalPages || 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-gray-600">
          Total de operaciones registradas: <span className="font-bold">{totalCount}</span>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay operaciones de limpieza registradas
        </div>
      ) : (
        <>
          {/* Audit Log Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Tabla</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Registros Eliminados</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Ejecutado Por</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Sesión</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{log.tableName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        {log.recordsDeleted}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.executedBy}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.timestamp
                        ? format(new Date(log.timestamp), "dd MMM yyyy HH:mm:ss", { locale: es })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {log.cleanupSessionId ? log.cleanupSessionId.substring(0, 8) + "..." : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
