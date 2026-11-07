/**
 * Estados del proyecto — ÚNICA fuente de nombres, colores e íconos.
 * Los colores son los de la lista de Proyectos (decisión de Álvaro: no cambiar los estados).
 * Todas las pantallas del equipo deben usar esto (no copiar la tabla en otro archivo).
 */
import type { ComponentType } from "react";
import { AlertCircle, CheckCircle2, Clock, FileText, Hammer, Package, Paintbrush, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusInfo = { label: string; color: string; icon: ComponentType<{ className?: string }> };

export const PROJECT_STATUS: Record<string, StatusInfo> = {
  contacto: { label: "Contacto", color: "bg-slate-400", icon: Clock },
  cotizacion_enviada: { label: "Cotización Enviada", color: "bg-gray-500", icon: Clock },
  cotizacion_aprobada: { label: "Cotización Aprobada", color: "bg-blue-400", icon: CheckCircle2 },
  adelanto_recibido: { label: "Adelanto Recibido", color: "bg-blue-500", icon: CheckCircle2 },
  en_diseno: { label: "En Diseño", color: "bg-purple-500", icon: Paintbrush },
  pendiente_modelado: { label: "Pendiente Modelado 3D", color: "bg-violet-500", icon: AlertCircle },
  pendiente_render: { label: "Pendiente Renders", color: "bg-amber-500", icon: AlertCircle },
  aprobacion_final: { label: "Diseño Aprobado", color: "bg-green-400", icon: CheckCircle2 },
  despiece: { label: "Despiece", color: "bg-indigo-500", icon: FileText },
  corte: { label: "En Corte", color: "bg-orange-500", icon: Hammer },
  enchape: { label: "En Enchape", color: "bg-orange-600", icon: Paintbrush },
  ensamble: { label: "En Ensamble", color: "bg-orange-700", icon: Package },
  listo_instalacion: { label: "Listo para Instalación", color: "bg-teal-500", icon: Truck },
  trabajando_instalacion: { label: "Instalando", color: "bg-cyan-600", icon: Truck },
  entregado: { label: "Entregado", color: "bg-green-700", icon: CheckCircle2 },
};

/** Orden de la ruta del proyecto. */
export const PROJECT_STATUS_ORDER = Object.keys(PROJECT_STATUS);

/** Nombre del estado; con número de revisión cuando aplica ("Diseño Aprobado V2"). */
export function getProjectStatusLabel(status: string, modeladoRevisionNumber?: number | null, renderRevisionNumber?: number | null): string {
  if (status === "pendiente_modelado" && modeladoRevisionNumber && modeladoRevisionNumber > 0) {
    return `Pendiente Aprobación Modelado ${modeladoRevisionNumber}`;
  }
  if (status === "pendiente_render" && renderRevisionNumber && renderRevisionNumber > 0) {
    return `Pendiente Aprobación Render ${renderRevisionNumber}`;
  }
  if (status === "aprobacion_final" && renderRevisionNumber && renderRevisionNumber > 0) {
    return `Diseño Aprobado V${renderRevisionNumber}`;
  }
  return PROJECT_STATUS[status]?.label || status;
}

/** Clase de fondo del estado (ej. "bg-orange-600"). */
export function getProjectStatusColor(status: string): string {
  return PROJECT_STATUS[status]?.color || "bg-gray-500";
}

/** Etiqueta de estado igual en todas las pantallas. */
export function ProjectStatusBadge({
  status, modeladoRevisionNumber, renderRevisionNumber, showIcon = true, className,
}: {
  status: string;
  modeladoRevisionNumber?: number | null;
  renderRevisionNumber?: number | null;
  showIcon?: boolean;
  className?: string;
}) {
  const info = PROJECT_STATUS[status];
  const Icon = info?.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap", info?.color || "bg-gray-500", className)}>
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {getProjectStatusLabel(status, modeladoRevisionNumber, renderRevisionNumber)}
    </span>
  );
}
