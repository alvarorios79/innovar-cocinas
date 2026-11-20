// Dibuja el esquema del plano de módulos en el PDF de la cotización (última página).
// Usa solo primitivas de PDFKit: rectángulos, líneas y texto. Si no hay esquemas, no hace nada.
import fs from "fs";
import path from "path";
import type { SchemeData, SchemeBlock } from "@shared/kitchenPlanScheme";

interface Geo { PW: number; PH: number; ML: number; CW: number }
const TEAL = "#00BCD4", DARK = "#1E2A3A", DGRAY = "#3A3A3A", MGRAY = "#6B7280", BORDER = "#D1D9E0", WHITE = "#FFFFFF";
const FILL = { upper: "#EDE7F6", lower: "#E0F2F1", tall: "#FFF3E0", window: "#E1F5FE" };
const STROKE = { upper: "#7E57C2", lower: "#00897B", tall: "#EF6C00", window: "#0288D1" };

/** Muestra de color/piedra desde la carpeta pública (en Render está en dist/public; en local en client/public). Si no se encuentra, se omite la muestra. */
function leerMuestra(url?: string): Buffer | null {
  if (!url || !/^\/materiales\//.test(url)) return null;
  for (const base of ["dist/public", "client/public"]) {
    try { const f = path.resolve(process.cwd(), base + url); if (fs.existsSync(f)) return fs.readFileSync(f); } catch { /* sigue con la siguiente ruta */ }
  }
  return null;
}

function drawBlock(doc: any, b: SchemeBlock, x0: number, y: number, h: number, s: number) {
  const key = b.kind === "window" ? "window" : b.kind === "tall" ? "tall" : (b.lane === "upper" ? "upper" : "lower");
  const x = x0 + b.x * s, w = Math.max(b.w * s, 3);
  doc.save();
  if (b.faded) doc.opacity(0.55);
  doc.roundedRect(x + 0.6, y, w - 1.2, h, 2).fillAndStroke(FILL[key], STROKE[key]);
  doc.restore();
  doc.fillColor(DGRAY).font("Helvetica-Bold");
  if (w < 28) {
    doc.fontSize(6);
    doc.save();
    doc.translate(x + w / 2 + 2, y + h / 2 - 6);
    doc.rotate(-90);
    doc.text(b.label, -22, -3, { width: 44, align: "center", lineBreak: false });
    doc.restore();
  } else {
    doc.fontSize(w < 44 ? 6 : 7);
    doc.text(b.label, x + 1.5, y + h / 2 - 9, { width: w - 3, align: "center", lineBreak: true, height: 22 });
  }
  // cota
  doc.moveTo(x + 4, y + h - 11).lineTo(x + w - 4, y + h - 11).lineWidth(0.5).strokeColor(STROKE[key]).stroke();
  doc.moveTo(x + 4, y + h - 13.5).lineTo(x + 4, y + h - 8.5).stroke();
  doc.moveTo(x + w - 4, y + h - 13.5).lineTo(x + w - 4, y + h - 8.5).stroke();
  doc.fillColor(DARK).font("Helvetica").fontSize(6.5).text(b.w.toFixed(2), x, y + h - 8, { width: w, align: "center", lineBreak: false });
}

export function drawSchemePages(doc: any, schemes: SchemeData[], g: Geo, newPage: () => number): void {
  if (!schemes?.length) return;
  const { PW, PH, ML, CW } = g;
  let Y = newPage();
  const need = (h: number) => { if (Y + h > PH - 46) Y = newPage(); };

  const con3d = schemes.some(sc => sc.imagenes3d && sc.imagenes3d.length > 0);
  doc.rect(ML, Y, CW, 22).fill(DARK);
  doc.rect(ML, Y, 4, 22).fill(TEAL);
  doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold").text(con3d ? "DISTRIBUCIÓN DE LA COCINA" : "ESQUEMA DE LA COCINA", ML + 12, Y + 6, { width: CW - 20, lineBreak: false });
  Y += 30;
  doc.fontSize(7.5).fillColor(MGRAY).font("Helvetica")
    .text(con3d
      ? "Así se distribuyen los módulos de su cocina, para que usted entienda mejor el proyecto. Es una guía orientativa, no el diseño final: el diseño definitivo, el modelado 3D y los renders se presentan para su aprobación antes de fabricar. Medidas de cada módulo en metros."
      : "Distribución de los módulos que lleva su proyecto, vista de frente. Muebles superiores arriba e inferiores abajo; los módulos de piso a techo cruzan ambas líneas. Medidas de cada módulo en metros.", ML, Y, { width: CW });
  Y += con3d ? 34 : 22;

  schemes.forEach(sc => {
    if (sc.imagenes3d && sc.imagenes3d.length > 0) {
      // Distribución en 3D: una vista grande y las otras dos al lado, y la lista de módulos con su medida
      const [iso, ...otras] = sc.imagenes3d;
      doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold").text(`${sc.title}${sc.layout ? ` — cocina ${sc.layout}` : ""}`, ML, Y, { width: CW, lineBreak: false });
      Y += 14;
      const hGrande = Math.min(250, CW / 1.5);
      need(hGrande + 6);
      try { doc.image(iso, ML, Y, { fit: [CW, hGrande], align: "center" }); } catch (e) { console.error("[pdf] imagen 3D:", e); }
      doc.rect(ML, Y, CW, hGrande).lineWidth(0.4).strokeColor(BORDER).stroke();
      Y += hGrande + 6;
      if (otras.length) {
        const wC = (CW - 8) / Math.min(2, otras.length), hC = Math.min(wC / 1.5, 125);
        need(hC + 6);
        otras.slice(0, 2).forEach((im: any, k: number) => {
          const x = ML + k * (wC + 8);
          try { doc.image(im, x, Y, { fit: [wC, hC], align: "center" }); } catch (e) { console.error("[pdf] imagen 3D:", e); }
          doc.rect(x, Y, wC, hC).lineWidth(0.4).strokeColor(BORDER).stroke();
        });
        Y += hC + 8;
      }
      if (sc.modules.length) {
        const nCol = 3, filasMod = Math.ceil(sc.modules.length / nCol);
        need(14 + filasMod * 10);
        doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold").text("Módulos de la cocina", ML, Y, { width: CW, lineBreak: false });
        Y += 12;
        const porCol = Math.ceil(sc.modules.length / nCol);
        for (let k = 0; k < nCol; k++) {
          sc.modules.slice(k * porCol, (k + 1) * porCol).forEach((m: any, i: number) => {
            doc.fontSize(6.8).fillColor(DGRAY).font("Helvetica")
              .text(`• ${m.qty > 1 ? `${m.qty} × ` : ""}${m.label} (${m.widths.map((w: number) => w.toFixed(2)).join(" + ")} m)`, ML + k * (CW / nCol), Y + i * 10, { width: CW / nCol - 6, lineBreak: false });
          });
        }
        Y += filasMod * 10 + 6;
      }
      // Colores y piedra sugeridos, con su nombre y una muestra pequeña (orientativos)
      if (sc.colores && sc.colores.length) {
        const cols = 3, wCel = CW / cols, hCel = 26;
        const filas = Math.ceil(sc.colores.length / cols);
        need(14 + filas * hCel + 18);
        doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold").text("Colores y piedra sugeridos (orientativos)", ML, Y, { width: CW, lineBreak: false });
        Y += 13;
        sc.colores.forEach((c: any, i: number) => {
          const x = ML + (i % cols) * wCel, y = Y + Math.floor(i / cols) * hCel;
          const img = leerMuestra(c.url);
          if (img) { try { doc.image(img, x, y, { width: 30, height: 20 }); doc.rect(x, y, 30, 20).lineWidth(0.4).strokeColor(BORDER).stroke(); } catch { /* sin muestra */ } }
          else { doc.rect(x, y, 30, 20).lineWidth(0.4).strokeColor(BORDER).stroke(); }
          doc.fontSize(6.5).fillColor(MGRAY).font("Helvetica").text(c.etiqueta, x + 36, y + 1, { width: wCel - 42, lineBreak: false });
          doc.fontSize(7.5).fillColor(DGRAY).font("Helvetica-Bold").text(c.nombre, x + 36, y + 10, { width: wCel - 42, lineBreak: false });
        });
        Y += filas * hCel + 2;
        doc.fontSize(6.5).fillColor(MGRAY).font("Helvetica-Oblique").text("Los colores y la veta son una referencia: el color definitivo se elige al aprobar el diseño.", ML, Y, { width: CW });
        Y += 14;
      }
      return;
    }
    need(30);
    doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold").text(`${sc.title}${sc.layout ? ` — cocina ${sc.layout}` : ""}`, ML, Y, { width: CW, lineBreak: false });
    Y += 15;
    sc.walls.filter(w => w.blocks.length).forEach(w => {
      const s = Math.min(78, (CW - 6) / Math.max(w.extent, 1));
      const lane = 50, gap = 5;
      const lanes = w.isIsland ? 1 : 2;
      const H = lanes * lane + (lanes - 1) * gap;
      need(H + 44);
      doc.fontSize(8).fillColor(DGRAY).font("Helvetica-Bold")
        .text(`${w.name}${w.isIsland && w.name !== "Barra" ? " (isla)" : ""}`, ML, Y, { width: CW, lineBreak: false });   // sin el largo de la pared: solo los módulos llevan medida
      const top = Y + 12;
      const lowerY = top + (w.isIsland ? 0 : lane + gap);
      if (!w.isIsland) doc.rect(ML, top, w.extent * s, lane).lineWidth(0.4).strokeColor(BORDER).stroke();
      doc.rect(ML, lowerY, w.extent * s, lane).lineWidth(0.4).strokeColor(BORDER).stroke();
      w.blocks.filter(b => b.lane === "upper").forEach(b => drawBlock(doc, b, ML, top, lane, s));
      w.blocks.filter(b => b.lane === "lower").forEach(b => drawBlock(doc, b, ML, lowerY, lane, s));
      w.blocks.filter(b => b.lane === "tall").forEach(b => drawBlock(doc, b, ML, top, H, s));
      Y = top + H + 14;   // sin regla: la medida de la pared no va en el PDF
    });
    Y += 4;
  });

  need(20);
  doc.fontSize(7).fillColor(MGRAY).font("Helvetica-Oblique")
    .text("Esquema de referencia. El diseño definitivo, el modelado 3D y los renders se presentan para su aprobación antes de fabricar.", ML, Y, { width: CW });
}
