import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { RegisterPaymentModal } from "./RegisterPaymentModal";
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
  isAdmin = false,
  onBalanceUpdate,
}: PaymentsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const { data: payments = [], isLoading, refetch } = trpc.payments.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mutations
  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("Movimiento registrado correctamente");
      setIsModalOpen(false);
      refetch();
      // Notificar al padre para refrescar el saldo dinámico
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar movimiento");
    },
  });

  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimiento eliminado correctamente");
      refetch();
      // Notificar al padre para refrescar el saldo dinámico
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar movimiento");
    },
  });

  const handleCreatePayment = async (paymentData: any) => {
    // Asegurar que movementType se incluye en el payload
    const payload = {
      projectId,
      amount: paymentData.amount,
      type: paymentData.type,
      receivedAt: paymentData.receivedAt,
      method: paymentData.method,
      movementType: paymentData.movementType || 'payment', // Fallback a 'payment'
      notes: paymentData.notes,
    };
    await createPaymentMutation.mutateAsync(payload);
  };

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
      />

      {/* Botón de Registro */}
      {isAdmin && (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Movimiento
        </Button>
      )}

      {/* Tabla de Movimientos */}
      <PaymentsTable
        payments={payments}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onDelete={handleDeletePayment}
        isDeleting={deletePaymentMutation.isPending}
      />

      {/* Modal de Registro de Movimiento */}
      <RegisterPaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreatePayment}
        isLoading={createPaymentMutation.isPending}
      />
    </div>
  );
}
