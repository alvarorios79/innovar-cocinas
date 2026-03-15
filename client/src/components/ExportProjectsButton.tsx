import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import * as XLSX from 'xlsx';

interface ExportProjectsButtonProps {
  archived?: boolean;
}

export function ExportProjectsButton({ archived = false }: ExportProjectsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { refetch } = trpc.projects.exportToExcel.useQuery({ archived }, { enabled: false });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const { data } = await refetch();
      
      if (!data?.data || data.data.length === 0) {
        toast.error('No hay proyectos para exportar');
        return;
      }

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(data.data as any[]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // ID Proyecto
        { wch: 20 }, // Cotización
        { wch: 25 }, // Cliente
        { wch: 20 }, // Estado
        { wch: 15 }, // Monto Total
        { wch: 15 }, // Pagos Recibidos
        { wch: 15 }, // Por Cobrar
        { wch: 12 }, // Gastos
        { wch: 12 }, // Margen
        { wch: 15 }, // Rentabilidad %
        { wch: 15 }, // Fecha Creación
        { wch: 20 }, // Instalación Oficial
      ];
      ws['!cols'] = colWidths;

      // Generar nombre de archivo
      const tabName = archived ? 'Archivados' : 'Activos';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Proyectos_${tabName}_${timestamp}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, filename);
      toast.success('Proyectos exportados correctamente');
    } catch (error) {
      console.error('Error exportando proyectos:', error);
      toast.error('Error al exportar proyectos');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
      size="sm"
    >
      <FileDown className="h-4 w-4 mr-2" />
      {isExporting ? 'Exportando...' : 'Exportar Excel'}
    </Button>
  );
}
