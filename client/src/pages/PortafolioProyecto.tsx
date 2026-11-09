/**
 * Ficha de un proyecto en el Portafolio: Antes · Diseño · Instalación · Después + videos.
 * Pensada para alimentarla desde el celular:
 *  - barra fija con los 4 bloques (tocar = ir al bloque) y cuántas fotos tiene cada uno;
 *  - casilla grande "+ Agregar" al inicio de cada bloque (abre la galería o la cámara del celular);
 *  - las fotos aparecen de una vez mientras suben;
 *  - "Anterior / Siguiente" para pasar al siguiente proyecto de la lista sin volver atrás.
 * Estrellas ⭐ = "de las buenas": portada del proyecto y primeras en las publicaciones de redes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SocialPostComposer } from "@/components/SocialPostComposer";
import { confirmAction } from "@/lib/confirm";
import { formatDate } from "@/lib/format";
import { downloadMediaUrl, slug, uploadPortfolioPhoto, uploadProjectVideo } from "@/lib/portfolioMedia";
import {
  AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Download, ExternalLink, Film, ImagePlus, Loader2, Megaphone,
  ArrowRightLeft, CheckCircle2, Circle, ListChecks, MoreVertical, RotateCcw, Star, Trash2, Video, X,
} from "lucide-react";
import { MAX_VIDEO_BYTES, PORTFOLIO_SECTIONS, canEditPortfolio, formatBytes, type PortfolioSection } from "@shared/portfolio";
import { worksLabel } from "@shared/workTypes";
import { SOCIAL_NETWORKS, SOCIAL_POST_TYPES, type SocialNetwork, type SocialPostType } from "@shared/socialPosts";
import { parseWoodColors, woodColorRows } from "@shared/primaderaCatalog";

type Media = { key: string; source: "foto" | "levantamiento"; id: number; url: string; folder: string; createdAt: string; starred: boolean };
type Pending = { key: string; section: PortfolioSection; preview: string; status: "subiendo" | "error"; error?: string };

/** Lista de proyectos que dejó la pantalla del Portafolio (con sus filtros y orden) para "Anterior / Siguiente". */
export const PORTFOLIO_NAV_KEY = "portafolio-nav";

const EMPTY_HINT: Record<PortfolioSection, string> = {
  antes: "El espacio como estaba antes de empezar",
  diseno: "Renders y modelado 3D",
  instalacion: "Fotos en la obra",
  despues: "El trabajo terminado",
};

/** Sube varias fotos, de a 2 a la vez. */
async function runPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

