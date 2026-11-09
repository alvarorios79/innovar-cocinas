/**
 * Ficha de un proyecto en el Portafolio: Antes · Diseño · Instalación · Después + videos.
 * Estrellas ⭐ = "de las buenas": portada del proyecto y primeras en las publicaciones de redes.
 */
import { useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SocialPostComposer } from "@/components/SocialPostComposer";
import { confirmAction } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { downloadMediaUrl, slug, uploadPortfolioPhoto, uploadProjectVideo } from "@/lib/portfolioMedia";
import {
  ChevronLeft, ChevronRight, Download, ExternalLink, Film, ImageIcon, ImagePlus, Loader2, Megaphone, RotateCcw, Star, Trash2, Upload,
} from "lucide-react";
import { MAX_VIDEO_BYTES, PORTFOLIO_SECTIONS, canEditPortfolio, formatBytes, workTypeLabel, type PortfolioSection } from "@shared/portfolio";
import { SOCIAL_NETWORKS, SOCIAL_POST_TYPES, type SocialNetwork, type SocialPostType } from "@shared/socialPosts";
import { parseWoodColors, woodColorRows } from "@shared/primaderaCatalog";

type Media = { key: string; source: "foto" | "levantamiento"; id: number; url: string; folder: string; createdAt: string; starred: boolean };

const EMPTY_HINT: Record<PortfolioSection, string> = {
  antes: "Sin fotos del antes. Si las tienes en el celular, súbelas con \"Subir fotos\". Recuérdale al medidor tomarlas en el levantamiento.",
  diseno: "Sin modelado ni renders.",
  instalacion: "Sin fotos de la instalación.",
  despues: "Sin fotos finales. Súbelas aquí o el taller las sube al terminar (Entrega → Fotos finales).",
};

