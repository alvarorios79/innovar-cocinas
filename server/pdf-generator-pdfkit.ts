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

      // Logo — 60px alto, al lado izquierdo del header
      const logoPath = findLogo();
      if (logoPath) {
        try { doc.image(logoPath, ML, 10, { height: 62, fit: [90, 62] }); }
        catch { /* logo no disponible */ }
      }

      // Wordmark texto (a la derecha del logo)
      const LX = ML + 98; // inicio texto tras logo
      if (!logoPath) {
        doc.fontSize(20).fillColor(TEAL).font("Helvetica-Bold").text("INNOVAR", ML, 18);
        doc.fontSize(8).fillColor(WHITE).font("Helvetica").text("COCINAS DE DISEÑO", ML, 42);
      } else {
        doc.fontSize(18).fillColor(TEAL).font("Helvetica-Bold").text("INNOVAR", LX, 18);
        doc.fontSize(7.5).fillColor(WHITE).font("Helvetica").text("COCINAS DE DISEÑO", LX, 38);
      }

      // Contacto — debajo del wordmark, dentro del header
      const CTX = logoPath ? LX : ML;
      doc.fontSize(7).fillColor("#78909C").font("Helvetica")
         .text("Km 9 vía Cerritos · Pereira, Risaralda · NIT: 10021456-1", CTX, 56, { width: 220 })
         .text("313 680 2025 · ventas@cocinasintegralespereira.co", CTX, 67, { width: 220 })
         .text("cocinasintegralespereira.co", CTX, 78, { width: 220 });

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

      // ══════════════════════════════════════════════════════════════════════
      // CUERPO BLANCO
      // ══════════════════════════════════════════════════════════════════════
      let Y = HDR + 16;

      // ── CLIENTE + PROYECTO (dos columnas) ─────────────────────────────────
      const HF = (CW - 10) / 2; // half width

      // Encabezado Cliente
      doc.rect(ML, Y, HF, 24).fill(TEAL);
      doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
         .text("CLIENTE", ML + 10, Y + 7);

      // Encabezado Proyecto
      const RX = ML + HF + 10;
      doc.rect(RX, Y, HF, 24).fill(DGRAY);
      doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
         .text("PROYECTO", RX + 10, Y + 7);
      Y += 24;

      // Calcular altura del bloque cliente
      const clientLines: string[] = [];
      if (data.clientPhone)   clientLines.push(`Tel: ${data.clientPhone}`);
      if (data.clientAddress) clientLines.push(`Dir: ${data.clientAddress}`);
      if (data.clientEmail)   clientLines.push(data.clientEmail);
      const clientBoxH = 20 + clientLines.length * 15 + 10;
      const projBoxH   = 90;
      const boxH       = Math.max(clientBoxH, projBoxH);

      // Caja cliente
      doc.rect(ML, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(ML, Y, 3, boxH).fill(TEAL); // borde izq teal
      doc.fontSize(13).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.clientName, ML + 12, Y + 10, { width: HF - 20 });
      let cy = Y + 28;
      for (const l of clientLines) {
        doc.fontSize(10).fillColor(MGRAY).font("Helvetica")
           .text(l, ML + 12, cy, { width: HF - 20 });
        cy += 15;
      }

      // Caja proyecto
      doc.rect(RX, Y, HF, boxH).fill(WHITE).stroke(BORDER);
      doc.rect(RX, Y, 3, boxH).fill(DGRAY);
      doc.fontSize(9).fillColor(MGRAY).font("Helvetica")
         .text("ASESOR",          RX + 12, Y + 8)
         .text("TIPO DE TRABAJO", RX + 12, Y + 36)
         .text("FORMA DE PAGO",   RX + 12, Y + 64);
      doc.fontSize(10.5).fillColor(DGRAY).font("Helvetica-Bold")
         .text(data.vendorName,  RX + 12, Y + 19, { width: HF - 20 })
         .text(data.productType, RX + 12, Y + 47, { width: HF - 20 });
      doc.fontSize(10.5).fillColor(TDARK).font("Helvetica-Bold")
         .text("60% inicial · 40% al finalizar obra", RX + 12, Y + 75, { width: HF - 20 });

      Y += boxH + 16;

      // ── TABLA DE ÍTEMS ─────────────────────────────────────────────────────
      // Encabezado
      doc.rect(ML, Y, CW, 28).fill(TEAL);
      doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
         .text("#",           ML + 8,   Y + 9, { width: 22 })
         .text("DESCRIPCIÓN", ML + 34,  Y + 9, { width: 326 })
         .text("CANT.",       ML + 368, Y + 9, { width: 46, align: "center" })
         .text("VALOR TOTAL", ML + 420, Y + 9, { width: 96, align: "right" });
      Y += 28;

      let alt = false;
      for (const item of data.items) {
        const descH = doc.heightOfString(item.description, { width: 326, lineGap: 2 });
        const rowH  = Math.max(descH + 16, 36);

        // Nueva página si no hay espacio
        if (Y + rowH > PH - 180) {
          doc.addPage();
          // Encabezado tabla en página nueva
          doc.rect(0, 0, PW, 6).fill(TEAL);
          Y = 22;
          doc.rect(ML, Y, CW, 28).fill(TEAL);
          doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
             .text("#",           ML + 8,   Y + 9, { width: 22 })
             .text("DESCRIPCIÓN", ML + 34,  Y + 9, { width: 326 })
             .text("CANT.",       ML + 368, Y + 9, { width: 46, align: "center" })
             .text("VALOR TOTAL", ML + 420, Y + 9, { width: 96, align: "right" });
          Y += 28;
        }

        // Fondo fila
        doc.rect(ML, Y, CW, rowH).fill(alt ? LGRAY : WHITE).stroke(BORDER);

        // Marcador # con color teal
        doc.fontSize(10.5).fillColor(TEAL).font("Helvetica-Bold")
           .text(String(item.itemNumber), ML + 8, Y + 10, { width: 22, align: "center" });

        // Descripción
        doc.fontSize(10).fillColor(DGRAY).font("Helvetica")
           .text(item.description, ML + 34, Y + 8, { width: 326, lineGap: 2 });

        // Cantidad
        doc.fontSize(10).fillColor(MGRAY).font("Helvetica")
           .text(item.quantity, ML + 368, Y + 10, { width: 46, align: "center" });

        // Precio
        doc.fontSize(10.5).fillColor(DGRAY).font("Helvetica-Bold")
           .text(fmt(item.totalPrice), ML + 420, Y + 10, { width: 96, align: "right" });

        Y += rowH;
        alt = !alt;
      }

      Y += 14;

      // ── TOTALES ────────────────────────────────────────────────────────────
      if (Y + 120 > PH - 120) { doc.addPage(); Y = 30; }

      const TW = 224, TX = PW - MR - TW;

      // Subtotal
      doc.rect(TX, Y, TW, 30).fill(WHITE).stroke(BORDER);
      doc.fontSize(10.5).fillColor(MGRAY).font("Helvetica")
         .text("Subtotal:", TX + 12, Y + 9);
      doc.fontSize(10.5).fillColor(DGRAY).font("Helvetica-Bold")
         .text(fmt(data.subtotal), TX + 12, Y + 9, { width: TW - 24, align: "right" });
      Y += 30;

      // Descuento
      const dp = parseFloat(data.discountPercent || "0");
      const da = parseFloat(data.discountAmount  || "0");
      if (dp > 0 && da > 0) {
        doc.rect(TX, Y, TW, 30).fill(WHITE).stroke(BORDER);
        doc.fontSize(10.5).fillColor(RED).font("Helvetica")
           .text(`Descuento (${dp}%):`, TX + 12, Y + 9);
        doc.fontSize(10.5).fillColor(RED).font("Helvetica-Bold")
           .text(`-${fmt(da)}`, TX + 12, Y + 9, { width: TW - 24, align: "right" });
        Y += 30;
      }

      // Total
      doc.rect(TX, Y, TW, 44).fill(TEAL);
      doc.fontSize(13).fillColor(WHITE).font("Helvetica-Bold")
         .text("TOTAL:", TX + 12, Y + 14);
      doc.fontSize(17).fillColor(WHITE).font("Helvetica-Bold")
         .text(fmt(data.total), TX + 12, Y + 14, { width: TW - 24, align: "right" });
      Y += 44 + 20;

      // ── OBSERVACIONES ──────────────────────────────────────────────────────
      if (data.generalNotes && data.generalNotes.trim()) {
        if (Y + 60 > PH - 130) { doc.addPage(); Y = 30; }
        doc.rect(ML, Y, CW, 24).fill(DGRAY);
        doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
           .text("OBSERVACIONES", ML + 10, Y + 7);
        Y += 24;
        const nLines  = data.generalNotes.split("\n").filter(l => l.trim());
        let   noteH   = nLines.reduce((a, l) => a + doc.heightOfString(l, { width: CW - 20, lineGap: 2 }) + 6, 16);
        doc.rect(ML, Y, CW, noteH).fill(LGRAY).stroke(BORDER);
        let ny = Y + 8;
        for (const l of nLines) {
          doc.fontSize(10).fillColor(MGRAY).font("Helvetica")
             .text(l, ML + 10, ny, { width: CW - 20, lineGap: 2 });
          ny += doc.heightOfString(l, { width: CW - 20, lineGap: 2 }) + 6;
        }
        Y += noteH + 14;
      }

      // ── TÉRMINOS Y CONDICIONES ─────────────────────────────────────────────
      if (Y + 110 > PH - 80) { doc.addPage(); Y = 30; }
      doc.rect(ML, Y, CW, 24).fill(DGRAY);
      doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
         .text("TÉRMINOS Y CONDICIONES", ML + 10, Y + 7);
      Y += 24;

      const terms = [
        "Tiempo de entrega: 3 a 4 semanas hábiles desde la aprobación del diseño y el primer abono.",
        "NO incluye obra civil, plomería, instalación de gas ni trabajos de albañilería.",
        "Validez de la cotización: 1 semana desde la fecha de emisión.",
        "Garantía: 6 meses en herrajes. Los materiales cuentan con garantía del fabricante.",
        "Los diseños y renders son propiedad exclusiva de Innovar Cocinas de Diseño.",
      ];
      const tH = terms.length * 21 + 14;
      doc.rect(ML, Y, CW, tH).fill(WHITE).stroke(BORDER);
      let ty = Y + 10;
      for (const t of terms) {
        doc.fontSize(9.5).fillColor(MGRAY).font("Helvetica")
           .text(`• ${t}`, ML + 10, ty, { width: CW - 20 });
        ty += 21;
      }
      Y += tH + 20;

      // ── FIRMAS ─────────────────────────────────────────────────────────────
      if (Y + 70 > PH - 44) { doc.addPage(); Y = PH - 36 - 110; }
      doc.moveTo(ML,           Y + 36).lineTo(ML + 185,       Y + 36).stroke(BORDER);
      doc.moveTo(PW - MR - 185, Y + 36).lineTo(PW - MR,        Y + 36).stroke(BORDER);
      doc.fontSize(10).fillColor(DGRAY).font("Helvetica-Bold")
         .text("Firma del Cliente",        ML,            Y + 41)
         .text("INNOVAR Cocinas de Diseño", PW - MR - 185, Y + 41, { width: 185, align: "right" });
      doc.fontSize(9.5).fillColor(MGRAY).font("Helvetica")
         .text(data.clientName, ML, Y + 55)
         .text("NIT: 10021456-1 · @cocinasintegralesenpereira", PW - MR - 185, Y + 55, { width: 185, align: "right" });

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
