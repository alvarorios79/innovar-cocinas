import { CheckCircle2, Circle, Clock, DollarSign, Truck, Wrench, Palette, Scissors, Package, Home, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Definición de las etapas del timeline según el flujo INNOVAR
const TIMELINE_STAGES = [
  {
    id: "visita",
    label: "Visita / Medidas",
    description: "Toma de medidas en sitio",
    icon: Home,
    statuses: ["cotizacion_enviada"], // Se marca cuando hay proyecto
    clientAction: false,
  },
  {
    id: "cotizacion",
    label: "Cotización",
    description: "Cotización enviada",
    icon: Clock,
    statuses: ["cotizacion_enviada"],
    clientAction: true, // Cliente puede aprobar/rechazar
    actionLabel: "Aprobar/Rechazar",
  },
  {
    id: "adelanto",
    label: "Adelanto 60%",
    description: "Pago de adelanto",
    icon: DollarSign,
    statuses: ["cotizacion_aprobada", "adelanto_recibido"],
    clientAction: false,
  },
  {
    id: "diseno",
    label: "Diseño",
    description: "Diseño 3D y renders",
    icon: Palette,
    statuses: ["adelanto_recibido", "en_diseno", "pendiente_render"],
    clientAction: true, // Cliente puede aprobar diseño
    actionLabel: "Aprobar Diseño",
  },
  {
    id: "corte",
    label: "Corte",
    description: "Producción - Corte",
    icon: Scissors,
    statuses: ["aprobacion_final", "despiece", "corte"],
    clientAction: false,
  },
  {
    id: "enchape",
    label: "Enchape",
    description: "Producción - Enchape",
    icon: Wrench,
    statuses: ["enchape"],
    clientAction: false,
  },
  {
    id: "ensamble",
    label: "Ensamble",
    description: "Producción - Ensamble",
    icon: Package,
    statuses: ["ensamble"],
    clientAction: false,
  },
  {
    id: "instalacion",
    label: "Instalación",
    description: "Instalación en sitio",
    icon: Truck,
    statuses: ["listo_instalacion", "listo_instalacion"],
    clientAction: false,
  },
  {
    id: "entrega",
    label: "Entrega",
    description: "Proyecto completado",
    icon: CheckCircle2,
    statuses: ["entregado"],
    clientAction: false,
  },
  {
    id: "pago_final",
    label: "Pago Final 40%",
    description: "Pago final del proyecto",
    icon: DollarSign,
    statuses: ["entregado"], // Se marca junto con entrega
    clientAction: false,
  },
];

// Mapeo de estados a índice de etapa completada
const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  contacto: 0,
  cotizacion_enviada: 0,
  cotizacion_aprobada: 1,
  adelanto_recibido: 2,
  en_diseno: 3,
  pendiente_modelado: 3,
  pendiente_render: 3,
  aprobacion_final: 4,
  despiece: 4,
  corte: 4,
  enchape: 5,
  ensamble: 6,
  listo_instalacion: 7,
  entregado: 9,
};

// Obtener el índice de la etapa actual
const getCurrentStageIndex = (status: string): number => {
  return STATUS_TO_STAGE_INDEX[status] ?? 0;
};

// Determinar si una etapa está completada
const isStageCompleted = (stageIndex: number, currentStageIndex: number): boolean => {
  return stageIndex < currentStageIndex;
};

// Determinar si una etapa es la actual
const isCurrentStage = (stageIndex: number, currentStageIndex: number): boolean => {
  return stageIndex === currentStageIndex;
};

interface ProjectTimelineProps {
  project: {
    id: number;
    status: string;
    quotationSentAt?: Date | string | null;
    quotationApprovedAt?: Date | string | null;
    advanceReceivedAt?: Date | string | null;
    designDeliveredAt?: Date | string | null;
    clientApprovedAt?: Date | string | null;
    scheduledInstallDate?: Date | string | null;
    deliveredAt?: Date | string | null;
    estimatedInstallDate?: Date | string | null;
  };
  onApproveQuotation?: () => void;
  onRejectQuotation?: () => void;
  onApproveDesign?: () => void;
  onRequestChanges?: () => void;
  showActions?: boolean;
}

