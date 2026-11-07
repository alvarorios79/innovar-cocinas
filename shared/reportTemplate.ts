/**
 * Plantilla única de informes imprimibles de Innovar (gastos y cierres contables).
 *
 * Un informe se describe una sola vez (ReportDoc) y se dibuja igual en:
 *  - PDF para imprimir desde el navegador  → renderReportHtml   (este archivo)
 *  - Word (.docx)                          → renderReportDocx   (este archivo)
 *  - PDF descargable del servidor (pdfkit) → server/report-pdf.ts
 *
 * Diseño: hoja carta vertical, fondo blanco (gasta poca tinta), letra de 11 pt,
 * logo arriba, tarjetas con los totales y tablas claras con subtotales.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, PageNumber, Paragraph,
  ShadingType, Table, TableBorders, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
} from "docx";

// ─── Modelo del informe ────────────────────────────────────────────────────
export type ReportAlign = "left" | "right" | "center";
export interface ReportColumn { label: string; width: number; align?: ReportAlign }
export interface ReportCell { text: string; note?: string; bold?: boolean; tone?: "pos" | "neg" | "muted" }
export type ReportCellInput = string | ReportCell;
export interface ReportTable {
  title?: string;
  columns: ReportColumn[];
  rows: ReportCellInput[][];
  /** Fila de totales, alineada con las columnas. Las celdas vacías tras la primera se unen a ella. */
  footer?: string[];
}
export interface ReportSection {
  title: string;
  intro?: string;
  tables: ReportTable[];
  emptyText?: string;
  total?: { label: string; value: string };
}
export interface ReportCard { label: string; value: string; hint?: string; highlight?: boolean; tone?: "pos" | "neg" }
export interface ReportDoc {
  title: string;
  subtitle?: string;
  meta: string[];
  cards: ReportCard[];
  /** Explicación de la cuenta en una línea (p. ej. Ingresos − Gastos = Utilidad). */
  formula?: string;
  sections: ReportSection[];
}

// ─── Colores y textos comunes ──────────────────────────────────────────────
export const RC = {
  teal: "0097A7",
  tealLight: "E3F4F6",
  text: "222222",
  muted: "6B7280",
  zebra: "F6F8F9",
  border: "D5DBE0",
  pos: "15803D",
  neg: "B91C1C",
  footerBg: "EEF2F4",
};
export const REPORT_FOOTER_TEXT = "Innovar Cocinas de Diseño · Km 9 vía Cerritos, Pereira · 313 680 2025";

// ─── Formatos ──────────────────────────────────────────────────────────────
export function fmtMoney(n: number | string | null | undefined): string {
  const v = Number(n ?? 0) || 0;
  return "$\u00A0" + Math.round(v).toLocaleString("es-CO");
}

/** Lee "2026-11-02" (o ISO) como fecha local: así no aparece el día anterior. */
export function parseLocalDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** 02/11/2026 */
export function fmtDay(d: string | Date | null | undefined): string {
  const x = parseLocalDate(d);
  if (!x) return "";
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
}
/** 2 nov 2026 */
export function fmtDayShort(d: string | Date | null | undefined): string {
  const x = parseLocalDate(d);
  return x ? `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` : "";
}
/** 7 de noviembre de 2026 */
export function fmtDayLong(d: string | Date | null | undefined): string {
  const x = parseLocalDate(d);
  return x ? `${x.getDate()} de ${MONTHS_LONG[x.getMonth()]} de ${x.getFullYear()}` : "";
}
/** "Octubre 2026" si es un mes completo; si no, "Del 1 oct 2026 al 15 oct 2026". */
export function fmtPeriod(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const a = parseLocalDate(start), b = parseLocalDate(end);
  if (!a || !b) return "";
  const lastDay = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  if (a.getDate() === 1 && b.getDate() === lastDay && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    const m = MONTHS_LONG[a.getMonth()];
    return `${m[0].toUpperCase()}${m.slice(1)} ${a.getFullYear()}`;
  }
  if (a.getTime() === b.getTime()) return fmtDayShort(a);
  return `Del ${fmtDayShort(a)} al ${fmtDayShort(b)}`;
}