export default function PortafolioProyecto() {
  const [, params] = useRoute("/portafolio/:id");
  const projectId = Number(params?.id);
  const { user } = useAuth();
  const canEdit = canEditPortfolio(user?.role);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.portfolio.get.useQuery({ projectId }, { enabled: !!projectId });

  const [viewer, setViewer] = useState<{ list: Media[]; index: number } | null>(null);
  const [composer, setComposer] = useState<{ open: boolean; type?: SocialPostType }>({ open: false });
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoSection, setPhotoSection] = useState<PortfolioSection | null>(null);
  const [photoUpload, setPhotoUpload] = useState<{ section: PortfolioSection; done: number; total: number } | null>(null);
  const [, navigate] = useLocation();

  const refresh = () => {
    utils.portfolio.get.invalidate({ projectId });
    utils.portfolio.list.invalidate();
    utils.social.overview.invalidate();
  };

  const starMut = trpc.portfolio.toggleStar.useMutation({
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const deleteVideoMut = trpc.portfolio.deleteVideo.useMutation({
    onSuccess: () => { refresh(); toast.success("Video quitado del portafolio"); },
    onError: (e) => toast.error(e.message),
  });

  const hideMut = trpc.portfolio.setHidden.useMutation({
    onSuccess: (r) => {
      refresh();
      if (r.hidden) {
        toast.success("Galería quitada del portafolio. Puedes restaurarla desde \"Eliminadas\".");
        navigate("/portafolio");
      } else {
        toast.success("Galería restaurada");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const askHide = async () => {
    const ok = await confirmAction({
      title: "¿Eliminar esta galería del portafolio?",
      description: "Deja de aparecer en el Portafolio y en Redes. Las fotos y videos NO se borran: siguen guardados en el proyecto y puedes restaurar la galería desde \"Eliminadas\".",
      confirmText: "Eliminar galería",
      destructive: true,
    });
    if (ok) hideMut.mutate({ projectId, hidden: true });
  };

  const pickPhotos = (section: PortfolioSection) => {
    setPhotoSection(section);
    photoRef.current?.click();
  };

  const onPickPhotos = async (files: FileList | null) => {
    const section = photoSection;
    if (!files?.length || !section) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    let ok = 0;
    setPhotoUpload({ section, done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        await uploadPortfolioPhoto(projectId, section, file);
        ok++;
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message}`);
      }
      setPhotoUpload({ section, done: i + 1, total: list.length });
    }
    setPhotoUpload(null);
    if (photoRef.current) photoRef.current.value = "";
    if (ok) toast.success(ok === 1 ? "Foto subida" : `${ok} fotos subidas`);
    refresh();
  };

  const toggleStar = (m: Media) => {
    if (!canEdit) return;
    starMut.mutate({ projectId, source: m.source, mediaId: m.id });
    // reflejar al instante en el visor
    setViewer((v) => v && { ...v, list: v.list.map((x) => (x.key === m.key ? { ...x, starred: !x.starred } : x)) });
  };

  const onPickVideos = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/")) { toast.error(`${file.name} no es un video`); continue; }
      if (file.size > MAX_VIDEO_BYTES) { toast.error(`${file.name} pesa más de 1 GB`); continue; }
      setUpload({ name: file.name, pct: 0 });
      try {
        await uploadProjectVideo(projectId, file, (pct) => setUpload({ name: file.name, pct }));
        toast.success("Video subido");
        refresh();
      } catch (e: any) {
        toast.error(e.message || "No se pudo subir el video");
      }
    }
    setUpload(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error || !data) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{error?.message || "Proyecto no encontrado en el portafolio."}</p>
        <Link href="/portafolio"><Button variant="outline">Volver al portafolio</Button></Link>
      </div>
    );
  }

  const woodRows = data.woodColor ? woodColorRows(parseWoodColors(data.woodColor)) : [];
  const published = data.publications;

  return (
    <div className="pb-24 md:pb-6">
      <PageHeader
        title={data.name}
        subtitle={`${workTypeLabel(data.workType)}${data.city ? ` · ${data.city}` : ""}${data.deliveredAt ? ` · Entregado ${formatDate(data.deliveredAt)}` : ""}`}
        showBack
        icon={<ImageIcon className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {data.available.length > 0 && (
              <Button className="gap-1.5" onClick={() => setComposer({ open: true })}><Megaphone className="h-4 w-4" />Crear publicación</Button>
            )}
            {canEdit && (
              <Button variant="outline" className="gap-1.5" disabled={!!upload} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />Subir video
              </Button>
            )}
            <Link href={`/projects/${data.id}`}><Button variant="ghost" className="gap-1.5"><ExternalLink className="h-4 w-4" />Proyecto</Button></Link>
            {canEdit && !data.hidden && (
              <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={askHide} disabled={hideMut.isPending}>
                <Trash2 className="h-4 w-4" />Eliminar galería
              </Button>
            )}
          </div>
        }
      />
      <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => onPickVideos(e.target.files)} />
      <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickPhotos(e.target.files)} />

      {data.hidden && (
        <div className="mb-4 rounded-xl border border-warning/50 bg-warning/10 p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">Esta galería está <b>eliminada del portafolio</b>: no aparece en el Portafolio ni en Redes.</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" disabled={hideMut.isPending} onClick={() => hideMut.mutate({ projectId, hidden: false })}>
              <RotateCcw className="h-4 w-4" />Restaurar
            </Button>
          )}
        </div>
      )}

      {photoUpload && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
          <p className="text-sm">Subiendo fotos a <b>{PORTFOLIO_SECTIONS.find((x) => x.key === photoUpload.section)?.label}</b>… {photoUpload.done} de {photoUpload.total}</p>
          <Progress value={(photoUpload.done / Math.max(1, photoUpload.total)) * 100} />
        </div>
      )}

      {upload && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
          <p className="text-sm">Subiendo <b>{upload.name}</b>… {upload.pct}% <span className="text-muted-foreground text-xs">(no cierres esta pantalla)</span></p>
          <Progress value={upload.pct} />
        </div>
      )}

      {/* Datos para el texto de redes */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3 text-sm grid gap-1 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Cliente:</span> {data.clientName || "—"}</p>
        <p><span className="text-muted-foreground">Mesón:</span> {data.countertop || "—"}</p>
        <p className="sm:col-span-2"><span className="text-muted-foreground">Madera:</span> {woodRows.length ? woodRows.map((r) => `${r.label}: ${r.value}`).join(" · ") : "—"}</p>
        {data.weeks && <p><span className="text-muted-foreground">Tiempo:</span> {data.weeks} semana{data.weeks === 1 ? "" : "s"} desde la aprobación del diseño</p>}
        {canEdit && <p className="sm:col-span-2 text-xs text-muted-foreground">Toca la ⭐ de las mejores fotos: serán la portada y las primeras que aparecen al crear publicaciones.</p>}
      </div>

      {/* Publicaciones hechas y pendientes */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {data.available.map((t) => {
          const done = published.filter((p) => p.postType === t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setComposer({ open: true, type: t })}
              className={`px-2.5 py-1 rounded-full text-xs border ${done.length ? "border-success/50 text-success" : "border-border hover:border-primary/60"}`}
            >
              {SOCIAL_POST_TYPES[t].emoji} {SOCIAL_POST_TYPES[t].label}
              {done.length > 0 && ` · ${done.map((d) => SOCIAL_NETWORKS[d.network as SocialNetwork]?.label || d.network).join(", ")}`}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {PORTFOLIO_SECTIONS.map((s) => {
          const list = data.media[s.key] as Media[];
          const videos = s.key === "despues" ? data.videos : [];
          return (
            <section key={s.key}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-baseline gap-2 min-w-0 flex-1 flex-wrap">
                  <h2 className="text-base font-semibold">{s.label}</h2>
                  <span className="text-xs text-muted-foreground">{s.hint} · {list.length} foto{list.length === 1 ? "" : "s"}{videos.length ? ` · ${videos.length} video${videos.length === 1 ? "" : "s"}` : ""}</span>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 shrink-0" disabled={!!photoUpload} onClick={() => pickPhotos(s.key)}>
                    <ImagePlus className="h-4 w-4" />Subir fotos
                  </Button>
                )}
              </div>

              {videos.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 mb-3">
                  {videos.map((v) => (
                    <div key={v.id} className="rounded-xl overflow-hidden border border-border bg-black">
                      <video src={v.url} controls preload="metadata" playsInline className="w-full max-h-[420px]" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-card">
                        <Film className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground truncate flex-1">{v.fileName || "Video"} · {formatBytes(v.sizeBytes)} · {formatDate(v.createdAt)}</span>
                        <a href={downloadMediaUrl(v.url, v.fileName || `innovar-${slug(data.name)}.mp4`)} download title="Descargar">
                          <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-4 w-4" /></Button>
                        </a>
                        {canEdit && (
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Quitar"
                            onClick={async () => {
                              if (await confirmAction({ title: "¿Quitar este video del portafolio?", confirmText: "Quitar", destructive: true })) deleteVideoMut.mutate({ id: v.id });
                            }}
                          ><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {list.length === 0 && videos.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">{EMPTY_HINT[s.key]}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {list.map((m, i) => (
                    <div key={m.key} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                      <button type="button" className="h-full w-full" onClick={() => setViewer({ list, index: i })}>
                        <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </button>
                      {(canEdit || m.starred) && (
                        <button
                          type="button"
                          onClick={() => toggleStar(m)}
                          className={`absolute top-1 right-1 rounded-full p-1 bg-black/45 ${canEdit ? "" : "pointer-events-none"}`}
                          title={m.starred ? "Quitar estrella" : "Marcar como de las mejores"}
                        >
                          <Star className={`h-4 w-4 ${m.starred ? "fill-amber-400 text-amber-400" : "text-white/85"}`} />
                        </button>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-[9px] text-white/90 px-1.5 pt-3 pb-0.5 truncate">{m.folder}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Visor de fotos */}
      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-5xl p-2 sm:p-3 bg-black/95 border-border">
          <DialogTitle className="sr-only">Foto</DialogTitle>
          {viewer && (() => {
            const m = viewer.list[viewer.index];
            const go = (d: number) => setViewer({ ...viewer, index: (viewer.index + d + viewer.list.length) % viewer.list.length });
            return (
              <div className="space-y-2">
                <div className="relative flex items-center justify-center">
                  <img src={m.url} alt="" className="max-h-[75vh] w-auto object-contain rounded" />
                  {viewer.list.length > 1 && (
                    <>
                      <button type="button" onClick={() => go(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"><ChevronLeft className="h-5 w-5" /></button>
                      <button type="button" onClick={() => go(1)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"><ChevronRight className="h-5 w-5" /></button>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-1 text-white/80 text-xs">
                  <span>{m.folder} · {formatDate(m.createdAt)} · {viewer.index + 1}/{viewer.list.length}</span>
                  <div className="flex gap-1.5">
                    {canEdit && (
                      <Button size="sm" variant={m.starred ? "default" : "outline"} className="h-7 gap-1" onClick={() => toggleStar(m)}>
                        <Star className={`h-3.5 w-3.5 ${m.starred ? "fill-current" : ""}`} />{m.starred ? "Con estrella" : "Estrella"}
                      </Button>
                    )}
                    <a href={downloadMediaUrl(m.url, `innovar-${slug(data.name)}-${m.key}.jpg`)} download>
                      <Button size="sm" variant="outline" className="h-7 gap-1"><Download className="h-3.5 w-3.5" />Descargar</Button>
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <SocialPostComposer
        projectId={projectId}
        initialType={composer.type}
        open={composer.open}
        onOpenChange={(o) => setComposer((c) => ({ ...c, open: o }))}
      />
    </div>
  );
}
