"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Filter, X } from "lucide-react";

export function ClosureReportTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "confirmed">("confirmed");
  const [showFilters, setShowFilters] = useState(false);

  // Queries
  const { data: reports, isLoading: reportsLoading } = trpc.accountingClosures.getReportsByPeriod.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: statusFilter,
    },
    { enabled: true }
  );

  const { data: summary, isLoading: summaryLoading } = trpc.accountingClosures.getSummary.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: true }
  );

  const { data: monthlySummary } = trpc.accountingClosures.getMonthlySummary.useQuery(
    { months: 6 },
    { enabled: true }
  );

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("confirmed");
  };

  const getStatusBadge = (status: "draft" | "confirmed") => {
    if (status === "draft") {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Borrador</Badge>;
    }
    return <Badge className="bg-green-600">Confirmado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && !summaryLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Cierres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary.totalClosures}</div>
              <p className="text-xs text-gray-500 mt-1">Cierres confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Ventas Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">
                ${Number(summary.totalSales).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Ingresos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Gastos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${Number(summary.totalExpenses).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Egresos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Ganancia Neta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${Number(summary.totalProfit).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Margen: {summary.averageProfitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-base">Filtros de Reportes</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600"
            >
              {showFilters ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Fecha Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "draft" | "confirmed")}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="draft">Borradores</option>
                  <option value="confirmed">Confirmados</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Reportes de Cierres Contables
          </CardTitle>
          <CardDescription>
            {reports?.length || 0} cierre(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((closure: any) => (
                <div
                  key={closure.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          Período: {new Date(closure.periodStart).toLocaleDateString("es-CO")} - {new Date(closure.periodEnd).toLocaleDateString("es-CO")}
                        </span>
                        {getStatusBadge(closure.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {closure.projectCount} proyecto(s) incluido(s)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Ventas</p>
                      <p className="text-lg font-semibold text-teal-600">
                        ${Number(closure.totalSales).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Gastos</p>
                      <p className="text-lg font-semibold text-orange-600">
                        ${Number(closure.totalExpenses).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Ganancia</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${Number(closure.totalProfit).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Creado: {new Date(closure.createdAt).toLocaleDateString("es-CO")}
                    {closure.confirmedAt && ` • Confirmado: ${new Date(closure.confirmedAt).toLocaleDateString("es-CO")}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No hay cierres contables que coincidan con los filtros</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary Chart */}
      {monthlySummary && monthlySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Resumen Mensual (Últimos 6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlySummary.map((month: any, idx: number) => (
                <div key={idx} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{month.month}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-teal-600">
                        Ventas: ${Number(month.sales).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-green-600">
                        Ganancia: ${Number(month.profit).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  {/* Simple bar visualization */}
                  <div className="flex gap-1 h-6 bg-gray-100 rounded overflow-hidden">
                    {month.sales > 0 && (
                      <div
                        className="bg-teal-500"
                        style={{
                          width: `${(month.sales / (monthlySummary[0]?.sales || 1)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
