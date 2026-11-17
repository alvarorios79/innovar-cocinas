import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/formatters";
import { precioLavaplatos, precioLavaplatosSencillo, precioLavaplatosDoble, type LavaplatosTipo } from "@shared/mesonPrecios";

interface Props {
  /** Objeto con lavaplatosTipo / lavaprecio (o la casilla antigua incluyeLavaplatos) */
  value: { lavaplatosTipo?: LavaplatosTipo; incluyeLavaplatos?: boolean; lavaprecio?: number | null } | undefined;
  onChange: (tipo: LavaplatosTipo, precioOtro: number | undefined) => void;
  className?: string;
}

/**
 * Lavaplatos del mesón: ninguno · sencillo ($180.000) · doble ($700.000) · otro (precio escrito, porque varía).
 * Misma regla en Cocina Integral, Piezas de Cocina y Mesón Solo (precios del Motor).
 */
export function LavaplatosSelector({ value, onChange, className }: Props) {
  // Cotizaciones antiguas (solo casilla) se muestran como «otro» con su precio para no perder el valor
  const tipo: LavaplatosTipo = value?.lavaplatosTipo ?? (value?.incluyeLavaplatos ? "otro" : "ninguno");
  const precioOtro = value?.lavaprecio ?? (value?.lavaplatosTipo === undefined && value?.incluyeLavaplatos ? precioLavaplatos(value) : undefined);
  const opciones: Array<[LavaplatosTipo, string]> = [
    ["ninguno", "Sin lavaplatos"],
    ["sencillo", `Sencillo (${formatPrice(precioLavaplatosSencillo())})`],
    ["doble", `Doble (${formatPrice(precioLavaplatosDoble())})`],
    ["otro", "Otro (escribir precio)"],
  ];
  return (
    <div className={className ?? "space-y-1"}>
      <Label className="text-xs text-white/70">Lavaplatos (incluye pegado)</Label>
      <div className="flex flex-wrap items-center gap-2">
        {opciones.map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 text-xs sm:text-sm text-white/85 cursor-pointer">
            <input
              type="radio"
              checked={tipo === k}
              onChange={() => onChange(k, k === "otro" ? precioOtro : undefined)}
              className="h-3.5 w-3.5 accent-green-500"
            />
            {label}
          </label>
        ))}
        {tipo === "otro" && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/50">$</span>
            <Input
              type="number" step="10000" min="0" placeholder="Precio"
              value={precioOtro ?? ""}
              onChange={(e) => onChange("otro", parseFloat(e.target.value) || undefined)}
              className="h-7 w-28 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
