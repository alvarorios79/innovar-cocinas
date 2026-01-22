import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Eye, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// Los estilos de react-pdf se manejan inline

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

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl.replace("?preview=true", "");
    link.download = `cotizacion_${quotationNumber}.pdf`;
    link.click();
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  // Limpiar URL para react-pdf (quitar parámetros de query)
  const cleanPdfUrl = pdfUrl.replace("?preview=true", "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Vista Previa del PDF
          </DialogTitle>
          <DialogDescription>
            Así se verá el PDF de la cotización. Puedes descargarlo o cerrar para continuar.
          </DialogDescription>
        </DialogHeader>

        {/* Controles de navegación y zoom */}
        {!isGenerating && !isLoading && numPages > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-md">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {pageNumber} de {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 2.0}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 relative bg-gray-100 rounded-md overflow-auto">
          {(isGenerating || isLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <div className="text-gray-500">
                {isGenerating ? "Generando vista previa..." : "Cargando PDF..."}
              </div>
            </div>
          )}
          
          {cleanPdfUrl && !isGenerating && (
            <div className="flex justify-center p-4">
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
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating || !pdfUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button
            variant="outline"
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
