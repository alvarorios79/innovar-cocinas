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
  isAdmin?: boolean;
}

export function PaymentsSection({
  projectId,
  totalAmount,
  totalPaid,
  balance,
  isAdmin = false,
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
      toast.success("Pago registrado correctamente");
      setIsModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar pago");
    },
  });

  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Pago eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar pago");
    },
  });

  const handleCreatePayment = async (paymentData: any) => {
    await createPaymentMutation.mutateAsync({
      projectId,
      ...paymentData,
    });
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
      />

      {/* Botón de Registro */}
      {isAdmin && (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      )}

      {/* Tabla de Pagos */}
      <PaymentsTable
        payments={payments}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onDelete={handleDeletePayment}
        isDeleting={deletePaymentMutation.isPending}
      />

      {/* Modal de Registro */}
      <RegisterPaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreatePayment}
        isLoading={createPaymentMutation.isPending}
      />
    </div>
  );
}
