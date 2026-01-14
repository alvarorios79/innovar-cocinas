import { useState, useEffect, useCallback, useRef } from "react";
import { useGesture } from "@use-gesture/react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  FileText,
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
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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
      setShowControls(true);
    }
  }, [isOpen, initialIndex]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, files.length, isPdf]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Prevenir zoom del navegador en iOS
      const meta = document.querySelector('meta[name="viewport"]');
      const originalContent = meta?.getAttribute('content') || '';
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
      return () => {
        document.body.style.overflow = "";
        if (meta) {
          meta.setAttribute('content', originalContent);
        }
      };
    }
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

  // Usar @use-gesture/react para gestos táctiles (compatible con iOS y Android)
  const bind = useGesture(
    {
      onPinch: ({ offset: [s], memo }) => {
        if (isPdf) return memo;
        const newScale = Math.max(0.5, Math.min(5, s));
        setScale(newScale);
        return memo;
      },
      onDrag: ({ offset: [x, y], pinching, cancel, first, movement: [mx, my] }) => {
        if (isPdf) return;
        
        // Si está haciendo pinch, cancelar el drag
        if (pinching) {
          cancel();
          return;
        }
        
        // Si hay zoom, permitir arrastrar
        if (scale > 1) {
          setPosition({ x, y });
        } 
        // Si no hay zoom y es un swipe horizontal significativo
        else if (!first && Math.abs(mx) > 80 && Math.abs(my) < 50) {
          if (mx > 0) {
            goToPrevious();
          } else {
            goToNext();
          }
          cancel();
        }
      },
      onWheel: ({ delta: [, dy] }) => {
        if (isPdf) return;
        const newScale = Math.max(0.5, Math.min(5, scale - dy * 0.001));
        setScale(newScale);
      },
      onClick: ({ event }) => {
        // Toggle controles al hacer tap (solo si no es un drag)
        if (event.type === 'click' || event.type === 'touchend') {
          setShowControls(prev => !prev);
        }
      },
      onDoubleClick: () => {
        if (isPdf) return;
        // Doble tap para resetear o hacer zoom
        if (scale > 1) {
          resetView();
        } else {
          setScale(2);
        }
      }
    },
    {
      drag: {
        from: () => [position.x, position.y],
        bounds: scale > 1 ? { left: -500, right: 500, top: -500, bottom: 500 } : { left: 0, right: 0, top: 0, bottom: 0 },
        rubberband: true,
        filterTaps: true,
      },
      pinch: {
        scaleBounds: { min: 0.5, max: 5 },
        from: () => [scale, 0],
        rubberband: true,
      },
    }
  );

  if (!isOpen || files.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none"
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-2 sm:p-4 text-white transition-opacity duration-300 z-10",
        !showControls && "opacity-0 pointer-events-none"
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
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={(e) => { e.stopPropagation(); zoomOut(); }}
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
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                disabled={scale >= 5}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={(e) => { e.stopPropagation(); rotate(); }}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={(e) => { e.stopPropagation(); downloadFile(); }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content container */}
      <div
        ref={imageContainerRef}
        {...(isPdf ? {} : bind())}
        className={cn(
          "flex-1 flex items-center justify-center overflow-hidden relative",
          !isPdf && "touch-none"
        )}
        style={{ touchAction: isPdf ? 'auto' : 'none' }}
      >
        {isPdf ? (
          // PDF Viewer usando iframe
          <iframe
            src={`${currentFile?.url}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] h-[85%] sm:h-[90%] bg-white rounded-lg shadow-2xl"
            title={currentFile?.title || "PDF Viewer"}
          />
        ) : (
          // Image Viewer
          <img
            src={currentFile?.url}
            alt={currentFile?.title || `Imagen ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain select-none pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Controles flotantes para móvil */}
      {!isPdf && (
        <div className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 rounded-full px-5 py-3 transition-opacity duration-300 sm:hidden z-20",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-7 w-7" />
          </Button>
          <span className="text-white text-base w-16 text-center font-bold">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            disabled={scale >= 5}
          >
            <ZoomIn className="h-7 w-7" />
          </Button>
          <div className="w-px h-10 bg-white/30 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
            onClick={(e) => { e.stopPropagation(); rotate(); }}
          >
            <RotateCw className="h-7 w-7" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
            onClick={(e) => { e.stopPropagation(); resetView(); }}
          >
            <RotateCcw className="h-7 w-7" />
          </Button>
        </div>
      )}

      {/* Indicador de instrucciones para móvil */}
      {!isPdf && scale === 1 && showControls && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-center pointer-events-none sm:hidden z-10">
          <p className="text-sm font-medium">Pellizca para zoom</p>
          <p className="text-xs mt-1">Doble tap para ampliar</p>
          <p className="text-xs">Desliza para cambiar</p>
        </div>
      )}

      {/* Navigation arrows */}
      {files.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-full transition-opacity duration-300 z-20",
              !showControls && "opacity-0 pointer-events-none"
            )}
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
          >
            <ChevronLeft className="h-10 w-10" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-full transition-opacity duration-300 z-20",
              !showControls && "opacity-0 pointer-events-none"
            )}
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
          >
            <ChevronRight className="h-10 w-10" />
          </Button>
        </>
      )}

      {/* Description */}
      {currentFile?.description && showControls && (
        <div className="p-2 sm:p-4 text-white text-center z-10">
          <p className="text-xs sm:text-sm opacity-75">{currentFile.description}</p>
        </div>
      )}

      {/* Thumbnails */}
      {files.length > 1 && showControls && (
        <div className="p-2 flex justify-center gap-2 overflow-x-auto z-10">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                index === currentIndex
                  ? "border-white opacity-100 ring-2 ring-white/50"
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
