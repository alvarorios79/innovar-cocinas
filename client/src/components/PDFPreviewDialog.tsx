import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { toast } from "sonner";
import { downloadPDFiOS } from "@/lib/pdf-download";

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  recipientEmail: string;
  onConfirmSend: () => void;
  isSending?: boolean;
  quotationNumber?: string;
  quotationId?: number;
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  recipientEmail,
  onConfirmSend,
  isSending = false,
  quotationNumber = "",
  quotationId,
}: PDFPreviewDialogProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isIOS] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));

  // Medir el ancho del contenedor para ajustar el PDF
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width - 32); // Restar padding
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPageNumber(1);
      setScale(1.0);
      setIsLoading(true);
      setError(null);
    }
  }, [open, pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setError("No se pudo cargar el PDF. Intenta descargar el archivo.");
    setIsLoading(false);
  };

  const handleDownload = async () => {
    // Remover parámetro preview=true para descarga
    const downloadUrl = pdfUrl.replace('&preview=true', '').replace('?preview=true', '');
    // Limpiar el nombre para que sea válido como nombre de archivo
    const cleanName = quotationNumber 
      ? quotationNumber.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_')
      : `cotizacion_${Date.now()}`;
    const filename = `${cleanName}.pdf`;
    // Usar función compatible con iOS
    await downloadPDFiOS(downloadUrl, filename);
  };

  const handlePreviousPage = () => {
    setPageNumber(Math.max(pageNumber - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(Math.min(pageNumber + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.2, 2.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.2, 0.5));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa de Cotización</DialogTitle>
          <DialogDescription>
            Revisa el PDF antes de enviarlo a {recipientEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col relative bg-gray-100 rounded-md overflow-hidden" ref={containerRef}>
          {/* Botón de cierre en esquina superior derecha */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-50 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {isIOS ? (
            // En iOS, mostrar mensaje y botón para abrir PDF
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <AlertCircle className="h-12 w-12 text-amber-500" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">Vista previa no disponible en iPhone</p>
                <p className="text-sm text-gray-600 mt-2">Toca el botón de abajo para ver el PDF en pantalla completa</p>
              </div>
              <Button
                onClick={() => window.open(pdfUrl, '_blank')}
                className="mt-4"
              >
                Abrir PDF
              </Button>
            </div>
          ) : (
            // En desktop, mostrar iframe normal
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-50 flex-col gap-2">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div className="text-red-700 text-center px-4">
                    <p className="font-semibold">Error al cargar PDF</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}
              
              {!error && (
                <div className="flex-1 overflow-auto">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setError('No se pudo cargar el PDF');
                      setIsLoading(false);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          {!isIOS && (
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isLoading || !!error}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {isIOS && (
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isSending}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={onConfirmSend}
              disabled={isSending || isLoading || !!error}
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSending ? "Enviando..." : "Enviar por Email"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
