import { useState, useEffect, useCallback, useRef } from "react";
import { useGesture } from "@use-gesture/react";
import { Document, Page, pdfjs } from "react-pdf";
// Estilos de react-pdf se manejan inline
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  FileText,
  RotateCcw,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentFile = files[currentIndex];
  const isPdf = currentFile ? isPdfFile(currentFile) : false;

  // Reset cuando cambia el archivo
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setCurrentPage(1);
    setNumPages(null);
    setPdfError(false);
  }, [currentIndex]);

  // Reset index cuando se abre
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setShowControls(true);
      setCurrentPage(1);
      setNumPages(null);
      setPdfError(false);
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
        case "ArrowUp":
          if (isPdf && currentPage > 1) setCurrentPage(p => p - 1);
          break;
        case "ArrowDown":
          if (isPdf && numPages && currentPage < numPages) setCurrentPage(p => p + 1);
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "r":
          if (!isPdf) rotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, files.length, isPdf, currentPage, numPages]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
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

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (numPages && currentPage < numPages) setCurrentPage(p => p + 1);
  }, [currentPage, numPages]);

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

  // Gestos táctiles para imágenes y PDFs
  const bind = useGesture(
    {
      onPinch: ({ offset: [s], memo }) => {
        const newScale = Math.max(0.5, Math.min(5, s));
        setScale(newScale);
        return memo;
      },
      onDrag: ({ offset: [x, y], pinching, cancel, first, movement: [mx, my] }) => {
        if (pinching) {
          cancel();
          return;
        }
        
        if (scale > 1) {
          setPosition({ x, y });
        } else if (!first && !isPdf && Math.abs(mx) > 80 && Math.abs(my) < 50) {
          if (mx > 0) {
            goToPrevious();
          } else {
            goToNext();
          }
          cancel();
        }
      },
      onWheel: ({ delta: [, dy] }) => {
        const newScale = Math.max(0.5, Math.min(5, scale - dy * 0.001));
        setScale(newScale);
      },
      onClick: ({ event }) => {
        if (event.type === 'click' || event.type === 'touchend') {
          setShowControls(prev => !prev);
        }
      },
      onDoubleClick: () => {
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(false);
  };

  const onDocumentLoadError = () => {
    setPdfError(true);
  };

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
              PDF {numPages && `(${currentPage}/${numPages})`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
          {!isPdf && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-10 w-10"
              onClick={(e) => { e.stopPropagation(); rotate(); }}
            >
              <RotateCw className="h-5 w-5" />
            </Button>
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
        ref={contentRef}
        {...bind()}
        className="flex-1 flex items-center justify-center overflow-hidden relative touch-none"
        style={{ touchAction: 'none' }}
      >
        {isPdf ? (
          // PDF Viewer con react-pdf
          <div
            className="flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            {pdfError ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <FileText className="h-16 w-16 mx-auto text-red-500 mb-4" />
                <p className="text-gray-800 font-medium mb-2">No se pudo cargar el PDF</p>
                <p className="text-gray-500 text-sm mb-4">El archivo puede estar dañado o no ser accesible</p>
                <Button onClick={downloadFile} className="bg-teal-600 hover:bg-teal-700">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            ) : (
              <Document
                file={currentFile?.url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Cargando PDF...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-2xl"
                  width={Math.min(window.innerWidth * 0.9, 800)}
                />
              </Document>
            )}
          </div>
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
        {isPdf && numPages && numPages > 1 ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
              onClick={(e) => { e.stopPropagation(); goToPreviousPage(); }}
              disabled={currentPage <= 1}
            >
              <ChevronUp className="h-7 w-7" />
            </Button>
            <span className="text-white text-sm w-12 text-center">
              {currentPage}/{numPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-14 w-14 rounded-full"
              onClick={(e) => { e.stopPropagation(); goToNextPage(); }}
              disabled={currentPage >= numPages}
            >
              <ChevronDown className="h-7 w-7" />
            </Button>
          </>
        ) : !isPdf ? (
          <>
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
          </>
        ) : null}
      </div>

      {/* Indicador de instrucciones para móvil */}
      {scale === 1 && showControls && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-center pointer-events-none sm:hidden z-10">
          <p className="text-sm font-medium">Pellizca para zoom</p>
          <p className="text-xs mt-1">Doble tap para ampliar</p>
          {!isPdf && <p className="text-xs">Desliza para cambiar</p>}
          {isPdf && numPages && numPages > 1 && <p className="text-xs">Usa las flechas para páginas</p>}
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

      {/* PDF Page navigation for desktop */}
      {isPdf && numPages && numPages > 1 && (
        <div className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-2 z-20 transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12 rounded-full"
            onClick={(e) => { e.stopPropagation(); goToPreviousPage(); }}
            disabled={currentPage <= 1}
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
          <div className="text-white text-center text-sm py-2">
            {currentPage}<br/><span className="opacity-50">de {numPages}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12 rounded-full"
            onClick={(e) => { e.stopPropagation(); goToNextPage(); }}
            disabled={currentPage >= numPages}
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
        </div>
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
