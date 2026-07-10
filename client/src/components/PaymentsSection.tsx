import { trpc } from "@/lib/trpc";
import { PaymentsSummary } from "./PaymentsSummary";
import { PaymentsTable } from "./PaymentsTable";
import { toast } from "sonner";

interface PaymentsSectionProps {
  projectId: number;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  discounts?: number;
  surcharges?: number;
  totalCobrado?: number;
  isAdmin?: boolean;
  onBalanceUpdate?: () => void;
}

export function PaymentsSection({
  projectId,
  totalAmount,
  totalPaid,
  balance,
  discounts = 0,
  surcharges = 0,
  totalCobrado = 0,
  isAdmin = false,
  onBalanceUpdate,
}: PaymentsSectionProps) {
  // Queries
  const { data: payments = [], isLoading, refetch } = trpc.payments.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mutations — solo eliminación (el registro se hace desde Contabilidad → Movimientos)
  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimiento eliminado correctamente");
      refetch();
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar movimiento");
    },
  });

  const handleDeletePayment = async (paymentId: number) => {
    await deletePaymentMutation.mutateAsync({ paymentId });
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <PaymentsSummary
        totalAmount={totalAmount}
        totalPaid={totalPaid}
        balance={balance}
        discounts={discounts}
        surcharges={surcharges}
        totalCobrado={totalCobrado}
      />

      {/* Tabla de Movimientos (solo lectura — registro desde Contabilidad) */}
      <PaymentsTable
        payments={payments}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onDelete={handleDeletePayment}
        isDeleting={deletePaymentMutation.isPending}
      />
    </div>
  );
}
