import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Hammer, 
  Paintbrush, 
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Send,
  MessageCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

// Estados de producción para operario
const OPERATOR_STATUSES = {
  corte: { label: "Corte", color: "bg-orange-500", icon: Hammer },
  enchape: { label: "Enchape", color: "bg-orange-600", icon: Paintbrush },
  ensamble: { label: "Ensamble", color: "bg-orange-700", icon: Package },
};

// Checklist por etapa
const STAGE_CHECKLISTS: Record<string, Array<{ id: string; label: string; description: string }>> = {
  corte: [
    { id: "verificar_medidas", label: "Verificar medidas", description: "Confirmar que las medidas del despiece coinciden" },
    { id: "preparar_material", label: "Preparar material", description: "Seleccionar y preparar las láminas a cortar" },
    { id: "configurar_maquina", label: "Configurar máquina", description: "Ajustar la sierra/CNC según especificaciones" },
    { id: "ejecutar_cortes", label: "Ejecutar cortes", description: "Realizar todos los cortes del despiece" },
    { id: "verificar_piezas", label: "Verificar piezas", description: "Revisar que todas las piezas estén correctas" },
    { id: "etiquetar", label: "Etiquetar piezas", description: "Marcar cada pieza según el plano" },
  ],
  enchape: [
    { id: "verificar_cantos", label: "Verificar cantos", description: "Confirmar tipo y color de canto para cada pieza" },
    { id: "preparar_enchapadora", label: "Preparar enchapadora", description: "Cargar el canto correcto en la máquina" },
    { id: "enchapar_piezas", label: "Enchapar piezas", description: "Aplicar canto a todas las piezas requeridas" },
    { id: "limpiar_exceso", label: "Limpiar exceso", description: "Retirar exceso de canto y limpiar bordes" },
    { id: "verificar_acabado", label: "Verificar acabado", description: "Revisar que el enchape esté uniforme" },
  ],
  ensamble: [
    { id: "organizar_piezas", label: "Organizar piezas", description: "Agrupar piezas por módulo" },
    { id: "verificar_herrajes", label: "Verificar herrajes", description: "Confirmar que todos los herrajes estén disponibles" },
    { id: "perforar", label: "Perforar", description: "Realizar perforaciones para herrajes" },
    { id: "ensamblar_modulos", label: "Ensamblar módulos", description: "Armar cada módulo según plano" },
    { id: "instalar_herrajes", label: "Instalar herrajes", description: "Colocar bisagras, correderas, etc." },
    { id: "verificar_funcionamiento", label: "Verificar funcionamiento", description: "Probar puertas y cajones" },
    { id: "limpieza_final", label: "Limpieza final", description: "Limpiar y preparar para instalación" },
  ],
};

interface OperatorDailyProjectsProps {
  className?: string;
}

