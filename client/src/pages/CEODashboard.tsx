import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
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

// ── Componente principal ─────────────────────────────────────────────────────
export function CEODashboard() {
  const { data: ceoMetrics, isLoading, error } = trpc.dashboard.getCEOMetrics.useQuery();
  const { data: dashboardData } = trpc.dashboard.getGlobalDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 mx-auto mb-4"
            style={{ border: "3px solid #e2e8f0", borderTopColor: "#1DB5A8" }}
          />
          <p className="text-sm text-muted-foreground">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !ceoMetrics) {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-lg">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-500 font-semibold mb-3">Error al cargar el dashboard</p>
          <pre className="bg-red-500/10 text-red-400 text-xs p-4 rounded-lg overflow-auto text-left max-h-60">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const ingresosRecibidos = Number(ceoMetrics?.ingresosRecibidos) || 0;
  const totalVendido      = Number(ceoMetrics?.totalVendido) || 0;
  const porCobrar         = Number(ceoMetrics?.porCobrar) || 0;
  const gastos            = Number(ceoMetrics?.gastos) || 0;
  const margen            = Number(ceoMetrics?.margen) || 0;
  const rentabilidad      = Number(ceoMetrics?.rentabilidad) || 0;
  const cashFlowData      = dashboardData?.cashFlow || [];

  const pctPorCobrar = totalVendido > 0 ? ((porCobrar / totalVendido) * 100).toFixed(1) : "0";
  const pctGastos    = ingresosRecibidos > 0 ? ((gastos / ingresosRecibidos) * 100).toFixed(1) : "0";

  return (
    <div>
      <PageHeader
        title="Financiero"
        subtitle="Métricas del negocio en tiempo real"
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {/* ── Fila 1: KPIs principales ── */}
      <KpiGrid cols={3} className="mb-6">
        <KpiCard
          label="Ingresos Recibidos"
          value={formatCurrency(ingresosRecibidos)}
          helper="Pagos registrados en el sistema"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="#1DB5A8"
        />
        <KpiCard
          label="Total Vendido"
          value={formatCurrency(totalVendido)}
          helper="Valor total de proyectos activos"
          icon={<DollarSign className="h-5 w-5" />}
          accent="#22C55E"
        />
        <KpiCard
          label="Por Cobrar"
          value={formatCurrency(porCobrar)}
          helper={`${pctPorCobrar}% del total vendido pendiente`}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="#F59E0B"
        />
      </KpiGrid>

      {/* ── Fila 2: KPIs financieros ── */}
      <KpiGrid cols={3} className="mb-8">
        <KpiCard
          label="Gastos Totales"
          value={formatCurrency(gastos)}
          helper={`${pctGastos}% de los ingresos recibidos`}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="#EF4444"
        />
        <KpiCard
          label="Margen Neto"
          value={formatCurrency(margen)}
          helper="Ingresos recibidos − gastos totales"
          icon={<DollarSign className="h-5 w-5" />}
          accent="#1DB5A8"
        />
        <KpiCard
          label="Rentabilidad"
          value={`${rentabilidad.toFixed(1)}%`}
          helper="Margen sobre ingresos recibidos"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="#F59E0B"
        />
      </KpiGrid>

      {/* ── Flujo de caja ── */}
      {cashFlowData.length > 0 && (
        <Card className="mb-6 shadow-sm border-0" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-white/85">Flujo de Caja — Últimos 6 meses</CardTitle>
            <CardDescription>Ingresos vs Egresos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingresos" fill="#1DB5A8" name="Ingresos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos"  fill="#EF4444" name="Egresos"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Resumen financiero detallado ── */}
      <Card className="mb-6 shadow-sm border-0" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white/85">Resumen Financiero Detallado</CardTitle>
          <CardDescription>Análisis completo de ingresos, gastos y rentabilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ingresos */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Ingresos</p>
              {[
                { label: "Recibidos",     value: formatCurrency(ingresosRecibidos), color: "text-teal-400" },
                { label: "Total Vendido", value: formatCurrency(totalVendido),      color: "text-teal-300" },
                { label: "Por Cobrar",    value: formatCurrency(porCobrar),         color: "text-amber-400" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-white/45">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Gastos */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Gastos</p>
              {[
                { label: "Total Gastos",  value: formatCurrency(gastos), color: "text-red-500" },
                { label: "% del Ingreso", value: `${pctGastos}%`,        color: "text-red-500" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-white/45">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Rentabilidad */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Resultado</p>
              {[
                { label: "Margen Neto",    value: formatCurrency(margen),       color: "text-teal-400" },
                { label: "Rentabilidad",   value: `${rentabilidad.toFixed(1)}%`, color: "text-amber-400" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-white/45">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary highlights */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Ingresos",     value: formatCurrency(ingresosRecibidos), bg: "rgba(29,181,168,0.06)",  border: "rgba(29,181,168,0.2)",  text: "text-teal-300" },
              { label: "Por Cobrar",   value: formatCurrency(porCobrar),         bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)",  text: "text-amber-300" },
              { label: "Gastos",       value: formatCurrency(gastos),            bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.2)",   text: "text-red-400" },
              { label: "Margen Neto",  value: formatCurrency(margen),            bg: "rgba(29,181,168,0.06)", border: "rgba(29,181,168,0.2)",  text: "text-teal-300" },
              { label: "Rentabilidad", value: `${rentabilidad.toFixed(1)}%`,     bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)",  text: "text-amber-300" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg px-4 py-3"
                style={{ background: item.bg, border: `1px solid ${item.border}` }}
              >
                <p className="text-xs text-white/45 mb-1">{item.label}</p>
                <p className={`text-base font-bold ${item.text}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Info ── */}
      <div
        className="rounded-xl p-5 text-sm text-white/60"
        style={{
          background: "rgba(29,181,168,0.04)",
          border: "1px solid rgba(29,181,168,0.15)",
        }}
      >
        <p className="font-semibold text-white/85 mb-2">Fuentes de datos</p>
        <ul className="space-y-1 text-white/45">
          <li><strong className="text-white/60">Ingresos Recibidos:</strong> Pagos registrados (movementType = payment)</li>
          <li><strong className="text-white/60">Total Vendido:</strong> Suma del valor de todos los proyectos activos</li>
          <li><strong className="text-white/60">Por Cobrar:</strong> Total vendido − ingresos recibidos</li>
          <li><strong className="text-white/60">Gastos:</strong> Gastos de proyectos + gastos operativos</li>
          <li><strong className="text-white/60">Margen Neto:</strong> Ingresos recibidos − gastos totales</li>
          <li><strong className="text-white/60">Rentabilidad:</strong> (Margen / Ingresos) × 100</li>
        </ul>
      </div>
    </div>
  );
}
