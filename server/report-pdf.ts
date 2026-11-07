/**
 * Dibuja un informe (shared/reportTemplate.ts → ReportDoc) como PDF con pdfkit.
 * Mismo diseño que el PDF del navegador y el Word: hoja carta vertical, logo,
 * tarjetas de totales, tablas con subtotales y pie con "Página X de Y".
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { RC, REPORT_FOOTER_TEXT, cellOf, footerSpans, type ReportDoc, type ReportTable } from "@shared/reportTemplate";

const PAGE = { w: 612, h: 792 };
const M = { left: 43, right: 43, top: 43, bottom: 60 };
const W = PAGE.w - M.left - M.right;
const BOTTOM = PAGE.h - M.bottom;
const c = (hex: string) => `#${hex}`;
const tone = (t?: string) => c(t === "pos" ? RC.pos : t === "neg" ? RC.neg : t === "muted" ? RC.muted : RC.text);

/** Logo claro (fondo blanco). En Render está en dist/public; en local en client/public. */
export function loadReportLogo(): Buffer | undefined {
  const candidates = [
    path.resolve(process.cwd(), "dist/public/logo-light.png"),
    path.resolve(process.cwd(), "client/public/logo-light.png"),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p); } catch { /* siguiente */ }
  }
  return undefined;
}

