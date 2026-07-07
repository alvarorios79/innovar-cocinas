import PDFDocument from "pdfkit";
import { createWriteStream, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Colores — fondo blanco, acentos teal
const TEAL      = "#00BCD4";
const TEAL_DARK = "#0097A7";
const DARK      = "#2D3748";
const GRAY      = "#4A5568";
const GRAY_MID  = "#718096";
const GRAY_LT   = "#F7FAFC";
const BORDER    = "#CBD5E0";
const RED       = "#C53030";
const WHITE     = "#FFFFFF";

function findLogo(): string | null {
  const candidates = [
    path.join(__dirname, "../client/public/logo-original.png"),
    path.join(__dirname, "../../client/public/logo-original.png"),
    path.join(__dirname, "../public/logo-original.png"),
    path.join(__dirname, "public/logo-original.png"),
    path.join(__dirname, "../innovar_logo.png"),
    path.join(__dirname, "../../innovar_logo.png"),
    path.join(process.cwd(), "client/public/logo-original.png"),
    path.join(process.cwd(), "innovar_logo.png"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function fmt(value: string | number): string {
  const n = typeof value === "string"
    ? parseFloat(value.replace(/[^0-9.-]/g, "")) || 0
    : (value || 0);
  return isNaN(n) ? "$0" : `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function generateQuotationPDF(
  data: QuotationData,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 30, bottom: 40, left: 45, right: 45 },
        bufferPages: true,
      });

      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = 612;
      const PH = 792;
      const ML = 45;
      const MR = 45;
      const CW = PW - ML - MR; // 522

      // ─────────────────────────────────────────────────────────────────────
      // CABECERA
      // ─────────────────────────────────────────────────────────────────────
      const logoPath = findLogo();
      const LOGO_H = 68;

      if (logoPath) {
        try { doc.image(logoPath, ML, 28, { height: LOGO_H, fit: [160, LOGO_H] }); }
        catch {}
      } else {
        // Wordmark de respaldo
        doc.fontSize(24).fillColor(TEAL).font("Helvetica-Bold")
           .text("INNOVAR", ML, 32);
        doc.fontSize(9).fillColor(GRAY).font("Helvetica")
           .text("COCINAS DE DISEÑO", ML, 60);
      }

      // Bloque cotización — esquina superior derecha
      const cqX = PW - MR - 190;
      doc.rect(cqX, 28, 190, LOGO_H).fill(GRAY_LT).stroke(BORDER);
      doc.rect(cqX, 28, 190, 22).fill(TEAL);
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
         .text("COTIZACIÓN", cqX + 8, 35);

      // Número cotización
      doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold")
         .text(data.quotationNumber, cqX + 8, 56, { width: 174 });

      // Versión si aplica
      if (data.versionNumber && data.versionNumber > 1) {
        doc.fontSize(7.5).fillColor(GRAY_MID).font("Helvetica")
           .text(`Versión v${data.versionNumber}`, cqX + 8, 68, { width: 174 });
      }

      // Fecha y validez
      doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
         .text(`Fecha: ${data.date}`, cqX + 8, 80, { width: 174 })
         .text(`Válida hasta: ${data.validUntil}`, cqX + 8, 90, { width: 174 });

      // Datos de contacto — bajo el logo, columna izquierda
      const contactY = 104;
      doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
         .text("Km 9 vía Cerritos · Pereira, Risaralda", ML, contactY)
         .text("313 680 2025  ·  ventas@cocinasintegralespereira.co", ML, contactY + 11)
         .text("cocinasintegralespereira.co  ·  NIT: 10021456-1", ML, contactY + 22);

      // Línea divisoria teal
      const lineY = contactY + 38;
      doc.rect(ML, lineY, CW, 2).fill(TEAL);

      let Y = lineY + 14;

      // ─────────────────────────────────────────────────────────────────────
      // DATOS CLIENTE + PROYECTO (dos columnas)
      // ─────────────────────────────────────────────────────────────────────
      const halfW = (CW - 10) / 2;

      // — Columna izquierda: Cliente —
      doc.rect(ML, Y, halfW, 16).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
         .text("CLIENTE", ML + 8, Y + 4);
      Y += 16;

      const clientLines: string[] = [data.clientName];
      if (data.clientPhone)   clientLines.push(`Tel: ${data.clientPhone}`);
      if (data.clientAddress) clientLines.push(data.clientAddress);
      if (data.clientEmail)   clientLines.push(data.clientEmail);
      const clientBoxH = clientLines.length * 13 + 10;

      doc.rect(ML, Y, halfW, clientBoxH).fill(GRAY_LT).stroke(BORDER);
      doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
         .text(clientLines[0], ML + 8, Y + 6);
      let cly = Y + 19;
      for (const line of clientLines.slice(1)) {
        doc.fontSize(8).fillColor(GRAY).font("Helvetica")
           .text(line, ML + 8, cly, { width: halfW - 16 });
        cly += 13;
      }

      // — Columna derecha: Proyecto —
      const colRX = ML + halfW + 10;
      doc.rect(colRX, Y - 16, halfW, 16).fill(DARK);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
         .text("DATOS DEL PROYECTO", colRX + 8, Y - 12);

      doc.rect(colRX, Y, halfW, clientBoxH).fill(GRAY_LT).stroke(BORDER);
      doc.fontSize(7.5).fillColor(GRAY_MID).font("Helvetica")
         .text("ASESOR", colRX + 8, Y + 6)
         .text("TIPO DE TRABAJO", colRX + 8, Y + 28)
         .text("FORMA DE PAGO", colRX + 8, Y + 50);
      doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold")
         .text(data.vendorName, colRX + 8, Y + 15, { width: halfW - 16 })
         .text(data.productType, colRX + 8, Y + 37, { width: halfW - 16 });
      doc.fontSize(8.5).fillColor(TEAL_DARK).font("Helvetica-Bold")
         .text("60% inicial — 40% al finalizar", colRX + 8, Y + 59, { width: halfW - 16 });

      Y += Math.max(clientBoxH, 76) + 16;

      // ─────────────────────────────────────────────────────────────────────
      // TABLA DE ÍTEMS
      // ─────────────────────────────────────────────────────────────────────
      // Encabezado
      doc.rect(ML, Y, CW, 20).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
         .text("#",           ML + 6,   Y + 6, { width: 20 })
         .text("DESCRIPCIÓN", ML + 30,  Y + 6, { width: 330 })
         .text("CANT.",       ML + 368, Y + 6, { width: 44, align: "center" })
         .text("VALOR TOTAL", ML + 418, Y + 6, { width: 98, align: "right" });
      Y += 20;

      let alt = false;
      for (const item of data.items) {
        const descH = doc.heightOfString(item.description, {
          width: 330, lineGap: 1.5,
        });
        const rowH = Math.max(descH + 12, 24);

        // Salto de página
        if (Y + rowH > PH - 170) {
          doc.addPage();
          Y = 40;
          doc.rect(ML, Y, CW, 20).fill(TEAL);
          doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
             .text("#",           ML + 6,   Y + 6, { width: 20 })
             .text("DESCRIPCIÓN", ML + 30,  Y + 6, { width: 330 })
             .text("CANT.",       ML + 368, Y + 6, { width: 44, align: "center" })
             .text("VALOR TOTAL", ML + 418, Y + 6, { width: 98, align: "right" });
          Y += 20;
        }

        doc.rect(ML, Y, CW, rowH).fill(alt ? GRAY_LT : WHITE).stroke(BORDER);

        // Borde izquierdo teal por ítem
        doc.rect(ML, Y, 3, rowH).fill(TEAL);

        doc.fontSize(8.5).fillColor(TEAL_DARK).font("Helvetica-Bold")
           .text(String(item.itemNumber), ML + 7, Y + 7, { width: 18, align: "center" });

        doc.fontSize(8.5).fillColor(DARK).font("Helvetica")
           .text(item.description, ML + 30, Y + 6, { width: 330, lineGap: 1.5 });

        doc.fontSize(8.5).fillColor(GRAY).font("Helvetica")
           .text(item.quantity, ML + 368, Y + 7, { width: 44, align: "center" });

        doc.fontSize(8.5).fillColor(DARK).font("Helvetica-Bold")
           .text(fmt(item.totalPrice), ML + 418, Y + 7, { width: 98, align: "right" });

        Y += rowH;
        alt = !alt;
      }

      Y += 12;

      // ─────────────────────────────────────────────────────────────────────
      // TOTALES
      // ─────────────────────────────────────────────────────────────────────
      if (Y + 110 > PH - 100) { doc.addPage(); Y = 40; }

      const TW = 220;
      const TX = PW - MR - TW;

      // Subtotal
      doc.rect(TX, Y, TW, 24).fill(GRAY_LT).stroke(BORDER);
      doc.fontSize(9).fillColor(GRAY).font("Helvetica")
         .text("Subtotal:", TX + 10, Y + 7);
      doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold")
         .text(fmt(data.subtotal), TX + 10, Y + 7, { width: TW - 20, align: "right" });
      Y += 24;

      // Descuento
      const dp = parseFloat(data.discountPercent || "0");
      const da = parseFloat(data.discountAmount  || "0");
      if (dp > 0 && da > 0) {
        doc.rect(TX, Y, TW, 24).fill(WHITE).stroke(BORDER);
        doc.fontSize(9).fillColor(RED).font("Helvetica")
           .text(`Descuento (${dp}%):`, TX + 10, Y + 7);
        doc.fontSize(9).fillColor(RED).font("Helvetica-Bold")
           .text(`-${fmt(da)}`, TX + 10, Y + 7, { width: TW - 20, align: "right" });
        Y += 24;
      }

      // Total final
      doc.rect(TX, Y, TW, 34).fill(TEAL);
      doc.fontSize(11).fillColor(WHITE).font("Helvetica-Bold")
         .text("TOTAL:", TX + 10, Y + 10);
      doc.fontSize(14).fillColor(WHITE).font("Helvetica-Bold")
         .text(fmt(data.total), TX + 10, Y + 10, { width: TW - 20, align: "right" });
      Y += 34 + 20;

      // ─────────────────────────────────────────────────────────────────────
      // OBSERVACIONES (opcional)
      // ─────────────────────────────────────────────────────────────────────
      if (data.generalNotes && data.generalNotes.trim()) {
        if (Y + 60 > PH - 100) { doc.addPage(); Y = 40; }

        doc.rect(ML, Y, CW, 18).fill(DARK);
        doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
           .text("OBSERVACIONES", ML + 8, Y + 5);
        Y += 18;

        const noteLines = data.generalNotes.split("\n").filter(l => l.trim());
        let noteH = 12;
        for (const l of noteLines) noteH += doc.heightOfString(l, { width: CW - 20, lineGap: 1.5 }) + 4;
        doc.rect(ML, Y, CW, noteH).fill(GRAY_LT).stroke(BORDER);
        let ny = Y + 8;
        for (const line of noteLines) {
          doc.fontSize(8.5).fillColor(GRAY).font("Helvetica")
             .text(line, ML + 10, ny, { width: CW - 20, lineGap: 1.5 });
          ny += doc.heightOfString(line, { width: CW - 20, lineGap: 1.5 }) + 4;
        }
        Y += noteH + 14;
      }

      // ─────────────────────────────────────────────────────────────────────
      // TÉRMINOS Y CONDICIONES
      // ─────────────────────────────────────────────────────────────────────
      if (Y + 100 > PH - 80) { doc.addPage(); Y = 40; }

      doc.rect(ML, Y, CW, 18).fill(DARK);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("TÉRMINOS Y CONDICIONES", ML + 8, Y + 5);
      Y += 18;

      const terms = [
        "Tiempo de entrega: 3 a 4 semanas hábiles después de aprobación del diseño y primer abono.",
        "NO incluye: obra civil, plomería, instalación de gas ni trabajos de albañilería.",
        "Validez de esta cotización: 1 semana desde la fecha de emisión.",
        "Garantía: 6 meses en herrajes. Los materiales cuentan con garantía del fabricante.",
        "Los diseños y renders son propiedad exclusiva de Innovar Cocinas de Diseño.",
      ];
      const tBoxH = terms.length * 16 + 10;
      doc.rect(ML, Y, CW, tBoxH).fill(WHITE).stroke(BORDER);
      let ty = Y + 7;
      for (const term of terms) {
        doc.fontSize(8).fillColor(GRAY).font("Helvetica")
           .text(`• ${term}`, ML + 10, ty, { width: CW - 20 });
        ty += 16;
      }
      Y += tBoxH + 20;

      // ─────────────────────────────────────────────────────────────────────
      // FIRMAS
      // ─────────────────────────────────────────────────────────────────────
      if (Y + 70 > PH - 50) { doc.addPage(); Y = 40; }

      doc.moveTo(ML,           Y + 36).lineTo(ML + 190,       Y + 36).stroke(BORDER);
      doc.moveTo(PW - MR - 190, Y + 36).lineTo(PW - MR,        Y + 36).stroke(BORDER);

      doc.fontSize(8.5).fillColor(DARK).font("Helvetica-Bold")
         .text("Firma del Cliente", ML, Y + 40)
         .text("INNOVAR Cocinas de Diseño", PW - MR - 190, Y + 40, { width: 190, align: "right" });
      doc.fontSize(8).fillColor(GRAY_MID).font("Helvetica")
         .text(data.clientName, ML, Y + 52)
         .text("NIT: 10021456-1", PW - MR - 190, Y + 52, { width: 190, align: "right" });

      // ─────────────────────────────────────────────────────────────────────
      // FOOTER
      // ─────────────────────────────────────────────────────────────────────
      const FY = PH - 38;
      doc.rect(ML, FY, CW, 1).fill(TEAL);
      doc.fontSize(7.5).fillColor(TEAL_DARK).font("Helvetica-Bold")
         .text("Innovar Cocinas de Diseño", ML, FY + 6);
      doc.fontSize(7).fillColor(GRAY_MID).font("Helvetica")
         .text("cocinasintegralespereira.co  ·  313 680 2025  ·  Km 9 vía Cerritos, Pereira", ML, FY + 17);
      doc.fontSize(7).fillColor(GRAY_MID).font("Helvetica")
         .text("Gracias por confiar en nosotros", ML, FY + 6, { width: CW, align: "right" });

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);

    } catch (err: any) {
      reject(err);
    }
  });
}
