import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Eye, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
    }
  }, [open, pdfUrl]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `cotizacion_${quotationNumber}_preview.pdf`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Vista Previa del PDF
          </DialogTitle>
          <DialogDescription>
            Así se verá el PDF de la cotización. Puedes descargarlo o cerrar para continuar editando.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative bg-gray-100 rounded-md overflow-hidden">
          {(isGenerating || isLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <div className="text-gray-500">
                {isGenerating ? "Generando vista previa..." : "Cargando PDF..."}
              </div>
            </div>
          )}
          {pdfUrl && !isGenerating && (
            <object
              data={`${pdfUrl}?preview=true`}
              type="application/pdf"
              className="w-full h-full"
              onLoad={() => setIsLoading(false)}
            >
              <div className="flex flex-col items-center justify-center h-full p-4">
                <p className="text-gray-600 mb-4">No se puede mostrar el PDF en el navegador.</p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </object>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating || isLoading || !pdfUrl}
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
