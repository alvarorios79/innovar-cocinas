import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  error?: string;
}

interface PhotoUploaderProps {
  projectId?: number;
  stage?: "inicial" | "diseno" | "corte" | "enchape" | "ensamble" | "final";
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

// Comprimir imagen en el cliente
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        
        // Redimensionar si es muy grande
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con compresión
        const dataUrl = canvas.toDataURL(file.type || "image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function PhotoUploader({
  projectId,
  stage,
  onUploadComplete,
  maxFiles = 10,
  accept = "image/*",
  className = "",
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<PhotoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = trpc.upload.image.useMutation();

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: PhotoFile[] = [];
    const fileArray = Array.from(selectedFiles);
    
    // Limitar cantidad de archivos
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);
    
    if (fileArray.length > remainingSlots) {
      toast.warning(`Solo puedes subir ${maxFiles} fotos. Se agregaron las primeras ${remainingSlots}.`);
    }

    for (const file of filesToAdd) {
      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} no es una imagen válida`);
        continue;
      }

      // Validar tamaño (10MB antes de comprimir)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} es muy grande (máx 10MB)`);
        continue;
      }

      // Crear preview
      const preview = URL.createObjectURL(file);
      
      newFiles.push({
        id: generateId(),
        file,
        preview,
        status: "pending",
        progress: 0,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast.info("No hay fotos pendientes para subir");
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (const photoFile of pendingFiles) {
      try {
        // Actualizar estado a "uploading"
        setFiles((prev) =>
          prev.map((f) =>
            f.id === photoFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
          )
        );

        // Comprimir imagen
        setFiles((prev) =>
          prev.map((f) =>
            f.id === photoFile.id ? { ...f, progress: 30 } : f
          )
        );
        
        const compressedData = await compressImage(photoFile.file);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === photoFile.id ? { ...f, progress: 50 } : f
          )
        );

        // Subir a S3
        const result = await uploadMutation.mutateAsync({
          fileName: photoFile.file.name,
          fileData: compressedData,
          contentType: photoFile.file.type,
          projectId,
          stage,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === photoFile.id
              ? { ...f, status: "success" as const, progress: 100, url: result.url }
              : f
          )
        );

        uploadedUrls.push(result.url);
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === photoFile.id
              ? { ...f, status: "error" as const, progress: 0, error: error.message || "Error al subir" }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    if (uploadedUrls.length > 0) {
      toast.success(`${uploadedUrls.length} foto(s) subida(s) exitosamente`);
      onUploadComplete?.(uploadedUrls);
    }
  };

  const clearCompleted = () => {
    setFiles((prev) => {
      prev.filter((f) => f.status === "success").forEach((f) => URL.revokeObjectURL(f.preview));
      return prev.filter((f) => f.status !== "success");
    });
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de arrastrar y soltar */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50"
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-muted rounded-full">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Arrastra fotos aquí o haz clic para seleccionar</p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG, WEBP hasta 10MB (máx. {maxFiles} fotos)
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="button" variant="outline" size="sm">
              <ImageIcon className="h-4 w-4 mr-1" />
              Galería
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // En móviles, abrir cámara
                if (fileInputRef.current) {
                  fileInputRef.current.capture = "environment";
                  fileInputRef.current.click();
                }
              }}
            >
              <Camera className="h-4 w-4 mr-1" />
              Cámara
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {files.length} foto(s) seleccionada(s)
              {successCount > 0 && ` (${successCount} subida(s))`}
            </span>
            {successCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Limpiar subidas
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((photoFile) => (
              <Card key={photoFile.id} className="relative overflow-hidden">
                <CardContent className="p-0">
                  {/* Preview de imagen */}
                  <div className="relative aspect-square">
                    <img
                      src={photoFile.preview}
                      alt={photoFile.file.name}
                      className={`w-full h-full object-cover ${
                        photoFile.status === "uploading" ? "opacity-50" : ""
                      }`}
                    />
                    
                    {/* Overlay de estado */}
                    {photoFile.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                    
                    {photoFile.status === "success" && (
                      <div className="absolute top-2 right-2">
                        <div className="p-1 bg-green-500 rounded-full">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {photoFile.status === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      </div>
                    )}

                    {/* Botón eliminar */}
                    {photoFile.status !== "uploading" && (
                      <button
                        type="button"
                        onClick={() => removeFile(photoFile.id)}
                        className="absolute top-2 left-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  {photoFile.status === "uploading" && (
                    <Progress value={photoFile.progress} className="h-1" />
                  )}

                  {/* Nombre del archivo */}
                  <div className="p-2">
                    <p className="text-xs truncate" title={photoFile.file.name}>
                      {photoFile.file.name}
                    </p>
                    {photoFile.error && (
                      <p className="text-xs text-red-500 truncate">{photoFile.error}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Botón de subir */}
          {pendingCount > 0 && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview));
                  setFiles([]);
                }}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button onClick={uploadFiles} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir {pendingCount} foto(s)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
