/**
 * ExportExpensesPdfButton
 * Informe de gastos listo para imprimir o guardar como PDF (hoja carta).
 * Abre una ventana con el informe y el cuadro de impresión del navegador:
 * ahí se elige la impresora o "Guardar como PDF".
 * Usa la misma plantilla que el Word (shared/reportTemplate.ts).
 */
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { buildExpenseReport, expensesForFilter, type ExpenseReportFilter, type ExpenseReportRow } from '@shared/expenseReport';
import { renderReportHtml } from '@shared/reportTemplate';

interface Props {
  expenses: ExpenseReportRow[];
  filter?: ExpenseReportFilter;
  title?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function ExportExpensesPdfButton({ expenses, filter = 'all', title, label = 'PDF', size = 'sm' }: Props) {
  const handleClick = () => {
    if (expensesForFilter(expenses, filter).length === 0) { toast.warning('No hay gastos para exportar'); return; }
    const docTitle = title || `Informe_Gastos_${new Date().toISOString().slice(0, 10)}`;
    // La ventana se abre en el mismo clic (si no, el navegador la bloquea)
    const win = window.open('', '_blank');
    if (!win) { toast.error('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.'); return; }
    const html = renderReportHtml(buildExpenseReport(expenses, filter), {
      logoUrl: `${window.location.origin}/logo-light.png`,
      documentTitle: docTitle,
      autoPrint: true,
    });
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <Button variant="outline" size={size} onClick={handleClick} className="gap-2">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
