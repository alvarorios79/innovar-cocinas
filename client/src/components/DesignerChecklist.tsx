import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Image,
  FileText,
  Box,
  Palette,
  Send,
  Timer
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DesignerChecklistProps {
  projectId: number;
  projectName: string;
  advanceReceivedAt: Date | string | null;
  designDeadline: Date | string | null;
  status: string;
  onDeliverDesign?: () => void;
}

// Checklist de entregables del diseñador
const DESIGN_CHECKLIST_ITEMS = [
  { id: "renders", label: "Renders 3D", description: "Al menos 2 renders del diseño", icon: Image, category: "renders" },
  { id: "despieces", label: "Despieces", description: "Archivo de despiece completo", icon: FileText, category: "despieces" },
  { id: "modelado", label: "Modelado 3D", description: "Archivo de modelado 3D", icon: Box, category: "modelado" },
  { id: "detalles", label: "Detalles técnicos", description: "Especificaciones y medidas", icon: FileText, category: "detalles" },
  { id: "colores", label: "Paleta de colores", description: "Colores y materiales definidos", icon: Palette, category: "colores" },
];

export function DesignerChecklist({ 
  projectId, 
  projectName,
  advanceReceivedAt,
  designDeadline,
  status,
  onDeliverDesign 
}: DesignerChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  // Obtener fotos del proyecto para verificar automáticamente
  const { data: projectDetail } = trpc.projects.getById.useQuery({ id: projectId });
  
  // Calcular tiempo restante
  const calculateTimeRemaining = () => {
    if (!advanceReceivedAt) return null;
    
    const deadline = designDeadline 
      ? new Date(designDeadline) 
      : new Date(new Date(advanceReceivedAt).getTime() + 3 * 24 * 60 * 60 * 1000); // 3 días
    
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, text: "¡Tiempo vencido!" };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { 
      expired: false, 
      days, 
      hours, 
      text: `${days}d ${hours}h restantes`,
      urgency: days === 0 ? "critical" : days === 1 ? "warning" : "normal"
    };
  };
  
  const timeRemaining = calculateTimeRemaining();
  
  // Verificar automáticamente qué items están completos basado en las fotos
  useEffect(() => {
    if (projectDetail?.photos) {
      const photos = projectDetail.photos as any[];
      const newChecked: Record<string, boolean> = {};
      
      // Verificar renders
      const hasRenders = photos.some(p => p.subcategory === "renders");
      newChecked.renders = hasRenders;
      
      // Verificar despieces
      const hasDespieces = photos.some(p => p.subcategory === "despieces");
      newChecked.despieces = hasDespieces;
      
      // Verificar modelado
      const hasModelado = photos.some(p => p.subcategory === "modelado");
      newChecked.modelado = hasModelado;
      
      // Verificar detalles
      const hasDetalles = photos.some(p => p.subcategory === "detalles");
      newChecked.detalles = hasDetalles;
      
      // Verificar colores (si hay materiales seleccionados)
      const hasColores = !!(projectDetail as any).selectedColors || !!(projectDetail as any).selectedMaterials;
      newChecked.colores = hasColores;
      
      setCheckedItems(newChecked);
    }
  }, [projectDetail]);
  
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = DESIGN_CHECKLIST_ITEMS.length;
  const progress = (completedCount / totalCount) * 100;
  const allCompleted = completedCount === totalCount;
  
  // Solo mostrar si el proyecto está en estado de diseño
  if (!["adelanto_recibido", "en_diseno"].includes(status)) {
    return null;
  }
  
  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
            <CheckCircle2 className="h-5 w-5" />
            Checklist de Entregables
          </CardTitle>
          {timeRemaining && (
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${
                timeRemaining.expired 
                  ? "bg-red-100 text-red-700 border-red-300 animate-pulse" 
                  : timeRemaining.urgency === "critical"
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : timeRemaining.urgency === "warning"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-green-100 text-green-700 border-green-300"
              }`}
            >
              <Timer className="h-3 w-3" />
              {timeRemaining.text}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Verifica que todos los entregables estén listos antes de enviar al cliente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{completedCount}/{totalCount} completados</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Temporizador visual */}
        {timeRemaining && (
          <div className={`p-3 rounded-lg ${
            timeRemaining.expired 
              ? "bg-red-100 border border-red-200" 
              : timeRemaining.urgency === "critical"
                ? "bg-orange-100 border border-orange-200"
                : timeRemaining.urgency === "warning"
                  ? "bg-yellow-100 border border-yellow-200"
                  : "bg-green-100 border border-green-200"
          }`}>
            <div className="flex items-center gap-3">
              <Clock className={`h-8 w-8 ${
                timeRemaining.expired ? "text-red-600" : 
                timeRemaining.urgency === "critical" ? "text-orange-600" :
                timeRemaining.urgency === "warning" ? "text-yellow-600" : "text-green-600"
              }`} />
              <div>
                <p className="font-semibold text-sm">
                  {timeRemaining.expired 
                    ? "⚠️ Plazo de entrega vencido" 
                    : "Tiempo para entregar el diseño"}
                </p>
                {!timeRemaining.expired && (
                  <p className="text-2xl font-bold">
                    {timeRemaining.days > 0 && <span>{timeRemaining.days} días </span>}
                    <span>{timeRemaining.hours} horas</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Lista de verificación */}
        <div className="space-y-3">
          {DESIGN_CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            const isChecked = checkedItems[item.id] || false;
            
            return (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isChecked 
                    ? "bg-green-50 border-green-200" 
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className={`p-2 rounded-full ${isChecked ? "bg-green-100" : "bg-gray-100"}`}>
                  <Icon className={`h-4 w-4 ${isChecked ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${isChecked ? "text-green-700" : "text-gray-700"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Botón de entregar diseño */}
        {onDeliverDesign && (
          <Button 
            className="w-full mt-4" 
            disabled={!allCompleted}
            onClick={onDeliverDesign}
          >
            <Send className="h-4 w-4 mr-2" />
            {allCompleted 
              ? "Entregar Diseño al Cliente" 
              : `Completa ${totalCount - completedCount} items para entregar`}
          </Button>
        )}
        
        {!allCompleted && (
          <p className="text-xs text-center text-muted-foreground">
            Sube los archivos faltantes en la pestaña de Fotos para completar el checklist
          </p>
        )}
      </CardContent>
    </Card>
  );
}
