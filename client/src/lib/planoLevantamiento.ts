import { FORMAS_COCINA, supNetoPorParedCm, descuentosEsquinas, FONDO_INFERIOR_CM, FONDO_SUPERIOR_CM, anchoMuroCm, nombresParedes, totalesParedes, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

// Hoja del levantamiento de la cocina: foto del dibujo 3D + tabla de medidas. Se pone sola y BLOQUEADA en la pizarra,
// y es lo que ven el comercial, el administrador y el diseñador al trabajar la cotización.

export interface DatosPlano {
  cliente?: string;
  forma?: string;
  paredes?: ParedCocina[];
  aberturas?: AberturaCocina[];
  altoGeneralCm?: number;
  profundoCm?: number;
  profundoSupCm?: number;
  esquinas?: number[];
  isla?: { ancho: number; profundo: number; alto: number } | null;
  barra?: { ancho: number; profundo: number; alto: number } | null;
}

const fm = (cm: number) => (Math.round(Number(cm) || 0) / 100).toFixed(2).replace(".", ",");   // 360 → "3,60"
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
  const supNetoPared = supNetoPorParedCm(d.forma, paredes, ab);
  const dsc = descuentosEsquinas(d.forma, paredes, d.profundoCm || FONDO_INFERIOR_CM, d.profundoSupCm || FONDO_SUPERIOR_CM, d.esquinas);
  paredes.forEach((p, i) => {
    const q = dsc[i] || { infIni: 0, infFin: 0, supIni: 0, supFin: 0 };
    const di = q.infIni + q.infFin;
    const nota = di > 0 ? `   (mesón − ${fm(di)} m por esquina; la madera va plena)` : "";
    const alto = Number(p.alto) || d.altoGeneralCm || 240;
    filas.push(`Pared ${nombres[i] || i + 1}:  ancho ${fm(anchoMuroCm(p))} m  ·  alto ${fm(alto)} m   |   muebles inferiores ${fm(p.inf ?? 0)} m  ·  superiores ${fm(supNetoPared[i] ?? 0)} m${nota}`);
  });
  const t = totalesParedes(paredes);
  const supN = supNetoPorParedCm(d.forma, paredes, ab).reduce((a, x) => a + x, 0), vs = Math.max(0, t.supM * 100 - supN);
  filas.push(`Total de muebles:  inferiores ${t.infM.toFixed(2)} m   ·   superiores ${(supN / 100).toFixed(2)} m${vs > 0 ? `  (${t.supM.toFixed(2)} − ${(vs / 100).toFixed(2)} de ventanas: donde va ventana no va mueble)` : ""}`);
  if (d.isla) filas.push(`Isla:  ancho ${fm(d.isla.ancho)} m  ·  profundidad ${fm(d.isla.profundo)} m  ·  altura ${fm(d.isla.alto)} m`);
  if (d.barra) filas.push(`Barra:  ancho ${fm(d.barra.ancho)} m  ·  profundidad ${fm(d.barra.profundo)} m  ·  altura ${fm(d.barra.alto)} m`);
  ab.forEach((a) => {
    filas.push(`${a.tipo === "ventana" ? "Ventana" : "Puerta"} en pared ${nombres[a.pared] || a.pared + 1}:  a ${fm(a.desde)} m del inicio  ·  ${fm(a.ancho)} × ${fm(a.alto)} m${a.tipo === "ventana" ? `  ·  desde ${fm(a.antepecho)} m del piso` : ""}`);
  });
  if (d.profundoCm) filas.push(`Profundo de los muebles: ${fm(d.profundoCm)} m`);

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
