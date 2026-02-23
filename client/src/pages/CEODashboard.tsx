import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, DollarSign, AlertTriangle, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CEODashboard() {
  const { data: dashboardData, isLoading, error } = trpc.dashboard.getGlobalDashboard.useQuery();

  // DEBUG LOGS
  useEffect(() => {
    console.log("Dashboard data:", dashboardData);
    console.log("Dashboard error:", error);
    console.log("Dashboard loading:", isLoading);
  }, [dashboardData, error, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }



  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center max-w-2xl">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-bold mb-4">Error al cargar el dashboard</p>
          <pre style={{
            backgroundColor: "#f3f4f6",
            padding: "16px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "400px",
            textAlign: "left",
            fontSize: "12px",
            color: "#dc2626",
            fontFamily: "monospace"
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const getRentabilidadColor = (rentabilidad: number) => {
    if (rentabilidad >= 20) return "bg-green-100 text-green-800";
    if (rentabilidad >= 15) return "bg-blue-100 text-blue-800";
    if (rentabilidad >= 10) return "bg-yellow-100 text-yellow-800";
    if (rentabilidad >= 5) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getRentabilidadBadge = (rentabilidad: number) => {
    if (rentabilidad >= 20) return "✓ Excelente";
    if (rentabilidad >= 15) return "✓ Bueno";
    if (rentabilidad >= 10) return "⚠ Moderado";
    if (rentabilidad >= 5) return "⚠ Bajo";
    return "🚨 Crítico";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Panel Financiero CEO</h1>
          <p className="text-sm text-muted-foreground">Control total del negocio - Métricas en tiempo real</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Ingresos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.totalIngresos)}</p>
              <p className="text-xs text-gray-500 mt-1">{dashboardData.totalProyectos} proyectos</p>
            </CardContent>
          </Card>

          {/* Total Pagos */}
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Total Pagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(dashboardData.totalPagosRecibidos)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {dashboardData.totalIngresos > 0
                  ? `${Math.round((dashboardData.totalPagosRecibidos / dashboardData.totalIngresos) * 100)}% cobrado`
                  : "0% cobrado"}
              </p>
            </CardContent>
          </Card>

          {/* Margen Global */}
          <Card className={`border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${getRentabilidadColor(dashboardData.rentabilidadPromedio)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Margen Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(dashboardData.margenGlobal)}</p>
              <p className="text-xs mt-1">{dashboardData.rentabilidadPromedio.toFixed(2)}% rentabilidad</p>
            </CardContent>
          </Card>

          {/* Proyectos en Riesgo */}
          <Card className={`border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${dashboardData.proyectosEnRiesgo > 0 ? "bg-red-50" : "bg-green-50"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                Proyectos en Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${dashboardData.proyectosEnRiesgo > 0 ? "text-red-600" : "text-green-600"}`}>
                {dashboardData.proyectosEnRiesgo}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rentabilidad &lt; 15%</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">Resumen Financiero Detallado</CardTitle>
            <CardDescription>Desglose completo de ingresos y gastos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Ingresos</span>
                  <span className="font-bold text-green-600">{formatCurrency(dashboardData.totalIngresos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Pagado</span>
                  <span className="font-bold text-blue-600">{formatCurrency(dashboardData.totalPagosRecibidos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Saldo Pendiente</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(dashboardData.totalIngresos - dashboardData.totalPagosRecibidos)}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Gastos Proyectos</span>
                  <span className="font-bold text-red-600">-{formatCurrency(dashboardData.totalGastosProyectos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Gastos Operativos</span>
                  <span className="font-bold text-orange-600">-{formatCurrency(dashboardData.totalGastosOperativos)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Total Gastos</span>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(dashboardData.totalGastosProyectos + dashboardData.totalGastosOperativos)}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Row */}
            <div className="mt-6 pt-6 border-t-2 space-y-3">
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Margen Global</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(dashboardData.margenGlobal)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Rentabilidad Promedio</span>
                <Badge className={`${getRentabilidadColor(dashboardData.rentabilidadPromedio)}`}>
                  {getRentabilidadBadge(dashboardData.rentabilidadPromedio)}
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Margen Neto (después de gastos operativos)</span>
                <span className="font-bold text-lg text-purple-600">
                  {formatCurrency(dashboardData.margenGlobal - dashboardData.totalGastosOperativos)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flujo de Caja - Últimos 6 Meses */}
        {dashboardData?.cashFlow && dashboardData.cashFlow.length > 0 && (
          <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold tracking-tight">Flujo de Caja - Últimos 6 Meses</CardTitle>
              <CardDescription>Ingresos vs Egresos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" />
                  <Bar dataKey="egresos" fill="#dc2626" name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-0 shadow-md bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Información del Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p>
              Este dashboard muestra métricas financieras en tiempo real. Los datos se actualizan automáticamente.
              Todos los cálculos se basan en proyectos activos, pagos registrados y gastos contabilizados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
