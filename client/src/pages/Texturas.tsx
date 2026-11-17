/**
 * Texturas — biblioteca para el diseñador (SketchUp): todas las texturas de los catálogos por marca y categoría.
 * Cada una se baja sola (1 a 1) o se baja la categoría / la marca completa en un solo ZIP.
 * Fuente: los mismos catálogos que usa la pestaña Materiales (shared/primaderaCatalog.ts y countertopCatalog.ts).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, Layers, Loader2, PackageOpen } from "lucide-react";
import {
  BRAND_OF_CATEGORY, PRIMADERA_CATEGORY_LABELS, PRIMADERA_DESIGNS, woodHasPhoto, woodShortName, woodSwatchUrl, woodTexture,
  type PrimaderaCategory, type PrimaderaDesign, type WoodBrand,
} from "@shared/primaderaCatalog";
import {
  COUNTERTOP_DESIGNS, countertopHasPhoto, countertopLabel, countertopSwatchUrl, countertopTexture, type CountertopDesign, type CountertopType,
} from "@shared/countertopCatalog";
import { COUNTERTOP_TYPE_LABELS } from "@shared/materials";
import { crearZip, nombresUnicos } from "@shared/zip";

const ROLES_TEXTURAS = ["super_admin", "admin", "comercial", "disenador"];

type Item = { id: string; nombre: string; muestra: string; url: string; archivo: string; grande: boolean };
type Grupo = { id: string; titulo: string; items: Item[] };
type Marca = { id: string; nombre: string; grupos: Grupo[] };

/** Marcas → categorías → texturas (solo las que tienen foto). */
function armarMarcas(): Marca[] {
  const maderas = (marca: WoodBrand): Grupo[] => {
    const cats = Array.from(new Set(PRIMADERA_DESIGNS.filter((d) => BRAND_OF_CATEGORY[d.category] === marca).map((d) => d.category)));
    return cats.map((c: PrimaderaCategory) => ({
      id: `${marca}-${c}`,
      titulo: PRIMADERA_CATEGORY_LABELS[c],
      items: PRIMADERA_DESIGNS.filter((d: PrimaderaDesign) => d.category === c && woodHasPhoto(d)).map((d) => {
        const t = woodTexture(d);
        return { id: `${marca}-${d.code}`, nombre: woodShortName(d), muestra: woodSwatchUrl(d), url: t.url, archivo: t.fileName, grande: t.full };
      }),
    })).filter((g) => g.items.length);
  };
  const tipos: CountertopType[] = ["granito", "cuarzo", "sinterizado"];
  const mesones: Grupo[] = tipos.map((tp) => ({
    id: `meson-${tp}`,
    titulo: COUNTERTOP_TYPE_LABELS[tp] || tp,
    items: COUNTERTOP_DESIGNS.filter((d: CountertopDesign) => d.type === tp && countertopHasPhoto(d)).map((d) => {
      const t = countertopTexture(d);
      return { id: `meson-${d.code}`, nombre: countertopLabel(d), muestra: countertopSwatchUrl(d.code), url: t.url, archivo: t.fileName, grande: t.full };
    }),
  })).filter((g) => g.items.length);

  return [
    { id: "primadera", nombre: "Primadera", grupos: maderas("Primadera") },
    { id: "duratex", nombre: "Duratex", grupos: maderas("Duratex") },
    { id: "altos", nombre: "Altos brillos", grupos: maderas("Altos brillos") },
    { id: "mesones", nombre: "Mesones", grupos: mesones },
  ].filter((m) => m.grupos.length);
}

function descargar(blob: Blob, nombre: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

export default function Texturas() {
  const { user } = useAuth();
  const marcas = useMemo(armarMarcas, []);
  const [marcaId, setMarcaId] = useState(marcas[0]?.id || "primadera");
  const [trabajando, setTrabajando] = useState<{ clave: string; hecho: number; total: number } | null>(null);
  const marca = marcas.find((m) => m.id === marcaId) || marcas[0];

  if (user && !ROLES_TEXTURAS.includes(user.role)) {
    return <div className="p-6 text-sm text-muted-foreground">Esta pantalla es para la oficina de diseño.</div>;
  }

  const bajarZip = async (clave: string, nombreZip: string, items: Item[]) => {
    if (trabajando) return;
    setTrabajando({ clave, hecho: 0, total: items.length });
    try {
      const nombres = nombresUnicos(items.map((i) => i.archivo));
      const archivos: { nombre: string; datos: Uint8Array }[] = [];
      let hecho = 0, fallos = 0;
      let siguiente = 0;
      const trabajador = async () => {
        while (siguiente < items.length) {
          const i = siguiente++;
          try {
            const r = await fetch(items[i].url);
            if (!r.ok) throw new Error(String(r.status));
            archivos[i] = { nombre: nombres[i], datos: new Uint8Array(await r.arrayBuffer()) };
          } catch {
            fallos++;
          }
          hecho++;
          setTrabajando({ clave, hecho, total: items.length });
        }
      };
      await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
      const buenos = archivos.filter(Boolean);
      if (!buenos.length) throw new Error("No se pudo bajar ninguna textura");
      descargar(new Blob([crearZip(buenos) as BlobPart], { type: "application/zip" }), nombreZip);
      toast.success(`${buenos.length} texturas en ${nombreZip}${fallos ? ` (${fallos} no se pudieron bajar)` : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo armar el ZIP");
    } finally {
      setTrabajando(null);
    }
  };

  const todosDeMarca = marca.grupos.flatMap((g) => g.items);
  const ocupado = !!trabajando;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Texturas"
        subtitle="Para SketchUp: baja una textura sola, o una categoría o marca completa en un ZIP."
        icon={<Layers className="h-6 w-6" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {marcas.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMarcaId(m.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${m.id === marca.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/60"}`}
          >
            {m.nombre}
          </button>
        ))}
        <div className="ml-auto">
          <Button
            disabled={ocupado}
            onClick={() => bajarZip(`marca-${marca.id}`, `Texturas ${marca.nombre}.zip`, todosDeMarca)}
            className="gap-2"
          >
            {trabajando?.clave === `marca-${marca.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />}
            {trabajando?.clave === `marca-${marca.id}`
              ? `Preparando ${trabajando.hecho}/${trabajando.total}…`
              : `Descargar toda ${marca.nombre} (${todosDeMarca.length})`}
          </Button>
        </div>
      </div>

      {marca.grupos.map((g) => (
        <section key={g.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-base font-semibold">{g.titulo} <span className="text-xs font-normal text-muted-foreground">· {g.items.length}</span></h2>
            <Button
              size="sm"
              variant="outline"
              disabled={ocupado}
              onClick={() => bajarZip(`cat-${g.id}`, `Texturas ${marca.nombre} - ${g.titulo}.zip`, g.items)}
              className="gap-2"
            >
              {trabajando?.clave === `cat-${g.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {trabajando?.clave === `cat-${g.id}` ? `${trabajando.hecho}/${trabajando.total}…` : "Descargar esta categoría"}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {g.items.map((it) => (
              <div key={it.id} className="rounded-lg border border-border bg-surface overflow-hidden">
                <img src={it.muestra} alt={it.nombre} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="p-2 space-y-1.5">
                  <p className="text-xs font-medium leading-tight line-clamp-2 min-h-[2rem]">{it.nombre}</p>
                  <a
                    href={it.url}
                    download={it.archivo}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60"
                    title={it.grande ? "Descargar textura" : "Descargar muestra (aún no hay textura grande)"}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {it.grande ? "Textura" : "Muestra"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