export function OperatorDailyProjects({ className }: OperatorDailyProjectsProps) {
  const [showMaterialsDialog, setShowMaterialsDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [materialsRequest, setMaterialsRequest] = useState("");
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, Record<string, boolean>>>({});
  
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  
  // Obtener usuarios para encontrar al jefe de taller
  const { data: users } = trpc.tasks.getAssignableUsers.useQuery();
  
  // Mutación para solicitar materiales
  const requestMaterials = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de materiales enviada");
      setShowMaterialsDialog(false);
      setMaterialsRequest("");
      setSelectedProject(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar solicitud");
    },
  });
  
  // Filtrar proyectos en etapas de producción para operario
  const operatorProjects = (projects || []).filter(p => 
    ["corte", "enchape", "ensamble"].includes(p.status)
  );
  
  const handleRequestMaterials = () => {
    if (!selectedProject || !materialsRequest.trim()) {
      toast.error("Por favor describe los materiales que necesitas");
      return;
    }
    
    // Buscar jefe de taller o admin para asignar la tarea
    const jefeTaller = users?.find((u: any) => u.role === "jefe_taller");
    const admin = users?.find((u: any) => u.role === "admin" || u.role === "super_admin");
    const assignTo = jefeTaller?.id || admin?.id;
    
    if (!assignTo) {
      toast.error("No se encontró un jefe de taller o administrador para enviar la solicitud");
      return;
    }
    
    requestMaterials.mutate({
      title: `🔧 Solicitud de Materiales - ${selectedProject.name}`,
      description: `Proyecto: ${selectedProject.name}\nEtapa: ${OPERATOR_STATUSES[selectedProject.status as keyof typeof OPERATOR_STATUSES]?.label || selectedProject.status}\n\nMateriales solicitados:\n${materialsRequest}`,
      projectId: selectedProject.id,
      priority: "alta",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
      assignedTo: assignTo,
    });
  };
  
  const toggleCheckItem = (projectId: number, itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || {}),
        [itemId]: !(prev[projectId]?.[itemId] || false),
      },
    }));
  };
  
  const getCompletedCount = (projectId: number, status: string) => {
    const checklist = STAGE_CHECKLISTS[status] || [];
    const projectChecks = checkedItems[projectId] || {};
    return checklist.filter(item => projectChecks[item.id]).length;
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
    <>
      <Card className={`${className} border-orange-200`}>
        <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
            <Hammer className="h-5 w-5" />
            Mis Proyectos de Hoy
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {operatorProjects.length} proyecto(s) en producción
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {operatorProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tienes proyectos asignados en producción</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operatorProjects.map(project => {
                const StatusIcon = OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.icon || Package;
                const checklist = STAGE_CHECKLISTS[project.status] || [];
                const completedCount = getCompletedCount(project.id, project.status);
                const isExpanded = expandedProject === project.id;
                
                return (
                  <div 
                    key={project.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Header del proyecto */}
                    <div 
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.color || "bg-gray-400"
                      } bg-opacity-10`}
                      onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.color || "bg-gray-400"
                          }`}>
                            <StatusIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">{project.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {project.client?.name || "Cliente"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.color || "bg-gray-400"
                          } text-white`}>
                            {OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.label || project.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {completedCount}/{checklist.length}
                          </span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.color || "bg-gray-400"
                            }`}
                            style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Checklist expandido */}
                    {isExpanded && (
                      <div className="p-3 bg-gray-50 border-t">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Checklist de {OPERATOR_STATUSES[project.status as keyof typeof OPERATOR_STATUSES]?.label}
                        </h5>
                        
                        <div className="space-y-2 mb-4">
                          {checklist.map(item => {
                            const isChecked = checkedItems[project.id]?.[item.id] || false;
                            return (
                              <div 
                                key={item.id}
                                className={`flex items-start gap-3 p-2 rounded-lg border transition-colors ${
                                  isChecked ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                                }`}
                              >
                                <Checkbox
                                  id={`${project.id}-${item.id}`}
                                  checked={isChecked}
                                  onCheckedChange={() => toggleCheckItem(project.id, item.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <label 
                                    htmlFor={`${project.id}-${item.id}`}
                                    className={`font-medium text-sm cursor-pointer ${isChecked ? "line-through text-muted-foreground" : ""}`}
                                  >
                                    {item.label}
                                  </label>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalles
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setShowMaterialsDialog(true);
                            }}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Solicitar Materiales
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Diálogo de solicitud de materiales */}
      <Dialog open={showMaterialsDialog} onOpenChange={setShowMaterialsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" />
              Solicitar Materiales
            </DialogTitle>
            <DialogDescription>
              {selectedProject && (
                <>
                  Proyecto: <strong>{selectedProject.name}</strong>
                  <br />
                  Etapa: {OPERATOR_STATUSES[selectedProject.status as keyof typeof OPERATOR_STATUSES]?.label}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                ¿Qué materiales necesitas?
              </label>
              <Textarea
                placeholder="Ej: 2 láminas de MDF 15mm color blanco, 10 metros de canto PVC 2mm..."
                value={materialsRequest}
                onChange={(e) => setMaterialsRequest(e.target.value)}
                rows={4}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Esta solicitud será enviada al Jefe de Taller y Administradores.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaterialsDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRequestMaterials}
              disabled={requestMaterials.isPending || !materialsRequest.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
