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
      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/25">
        <div className="text-sm text-muted-foreground">
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
          <div className="overflow-x-auto border border-white/[0.10] rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.06] border-b border-white/[0.10]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Tabla</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Registros Eliminados</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Ejecutado Por</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Sesión</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-white/[0.10] hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-foreground">{log.tableName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/15 text-red-300 rounded text-xs font-semibold">
                        {log.recordsDeleted}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.executedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground">
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
              <div className="text-sm text-muted-foreground">
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
