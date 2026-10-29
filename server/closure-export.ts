import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel } from "docx";
import { getClosureDetails, getClosureProjects } from "../db";

const TEAL = "#00BCD4";
const DARK = "#1A1A2E";
const GRAY = "#9CA3AF";
const WHITE = "#FFFFFF";

function fmt(n: number | string | undefined | null): string {
  const v = parseFloat((n ?? "0").toString());
  return "$" + v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateClosurePDFBuffer(closureId: number): Promise<Buffer> {
  const closure = await getClosureDetails(closureId);
  if (!closure) throw new Error("Cierre no encontrado");
  const projects = await getClosureProjects(closureId);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Background header
    doc.rect(0, 0, doc.page.width, 100).fill(DARK);

    // Title
    doc.fillColor(TEAL).fontSize(20).font("Helvetica-Bold")
       .text("INNOVAR COCINAS DE DISEÑO", 40, 18);
    doc.fillColor(WHITE).fontSize(11).font("Helvetica")
       .text("Cierre Contable", 40, 44);
    doc.fillColor(GRAY).fontSize(9)
       .text(`Período: ${fmtDate(closure.periodStart)} — ${fmtDate(closure.periodEnd)}`, 40, 62)
       .text(`Estado: ${closure.status === "confirmed" ? "CONFIRMADO" : "BORRADOR"}  |  Proyectos: ${projects.length}`, 40, 76);

    let y = 115;

    // Summary boxes
    const boxW = 155;
    const boxes = [
      { label: "VENTAS NETAS", value: fmt(closure.totalSales), color: TEAL },
      { label: "GASTOS TOTALES", value: fmt(closure.totalExpenses), color: "#F59E0B" },
      { label: "GANANCIA NETA", value: fmt(closure.totalProfit), color: "#10B981" },
    ];
    boxes.forEach((b, i) => {
      const x = 40 + i * (boxW + 10);
      doc.rect(x, y, boxW, 60).fillAndStroke("#F8FAFC", "#E5E7EB");
      doc.fillColor(b.color).fontSize(8).font("Helvetica-Bold").text(b.label, x + 8, y + 10, { width: boxW - 16 });
      doc.fillColor("#111827").fontSize(13).font("Helvetica-Bold").text(b.value, x + 8, y + 26, { width: boxW - 16 });
    });

    y += 80;

    // Table header
    doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold");
    doc.rect(40, y, doc.page.width - 80, 20).fill(DARK);
    doc.fillColor(WHITE);
    doc.text("PROYECTO", 48, y + 6, { width: 200 });
    doc.text("VALOR PROYECTO", 250, y + 6, { width: 100, align: "right" });
    doc.text("GASTOS", 355, y + 6, { width: 80, align: "right" });
    doc.text("GANANCIA", 440, y + 6, { width: 90, align: "right" });
    y += 20;

    projects.forEach((p, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      const bg = idx % 2 === 0 ? "#F9FAFB" : WHITE;
      doc.rect(40, y, doc.page.width - 80, 18).fill(bg);
      doc.fillColor("#111827").fontSize(8).font("Helvetica");
      doc.text(p.projectName, 48, y + 5, { width: 198 });
      doc.text(fmt(p.totalPaid), 250, y + 5, { width: 100, align: "right" });
      doc.text(fmt(p.totalExpenses), 355, y + 5, { width: 80, align: "right" });
      const ganancia = parseFloat((p.profit ?? "0").toString());
      doc.fillColor(ganancia >= 0 ? "#10B981" : "#EF4444");
      doc.text(fmt(p.profit), 440, y + 5, { width: 90, align: "right" });
      y += 18;
    });

    // Total row
    y += 4;
    doc.rect(40, y, doc.page.width - 80, 20).fill(DARK);
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold");
    doc.text("TOTALES", 48, y + 6, { width: 198 });
    doc.text(fmt(closure.totalSales), 250, y + 6, { width: 100, align: "right" });
    doc.text(fmt(closure.totalExpenses), 355, y + 6, { width: 80, align: "right" });
    doc.text(fmt(closure.totalProfit), 440, y + 6, { width: 90, align: "right" });

    // Footer
    y += 30;
    doc.fillColor(GRAY).fontSize(8).font("Helvetica")
       .text(`Generado: ${new Date().toLocaleDateString("es-CO")}  |  Creado: ${fmtDate(closure.createdAt)}  |  Confirmado: ${fmtDate(closure.confirmedAt ?? "")}`, 40, y, { align: "center", width: doc.page.width - 80 });

    doc.end();
  });
}

