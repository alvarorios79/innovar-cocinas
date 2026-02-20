import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  recipientEmail: string;
  onConfirmSend: () => void;
  isSending?: boolean;
  quotationNumber?: string;
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  recipientEmail,
  onConfirmSend,
  isSending = false,
  quotationNumber = "",
}: PDFPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [pdfUrl]);

  const handleDownload = () => {
    const link = document.createElement("a");
    // Remover parámetro preview=true para descarga
    const downloadUrl = pdfUrl.replace('&preview=true', '').replace('?preview=true', '');
    link.href = downloadUrl;
    // Limpiar el nombre para que sea válido como nombre de archivo
    const cleanName = quotationNumber 
      ? quotationNumber.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_')
      : `cotizacion_${Date.now()}`;
    link.download = `${cleanName}.pdf`;
    link.click();
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

        <div className="flex-1 relative bg-gray-100 rounded-md overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
              <div className="text-gray-500">Cargando PDF...</div>
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
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError("No se pudo cargar el PDF. Intenta descargar el archivo.");
            }}
          >
            <embed
              src={pdfUrl}
              type="application/pdf"
              className="w-full h-full"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError("No se pudo cargar el PDF. Intenta descargar el archivo.");
              }}
            />
          </object>
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isLoading || !!error}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <div className="flex gap-2">
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
              disabled={isSending || isLoading}
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
