/**
 * ExportExpensesButton
 * Exporta gastos (operativos o de proyecto) a Excel con secciones, subtotales y total general.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { createWorkbook, addSheet, downloadXlsx, exportTimestamp, EXPENSE_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/exportUtils';

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

const HEADERS = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Subcategoría', 'Monto (COP)', 'Proyecto ID', 'Notas'];
const COL_WIDTHS = [
  { wch: 12 }, { wch: 22 }, { wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 32 },
];

const isProyecto = (e: ExpenseRow) => e.expenseType === 'materiales_proyecto';

function rowToArray(e: ExpenseRow): any[] {
  return [
    e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('es-CO') : '',
    EXPENSE_TYPE_LABELS[e.expenseType] || e.expenseType || '',
    e.description || '',
    CATEGORY_LABELS[e.generalCategory || e.operativeCategory || ''] || e.generalCategory || e.operativeCategory || '',
    e.subcategory || '',
    Number(e.amount || 0),
    e.projectId || '',
    e.notes || '',
  ];
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function buildAllSheet(expenses: ExpenseRow[]): XLSX.WorkSheet {
  const proyectoList = expenses.filter(isProyecto);
  const bodegaList = expenses.filter(e => !isProyecto(e));
  const totalProyecto = proyectoList.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalBodega = bodegaList.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalGeneral = totalProyecto + totalBodega;

  const aoa: any[][] = [];
  aoa.push(HEADERS);

  // Sección Proyecto
  aoa.push(['═══ GASTOS DE PROYECTO ═══', '', '', '', '', '', '', '']);
  if (proyectoList.length === 0) {
    aoa.push(['', '', '(Sin gastos de proyecto)', '', '', '', '', '']);
  } else {
    proyectoList.forEach(e => aoa.push(rowToArray(e)));
  }
  aoa.push(['', '', '', '', 'SUBTOTAL PROYECTO', totalProyecto, '', fmtCOP(totalProyecto)]);
  aoa.push([]);

  // Sección Bodega
  aoa.push(['═══ GASTOS OPERATIVOS / BODEGA ═══', '', '', '', '', '', '', '']);
  if (bodegaList.length === 0) {
    aoa.push(['', '', '(Sin gastos de bodega)', '', '', '', '', '']);
  } else {
    bodegaList.forEach(e => aoa.push(rowToArray(e)));
  }
  aoa.push(['', '', '', '', 'SUBTOTAL BODEGA', totalBodega, '', fmtCOP(totalBodega)]);
  aoa.push([]);

  // Total general
  aoa.push(['', '', '', '', 'TOTAL GENERAL', totalGeneral, '', fmtCOP(totalGeneral)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COL_WIDTHS;
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

function buildFilteredSheet(expenses: ExpenseRow[], label: string): XLSX.WorkSheet {
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const aoa: any[][] = [];
  aoa.push(HEADERS);
  if (expenses.length === 0) {
    aoa.push(['', '', '(Sin gastos)', '', '', '', '', '']);
  } else {
    expenses.forEach(e => aoa.push(rowToArray(e)));
  }
  aoa.push([]);
  aoa.push(['', '', '', '', `TOTAL ${label.toUpperCase()}`, total, '', fmtCOP(total)]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COL_WIDTHS;
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

export function ExportExpensesButton({ expenses, filter = 'all', filename, label, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    try {
      setLoading(true);

      let ws: XLSX.WorkSheet;
      let sheetName: string;
      let count: number;

      if (filter === 'proyecto') {
        const filtered = expenses.filter(isProyecto);
        ws = buildFilteredSheet(filtered, 'Proyecto');
        sheetName = 'Gastos Proyecto';
        count = filtered.length;
      } else if (filter === 'bodega') {
        const filtered = expenses.filter(e => !isProyecto(e));
        ws = buildFilteredSheet(filtered, 'Bodega');
        sheetName = 'Gastos Bodega';
        count = filtered.length;
      } else {
        ws = buildAllSheet(expenses);
        sheetName = 'Gastos';
        count = expenses.length;
      }

      if (count === 0 && filter !== 'all') {
        toast.warning('No hay gastos de ese tipo para exportar');
        return;
      }

      const wb = createWorkbook();
      addSheet(wb, ws, sheetName);
      downloadXlsx(wb, filename || `Gastos_INNOVAR_${exportTimestamp()}`);
      toast.success(`${count} gasto(s) exportado(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error('Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      {loading ? 'Exportando…' : (label || 'Excel')}
    </Button>
  );
}
