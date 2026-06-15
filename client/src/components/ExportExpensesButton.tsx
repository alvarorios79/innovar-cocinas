/**
 * ExportExpensesButton
 * Exporta gastos (operativos o de proyecto) a Excel.
 * Reemplaza el export CSV que tenía Accounting.tsx.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { buildSheet, createWorkbook, addSheet, downloadXlsx, exportTimestamp, EXPENSE_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/exportUtils';

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
  filename?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function ExportExpensesButton({ expenses, filename, label, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!expenses.length) {
      toast.error('No hay gastos para exportar');
      return;
    }
    try {
      setLoading(true);

      const rows = expenses.map(e => ({
        'Fecha': e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('es-CO') : '',
        'Tipo': EXPENSE_TYPE_LABELS[e.expenseType] || e.expenseType || '',
        'Descripción': e.description || '',
        'Categoría': CATEGORY_LABELS[e.generalCategory || e.operativeCategory || ''] || e.generalCategory || e.operativeCategory || '',
        'Subcategoría': e.subcategory || '',
        'Monto (COP)': Number(e.amount || 0),
        'Proyecto ID': e.projectId || '',
        'Notas': e.notes || '',
      }));

      const wb = createWorkbook();
      addSheet(wb, buildSheet(rows, { freeze: true }), 'Gastos');
      downloadXlsx(wb, filename || `Gastos_INNOVAR_${exportTimestamp()}`);
      toast.success(`${expenses.length} gasto(s) exportado(s)`);
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
