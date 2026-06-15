/**
 * ExportProjectWordButton
 * Genera reporte financiero de proyecto como Word (.doc).
 * Se coloca en la pestaña Financiero de ProjectDetail.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { downloadWordDoc, generateProjectReportWord } from '@/lib/wordExport';

interface Props {
  projectId: number;
  size?: 'sm' | 'default';
}

export function ExportProjectWordButton({ projectId, size = 'sm' }: Props) {
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
        toast.error('No se pudo cargar el proyecto');
        return;
      }

      const summary = data.summary[0] as any;
      const totalPagado = (data.payments as any[])
        .filter((p: any) => p['Tipo'] === 'Pago')
        .reduce((s: number, p: any) => s + Number(p['Monto'] || 0), 0);
      const totalDescuentos = (data.payments as any[])
        .filter((p: any) => p['Tipo'] === 'Descuento')
        .reduce((s: number, p: any) => s + Number(p['Monto'] || 0), 0);
      const totalGastos = (data.expenses as any[])
        .reduce((s: number, e: any) => s + Number(e['Monto'] || 0), 0);
      const totalAmount = Number(summary?.['Total Cotizado'] || 0);
      const porCobrar = totalAmount - totalPagado - totalDescuentos;
      const margen = totalPagado - totalGastos;

      const html = generateProjectReportWord({
        projectId,
        clientName: data.clientName,
        quotationNumber: summary?.['Cotización'] || '',
        status: summary?.['Estado'] || '',
        totalAmount,
        totalPagado,
        totalDescuentos,
        porCobrar,
        totalGastos,
        margen,
        fechaCreacion: summary?.['Fecha Creación'] || '',
        fechaInstalacion: summary?.['Fecha Instalación'] || undefined,
        payments: (data.payments as any[]).map((p: any) => ({
          fecha: p['Fecha'] || '',
          tipo: p['Tipo'] || '',
          monto: Number(p['Monto'] || 0),
          metodo: p['Método'] || '',
          notas: p['Notas'] || '',
        })),
        expenses: (data.expenses as any[]).map((e: any) => ({
          fecha: e['Fecha'] || '',
          descripcion: e['Descripción'] || '',
          categoria: e['Categoría'] || '',
          subcategoria: e['Subcategoría'] || '',
          monto: Number(e['Monto'] || 0),
        })),
      });

      downloadWordDoc(html, `Reporte_${data.clientName}_${projectId}`);
      toast.success('Reporte exportado como Word');
    } catch (e: any) {
      console.error(e);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      <FileText className="h-4 w-4" />
      {loading ? 'Generando…' : 'Word Reporte'}
    </Button>
  );
}
