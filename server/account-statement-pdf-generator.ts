import PDFDocument from "pdfkit";
import { createWriteStream, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MovementEntry {
  id: number;
  date: string;
  typeLabel: string;      // "Anticipo", "Parcial", "Final", "Descuento", "Recargo"
  method: string;
  amount: number;
  movementType: string;   // "payment" | "discount" | "surcharge"
  notes?: string;
  runningBalance: number;
}

export interface AccountStatementData {
  generatedDate: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  projectName: string;
  workType: string;
  totalAgreed: number;
  movements: MovementEntry[];
  totalPaid: number;
  totalDiscounts: number;
  totalSurcharges: number;
  finalBalance: number;
}

const TEAL  = "#00BCD4";
const DARK  = "#1E2A3A";
const DGRAY = "#2A3A4A";
const WHITE = "#FFFFFF";
const RED   = "#DC2626";
const GREEN = "#22C55E";
const LTBG  = "#162030";
const MIDBG = "#1A2535";

function findLogo(): string | null {
  const tries = [
    path.join(__dirname, "public", "logo-original.png"),
    path.join(__dirname, "public", "logo-dark.jpg"),
    path.join(__dirname, "..", "client", "public", "logo-original.png"),
    path.join(__dirname, "..", "client", "public", "logo-dark.jpg"),
    path.join(process.cwd(), "client", "public", "logo-original.png"),
    path.join(process.cwd(), "innovar_logo.png"),
    path.join(__dirname, "..", "innovar_logo.png"),
  ];
  return tries.find(p => existsSync(p)) ?? null;
}

function fmt(v: number): string {
  return "$" + v.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export async function generateAccountStatementPDF(data: AccountStatementData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        autoFirstPage: true,
      });
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = 612;
      const ML = 36, MR = 36, CW = PW - ML - MR;

      // ── HEADER ──────────────────────────────────────────────────────────
      const HDR = 82;
      doc.rect(0, 0, PW, HDR).fill(DARK);
      doc.rect(0, HDR, PW, 2).fill(TEAL);

      const logoPath = findLogo();
      if (logoPath) {
        try { doc.image(logoPath, ML, 8, { height: 52, fit: [76, 52] }); } catch { /* */ }
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
         .text("Km 9 vía Cerritos · Pereira, Risaralda", LX, 45, { width: 200 })
         .text("313 680 2025 · cocinasintegralespereira.co", LX, 55, { width: 200 });

      // Bloque ESTADO DE CUENTA — derecha del header
      const BW = 190, BX = PW - MR - BW;
      doc.rect(BX, 10, BW, HDR - 18).fill("#162030");
      doc.rect(BX, 10, BW, 18).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
         .text("ESTADO DE CUENTA", BX + 8, 15, { width: BW - 16 });
      doc.fontSize(6.5).fillColor("#B0BEC5").font("Helvetica")
         .text("Proyecto:", BX + 8, 33, { width: 55 });
      doc.fontSize(7).fillColor(WHITE).font("Helvetica-Bold")
         .text(data.projectName, BX + 68, 33, { width: BW - 76 });
      doc.fontSize(6.5).fillColor("#B0BEC5").font("Helvetica")
         .text(`Generado: ${data.generatedDate}`, BX + 8, 48, { width: BW - 16 })
         .text(`Tipo de obra: ${data.workType}`, BX + 8, 58, { width: BW - 16 });

      // ── CLIENTE ──────────────────────────────────────────────────────────
      let Y = HDR + 14;
      const HF = (CW - 8) / 2;
      const RX = ML + HF + 8;

      doc.rect(ML, Y, CW, 16).fill(TEAL);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
         .text("INFORMACIÓN DEL CLIENTE Y PROYECTO", ML + 8, Y + 4);
      Y += 16;

      const infoH = 54;
      doc.rect(ML, Y, HF, infoH).fill(LTBG);
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
         .text(data.clientName, ML + 8, Y + 6, { width: HF - 16 });
      if (data.clientPhone) {
        doc.fontSize(7.5).fillColor("#90A4AE").font("Helvetica")
           .text(`Cel: ${data.clientPhone}`, ML + 8, Y + 20, { width: HF - 16 });
      }
      if (data.clientAddress) {
        doc.fontSize(7).fillColor("#6B7280").font("Helvetica")
           .text(data.clientAddress, ML + 8, Y + 32, { width: HF - 16 });
      }

      doc.rect(RX, Y, HF, infoH).fill(LTBG);
      doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
         .text(data.projectName, RX + 8, Y + 6, { width: HF - 16 });
      doc.fontSize(7.5).fillColor("#90A4AE").font("Helvetica")
         .text(data.workType, RX + 8, Y + 20, { width: HF - 16 });
      doc.fontSize(7.5).fillColor(TEAL).font("Helvetica-Bold")
         .text(`Total acordado: ${fmt(data.totalAgreed)}`, RX + 8, Y + 32, { width: HF - 16 });
      Y += infoH + 14;

      // ── TABLA DE MOVIMIENTOS ──────────────────────────────────────────────
      doc.rect(ML, Y, CW, 16).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("HISTORIAL DE MOVIMIENTOS", ML + 8, Y + 4);
      Y += 16;

      // Encabezados columnas
      // Col widths: Nro(24) Fecha(72) Tipo(88) Método(80) Valor(82) Saldo(94)
      const cols = {
        nro:    { x: ML,           w: 24  },
        fecha:  { x: ML + 24,      w: 74  },
        tipo:   { x: ML + 98,      w: 90  },
        metodo: { x: ML + 188,     w: 82  },
        valor:  { x: ML + 270,     w: 86  },
        saldo:  { x: ML + 356,     w: CW - 356 },
      };

      doc.rect(ML, Y, CW, 15).fill(DGRAY);
      doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
         .text("#",         cols.nro.x + 4,    Y + 4, { width: cols.nro.w })
         .text("FECHA",     cols.fecha.x + 4,  Y + 4, { width: cols.fecha.w })
         .text("TIPO",      cols.tipo.x + 4,   Y + 4, { width: cols.tipo.w })
         .text("MÉTODO",    cols.metodo.x + 4, Y + 4, { width: cols.metodo.w })
         .text("VALOR",     cols.valor.x + 4,  Y + 4, { width: cols.valor.w, align: "right" })
         .text("SALDO",     cols.saldo.x + 4,  Y + 4, { width: cols.saldo.w - 8, align: "right" });
      Y += 15;

      // Filas de movimientos
      if (data.movements.length === 0) {
        doc.rect(ML, Y, CW, 28).fill(LTBG);
        doc.fontSize(8.5).fillColor("#6B7280").font("Helvetica")
           .text("Sin movimientos registrados", ML, Y + 9, { width: CW, align: "center" });
        Y += 28;
      } else {
        data.movements.forEach((mov, i) => {
          const ROW_H = 20;
          const bg = i % 2 === 0 ? LTBG : MIDBG;

          // Salto de página si no hay espacio
          if (Y + ROW_H > doc.page.height - 100) {
            doc.addPage();
            Y = 20;
            // Re-dibujar encabezado de tabla en nueva página
            doc.rect(ML, Y, CW, 15).fill(DGRAY);
            doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
               .text("#",      cols.nro.x + 4,    Y + 4, { width: cols.nro.w })
               .text("FECHA",  cols.fecha.x + 4,  Y + 4, { width: cols.fecha.w })
               .text("TIPO",   cols.tipo.x + 4,   Y + 4, { width: cols.tipo.w })
               .text("MÉTODO", cols.metodo.x + 4, Y + 4, { width: cols.metodo.w })
               .text("VALOR",  cols.valor.x + 4,  Y + 4, { width: cols.valor.w, align: "right" })
               .text("SALDO",  cols.saldo.x + 4,  Y + 4, { width: cols.saldo.w - 8, align: "right" });
            Y += 15;
          }

          doc.rect(ML, Y, CW, ROW_H).fill(bg);

          // Borde izquierdo de color según tipo
          const accentColor = mov.movementType === "discount" ? "#F59E0B"
                            : mov.movementType === "surcharge" ? RED
                            : TEAL;
          doc.rect(ML, Y, 3, ROW_H).fill(accentColor);

          const isDiscount  = mov.movementType === "discount";
          const isSurcharge = mov.movementType === "surcharge";
          const valueColor  = isDiscount ? "#F59E0B" : isSurcharge ? RED : GREEN;
          const prefix      = isDiscount ? "-" : isSurcharge ? "+" : "";

          doc.fontSize(7.5).fillColor("#B0BEC5").font("Helvetica")
             .text(String(i + 1),     cols.nro.x + 6,    Y + 6, { width: cols.nro.w })
             .text(mov.date,          cols.fecha.x + 4,  Y + 6, { width: cols.fecha.w })
             .text(mov.typeLabel,     cols.tipo.x + 4,   Y + 6, { width: cols.tipo.w });
          doc.fontSize(7).fillColor("#78909C").font("Helvetica")
             .text(mov.method || "—", cols.metodo.x + 4, Y + 6, { width: cols.metodo.w });
          doc.fontSize(7.5).fillColor(valueColor).font("Helvetica-Bold")
             .text(prefix + fmt(mov.amount), cols.valor.x + 4, Y + 6, { width: cols.valor.w, align: "right" });

          const balanceColor = mov.runningBalance <= 0 ? GREEN : WHITE;
          doc.fontSize(7.5).fillColor(balanceColor).font("Helvetica-Bold")
             .text(fmt(Math.max(0, mov.runningBalance)), cols.saldo.x + 4, Y + 6, { width: cols.saldo.w - 8, align: "right" });

          Y += ROW_H;

          // Nota si la hay
          if (mov.notes && mov.notes.trim()) {
            doc.rect(ML, Y, CW, 13).fill(bg);
            doc.fontSize(6.5).fillColor("#6B7280").font("Helvetica")
               .text(`  Nota: ${mov.notes.trim()}`, ML + 16, Y + 3, { width: CW - 20 });
            Y += 13;
          }
        });
      }

      Y += 14;

      // ── RESUMEN FINAL ────────────────────────────────────────────────────
      if (Y + 100 > doc.page.height - 60) {
        doc.addPage();
        Y = 20;
      }

      doc.rect(ML, Y, CW, 16).fill(TEAL);
      doc.fontSize(8.5).fillColor(WHITE).font("Helvetica-Bold")
         .text("RESUMEN FINANCIERO", ML + 8, Y + 4);
      Y += 16;

      const ROW = 21;
      const drawSumRow = (label: string, value: string, bg: string, lColor: string, vColor: string, bold = false) => {
        doc.rect(ML, Y, CW, ROW).fill(bg);
        const font = bold ? "Helvetica-Bold" : "Helvetica";
        doc.fontSize(8.5).fillColor(lColor).font(font).text(label, ML + 12, Y + 6, { width: CW * 0.6 });
        doc.fontSize(8.5).fillColor(vColor).font("Helvetica-Bold")
           .text(value, ML + 12, Y + 6, { width: CW - 24, align: "right" });
        Y += ROW;
      };

      drawSumRow("Total acordado del proyecto", fmt(data.totalAgreed), LTBG, "#B0BEC5", WHITE);
      if (data.totalDiscounts > 0) {
        drawSumRow("Descuentos aplicados", `- ${fmt(data.totalDiscounts)}`, MIDBG, "#B0BEC5", "#F59E0B");
      }
      if (data.totalSurcharges > 0) {
        drawSumRow("Recargas adicionales", `+ ${fmt(data.totalSurcharges)}`, MIDBG, "#B0BEC5", RED);
      }
      drawSumRow("Total abonado", fmt(data.totalPaid), MIDBG, "#B0BEC5", GREEN);

      // Separador
      doc.rect(ML, Y, CW, 1).fill(TEAL);
      Y += 5;

      // Saldo final destacado
      const saldoPendiente = Math.max(0, data.finalBalance);
      const pagado = saldoPendiente <= 0;
      const saldoBg = pagado ? "#0D4A52" : "#3A1A1A";
      const saldoColor = pagado ? GREEN : RED;
      const saldoLabel = pagado ? "✓  PAGADO EN SU TOTALIDAD" : "SALDO PENDIENTE";

      doc.rect(ML, Y, CW, ROW + 4).fill(saldoBg);
      doc.rect(ML, Y, 4, ROW + 4).fill(saldoColor);
      doc.fontSize(10).fillColor(saldoColor).font("Helvetica-Bold")
         .text(saldoLabel, ML + 12, Y + 8, { width: CW * 0.55 });
      doc.fontSize(12).fillColor(saldoColor).font("Helvetica-Bold")
         .text(fmt(saldoPendiente), ML + 12, Y + 7, { width: CW - 24, align: "right" });
      Y += ROW + 4 + 16;

      // ── FOOTER EN TODAS LAS PÁGINAS ───────────────────────────────────────
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
           .text("cocinasintegralespereira.co  ·  313 680 2025  ·  innovarcocinasarte@gmail.com", ML, FY + 17);
        if (count > 1) {
          doc.fontSize(6.5).fillColor("#90A4AE").font("Helvetica")
             .text(`Página ${p + 1} de ${count}`, ML, FY + 7, { width: CW, align: "right" });
        }
      }

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (e: any) { reject(e); }
  });
}
