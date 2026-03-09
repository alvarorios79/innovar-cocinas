import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    amount: number;
    type: "advance" | "final" | "partial" | "other";
    receivedAt: Date;
    method: "transfer" | "cash" | "check" | "other";
    movementType: "payment" | "discount" | "surcharge";
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: RegisterPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"advance" | "final" | "partial" | "other">("advance");
  const [method, setMethod] = useState<"transfer" | "cash" | "check" | "other">("transfer");
  const [movementType, setMovementType] = useState<"payment" | "discount" | "surcharge">("payment");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    if (!type) {
      alert("Debe seleccionar un tipo de pago");
      return;
    }

    await onSubmit({
      amount: parseFloat(amount),
      type,
      receivedAt: new Date(date),
      method,
      movementType,
      notes: notes || undefined,
    });

    // Reset form
    setAmount("");
    setType("advance");
    setMethod("transfer");
    setMovementType("payment");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
          <DialogDescription>
            Agrega un nuevo movimiento financiero al proyecto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto */}
          <div>
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="100"
            />
          </div>

          {/* Tipo de Movimiento */}
          <div>
            <Label htmlFor="movementType">Tipo de Movimiento *</Label>
            <Select value={movementType} onValueChange={(v) => setMovementType(v as any)}>
              <SelectTrigger id="movementType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Pago</SelectItem>
                <SelectItem value="discount">Descuento</SelectItem>
                <SelectItem value="surcharge">Recargo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Pago */}
          <div>
            <Label htmlFor="type">Tipo de Pago *</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance">Adelanto (60%)</SelectItem>
                <SelectItem value="final">Final (40%)</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Recepción */}
          <div>
            <Label htmlFor="date">Fecha de Recepción *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Método de Pago */}
          <div>
            <Label htmlFor="method">Método de Pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Agrega notas sobre este pago..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount || parseFloat(amount) <= 0 || !type}
          >
            {isLoading ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
