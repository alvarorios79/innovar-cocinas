import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Eye, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { downloadPDFiOS } from "@/lib/pdf-download";

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewBeforeSaveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  isGenerating?: boolean;
  quotationNumber?: string;
}

export function PDFPreviewBeforeSave({
  open,
  onOpenChange,
  pdfUrl,
  isGenerating = false,
  quotationNumber = "preview",
}: PDFPreviewBeforeSaveProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
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
    }
  }, [open, pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
  };

  const handleDownload = async () => {
    const downloadUrl = pdfUrl.replace("?preview=true", "").replace("&preview=true", "");
    const cleanName = quotationNumber.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');
    const filename = `${cleanName}.pdf`;
    
    if (isIOS) {
      // En iOS, usar la función compatible
      await downloadPDFiOS(downloadUrl, filename);
    } else {
      // En desktop, usar método tradicional
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const fitToWidth = useCallback(() => {
    // Ajustar al ancho del contenedor (escala aproximada para carta)
    if (containerWidth > 0) {
      const pdfWidth = 612; // Ancho estándar de carta en puntos
      const newScale = (containerWidth - 40) / pdfWidth;
      setScale(Math.min(Math.max(newScale, 0.3), 1.5));
    }
  }, [containerWidth]);

  // Limpiar URL para react-pdf (quitar parámetros de query)
  const cleanPdfUrl = pdfUrl.replace("?preview=true", "").replace("&preview=true", "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[95vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Vista Previa del PDF
          </DialogTitle>
          <DialogDescription>
            Vista previa de la cotización. Usa los controles para navegar y hacer zoom.
          </DialogDescription>
        </DialogHeader>

        {/* Botón de cierre en esquina superior derecha */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
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
              onClick={() => window.open(cleanPdfUrl, '_blank')}
              className="mt-4"
            >
              Abrir PDF
            </Button>
          </div>
        ) : (
          // En desktop, mostrar vista previa normal
          <>
            {/* Controles de navegación y zoom */}
            {!isGenerating && !isLoading && numPages > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-md text-sm flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 min-w-[80px] text-center">
                    {pageNumber} / {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomOut}
                    disabled={scale <= 0.3}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="px-2 min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomIn}
                    disabled={scale >= 2.0}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fitToWidth}
                    className="h-8 px-2 ml-1"
                    title="Ajustar al ancho"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div 
              ref={containerRef}
              className="flex-1 relative bg-gray-200 rounded-md overflow-auto min-h-0"
              style={{ maxHeight: 'calc(95vh - 200px)' }}
            >
              {(isGenerating || isLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-200">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
                  <div className="text-gray-500">
                    {isGenerating ? "Generando vista previa..." : "Cargando PDF..."}
                  </div>
                </div>
              )}
              
              {cleanPdfUrl && !isGenerating && (
                <div className="flex justify-center p-4 min-w-fit">
                  <Document
                    file={cleanPdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
                        <span className="text-gray-500">Cargando documento...</span>
                      </div>
                    }
                    error={
                      <div className="flex flex-col items-center justify-center py-8 text-red-500">
                        <p>Error al cargar el PDF</p>
                        <Button onClick={handleDownload} className="mt-4">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar en su lugar
                        </Button>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-xl bg-white"
                    />
                  </Document>
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter className="flex-row justify-between gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating || !pdfUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
