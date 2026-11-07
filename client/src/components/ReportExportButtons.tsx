/**
 * Botones "PDF" y "Word" para cualquier informe hecho con la plantilla común
 * (shared/reportTemplate.ts). `load` trae los datos y arma el informe.
 * PDF: abre el informe listo para imprimir o "Guardar como PDF".
 */
import { useState } from 'react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { renderReportDocx, renderReportHtml, type ReportDoc } from '@shared/reportTemplate';

interface Props {
  /** Trae los datos y arma el informe. Devuelve null si no hay nada que mostrar. */
  load: () => Promise<ReportDoc | null>;
  filename: string;
  emptyMessage?: string;
  pdfLabel?: string;
  wordLabel?: string;
  size?: 'sm' | 'default';
}

async function loadLogo() {
  try {
    const res = await fetch('/logo-light.png');
    return res.ok ? { data: new Uint8Array(await res.arrayBuffer()), width: 64, height: 80 } : undefined;
  } catch {
    return undefined;
  }
}

export function ReportExportButtons({ load, filename, emptyMessage = 'No hay datos para exportar', pdfLabel = 'PDF', wordLabel = 'Word', size = 'sm' }: Props) {
  const [busy, setBusy] = useState<'pdf' | 'word' | null>(null);

  const handlePdf = async () => {
    // La ventana se abre en el mismo clic (si se abre después, el navegador la bloquea)
    const win = window.open('', '_blank');
    if (!win) { toast.error('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.'); return; }
    win.document.write('<p style="font-family:Arial;padding:24px;color:#555">Preparando el informe…</p>');
    try {
      setBusy('pdf');
      const report = await load();
      if (!report) { win.close(); toast.warning(emptyMessage); return; }
      win.document.open();
      win.document.write(renderReportHtml(report, { logoUrl: `${window.location.origin}/logo-light.png`, documentTitle: filename, autoPrint: true }));
      win.document.close();
    } catch (err) {
      console.error('[Informe PDF]', err);
      win.close();
      toast.error('No se pudo generar el PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleWord = async () => {
    try {
      setBusy('word');
      const report = await load();
      if (!report) { toast.warning(emptyMessage); return; }
      const blob = await Packer.toBlob(renderReportDocx(report, await loadLogo()));
      saveAs(blob, `${filename}.docx`);
      toast.success('Informe Word descargado');
    } catch (err) {
      console.error('[Informe Word]', err);
      toast.error('No se pudo generar el Word');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Button variant="outline" size={size} onClick={handlePdf} disabled={!!busy} className="gap-1.5">
        <Printer className="h-4 w-4" />
        {busy === 'pdf' ? 'Preparando…' : pdfLabel}
      </Button>
      <Button variant="outline" size={size} onClick={handleWord} disabled={!!busy} className="gap-1.5">
        <FileText className="h-4 w-4" />
        {busy === 'word' ? 'Generando…' : wordLabel}
      </Button>
    </>
  );
}
