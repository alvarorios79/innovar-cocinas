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

// ── Paleta de marca Innovar ───────────────────────────────────────────────────
const TEAL   = "#00BCD4";
const TDARK  = "#0097A7";
const DARK   = "#1E2A3A";   // header + sección oscura
const DGRAY  = "#3A3A3A";   // texto principal
const MGRAY  = "#6B7280";   // texto secundario
const LGRAY  = "#F4F6F8";   // fondo fila alterno
const BORDER = "#D1D9E0";   // bordes tabla
const RED    = "#DC2626";   // descuento
const WHITE  = "#FFFFFF";

// Busca el logo en las rutas posibles (dev + producción Render)
function findLogo(): string | null {
  const tries = [
    // Producción Render: dist/public/logo-original.png
    path.join(__dirname, "public", "logo-original.png"),
    path.join(__dirname, "public", "logo-dark.jpg"),
    // Fuente: client/public/
    path.join(__dirname, "..", "client", "public", "logo-original.png"),
    path.join(__dirname, "..", "client", "public", "logo-dark.jpg"),
    path.join(__dirname, "..", "..", "client", "public", "logo-original.png"),
    // Raíz del proyecto
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
      const ML = 44, MR = 44, CW = PW - ML - MR; // content width = 524

      // ══════════════════════════════════════════════════════════════════════
      // HEADER OSCURO — sólo la franja superior (~108px)
      // ══════════════════════════════════════════════════════════════════════
      const HDR = 108;
      doc.rect(0, 0, PW, HDR).fill(DARK);
      // Línea teal inferior del header
      doc.rect(0, HDR, PW, 3).fill(TEAL);

      // Logo
      const logoPath = findLogo();
      if (logoPath) {
        try { doc.image(logoPath, ML, 14, { height: 80, fit: [180, 80] }); }
        catch { /* logo no disponible */ }
      }
      // Wordmark de respaldo si no hay imagen
      if (!logoPath) {
        doc.fontSize(22).fillColor(TEAL).font("Helvetica-Bold").text("INNOVAR", ML, 22);
        doc.fontSize(9).fillColor(WHITE).font("Helvetica").text("COCINAS DE DISEÑO", ML, 50);
      }

      // Bloque cotización — derecha del header
      const BW = 198, BX = PW - MR - BW;
      doc.rect(BX, 14, BW, HDR - 22).fill("#162030").stroke("rgba(0,0,0,0)");
      doc.rect(BX, 14, BW, 22).fill(TEAL);
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
         .text("COTIZACIÓN", BX + 10, 20);

      doc.fontSize(7.5).fillColor(TEAL).font("Helvetica-Bold")
         .text(data.quotationNumber, BX + 10, 43, { width: BW - 16 });

      if (data.versionNumber && data.versionNumber > 1) {
        doc.fontSize(7).fillColor("#90CAF9").font("Helvetica")
           .text(`Versión v${data.versionNumber}`, BX + 10, 54, { width: BW - 16 });
      }

      doc.fontSize(7.5).fillColor("#B0BEC5").font("Helvetica")
         .text(`Fecha:         ${data.date}`, BX + 10, 66, { width: BW - 16 })
         .text(`Válida hasta: ${data.validUntil}`, BX + 10, 78, { width: BW - 16 });

      // Contacto — debajo del logo dentro del header
      doc.fontSize(7.5).fillColor("#90A4AE").font("Helvetica")
         .text("Km 9 vía Cerritos · Pereira, Risaralda · NIT: 10021456-1", ML, 86, { width: BX - ML - 10 })
         .text("313 680 2025 · ventas@cocinasintegralespereira.co · cocinasintegralespereira.co", ML, 96, { width: BX - ML - 10 });

      // ══════════════════════════════════════════════════════════════════════
      // CUERPO BLANCO
      // ══════════════════════════════════════════════════════════════════════
      let Y = HDR + 16;

      // ── CLIENTE + PROYECTO (dos columnas) ─────────────────────────────────
      const HF = (CW - 10) / 2; // half width

      // Encabezado Cliente
      doc.rect(ML, Y, HF, 20).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("CLIENTE", ML + 10, Y + 6);

      // Encabezado Proyecto
      const RX = ML + HF + 10;
      doc.rect(RX, Y, HF, 20).fill(DGRAY);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("PROYECTO", RX + 10, Y + 6);
      Y += 20;

      // Calcular altura del bloque cliente
      const clientLines: string[] = [];
      if (data.clientPhone)   clientLines.push(`Tel: ${data.clientPhone}`);
      if (data.clientAddress) clientLines.push(`Dir: ${data.clientAddress}`);
      if (data.clientEmail)   clientLines.push(data.clientEmail);
      const clientBoxH = 16 + clientLines.length * 13 + 10;
      const projBoxH   = 76;
      const boxH       = Math.max(clientBoxH, projBoxH);

      // Caja cliente
      doc.rect(ML, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(ML, Y, 3, boxH).fill(TEAL); // borde izq teal
      doc.fontSize(11).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.clientName, ML + 12, Y + 8, { width: HF - 20 });
      let cy = Y + 22;
      for (const l of clientLines) {
        doc.fontSize(8.5).fillColor(MGRAY).font("Helvetica")
           .text(l, ML + 12, cy, { width: HF - 20 });
        cy += 13;
      }

      // Caja proyecto
      doc.rect(RX, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(RX, Y, 3, boxH).fill(DGRAY);
      doc.fontSize(7.5).fillColor(MGRAY).font("Helvetica")
         .text("ASESOR",          RX + 12, Y + 7)
         .text("TIPO DE TRABAJO", RX + 12, Y + 30)
         .text("FORMA DE PAGO",   RX + 12, Y + 53);
      doc.fontSize(9).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.vendorName,  RX + 12, Y + 17, { width: HF - 20 })
         .text(data.productType, RX + 12, Y + 40, { width: HF - 20 });
      doc.fontSize(9).fillColor(TDARK).font("Helvetica-Bold")
         .text("60% inicial · 40% al finalizar obra", RX + 12, Y + 63, { width: HF - 20 });

      Y += boxH + 16;

      // ── TABLA DE ÍTEMS ─────────────────────────────────────────────────────
      // Encabezado
      doc.rect(ML, Y, CW, 22).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("#",           ML + 8,   Y + 7, { width: 22 })
         .text("DESCRIPCIÓN", ML + 34,  Y + 7, { width: 326 })
         .text("CANT.",       ML + 368, Y + 7, { width: 46, align: "center" })
         .text("VALOR TOTAL", ML + 420, Y + 7, { width: 96, align: "right" });
      Y += 22;

      let alt = false;
      for (const item of data.items) {
        const descH = doc.heightOfString(item.description, { width: 326, lineGap: 1.5 });
        const rowH  = Math.max(descH + 14, 28);

        // Nueva página si no hay espacio
        if (Y + rowH > PH - 180) {
          doc.addPage();
          // Encabezado tabla en página nueva
          doc.rect(0, 0, PW, 6).fill(TEAL);
          Y = 22;
          doc.rect(ML, Y, CW, 22).fill(TEAL);
          doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
             .text("#",           ML + 8,   Y + 7, { width: 22 })
             .text("DESCRIPCIÓN", ML + 34,  Y + 7, { width: 326 })
             .text("CANT.",       ML + 368, Y + 7, { width: 46, align: "center" })
             .text("VALOR TOTAL", ML + 420, Y + 7, { width: 96, align: "right" });
          Y += 22;
        }

        // Fondo fila
        doc.rect(ML, Y, CW, rowH).fill(alt ? LGRAY : WHITE).stroke(BORDER);

        // Marcador # con color teal
        doc.fontSize(9).fillColor(TEAL).font("Helvetica-Bold")
           .text(String(item.itemNumber), ML + 8, Y + 8, { width: 22, align: "center" });

        // Descripción
        doc.fontSize(8.5).fillColor(DGRAY).font("Helvetica")
           .text(item.description, ML + 34, Y + 7, { width: 326, lineGap: 1.5 });

        // Cantidad
        doc.fontSize(8.5).fillColor(MGRAY).font("Helvetica")
           .text(item.quantity, ML + 368, Y + 8, { width: 46, align: "center" });

        // Precio
        doc.fontSize(8.5).fillColor(DGRAY).font("Helvetica-Bold")
           .text(fmt(item.totalPrice), ML + 420, Y + 8, { width: 96, align: "right" });

        Y += rowH;
        alt = !alt;
      }

      Y += 14;

      // ── TOTALES ────────────────────────────────────────────────────────────
      if (Y + 120 > PH - 120) { doc.addPage(); Y = 30; }

      const TW = 224, TX = PW - MR - TW;

      // Subtotal
      doc.rect(TX, Y, TW, 26).fill(WHITE).stroke(BORDER);
      doc.fontSize(9).fillColor(MGRAY).font("Helvetica")
         .text("Subtotal:", TX + 12, Y + 8);
      doc.fontSize(9).fillColor(DGRAY).font("Helvetica-Bold")
         .text(fmt(data.subtotal), TX + 12, Y + 8, { width: TW - 24, align: "right" });
      Y += 26;

      // Descuento
      const dp = parseFloat(data.discountPercent || "0");
      const da = parseFloat(data.discountAmount  || "0");
      if (dp > 0 && da > 0) {
        doc.rect(TX, Y, TW, 26).fill(WHITE).stroke(BORDER);
        doc.fontSize(9).fillColor(RED).font("Helvetica")
           .text(`Descuento (${dp}%):`, TX + 12, Y + 8);
        doc.fontSize(9).fillColor(RED).font("Helvetica-Bold")
           .text(`-${fmt(da)}`, TX + 12, Y + 8, { width: TW - 24, align: "right" });
        Y += 26;
      }

      // Total
      doc.rect(TX, Y, TW, 36).fill(TEAL);
      doc.fontSize(11).fillColor(WHITE).font("Helvetica-Bold")
         .text("TOTAL:", TX + 12, Y + 11);
      doc.fontSize(15).fillColor(WHITE).font("Helvetica-Bold")
         .text(fmt(data.total), TX + 12, Y + 11, { width: TW - 24, align: "right" });
      Y += 36 + 20;

      // ── OBSERVACIONES ──────────────────────────────────────────────────────
      if (data.generalNotes && data.generalNotes.trim()) {
        if (Y + 60 > PH - 130) { doc.addPage(); Y = 30; }
        doc.rect(ML, Y, CW, 20).fill(DGRAY);
        doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
           .text("OBSERVACIONES", ML + 10, Y + 6);
        Y += 20;
        const nLines  = data.generalNotes.split("\n").filter(l => l.trim());
        let   noteH   = nLines.reduce((a, l) => a + doc.heightOfString(l, { width: CW - 20, lineGap: 1.5 }) + 5, 14);
        doc.rect(ML, Y, CW, noteH).fill(LGRAY).stroke(BORDER);
        let ny = Y + 8;
        for (const l of nLines) {
          doc.fontSize(8.5).fillColor(MGRAY).font("Helvetica")
             .text(l, ML + 10, ny, { width: CW - 20, lineGap: 1.5 });
          ny += doc.heightOfString(l, { width: CW - 20, lineGap: 1.5 }) + 5;
        }
        Y += noteH + 14;
      }

      // ── TÉRMINOS Y CONDICIONES ─────────────────────────────────────────────
      if (Y + 110 > PH - 80) { doc.addPage(); Y = 30; }
      doc.rect(ML, Y, CW, 20).fill(DGRAY);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("TÉRMINOS Y CONDICIONES", ML + 10, Y + 6);
      Y += 20;

      const terms = [
        "Tiempo de entrega: 3 a 4 semanas hábiles desde la aprobación del diseño y el primer abono.",
        "NO incluye obra civil, plomería, instalación de gas ni trabajos de albañilería.",
        "Validez de la cotización: 1 semana desde la fecha de emisión.",
        "Garantía: 6 meses en herrajes. Los materiales cuentan con garantía del fabricante.",
        "Los diseños y renders son propiedad exclusiva de Innovar Cocinas de Diseño.",
      ];
      const tH = terms.length * 17 + 12;
      doc.rect(ML, Y, CW, tH).fill(WHITE).stroke(BORDER);
      let ty = Y + 8;
      for (const t of terms) {
        doc.fontSize(8).fillColor(MGRAY).font("Helvetica")
           .text(`• ${t}`, ML + 10, ty, { width: CW - 20 });
        ty += 17;
      }
      Y += tH + 20;

      // ── FIRMAS ─────────────────────────────────────────────────────────────
      if (Y + 70 > PH - 44) { doc.addPage(); Y = PH - 36 - 110; }
      doc.moveTo(ML,           Y + 36).lineTo(ML + 185,       Y + 36).stroke(BORDER);
      doc.moveTo(PW - MR - 185, Y + 36).lineTo(PW - MR,        Y + 36).stroke(BORDER);
      doc.fontSize(8.5).fillColor(DGRAY).font("Helvetica-Bold")
         .text("Firma del Cliente",        ML,            Y + 41)
         .text("INNOVAR Cocinas de Diseño", PW - MR - 185, Y + 41, { width: 185, align: "right" });
      doc.fontSize(8).fillColor(MGRAY).font("Helvetica")
         .text(data.clientName, ML, Y + 53)
         .text("NIT: 10021456-1 · @cocinasintegralesenpereira", PW - MR - 185, Y + 53, { width: 185, align: "right" });

      // ── FOOTER en todas las páginas (bufferPages: true) ────────────────────
      const { start, count } = doc.bufferedPageRange();
      for (let p = 0; p < count; p++) {
        doc.switchToPage(start + p);
        const FY = doc.page.height - 36;
        const PW2 = doc.page.width;
        doc.rect(0, FY, PW2, 36).fill(DARK);
        doc.rect(0, FY, PW2, 3).fill(TEAL);
        doc.fontSize(7.5).fillColor(TEAL).font("Helvetica-Bold")
           .text("Innovar Cocinas de Diseño", ML, FY + 9);
        doc.fontSize(7).fillColor("#90A4AE").font("Helvetica")
           .text("cocinasintegralespereira.co  ·  313 680 2025  ·  Km 9 vía Cerritos, Pereira, Colombia", ML, FY + 21);
        doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
           .text("Gracias por confiar en nosotros", ML, FY + 9, { width: CW, align: "right" });
      }

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (e: any) { reject(e); }
  });
}
