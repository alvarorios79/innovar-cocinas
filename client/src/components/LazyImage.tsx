import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailSrc?: string;
  onClick?: () => void;
  aspectRatio?: 'square' | 'video' | 'auto';
}

/**
 * Componente de imagen con lazy loading
 * Carga imágenes solo cuando son visibles en el viewport
 * Muestra un placeholder o thumbnail mientras carga
 */
export function LazyImage({
  src,
  alt,
  className,
  thumbnailSrc,
  onClick,
  aspectRatio = 'auto'
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Generar URL de thumbnail automáticamente si no se proporciona
  const autoThumbnailSrc = thumbnailSrc || src.replace(/\.([^.]+)$/, '-thumb.jpg');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Cargar 100px antes de que sea visible
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: ''
  }[aspectRatio];

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Placeholder/Skeleton mientras no está en vista */}
      {!isInView && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
      )}

      {/* Thumbnail de baja resolución (blur-up effect) */}
      {isInView && !isLoaded && !hasError && (
        <img
          src={autoThumbnailSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
          onError={() => {}} // Ignorar errores del thumbnail
        />
      )}

      {/* Imagen principal */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Estado de error */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Error al cargar</span>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Galería de imágenes con lazy loading
 */
interface LazyGalleryProps {
  images: Array<{
    url: string;
    alt?: string;
    thumbnailUrl?: string;
  }>;
  columns?: 2 | 3 | 4;
  onImageClick?: (index: number) => void;
}

export function LazyGallery({
  images,
  columns = 3,
  onImageClick
}: LazyGalleryProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
  }[columns];

  return (
    <div className={cn('grid gap-2', gridCols)}>
      {images.map((image, index) => (
        <LazyImage
          key={image.url}
          src={image.url}
          alt={image.alt || `Imagen ${index + 1}`}
          thumbnailSrc={image.thumbnailUrl}
          aspectRatio="square"
          className="rounded-lg"
          onClick={() => onImageClick?.(index)}
        />
      ))}
    </div>
  );
}
