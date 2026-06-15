/**
 * ExportQuotationWordButton
 * Exporta una cotización individual como documento Word (.doc).
 * Se coloca en la tarjeta de cotización o en el detalle.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { downloadWordDoc, generateQuotationWord } from '@/lib/wordExport';

interface Props {
  quotationId: number;
  quotationNumber: string;
  size?: 'sm' | 'default';
}

export function ExportQuotationWordButton({ quotationId, quotationNumber, size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);

  const { refetch: fetchQuotation } = trpc.quotations.getById.useQuery(
    { id: quotationId },
    { enabled: false }
  );

  const { refetch: fetchClients } = trpc.clients.list.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    try {
      setLoading(true);
      const [{ data: quot }, { data: clients }] = await Promise.all([
        fetchQuotation(),
        fetchClients(),
      ]);

      if (!quot) {
        toast.error('No se pudo cargar la cotización');
        return;
      }

      const clientData = (clients as any[])?.find((c: any) => c.id === quot.clientId);

      const html = generateQuotationWord({
        quotationNumber: quot.quotationNumber || quotationNumber,
        versionNumber: quot.versionNumber,
        status: quot.status || 'draft',
        createdAt: quot.createdAt || '',
        validUntil: quot.validUntil || undefined,
        total: Number(quot.total || 0),
        discountPercentage: Number((quot as any).discountPercentage ?? (quot as any).discountPercent ?? 0),
        totalWithDiscount: Number((quot as any).totalWithDiscount ?? quot.total ?? 0),
        notes: (quot as any).notes || undefined,
        client: {
          name: clientData?.name || 'N/A',
          phone: clientData?.whatsappPhone || clientData?.phone || undefined,
          email: clientData?.email || undefined,
          address: clientData?.address || undefined,
          city: clientData?.city || undefined,
        },
        items: (quot.items || []).map((item: any, idx: number) => ({
          itemNumber: item.itemNumber ?? idx + 1,
          itemType: item.itemType || 'otros',
          description: item.description || '',
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
        })),
      });

      const filename = `Cotizacion_${quot.quotationNumber || quotationNumber}`;
      downloadWordDoc(html, filename);
      toast.success('Cotización exportada como Word');
    } catch (e: any) {
      console.error(e);
      toast.error('Error al exportar la cotización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      <FileText className="h-4 w-4" />
      {loading ? 'Generando…' : 'Word'}
    </Button>
  );
}
