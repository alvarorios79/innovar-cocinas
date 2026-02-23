import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
  className?: string;
}

/**
 * Componente reutilizable para headers de páginas con botón atrás consistente.
 * 
 * Uso:
 * <PageHeader 
 *   title="Mis Proyectos" 
 *   subtitle="Gestiona todos tus proyectos"
 *   showBack 
 *   actions={<Button>Nuevo</Button>}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  showBack = false,
  actions,
  className = "",
}: PageHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    // Usar window.history.back() para compatibilidad con wouter
    window.history.back();
  };

  return (
    <div className={`flex flex-col gap-4 mb-6 ${className}`}>
      {/* Botón atrás */}
      {showBack && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="w-fit gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      )}

      {/* Título y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
