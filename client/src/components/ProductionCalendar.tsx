import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

// Estados de producción
const PRODUCTION_STATUSES = {
  aprobacion_final: { label: "Aprobación Final", color: "bg-green-400" },
  despiece: { label: "Despiece", color: "bg-blue-400" },
  corte: { label: "Corte", color: "bg-orange-400" },
  enchape: { label: "Enchape", color: "bg-orange-500" },
  ensamble: { label: "Ensamble", color: "bg-orange-600" },
  listo_instalacion: { label: "En Instalación", color: "bg-teal-500" },
  entregado: { label: "Entregado", color: "bg-green-600" },
};

// Tiempo estimado por etapa (en días hábiles)
const STAGE_ESTIMATED_DAYS: Record<string, number> = {
  aprobacion_final: 2,
  despiece: 2,
  corte: 3,
  enchape: 4,
  ensamble: 5,
  listo_instalacion: 2,
  entregado: 1,
};

interface ProductionCalendarProps {
  className?: string;
}

export function ProductionCalendar({ className }: ProductionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">("calendar");
  
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  
  // Filtrar proyectos en producción
  const productionProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => 
      ["aprobacion_final", "despiece", "corte", "enchape", "ensamble", "listo_instalacion", "listo_instalacion"].includes(p.status)
    );
  }, [projects]);
  
  // Calcular días en etapa actual
  const calculateDaysInStage = (project: any) => {
    const statusHistory = project.statusHistory || [];
    const currentStatusEntry = statusHistory.find((h: any) => h.toStatus === project.status);
    
    if (currentStatusEntry) {
      const entryDate = new Date(currentStatusEntry.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Fallback: usar fecha de actualización
    const updatedAt = new Date(project.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Obtener días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay, year, month };
  };
  
  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);
  
  // Proyectos por fecha de entrega estimada
  const projectsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    
    productionProjects.forEach(project => {
      if (project.estimatedInstallDate) {
        const dateKey = new Date(project.estimatedInstallDate).toISOString().split("T")[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(project);
      }
    });
    
    return map;
  }, [productionProjects]);
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };
  
  const renderCalendarDay = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayProjects = projectsByDate[dateKey] || [];
    const isToday = new Date().toISOString().split("T")[0] === dateKey;
    const isPast = new Date(dateKey) < new Date(new Date().toISOString().split("T")[0]);
    
    return (
      <div 
        key={day}
        className={`min-h-[80px] p-1 border rounded-md ${
          isToday ? "bg-blue-50 border-blue-300" : 
          isPast ? "bg-gray-50" : "bg-[#162828]"
        }`}
      >
        <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-600"}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayProjects.slice(0, 3).map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div 
                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                  PRODUCTION_STATUSES[project.status as keyof typeof PRODUCTION_STATUSES]?.color || "bg-gray-400"
                } text-white`}
                title={project.name}
              >
                {project.name.substring(0, 15)}...
              </div>
            </Link>
          ))}
          {dayProjects.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{dayProjects.length - 3} más
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-teal-600" />
            Calendario de Producción
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "calendar" ? "timeline" : "calendar")}>
              {viewMode === "calendar" ? "Ver Timeline" : "Ver Calendario"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "calendar" ? (
          <>
            {/* Navegación del mes */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">{monthNames[month]} {year}</h3>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos antes del primer día */}
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px]" />
              ))}
              {/* Días del mes */}
              {Array.from({ length: daysInMonth }).map((_, i) => renderCalendarDay(i + 1))}
            </div>
            
            {/* Leyenda */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {Object.entries(PRODUCTION_STATUSES).map(([key, value]) => (
                <Badge key={key} className={`${value.color} text-white text-xs`}>
                  {value.label}
                </Badge>
              ))}
            </div>
          </>
        ) : (
          /* Vista de Timeline con tiempos por etapa */
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">
              Proyectos en Producción ({productionProjects.length})
            </h4>
            
            {productionProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay proyectos en producción actualmente
              </p>
            ) : (
              <div className="space-y-3">
                {productionProjects.map(project => {
                  const daysInStage = calculateDaysInStage(project);
                  const estimatedDays = STAGE_ESTIMATED_DAYS[project.status] || 3;
                  const isOverdue = daysInStage > estimatedDays;
                  const isWarning = daysInStage >= estimatedDays - 1;
                  
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue ? "border-red-300 bg-red-50" :
                        isWarning ? "border-yellow-300 bg-yellow-50" :
                        "border-gray-200 bg-[#162828]"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{project.name}</span>
                          </div>
                          <Badge className={`${PRODUCTION_STATUSES[project.status as keyof typeof PRODUCTION_STATUSES]?.color || "bg-gray-400"} text-white text-xs`}>
                            {PRODUCTION_STATUSES[project.status as keyof typeof PRODUCTION_STATUSES]?.label || project.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Cliente: {project.client?.name || "N/A"}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 font-medium ${
                            isOverdue ? "text-red-600" :
                            isWarning ? "text-yellow-600" :
                            "text-green-600"
                          }`}>
                            {isOverdue ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            <span>{daysInStage}d / {estimatedDays}d estimados</span>
                          </div>
                        </div>
                        
                        {/* Barra de progreso de tiempo */}
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                isOverdue ? "bg-red-500" :
                                isWarning ? "bg-yellow-500" :
                                "bg-green-500"
                              }`}
                              style={{ width: `${Math.min((daysInStage / estimatedDays) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {project.estimatedInstallDate && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            Entrega estimada: {new Date(project.estimatedInstallDate).toLocaleDateString("es-CO")}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
