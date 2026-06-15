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
 * Componente reutilizable para headers de páginas.
 * Diseño premium con barra de acento turquesa INNOVAR.
 */
export function PageHeader({
  title,
  subtitle,
  showBack = false,
  actions,
  className = "",
  icon,
}: PageHeaderProps) {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className={`mb-7 ${className}`}>
      {/* Botón atrás */}
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-4 -ml-1 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      )}

      {/* Título + acciones */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Barra de acento + texto */}
        <div className="flex items-start gap-3 min-w-0">
          {/* Barra vertical turquesa */}
          <div
            style={{
              width: 4,
              minHeight: subtitle ? 44 : 34,
              borderRadius: 2,
              background: "linear-gradient(180deg, #1DB5A8 0%, #0D9B8F 100%)",
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          {/* Icono opcional */}
          {icon && (
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg, rgba(29,181,168,0.12) 0%, rgba(13,155,143,0.18) 100%)",
                border: "1px solid rgba(29,181,168,0.2)",
                color: "#0D9B8F",
              }}
            >
              {icon}
            </div>
          )}
          {/* Texto */}
          <div className="min-w-0">
            <h1
              className="font-bold tracking-tight text-foreground leading-tight"
              style={{ fontSize: "1.5rem" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Acciones */}
        {actions && (
          <div className="flex gap-2 flex-wrap shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
