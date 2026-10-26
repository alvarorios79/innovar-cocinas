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
import { CheckCircle2, DollarSign, TrendingUp, Loader2, Archive } from "lucide-react";

function formatCurrency(value: string | number) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(numValue);
}

export function ClosedProjectsTab() {
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const [filterClient, setFilterClient] = useState("");

  // Query closed projects
  const { data: closedProjects, isLoading } = trpc.accountingClosures.getClosedProjects.useQuery({
    limit: 200,
  });

  // Filter and sort projects
  const filteredProjects = closedProjects
    ? closedProjects
        .filter((p) => {
          if (!filterClient) return true;
          return (
            p.clientName?.toLowerCase().includes(filterClient.toLowerCase()) ||
            p.projectName?.toLowerCase().includes(filterClient.toLowerCase())
          );
        })
        .sort((a, b) => {
          // Sort by projectId as a proxy for creation time
          if (sortBy === "recent") {
            return (b.projectId || 0) - (a.projectId || 0);
          }
          return (a.projectId || 0) - (b.projectId || 0);
        })
    : [];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-teal-400" />
            Filtrar Proyectos Cerrados
          </CardTitle>
          <CardDescription>Busca proyectos cerrados por cliente o nombre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar Cliente o Proyecto</Label>
              <Input
                id="search"
                type="text"
                placeholder="Escribe para buscar..."
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
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
                onClick={() => setFilterClient("")}
                variant="outline"
                className="w-full h-10"
              >
                Limpiar búsqueda
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Proyectos Cerrados */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Proyectos Cerrados
          </CardTitle>
          <CardDescription>
            {isLoading ? "Cargando..." : `${filteredProjects.length} proyecto(s) cerrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
              <span className="ml-2 text-muted-foreground">Cargando proyectos...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay proyectos cerrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/[0.03]">
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Proyecto</TableHead>
                    <TableHead className="text-right font-semibold">Valor Proyecto</TableHead>
                    <TableHead className="text-right font-semibold">Gastos</TableHead>
                    <TableHead className="text-right font-semibold">Utilidad</TableHead>
                    <TableHead className="font-semibold">Cierre Contable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project: any) => (
                    <TableRow key={project.id} className="hover:bg-white/[0.03]">
                      <TableCell>
                        <div className="font-medium text-foreground">{project.clientName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{project.projectName}</div>
                          <Badge variant="secondary" className="text-xs">
                            ID: {project.projectId}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <span className="font-semibold text-green-400">
                            {formatCurrency(project.totalAmount || "0")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-orange-400 font-semibold">-</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                          <span className="font-bold text-blue-400">-</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className="bg-teal-500/15 text-teal-300 block">
                            ID: {project.closureId}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {project.closurePeriod || "-"}
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
      {filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total Proyectos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(
                  filteredProjects.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0)
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Información Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver detalles en cierres confirmados
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Información Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver detalles en cierres confirmados
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proyectos Cerrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-400">
                {filteredProjects.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
