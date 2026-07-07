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

// ── Colores marca Innovar ────────────────────────────────────────────────────
const C = {
  teal:      "#00BCD4",
  tealDark:  "#0097A7",
  tealLight: "#E0F7FA",
  dark:      "#1A1A2E",
  gray:      "#4A5568",
  grayMid:   "#718096",
  grayLight: "#F7F8FA",
  grayBorder:"#E2E8F0",
  white:     "#FFFFFF",
  red:       "#E53E3E",
  black:     "#000000",
};

// Buscar logo en varias rutas posibles (dev y producción en Render)
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

function formatCurrency(value: string | number): string {
  const num = typeof value === "string"
    ? parseFloat(value.replace(/[^0-9.-]/g, "")) || 0
    : (value || 0);
  return isNaN(num)
    ? "$0"
    : `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function generateQuotationPDF(
  data: QuotationData,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 0, bottom: 40, left: 0, right: 0 },
        bufferPages: true,
      });

      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = 612;  // page width
      const PH = 792;  // page height
      const ML = 45;   // margin left
      const MR = 45;   // margin right
      const CW = PW - ML - MR; // content width = 522

      // ── HEADER BLOCK ──────────────────────────────────────────────────────
      // Fondo superior oscuro
      doc.rect(0, 0, PW, 110).fill(C.dark);

      // Franja teal en la parte baja del header
      doc.rect(0, 94, PW, 6).fill(C.teal);

      // Logo
      const logoPath = findLogo();
      if (logoPath) {
        try {
          doc.image(logoPath, ML, 12, { height: 72, fit: [150, 72] });
        } catch {}
      } else {
        // Texto del logo si no hay imagen
        doc.fontSize(22).fillColor(C.teal).font("Helvetica-Bold")
           .text("INNOVAR", ML, 22);
        doc.fontSize(9).fillColor(C.white).font("Helvetica")
           .text("COCINAS DE DISEÑO", ML, 48);
      }

      // Info contacto — derecha del header
      doc.fontSize(8).fillColor(C.white).font("Helvetica");
      const contactX = PW - MR - 200;
      doc.text("Km 9 vía Cerritos · Pereira, Risaralda", contactX, 20, { width: 200, align: "right" });
      doc.text("313 680 2025", contactX, 32, { width: 200, align: "right" });
      doc.text("ventas@cocinasintegralespereira.co", contactX, 44, { width: 200, align: "right" });
      doc.text("cocinasintegralespereira.co", contactX, 56, { width: 200, align: "right" });
      doc.fontSize(7.5).fillColor(C.teal).font("Helvetica-Bold")
         .text("NIT: 10021456-1", contactX, 70, { width: 200, align: "right" });

      // ── BANNER COTIZACIÓN ─────────────────────────────────────────────────
      // Bloque teal con número de cotización
      doc.rect(0, 100, PW, 52).fill(C.tealLight);

      // Número de cotización
      doc.fontSize(9).fillColor(C.grayMid).font("Helvetica")
         .text("COTIZACIÓN", ML, 112);
      doc.fontSize(13).fillColor(C.tealDark).font("Helvetica-Bold")
         .text(data.quotationNumber, ML, 124);

      // Versión si aplica
      if (data.versionNumber && data.versionNumber > 1) {
        doc.fontSize(8).fillColor(C.gray).font("Helvetica")
           .text(`Versión v${data.versionNumber}`, ML + 260, 119);
      }

      // Fecha y validez — derecha
      const infoRightX = PW - MR - 200;
      doc.fontSize(8).fillColor(C.grayMid).font("Helvetica")
         .text(`Fecha: ${data.date}`, infoRightX, 112, { width: 200, align: "right" });
      doc.fontSize(8).fillColor(C.gray).font("Helvetica")
         .text(`Válida hasta: ${data.validUntil}`, infoRightX, 124, { width: 200, align: "right" });

      // Forma de pago inline
      doc.fontSize(8).fillColor(C.tealDark).font("Helvetica-Bold")
         .text("Forma de pago: 60% inicial — 40% al finalizar obra", ML, 138, { width: CW });

      let Y = 165;

      // ── BLOQUE CLIENTE ────────────────────────────────────────────────────
      // Encabezado
      doc.rect(ML, Y, CW, 20).fill(C.teal);
      doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
         .text("DATOS DEL CLIENTE", ML + 8, Y + 6);
      Y += 20;

      // Contenido cliente
      const clientBoxH = data.clientPhone || data.clientAddress || data.clientEmail ? 54 : 36;
      doc.rect(ML, Y, CW, clientBoxH).fill(C.white)
         .rect(ML, Y, CW, clientBoxH).stroke(C.grayBorder);

      doc.fontSize(12).fillColor(C.dark).font("Helvetica-Bold")
         .text(data.clientName, ML + 10, Y + 8);

      let clientDetailY = Y + 24;
      const clientDetails: string[] = [];
      if (data.clientPhone)  clientDetails.push(`Tel: ${data.clientPhone}`);
      if (data.clientAddress) clientDetails.push(`Dir: ${data.clientAddress}`);
      if (data.clientEmail)  clientDetails.push(data.clientEmail);
      if (clientDetails.length > 0) {
        doc.fontSize(8.5).fillColor(C.gray).font("Helvetica")
           .text(clientDetails.join("    "), ML + 10, clientDetailY, { width: CW - 20 });
      }
      Y += clientBoxH + 12;

      // ── DATOS DEL PROYECTO ────────────────────────────────────────────────
      doc.rect(ML, Y, CW, 20).fill(C.dark);
      doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
         .text("DATOS DEL PROYECTO", ML + 8, Y + 6);
      Y += 20;

      doc.rect(ML, Y, CW, 28).fill(C.white)
         .rect(ML, Y, CW, 28).stroke(C.grayBorder);

      // Tres columnas: Vendedor / Trabajo / — 
      const colW = CW / 3;
      doc.fontSize(7.5).fillColor(C.grayMid).font("Helvetica")
         .text("ASESOR", ML + 10, Y + 5)
         .text("TIPO DE TRABAJO", ML + colW + 10, Y + 5);
      doc.fontSize(9).fillColor(C.dark).font("Helvetica-Bold")
         .text(data.vendorName, ML + 10, Y + 15, { width: colW - 15 })
         .text(data.productType, ML + colW + 10, Y + 15, { width: colW - 15 });
      Y += 28 + 14;

      // ── TABLA DE ÍTEMS ────────────────────────────────────────────────────
      // Encabezado tabla
      doc.rect(ML, Y, CW, 22).fill(C.teal);
      doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold");
      doc.text("#",           ML + 6,        Y + 7, { width: 20 });
      doc.text("DESCRIPCIÓN", ML + 28,       Y + 7, { width: 330 });
      doc.text("CANT.",       ML + 365,      Y + 7, { width: 40, align: "center" });
      doc.text("VALOR TOTAL", ML + 412,      Y + 7, { width: 100, align: "right" });
      Y += 22;

      let rowAlt = false;
      for (const item of data.items) {
        // Calcular altura del texto de descripción
        const descH = doc.heightOfString(item.description, {
          width: 330,
          lineGap: 1.5,
          font: "Helvetica",
          size: 8.5,
        });
        const rowH = Math.max(descH + 14, 28);

        // Nueva página si es necesario
        if (Y + rowH > PH - 160) {
          doc.addPage();
          Y = 50;
          // Re-dibujar encabezado de tabla en página nueva
          doc.rect(ML, Y, CW, 22).fill(C.teal);
          doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold");
          doc.text("#",           ML + 6,   Y + 7, { width: 20 });
          doc.text("DESCRIPCIÓN", ML + 28,  Y + 7, { width: 330 });
          doc.text("CANT.",       ML + 365, Y + 7, { width: 40, align: "center" });
          doc.text("VALOR TOTAL", ML + 412, Y + 7, { width: 100, align: "right" });
          Y += 22;
        }

        // Fondo fila
        doc.rect(ML, Y, CW, rowH).fill(rowAlt ? C.grayLight : C.white)
           .rect(ML, Y, CW, rowH).stroke(C.grayBorder);

        // Línea izquierda teal por ítem
        doc.rect(ML, Y, 3, rowH).fill(C.teal);

        // Número ítem
        doc.fontSize(9).fillColor(C.tealDark).font("Helvetica-Bold")
           .text(item.itemNumber.toString(), ML + 7, Y + 8, { width: 18, align: "center" });

        // Descripción
        doc.fontSize(8.5).fillColor(C.dark).font("Helvetica")
           .text(item.description, ML + 28, Y + 7, { width: 330, lineGap: 1.5 });

        // Cantidad
        doc.fontSize(9).fillColor(C.gray).font("Helvetica")
           .text(item.quantity, ML + 365, Y + 8, { width: 40, align: "center" });

        // Precio
        doc.fontSize(9).fillColor(C.dark).font("Helvetica-Bold")
           .text(formatCurrency(item.totalPrice), ML + 412, Y + 8, { width: 100, align: "right" });

        Y += rowH;
        rowAlt = !rowAlt;
      }

      Y += 16;

      // ── SECCIÓN TOTALES ───────────────────────────────────────────────────
      // Verificar espacio
      if (Y + 120 > PH - 60) {
        doc.addPage();
        Y = 50;
      }

      const totW = 230;
      const totX = PW - MR - totW;

      // Subtotal
      doc.rect(totX, Y, totW, 26).fill(C.grayLight).stroke(C.grayBorder);
      doc.fontSize(9).fillColor(C.gray).font("Helvetica")
         .text("Subtotal:", totX + 10, Y + 8);
      doc.fontSize(9).fillColor(C.dark).font("Helvetica-Bold")
         .text(formatCurrency(data.subtotal), totX + 10, Y + 8, { width: totW - 20, align: "right" });
      Y += 26;

      // Descuento si aplica
      const discPct = parseFloat(data.discountPercent || "0");
      const discAmt = parseFloat(data.discountAmount || "0");
      if (discPct > 0 && discAmt > 0) {
        doc.rect(totX, Y, totW, 26).fill("#FFF5F5").stroke(C.grayBorder);
        doc.fontSize(9).fillColor(C.red).font("Helvetica")
           .text(`Descuento (${discPct}%):`, totX + 10, Y + 8);
        doc.fontSize(9).fillColor(C.red).font("Helvetica-Bold")
           .text(`-${formatCurrency(discAmt)}`, totX + 10, Y + 8, { width: totW - 20, align: "right" });
        Y += 26;
      }

      // Total final
      doc.rect(totX, Y, totW, 38).fill(C.teal);
      doc.fontSize(11).fillColor(C.white).font("Helvetica-Bold")
         .text("TOTAL:", totX + 10, Y + 12);
      doc.fontSize(14).fillColor(C.white).font("Helvetica-Bold")
         .text(formatCurrency(data.total), totX + 10, Y + 12, { width: totW - 20, align: "right" });
      Y += 38 + 24;

      // ── OBSERVACIONES ────────────────────────────────────────────────────
      if (data.generalNotes && data.generalNotes.trim()) {
        if (Y + 60 > PH - 80) { doc.addPage(); Y = 50; }

        doc.rect(ML, Y, CW, 20).fill(C.dark);
        doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
           .text("OBSERVACIONES", ML + 8, Y + 6);
        Y += 20;

        doc.rect(ML, Y, CW, 10).fill(C.white); // padding top
        const noteLines = data.generalNotes.split("\n").filter(l => l.trim());
        const noteH = noteLines.reduce((acc, l) => acc + doc.heightOfString(l, { width: CW - 20 }) + 4, 0);
        const noteBoxH = noteH + 16;
        doc.rect(ML, Y, CW, noteBoxH).fill(C.grayLight).stroke(C.grayBorder);
        let nY = Y + 8;
        for (const line of noteLines) {
          doc.fontSize(8.5).fillColor(C.gray).font("Helvetica")
             .text(line, ML + 10, nY, { width: CW - 20, lineGap: 1.5 });
          nY += doc.heightOfString(line, { width: CW - 20 }) + 4;
        }
        Y += noteBoxH + 14;
      }

      // ── TÉRMINOS Y CONDICIONES ────────────────────────────────────────────
      if (Y + 120 > PH - 60) { doc.addPage(); Y = 50; }

      doc.rect(ML, Y, CW, 20).fill(C.dark);
      doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
         .text("TÉRMINOS Y CONDICIONES", ML + 8, Y + 6);
      Y += 20;

      const terms = [
        "Tiempo de entrega: 3 a 4 semanas hábiles después de aprobación del diseño y primer abono.",
        "NO incluye: obra civil, plomería, instalación de gas ni trabajos de albañilería.",
        "Validez de la cotización: 1 semana desde la fecha de emisión.",
        "Garantía: 6 meses en herrajes. Los materiales cuentan con garantía del fabricante.",
        "Los diseños y renders son propiedad de Innovar Cocinas de Diseño.",
      ];

      const termsBoxH = terms.length * 16 + 12;
      doc.rect(ML, Y, CW, termsBoxH).fill(C.white).stroke(C.grayBorder);
      let tY = Y + 8;
      for (const term of terms) {
        doc.fontSize(8).fillColor(C.gray).font("Helvetica")
           .text(`• ${term}`, ML + 10, tY, { width: CW - 20 });
        tY += 16;
      }
      Y += termsBoxH + 20;

      // ── FIRMAS ────────────────────────────────────────────────────────────
      if (Y + 70 > PH - 40) { doc.addPage(); Y = 50; }

      // Líneas de firma
      doc.moveTo(ML, Y + 40).lineTo(ML + 180, Y + 40).stroke(C.grayBorder);
      doc.moveTo(PW - MR - 180, Y + 40).lineTo(PW - MR, Y + 40).stroke(C.grayBorder);

      doc.fontSize(8.5).fillColor(C.dark).font("Helvetica-Bold")
         .text("Firma del Cliente", ML, Y + 44);
      doc.fontSize(8.5).fillColor(C.dark).font("Helvetica-Bold")
         .text("INNOVAR Cocinas de Diseño", PW - MR - 180, Y + 44, { width: 180, align: "right" });
      doc.fontSize(7.5).fillColor(C.grayMid).font("Helvetica")
         .text(data.clientName, ML, Y + 56);
      doc.fontSize(7.5).fillColor(C.teal).font("Helvetica")
         .text("NIT: 10021456-1", PW - MR - 180, Y + 56, { width: 180, align: "right" });

      // ── FOOTER ────────────────────────────────────────────────────────────
      const footerY = PH - 36;
      doc.rect(0, footerY, PW, 36).fill(C.dark);
      doc.fontSize(7.5).fillColor(C.teal).font("Helvetica-Bold")
         .text("INNOVAR COCINAS DE DISEÑO", ML, footerY + 7, { width: CW / 2 });
      doc.fontSize(7).fillColor(C.white).font("Helvetica")
         .text("cocinasintegralespereira.co  ·  313 680 2025  ·  Pereira, Colombia", ML, footerY + 19, { width: CW });
      doc.fontSize(7).fillColor(C.grayMid).font("Helvetica")
         .text("Gracias por confiar en nosotros", ML, footerY + 7, { width: CW, align: "right" });

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);

    } catch (err: any) {
      reject(err);
    }
  });
}
