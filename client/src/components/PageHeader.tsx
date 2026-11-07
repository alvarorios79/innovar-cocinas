import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
  className?: string;
  /** Icono opcional a mostrar junto al título */
  icon?: ReactNode;
}

/**
 * Encabezado ÚNICO de las pantallas del CRM: barra de marca + ícono + título + subtítulo + acciones.
 * El título nunca se aplasta: si no caben, los botones bajan a una segunda línea.
 */
export function PageHeader({ title, subtitle, showBack = false, actions, className = "", icon }: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-3 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* Título: ocupa todo el ancho que necesite (mínimo 16rem) */}
        <div className="flex items-start gap-3 min-w-0 flex-1 basis-64">
          <div className="w-1 self-stretch min-h-9 rounded-full shrink-0" style={{ background: "var(--brand-gradient)" }} />
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-primary/12 border border-primary/25 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight break-words">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 leading-snug">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
