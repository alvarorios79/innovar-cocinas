import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Calendar, DollarSign, TrendingUp, Loader2 } from "lucide-react";

function formatDate(date: any) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export function ConfirmedClosuresTab() {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");

  // Query confirmed closures
  const { data: confirmedClosures, isLoading } = trpc.accountingClosures.getConfirmed.useQuery({
    periodStart: periodStart ? new Date(periodStart) : undefined,
    periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    limit: 100,
  });

  // Sort closures
  const sortedClosures = confirmedClosures
    ? [...confirmedClosures].sort((a, b) => {
        const dateA = new Date(a.confirmedAt || 0).getTime();
        const dateB = new Date(b.confirmedAt || 0).getTime();
        return sortBy === "recent" ? dateB - dateA : dateA - dateB;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Filtrar Cierres Confirmados
          </CardTitle>
          <CardDescription>Busca cierres por período de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period-start">Fecha Inicio</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="period-end">Fecha Fin</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="sort">Ordenar por</Label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger id="sort" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setPeriodStart("");
                  setPeriodEnd("");
                }}
                variant="outline"
                className="w-full h-10"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Cierres Confirmados */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Cierres Confirmados
          </CardTitle>
          <CardDescription>
            {isLoading ? "Cargando..." : `${sortedClosures.length} cierre(s) confirmado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="ml-2 text-muted-foreground">Cargando cierres...</span>
            </div>
          ) : sortedClosures.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay cierres confirmados en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/[0.03]">
                    <TableHead className="font-semibold">Período</TableHead>
                    <TableHead className="text-right font-semibold">Ingresos</TableHead>
                    <TableHead className="text-right font-semibold">Gastos Proyecto</TableHead>
                    <TableHead className="text-right font-semibold">Gastos Operativos</TableHead>
                    <TableHead className="text-right font-semibold">Utilidad Neta</TableHead>
                    <TableHead className="text-center font-semibold">Proyectos</TableHead>
                    <TableHead className="text-center font-semibold">Confirmado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClosures.map((closure: any) => (
                    <TableRow key={closure.id} className="hover:bg-white/[0.03]">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatDate(closure.periodStart)} - {formatDate(closure.periodEnd)}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            ID: {closure.id}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">
                            {formatCurrency(parseFloat(closure.totalSales || '0'))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-orange-600 font-semibold">
                          {formatCurrency(parseFloat(closure.totalExpenses || '0'))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 font-semibold">
                          {formatCurrency(0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-blue-600">
                            {formatCurrency(parseFloat(closure.totalProfit || '0'))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-teal-500/15 text-teal-300">
                          {closure.projectCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <Badge className="bg-green-500/15 text-green-300 block">
                            Confirmado
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(closure.confirmedAt)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de Totales */}
      {sortedClosures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  sortedClosures.reduce((sum, c) => sum + parseFloat(c.totalSales || '0'), 0)
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gastos Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(
                  sortedClosures.reduce((sum, c) => sum + parseFloat(c.totalExpenses || '0'), 0)
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gastos Operativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(0)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilidad Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  sortedClosures.reduce((sum, c) => sum + parseFloat(c.totalProfit || '0'), 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
