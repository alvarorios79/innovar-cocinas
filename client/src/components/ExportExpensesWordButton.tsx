/**
 * ExportExpensesWordButton
 * Exporta gastos a Word (.docx) con informe profesional INNOVAR.
 * Secciones: Gastos de Proyecto / Operativos Bodega, subtotales y total general.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, PageNumber, VerticalAlign, PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';
import { EXPENSE_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/exportUtils';

export type ExpenseRow = {
  id: number;
  expenseDate: string;
  expenseType: string;
  description: string;
  amount: number | string;
  operativeCategory?: string | null;
  generalCategory?: string | null;
  subcategory?: string | null;
  projectId?: number | null;
  notes?: string | null;
};

interface Props {
  expenses: ExpenseRow[];
  filter?: 'all' | 'bodega' | 'proyecto';
  filename?: string;
  label?: string;
  size?: 'sm' | 'default';
}

// ─── Colores INNOVAR ────────────────────────────────────────────────────────
const TEAL = '00BCD4';
const DARK = '1A1A2E';
const DGRAY = '3A3A3A';
const LGRAY = 'F5F5F5';
const WHITE = 'FFFFFF';

const isProyecto = (e: ExpenseRow) => e.expenseType === 'materiales_proyecto';

function fmtCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-CO'); } catch { return d; }
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// Anchos columnas (DXA): Fecha(1100) Tipo(1400) Descripción(2800) Categoría(1500) Monto(1500) Notas(1900) = 10200
// Anchos: Fecha(1400) Tipo(1800) Descripción(4200) Categoría(2200) Monto(2000) Notas(2240) = 13840 DXA (ancho útil landscape)
const COL_WIDTHS = [1400, 1800, 4200, 2200, 2000, 2240];
const TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0); // 13840

function cell(text: string, opts?: {
  bold?: boolean; color?: string; bg?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: string;
}): TableCell {
  return new TableCell({
    borders,
    width: { size: 0, type: WidthType.AUTO },
    shading: opts?.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts?.bold, color: opts?.color ?? DGRAY, size: 18, font: 'Calibri' })],
    })],
  });
}

function headerRow(): TableRow {
  const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto (COP)', 'Notas'];
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        borders,
        width: { size: COL_WIDTHS[i], type: WidthType.DXA },
        shading: { fill: TEAL, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: 18, font: 'Calibri' })],
        })],
      })
    ),
  });
}

function expenseRow(e: ExpenseRow, shade: boolean): TableRow {
  const bg = shade ? LGRAY : WHITE;
  const cat = CATEGORY_LABELS[e.generalCategory || e.operativeCategory || ''] || e.generalCategory || e.operativeCategory || '';
  const tipo = EXPENSE_TYPE_LABELS[e.expenseType] || e.expenseType || '';
  const monto = Number(e.amount || 0);
  return new TableRow({
    children: [
      new TableCell({ borders, width: { size: COL_WIDTHS[0], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: fmtDate(e.expenseDate), size: 17, font: 'Calibri', color: DGRAY })] })] }),
      new TableCell({ borders, width: { size: COL_WIDTHS[1], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: tipo, size: 17, font: 'Calibri', color: DGRAY })] })] }),
      new TableCell({ borders, width: { size: COL_WIDTHS[2], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: e.description || '', size: 17, font: 'Calibri', color: DGRAY })] })] }),
      new TableCell({ borders, width: { size: COL_WIDTHS[3], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: cat, size: 17, font: 'Calibri', color: DGRAY })] })] }),
      new TableCell({ borders, width: { size: COL_WIDTHS[4], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtCOP(monto), size: 17, font: 'Calibri', color: DGRAY })] })] }),
      new TableCell({ borders, width: { size: COL_WIDTHS[5], type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: e.notes || '', size: 17, font: 'Calibri', color: DGRAY })] })] }),
    ],
  });
}

function subtotalRow(label: string, total: number): TableRow {
  return new TableRow({
    children: [
      new TableCell({ borders, columnSpan: 4, shading: { fill: DARK, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: label, bold: true, color: WHITE, size: 18, font: 'Calibri' })] })] }),
      new TableCell({ borders, columnSpan: 2, shading: { fill: DARK, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtCOP(total), bold: true, color: TEAL, size: 20, font: 'Calibri' })] })] }),
    ],
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text: '▌ ', color: TEAL, bold: true, size: 26, font: 'Calibri' }),
      new TextRun({ text, bold: true, color: DARK, size: 24, font: 'Calibri' }),
    ],
  });
}

function buildTable(rows: ExpenseRow[], subtotalLabel: string): (Paragraph | Table)[] {
  const total = rows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const tableRows = [headerRow(), ...rows.map((e, i) => expenseRow(e, i % 2 === 1)), subtotalRow(subtotalLabel, total)];
  return [new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: COL_WIDTHS, rows: tableRows })];
}

function summaryTable(totalProyecto: number, totalBodega: number, totalGeneral: number): Table {
  const makeSumRow = (label: string, val: number, highlight: boolean) => new TableRow({
    children: [
      new TableCell({ borders, width: { size: 6000, type: WidthType.DXA }, shading: { fill: highlight ? DARK : LGRAY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: highlight, color: highlight ? WHITE : DGRAY, size: highlight ? 22 : 20, font: 'Calibri' })] })] }),
      new TableCell({ borders, width: { size: 4200, type: WidthType.DXA }, shading: { fill: highlight ? DARK : WHITE, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtCOP(val), bold: highlight, color: highlight ? TEAL : DGRAY, size: highlight ? 24 : 20, font: 'Calibri' })] })] }),
    ],
  });
  return new Table({
    width: { size: 10200, type: WidthType.DXA },
    columnWidths: [8640, 5200],
    rows: [
      makeSumRow('Gastos de Proyecto', totalProyecto, false),
      makeSumRow('Gastos Operativos / Bodega', totalBodega, false),
      makeSumRow('TOTAL GENERAL', totalGeneral, true),
    ],
  });
}

export function ExportExpensesWordButton({ expenses, filter = 'all', filename, label, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const proyectoList = filter === 'bodega' ? [] : expenses.filter(isProyecto);
      const bodegaList = filter === 'proyecto' ? [] : expenses.filter(e => !isProyecto(e));
      const totalProyecto = proyectoList.reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalBodega = bodegaList.reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalGeneral = totalProyecto + totalBodega;
      const count = (filter === 'all' ? expenses : filter === 'proyecto' ? proyectoList : bodegaList).length;

      if (count === 0) { toast.warning('No hay gastos para exportar'); return; }

      const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
      const filterLabel = filter === 'proyecto' ? ' — Solo Proyecto' : filter === 'bodega' ? ' — Solo Bodega' : '';

      const children: (Paragraph | Table)[] = [];

      // Título
      children.push(new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: 'INNOVAR Cocinas de Diseño', bold: true, color: TEAL, size: 36, font: 'Calibri' })],
      }));
      children.push(new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: `Informe de Gastos${filterLabel}`, bold: true, color: DARK, size: 28, font: 'Calibri' })],
      }));
      children.push(new Paragraph({
        spacing: { before: 0, after: 320 },
        children: [new TextRun({ text: `Generado el ${today}`, color: '666666', size: 20, font: 'Calibri' })],
      }));

      // Resumen ejecutivo
      if (filter === 'all') {
        children.push(sectionTitle('Resumen Ejecutivo'));
        children.push(summaryTable(totalProyecto, totalBodega, totalGeneral));
        children.push(new Paragraph({ spacing: { before: 320, after: 0 } }));
      }

      // Sección Proyecto
      if (filter !== 'bodega') {
        children.push(sectionTitle('Gastos de Proyecto'));
        if (proyectoList.length === 0) {
          children.push(new Paragraph({ spacing: { before: 80, after: 200 }, children: [new TextRun({ text: 'Sin gastos de proyecto en el período seleccionado.', color: '888888', size: 18, font: 'Calibri' })] }));
        } else {
          children.push(...buildTable(proyectoList, 'SUBTOTAL PROYECTO'));
          children.push(new Paragraph({ spacing: { before: 280, after: 0 } }));
        }
      }

      // Sección Bodega
      if (filter !== 'proyecto') {
        children.push(sectionTitle('Gastos Operativos / Bodega'));
        if (bodegaList.length === 0) {
          children.push(new Paragraph({ spacing: { before: 80, after: 200 }, children: [new TextRun({ text: 'Sin gastos operativos en el período seleccionado.', color: '888888', size: 18, font: 'Calibri' })] }));
        } else {
          children.push(...buildTable(bodegaList, 'SUBTOTAL BODEGA'));
          children.push(new Paragraph({ spacing: { before: 280, after: 0 } }));
        }
      }

      // Total al pie solo si es filtrado
      if (filter !== 'all') {
        children.push(new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [8640, 5200],
          rows: [new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: DARK, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: filter === 'proyecto' ? 'TOTAL PROYECTO' : 'TOTAL BODEGA', bold: true, color: WHITE, size: 22, font: 'Calibri' })] })] }),
              new TableCell({ borders, shading: { fill: DARK, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtCOP(totalGeneral), bold: true, color: TEAL, size: 24, font: 'Calibri' })] })] }),
            ],
          })],
        }));
      }

      // Pie de página
      children.push(new Paragraph({ spacing: { before: 400, after: 0 }, children: [new TextRun({ text: 'Kilómetro 9 vía Cerritos, Pereira, Risaralda  ·  innovarcocinasarte@gmail.com  ·  313 680 2025', color: '888888', size: 16, font: 'Calibri' })] }));

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              // Landscape: pasar el lado corto como width, largo como height; docx-js los intercambia al generar el XML
            size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
              margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
            },
          },
          headers: {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 1 } },
                children: [
                  new TextRun({ text: 'INNOVAR Cocinas de Diseño  ', bold: true, color: TEAL, size: 18, font: 'Calibri' }),
                  new TextRun({ text: '| Informe de Gastos |  Página ', color: DGRAY, size: 16, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], color: DGRAY, size: 16, font: 'Calibri' }),
                ],
              })],
            }),
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${filename || 'Gastos_INNOVAR'}.docx`);
      toast.success(`Informe Word generado (${count} gasto${count !== 1 ? 's' : ''})`);
    } catch (e: any) {
      console.error('[WordExport]', e);
      toast.error('Error al generar el Word');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading}
      className="gap-1.5 border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
      <FileText className="h-4 w-4" />
      {loading ? 'Generando…' : (label || 'Word')}
    </Button>
  );
}