export const cellOf = (c: ReportCellInput): ReportCell => (typeof c === "string" ? { text: c } : c);

/** Une la etiqueta de la fila de totales con las celdas vacías que le siguen. */
export function footerSpans(footer: string[]): { text: string; span: number; index: number }[] {
  const out: { text: string; span: number; index: number }[] = [];
  let i = 0;
  while (i < footer.length) {
    let span = 1;
    if (i === 0) while (i + span < footer.length && !footer[i + span]) span++;
    out.push({ text: footer[i] || "", span, index: i });
    i += span;
  }
  return out;
}

// ─── HTML (imprimir / guardar como PDF desde el navegador) ─────────────────
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderReportHtml(doc: ReportDoc, opts: { logoUrl?: string; documentTitle: string; autoPrint?: boolean }): string {
  const toneColor = (t?: string) => (t === "pos" ? `#${RC.pos}` : t === "neg" ? `#${RC.neg}` : t === "muted" ? `#${RC.muted}` : "");
  const cards = doc.cards.map(c => `
      <div class="card${c.highlight ? " hl" : ""}">
        <div class="card-label">${esc(c.label)}</div>
        <div class="card-value"${c.tone ? ` style="color:${toneColor(c.tone)}"` : ""}>${esc(c.value)}</div>
        ${c.hint ? `<div class="card-hint">${esc(c.hint)}</div>` : ""}
      </div>`).join("");

  const table = (t: ReportTable) => {
    const cols = t.columns.map(c => `<col style="width:${(c.width * 100).toFixed(1)}%">`).join("");
    const head = t.columns.map(c => `<th class="${c.align || "left"}">${esc(c.label)}</th>`).join("");
    const body = t.rows.map(r => `<tr>${r.map((raw, i) => {
      const c = cellOf(raw);
      const style = c.tone ? ` style="color:${toneColor(c.tone)}"` : "";
      return `<td class="${t.columns[i]?.align || "left"}${c.bold ? " b" : ""}"${style}>${esc(c.text)}${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}</td>`;
    }).join("")}</tr>`).join("");
    const foot = t.footer
      ? `<tfoot><tr>${footerSpans(t.footer).map(f => `<td colspan="${f.span}" class="${f.index === 0 ? "left" : t.columns[f.index]?.align || "left"}">${esc(f.text)}</td>`).join("")}</tr></tfoot>`
      : "";
    return `${t.title ? `<h3>${esc(t.title)}</h3>` : ""}<table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
  };

  const sections = doc.sections.map(s => `
    <section>
      <h2>${esc(s.title)}</h2>
      ${s.intro ? `<p class="intro">${esc(s.intro)}</p>` : ""}
      ${s.tables.length ? s.tables.map(table).join("") : `<p class="empty">${esc(s.emptyText || "Sin registros.")}</p>`}
      ${s.total ? `<div class="sec-total"><span>${esc(s.total.label)}</span><strong>${esc(s.total.value)}</strong></div>` : ""}
    </section>`).join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.documentTitle)}</title>
<style>
  @page { size: letter portrait; margin: 16mm 15mm 18mm;
    @bottom-left { content: "${esc(REPORT_FOOTER_TEXT)}"; font: 8.5pt Arial, sans-serif; color: #${RC.muted}; }
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8.5pt Arial, sans-serif; color: #${RC.muted}; } }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { background: #e9edf0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #${RC.text}; font-size: 11pt; line-height: 1.35;
         margin: 24px auto; padding: 16mm 15mm; width: 216mm; min-height: 279mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
  .top { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #${RC.teal}; }
  .top img { height: 84px; width: auto; }
  .top .titles { margin-left: auto; text-align: right; }
  .top h1 { font-size: 20pt; margin: 0; letter-spacing: .3px; }
  .top .sub { font-size: 13pt; color: #${RC.teal}; font-weight: bold; margin-top: 2px; }
  .top .meta { font-size: 10pt; color: #${RC.muted}; margin-top: 2px; }
  .cards { display: flex; gap: 10px; margin: 16px 0 6px; }
  .card { flex: 1; border: 1px solid #${RC.border}; border-radius: 8px; padding: 10px 12px; }
  .card.hl { background: #${RC.tealLight}; border-color: #${RC.teal}; }
  .card-label { font-size: 9pt; text-transform: uppercase; letter-spacing: .4px; color: #${RC.muted}; font-weight: bold; }
  .card-value { font-size: 16pt; font-weight: bold; margin-top: 4px; white-space: nowrap; }
  .card.hl .card-value { color: #${RC.teal}; }
  .card-hint { font-size: 9pt; color: #${RC.muted}; margin-top: 2px; }
  .formula { margin: 8px 0 0; padding: 8px 12px; background: #${RC.zebra}; border-radius: 6px; font-size: 10.5pt; }
  section { margin-top: 18px; }
  h2 { font-size: 14pt; margin: 0 0 6px; padding-left: 9px; border-left: 5px solid #${RC.teal}; }
  h3 { font-size: 12pt; color: #${RC.teal}; margin: 12px 0 4px; }
  .intro { color: #${RC.muted}; font-size: 10pt; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #${RC.tealLight}; color: #${RC.text}; font-weight: bold; padding: 6px 8px; border-bottom: 2px solid #${RC.teal}; }
  td { padding: 6px 8px; border-bottom: 1px solid #${RC.border}; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #${RC.zebra}; }
  tfoot td { background: #${RC.footerBg}; font-weight: bold; border-top: 2px solid #${RC.teal}; border-bottom: 0; }
  .left { text-align: left; } .right { text-align: right; white-space: nowrap; } .center { text-align: center; }
  .b { font-weight: bold; }
  .note { font-size: 9pt; color: #${RC.muted}; margin-top: 2px; white-space: normal; }
  .empty { color: #${RC.muted}; font-style: italic; }
  .sec-total { display: flex; justify-content: flex-end; gap: 14px; align-items: baseline; margin-top: 8px; font-size: 12pt; }
  .sec-total strong { font-size: 13pt; color: #${RC.teal}; }
  .foot { margin-top: 24px; font-size: 8.5pt; color: #${RC.muted}; border-top: 1px solid #${RC.border}; padding-top: 6px; }
  .toolbar { position: sticky; top: 0; text-align: center; padding: 10px; background: #e9edf0; }
  .toolbar button { background: #${RC.teal}; color: #fff; border: 0; border-radius: 8px; padding: 10px 22px; font-size: 12pt; cursor: pointer; }
  @media print {
    html { background: #fff; }
    body { margin: 0; padding: 0; width: auto; min-height: 0; box-shadow: none; }
    .toolbar, .foot { display: none; }
  }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
  <header class="top">
    ${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="Innovar">` : ""}
    <div class="titles">
      <h1>${esc(doc.title)}</h1>
      ${doc.subtitle ? `<div class="sub">${esc(doc.subtitle)}</div>` : ""}
      ${doc.meta.map(m => `<div class="meta">${esc(m)}</div>`).join("")}
    </div>
  </header>
  ${doc.cards.length ? `<div class="cards">${cards}</div>` : ""}
  ${doc.formula ? `<div class="formula">${esc(doc.formula)}</div>` : ""}
  ${sections}
  <div class="foot">${esc(REPORT_FOOTER_TEXT)}</div>
  ${opts.autoPrint ? `<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>` : ""}
</body></html>`;
}

// ─── Word (.docx) ──────────────────────────────────────────────────────────
// Carta vertical: 12240 × 15840 twips; márgenes 1000 → ancho útil 10240.
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1000;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FONT = "Arial";

const run = (text: string, o: { size?: number; bold?: boolean; color?: string; italics?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, color: o.color ?? RC.text, italics: o.italics });

const thin = (color = RC.border, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const docxAlign = (a?: ReportAlign) => (a === "right" ? AlignmentType.RIGHT : a === "center" ? AlignmentType.CENTER : AlignmentType.LEFT);
const toneHex = (t?: string) => (t === "pos" ? RC.pos : t === "neg" ? RC.neg : t === "muted" ? RC.muted : RC.text);
const spacer = (after = 120) => new Paragraph({ spacing: { before: 0, after }, children: [] });

function docxHeader(doc: ReportDoc, logo?: { data: Uint8Array | ArrayBuffer; width: number; height: number }): Table {
  const right: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(doc.title, { size: 40, bold: true })] }),
  ];
  if (doc.subtitle) right.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 40 }, children: [run(doc.subtitle, { size: 26, bold: true, color: RC.teal })] }));
  doc.meta.forEach(m => right.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 20 }, children: [run(m, { size: 20, color: RC.muted })] })));
  const leftW = 2200;
  return new Table({
    width: { size: 5000, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: TableBorders.NONE,
    columnWidths: [leftW, CONTENT_W - leftW],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: { ...noBorders, bottom: thin(RC.teal, 18) }, width: { size: leftW, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
          margins: { bottom: 120 },
          children: [new Paragraph({ children: logo ? [new ImageRun({ data: logo.data as any, transformation: { width: logo.width, height: logo.height } })] : [run("INNOVAR", { size: 32, bold: true, color: RC.teal })] })],
        }),
        new TableCell({
          borders: { ...noBorders, bottom: thin(RC.teal, 18) }, width: { size: CONTENT_W - leftW, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
          margins: { bottom: 120 }, children: right,
        }),
      ],
    })],
  });
}

function docxCards(cards: ReportCard[]): Table {
  const gap = 160;
  const w = Math.floor((CONTENT_W - gap * (cards.length - 1)) / cards.length);
  const cells: TableCell[] = [];
  const widths: number[] = [];
  cards.forEach((c, i) => {
    if (i > 0) { cells.push(new TableCell({ borders: noBorders, width: { size: gap, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] })); widths.push(gap); }
    const b = thin(c.highlight ? RC.teal : RC.border, c.highlight ? 8 : 4);
    const kids = [
      new Paragraph({ children: [run(c.label.toUpperCase(), { size: 17, bold: true, color: RC.muted })] }),
      new Paragraph({ spacing: { before: 60 }, children: [run(c.value, { size: 32, bold: true, color: c.tone ? toneHex(c.tone) : c.highlight ? RC.teal : RC.text })] }),
    ];
    if (c.hint) kids.push(new Paragraph({ spacing: { before: 20 }, children: [run(c.hint, { size: 17, color: RC.muted })] }));
    cells.push(new TableCell({
      borders: { top: b, bottom: b, left: b, right: b }, width: { size: w, type: WidthType.DXA },
      shading: c.highlight ? { fill: RC.tealLight, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: kids,
    }));
    widths.push(w);
  });
  return new Table({ width: { size: 5000, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: TableBorders.NONE, columnWidths: widths, rows: [new TableRow({ children: cells })] });
}

function docxTable(t: ReportTable): (Paragraph | Table)[] {
  const widths = t.columns.map(c => Math.round(c.width * CONTENT_W));
  const cellMargins = { top: 70, bottom: 70, left: 110, right: 110 };
  const header = new TableRow({
    tableHeader: true,
    children: t.columns.map((c, i) => new TableCell({
      borders: { top: none, left: none, right: none, bottom: thin(RC.teal, 12) },
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: RC.tealLight, type: ShadingType.CLEAR, color: "auto" }, margins: cellMargins,
      children: [new Paragraph({ alignment: docxAlign(c.align), children: [run(c.label, { size: 21, bold: true })] })],
    })),
  });
  const rows = t.rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((raw, i) => {
      const c = cellOf(raw);
      const kids = [new Paragraph({ alignment: docxAlign(t.columns[i]?.align), children: [run(c.text, { size: 21, bold: c.bold, color: toneHex(c.tone) })] })];
      if (c.note) kids.push(new Paragraph({ alignment: docxAlign(t.columns[i]?.align), spacing: { before: 20 }, children: [run(c.note, { size: 17, color: RC.muted })] }));
      return new TableCell({
        borders: { top: none, left: none, right: none, bottom: thin() },
        width: { size: widths[i], type: WidthType.DXA },
        shading: ri % 2 === 1 ? { fill: RC.zebra, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: cellMargins, verticalAlign: VerticalAlign.TOP, children: kids,
      });
    }),
  }));
  const all = [header, ...rows];
  if (t.footer) {
    all.push(new TableRow({
      cantSplit: true,
      children: footerSpans(t.footer).map(f => new TableCell({
        columnSpan: f.span,
        borders: { top: thin(RC.teal, 12), left: none, right: none, bottom: none },
        width: { size: widths.slice(f.index, f.index + f.span).reduce((a, b) => a + b, 0), type: WidthType.DXA },
        shading: { fill: RC.footerBg, type: ShadingType.CLEAR, color: "auto" }, margins: cellMargins,
        children: [new Paragraph({ alignment: f.index === 0 ? AlignmentType.LEFT : docxAlign(t.columns[f.index]?.align), children: [run(f.text, { size: 21, bold: true })] })],
      })),
    }));
  }
  const out: (Paragraph | Table)[] = [];
  if (t.title) out.push(new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [run(t.title, { size: 24, bold: true, color: RC.teal })] }));
  out.push(new Table({ width: { size: 5000, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: TableBorders.NONE, columnWidths: widths, rows: all }));
  return out;
}

export function renderReportDocx(doc: ReportDoc, logo?: { data: Uint8Array | ArrayBuffer; width: number; height: number }): Document {
  const children: (Paragraph | Table)[] = [docxHeader(doc, logo), spacer(200)];
  if (doc.cards.length) { children.push(docxCards(doc.cards)); children.push(spacer(120)); }
  if (doc.formula) {
    children.push(new Paragraph({
      shading: { fill: RC.zebra, type: ShadingType.CLEAR, color: "auto" },
      spacing: { before: 0, after: 120 }, indent: { left: 0 },
      children: [run(doc.formula, { size: 21 })],
    }));
  }
  doc.sections.forEach(s => {
    children.push(new Paragraph({
      spacing: { before: 320, after: 100 }, keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RC.teal, space: 2 } },
      children: [run(s.title, { size: 28, bold: true })],
    }));
    if (s.intro) children.push(new Paragraph({ spacing: { after: 100 }, keepNext: true, children: [run(s.intro, { size: 20, color: RC.muted })] }));
    if (!s.tables.length) children.push(new Paragraph({ children: [run(s.emptyText || "Sin registros.", { size: 21, color: RC.muted, italics: true })] }));
    s.tables.forEach(t => children.push(...docxTable(t)));
    if (s.total) {
      children.push(new Paragraph({
        alignment: AlignmentType.RIGHT, spacing: { before: 140 },
        children: [run(`${s.total.label}   `, { size: 24, bold: true }), run(s.total.value, { size: 26, bold: true, color: RC.teal })],
      }));
    }
  });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, footer: 500 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
            children: [
              run(REPORT_FOOTER_TEXT, { size: 16, color: RC.muted }),
              new TextRun({ children: ["\tPágina ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: RC.muted }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}
