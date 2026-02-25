import PDFDocument from "pdfkit";
import { createWriteStream, readFileSync } from "fs";
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
  vendorName: string;
  productType: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: string;
  transportCost: string;
  discountPercent?: string; // Porcentaje de descuento
  discountAmount?: string; // Monto del descuento
  total: string;
  generalNotes?: string; // Notas generales personalizadas
  versionNumber?: number; // Número de versión (v1, v2, etc.)
  baseQuotationNumber?: string; // Número de cotización base si es versión adicional
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

      // Logo (izquierda)
      const logoPath = path.join(__dirname, "../innovar_logo.png");
      try {
        doc.image(logoPath, 50, 35, { width: 70, height: 90 });
      } catch (e) {
        // Logo no encontrado, continuar sin logo
      }

      // Información de contacto (centro-izquierda, al lado del logo)
      doc.fontSize(8).fillColor(darkGray).font("Helvetica");
      doc.text("Km 9 vía Cerritos a Pereira", 130, 45);
      doc.text("313 680 2025", 130, 57);
      doc.text("ventas@cocinasintegralespereira.co", 130, 69);
      doc.text("Bancolombia Ahorros: 11533034332", 130, 81);

      // Numero de cotizacion (derecha, destacado) - separado en dos lineas
      doc.fontSize(13).fillColor(turquoise).font("Helvetica-Bold");
      doc.text(`Cotizacion N°`, 350, 38, {
        align: "right",
        width: 200,
      });
      doc.text(`${data.quotationNumber}`, 350, 53, {
        align: "right",
        width: 200,
      });
      
      // Numero de version si aplica
      let versionY = 68;
      if (data.versionNumber && data.versionNumber > 1) {
        doc.fontSize(9).fillColor(darkGray).font("Helvetica");
        doc.text(`Version: v${data.versionNumber}`, 350, versionY, { align: "right", width: 200 });
        versionY += 12;
        
        // Referencia a cotizacion base si es version adicional
        if (data.baseQuotationNumber) {
          doc.fontSize(8).fillColor("#9CA3AF").font("Helvetica");
          doc.text(`(Base: COT-${data.baseQuotationNumber})`, 350, versionY, { align: "right", width: 200 });
          versionY += 12;
        }
      }
      
      // Fecha y validez (derecha, mas abajo)
      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      doc.text(`Fecha: ${data.date}`, 350, versionY + 8, { align: "right", width: 200 });
      doc.text(`Valida hasta: ${data.validUntil}`, 350, versionY + 22, { align: "right", width: 200 });

      // Línea separadora
      doc.strokeColor(turquoise).lineWidth(1);
      doc.moveTo(50, 130).lineTo(562, 130).stroke();

      // Cliente
      const clientY = 140;
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
      doc.text(data.productType, 200, infoY + 25);
      doc.text("60% inicial, 40% final", 340, infoY + 25);

      // Tabla de items
      let currentY = infoY + 55;

      // Encabezado de tabla - Ajustado para mejor distribución
      doc
        .fillColor(turquoise)
        .rect(50, currentY, 512, 20)
        .fill();
      doc.fontSize(9).fillColor("white").font("Helvetica-Bold");
      doc.text("ÍTEM", 60, currentY + 6);
      doc.text("DESCRIPCIÓN", 100, currentY + 6);
      doc.text("CANT.", 370, currentY + 6);
      doc.text("V.UNITARIO", 410, currentY + 6);
      doc.text("TOTAL", 500, currentY + 6, { align: "right" });

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
        
        // Calcular altura necesaria para la descripción
        const descriptionHeight = doc.heightOfString(item.description, { width: 260 });
        
        // Renderizar descripción completa con saltos de línea
        doc.text(
          item.description,
          100,
          currentY + 5,
          { width: 260, lineGap: 2 }
        );
        
        // Cantidad, precio unitario y total alineados a la derecha
        doc.fontSize(8).fillColor(darkGray).font("Helvetica");
        doc.text(item.quantity, 370, currentY + 5, { width: 30, align: "center" });
        if (item.unitPrice) {
          doc.text(formatCurrency(item.unitPrice), 410, currentY + 5, { width: 80, align: "right" });
        }
        doc.text(formatCurrency(item.totalPrice), 500, currentY + 5, {
          width: 50,
          align: "right",
        });

        // Ajustar currentY según la altura de la descripción
        currentY += Math.max(descriptionHeight + 10, 25);
        rowBackground = !rowBackground;
      }

      // Sección de totales (subtotal, descuento, total)
      currentY += 30;
      
      // Subtotal
      doc.fontSize(10).fillColor(darkGray).font("Helvetica");
      doc.text("Subtotal:", 360, currentY);
      doc.text(formatCurrency(data.subtotal), 360, currentY, {
        width: 195,
        align: "right",
      });
      currentY += 18;
      
      // Descuento (solo si hay descuento)
      const discountPercent = parseFloat(data.discountPercent || '0');
      const discountAmount = parseFloat(data.discountAmount || '0');
      if (discountPercent > 0 && discountAmount > 0) {
        doc.fillColor("#DC2626"); // Rojo para el descuento
        doc.text(`Descuento (${discountPercent}%):`, 360, currentY);
        doc.text(`-${formatCurrency(discountAmount.toString())}`, 360, currentY, {
          width: 195,
          align: "right",
        });
        currentY += 18;
      }
      
      // Total final
      currentY += 5;
      doc
        .fillColor(turquoise)
        .rect(350, currentY, 212, 32)
        .fill();
      doc.fontSize(13).fillColor("white").font("Helvetica-Bold");
      doc.text("TOTAL:", 360, currentY + 9);
      doc.text(formatCurrency(data.total), 360, currentY + 9, {
        width: 195,
        align: "right",
      });

      // Observaciones Generales (si existen)
      if (data.generalNotes && data.generalNotes.trim()) {
        currentY += 15;
        if (currentY > 650) {
          doc.addPage();
          currentY = 50;
        }

        doc.fontSize(11).fillColor(turquoise).font("Helvetica-Bold");
        doc.text("OBSERVACIONES", 50, currentY);

        currentY += 20;
        doc.fontSize(9).fillColor(darkGray).font("Helvetica");
        
        // Dividir las notas en líneas
        const noteLines = data.generalNotes.split('\n');
        for (const line of noteLines) {
          if (line.trim()) {
            doc.text(line.trim(), 50, currentY, { width: 512 });
            currentY += 14;
            
            if (currentY > 700) {
              doc.addPage();
              currentY = 50;
            }
          }
        }
      }

      // Terminos y condiciones
      currentY += 10;
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
      currentY += 12;
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
      
      // NIT debajo de la firma de INNOVAR
      currentY += 18;
      doc.fontSize(8).fillColor("#9CA3AF").font("Helvetica");
      doc.text("NIT: 10021456-1", 350, currentY);

      // Mensaje de agradecimiento (debajo de las firmas)
      currentY += 40;
      doc.fontSize(10).fillColor(turquoise).font("Helvetica-Bold");
      doc.text(
        "Gracias por contar con nuestros servicios",
        0,
        currentY,
        { align: "center", width: 612 }
      );

      // Finalizar documento
      doc.end();

      stream.on("finish", () => {
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
  let num: number;
  if (typeof value === "string") {
    // Limpiar el string de caracteres no numéricos excepto punto y guión
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleanValue) || 0;
  } else {
    num = value || 0;
  }
  // Manejar NaN
  if (isNaN(num)) {
    num = 0;
  }
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
