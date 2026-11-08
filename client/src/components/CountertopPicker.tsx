import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Gem, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTERTOP_TYPE_LABELS } from "@shared/materials";
import {
  countertopDesignsByType,
  countertopHasPhoto,
  countertopLabel,
  countertopSwatchUrl,
  findCountertopDesign,
} from "@shared/countertopCatalog";

/** Muestra del mesón elegido (si está en el catálogo); si no, un ícono neutro. */
export function CountertopSwatch({ name, className = "w-14 h-14" }: { name?: string; className?: string }) {
  const d = findCountertopDesign(name);
  if (!d || !countertopHasPhoto(d)) {
    return (
      <div className={cn(className, "rounded-md bg-muted flex items-center justify-center shrink-0")}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <a href={countertopSwatchUrl(d.code)} target="_blank" rel="noreferrer" className="shrink-0">
      <img src={countertopSwatchUrl(d.code)} alt={countertopLabel(d)} className={cn(className, "rounded-md object-cover border border-border")} loading="lazy" />
    </a>
  );
}

/** Botón + ventana con el catálogo del tipo de mesón elegido. */
export function CountertopPicker({
  type, value, onPick,
}: {
  type: string;
  value: string;
  onPick: (label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const designs = countertopDesignsByType(type || undefined);
  const current = findCountertopDesign(value);
  const typeLabel = type ? COUNTERTOP_TYPE_LABELS[type] : "";

  if (type && designs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aún no hay catálogo de {typeLabel.toLowerCase()} en el CRM: escribe el nombre a mano.
      </p>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Gem className="h-4 w-4 mr-2" />
        Elegir del catálogo{typeLabel ? ` de ${typeLabel.toLowerCase()}` : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catálogo de mesones{typeLabel ? ` — ${typeLabel}` : ""}</DialogTitle>
            <DialogDescription>
              Toca el mesón para elegirlo. Las fotos son de referencia: confirma color y disponibilidad con el proveedor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {designs.map((d) => {
              const on = current?.code === d.code;
              return (
                <button
                  type="button"
                  key={d.code}
                  onClick={() => { onPick(countertopLabel(d)); setOpen(false); }}
                  className={cn(
                    "relative rounded-lg border overflow-hidden text-left transition-all hover:border-primary/60",
                    on ? "border-primary ring-2 ring-primary" : "border-border"
                  )}
                >
                  {countertopHasPhoto(d) ? (
                    <img src={countertopSwatchUrl(d.code)} alt={countertopLabel(d)} className="w-full aspect-square object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-[11px]">Sin foto aún</span>
                    </div>
                  )}
                  {on && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <div className="p-2 bg-surface">
                    <p className="font-semibold text-sm leading-tight">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {[d.finish, COUNTERTOP_TYPE_LABELS[d.type], d.supplier].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
