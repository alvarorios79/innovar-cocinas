import PDFDocument from "pdfkit";
import { createWriteStream, readFileSync } from "fs";
import path from "path";

interface QuotationItem {
  itemNumber: number;
  description: string;
  quantity: string;
  unitPrice?: string;
  totalPrice: string;
}

interface QuotationData {
  quotationNumber: string;
  date: string;
  clientName: string;
  vendorName: string;
  workType: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: string;
  fixedCosts: string;
  total: string;
}

export async function generateQuotationPDF(
  data: QuotationData,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Crear documento PDF
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Stream para guardar el archivo
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      // Colores corporativos
      const turquoise = "#14B8A6";
      const gray = "#6B7280";
      const darkGray = "#374151";

      // Logo
      const logoPath = path.join(__dirname, "../innovar_logo.png");
      try {
        doc.image(logoPath, 50, 40, { width: 80, height: 102 });
      } catch (e) {
        console.log("[PDF] Logo no encontrado, continuando sin logo");
      }

      // Información de contacto (derecha)
      doc.fontSize(9).fillColor(darkGray);
      doc.text("INNOVAR", 400, 50, { align: "right" });
      doc.text("COCINAS DE DISEÑO", 400, 65, { align: "right" });
      doc.text("K9 vía Cerritos a Pereira", 400, 85, { align: "right" });
      doc.text("313 680 2025", 400, 100, { align: "right" });
      doc.text("innovarcocinasintegralespereir@gmail.com", 400, 115, {
        align: "right",
      });
      doc.text("Cuenta Bancolombia: 60200000100", 400, 130, { align: "right" });

      // Número de cotización y fecha
      doc.moveDown(3);
      doc.fontSize(11).fillColor(turquoise).font("Helvetica-Bold");
      doc.text(`Cotización N° ${data.quotationNumber}`, 400, 160, {
        align: "right",
      });
      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      doc.text(`Fecha: ${data.date}`, 400, 178, { align: "right" });

      // Cliente
      doc.moveDown(2);
      const clientY = 200;
      doc
        .fillColor(turquoise)
        .rect(50, clientY, 512, 25)
        .fill();
      doc
        .fontSize(11)
        .fillColor("white")
        .font("Helvetica-Bold")
        .text("CLIENTE", 60, clientY + 8);
      doc
        .fontSize(10)
        .fillColor(darkGray)
        .font("Helvetica")
        .text(data.clientName, 50, clientY + 35);

      // Información del proyecto
      const infoY = clientY + 60;
      doc
        .fillColor(turquoise)
        .rect(50, infoY, 512, 20)
        .fill();
      doc.fontSize(9).fillColor("white").font("Helvetica-Bold");
      doc.text("VENDEDOR", 60, infoY + 6);
      doc.text("TRABAJO", 200, infoY + 6);
      doc.text("FORMA DE PAGO", 340, infoY + 6);

      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      doc.text(data.vendorName, 60, infoY + 25);
      doc.text(data.workType, 200, infoY + 25);
      doc.text("60% inicial, 40% final", 340, infoY + 25);

      // Tabla de items
      let currentY = infoY + 55;

      // Encabezado de tabla
      doc
        .fillColor(turquoise)
        .rect(50, currentY, 512, 20)
        .fill();
      doc.fontSize(9).fillColor("white").font("Helvetica-Bold");
      doc.text("ÍTEM", 60, currentY + 6);
      doc.text("DESCRIPCIÓN", 110, currentY + 6);
      doc.text("CANTIDAD", 360, currentY + 6);
      doc.text("PRECIO UNIT.", 430, currentY + 6);
      doc.text("TOTAL", 510, currentY + 6, { align: "right" });

      currentY += 25;

      // Items
      doc.fontSize(8).fillColor(darkGray).font("Helvetica");
      let rowBackground = false;

      for (const item of data.items) {
        // Fondo alternado
        if (rowBackground) {
          doc.fillColor("#F3F4F6").rect(50, currentY, 512, 20).fill();
        }

        // Verificar si necesitamos nueva página
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.fillColor(darkGray);
        doc.text(item.itemNumber.toString(), 60, currentY + 5);
        doc.text(
          item.description.substring(0, 50) +
            (item.description.length > 50 ? "..." : ""),
          110,
          currentY + 5,
          { width: 240 }
        );
        doc.text(item.quantity, 360, currentY + 5);
        if (item.unitPrice) {
          doc.text(formatCurrency(item.unitPrice), 430, currentY + 5);
        }
        doc.text(formatCurrency(item.totalPrice), 510, currentY + 5, {
          align: "right",
        });

        currentY += 25;
        rowBackground = !rowBackground;
      }

      // Totales
      currentY += 10;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Subtotal:", 400, currentY);
      doc.text(formatCurrency(data.subtotal), 510, currentY, {
        align: "right",
      });

      currentY += 20;
      doc.text("Transporte e imprevistos:", 400, currentY);
      doc.text(formatCurrency(data.fixedCosts), 510, currentY, {
        align: "right",
      });

      currentY += 30;
      doc
        .fillColor(turquoise)
        .rect(380, currentY - 5, 182, 30)
        .fill();
      doc.fontSize(12).fillColor("white");
      doc.text("TOTAL:", 390, currentY + 5);
      doc.text(formatCurrency(data.total), 510, currentY + 5, {
        align: "right",
      });

      // Términos y condiciones
      currentY += 50;
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(11).fillColor(turquoise).font("Helvetica-Bold");
      doc.text("TÉRMINOS Y CONDICIONES", 50, currentY);

      currentY += 20;
      doc.fontSize(9).fillColor(darkGray).font("Helvetica");

      const terms = [
        `• Forma de pago: 60% inicial, 40% al finalizar obra`,
        `• Tiempo de entrega: 25 días hábiles después de aprobar el diseño`,
        `• NO incluye: Obra civil, plomería, instalación de gas`,
        `• Validez de la cotización: 1 semana`,
        `• Garantía: 6 meses en herrajes`,
      ];

      for (const term of terms) {
        doc.text(term, 50, currentY, { width: 512 });
        currentY += 18;
      }

      // Firmas
      currentY += 30;
      if (currentY > 680) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("_______________________", 80, currentY);
      doc.text("_______________________", 350, currentY);

      currentY += 20;
      doc.fontSize(9).font("Helvetica");
      doc.text("Firma del Cliente", 80, currentY);
      doc.text("INNOVAR Cocinas de Diseño", 350, currentY);

      // Footer
      const footerY = 750;
      doc.fontSize(10).fillColor(turquoise).font("Helvetica-Bold");
      doc.text(
        "Gracias por contar con nuestros servicios",
        0,
        footerY,
        { align: "center", width: 612 }
      );

      // Finalizar documento
      doc.end();

      stream.on("finish", () => {
        console.log(`[PDF] Generado exitosamente: ${outputPath}`);
        resolve();
      });

      stream.on("error", (error) => {
        console.error(`[PDF] Error al guardar: ${error.message}`);
        reject(error);
      });
    } catch (error: any) {
      console.error(`[PDF] Error al generar: ${error.message}`);
      reject(error);
    }
  });
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
