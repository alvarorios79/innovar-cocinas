import PDFDocument from "pdfkit";
import { createWriteStream, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuotationItem {
  itemNumber: number;
  description: string;
  quantity: string;
  unitPrice?: string;
  totalPrice: string;
  includesFixedCosts?: boolean;
}

interface QuotationData {
  quotationNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  clientEmail?: string;
  vendorName: string;
  productType: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: string;
  transportCost: string;
  discountPercent?: string;
  discountAmount?: string;
  total: string;
  generalNotes?: string;
  versionNumber?: number;
  baseQuotationNumber?: string;
}

const TEAL   = "#00BCD4";
const TDARK  = "#0097A7";
const DARK   = "#1E2A3A";
const DGRAY  = "#3A3A3A";
const MGRAY  = "#6B7280";
const LGRAY  = "#F4F6F8";
const BORDER = "#D1D9E0";
const RED    = "#DC2626";
const WHITE  = "#FFFFFF";

function findLogo(): string | null {
  const tries = [
    path.join(__dirname, "public", "logo-original.png"),
    path.join(__dirname, "public", "logo-dark.jpg"),
    path.join(__dirname, "..", "client", "public", "logo-original.png"),
    path.join(__dirname, "..", "client", "public", "logo-dark.jpg"),
    path.join(__dirname, "..", "..", "client", "public", "logo-original.png"),
    path.join(process.cwd(), "client", "public", "logo-original.png"),
    path.join(process.cwd(), "innovar_logo.png"),
    path.join(__dirname, "..", "innovar_logo.png"),
    path.join(__dirname, "..", "..", "innovar_logo.png"),
  ];
  return tries.find(p => existsSync(p)) ?? null;
}

function fmt(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.-]/g, "")) || 0 : (v || 0);
  return isNaN(n) ? "$0" : `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

export async function generateQuotationPDF(data: QuotationData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true });
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = 612, PH = 792;
      const ML = 40, MR = 40, CW = PW - ML - MR; // 532px de contenido

      // ══════════════════════════════════════════════════════════════════════
      // HEADER compacto — 82px
      // ══════════════════════════════════════════════════════════════════════
      const HDR = 82;
      doc.rect(0, 0, PW, HDR).fill(DARK);
      doc.rect(0, HDR, PW, 2).fill(TEAL);

      const logoPath = findLogo();
      if (logoPath) {
        try { doc.image(logoPath, ML, 8, { height: 52, fit: [76, 52] }); }
        catch { /* sin logo */ }
      }

      const LX = logoPath ? ML + 82 : ML;
      if (!logoPath) {
        doc.fontSize(16).fillColor(TEAL).font("Helvetica-Bold").text("INNOVAR", ML, 14);
        doc.fontSize(7).fillColor(WHITE).font("Helvetica").text("COCINAS DE DISEÑO", ML, 33);
      } else {
        doc.fontSize(16).fillColor(TEAL).font("Helvetica-Bold").text("INNOVAR", LX, 14);
        doc.fontSize(7).fillColor(WHITE).font("Helvetica").text("COCINAS DE DISEÑO", LX, 33);
      }
      doc.fontSize(6.5).fillColor("#78909C").font("Helvetica")
         .text("Km 9 vía Cerritos · Pereira, Risaralda · NIT: 10021456-1", LX, 45, { width: 210 })
         .text("313 680 2025 · cocinasintegralespereira.co", LX, 55, { width: 210 });

      // Bloque cotización — derecha del header
      const BW = 190, BX = PW - MR - BW;
      doc.rect(BX, 10, BW, HDR - 18).fill("#162030");
      doc.rect(BX, 10, BW, 18).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold").text("COTIZACIÓN", BX + 8, 15);
      doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
         .text(data.quotationNumber, BX + 8, 33, { width: BW - 16 });
      if (data.versionNumber && data.versionNumber > 1) {
        doc.fontSize(6.5).fillColor("#90CAF9").font("Helvetica")
           .text(`Versión v${data.versionNumber}`, BX + 8, 44, { width: BW - 16 });
      }
      doc.fontSize(6.5).fillColor("#B0BEC5").font("Helvetica")
         .text(`Fecha:         ${data.date}`, BX + 8, 54, { width: BW - 16 })
         .text(`Válida hasta: ${data.validUntil}`, BX + 8, 64, { width: BW - 16 });

      // ══════════════════════════════════════════════════════════════════════
      // CUERPO — empieza en Y = 96
      // ══════════════════════════════════════════════════════════════════════
      let Y = HDR + 12;

      // ── CLIENTE + PROYECTO ─────────────────────────────────────────────────
      const HF = (CW - 8) / 2; // ~262px cada columna
      const RX = ML + HF + 8;

      // Cabeceras de sección
      doc.rect(ML, Y, HF, 18).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold").text("CLIENTE", ML + 8, Y + 5);
      doc.rect(RX, Y, HF, 18).fill(DGRAY);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold").text("PROYECTO", RX + 8, Y + 5);
      Y += 18;

      // Calcular alturas de caja
      const clientLines: string[] = [];
      if (data.clientPhone)   clientLines.push(`Tel: ${data.clientPhone}`);
      if (data.clientAddress) clientLines.push(`Dir: ${data.clientAddress}`);
      if (data.clientEmail)   clientLines.push(data.clientEmail);
      const clientBoxH = 14 + clientLines.length * 13 + 8;
      const projBoxH   = 78;
      const boxH       = Math.max(clientBoxH, projBoxH);

      // Caja cliente
      doc.rect(ML, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(ML, Y, 3, boxH).fill(TEAL);
      doc.fontSize(10).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.clientName, ML + 10, Y + 7, { width: HF - 18 });
      let cy = Y + 22;
      for (const l of clientLines) {
        doc.fontSize(8).fillColor(MGRAY).font("Helvetica")
           .text(l, ML + 10, cy, { width: HF - 18 });
        cy += 13;
      }

      // Caja proyecto
      doc.rect(RX, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(RX, Y, 3, boxH).fill(DGRAY);
      doc.fontSize(7.5).fillColor(MGRAY).font("Helvetica")
         .text("ASESOR",          RX + 10, Y + 6)
         .text("TIPO DE TRABAJO", RX + 10, Y + 32)
         .text("FORMA DE PAGO",   RX + 10, Y + 58);
      doc.fontSize(9).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.vendorName,  RX + 10, Y + 16, { width: HF - 18 })
         .text(data.productType, RX + 10, Y + 42, { width: HF - 18 });
      doc.fontSize(8.5).fillColor(TDARK).font("Helvetica-Bold")
         .text("60% inicial · 40% al finalizar obra", RX + 10, Y + 68, { width: HF - 18 });

      Y += boxH + 10;

      // ── TABLA DE ÍTEMS ─────────────────────────────────────────────────────
      // Función para dibujar cabecera de tabla
      const drawTableHeader = (ty: number) => {
        doc.rect(ML, ty, CW, 20).fill(TEAL);
        doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
           .text("#",           ML + 6,   ty + 6, { width: 20 })
           .text("DESCRIPCIÓN", ML + 30,  ty + 6, { width: 336 })
           .text("CANT.",       ML + 374, ty + 6, { width: 44, align: "center" })
           .text("VALOR TOTAL", ML + 424, ty + 6, { width: 96, align: "right" });
      };

      drawTableHeader(Y);
      Y += 20;

      let alt = false;
      for (const item of data.items) {
        const descH = doc.heightOfString(item.description, { width: 336, lineGap: 1.5 });
        const rowH  = Math.max(descH + 12, 26);

        if (Y + rowH > PH - 58) {
          doc.addPage();
          doc.rect(0, 0, PW, 5).fill(TEAL);
          Y = 18;
          drawTableHeader(Y);
          Y += 20;
          alt = false;
        }

        doc.rect(ML, Y, CW, rowH).fill(alt ? LGRAY : WHITE).stroke(BORDER);
        doc.fontSize(9).fillColor(TEAL).font("Helvetica-Bold")
           .text(String(item.itemNumber), ML + 6, Y + 7, { width: 20, align: "center" });
        doc.fontSize(8.5).fillColor(DGRAY).font("Helvetica")
           .text(item.description, ML + 30, Y + 6, { width: 336, lineGap: 1.5 });
        doc.fontSize(8.5).fillColor(MGRAY).font("Helvetica")
           .text(item.quantity, ML + 374, Y + 7, { width: 44, align: "center" });
        doc.fontSize(9).fillColor(DGRAY).font("Helvetica-Bold")
           .text(fmt(item.totalPrice), ML + 424, Y + 7, { width: 96, align: "right" });

        Y += rowH;
        alt = !alt;
      }

      Y += 8;

      // ── TOTALES ────────────────────────────────────────────────────────────
      if (Y + 95 > PH - 48) { doc.addPage(); Y = 28; }

      const TW = 220, TX = PW - MR - TW;

      doc.rect(TX, Y, TW, 22).fill(WHITE).stroke(BORDER);
      doc.fontSize(9).fillColor(MGRAY).font("Helvetica").text("Subtotal:", TX + 10, Y + 7);
      doc.fontSize(9).fillColor(DGRAY).font("Helvetica-Bold")
         .text(fmt(data.subtotal), TX + 10, Y + 7, { width: TW - 20, align: "right" });
      Y += 22;

      const dp = parseFloat(data.discountPercent || "0");
      const da = parseFloat(data.discountAmount  || "0");
      if (dp > 0 && da > 0) {
        doc.rect(TX, Y, TW, 22).fill(WHITE).stroke(BORDER);
        doc.fontSize(9).fillColor(RED).font("Helvetica").text(`Descuento (${dp}%):`, TX + 10, Y + 7);
        doc.fontSize(9).fillColor(RED).font("Helvetica-Bold")
           .text(`-${fmt(da)}`, TX + 10, Y + 7, { width: TW - 20, align: "right" });
        Y += 22;
      }

      doc.rect(TX, Y, TW, 34).fill(TEAL);
      doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold").text("TOTAL:", TX + 10, Y + 10);
      doc.fontSize(14).fillColor(WHITE).font("Helvetica-Bold")
         .text(fmt(data.total), TX + 10, Y + 10, { width: TW - 20, align: "right" });
      Y += 34 + 12;

      // ── OBSERVACIONES ──────────────────────────────────────────────────────
      if (data.generalNotes && data.generalNotes.trim()) {
        if (Y + 48 > PH - 48) { doc.addPage(); Y = 28; }
        doc.rect(ML, Y, CW, 18).fill(DGRAY);
        doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
           .text("OBSERVACIONES", ML + 8, Y + 5);
        Y += 18;
        const nLines = data.generalNotes.split("\n").filter(l => l.trim());
        const noteH  = nLines.reduce((a, l) => a + doc.heightOfString(l, { width: CW - 16, lineGap: 1.5 }) + 5, 12);
        doc.rect(ML, Y, CW, noteH).fill(LGRAY).stroke(BORDER);
        let ny = Y + 7;
        for (const l of nLines) {
          doc.fontSize(8.5).fillColor(MGRAY).font("Helvetica")
             .text(l, ML + 8, ny, { width: CW - 16, lineGap: 1.5 });
          ny += doc.heightOfString(l, { width: CW - 16, lineGap: 1.5 }) + 5;
        }
        Y += noteH + 10;
      }

      // ── TÉRMINOS Y CONDICIONES ─────────────────────────────────────────────
      const terms = [
        "Tiempo de entrega: 3 a 4 semanas hábiles desde la aprobación del diseño y el primer abono.",
        "NO incluye obra civil, plomería, instalación de gas ni trabajos de albañilería.",
        "Validez de la cotización: 1 semana desde la fecha de emisión.",
        "Garantía: 6 meses en herrajes. Los materiales cuentan con garantía del fabricante.",
        "Los diseños y renders son propiedad exclusiva de Innovar Cocinas de Diseño.",
      ];
      const tH = terms.length * 16 + 10;
      if (Y + 18 + tH + 10 > PH - 48) { doc.addPage(); Y = 28; }
      doc.rect(ML, Y, CW, 18).fill(DGRAY);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("TÉRMINOS Y CONDICIONES", ML + 8, Y + 5);
      Y += 18;
      doc.rect(ML, Y, CW, tH).fill(WHITE).stroke(BORDER);
      let ty = Y + 8;
      for (const t of terms) {
        doc.fontSize(8).fillColor(MGRAY).font("Helvetica")
           .text(`• ${t}`, ML + 8, ty, { width: CW - 16 });
        ty += 16;
      }
      Y += tH + 12;

      // ── FIRMAS ─────────────────────────────────────────────────────────────
      if (Y + 60 > PH - 38) { doc.addPage(); Y = PH - 28 - 95; }
      doc.moveTo(ML,           Y + 28).lineTo(ML + 180,       Y + 28).stroke(BORDER);
      doc.moveTo(PW - MR - 180, Y + 28).lineTo(PW - MR,        Y + 28).stroke(BORDER);
      doc.fontSize(8.5).fillColor(DGRAY).font("Helvetica-Bold")
         .text("Firma del Cliente",        ML,            Y + 33)
         .text("INNOVAR Cocinas de Diseño", PW - MR - 180, Y + 33, { width: 180, align: "right" });
      doc.fontSize(8).fillColor(MGRAY).font("Helvetica")
         .text(data.clientName, ML, Y + 46)
         .text("NIT: 10021456-1 · @cocinasintegralesenpereira", PW - MR - 180, Y + 46, { width: 180, align: "right" });

      // ── FOOTER en todas las páginas ────────────────────────────────────────
      const { start, count } = doc.bufferedPageRange();
      for (let p = 0; p < count; p++) {
        doc.switchToPage(start + p);
        const FY = doc.page.height - 28;
        const PW2 = doc.page.width;
        doc.rect(0, FY, PW2, 28).fill(DARK);
        doc.rect(0, FY, PW2, 2).fill(TEAL);
        doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
           .text("Innovar Cocinas de Diseño", ML, FY + 7);
        doc.fontSize(6.5).fillColor("#90A4AE").font("Helvetica")
           .text("cocinasintegralespereira.co  ·  313 680 2025  ·  Km 9 vía Cerritos, Pereira, Colombia", ML, FY + 17);
        doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
           .text("Gracias por confiar en nosotros", ML, FY + 7, { width: CW, align: "right" });
      }

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (e: any) { reject(e); }
  });
}
