import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

interface PaymentsSummaryProps {
  totalAmount: number;
  totalPaid: number;
  balance: number;
  discounts?: number;
  surcharges?: number;
  totalCobrado?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getBalanceColor(balance: number): { bg: string; text: string; icon: any } {
  if (balance < 0) {
    return { bg: "bg-blue-500/10", text: "text-blue-400", icon: AlertCircle };
  } else if (balance === 0) {
    return { bg: "bg-green-500/10", text: "text-green-400", icon: CheckCircle2 };
  } else {
    return { bg: "bg-red-500/10", text: "text-red-400", icon: AlertCircle };
  }
}

export function PaymentsSummary({ totalAmount, totalPaid, balance, discounts = 0, surcharges = 0, totalCobrado = 0 }: PaymentsSummaryProps) {
  const balanceColor = getBalanceColor(balance);
  const BalanceIcon = balanceColor.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {/* Total del Proyecto */}
      <Card>
        <CardHeader className="py-3 bg-blue-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-400" />
            Total del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-bold text-blue-400 break-all">
            {formatCurrency(totalAmount)}
          </p>
        </CardContent>
      </Card>

      {/* Total Cobrado */}
      <Card>
        <CardHeader className="py-3 bg-green-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Total Cobrado
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-bold text-green-400 break-all">
            {formatCurrency(totalCobrado || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalAmount > 0 ? `${Math.round(((totalCobrado || 0) / totalAmount) * 100)}%` : "0%"}
          </p>
        </CardContent>
      </Card>

      {/* Pagado */}
      <Card>
        <CardHeader className="py-3 bg-green-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Pagado
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-bold text-green-400 break-all">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalAmount > 0 ? `${Math.round((totalPaid / totalAmount) * 100)}%` : "0%"}
          </p>
        </CardContent>
      </Card>

      {/* Descuentos */}
      <Card>
        <CardHeader className="py-3 bg-purple-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-400" />
            Descuentos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-bold text-purple-400 break-all">
            -{formatCurrency(discounts)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Aplicados
          </p>
        </CardContent>
      </Card>

      {/* Recargos */}
      <Card>
        <CardHeader className="py-3 bg-orange-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            Recargos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-bold text-orange-400 break-all">
            +{formatCurrency(surcharges)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicionales
          </p>
        </CardContent>
      </Card>

      {/* Saldo Pendiente */}
      <Card>
        <CardHeader className={`py-3 ${balanceColor.bg}`}>
          <CardTitle className={`text-sm flex items-center gap-2 ${balanceColor.text}`}>
            <BalanceIcon className="h-4 w-4" />
            Saldo Pendiente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className={`text-lg font-bold break-all ${balanceColor.text}`}>
            {formatCurrency(balance)}
          </p>
          {balance < 0 && (
            <p className="text-xs text-blue-400 mt-1">
              Overpago
            </p>
          )}
          {balance === 0 && (
            <p className="text-xs text-green-400 mt-1">
              Totalmente pagado
            </p>
          )}
          {balance > 0 && (
            <p className="text-xs text-red-400 mt-1">
              Pendiente de cobro
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
