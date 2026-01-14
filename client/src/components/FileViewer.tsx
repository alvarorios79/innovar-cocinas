import { useState, useEffect, useCallback, useRef } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  FileText,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileItem {
  url: string;
  title?: string;
  description?: string;
  type?: "image" | "pdf";
}

interface FileViewerProps {
  files: FileItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

// Detectar si es PDF por la URL o el tipo
function isPdfFile(file: FileItem): boolean {
  if (file.type === "pdf") return true;
  const url = file.url.toLowerCase();
  return url.endsWith(".pdf") || url.includes("application/pdf");
}

export function FileViewer({ files, initialIndex = 0, isOpen, onClose }: FileViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFile = files[currentIndex];
  const isPdf = currentFile ? isPdfFile(currentFile) : false;

  // Reset cuando cambia el archivo
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Reset index cuando se abre
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "+":
        case "=":
          if (!isPdf) zoomIn();
          break;
        case "-":
          if (!isPdf) zoomOut();
          break;
        case "r":
          if (!isPdf) rotate();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, files.length, isPdf, isFullscreen]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  }, [files.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  }, [files.length]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Manejo de gestos táctiles para zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isPdf) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  }, [isPdf]);

  // Manejo de arrastre
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPdf) return;
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position, isPdf]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPdf) return;
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, scale, isPdf]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Descargar archivo
  const downloadFile = useCallback(async () => {
    const file = files[currentIndex];
    if (!file) return;

    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = isPdfFile(file) ? "pdf" : "jpg";
      a.download = file.title || `archivo-${currentIndex + 1}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }, [currentIndex, files]);

  // Manejo de gestos táctiles para móviles
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isPdf) return;
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    }
  }, [isPdf]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPdf) return;
    if (e.touches.length === 1 && touchStart) {
      const deltaX = e.touches[0].clientX - touchStart.x;
      
      // Swipe para cambiar archivo (solo si no hay zoom)
      if (scale === 1 && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
        setTouchStart(null);
      }
    } else if (e.touches.length === 2 && touchDistance !== null) {
      // Pinch to zoom
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (newDistance - touchDistance) / 100;
      setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
      setTouchDistance(newDistance);
    }
  }, [touchStart, touchDistance, scale, goToPrevious, goToNext, isPdf]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setTouchDistance(null);
  }, []);

  if (!isOpen || files.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-75">
            {currentIndex + 1} / {files.length}
          </span>
          {isPdf && (
            <span className="flex items-center gap-1 text-sm bg-red-500/20 text-red-300 px-2 py-1 rounded">
              <FileText className="h-4 w-4" />
              PDF
            </span>
          )}
          {currentFile?.title && (
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
              {currentFile.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {!isPdf && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <span className="text-xs sm:text-sm w-12 sm:w-16 text-center hidden sm:block">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                onClick={zoomIn}
                disabled={scale >= 5}
              >
                <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                onClick={rotate}
              >
                <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            onClick={downloadFile}
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            onClick={onClose}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {/* Content container */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center overflow-hidden",
          !isPdf && "cursor-grab active:cursor-grabbing"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={!isPdf ? resetView : undefined}
      >
        {isPdf ? (
          // PDF Viewer usando iframe
          <iframe
            src={`${currentFile?.url}#toolbar=1&navpanes=0&scrollbar=1`}
            className={cn(
              "bg-white rounded-lg shadow-2xl",
              isFullscreen 
                ? "w-full h-full" 
                : "w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] h-[85%] sm:h-[90%]"
            )}
            title={currentFile?.title || "PDF Viewer"}
          />
        ) : (
          // Image Viewer
          <img
            src={currentFile?.url}
            alt={currentFile?.title || `Imagen ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain select-none transition-transform duration-100"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Navigation arrows */}
      {files.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>
        </>
      )}

      {/* Description */}
      {currentFile?.description && (
        <div className="p-4 text-white text-center">
          <p className="text-sm opacity-75">{currentFile.description}</p>
        </div>
      )}

      {/* Thumbnails */}
      {files.length > 1 && !isFullscreen && (
        <div className="p-2 sm:p-4 flex justify-center gap-2 overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-12 h-12 sm:w-16 sm:h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-all",
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75"
              )}
            >
              {isPdfFile(file) ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                </div>
              ) : (
                <img
                  src={file.url}
                  alt={file.title || `Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook para usar el FileViewer fácilmente
export function useFileViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const openViewer = useCallback((
    newFiles: FileItem[],
    index = 0
  ) => {
    setFiles(newFiles);
    setInitialIndex(index);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    files,
    initialIndex,
    openViewer,
    closeViewer,
  };
}
