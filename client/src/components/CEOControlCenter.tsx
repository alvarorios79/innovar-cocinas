import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
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
  // Query para obtener datos globales del dashboard
  const { data: dashboardData, isLoading, error } = trpc.dashboard.getGlobalDashboard.useQuery();

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

  if (!dashboardData) {
    return (
      <Card className="border-2 border-yellow-800 bg-gradient-to-br from-yellow-900 to-yellow-800 shadow-2xl">
        <CardContent className="p-6 text-center text-yellow-300">
          Sin datos disponibles
        </CardContent>
      </Card>
    );
  }

  // Usar datos reales del backend (campos disponibles)
  const totalIngresos = Number(dashboardData?.totalRevenue) || 0;
  const totalGastos = Number(dashboardData?.totalExpenses) || 0;
  const margen = Number(dashboardData?.balance) || 0;
  
  // Calcular rentabilidad
  const rentabilidad = totalIngresos > 0 
    ? ((margen / totalIngresos) * 100)
    : 0;

  // Datos de flujo de caja del backend
  const cashFlowData = dashboardData?.cashFlow || [];

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
        {/* INDICADORES PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ingresos */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-lg p-4 border border-green-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-green-300 font-semibold">Ingresos Totales</p>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-green-300 break-words">
              {formatCurrency(totalIngresos)}
            </p>
          </div>

          {/* Gastos */}
          <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 rounded-lg p-4 border border-red-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-300 font-semibold">Gastos Totales</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-red-300 break-words">
              {formatCurrency(totalGastos)}
            </p>
          </div>

          {/* Margen */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-lg p-4 border border-blue-600/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-300 font-semibold">Margen Neto</p>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-blue-300 break-words">
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

        {/* GRÁFICO DE FLUJO DE CAJA */}
        {cashFlowData && cashFlowData.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Flujo de Caja Mensual
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {cashFlowData.slice(0, 6).map((month: any, idx: number) => {
                const ingresos = Number(month.ingresos) || 0;
                const egresos = Number(month.egresos) || 0;
                const maxValue = Math.max(ingresos, egresos) || 1;
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5 h-16 bg-slate-700/30 rounded p-1">
                      <div 
                        className="w-1/2 bg-gradient-to-t from-green-500 to-green-400 rounded-t opacity-80"
                        style={{ height: `${(ingresos / maxValue) * 100}%`, minHeight: '2px' }}
                        title={`Ingresos: ${formatCurrency(ingresos)}`}
                      />
                      <div 
                        className="w-1/2 bg-gradient-to-t from-red-500 to-red-400 rounded-t opacity-80"
                        style={{ height: `${(egresos / maxValue) * 100}%`, minHeight: '2px' }}
                        title={`Egresos: ${formatCurrency(egresos)}`}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-semibold text-center">{month.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-slate-300 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Ingresos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>Egresos</span>
              </div>
            </div>
          </div>
        )}

        {/* RESUMEN */}
        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Resumen Financiero</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Total de Ingresos:</span>
              <span className="font-semibold text-green-400">{formatCurrency(totalIngresos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total de Gastos:</span>
              <span className="font-semibold text-red-400">{formatCurrency(totalGastos)}</span>
            </div>
            <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between">
              <span>Margen Neto:</span>
              <span className="font-semibold text-blue-400">{formatCurrency(margen)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rentabilidad:</span>
              <span className="font-semibold text-amber-400">{rentabilidad.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
