"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Filter, X, Download } from "lucide-react";

export function ClosureReportTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "confirmed">("confirmed");
  const [showFilters, setShowFilters] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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

  const handleDownloadPDF = async (closureId: number) => {
    setDownloadingId(closureId);
    try {
      const result = await trpc.accountingClosures.generatePDF.useQuery(
        { closureId },
        { enabled: false }
      ).refetch();
      
      const pdfData = result.data;
      if (!pdfData) throw new Error("No PDF data received");
      
      // Create blob from HTML
      const blob = new Blob([pdfData.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      // Create iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      
      // Wait for iframe to load then print
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 100);
      };
      
      toast.success("✅ PDF generado. Se abrirá la vista previa de impresión");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("❌ Error al generar el PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: "draft" | "confirmed") => {
    if (status === "draft") {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Borrador</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Confirmado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Cierres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {summary?.totalClosures || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Período seleccionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              ${Number(summary?.totalSales || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">De todos los cierres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${Number(summary?.totalExpenses || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">De todos los cierres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Ganancia Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${Number(summary?.totalProfit || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">De todos los cierres</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtra los cierres por período y estado</CardDescription>
            </div>
            {(startDate || endDate || statusFilter !== "confirmed") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium">
                Fecha Inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium">
                Fecha Fin
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Estado
              </Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Todos</option>
                <option value="draft">Borrador</option>
                <option value="confirmed">Confirmado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closures List */}
      <Card>
        <CardHeader>
          <CardTitle>Cierres Contables</CardTitle>
          <CardDescription>
            {reports?.length || 0} cierre(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((closure: any) => (
                <div
                  key={closure.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
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

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Creado: {new Date(closure.createdAt).toLocaleDateString("es-CO")}
                      {closure.confirmedAt && ` • Confirmado: ${new Date(closure.confirmedAt).toLocaleDateString("es-CO")}`}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(closure.id)}
                      disabled={downloadingId === closure.id}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloadingId === closure.id ? "Generando..." : "Descargar PDF"}
                    </Button>
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
    </div>
  );
}