export function ProjectTimeline({
  project,
  onApproveQuotation,
  onRejectQuotation,
  onApproveDesign,
  onRequestChanges,
  showActions = true,
}: ProjectTimelineProps) {
  const currentStageIndex = getCurrentStageIndex(project.status);

  // Formatear fecha
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Obtener la fecha de cada etapa
  const getStageDate = (stageId: string): string => {
    switch (stageId) {
      case "visita":
        return formatDate(project.quotationSentAt);
      case "cotizacion":
        return formatDate(project.quotationSentAt);
      case "adelanto":
        return formatDate(project.advanceReceivedAt);
      case "diseno":
        return formatDate(project.designDeliveredAt || project.clientApprovedAt);
      case "corte":
      case "enchape":
      case "ensamble":
        return project.clientApprovedAt ? "En proceso" : "";
      case "instalacion":
        return formatDate(project.scheduledInstallDate) || 
               (project.estimatedInstallDate ? `Est: ${formatDate(project.estimatedInstallDate)}` : "");
      case "entrega":
        return formatDate(project.deliveredAt);
      case "pago_final":
        return formatDate(project.deliveredAt);
      default:
        return "";
    }
  };

  return (
    <div className="space-y-1">
      {TIMELINE_STAGES.map((stage, index) => {
        const completed = isStageCompleted(index, currentStageIndex);
        const current = isCurrentStage(index, currentStageIndex);
        const pending = !completed && !current;
        const stageDate = getStageDate(stage.id);
        const Icon = stage.icon;

        // Determinar si mostrar acciones del cliente
        const showQuotationActions = 
          showActions && 
          stage.id === "cotizacion" && 
          current && 
          project.status === "cotizacion_enviada" &&
          onApproveQuotation && 
          onRejectQuotation;

        const showDesignActions = 
          showActions && 
          stage.id === "diseno" && 
          current && 
          project.status === "pendiente_render" &&
          onApproveDesign && 
          onRequestChanges;

        return (
          <div key={stage.id} className="relative">
            {/* Línea conectora */}
            {index < TIMELINE_STAGES.length - 1 && (
              <div
                className={cn(
                  "absolute left-5 top-10 w-0.5 h-full -ml-px",
                  completed ? "bg-green-500" : "bg-white/[0.10]"
                )}
              />
            )}

            <div className="flex items-start gap-4 pb-6">
              {/* Icono del estado */}
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10",
                  completed && "bg-green-500 border-green-500 text-white",
                  current && "bg-blue-500 border-blue-500 text-white animate-pulse",
                  pending && "bg-red-400/20 border-red-400 text-red-400"
                )}
              >
                {completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              {/* Contenido de la etapa */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      "font-semibold",
                      completed && "text-green-300",
                      current && "text-blue-300",
                      pending && "text-red-500"
                    )}
                  >
                    {stage.label}
                  </h4>
                  {stageDate && (
                    <span
                      className={cn(
                        "text-xs",
                        completed && "text-green-400",
                        current && "text-blue-400",
                        pending && "text-gray-400"
                      )}
                    >
                      {stageDate}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm",
                    completed && "text-green-400",
                    current && "text-blue-400",
                    pending && "text-gray-400"
                  )}
                >
                  {stage.description}
                </p>

                {/* Acciones del cliente para cotización */}
                {showQuotationActions && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={onApproveQuotation}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Aprobar Cotización
                    </button>
                    <button
                      onClick={onRejectQuotation}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Acciones del cliente para diseño */}
                {showDesignActions && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={onApproveDesign}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Aprobar Diseño
                    </button>
                    <button
                      onClick={onRequestChanges}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Solicitar Cambios
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProjectTimeline;
