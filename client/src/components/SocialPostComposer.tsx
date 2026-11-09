/**
 * Armador de publicaciones para redes.
 * Toma las fotos del portafolio de un proyecto y arma la imagen con el logo de Innovar
 * (cuadrada para el feed o vertical para historias/TikTok), con el texto sugerido para
 * cada red. Al publicar, se marca en qué red se subió para llevar la cuenta y no repetir.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Download, Loader2, Share2, Star } from "lucide-react";
import { canEditPortfolio, workTypeLabel } from "@shared/portfolio";
import {
  SOCIAL_NETWORKS, SOCIAL_NETWORK_KEYS, SOCIAL_POST_TYPES, buildCaption,
  type SocialNetwork, type SocialPostType,
} from "@shared/socialPosts";
import { downloadMediaUrl, sameOriginMedia, saveOrShare, slug } from "@/lib/portfolioMedia";
import { formatDate } from "@/lib/format";

type Media = { key: string; url: string; starred: boolean; folder: string };
type Format = "cuadrado" | "vertical";

const FORMATS: Record<Format, { label: string; hint: string; w: number; h: number }> = {
  cuadrado: { label: "Cuadrada", hint: "Feed de Instagram y Facebook", w: 1080, h: 1080 },
  vertical: { label: "Vertical", hint: "Historias, Reels y TikTok", w: 1080, h: 1920 },
};

const LABELS: Partial<Record<SocialPostType, [string, string]>> = {
  antes_despues: ["ANTES", "DESPUÉS"],
  render_vs_real: ["DISEÑO 3D", "RESULTADO REAL"],
};

const FONT = `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const TEAL = "#1DB5A8";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la foto"));
    img.src = src;
  });
}

/** Dibuja la foto llenando el recuadro (recorta lo que sobra, centrado). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  ctx.font = `800 ${size}px ${FONT}`;
  const padX = size * 0.7, h = size * 1.9;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 4, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + 1);
}

async function renderPost(
  canvas: HTMLCanvasElement,
  opts: { type: SocialPostType; format: Format; a?: string | null; b?: string | null; title: string },
) {
  const { w: W, h: H } = FORMATS[opts.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0e1315";
  ctx.fillRect(0, 0, W, H);

  const [imgA, imgB, logo] = await Promise.all([
    opts.a ? loadImage(sameOriginMedia(opts.a)) : Promise.resolve(null),
    opts.b ? loadImage(sameOriginMedia(opts.b)) : Promise.resolve(null),
    loadImage("/logo-light.png").catch(() => null),
  ]);

  const labels = LABELS[opts.type];
  const pillSize = opts.format === "cuadrado" ? 30 : 40;
  if (labels && imgA && imgB) {
    if (opts.format === "cuadrado") {
      // lado a lado
      drawCover(ctx, imgA, 0, 0, W / 2, H);
      drawCover(ctx, imgB, W / 2, 0, W / 2, H);
      ctx.fillStyle = "#fff";
      ctx.fillRect(W / 2 - 4, 0, 8, H);
      pill(ctx, labels[0], 28, 28, pillSize);
      pill(ctx, labels[1], W / 2 + 28, 28, pillSize);
    } else {
      // arriba y abajo
      const half = (H - 8) / 2;
      drawCover(ctx, imgA, 0, 0, W, half);
      drawCover(ctx, imgB, 0, half + 8, W, half);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, half, W, 8);
      pill(ctx, labels[0], 36, 36, pillSize);
      pill(ctx, labels[1], 36, half + 8 + 36, pillSize);
    }
  } else {
    const img = imgB || imgA;
    if (img) drawCover(ctx, img, 0, 0, W, H);
  }

  // Franja de marca abajo
  const band = opts.format === "cuadrado" ? 250 : 340;
  const grad = ctx.createLinearGradient(0, H - band, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.72)");
  grad.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - band, W, band);

  const pad = opts.format === "cuadrado" ? 36 : 48;
  const logoH = opts.format === "cuadrado" ? 78 : 100;
  const baseY = H - pad;
  ctx.textBaseline = "alphabetic";
  let textX = pad;
  if (logo) {
    const lw = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, pad, baseY - logoH, lw, logoH);
    textX = pad + lw + 18;
  }
  const big = opts.format === "cuadrado" ? 34 : 44;
  const small = opts.format === "cuadrado" ? 22 : 28;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${big}px ${FONT}`;
  ctx.fillText("INNOVAR", textX, baseY - logoH / 2 + 4);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 ${small}px ${FONT}`;
  ctx.fillText("Cocinas de Diseño", textX, baseY - 6);

  ctx.textAlign = "right";
  ctx.fillStyle = TEAL;
  ctx.font = `700 ${small + 4}px ${FONT}`;
  ctx.fillText("WhatsApp 313 680 2025", W - pad, baseY - 6);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${small + 2}px ${FONT}`;
  ctx.fillText(opts.title, W - pad, baseY - logoH / 2 + 4);
  ctx.textAlign = "left";
}

function Thumbs({ items, value, onPick }: { items: Media[]; value: string | null; onPick: (url: string) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">No hay fotos en este bloque.</p>;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onPick(m.url)}
          className={`relative shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 ${value === m.url ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"}`}
          title={m.folder}
        >
          <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
          {m.starred && <Star className="absolute top-0.5 right-0.5 h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

const pickDefault = (items: Media[], last = false) =>
  items.find((m) => m.starred)?.url || (last ? items[items.length - 1]?.url : items[0]?.url) || null;

export function SocialPostComposer({
  projectId, initialType, open, onOpenChange,
}: { projectId: number | null; initialType?: SocialPostType; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const canEdit = canEditPortfolio(user?.role);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.portfolio.get.useQuery({ projectId: projectId || 0 }, { enabled: open && !!projectId });

  const [type, setType] = useState<SocialPostType>(initialType || "terminado");
  const [format, setFormat] = useState<Format>("cuadrado");
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [network, setNetwork] = useState<SocialNetwork>("instagram");
  const [captions, setCaptions] = useState<Record<SocialNetwork, string>>({ instagram: "", facebook: "", tiktok: "" });
  const [rendering, setRendering] = useState(false);
  // El lienzo se monta dentro del diálogo después de abrir: se guarda en estado para redibujar al aparecer
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const available = (data?.available || []) as SocialPostType[];

  // Al abrir: tipo pedido (si se puede armar) o el primero disponible
  useEffect(() => {
    if (!data) return;
    const t = initialType && available.includes(initialType) ? initialType : available[0] || "terminado";
    setType(t);
  }, [data?.id, initialType]); // eslint-disable-line react-hooks/exhaustive-deps

  const slotA: Media[] = useMemo(() => {
    if (!data) return [];
    if (type === "antes_despues") return data.media.antes;
    if (type === "render_vs_real") return data.media.diseno;
    return [];
  }, [data, type]);
  const slotB: Media[] = data?.media.despues || [];

  // Fotos por defecto (con estrella primero) y textos sugeridos al cambiar de tipo
  useEffect(() => {
    if (!data) return;
    setA(pickDefault(slotA));
    setB(pickDefault(slotB, true));
    const input = { type, workType: data.workType, city: data.city, woodColor: data.woodColor, countertop: data.countertop, weeks: data.weeks };
    setCaptions({
      instagram: buildCaption(input, "instagram"),
      facebook: buildCaption(input, "facebook"),
      tiktok: buildCaption(input, "tiktok"),
    });
  }, [data?.id, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = data ? `${workTypeLabel(data.workType)}${data.city ? ` · ${data.city}` : ""}` : "";
  const twoPhotos = !!LABELS[type];

  useEffect(() => {
    if (!open || !data || !canvas) return;
    let cancelled = false;
    setRendering(true);
    renderPost(canvas, { type, format, a: twoPhotos ? a : null, b, title })
      .catch(() => { if (!cancelled) toast.error("No se pudo cargar una de las fotos"); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [open, data, canvas, type, format, a, b, title, twoPhotos]);

  const markMut = trpc.social.markPublished.useMutation({
    onSuccess: () => { utils.portfolio.get.invalidate(); utils.social.overview.invalidate(); utils.portfolio.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const unmarkMut = trpc.social.unmarkPublished.useMutation({
    onSuccess: () => { utils.portfolio.get.invalidate(); utils.social.overview.invalidate(); utils.portfolio.list.invalidate(); },
  });

  const publishedHere = (data?.publications || []).filter((p) => p.postType === type);

  const exportImage = async (share: boolean) => {
    const c = canvas;
    if (!c || !data) return;
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return toast.error("No se pudo crear la imagen");
    const name = `innovar-${slug(data.name)}-${type}-${format}.jpg`;
    const how = await saveOrShare(blob, name, share);
    if (how === "downloaded") toast.success("Imagen descargada");
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captions[network]);
      toast.success(`Texto de ${SOCIAL_NETWORKS[network].label} copiado`);
    } catch {
      toast.error("No se pudo copiar; selecciona el texto y cópialo a mano");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Crear publicación</DialogTitle>
          <DialogDescription>{data ? `${data.name}${data.city ? ` · ${data.city}` : ""}` : "Cargando…"}</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Vista previa */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SOCIAL_POST_TYPES) as SocialPostType[]).map((t) => {
                  const ok = available.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!ok}
                      onClick={() => setType(t)}
                      title={ok ? SOCIAL_POST_TYPES[t].description : `Falta: ${SOCIAL_POST_TYPES[t].needs}`}
                      className={`px-2.5 py-1 rounded-full text-xs border transition ${type === t ? "bg-primary text-primary-foreground border-primary" : ok ? "border-border hover:border-primary/60" : "border-border opacity-35 cursor-not-allowed"}`}
                    >
                      {SOCIAL_POST_TYPES[t].emoji} {SOCIAL_POST_TYPES[t].label}
                    </button>
                  );
                })}
              </div>

              {type === "video" ? (
                <div className="space-y-2">
                  {data.videos.map((v) => (
                    <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-black">
                      <video src={v.url} controls preload="metadata" playsInline className="w-full max-h-[360px]" />
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card">
                        <span className="text-xs text-muted-foreground truncate">{v.fileName || "Video"} · {formatDate(v.createdAt)}</span>
                        <a href={downloadMediaUrl(v.url, v.fileName || `innovar-${slug(data.name)}.mp4`)} download>
                          <Button size="sm" variant="outline" className="h-7 gap-1"><Download className="h-3.5 w-3.5" />Descargar</Button>
                        </a>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Descarga el video y súbelo como Reel / TikTok. Abajo puedes armar una portada con la mejor foto final.</p>
                </div>
              ) : null}

              <div className="flex gap-1.5">
                {(Object.keys(FORMATS) as Format[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-left ${format === f ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <div className="text-xs font-semibold">{FORMATS[f].label}</div>
                    <div className="text-[10px] text-muted-foreground">{FORMATS[f].hint}</div>
                  </button>
                ))}
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border bg-black/40 flex justify-center">
                <canvas ref={setCanvas} className={`w-full h-auto ${format === "vertical" ? "max-w-[300px]" : ""}`} />
                {rendering && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5" onClick={() => exportImage(false)} disabled={rendering}><Download className="h-4 w-4" />Descargar imagen</Button>
                {typeof navigator !== "undefined" && (navigator as any).canShare && (
                  <Button variant="outline" className="gap-1.5" onClick={() => exportImage(true)} disabled={rendering}><Share2 className="h-4 w-4" />Compartir</Button>
                )}
              </div>
            </div>

            {/* Fotos y texto */}
            <div className="space-y-4">
              {twoPhotos && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">{type === "antes_despues" ? "Foto del antes" : "Render"}</p>
                  <Thumbs items={slotA} value={a} onPick={setA} />
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">{twoPhotos ? "Foto final" : type === "video" ? "Foto de portada" : "Foto"}</p>
                <Thumbs items={slotB} value={b} onPick={setB} />
              </div>

              <div className="space-y-2">
                <div className="flex gap-1">
                  {SOCIAL_NETWORK_KEYS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNetwork(n)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border ${network === n ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {SOCIAL_NETWORKS[n].label}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={captions[network]}
                  onChange={(e) => setCaptions((c) => ({ ...c, [network]: e.target.value }))}
                  className="min-h-[220px] text-sm"
                />
                <Button variant="outline" className="w-full gap-1.5" onClick={copyCaption}><Copy className="h-4 w-4" />Copiar texto para {SOCIAL_NETWORKS[network].label}</Button>
              </div>

              {canEdit && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold">¿Ya lo publicaste? Márcalo para llevar la cuenta</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SOCIAL_NETWORK_KEYS.map((n) => {
                      const done = publishedHere.find((p) => p.network === n);
                      return (
                        <Button
                          key={n}
                          size="sm"
                          variant={done ? "default" : "outline"}
                          className="gap-1 text-xs"
                          disabled={markMut.isPending || unmarkMut.isPending}
                          onClick={() => done
                            ? unmarkMut.mutate({ id: done.id })
                            : markMut.mutate({ projectId: data.id, postType: type, network: n }, { onSuccess: () => toast.success(`Marcado: publicado en ${SOCIAL_NETWORKS[n].label}`) })}
                          title={done ? `Publicado el ${formatDate(done.publishedAt)} (toca para quitar)` : "Marcar como publicado"}
                        >
                          {done && <Check className="h-3.5 w-3.5" />}{SOCIAL_NETWORKS[n].label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
