/**
 * ExportQuotationsButton
 * Exporta la lista de cotizaciones visible (con filtros) a Excel.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import * as XLSX from 'xlsx';
import { buildSheet, createWorkbook, addSheet, downloadXlsx, exportTimestamp } from '@/lib/exportUtils';

interface Props {
  /** Filtros activos en Quotations.tsx — se pasan tal cual al endpoint */
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    archived?: boolean;
  };
  size?: 'sm' | 'default';
}

export function ExportQuotationsButton({ filters = {}, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const { refetch } = trpc.quotations.exportToExcel.useQuery(
    {
      status: filters.status && filters.status !== 'all' ? filters.status : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      archived: filters.archived,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    try {
      setLoading(true);
      const { data } = await refetch();
      if (!data?.data?.length) {
        toast.error('No hay cotizaciones para exportar con los filtros actuales');
        return;
      }

      const wb = createWorkbook();
      const ws = buildSheet(data.data, { freeze: true });
      addSheet(wb, ws, 'Cotizaciones');
      downloadXlsx(wb, `Cotizaciones_INNOVAR_${exportTimestamp()}`);
      toast.success(`${data.total} cotización(es) exportada(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error('Error al exportar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      {loading ? 'Exportando…' : 'Excel'}
    </Button>
  );
}
