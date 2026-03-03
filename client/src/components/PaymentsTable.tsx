import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

interface Payment {
  id: number;
  projectId: number;
  amount: number | string;
  type: string;
  receivedAt: Date | string;
  method: string | null;
  notes?: string | null;
  registeredBy: number | null;
  createdAt: Date | string;
  user?: { id: number; name: string };
}

interface PaymentsTableProps {
  payments: Payment[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onDelete: (paymentId: number) => Promise<void>;
  isDeleting?: boolean;
}

const typeLabels: Record<string, string> = {
  advance: "Adelanto",
  final: "Final",
  partial: "Parcial",
  other: "Otro",
};

const methodLabels: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  check: "Cheque",
  other: "Otro",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PaymentsTable({
  payments,
  isLoading = false,
  isAdmin = false,
  onDelete,
  isDeleting = false,
}: PaymentsTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando pagos...
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay pagos registrados
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 bg-emerald-50 dark:bg-emerald-950">
          <CardTitle className="text-sm">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-right py-2 px-2">Monto</th>
                  <th className="text-left py-2 px-2">Método</th>
                  <th className="text-left py-2 px-2">Registrado Por</th>
                  {isAdmin && <th className="text-center py-2 px-2">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{formatDate(typeof payment.receivedAt === 'string' ? new Date(payment.receivedAt) : payment.receivedAt)}</td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {typeLabels[payment.type] || payment.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      {formatCurrency(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount)}
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">
                      {payment.method ? (methodLabels[payment.method] || payment.method) : 'N/A'}
                    </td>
                    <td className="py-3 px-2 text-xs">
                      {payment.user?.name || "Sistema"}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-2 text-center">
                        <AlertDialog open={deleteId === payment.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(payment.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Estás a punto de eliminar un pago de {formatCurrency(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount)}. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  onDelete(typeof payment.id === 'string' ? parseInt(payment.id) : payment.id);
                                  setDeleteId(null);
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {isDeleting ? "Eliminando..." : "Eliminar"}
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