export default function PortafolioProyecto() {
  const [, params] = useRoute("/portafolio/:id");
  const projectId = Number(params?.id);
  const { user } = useAuth();
  const canEdit = canEditPortfolio(user?.role);
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.portfolio.get.useQuery({ projectId }, { enabled: !!projectId });

  const [viewer, setViewer] = useState<{ list: Media[]; index: number } | null>(null);
  // Seleccionar varias fotos para eliminar o mover de bloque
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [trashOpen, setTrashOpen] = useState(false);
  const [composer, setComposer] = useState<{ open: boolean; type?: SocialPostType }>({ open: false });
  const [videoUpload, setVideoUpload] = useState<{ name: string; pct: number } | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const touchX = useRef<number | null>(null);

  // Anterior / Siguiente según la lista del Portafolio
  const nav = useMemo(() => {
    try {
      const ids: number[] = JSON.parse(sessionStorage.getItem(PORTFOLIO_NAV_KEY) || "[]");
      const i = ids.indexOf(projectId);
      if (i < 0) return null;
      return { prev: ids[i - 1] ?? null, next: ids[i + 1] ?? null, pos: i + 1, total: ids.length };
    } catch {
      return null;
    }
  }, [projectId]);

  // Al cambiar de proyecto: arriba y sin pendientes
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setPending([]);
    setSelecting(false);
    setSelected(new Set());
  }, [projectId]);

  const refresh = () => {
    utils.portfolio.get.invalidate({ projectId });
    utils.portfolio.list.invalidate();
    utils.social.overview.invalidate();
  };

  const starMut = trpc.portfolio.toggleStar.useMutation({
    onSuccess: refresh,
    onError: (e) => { toast.error(e.message); refresh(); },
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
        if (nav?.next) navigate(`/portafolio/${nav.next}`);
        else navigate("/portafolio");
      } else {
        toast.success("Galería restaurada");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  /** La estrella cambia al instante (sin esperar al servidor). */
  const toggleStar = (m: Media) => {
    if (!canEdit) return;
    utils.portfolio.get.setData({ projectId }, (old: any) => {
      if (!old) return old;
      const flip = (list: Media[]) => list.map((x) => (x.key === m.key ? { ...x, starred: !x.starred } : x));
      return { ...old, media: { antes: flip(old.media.antes), diseno: flip(old.media.diseno), instalacion: flip(old.media.instalacion), despues: flip(old.media.despues) } };
    });
    setViewer((v) => v && { ...v, list: v.list.map((x) => (x.key === m.key ? { ...x, starred: !x.starred } : x)) });
    starMut.mutate({ projectId, source: m.source, mediaId: m.id });
  };

  const askHide = async () => {
    const ok = await confirmAction({
      title: "¿Eliminar esta galería del portafolio?",
      description: "Deja de aparecer en el Portafolio y en Redes. Las fotos y videos NO se borran: siguen guardados en el proyecto y puedes restaurar la galería desde \"Eliminadas\".",
      confirmText: "Eliminar galería",
      destructive: true,
    });
    if (ok) hideMut.mutate({ projectId, hidden: true });
  };

  /**
   * El campo de archivo va ENCIMA de la casilla (transparente): el dedo toca el campo real.
   * En el iPhone (sobre todo con el CRM instalado en la pantalla de inicio) abrir la galería
   * "por código" desde un campo escondido a veces no hace nada.
   */
  const onPickPhotos = async (input: HTMLInputElement, section: PortfolioSection) => {
    const all = Array.from(input.files || []);
    input.value = "";
    const list = all.filter((f) => !f.type || f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (all.length && !list.length) toast.error("Lo que escogiste no son fotos");
    if (!list.length) return;
    const items = list.map((file, i) => ({
      file,
      p: { key: `p-${Date.now()}-${i}`, section, preview: URL.createObjectURL(file), status: "subiendo" as const },
    }));
    setPending((ps) => [...ps, ...items.map((x) => x.p)]);
    let ok = 0;
    const failed: string[] = [];
    await runPool(items, 2, async ({ file, p }) => {
      try {
        await uploadPortfolioPhoto(projectId, section, file);
        ok++;
        await utils.portfolio.get.invalidate({ projectId });
        setPending((ps) => ps.filter((x) => x.key !== p.key));
        URL.revokeObjectURL(p.preview);
      } catch (e: any) {
        failed.push(e?.message || "No se pudo subir");
        setPending((ps) => ps.map((x) => (x.key === p.key ? { ...x, status: "error", error: e.message } : x)));
      }
    });
    if (failed.length) toast.error(`${failed.length === 1 ? "Una foto no subió" : `${failed.length} fotos no subieron`}: ${failed[0]}`, { duration: 10000 });
    if (ok) toast.success(ok === 1 ? "Foto subida" : `${ok} fotos subidas`);
    refresh();
  };

  const onPickVideos = async (input: HTMLInputElement) => {
    const list = Array.from(input.files || []);
    input.value = "";
    for (const file of list) {
      if (file.type && !file.type.startsWith("video/")) { toast.error(`${file.name} no es un video`); continue; }
      if (file.size > MAX_VIDEO_BYTES) { toast.error(`${file.name} pesa más de 1 GB`); continue; }
      setVideoUpload({ name: file.name, pct: 0 });
      try {
        await uploadProjectVideo(projectId, file, (pct) => setVideoUpload({ name: file.name, pct }));
        toast.success("Video subido");
        refresh();
      } catch (e: any) {
        toast.error(e.message || "No se pudo subir el video", { duration: 10000 });
      }
    }
    setVideoUpload(null);
  };

  const trashQuery = trpc.portfolio.trash.useQuery({ projectId }, { enabled: canEdit && !!projectId });
  const afterChange = () => { refresh(); utils.portfolio.trash.invalidate({ projectId }); };
  const deleteMediaMut = trpc.portfolio.deleteMedia.useMutation({
    onSuccess: (r) => {
      afterChange();
      setSelected(new Set());
      setSelecting(false);
      toast.success(`${r.deleted === 1 ? "Foto enviada" : `${r.deleted} fotos enviadas`} a la papelera`, {
        action: { label: "Ver papelera", onClick: () => setTrashOpen(true) },
      });
    },
    onError: (e) => toast.error(e.message),
  });
  const moveMediaMut = trpc.portfolio.moveMedia.useMutation({
    onSuccess: (r, v) => {
      afterChange();
      setSelected(new Set());
      setSelecting(false);
      const to = PORTFOLIO_SECTIONS.find((x) => x.key === v.section)?.label;
      toast.success(`${r.moved === 1 ? "Foto movida" : `${r.moved} fotos movidas`} a ${to}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const restoreMut = trpc.portfolio.restoreMedia.useMutation({
    onSuccess: (r) => {
      afterChange();
      if (r.restored) toast.success(r.restored === 1 ? "Foto restaurada" : `${r.restored} fotos restauradas`);
      if (r.failed) toast.error(`${r.failed} no se pudieron restaurar`);
    },
    onError: (e) => toast.error(e.message),
  });

  const allMedia = (): Media[] => (data ? (Object.values(data.media).flat() as Media[]) : []);
  const toggleSelect = (key: string) =>
    setSelected((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const askDelete = async (items: Media[]) => {
    if (!items.length) return;
    const ok = await confirmAction({
      title: items.length === 1 ? "¿Eliminar esta foto?" : `¿Eliminar ${items.length} fotos?`,
      description: "Se quitan del portafolio y del proyecto. Quedan 30 días en la papelera (menú ⋮ → Papelera), desde donde se pueden restaurar.",
      confirmText: items.length === 1 ? "Eliminar foto" : `Eliminar ${items.length} fotos`,
      destructive: true,
    });
    if (!ok) return;
    setViewer(null);
    deleteMediaMut.mutate({ projectId, items: items.map((m) => ({ source: m.source, id: m.id })) });
  };

  const moveSelected = (section: PortfolioSection) => {
    const fotos = allMedia().filter((m) => selected.has(m.key) && m.source === "foto");
    if (!fotos.length) { toast.error("Las fotos del levantamiento no se pueden mover"); return; }
    moveMediaMut.mutate({ projectId, ids: fotos.map((m) => m.id), section });
  };

  const goTo = (section: PortfolioSection) => {
    const el = document.getElementById(`bloque-${section}`);
    if (!el) return;
    const offset = window.innerWidth < 768 ? 56 + 64 : 80 + 64; // encabezado + barra de bloques
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
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
  const sectionCount = (k: PortfolioSection) =>
    (data.media[k] as Media[]).length + (k === "despues" ? data.videos.length : 0) + pending.filter((p) => p.section === k).length;

  return (
    <div className={selecting ? "pb-48 md:pb-28" : "pb-28 md:pb-8"}>

      {/* Encabezado compacto */}
      <div className="flex items-start gap-2 mb-3">
        <Link href="/portafolio" className="mt-0.5 shrink-0 rounded-lg p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted" title="Volver al portafolio">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold leading-tight">{data.clientName || data.name}</h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-snug">
            {data.clientName ? `${data.name} · ` : ""}{worksLabel(data.works)}{data.city ? ` · ${data.city}` : ""}{data.deliveredAt ? ` · ${formatDate(data.deliveredAt)}` : ""}
          </p>
        </div>
        {nav && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Button size="icon" variant="outline" disabled={!nav.prev} onClick={() => nav.prev && navigate(`/portafolio/${nav.prev}`)} title="Proyecto anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground w-14 text-center">{nav.pos} de {nav.total}</span>
            <Button size="icon" variant="outline" disabled={!nav.next} onClick={() => nav.next && navigate(`/portafolio/${nav.next}`)} title="Proyecto siguiente"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="shrink-0" title="Más opciones"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/projects/${data.id}`)}><ExternalLink className="h-4 w-4 mr-2" />Abrir el proyecto</DropdownMenuItem>
            {canEdit && <DropdownMenuItem onClick={() => goTo("despues")}><Video className="h-4 w-4 mr-2" />Subir video</DropdownMenuItem>}
            {canEdit && <DropdownMenuItem onClick={() => { setSelecting(true); setSelected(new Set()); }}><ListChecks className="h-4 w-4 mr-2" />Seleccionar fotos</DropdownMenuItem>}
            {canEdit && (
              <DropdownMenuItem onClick={() => setTrashOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />Papelera{trashQuery.data?.length ? ` (${trashQuery.data.length})` : ""}
              </DropdownMenuItem>
            )}
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                {data.hidden ? (
                  <DropdownMenuItem onClick={() => hideMut.mutate({ projectId, hidden: false })}><RotateCcw className="h-4 w-4 mr-2" />Restaurar galería</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={askHide}><Trash2 className="h-4 w-4 mr-2" />Eliminar galería</DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {data.hidden && (
        <div className="mb-3 rounded-xl border border-warning/50 bg-warning/10 p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">Esta galería está <b>eliminada del portafolio</b>.</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" disabled={hideMut.isPending} onClick={() => hideMut.mutate({ projectId, hidden: false })}>
              <RotateCcw className="h-4 w-4" />Restaurar
            </Button>
          )}
        </div>
      )}

      {/* Datos (cortos) y publicaciones */}
      {(data.countertop || woodRows.length > 0) && (
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
          {woodRows.length > 0 && <>🪵 {woodRows.map((r) => `${r.label}: ${r.value}`).join(" · ")}</>}
          {woodRows.length > 0 && data.countertop && <br />}
          {data.countertop && <>🪨 Mesón: {data.countertop}</>}
        </p>
      )}
      {data.available.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 -mx-1 px-1">
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setComposer({ open: true })}><Megaphone className="h-4 w-4" />Crear publicación</Button>
          {data.available.map((t) => {
            const done = published.filter((p) => p.postType === t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setComposer({ open: true, type: t })}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs border ${done.length ? "border-success/50 text-success" : "border-border text-muted-foreground"}`}
              >
                {SOCIAL_POST_TYPES[t].emoji} {SOCIAL_POST_TYPES[t].label}
                {done.length > 0 && ` · ${done.map((d) => SOCIAL_NETWORKS[d.network as SocialNetwork]?.label || d.network).join(", ")}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Barra fija de bloques */}
      <div className="sticky top-14 md:top-20 z-20 -mx-3.5 px-3.5 md:mx-0 md:px-0 py-2 bg-background/95 backdrop-blur border-b border-border mb-4">
        <div className="grid grid-cols-4 gap-1.5">
          {PORTFOLIO_SECTIONS.map((s) => {
            const n = sectionCount(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => goTo(s.key)}
                className={`rounded-lg border px-1 py-1.5 text-center transition ${n ? "border-border bg-card" : "border-dashed border-warning/50 bg-warning/5"}`}
              >
                <p className="text-[11px] md:text-xs font-semibold leading-none">{s.label}</p>
                <p className={`text-[11px] mt-1 leading-none ${n ? "text-primary" : "text-warning"}`}>{n ? `${n} ${n === 1 ? "archivo" : "archivos"}` : "Vacío"}</p>
              </button>
            );
          })}
        </div>
        {canEdit && (
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <p className="text-[11px] text-muted-foreground truncate">
              {selecting ? "Toca las fotos que quieres eliminar o mover" : <><span className="md:hidden">⭐ = las mejores fotos</span><span className="hidden md:inline">Toca la ⭐ de las mejores fotos: serán la portada y las primeras al crear publicaciones.</span></>}
            </p>
            <Button
              size="sm"
              variant={selecting ? "default" : "outline"}
              className="h-7 px-2.5 text-xs gap-1 shrink-0"
              onClick={() => { setSelecting(!selecting); setSelected(new Set()); }}
            >
              {selecting ? <><X className="h-3.5 w-3.5" />Listo</> : <><ListChecks className="h-3.5 w-3.5" />Seleccionar</>}
            </Button>
          </div>
        )}
      </div>

      {videoUpload && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
          <p className="text-sm">Subiendo video <b className="break-all">{videoUpload.name}</b>… {videoUpload.pct}%</p>
          <Progress value={videoUpload.pct} />
          <p className="text-[11px] text-muted-foreground">No cierres esta pantalla hasta que termine.</p>
        </div>
      )}

      <div className="space-y-7">
        {PORTFOLIO_SECTIONS.map((s) => {
          const list = data.media[s.key] as Media[];
          const videos = s.key === "despues" ? data.videos : [];
          const mine = pending.filter((p) => p.section === s.key);
          const empty = !list.length && !videos.length && !mine.length;
          return (
            <section key={s.key} id={`bloque-${s.key}`}>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-base font-semibold">{s.label}</h2>
                <span className="text-xs text-muted-foreground truncate flex-1">{EMPTY_HINT[s.key]}</span>
                {selecting && list.length > 0 && (() => {
                  const all = list.every((m) => selected.has(m.key));
                  return (
                    <button
                      type="button"
                      className="text-xs text-primary font-medium shrink-0"
                      onClick={() => setSelected((sel) => {
                        const n = new Set(sel);
                        list.forEach((m) => (all ? n.delete(m.key) : n.add(m.key)));
                        return n;
                      })}
                    >
                      {all ? "Quitar todas" : "Todas"}
                    </button>
                  );
                })()}
              </div>

              {videos.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 mb-2">
                  {videos.map((v) => (
                    <div key={v.id} className="rounded-xl overflow-hidden border border-border bg-black">
                      <video src={v.url} controls preload="metadata" playsInline className="w-full max-h-[420px]" />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-card">
                        <Film className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground truncate flex-1">{formatBytes(v.sizeBytes) || "Video"} · {formatDate(v.createdAt)}</span>
                        <a href={downloadMediaUrl(v.url, v.fileName || `innovar-${slug(data.name)}.mp4`)} download title="Descargar">
                          <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                        </a>
                        {canEdit && (
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Quitar"
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

              {empty && !canEdit ? (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">Sin fotos.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {canEdit && !selecting && (
                    <label className="relative aspect-square rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 text-primary flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer overflow-hidden">
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-xs font-semibold">Agregar</span>
                      <span className="text-[10px] text-primary/70 leading-none">fotos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label={`Agregar fotos a ${s.label}`}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                        onChange={(e) => onPickPhotos(e.currentTarget, s.key)}
                      />
                    </label>
                  )}
                  {canEdit && !selecting && s.key === "despues" && (
                    <label className={`relative aspect-square rounded-lg border-2 border-dashed border-info/50 bg-info/5 text-info flex flex-col items-center justify-center gap-1 active:scale-95 transition overflow-hidden ${videoUpload ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                      <Video className="h-7 w-7" />
                      <span className="text-xs font-semibold">Agregar</span>
                      <span className="text-[10px] opacity-70 leading-none">video</span>
                      <input
                        type="file"
                        accept="video/*"
                        aria-label="Agregar video"
                        disabled={!!videoUpload}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                        onChange={(e) => onPickVideos(e.currentTarget)}
                      />
                    </label>
                  )}

                  {list.map((m, i) => {
                    const isSel = selected.has(m.key);
                    return (
                    <div key={m.key} className={`relative aspect-square rounded-lg overflow-hidden bg-muted ${isSel ? "ring-[3px] ring-destructive" : ""}`}>
                      <button
                        type="button"
                        className="h-full w-full"
                        onClick={() => (selecting ? toggleSelect(m.key) : setViewer({ list, index: i }))}
                      >
                        <img src={m.url} alt="" loading="lazy" className={`h-full w-full object-cover transition ${isSel ? "scale-90 rounded-md opacity-80" : ""}`} />
                      </button>
                      {selecting && (
                        <span className="pointer-events-none absolute top-1.5 left-1.5">
                          {isSel
                            ? <CheckCircle2 className="h-6 w-6 fill-destructive text-white drop-shadow" />
                            : <Circle className="h-6 w-6 text-white drop-shadow" />}
                        </span>
                      )}
                      {!selecting && (canEdit || m.starred) && (
                        <button
                          type="button"
                          onClick={() => toggleStar(m)}
                          className={`absolute top-0 right-0 p-1.5 ${canEdit ? "" : "pointer-events-none"}`}
                          title={m.starred ? "Quitar estrella" : "Marcar como de las mejores"}
                        >
                          <span className="block rounded-full bg-black/50 p-1">
                            <Star className={`h-4 w-4 ${m.starred ? "fill-amber-400 text-amber-400" : "text-white/90"}`} />
                          </span>
                        </button>
                      )}
                    </div>
                    );
                  })}

                  {mine.map((p) => (
                    <div key={p.key} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={p.preview} alt="" className="h-full w-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white">
                        {p.status === "subiendo" ? (
                          <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-[10px]">Subiendo…</span></>
                        ) : (
                          <>
                            <AlertCircle className="h-6 w-6 text-red-300" />
                            <span className="text-[10px] px-1 text-center leading-tight">{p.error || "No subió"}</span>
                            <button type="button" className="absolute top-1 right-1 rounded-full bg-black/60 p-1" onClick={() => setPending((ps) => ps.filter((x) => x.key !== p.key))}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Pasar al siguiente proyecto sin volver a la lista */}
      {nav && (nav.prev || nav.next) && (
        <div className="mt-8 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12 gap-1.5" disabled={!nav.prev} onClick={() => nav.prev && navigate(`/portafolio/${nav.prev}`)}>
            <ChevronLeft className="h-4 w-4" />Anterior
          </Button>
          <Button className="h-12 gap-1.5" disabled={!nav.next} onClick={() => nav.next && navigate(`/portafolio/${nav.next}`)}>
            Siguiente<ChevronRight className="h-4 w-4" />
          </Button>
          <p className="col-span-2 text-center text-[11px] text-muted-foreground">Proyecto {nav.pos} de {nav.total} de la lista</p>
        </div>
      )}

      {/* Visor de fotos (deslizar para pasar) */}
      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-5xl p-2 sm:p-3 bg-black/95 border-border">
          <DialogTitle className="sr-only">Foto</DialogTitle>
          {viewer && (() => {
            const m = viewer.list[viewer.index];
            const go = (d: number) => setViewer({ ...viewer, index: (viewer.index + d + viewer.list.length) % viewer.list.length });
            return (
              <div className="space-y-2">
                <div
                  className="relative flex items-center justify-center"
                  onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchX.current == null) return;
                    const dx = e.changedTouches[0].clientX - touchX.current;
                    touchX.current = null;
                    if (Math.abs(dx) > 50 && viewer.list.length > 1) go(dx < 0 ? 1 : -1);
                  }}
                >
                  <img src={m.url} alt="" className="max-h-[72vh] w-auto object-contain rounded select-none" draggable={false} />
                  {viewer.list.length > 1 && (
                    <>
                      <button type="button" onClick={() => go(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"><ChevronLeft className="h-5 w-5" /></button>
                      <button type="button" onClick={() => go(1)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"><ChevronRight className="h-5 w-5" /></button>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-1 text-white/80 text-xs">
                  <span className="truncate">{m.folder} · {viewer.index + 1}/{viewer.list.length}</span>
                  <div className="flex gap-1.5 shrink-0">
                    {canEdit && (
                      <Button size="sm" variant={m.starred ? "default" : "outline"} className="h-9 gap-1" onClick={() => toggleStar(m)}>
                        <Star className={`h-4 w-4 ${m.starred ? "fill-current" : ""}`} />{m.starred ? "Con estrella" : "Estrella"}
                      </Button>
                    )}
                    <a href={downloadMediaUrl(m.url, `innovar-${slug(data.name)}-${m.key}.jpg`)} download>
                      <Button size="sm" variant="outline" className="h-9 gap-1"><Download className="h-4 w-4" /></Button>
                    </a>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="h-9 gap-1 text-destructive border-destructive/50" title="Eliminar foto" onClick={() => askDelete([m])}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Barra de acciones al seleccionar (encima de la barra inferior del celular) */}
      {selecting && (
        <div className="fixed left-0 right-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 px-3 md:px-0 md:left-auto md:right-6 md:w-[480px]">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-2xl p-2.5 flex items-center gap-2">
            <span className="text-sm font-semibold px-1.5 flex-1">{selected.size} {selected.size === 1 ? "foto" : "fotos"}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-10 gap-1.5" disabled={!selected.size || moveMediaMut.isPending}>
                  <ArrowRightLeft className="h-4 w-4" />Mover
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                {PORTFOLIO_SECTIONS.map((x) => (
                  <DropdownMenuItem key={x.key} onClick={() => moveSelected(x.key)}>Mover a {x.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="destructive"
              className="h-10 gap-1.5"
              disabled={!selected.size || deleteMediaMut.isPending}
              onClick={() => askDelete(allMedia().filter((m) => selected.has(m.key)))}
            >
              <Trash2 className="h-4 w-4" />Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Papelera del proyecto */}
      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>Papelera</DialogTitle>
          <p className="text-xs text-muted-foreground -mt-2">Fotos eliminadas de este proyecto. Se borran solas a los 30 días.</p>
          {!trashQuery.data?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">La papelera está vacía.</p>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 self-start"
                disabled={restoreMut.isPending}
                onClick={() => restoreMut.mutate({ projectId, trashIds: trashQuery.data!.map((t) => t.id) })}
              >
                <RotateCcw className="h-4 w-4" />Restaurar todas ({trashQuery.data.length})
              </Button>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {trashQuery.data.map((t) => (
                  <div key={t.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={t.url} alt="" loading="lazy" className="h-full w-full object-cover opacity-70" />
                    <span className="absolute top-1 left-1 rounded bg-black/65 text-white text-[10px] px-1">{t.daysLeft} días</span>
                    <button
                      type="button"
                      disabled={restoreMut.isPending}
                      onClick={() => restoreMut.mutate({ projectId, trashIds: [t.id] })}
                      className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
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
