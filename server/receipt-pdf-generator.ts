import PDFDocument from "pdfkit";
import { createWriteStream, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ReceiptData {
  receiptNumber: string;        // REC-2026-000123
  paymentDate: string;          // "15 de julio de 2026"
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  projectName: string;
  workType: string;
  paymentType: string;          // "Adelanto", "Final", "Parcial"
  paymentMethod: string;        // "Transferencia", "Efectivo"
  totalProject: number;         // Valor total acordado
  previousPayments: number;     // Suma de pagos anteriores
  thisPayment: number;          // Este pago
  balance: number;              // Saldo pendiente
  notes?: string;
}

const TEAL  = "#00BCD4";
const DARK  = "#1E2A3A";
const MGRAY = "#6B7280";
const WHITE = "#FFFFFF";
const RED   = "#DC2626";
const GREEN = "#22C55E";

function findLogo(): string | null {
  const tries = [
    path.join(__dirname, "public", "logo-original.png"),
    path.join(__dirname, "public", "logo-dark.jpg"),
    path.join(__dirname, "..", "client", "public", "logo-original.png"),
    path.join(__dirname, "..", "client", "public", "logo-dark.jpg"),
    path.join(process.cwd(), "client", "public", "logo-original.png"),
    path.join(process.cwd(), "innovar_logo.png"),
    path.join(__dirname, "..", "innovar_logo.png"),
    path.join(__dirname, "..", "..", "innovar_logo.png"),
  ];
  return tries.find(p => existsSync(p)) ?? null;
}

function fmt(v: number): string {
  return `$${v.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function generateReceiptPDF(data: ReceiptData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true });
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = 612, PH = 792;
      const ML = 40, MR = 40, CW = PW - ML - MR; // 532px

      // ══════════════════════════════════════
      // HEADER — 82px fondo oscuro
      // ══════════════════════════════════════
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
         .text("Km 9 vía Cerritos · Pereira, Risaralda", LX, 45, { width: 210 })
         .text("313 680 2025 · cocinasintegralespereira.co", LX, 55, { width: 210 });

      // Bloque RECIBO — derecha del header
      const BW = 190, BX = PW - MR - BW;
      doc.rect(BX, 10, BW, HDR - 18).fill("#162030");
      doc.rect(BX, 10, BW, 18).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold").text("RECIBO DE PAGO", BX + 8, 15);
      doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
         .text(data.receiptNumber, BX + 8, 33, { width: BW - 16 });
      doc.fontSize(6.5).fillColor("#B0BEC5").font("Helvetica")
         .text(`Fecha:  ${data.paymentDate}`, BX + 8, 46, { width: BW - 16 })
         .text(`Tipo:   ${data.paymentType}`, BX + 8, 56, { width: BW - 16 })
         .text(`Método: ${data.paymentMethod}`, BX + 8, 66, { width: BW - 16 });

      // ══════════════════════════════════════
      // SECCIÓN CLIENTE / PROYECTO
      // ══════════════════════════════════════
      let Y = HDR + 14;
      const HF = (CW - 8) / 2;
      const RX = ML + HF + 8;

      // Cabeceras
      doc.rect(ML, Y, HF, 16).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold").text("CLIENTE", ML + 8, Y + 4);
      doc.rect(RX, Y, HF, 16).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold").text("PROYECTO", RX + 8, Y + 4);
      Y += 16;

      // Contenido cliente
      const boxH = 54;
      doc.rect(ML, Y, HF, boxH).fill("#162030");
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold").text(data.clientName, ML + 8, Y + 6, { width: HF - 16 });
      if (data.clientPhone) {
        doc.fontSize(7.5).fillColor("#90A4AE").font("Helvetica").text(`📞 ${data.clientPhone}`, ML + 8, Y + 20, { width: HF - 16 });
      }
      if (data.clientAddress) {
        doc.fontSize(7).fillColor(MGRAY).font("Helvetica").text(data.clientAddress, ML + 8, Y + 32, { width: HF - 16 });
      }

      // Contenido proyecto
      doc.rect(RX, Y, HF, boxH).fill("#162030");
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold").text(data.projectName, RX + 8, Y + 6, { width: HF - 16 });
      doc.fontSize(7.5).fillColor("#90A4AE").font("Helvetica").text(data.workType, RX + 8, Y + 20, { width: HF - 16 });
      Y += boxH + 16;

      // ══════════════════════════════════════
      // RESUMEN FINANCIERO
      // ══════════════════════════════════════
      doc.rect(ML, Y, CW, 16).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold").text("RESUMEN FINANCIERO", ML + 8, Y + 4);
      Y += 16;

      // Tabla financiera
      const COL1 = ML + 8;
      const COL2 = PW - MR - 8;
      const ROW_H = 22;

      // Fila helper
      const drawRow = (label: string, value: string, bgColor: string, labelColor: string, valueColor: string, bold = false) => {
        doc.rect(ML, Y, CW, ROW_H).fill(bgColor);
        const font = bold ? "Helvetica-Bold" : "Helvetica";
        const size = bold ? 9 : 8.5;
        doc.fontSize(size).fillColor(labelColor).font(font).text(label, COL1, Y + 6, { width: CW / 2 });
        doc.fontSize(size).fillColor(valueColor).font("Helvetica-Bold").text(value, COL1, Y + 6, { width: CW - 16, align: "right" });
        Y += ROW_H;
      };

      // Línea separadora
      const drawDivider = () => {
        doc.rect(ML, Y, CW, 1).fill(TEAL);
        Y += 5;
      };

      drawRow("Valor total del proyecto", fmt(data.totalProject), "#1A2535", "#B0BEC5", WHITE);
      drawRow("Abonos anteriores", fmt(data.previousPayments), "#162030", "#B0BEC5", "#90A4AE");
      drawDivider();

      // ESTE PAGO — resaltado en TEAL
      doc.rect(ML, Y, CW, ROW_H + 4).fill("#0D4A52");
      doc.rect(ML, Y, 4, ROW_H + 4).fill(TEAL);
      doc.fontSize(10).fillColor(TEAL).font("Helvetica-Bold").text("ESTE PAGO", COL1 + 4, Y + 7, { width: CW / 2 });
      doc.fontSize(12).fillColor(TEAL).font("Helvetica-Bold").text(fmt(data.thisPayment), COL1 + 4, Y + 6, { width: CW - 20, align: "right" });
      Y += ROW_H + 4 + 2;

      drawDivider();

      // SALDO PENDIENTE
      const saldoColor = data.balance <= 0 ? GREEN : RED;
      const saldoLabel = data.balance <= 0 ? "SALDO: PAGADO EN SU TOTALIDAD ✓" : "SALDO PENDIENTE";
      drawRow(saldoLabel, fmt(Math.max(0, data.balance)), "#1A2535", saldoColor, saldoColor, true);

      Y += 16;

      // ══════════════════════════════════════
      // NOTAS (si hay)
      // ══════════════════════════════════════
      if (data.notes && data.notes.trim()) {
        doc.rect(ML, Y, CW, 14).fill("#162030");
        doc.fontSize(7.5).fillColor(TEAL).font("Helvetica-Bold").text("NOTAS", ML + 8, Y + 3);
        Y += 14;
        doc.rect(ML, Y, CW, 1).fill("#2A3A4A");
        Y += 4;
        doc.fontSize(8).fillColor("#B0BEC5").font("Helvetica").text(data.notes.trim(), ML + 8, Y + 4, { width: CW - 16 });
        const notesHeight = doc.heightOfString(data.notes.trim(), { width: CW - 16 });
        doc.rect(ML, Y, CW, notesHeight + 12).strokeColor("#2A3A4A").lineWidth(0.5).stroke();
        Y += notesHeight + 16;
      }

      Y += 12;

      // ══════════════════════════════════════
      // AVISO LEGAL
      // ══════════════════════════════════════
      doc.rect(ML, Y, CW, 28).fill("#0D1B2A");
      doc.rect(ML, Y, CW, 1).fill(TEAL);
      doc.fontSize(7).fillColor("#78909C").font("Helvetica")
         .text(
           "Este documento es un comprobante de pago. Conserve este recibo como soporte de su transacción.",
           ML + 8, Y + 5, { width: CW - 16, align: "center" }
         )
         .text(
           "Para consultas: innovarcocinasarte@gmail.com · WhatsApp 313 680 2025",
           ML + 8, Y + 16, { width: CW - 16, align: "center" }
         );

      // ══════════════════════════════════════
      // FOOTER en todas las páginas
      // ══════════════════════════════════════
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
           .text("Gracias por su pago", ML, FY + 7, { width: CW, align: "right" });
      }

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (e: any) { reject(e); }
  });
}
