/**
 * KpiCard — Tarjeta de métrica con borde lateral de color (opción 3 del sistema de diseño INNOVAR)
 *
 * Uso:
 *   <KpiCard
 *     label="Proyectos activos"
 *     value={12}
 *     helper="En fabricación o diseño"
 *     icon={<Briefcase className="h-4 w-4" />}
 *     accent="#1DB5A8"
 *   />
 *
 * Colores de acento estándar INNOVAR:
 *   Teal    #1DB5A8  — proyectos, general
 *   Green   #22C55E  — ingresos, éxito, pagos
 *   Amber   #F59E0B  — pendientes, advertencia, citas
 *   Red     #EF4444  — vencidos, urgente, alertas
 *   Indigo  #6366F1  — diseño, revisiones
 *   Blue    #3B82F6  — cotizaciones, info
 *   Orange  #F97316  — producción, materiales
 *   Purple  #A78BFA  — postventa, garantías
 */

import React from "react";
import { Link } from "wouter";

export interface KpiCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: React.ReactNode;
  /** Color hex del acento (borde + ícono + valor). Default: #1DB5A8 */
  accent?: string;
  /** Si se pasa, toda la tarjeta es un link */
  href?: string;
  /** Callback al hacer click (alternativa a href) */
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  label,
  value,
  helper,
  icon,
  accent = "#1DB5A8",
  href,
  onClick,
  className = "",
}: KpiCardProps) {
  const inner = (
    <div
      className={`relative bg-[#162828] rounded-xl overflow-hidden transition-all duration-200 ${
        href || onClick ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]" : ""
      } ${className}`}
      style={{
        borderLeft: `3px solid ${accent}`,
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeftWidth: "3px",
        borderLeftColor: accent,
      }}
      onClick={onClick}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] font-medium text-white/45 leading-tight pr-2">{label}</p>
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 30,
              height: 30,
              background: `${accent}1A`,
              color: accent,
            }}
          >
            {icon}
          </div>
        </div>
        <p
          className="text-xl font-bold tracking-tight leading-none"
          style={{ color: accent }}
        >
          {value}
        </p>
        {helper && (
          <p className="text-[10px] text-white/30 mt-1 leading-tight">{helper}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}

/**
 * KpiGrid — Grid responsive para agrupar KpiCards
 * cols: número de columnas en desktop (default 4)
 */
export function KpiGrid({
  children,
  cols = 4,
  className = "",
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  }[cols];

  return (
    <div className={`grid ${colsClass} gap-3 mb-5 ${className}`}>
      {children}
    </div>
  );
}
