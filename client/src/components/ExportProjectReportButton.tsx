/**
 * ExportProjectReportButton
 * Genera un Excel multi-hoja con Resumen + Pagos + Gastos de un proyecto.
 * Se coloca en la pestaña Financiero de ProjectDetail.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { buildSheet, createWorkbook, addSheet, downloadXlsx, exportTimestamp } from '@/lib/exportUtils';

interface Props {
  projectId: number;
  clientName?: string;
  size?: 'sm' | 'default';
}

export function ExportProjectReportButton({ projectId, clientName, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const { refetch } = trpc.quotations.exportProjectReport.useQuery(
    { projectId },
    { enabled: false }
  );

  const handleExport = async () => {
    try {
      setLoading(true);
      const { data } = await refetch();
      if (!data) {
        toast.error('No se pudo obtener información del proyecto');
        return;
      }

      const wb = createWorkbook();

      // Hoja 1: Resumen
      addSheet(wb, buildSheet(data.summary, { freeze: false }), 'Resumen');

      // Hoja 2: Pagos
      if (data.payments.length > 0) {
        addSheet(wb, buildSheet(data.payments, { freeze: true }), 'Pagos');
      }

      // Hoja 3: Gastos de materiales
      if (data.expenses.length > 0) {
        addSheet(wb, buildSheet(data.expenses, { freeze: true }), 'Gastos Materiales');
      }

      const name = clientName || data.clientName || `Proyecto_${projectId}`;
      downloadXlsx(wb, `Reporte_${name}_${exportTimestamp()}`);
      toast.success('Reporte exportado correctamente');
    } catch (e: any) {
      console.error(e);
      toast.error('Error al exportar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      {loading ? 'Exportando…' : 'Excel Reporte'}
    </Button>
  );
}