export async function generateClosureDocxBuffer(closureId: number): Promise<Buffer> {
  const closure = await getClosureDetails(closureId);
  if (!closure) throw new Error("Cierre no encontrado");
  const projects = await getClosureProjects(closureId);

  const borderCell = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: borderCell, bottom: borderCell, left: borderCell, right: borderCell };

  const headerRow = new TableRow({
    children: [
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "PROYECTO", bold: true, color: "FFFFFF", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "VALOR PROYECTO", bold: true, color: "FFFFFF", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "GASTOS", bold: true, color: "FFFFFF", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "GANANCIA", bold: true, color: "FFFFFF", size: 18 })] })] }),
    ],
  });

  const dataRows = projects.map((p, idx) => {
    const bg = idx % 2 === 0 ? "F9FAFB" : "FFFFFF";
    const ganColor = parseFloat((p.profit ?? "0").toString()) >= 0 ? "10B981" : "EF4444";
    return new TableRow({
      children: [
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: p.projectName, size: 18 })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(p.totalPaid), size: 18 })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(p.totalExpenses), size: 18 })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(p.profit), color: ganColor, bold: true, size: 18 })] })] }),
      ],
    });
  });

  const totalRow = new TableRow({
    children: [
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "TOTALES", bold: true, color: "FFFFFF", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(closure.totalSales), bold: true, color: "00BCD4", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(closure.totalExpenses), bold: true, color: "F59E0B", size: 18 })] })] }),
      new TableCell({ borders, shading: { fill: "1A1A2E", type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(closure.totalProfit), bold: true, color: "10B981", size: 18 })] })] }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "INNOVAR COCINAS DE DISEÑO", bold: true, color: "00BCD4", size: 32 })] }),
        new Paragraph({ children: [new TextRun({ text: "Cierre Contable", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Período: ${fmtDate(closure.periodStart)} — ${fmtDate(closure.periodEnd)}`, size: 20, color: "555555" })] }),
        new Paragraph({ children: [new TextRun({ text: `Estado: ${closure.status === "confirmed" ? "CONFIRMADO" : "BORRADOR"}   |   Proyectos: ${projects.length}`, size: 20, color: "555555" })] }),
        new Paragraph({ children: [new TextRun({ text: " " })] }),
        new Paragraph({ children: [new TextRun({ text: `Ventas Netas: ${fmt(closure.totalSales)}`, bold: true, size: 22, color: "00BCD4" })] }),
        new Paragraph({ children: [new TextRun({ text: `Gastos Totales: ${fmt(closure.totalExpenses)}`, bold: true, size: 22, color: "D97706" })] }),
        new Paragraph({ children: [new TextRun({ text: `Ganancia Neta: ${fmt(closure.totalProfit)}`, bold: true, size: 22, color: "10B981" })] }),
        new Paragraph({ children: [new TextRun({ text: " " })] }),
        new Table({ width: { size: 9100, type: WidthType.DXA }, columnWidths: [3500, 2000, 1800, 1800], rows: [headerRow, ...dataRows, totalRow] }),
        new Paragraph({ children: [new TextRun({ text: " " })] }),
        new Paragraph({ children: [new TextRun({ text: `Generado: ${new Date().toLocaleDateString("es-CO")}  |  Confirmado: ${fmtDate(closure.confirmedAt ?? "")}`, size: 16, color: "9CA3AF" })] }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
