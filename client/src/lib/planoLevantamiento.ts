import { FORMAS_COCINA, anchoMuroCm, nombresParedes, totalesParedes, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

// Hoja del levantamiento de la cocina: foto del dibujo 3D + tabla de medidas. Se pone sola y BLOQUEADA en la pizarra,
// y es lo que ven el comercial, el administrador y el diseñador al trabajar la cotización.

export interface DatosPlano {
  cliente?: string;
  forma?: string;
  paredes?: ParedCocina[];
  aberturas?: AberturaCocina[];
  altoGeneralCm?: number;
  profundoCm?: number;
  isla?: { ancho: number; profundo: number; alto: number } | null;
  barra?: { ancho: number; profundo: number; alto: number } | null;
}

const cargar = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

/** Devuelve la hoja lista para la pizarra (JPEG en data URL) con su tamaño. */
export async function componerPlanoLevantamiento(foto3d: string, d: DatosPlano): Promise<{ src: string; w: number; h: number }> {
  const im = await cargar(foto3d);
  const W = 1600, margen = 40;
  const hFoto = Math.min(760, Math.round((W - margen * 2) * im.naturalHeight / im.naturalWidth));
  const nombres = nombresParedes(d.forma);
  const paredes = d.paredes || [];
  const ab = d.aberturas || [];
  const filas: string[] = [];
  paredes.forEach((p, i) => {
    const alto = Number(p.alto) || d.altoGeneralCm || 0;
    filas.push(`Pared ${nombres[i] || i + 1}:  ancho ${anchoMuroCm(p) || "—"} cm  ·  alto ${alto || "—"} cm   |   muebles inferiores ${p.inf ?? 0} cm  ·  superiores ${p.sup ?? 0} cm`);
  });
  const t = totalesParedes(paredes);
  filas.push(`Total de muebles:  inferiores ${t.infM.toFixed(2)} m   ·   superiores ${t.supM.toFixed(2)} m`);
  if (d.isla) filas.push(`Isla:  ancho ${d.isla.ancho} cm  ·  profundidad ${d.isla.profundo} cm  ·  altura ${d.isla.alto} cm`);
  if (d.barra) filas.push(`Barra:  ancho ${d.barra.ancho} cm  ·  profundidad ${d.barra.profundo} cm  ·  altura ${d.barra.alto} cm`);
  ab.forEach((a) => {
    filas.push(`${a.tipo === "ventana" ? "Ventana" : "Puerta"} en pared ${nombres[a.pared] || a.pared + 1}:  a ${Math.round(a.desde)} cm del inicio  ·  ${a.ancho} × ${a.alto} cm${a.tipo === "ventana" ? `  ·  desde ${a.antepecho} cm del piso` : ""}`);
  });
  if (d.profundoCm) filas.push(`Profundo de los muebles: ${d.profundoCm} cm`);

  const lh = 40, tituloH = 110, H = tituloH + hFoto + 30 + filas.length * lh + 50;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#00838f"; g.fillRect(0, 0, W, 8);
  g.fillStyle = "#111827"; g.font = "bold 40px sans-serif"; g.textBaseline = "top";
  const formaTxt = FORMAS_COCINA.find((f) => f.key === d.forma)?.label || d.forma || "";
  g.fillText(`Levantamiento de cocina — ${formaTxt}`, margen, 28);
  g.font = "26px sans-serif"; g.fillStyle = "#4b5563";
  g.fillText(`${d.cliente || ""}   ·   Hoja automática del levantamiento (bloqueada)`, margen, 78);
  g.fillStyle = "#0f1a1d"; g.fillRect(margen, tituloH, W - margen * 2, hFoto);
  const escala = Math.min((W - margen * 2) / im.naturalWidth, hFoto / im.naturalHeight);
  const iw = im.naturalWidth * escala, ih = im.naturalHeight * escala;
  g.drawImage(im, margen + (W - margen * 2 - iw) / 2, tituloH + (hFoto - ih) / 2, iw, ih);
  g.font = "28px sans-serif";
  filas.forEach((f, i) => {
    const y = tituloH + hFoto + 30 + i * lh;
    if (i % 2 === 0) { g.fillStyle = "#f3f4f6"; g.fillRect(margen, y - 4, W - margen * 2, lh); }
    g.fillStyle = "#111827"; g.fillText(f, margen + 12, y);
  });
  return { src: c.toDataURL("image/jpeg", 0.85), w: W, h: H };
}
