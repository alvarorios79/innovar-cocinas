import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  images: Array<{
    url: string;
    title?: string;
    description?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset cuando cambia la imagen
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
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "r":
          rotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

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
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

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

  // Manejo de gestos táctiles para zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  }, []);

  // Manejo de arrastre
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Descargar imagen
  const downloadImage = useCallback(async () => {
    const image = images[currentIndex];
    if (!image) return;

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.title || `imagen-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  }, [currentIndex, images]);

  // Manejo de gestos táctiles para móviles
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart) {
      const deltaX = e.touches[0].clientX - touchStart.x;
      
      // Swipe para cambiar imagen (solo si no hay zoom)
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
  }, [touchStart, touchDistance, scale, goToPrevious, goToNext]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setTouchDistance(null);
  }, []);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

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
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage?.title && (
            <span className="text-sm font-medium">{currentImage.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#162828]/20"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#162828]/20"
            onClick={zoomIn}
            disabled={scale >= 5}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#162828]/20"
            onClick={rotate}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#162828]/20"
            onClick={downloadImage}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#162828]/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={resetView}
      >
        <img
          src={currentImage?.url}
          alt={currentImage?.title || `Imagen ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain select-none transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-[#162828]/20 h-12 w-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-[#162828]/20 h-12 w-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Description */}
      {currentImage?.description && (
        <div className="p-4 text-white text-center">
          <p className="text-sm opacity-75">{currentImage.description}</p>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="p-4 flex justify-center gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-16 h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-all",
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75"
              )}
            >
              <img
                src={image.url}
                alt={image.title || `Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook para usar el ImageViewer fácilmente
export function useImageViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<Array<{ url: string; title?: string; description?: string }>>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const openViewer = useCallback((
    newImages: Array<{ url: string; title?: string; description?: string }>,
    index = 0
  ) => {
    setImages(newImages);
    setInitialIndex(index);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    images,
    initialIndex,
    openViewer,
    closeViewer,
  };
}
