import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ReceiptUploadProps {
  onUploadComplete: (url: string, fileName: string) => void;
  currentReceiptUrl?: string;
  currentFileName?: string;
}

export function ReceiptUpload({
  onUploadComplete,
  currentReceiptUrl,
  currentFileName,
}: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentReceiptUrl || null
  );
  const [fileName, setFileName] = useState(currentFileName || "");
  
  const uploadImage = trpc.upload.image.useMutation();

  // Sincronizar previewUrl cuando currentReceiptUrl cambia (ej: al limpiar el formulario)
  useEffect(() => {
    setPreviewUrl(currentReceiptUrl || null);
    setFileName(currentFileName || "");
  }, [currentReceiptUrl, currentFileName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se aceptan archivos PDF, JPG o PNG");
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe superar 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Leer archivo como base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileData = event.target?.result as string;
          const result = await uploadImage.mutateAsync({
            fileName: file.name,
            fileData: fileData,
            contentType: file.type,
          });
          
          setPreviewUrl(result.url);
          setFileName(file.name);
          onUploadComplete(result.url, file.name);
          toast.success("Comprobante subido correctamente");
        } catch (error) {
          console.error("Error uploading receipt:", error);
          toast.error("Error al subir el comprobante");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Error al leer el archivo");
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setFileName("");
    onUploadComplete("", "");
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="receipt">Adjuntar comprobante (PDF, JPG, PNG)</Label>

      {previewUrl ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            {previewUrl.endsWith(".pdf") ? (
              <FileText className="h-5 w-5 text-red-600" />
            ) : (
              <Image className="h-5 w-5 text-blue-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:underline"
              >
                Ver archivo
              </a>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            id="receipt"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <label htmlFor="receipt">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 cursor-pointer"
              disabled={isUploading}
              onClick={() => document.getElementById("receipt")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Subiendo..." : "Seleccionar archivo"}
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}
