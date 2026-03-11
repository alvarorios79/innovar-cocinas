import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CEOControlCenter() {
  // Query para obtener métricas del Panel CEO
  const { data: ceoMetrics, isLoading, error } = trpc.dashboard.getCEOMetrics.useQuery();

  if (isLoading) {
    return (
      <Card className="border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
        <CardContent className="p-6 text-center text-slate-300">
          Cargando Centro de Control...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-800 bg-gradient-to-br from-red-900 to-red-800 shadow-2xl">
        <CardContent className="p-6 text-center text-red-300">
          <div className="font-bold mb-2">Error al cargar Dashboard</div>
          <div className="text-sm">{error.message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!ceoMetrics) {
    return (
      <Card className="border-2 border-yellow-800 bg-gradient-to-br from-yellow-900 to-yellow-800 shadow-2xl">
        <CardContent className="p-6 text-center text-yellow-300">
          Sin datos disponibles
        </CardContent>
      </Card>
    );
  }

  // Extraer métricas
  const ingresosRecibidos = Number(ceoMetrics?.ingresosRecibidos) || 0;
  const totalVendido = Number(ceoMetrics?.totalVendido) || 0;
  const porCobrar = Number(ceoMetrics?.porCobrar) || 0;
  const gastos = Number(ceoMetrics?.gastos) || 0;
  const margen = Number(ceoMetrics?.margen) || 0;
  const rentabilidad = Number(ceoMetrics?.rentabilidad) || 0;

  return (
    <Card className="border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-700 p-2 rounded-lg">
            <Target className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-white text-xl">CEO – Centro de Control</CardTitle>
            <CardDescription className="text-slate-300">Panel ejecutivo de gestión financiera</CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Contenido */}
      <CardContent className="p-6 space-y-6">
        {/* INDICADORES PRINCIPALES - Primera fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Ingresos Recibidos */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-lg p-4 border border-green-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-green-300 font-semibold">Ingresos Recibidos</p>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-green-300 break-words">
              {formatCurrency(ingresosRecibidos)}
            </p>
          </div>

          {/* Total Vendido */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-lg p-4 border border-blue-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-300 font-semibold">Total Vendido</p>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-blue-300 break-words">
              {formatCurrency(totalVendido)}
            </p>
          </div>

          {/* Por Cobrar */}
          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 rounded-lg p-4 border border-orange-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-orange-300 font-semibold">Por Cobrar</p>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-orange-300 break-words">
              {formatCurrency(porCobrar)}
            </p>
          </div>
        </div>

        {/* INDICADORES PRINCIPALES - Segunda fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Gastos */}
          <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 rounded-lg p-4 border border-red-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-300 font-semibold">Gastos Totales</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-red-300 break-words">
              {formatCurrency(gastos)}
            </p>
          </div>

          {/* Margen */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 rounded-lg p-4 border border-purple-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-purple-300 font-semibold">Margen Neto</p>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-purple-300 break-words">
              {formatCurrency(margen)}
            </p>
          </div>

          {/* Rentabilidad */}
          <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/40 rounded-lg p-4 border border-amber-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-amber-300 font-semibold">Rentabilidad</p>
              <Target className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-amber-300 break-words">
              {rentabilidad.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* RESUMEN */}
        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Resumen Financiero</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Ingresos Recibidos:</span>
              <span className="font-semibold text-green-400">{formatCurrency(ingresosRecibidos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Vendido:</span>
              <span className="font-semibold text-blue-400">{formatCurrency(totalVendido)}</span>
            </div>
            <div className="flex justify-between">
              <span>Por Cobrar:</span>
              <span className="font-semibold text-orange-400">{formatCurrency(porCobrar)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gastos Totales:</span>
              <span className="font-semibold text-red-400">{formatCurrency(gastos)}</span>
            </div>
            <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between">
              <span>Margen Neto:</span>
              <span className="font-semibold text-purple-400">{formatCurrency(margen)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rentabilidad:</span>
              <span className="font-semibold text-amber-400">{rentabilidad.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* INDICADORES DE ALERTA */}
        <div className="space-y-2">
          {porCobrar > totalVendido * 0.3 && (
            <div className="bg-orange-900/40 border border-orange-600/50 rounded-lg p-3">
              <p className="text-xs text-orange-300 font-semibold">
                ⚠️ Alerta: {((porCobrar / totalVendido) * 100).toFixed(0)}% de la cartera está pendiente de cobro
              </p>
            </div>
          )}
          {rentabilidad < 15 && ingresosRecibidos > 0 && (
            <div className="bg-red-900/40 border border-red-600/50 rounded-lg p-3">
              <p className="text-xs text-red-300 font-semibold">
                🚨 Alerta: Rentabilidad baja ({rentabilidad.toFixed(1)}%) - Revisar gastos
              </p>
            </div>
          )}
          {gastos > ingresosRecibidos * 0.5 && ingresosRecibidos > 0 && (
            <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg p-3">
              <p className="text-xs text-yellow-300 font-semibold">
                ⚠️ Alerta: Gastos representan {((gastos / ingresosRecibidos) * 100).toFixed(0)}% de ingresos
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