export function renderReportPdf(report: ReportDoc, logo?: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margins: M, bufferPages: true, info: { Title: report.title, Author: "Innovar Cocinas de Diseño" } });
    const chunks: Buffer[] = [];
    doc.on("data", (b: Buffer) => chunks.push(b));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = M.top;
    const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M.top; return true; } return false; };
    const textH = (t: string, size: number, width: number, bold = false) =>
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).heightOfString(t || " ", { width });

    // ── Cabecera ──
    const logoH = 62, logoW = logo ? Math.round(logoH * 241 / 303) : 0;
    if (logo) { try { doc.image(logo, M.left, y, { height: logoH }); } catch { /* sin logo */ } }
    const tx = M.left + logoW + 16, tw = W - logoW - 16;
    let ty = y + 2;
    doc.fillColor(c(RC.text)).font("Helvetica-Bold").fontSize(20).text(report.title, tx, ty, { width: tw, align: "right" });
    ty += textH(report.title, 20, tw, true) + 1;
    if (report.subtitle) {
      doc.fillColor(c(RC.teal)).font("Helvetica-Bold").fontSize(13).text(report.subtitle, tx, ty, { width: tw, align: "right" });
      ty += textH(report.subtitle, 13, tw, true) + 1;
    }
    for (const m of report.meta) {
      doc.fillColor(c(RC.muted)).font("Helvetica").fontSize(10).text(m, tx, ty, { width: tw, align: "right" });
      ty += textH(m, 10, tw) + 1;
    }
    y = Math.max(y + logoH, ty) + 8;
    doc.rect(M.left, y, W, 2.5).fill(c(RC.teal));
    y += 16;

    // ── Tarjetas de totales ──
    if (report.cards.length) {
      const gap = 10, n = report.cards.length, cw = (W - gap * (n - 1)) / n, ch = 64;
      report.cards.forEach((card, i) => {
        const x = M.left + i * (cw + gap);
        doc.roundedRect(x, y, cw, ch, 6).lineWidth(card.highlight ? 1.5 : 0.8)
          .fillAndStroke(card.highlight ? c(RC.tealLight) : "#FFFFFF", card.highlight ? c(RC.teal) : c(RC.border));
        doc.fillColor(c(RC.muted)).font("Helvetica-Bold").fontSize(8.5).text(card.label.toUpperCase(), x + 10, y + 9, { width: cw - 20, lineBreak: false });
        doc.fillColor(card.tone ? tone(card.tone) : card.highlight ? c(RC.teal) : c(RC.text)).font("Helvetica-Bold").fontSize(16)
          .text(card.value, x + 10, y + 24, { width: cw - 20, lineBreak: false });
        if (card.hint) doc.fillColor(c(RC.muted)).font("Helvetica").fontSize(8.5).text(card.hint, x + 10, y + 46, { width: cw - 20, lineBreak: false });
      });
      y += ch + 10;
    }

    // ── Explicación de la cuenta ──
    if (report.formula) {
      const fh = textH(report.formula, 10.5, W - 20) + 12;
      doc.roundedRect(M.left, y, W, fh, 5).fill(c(RC.zebra));
      doc.fillColor(c(RC.text)).font("Helvetica").fontSize(10.5).text(report.formula, M.left + 10, y + 6, { width: W - 20 });
      y += fh + 6;
    }

    // ── Tablas ──
    const PAD = 6, SIZE = 10.5, NOTE = 8.5;
    const drawTable = (t: ReportTable) => {
      const widths = t.columns.map(col => col.width * W);
      const xs = widths.map((_, i) => M.left + widths.slice(0, i).reduce((a, b) => a + b, 0));
      const headH = 22;
      const drawHead = () => {
        doc.rect(M.left, y, W, headH).fill(c(RC.tealLight));
        doc.rect(M.left, y + headH - 1.5, W, 1.5).fill(c(RC.teal));
        t.columns.forEach((col, i) => {
          doc.fillColor(c(RC.text)).font("Helvetica-Bold").fontSize(SIZE)
            .text(col.label, xs[i] + PAD, y + 6, { width: widths[i] - 2 * PAD, align: col.align || "left", lineBreak: false });
        });
        y += headH;
      };
      if (t.title) {
        ensure(18 + headH + 24);
        doc.fillColor(c(RC.teal)).font("Helvetica-Bold").fontSize(12).text(t.title, M.left, y + 4, { width: W });
        y += textH(t.title, 12, W, true) + 8;
      } else ensure(headH + 24);
      if (t.hideHeader) {
        doc.rect(M.left, y, W, 1.5).fill(c(RC.teal));
        y += 1.5;
      } else drawHead();

      t.rows.forEach((raw, ri) => {
        const cells = raw.map(cellOf);
        const h = Math.max(...cells.map((cell, i) => {
          const w = widths[i] - 2 * PAD;
          return textH(cell.text, SIZE, w, cell.bold) + (cell.note ? textH(cell.note, NOTE, w) + 2 : 0);
        })) + 2 * PAD;
        if (ensure(h) && !t.hideHeader) drawHead();
        if (ri % 2 === 1) doc.rect(M.left, y, W, h).fill(c(RC.zebra));
        cells.forEach((cell, i) => {
          const w = widths[i] - 2 * PAD, align = t.columns[i]?.align || "left";
          doc.fillColor(tone(cell.tone)).font(cell.bold ? "Helvetica-Bold" : "Helvetica").fontSize(SIZE)
            .text(cell.text, xs[i] + PAD, y + PAD, { width: w, align });
          if (cell.note) {
            const nh = textH(cell.text, SIZE, w, cell.bold);
            doc.fillColor(c(RC.muted)).font("Helvetica").fontSize(NOTE).text(cell.note, xs[i] + PAD, y + PAD + nh + 2, { width: w, align });
          }
        });
        y += h;
        doc.moveTo(M.left, y).lineTo(M.left + W, y).lineWidth(0.5).strokeColor(c(RC.border)).stroke();
      });

      if (t.footer) {
        const fh = 24;
        if (ensure(fh) && !t.hideHeader) drawHead();
        doc.rect(M.left, y, W, fh).fill(c(RC.footerBg));
        doc.rect(M.left, y, W, 1.5).fill(c(RC.teal));
        footerSpans(t.footer).forEach(f => {
          const x = xs[f.index], w = widths.slice(f.index, f.index + f.span).reduce((a, b) => a + b, 0);
          doc.fillColor(c(RC.text)).font("Helvetica-Bold").fontSize(SIZE)
            .text(f.text, x + PAD, y + 7, { width: w - 2 * PAD, align: f.index === 0 ? "left" : t.columns[f.index]?.align || "left", lineBreak: false });
        });
        y += fh;
      }
      y += 8;
    };

    // ── Secciones ──
    for (const s of report.sections) {
      ensure(70);
      y += 8;
      doc.rect(M.left, y, 4, 18).fill(c(RC.teal));
      doc.fillColor(c(RC.text)).font("Helvetica-Bold").fontSize(14).text(s.title, M.left + 11, y + 2, { width: W - 11 });
      y += 24;
      if (s.intro) {
        doc.fillColor(c(RC.muted)).font("Helvetica").fontSize(9.5).text(s.intro, M.left, y, { width: W });
        y += textH(s.intro, 9.5, W) + 6;
      }
      if (!s.tables.length) {
        doc.fillColor(c(RC.muted)).font("Helvetica-Oblique").fontSize(10.5).text(s.emptyText || "Sin registros.", M.left, y, { width: W });
        y += 20;
      }
      s.tables.forEach(drawTable);
      if (s.total) {
        ensure(24);
        const valueW = 150;
        doc.fillColor(c(RC.teal)).font("Helvetica-Bold").fontSize(13).text(s.total.value, M.left + W - valueW, y + 2, { width: valueW, align: "right", lineBreak: false });
        doc.fillColor(c(RC.text)).font("Helvetica-Bold").fontSize(12).text(s.total.label, M.left, y + 3, { width: W - valueW - 10, align: "right", lineBreak: false });
        y += 24;
      }
    }

    // ── Pie de página en todas las hojas ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // escribir en el margen sin crear hojas nuevas
      const fy = PAGE.h - 36;
      doc.moveTo(M.left, fy - 6).lineTo(M.left + W, fy - 6).lineWidth(0.5).strokeColor(c(RC.border)).stroke();
      doc.fillColor(c(RC.muted)).font("Helvetica").fontSize(8.5)
        .text(REPORT_FOOTER_TEXT, M.left, fy, { width: W - 90, lineBreak: false })
        .text(`Página ${i - range.start + 1} de ${range.count}`, M.left + W - 90, fy, { width: 90, align: "right", lineBreak: false });
    }

    doc.end();
  });
}
