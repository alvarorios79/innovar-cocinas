import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface ProjectResultCardProps {
  totalAmount: number;
  materialExpenses: number;
  status?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function getMarginStatus(margin: number) {
  if (margin > 20) return { label: "Saludable", color: "bg-green-500/15 text-green-300", icon: CheckCircle2 };
  if (margin >= 10) return { label: "Moderado", color: "bg-blue-500/15 text-blue-300", icon: TrendingUp };
  if (margin >= 5) return { label: "En riesgo", color: "bg-orange-500/15 text-orange-300", icon: AlertTriangle };
  return { label: "Crítico", color: "bg-red-500/15 text-red-300", icon: AlertCircle };
}

export function ProjectResultCard({ totalAmount, materialExpenses, status }: ProjectResultCardProps) {
  const utilidadBruta = totalAmount - materialExpenses;
  const margen = totalAmount > 0 ? (utilidadBruta / totalAmount) * 100 : 0;
  const marginStatus = getMarginStatus(margen);
  const IconComponent = marginStatus.icon;

  return (
    <Card>
      <CardHeader className="py-3 bg-blue-500/10">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Resultado del Proyecto
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3 pt-4">
        {/* Gastos registrados */}
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-muted-foreground">Gastos Registrados</span>
          <span className="font-semibold text-orange-600">{formatCurrency(materialExpenses)}</span>
        </div>

        {/* Utilidad bruta */}
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-muted-foreground">Utilidad Bruta</span>
          <span className={`font-bold text-lg ${utilidadBruta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(utilidadBruta)}
          </span>
        </div>

        {/* Margen % con estado */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-500/25 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700">Margen de Ganancia</span>
            <Badge className={marginStatus.color}>
              <IconComponent className="h-3 w-3 mr-1" />
              {marginStatus.label}
            </Badge>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-blue-600">{margen.toFixed(1)}%</span>
            <span className="text-xs text-blue-600 mb-1">del total del proyecto</span>
          </div>
        </div>

        {/* Estado del proyecto */}
        {status && (
          <div className="flex justify-between items-center py-2 border-t pt-3">
            <span className="text-muted-foreground text-xs">Estado</span>
            <Badge variant="outline" className="text-xs">
              {status === "entregado" && "Entregado"}
              {status === "en_proceso" && "En Proceso"}
              {status === "cotizacion_enviada" && "Cotización Enviada"}
              {status === "cotizacion_aprobada" && "Cotización Aprobada"}
              {status === "adelanto_recibido" && "Adelanto Recibido"}
              {status === "en_produccion" && "En Producción"}
              {status === "listo_instalacion" && "En Instalación"}
              {status === "instalado" && "Instalado"}
              {status === "cancelado" && "Cancelado"}
            </Badge>
          </div>
        )}

        {/* Alerta si margen es muy bajo */}
        {margen < 10 && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2 mt-2">
            <p className="text-xs text-amber-300">
              ⚠️ Margen bajo. Revisa los gastos registrados para optimizar la rentabilidad.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
