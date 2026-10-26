import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/formatters";
import { CreditCard, AlertCircle } from "lucide-react";

interface InitialPaymentModalProps {
  open: boolean;
  totalAmount: number;
  quotationNumber: string;
  onConfirm: (paymentData: {
    amount: number;
    method: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InitialPaymentModal({
  open,
  totalAmount,
  quotationNumber,
  onConfirm,
  onCancel,
  isLoading = false,
}: InitialPaymentModalProps) {
  const suggestedAdvance = Math.round(totalAmount * 0.6);
  const [paymentAmount, setPaymentAmount] = useState(suggestedAdvance.toString());
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [wasLoading, setWasLoading] = useState(false);

  // Cerrar modal automáticamente cuando se completa el guardado
  useEffect(() => {
    if (wasLoading && !isLoading && open) {
      // isLoading cambió de true a false, significa que se guardó exitosamente
      setTimeout(() => onCancel(), 500);
    }
    setWasLoading(isLoading);
  }, [isLoading, open, onCancel]);

  const handleConfirm = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    onConfirm({
      amount,
      method: paymentMethod,
    });
  };

  const remainingBalance = totalAmount - parseFloat(paymentAmount || "0");

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Registrar Pago Inicial
          </DialogTitle>
          <DialogDescription>
            Cotización #{quotationNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          {/* Información del Proyecto */}
          <Card className="bg-white/[0.03]">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total del Proyecto:</span>
                  <span className="font-semibold text-lg">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
                <div className="h-px bg-white/[0.10]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Anticipo Sugerido (60%):</span>
                  <span className="text-sm text-slate-500">
                    {formatPrice(suggestedAdvance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monto del Pago */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount" className="text-sm font-medium">
              Monto Recibido
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="pl-7"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-slate-500">
              Mínimo: {formatPrice(0)} | Máximo: {formatPrice(totalAmount)}
            </p>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="text-sm font-medium">
              Método de Pago
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isLoading}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumen de Saldo */}
          <Card className="border-emerald-200 bg-emerald-500/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Saldo Pendiente:</span>
                  <span className="font-semibold text-emerald-300">
                    {formatPrice(Math.max(0, remainingBalance))}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Se registrará automáticamente como pago tipo "Adelanto"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Validación */}
          {parseFloat(paymentAmount || "0") > totalAmount && (
            <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                El monto no puede ser mayor al total del proyecto
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-card border-t border-white/[0.08]">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                isLoading ||
                !paymentAmount ||
                parseFloat(paymentAmount) <= 0 ||
                parseFloat(paymentAmount) > totalAmount
              }
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? "Creando..." : "Crear Proyecto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
