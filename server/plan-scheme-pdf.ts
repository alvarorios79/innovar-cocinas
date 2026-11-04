// Dibuja el esquema del plano de módulos en el PDF de la cotización (última página).
// Usa solo primitivas de PDFKit: rectángulos, líneas y texto. Si no hay esquemas, no hace nada.
import type { SchemeData, SchemeBlock } from "@shared/kitchenPlanScheme";

interface Geo { PW: number; PH: number; ML: number; CW: number }
const TEAL = "#00BCD4", DARK = "#1E2A3A", DGRAY = "#3A3A3A", MGRAY = "#6B7280", BORDER = "#D1D9E0", WHITE = "#FFFFFF";
const FILL = { upper: "#EDE7F6", lower: "#E0F2F1", tall: "#FFF3E0", window: "#E1F5FE" };
const STROKE = { upper: "#7E57C2", lower: "#00897B", tall: "#EF6C00", window: "#0288D1" };

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

  doc.rect(ML, Y, CW, 22).fill(DARK);
  doc.rect(ML, Y, 4, 22).fill(TEAL);
  doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold").text("ESQUEMA DE LA COCINA", ML + 12, Y + 6, { width: CW - 20, lineBreak: false });
  Y += 30;
  doc.fontSize(7.5).fillColor(MGRAY).font("Helvetica")
    .text("Distribución de los módulos que lleva su proyecto, vista de frente. Muebles superiores arriba e inferiores abajo; los módulos de piso a techo cruzan ambas líneas. Medidas en metros.", ML, Y, { width: CW });
  Y += 22;

  schemes.forEach(sc => {
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
        .text(`${w.name}${w.length > 0 ? ` · ${w.length.toFixed(2)} m` : ""}${w.isIsland ? " (isla)" : ""}`, ML, Y, { width: CW, lineBreak: false });
      const top = Y + 12;
      const lowerY = top + (w.isIsland ? 0 : lane + gap);
      if (!w.isIsland) doc.rect(ML, top, w.extent * s, lane).lineWidth(0.4).strokeColor(BORDER).stroke();
      doc.rect(ML, lowerY, w.extent * s, lane).lineWidth(0.4).strokeColor(BORDER).stroke();
      w.blocks.filter(b => b.lane === "upper").forEach(b => drawBlock(doc, b, ML, top, lane, s));
      w.blocks.filter(b => b.lane === "lower").forEach(b => drawBlock(doc, b, ML, lowerY, lane, s));
      w.blocks.filter(b => b.lane === "tall").forEach(b => drawBlock(doc, b, ML, top, H, s));
      // regla
      const ry = top + H + 4;
      doc.moveTo(ML, ry).lineTo(ML + w.extent * s, ry).lineWidth(0.4).strokeColor(MGRAY).stroke();
      for (let m = 0; m <= w.extent + 0.001; m += 0.5) {
        const tx = ML + m * s;
        doc.moveTo(tx, ry).lineTo(tx, ry + (m % 1 === 0 ? 4 : 2.5)).stroke();
        if (m % 1 === 0) doc.fontSize(6).fillColor(MGRAY).font("Helvetica").text(`${m} m`, tx - 10, ry + 5, { width: 20, align: "center", lineBreak: false });
      }
      Y = ry + 20;
    });
    Y += 4;
  });

  need(20);
  doc.fontSize(7).fillColor(MGRAY).font("Helvetica-Oblique")
    .text("Esquema de referencia. El diseño definitivo, el modelado 3D y los renders se presentan para su aprobación antes de fabricar.", ML, Y, { width: CW });
}
