/**
 * SectionCard — Card de sección con borde superior de color (opción 3 del sistema de diseño INNOVAR)
 *
 * Uso:
 *   <SectionCard
 *     title="Citas del Día"
 *     subtitle="3 pendientes"
 *     icon={<Calendar className="h-4 w-4" />}
 *     accent="#F59E0B"
 *     actions={<Button size="sm">Ver todas</Button>}
 *   >
 *     ... contenido ...
 *   </SectionCard>
 *
 * Colores estándar INNOVAR: ver KpiCard.tsx
 */

import React from "react";

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Color hex del acento (borde superior + ícono). Default: #1DB5A8 */
  accent?: string;
  /** Botones/acciones en la esquina derecha del header */
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Padding del body — false para quitar padding (ej. tablas full-width) */
  bodyPadding?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  accent = "#1DB5A8",
  actions,
  children,
  bodyPadding = true,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`bg-[#162828] rounded-xl overflow-hidden shadow-sm ${className}`}
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderTop: `3px solid ${accent}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 32,
                height: 32,
                background: `${accent}1A`,
                color: accent,
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85 leading-tight truncate">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-white/35 leading-tight mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="shrink-0">{actions}</div>
        )}
      </div>

      {/* Body */}
      <div className={bodyPadding ? "p-4" : ""}>
        {children}
      </div>
    </div>
  );
}
