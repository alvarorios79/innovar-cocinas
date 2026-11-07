/**
 * ExportExpensesWordButton
 * Exporta el informe de gastos a Word (.docx), hoja carta.
 * Usa la misma plantilla que el PDF (shared/reportTemplate.ts).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { buildExpenseReport, expensesForFilter, type ExpenseReportFilter, type ExpenseReportRow } from '@shared/expenseReport';
import { renderReportDocx } from '@shared/reportTemplate';

export type ExpenseRow = ExpenseReportRow;

interface Props {
  expenses: ExpenseReportRow[];
  filter?: ExpenseReportFilter;
  filename?: string;
  label?: string;
  size?: 'sm' | 'default';
}

async function loadLogo() {
  try {
    const res = await fetch('/logo-light.png');
    if (!res.ok) return undefined;
    return { data: new Uint8Array(await res.arrayBuffer()), width: 64, height: 80 };
  } catch {
    return undefined;
  }
}

export function ExportExpensesWordButton({ expenses, filter = 'all', filename, label, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (expensesForFilter(expenses, filter).length === 0) { toast.warning('No hay gastos para exportar'); return; }
    try {
      setLoading(true);
      const doc = renderReportDocx(buildExpenseReport(expenses, filter), await loadLogo());
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${filename || `Informe_Gastos_${new Date().toISOString().slice(0, 10)}`}.docx`);
      toast.success('Informe Word descargado');
    } catch (err) {
      console.error('[Word gastos]', err);
      toast.error('No se pudo generar el Word');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-2">
      <FileText className="h-4 w-4" />
      {loading ? 'Generando…' : label || 'Word'}
    </Button>
  );
}
