import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, DollarSign, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
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

interface CashFlowMonth {
  label: string;
  ingresos: number;
  egresos: number;
}

interface ProjectRentability {
  name: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  profitMargin: number;
  status: string;
}

export function CEOControlCenter() {
  // Query para obtener datos globales del dashboard
  const { data: dashboardData, isLoading, error } = trpc.dashboard.getGlobalDashboard.useQuery();

  console.log('[CEOControlCenter] isLoading:', isLoading);
  console.log('[CEOControlCenter] error:', error);
  console.log('[CEOControlCenter] data:', dashboardData);

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

  // Usar datos reales del backend
  const totalIngresos = Number(dashboardData?.totalIngresos) || 0;
  const totalPagosRecibidos = Number(dashboardData?.totalPagosRecibidos) || 0;
  const carteraPendiente = totalIngresos - totalPagosRecibidos;
  const totalProjects = dashboardData?.totalProyectos || 0;
  const collectionRate = dashboardData?.collectionRate || 0;
  const outstandingRatio = dashboardData?.outstandingRatio || 0;
  
  // Datos de flujo de caja del backend
  const cashFlowData: CashFlowMonth[] = dashboardData?.cashFlow || [];
  
  // DEBUG
  console.log('[CEOControlCenter] dashboardData:', dashboardData);
  console.log('[CEOControlCenter] cashFlowData:', cashFlowData);
  console.log('[CEOControlCenter] cashFlowData.length:', cashFlowData.length);
  
  // Si no hay datos, mostrar array vacio (no fallara la UI)
  if (!cashFlowData || cashFlowData.length === 0) {
    console.warn('[CEOControlCenter] No cash flow data available');
  }

  // Rentabilidad (simulada por ahora)
  const rentabilityData: ProjectRentability[] = [
    {
      name: 'Proyecto 1',
      totalAmount: totalIngresos / 5,
      totalPaid: totalPagosRecibidos / 5,
      balance: carteraPendiente / 5,
      profitMargin: 35,
      status: 'en_produccion',
    },
  ];

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

      {/* Contenido - Alertas + 4 Secciones */}
      <CardContent className="p-6 space-y-6">
        {/* ALERTAS FINANCIERAS */}
        {dashboardData?.alerts && Object.values(dashboardData.alerts).some(Boolean) && (
          <div className="bg-red-950/40 border-l-4 border-red-500 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <h3 className="text-sm font-bold text-red-300">Alertas Financieras</h3>
            </div>
            <div className="space-y-2 text-sm text-red-200">
              {dashboardData.alerts.highOutstanding && (
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Cartera pendiente supera 40% ({outstandingRatio?.toFixed(1)}%)</span>
                </div>
              )}
              {dashboardData.alerts.lowCollectionRate && (
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Tasa de cobranza inferior al 70% ({collectionRate?.toFixed(1)}%)</span>
                </div>
              )}
              {dashboardData.alerts.deliveredWithOutstanding && (
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Existen {dashboardData.deliveredWithOutstanding} proyecto(s) entregado(s) con saldo pendiente</span>
                </div>
              )}
              {dashboardData.alerts.lowProfitProjectsCount && (
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Hay {dashboardData.lowProfitProjectsCount} proyecto(s) con rentabilidad inferior al 10%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1️⃣ FLUJO DE CAJA MENSUAL */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Flujo de Caja Mensual (últimos 6 meses)
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {cashFlowData.map((month, idx) => {
              const maxValue = Math.max(...cashFlowData.map(m => Math.max(m.ingresos, m.egresos)));
              const inflowHeight = (month.ingresos / maxValue) * 100;
              const outflowHeight = (month.egresos / maxValue) * 100;
              
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5 h-24 bg-slate-700/30 rounded p-1">
                    <div 
                      className="w-1/2 bg-gradient-to-t from-green-500 to-green-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${inflowHeight}%`, minHeight: '4px' }}
                      title={`Ingresos: ${formatCurrency(month.ingresos)}`}
                    />
                    <div 
                      className="w-1/2 bg-gradient-to-t from-red-500 to-red-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${outflowHeight}%`, minHeight: '4px' }}
                      title={`Egresos: ${formatCurrency(month.egresos)}`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">{month.label}</span>
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

        {/* 2️⃣ CARTERA PENDIENTE */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Cartera Pendiente</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(carteraPendiente)}</p>
            <p className="text-xs text-slate-400 mt-1">{dashboardData?.proyectosConSaldoVencido || 0} proyectos</p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Cartera Total</p>
            <p className="text-lg font-bold text-blue-400">{formatCurrency(totalIngresos)}</p>
            <p className="text-xs text-slate-400 mt-1">{totalProjects} proyectos</p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Proyectos Activos</p>
            <p className="text-lg font-bold text-amber-400">{totalProjects}</p>
            <p className="text-xs text-slate-400 mt-1">En producción</p>
          </div>
        </div>

        {/* 3️⃣ TASA DE COBRANZA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              Tasa de Cobranza
            </h3>
            <Badge className={`${collectionRate >= 80 ? 'bg-green-600' : collectionRate >= 60 ? 'bg-amber-600' : 'bg-red-600'}`}>
              {collectionRate.toFixed(1)}%
            </Badge>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                collectionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                collectionRate >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Pagado: {formatCurrency(totalPagosRecibidos)}</span>
            <span>Meta: 80%</span>
          </div>
        </div>

        {/* 4️⃣ TABLA RENTABILIDAD */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Top 5 Proyectos por Rentabilidad
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left py-2 px-2 text-slate-300">Proyecto</th>
                  <th className="text-right py-2 px-2 text-slate-300">Total</th>
                  <th className="text-right py-2 px-2 text-slate-300">Pagado</th>
                  <th className="text-right py-2 px-2 text-slate-300">Margen</th>
                </tr>
              </thead>
              <tbody>
                {rentabilityData.map((project, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 px-2 text-slate-300 truncate">{project.name}</td>
                    <td className="text-right py-2 px-2 text-slate-300 text-xs">{formatCurrency(project.totalAmount)}</td>
                    <td className="text-right py-2 px-2">
                      <span className={project.totalPaid > 0 ? 'text-green-400' : 'text-slate-400'}>
                        {formatCurrency(project.totalPaid)}
                      </span>
                    </td>
                    <td className="text-right py-2 px-2">
                      <Badge 
                        variant="outline" 
                        className={`${
                          project.profitMargin >= 40 ? 'bg-green-900 text-green-300 border-green-700' :
                          project.profitMargin >= 25 ? 'bg-blue-900 text-blue-300 border-blue-700' :
                          'bg-slate-700 text-slate-300 border-slate-600'
                        }`}
                      >
                        {project.profitMargin.toFixed(0)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GRAFICO FLUJO DE CAJA */}
        {cashFlowData && cashFlowData.length > 0 && (
          <div className="mt-6 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Flujo de Caja - Ultimos 6 Meses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Legend />
                <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" />
                <Bar dataKey="egresos" fill="#dc2626" name="Egresos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer con KPI Summary */}
        <div className="pt-4 border-t border-slate-600 flex items-center justify-between text-xs text-slate-400">
          <span>Última actualización: Hoy</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            <span>Sistema en línea</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
