import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Palette, ImageIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIMADERA_CATEGORY_LABELS,
  PRIMADERA_DESIGNS,
  findPrimaderaDesign,
  woodSwatchUrl,
  woodShortName,
  woodHasPhoto,
  woodTexture,
  woodColorCode,
  WOOD_BRANDS,
  BRAND_OF_CATEGORY,
  type WoodBrand,
  type PrimaderaDesign,
  parseWoodColors,
  formatWoodColors,
  woodColorRows,
  type PrimaderaCategory,
  type WoodColors,
} from "@shared/primaderaCatalog";

const CATEGORIES = Object.keys(PRIMADERA_CATEGORY_LABELS) as PrimaderaCategory[];

/** Cuadro de color con brillo para los colores que aún no tienen foto (p. ej. altos brillos). */
function GlossBox({ d, className }: { d: PrimaderaDesign; className: string }) {
  return (
    <div
      className={cn(className, "relative overflow-hidden")}
      style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 45%), ${d.color ?? "#ccc"}` }}
      title={d.category === "altos_brillos" ? `${d.name} (color de referencia)` : `${d.name} (color aproximado, sin foto aún)`}
    />
  );
}

/** Botón para descargar la textura (para SketchUp). `compact` = solo ícono sobre la foto. */
export function TextureLink({ url, fileName, full, compact = false, className }: {
  url: string; fileName: string; full: boolean; compact?: boolean; className?: string;
}) {
  const title = full ? "Descargar textura" : "Descargar muestra (aún no hay textura grande)";
  if (compact) {
    return (
      <a
        href={url}
        download={fileName}
        onClick={(e) => e.stopPropagation()}
        title={title}
        aria-label={title}
        className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-black/80", className)}
      >
        <Download className="h-4 w-4" />
      </a>
    );
  }
  return (
    <a
      href={url}
      download={fileName}
      title={title}
      className={cn("inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60", className)}
    >
      <Download className="h-3.5 w-3.5" />
      {full ? "Descargar textura" : "Descargar muestra"}
    </a>
  );
}

/** Cuadrito con la muestra del color (si está en el catálogo); si no, un ícono neutro. */
export function ColorSwatch({ name, className = "w-12 h-12" }: { name?: string; className?: string }) {
  const d = findPrimaderaDesign(name);
  if (!d) {
    return (
      <div className={cn(className, "rounded-md bg-muted flex items-center justify-center shrink-0")}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  if (!woodHasPhoto(d)) return <GlossBox d={d} className={cn(className, "rounded-md border border-border shrink-0")} />;
  return (
    <a href={woodSwatchUrl(d)} target="_blank" rel="noreferrer" className="shrink-0">
      <img src={woodSwatchUrl(d)} alt={d.name} className={cn(className, "rounded-md object-cover border border-border")} loading="lazy" />
    </a>
  );
}

/** Ventana del catálogo de madera: se elige la marca, la línea y se toca el color. */
function PrimaderaDialog({
  open, onOpenChange, title, value, onPick, startTab,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  value: string;
  onPick: (name: string) => void;
  startTab: PrimaderaCategory;
}) {
  const currentDesign = findPrimaderaDesign(value);
  const current = currentDesign?.name;
  // Abre en la marca/línea del color ya elegido; si no hay, en la sugerida para esta parte
  const initialTab = currentDesign?.category ?? startTab;
  const [brand, setBrand] = useState<WoodBrand>(BRAND_OF_CATEGORY[initialTab]);
  const [tab, setTab] = useState<PrimaderaCategory>(initialTab);
  const brandCategories = CATEGORIES.filter((c) => BRAND_OF_CATEGORY[c] === brand);
  const pickBrand = (b: WoodBrand) => {
    setBrand(b);
    setTab(CATEGORIES.find((c) => BRAND_OF_CATEGORY[c] === b)!);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title} — Catálogo de madera</DialogTitle>
          <DialogDescription>
            Elige la marca y toca el color. Las muestras son aproximadas: para confirmar, pide la muestra física.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {WOOD_BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => pickBrand(b)}
              className={cn(
                "rounded-lg border px-2 py-2 text-sm font-semibold transition-colors",
                brand === b ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {b}
            </button>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as PrimaderaCategory)}>
          {brandCategories.length > 1 && (
            <TabsList>
              {brandCategories.map((c) => (
                <TabsTrigger key={c} value={c}>{PRIMADERA_CATEGORY_LABELS[c]}</TabsTrigger>
              ))}
            </TabsList>
          )}
          {brandCategories.map((c) => (
            <TabsContent key={c} value={c} className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {PRIMADERA_DESIGNS.filter((d) => d.category === c).map((d) => {
                  const on = current === d.name;
                  return (
                    <div key={d.code} className="relative">
                    <button
                      type="button"
                      onClick={() => { onPick(d.name); onOpenChange(false); }}
                      className={cn(
                        "relative w-full rounded-lg border overflow-hidden text-left transition-all hover:border-primary/60",
                        on ? "border-primary ring-2 ring-primary" : "border-border"
                      )}
                    >
                      {woodHasPhoto(d) ? (
                        <img src={woodSwatchUrl(d)} alt={d.name} className="w-full aspect-square object-cover" loading="lazy" />
                      ) : (
                        <div className="relative">
                          <GlossBox d={d} className="w-full aspect-square" />
                          {d.category !== "altos_brillos" && (
                            <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Foto pendiente</span>
                          )}
                        </div>
                      )}
                      {on && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <div className="p-2 bg-surface">
                        <p className="font-semibold text-sm leading-tight">{woodShortName(d)}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{d.hint}</p>
                        {woodColorCode(d) && (
                          <p className="text-[11px] font-mono text-foreground/80 leading-tight mt-1 select-all">{woodColorCode(d)}</p>
                        )}
                      </div>
                    </button>
                    {woodHasPhoto(d) && <TextureLink {...woodTexture(d)} compact className="absolute top-2 left-2" />}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** Descarga de la textura del color elegido (si está en el catálogo y tiene foto). */
function SlotTexture({ name, compact = false }: { name?: string; compact?: boolean }) {
  const d = findPrimaderaDesign(name);
  if (d && woodColorCode(d)) {
    return <span className="text-[11px] font-mono text-muted-foreground select-all">{woodColorCode(d)}</span>;
  }
  if (!d || !woodHasPhoto(d)) return null;
  return <TextureLink {...woodTexture(d)} compact={compact} />;
}

/** Una parte de la cocina (interior, exterior, superiores o inferiores) con su color. */
function ColorSlot({
  label, help, value, onChange, startTab,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  startTab: PrimaderaCategory;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div>
        <Label>{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <div className="flex items-center gap-3">
        <ColorSwatch name={value} className="w-14 h-14" />
        <div className="flex-1 min-w-0 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Nombre del color o referencia" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Palette className="h-4 w-4 mr-2" />
              Elegir del catálogo de madera
            </Button>
            <SlotTexture name={value} />
          </div>
        </div>
      </div>
      <PrimaderaDialog open={open} onOpenChange={setOpen} title={label} value={value} onPick={onChange} startTab={startTab} />
    </div>
  );
}

/** Editor de colores de la madera (oficina). Lee y guarda el texto de `woodColor`. */
export function WoodColorsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Estado propio para que se pueda borrar un campo mientras se escribe sin que vuelva el valor por defecto
  const [c, setC] = useState<WoodColors>(() => parseWoodColors(value));
  useEffect(() => {
    if (value !== formatWoodColors(c)) setC(parseWoodColors(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (patch: Partial<WoodColors>) => {
    const next = { ...c, ...patch };
    setC(next);
    onChange(formatWoodColors(next));
  };

  return (
    <div className="space-y-3">
      <ColorSlot
        label="Interior (cajas por dentro)"
        help="Normalmente blanco. Puede ser otro claro, como Yalaa."
        value={c.interior}
        onChange={(v) => set({ interior: v })}
        startTab="unicolores"
      />

      <div className="space-y-2">
        <Label>Exterior (frentes y puertas)</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["toda", "Toda del mismo color"],
            ["dividida", "Superiores e inferiores distintos"],
          ] as const).map(([mode, text]) => (
            <button
              key={mode}
              type="button"
              onClick={() => set({ mode })}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                c.mode === mode ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {c.mode === "toda" ? (
        <ColorSlot label="Exterior" value={c.exterior} onChange={(v) => set({ exterior: v })} startTab="tendencia" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ColorSlot label="Superiores" value={c.superiores} onChange={(v) => set({ superiores: v })} startTab="unicolores" />
          <ColorSlot label="Inferiores" value={c.inferiores} onChange={(v) => set({ inferiores: v })} startTab="tendencia" />
        </div>
      )}
    </div>
  );
}

/** Vista de solo consulta (taller): una fila por parte con su muestra. */
export function WoodColorsView({ value }: { value?: string | null }) {
  const rows = woodColorRows(parseWoodColors(value));
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 rounded-md bg-background/40 p-2">
          <ColorSwatch name={r.value} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</p>
            <p className="font-semibold text-sm break-words">{r.value}</p>
          </div>
          <SlotTexture name={r.value} compact />
        </div>
      ))}
    </div>
  );
}
