import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RecordListViewProps {
  tableName: string;
  onRefresh: () => void;
}

export default function RecordListView({ tableName, onRefresh }: RecordListViewProps) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Fetch records
  const { data: recordsData, isLoading, refetch } = trpc.cleanup.getSystemRecordsByTable.useQuery({
    tableName: tableName as any,
    page,
    pageSize: 50,
  });

  // Delete records mutation
  const deleteMutation = trpc.cleanup.deleteRecords.useMutation({
    onSuccess: () => {
      setDeleteSuccess(true);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      refetch();
      onRefresh();
      setTimeout(() => setDeleteSuccess(false), 3000);
    },
  });

  // Delete all from table mutation
  const deleteAllMutation = trpc.cleanup.deleteAllFromTable.useMutation({
    onSuccess: () => {
      setDeleteSuccess(true);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      refetch();
      onRefresh();
      setTimeout(() => setDeleteSuccess(false), 3000);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && recordsData?.records) {
      setSelectedIds(recordsData.records.map((r: any) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRecord = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteMutation.mutate({
      tableName: tableName as any,
      ids: selectedIds,
    });
  };

  const handleDeleteAll = () => {
    deleteAllMutation.mutate({
      tableName: tableName as any,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Cargando registros...</span>
      </div>
    );
  }

  const records = recordsData?.records || [];
  const totalCount = recordsData?.totalCount || 0;
  const totalPages = recordsData?.totalPages || 0;

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {deleteSuccess && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-300">
            ✅ Registros eliminados exitosamente
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/25">
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-bold">{records.length}</span> de{" "}
          <span className="font-bold">{totalCount}</span> registros
        </div>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay registros del sistema para esta tabla
        </div>
      ) : (
        <>
          {/* Records Table */}
          <div className="overflow-x-auto border border-white/[0.10] rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.06] border-b border-white/[0.10]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedIds.length === records.length && records.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Nombre/Título</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Creado</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Origen</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record: any, idx: number) => (
                  <tr
                    key={record.id}
                    className={`border-b border-white/[0.10] hover:bg-white/[0.03] ${
                      selectedIds.includes(record.id) ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(record.id)}
                        onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{record.id}</td>
                    <td className="px-4 py-3 text-foreground">
                      {record.name || record.title || record.email || record.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {record.createdAt
                        ? format(new Date(record.createdAt), "dd MMM yyyy HH:mm", { locale: es })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/15 text-red-300 rounded text-xs font-semibold">
                        {record.dataOrigin || "system"}
                      </span>
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

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar {selectedIds.length} seleccionados
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar eliminación</DialogTitle>
                    <DialogDescription>
                      ¿Está seguro de que desea eliminar {selectedIds.length} registros?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteSelected}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          Eliminando...
                        </>
                      ) : (
                        "Eliminar"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar todos los registros
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación de todos</DialogTitle>
                  <DialogDescription className="space-y-2">
                    <div>
                      ¿Está seguro de que desea eliminar todos los {totalCount} registros de esta tabla?
                    </div>
                    <Alert className="border-red-500 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-300">
                        Esta acción no se puede deshacer
                      </AlertDescription>
                    </Alert>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline">Cancelar</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAll}
                    disabled={deleteAllMutation.isPending}
                  >
                    {deleteAllMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Eliminando...
                      </>
                    ) : (
                      "Eliminar todos"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
}
