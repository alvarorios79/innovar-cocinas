/**
 * Portafolio — archivo permanente de los trabajos entregados o cerrados.
 * Cada proyecto: Antes · Diseño · Instalación · Después (+ video del recorrido).
 * Sirve para mostrar trabajos a clientes nuevos y como punto de partida para redes.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Film, ImageIcon, Loader2, Megaphone, Search, Star } from "lucide-react";
import { PORTFOLIO_SECTIONS, workTypeLabel } from "@shared/portfolio";
import { formatDate } from "@/lib/format";

type Chip = "antes_despues" | "render" | "video" | "sin_publicar" | "estrella";
const CHIPS: { key: Chip; label: string }[] = [
  { key: "antes_despues", label: "Con antes y después" },
  { key: "render", label: "Con render" },
  { key: "video", label: "Con video" },
  { key: "estrella", label: "Con estrellas" },
  { key: "sin_publicar", label: "Sin publicar" },
];

const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Portafolio() {
  const { data, isLoading, error } = trpc.portfolio.list.useQuery();
  const [q, setQ] = useState("");
  const [work, setWork] = useState("todos");
  const [city, setCity] = useState("todas");
  const [chips, setChips] = useState<Chip[]>([]);

  const projects = data || [];
  const workTypes = useMemo(() => Array.from(new Set(projects.map((p) => p.workType))).sort(), [projects]);
  const cities = useMemo(() => Array.from(new Set(projects.map((p) => p.city).filter(Boolean) as string[])).sort(), [projects]);

  const filtered = useMemo(() => projects.filter((p) => {
    if (work !== "todos" && p.workType !== work) return false;
    if (city !== "todas" && p.city !== city) return false;
    if (q.trim()) {
      const hay = norm([p.name, p.clientName, p.woodColor, p.countertop, p.city, workTypeLabel(p.workType)].join(" "));
      if (!norm(q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    for (const c of chips) {
      if (c === "antes_despues" && !(p.counts.antes && p.counts.despues)) return false;
      if (c === "render" && !p.counts.diseno) return false;
      if (c === "video" && !p.counts.videos) return false;
      if (c === "estrella" && !p.counts.stars) return false;
      if (c === "sin_publicar" && p.published.length) return false;
    }
    return true;
  }), [projects, q, work, city, chips]);

  const stats = useMemo(() => ({
    total: projects.length,
    antesDespues: projects.filter((p) => p.counts.antes && p.counts.despues).length,
    video: projects.filter((p) => p.counts.videos).length,
    sinFinal: projects.filter((p) => !p.counts.despues).length,
  }), [projects]);

  const toggleChip = (c: Chip) => setChips((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <div className="pb-24 md:pb-6">
      <PageHeader
        title="Portafolio"
        subtitle="Antes y después de los trabajos entregados"
        icon={<ImageIcon className="h-5 w-5" />}
        actions={<Link href="/redes"><Button className="gap-1.5"><Megaphone className="h-4 w-4" />Redes</Button></Link>}
      />

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { n: stats.total, label: "Proyectos", color: "var(--primary)" },
          { n: stats.antesDespues, label: "Antes y después", color: "var(--success)" },
          { n: stats.video, label: "Con video", color: "var(--info)" },
          { n: stats.sinFinal, label: "Sin foto final", color: "var(--warning)" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold leading-none" style={{ color: k.color }}>{k.n}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-[1fr_200px_200px] gap-2">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, madera, mesón…" className="pl-8" />
          </div>
          <Select value={work} onValueChange={setWork}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los trabajos</SelectItem>
              {workTypes.map((w) => <SelectItem key={w} value={w}>{workTypeLabel(w)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleChip(c.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border ${chips.includes(c.key) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{error.message}</div>
      ) : isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {projects.length ? "Ningún proyecto con esos filtros." : "Aún no hay proyectos entregados con fotos."}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/portafolio/${p.id}`} className="group block rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition">
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {p.cover ? (
                    <img src={p.cover} alt="" loading="lazy" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Film className="h-8 w-8" /></div>
                  )}
                  <div className="absolute top-1.5 left-1.5 flex gap-1">
                    {p.counts.antes > 0 && p.counts.despues > 0 && <span className="rounded bg-black/65 text-white text-[10px] px-1.5 py-0.5">Antes/Después</span>}
                    {p.counts.videos > 0 && <span className="rounded bg-black/65 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5"><Film className="h-3 w-3" />{p.counts.videos}</span>}
                  </div>
                  {p.counts.stars > 0 && <Star className="absolute top-1.5 right-1.5 h-4 w-4 fill-amber-400 text-amber-400 drop-shadow" />}
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-sm font-semibold leading-tight line-clamp-1">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {workTypeLabel(p.workType)}{p.city ? ` · ${p.city}` : ""}{p.deliveredAt ? ` · ${formatDate(p.deliveredAt)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    {PORTFOLIO_SECTIONS.map((s) => {
                      const n = p.counts[s.key];
                      return <span key={s.key} className={n ? "" : "opacity-40"}><Camera className="inline h-2.5 w-2.5 mr-0.5" />{s.label} {n}</span>;
                    })}
                  </div>
                  {p.published.length > 0 && <p className="text-[10px] text-success">Publicado ({p.published.length})</p>}
                </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
