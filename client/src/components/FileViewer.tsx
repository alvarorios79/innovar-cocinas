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
  Minimize2,
  RotateCcw
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
  const [showMobileControls, setShowMobileControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Para gestos táctiles mejorados
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

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
      setShowMobileControls(true);
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

  // Manejo de gestos táctiles para zoom con rueda del mouse
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isPdf) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  }, [isPdf]);

  // Manejo de arrastre con mouse
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

  // ============ GESTOS TÁCTILES MEJORADOS PARA MÓVILES ============
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isPdf) return;
    
    touchStartTime.current = Date.now();
    
    if (e.touches.length === 1) {
      // Un dedo - preparar para swipe o tap
      touchStartPos.current = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      };
      
      // Si hay zoom, preparar para arrastrar
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ 
          x: e.touches[0].clientX - position.x, 
          y: e.touches[0].clientY - position.y 
        });
      }
    } else if (e.touches.length === 2) {
      // Dos dedos - preparar para pinch zoom
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, [isPdf, scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPdf) return;
    
    if (e.touches.length === 1 && touchStartPos.current) {
      const deltaX = e.touches[0].clientX - touchStartPos.current.x;
      const deltaY = e.touches[0].clientY - touchStartPos.current.y;
      
      // Si hay zoom, arrastrar la imagen
      if (scale > 1 && isDragging) {
        e.preventDefault();
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
      // Si no hay zoom y es un swipe horizontal significativo
      else if (scale === 1 && Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
        touchStartPos.current = null;
      }
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch to zoom
      e.preventDefault();
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scaleFactor = newDistance / lastTouchDistance.current;
      const newScale = Math.max(0.5, Math.min(5, scale * scaleFactor));
      
      setScale(newScale);
      lastTouchDistance.current = newDistance;
    }
  }, [isPdf, scale, isDragging, dragStart, goToPrevious, goToNext]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPdf) return;
    
    const touchDuration = Date.now() - touchStartTime.current;
    
    // Doble tap para resetear zoom (tap rápido sin mucho movimiento)
    if (touchDuration < 300 && touchStartPos.current && e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const moveDistance = Math.hypot(
        endX - touchStartPos.current.x,
        endY - touchStartPos.current.y
      );
      
      // Si fue un tap (poco movimiento), toggle controles móviles
      if (moveDistance < 10) {
        setShowMobileControls(prev => !prev);
      }
    }
    
    setIsDragging(false);
    touchStartPos.current = null;
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
  }, [isPdf]);

  // Prevenir el zoom nativo del navegador en el contenedor
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    return () => {
      container.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, [isOpen]);

  if (!isOpen || files.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col touch-none"
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header - siempre visible en desktop, toggle en móvil */}
      <div className={cn(
        "flex items-center justify-between p-2 sm:p-4 text-white transition-opacity duration-300",
        !showMobileControls && "sm:opacity-100 opacity-0 pointer-events-none sm:pointer-events-auto"
      )}>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm opacity-75">
            {currentIndex + 1} / {files.length}
          </span>
          {isPdf && (
            <span className="flex items-center gap-1 text-xs sm:text-sm bg-red-500/20 text-red-300 px-2 py-1 rounded">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              PDF
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 sm:h-10 sm:w-10"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-xs w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 sm:h-10 sm:w-10"
                onClick={zoomIn}
                disabled={scale >= 5}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 sm:h-10 sm:w-10"
                onClick={rotate}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={downloadFile}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content container */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center overflow-hidden relative",
          !isPdf && scale > 1 && "cursor-grab active:cursor-grabbing"
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
            ref={imageRef}
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

      {/* Controles flotantes para móvil - siempre visibles cuando showMobileControls es true */}
      {!isPdf && (
        <div className={cn(
          "absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 transition-opacity duration-300 sm:hidden",
          showMobileControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-6 w-6" />
          </Button>
          <span className="text-white text-sm w-14 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={zoomIn}
            disabled={scale >= 5}
          >
            <ZoomIn className="h-6 w-6" />
          </Button>
          <div className="w-px h-8 bg-white/30 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={rotate}
          >
            <RotateCw className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={resetView}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Indicador de instrucciones para móvil */}
      {!isPdf && scale === 1 && showMobileControls && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-center pointer-events-none sm:hidden">
          <p className="text-xs">Pellizca para zoom</p>
          <p className="text-xs">Toca para ocultar controles</p>
        </div>
      )}

      {/* Navigation arrows */}
      {files.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 sm:h-14 sm:w-14 transition-opacity duration-300",
              !showMobileControls && "sm:opacity-100 opacity-0 pointer-events-none sm:pointer-events-auto"
            )}
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 sm:h-14 sm:w-14 transition-opacity duration-300",
              !showMobileControls && "sm:opacity-100 opacity-0 pointer-events-none sm:pointer-events-auto"
            )}
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Description */}
      {currentFile?.description && showMobileControls && (
        <div className="p-2 sm:p-4 text-white text-center">
          <p className="text-xs sm:text-sm opacity-75">{currentFile.description}</p>
        </div>
      )}

      {/* Thumbnails */}
      {files.length > 1 && !isFullscreen && showMobileControls && (
        <div className="p-2 flex justify-center gap-2 overflow-x-auto">
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
                  <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-red-400" />
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
