import { useState } from "react";
import { Input } from "@/components/ui/input";

// ── MEDIDAS EN METROS ──
// Todo se escribe y se muestra en METROS (3,60). Por dentro se sigue guardando en centímetros (360) para no perder lo que ya estaba guardado.
export const fm = (cm: number) => (Math.round((Number(cm) || 0)) / 100).toFixed(2).replace(".", ",");   // 360 → "3,60"
export const enM = (cm: number | undefined | null) => (cm === undefined || cm === null || !Number.isFinite(Number(cm)) ? "" : String(Math.round(Number(cm)) / 100)); // 360 → "3.6"

/** Campo en METROS. Acepta coma o punto. `valorCm` es lo guardado (cm); `onCm` devuelve cm (o undefined si se borra). */
export function InputM({ valorCm, onCm, className, placeholder, onFocus }: { valorCm?: number | string | null; onCm: (cm: number | undefined) => void; className?: string; placeholder?: string; onFocus?: () => void }) {
  const [txt, setTxt] = useState<string | null>(null);   // lo que se está escribiendo mientras el campo está activo
  const cm = valorCm === undefined || valorCm === null || valorCm === "" ? undefined : Number(valorCm);
  return (
    <Input
      type="text" inputMode="decimal"
      value={txt ?? (cm === undefined ? "" : fm(cm))}
      placeholder={placeholder ?? "0,00"}
      onFocus={() => { setTxt(cm === undefined ? "" : enM(cm).replace(".", ",")); onFocus?.(); }}
      onChange={(e) => {
        const crudo = e.target.value.replace(/[^0-9.,]/g, "");
        setTxt(crudo);
        if (crudo === "") { onCm(undefined); return; }
        const n = parseFloat(crudo.replace(",", "."));
        if (Number.isFinite(n)) onCm(Math.max(0, Math.round(n * 100)));
      }}
      onBlur={() => setTxt(null)}
      className={className}
    />
  );
}
