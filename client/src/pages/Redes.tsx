/**
 * Redes — publicar seguido sin depender de la inspiración.
 * Plan fijo de 3 publicaciones por semana (lunes antes/después, miércoles render vs. realidad,
 * viernes video), bandeja de publicaciones listas sacadas del Portafolio y registro de lo publicado.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { SocialPostComposer } from "@/components/SocialPostComposer";
import { formatDate } from "@/lib/format";
import { CheckCircle2, Clock, ImageIcon, Lightbulb, Loader2, Megaphone } from "lucide-react";
import { worksLabel } from "@shared/workTypes";
import { SOCIAL_NETWORKS, SOCIAL_POST_TYPES, type SocialNetwork, type SocialPostType } from "@shared/socialPosts";

const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
};

export default function Redes() {
  const { data, isLoading, error } = trpc.social.overview.useQuery();
  const [composer, setComposer] = useState<{ open: boolean; projectId: number | null; type?: SocialPostType }>({ open: false, projectId: null });
  const open = (projectId: number, type?: SocialPostType) => setComposer({ open: true, projectId, type });

  if (error) return <div className="py-16 text-center text-sm text-muted-foreground">{error.message}</div>;
  if (isLoading || !data) return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const { stats } = data;

  return (
    <div className="pb-24 md:pb-6">
      <PageHeader
        title="Redes"
        subtitle="3 publicaciones por semana, armadas desde el portafolio"
        icon={<Megaphone className="h-5 w-5" />}
        actions={<Link href="/portafolio"><Button variant="outline" className="gap-1.5"><ImageIcon className="h-4 w-4" />Portafolio</Button></Link>}
      />

      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { n: `${stats.week}/${stats.weekGoal}`, label: "Esta semana", color: stats.week >= stats.weekGoal ? "var(--success)" : "var(--warning)" },
          { n: stats.month, label: "Este mes", color: "var(--primary)" },
          { n: data.tray.length, label: "Listas para publicar", color: "var(--info)" },
          { n: stats.projects, label: "En portafolio", color: "var(--design)" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
            <p className="text-xl md:text-2xl font-bold leading-none" style={{ color: k.color }}>{k.n}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Plan de la semana */}
      <h2 className="text-base font-semibold mb-2">Esta semana</h2>
      <div className="grid gap-2 md:grid-cols-3 mb-6">
        {data.plan.map((p) => {
          const t = SOCIAL_POST_TYPES[p.type];
          const state = p.done ? "hecho" : p.isToday ? "hoy" : p.isPast ? "atrasado" : "pendiente";
          const border = state === "hecho" ? "border-success/50" : state === "hoy" ? "border-primary" : state === "atrasado" ? "border-warning/60" : "border-border";
          return (
            <div key={p.weekday} className={`rounded-xl border-2 ${border} bg-card p-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{p.day} {dayLabel(p.date)}</p>
                  <p className="font-semibold text-sm">{t.emoji} {t.label}</p>
                </div>
                {state === "hecho" && <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Publicado</span>}
                {state === "hoy" && <span className="text-xs font-semibold text-primary">Hoy toca</span>}
                {state === "atrasado" && <span className="text-xs text-warning flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Atrasado</span>}
              </div>
              {p.done ? (
                <p className="text-xs text-muted-foreground">{p.done.projectName} · {SOCIAL_NETWORKS[p.done.network as SocialNetwork]?.label || p.done.network}</p>
              ) : p.suggestion ? (
                <button type="button" onClick={() => open(p.suggestion!.projectId, p.suggestion!.type as SocialPostType)} className="flex items-center gap-2 text-left rounded-lg bg-muted/40 hover:bg-muted p-1.5">
                  {p.suggestion.cover && <img src={p.suggestion.cover} alt="" className="h-12 w-12 rounded object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{p.suggestion.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.suggestion.type !== p.type ? `Sin material para este tipo → ${SOCIAL_POST_TYPES[p.suggestion.type as SocialPostType].label}` : `${worksLabel(p.suggestion.works)}${p.suggestion.city ? ` · ${p.suggestion.city}` : ""}`}
                    </p>
                  </div>
                  <span className="text-xs text-primary font-semibold shrink-0">Preparar</span>
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">Sin material: {t.needs.toLowerCase()} de algún proyecto entregado.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bandeja */}
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-base font-semibold">Listas para publicar</h2>
        <span className="text-xs text-muted-foreground">Más recientes primero</span>
      </div>
      {data.tray.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-6 text-center mb-6">
          No hay publicaciones pendientes. Cuando un proyecto se entregue con sus fotos finales, aparecerá aquí.
        </p>
      ) : (
        <div className="space-y-2 mb-6">
          {data.tray.slice(0, 40).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
              <Link href={`/portafolio/${p.id}`} className="shrink-0">
                {p.cover ? <img src={p.cover} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-muted" />}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.clientName || p.name}{p.clientName && <span className="text-muted-foreground font-normal"> · {p.name}</span>}</p>
                <p className="text-[11px] text-muted-foreground truncate">{worksLabel(p.works)}{p.city ? ` · ${p.city}` : ""}{p.deliveredAt ? ` · ${formatDate(p.deliveredAt)}` : ""}</p>
                <div className="flex gap-1 mt-1 overflow-x-auto">
                  {p.pending.map((t) => (
                    <button key={t} type="button" onClick={() => open(p.id, t)} className="shrink-0 px-2 py-0.5 rounded-full text-[11px] border border-primary/40 text-primary hover:bg-primary/10">
                      {SOCIAL_POST_TYPES[t].emoji} {SOCIAL_POST_TYPES[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publicado */}
      <h2 className="text-base font-semibold mb-2">Publicado</h2>
      {data.recent.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-6">Todavía no hay publicaciones registradas. Al publicar, márcalo en el armador de la publicación.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border mb-6">
          {data.recent.map((r) => (
            <button key={r.id} type="button" onClick={() => open(r.projectId, r.postType as SocialPostType)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{dayLabel(r.ymd)}</span>
              <span className="text-sm truncate flex-1">{SOCIAL_POST_TYPES[r.postType as SocialPostType]?.emoji} {r.projectName}</span>
              <span className="text-[11px] rounded-full px-2 py-0.5 border border-border shrink-0">{SOCIAL_NETWORKS[r.network as SocialNetwork]?.label || r.network}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-warning" />Para que funcione</p>
        <p>• Publica el mismo contenido en Instagram, Facebook y TikTok: el texto ya viene ajustado para cada una.</p>
        <p>• Los videos verticales (Reels / TikTok) son los que más gente nueva alcanzan: graba el recorrido con el celular vertical, despacio y con buena luz.</p>
        <p>• Marca ⭐ las mejores fotos en el portafolio; el armador las usa primero.</p>
        <p>• Responde los comentarios y mensajes el mismo día: ahí llegan los clientes.</p>
      </div>

      <SocialPostComposer
        projectId={composer.projectId}
        initialType={composer.type}
        open={composer.open}
        onOpenChange={(o) => setComposer((c) => ({ ...c, open: o }))}
      />
    </div>
  );
}
