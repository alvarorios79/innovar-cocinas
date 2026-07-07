import { useState } from "react";

interface WatermarkedImageProps {
  src: string;
  alt: string;
  className?: string;
  watermarkSrc?: string;
  watermarkOpacity?: number;
  watermarkSize?: number; // Porcentaje del ancho de la imagen (0-100)
  watermarkPosition?: "center" | "bottom-right" | "bottom-left" | "top-right" | "top-left";
  onClick?: () => void;
}

export function WatermarkedImage({
  src,
  alt,
  className = "",
  watermarkSrc = "/logo-light.png",
  watermarkOpacity = 0.3,
  watermarkSize = 25,
  watermarkPosition = "bottom-right",
  onClick,
}: WatermarkedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Calcular posición del watermark
  const getPositionStyles = () => {
    const padding = "8px";
    switch (watermarkPosition) {
      case "center":
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
      case "bottom-right":
        return { bottom: padding, right: padding };
      case "bottom-left":
        return { bottom: padding, left: padding };
      case "top-right":
        return { top: padding, right: padding };
      case "top-left":
        return { top: padding, left: padding };
      default:
        return { bottom: padding, right: padding };
    }
  };

  if (error) {
    return (
      <div className={`bg-white/[0.10] flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Error al cargar imagen</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/[0.06] animate-pulse flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Imagen principal */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      
      {/* Marca de agua como overlay */}
      {!isLoading && !error && (
        <div 
          className="absolute pointer-events-none"
          style={{
            ...getPositionStyles(),
            width: `${watermarkSize}%`,
            opacity: watermarkOpacity,
          }}
        >
          <img
            src={watermarkSrc}
            alt="INNOVAR"
            className="w-full h-auto"
            style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.8))" }}
          />
        </div>
      )}
    </div>
  );
}

// Componente para el visor de pantalla completa con marca de agua
interface WatermarkedFullscreenImageProps {
  src: string;
  alt: string;
  watermarkSrc?: string;
  watermarkOpacity?: number;
  watermarkSize?: number;
  watermarkPosition?: "center" | "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function WatermarkedFullscreenImage({
  src,
  alt,
  watermarkSrc = "/logo-light.png",
  watermarkOpacity = 0.25,
  watermarkSize = 15,
  watermarkPosition = "bottom-right",
}: WatermarkedFullscreenImageProps) {
  // Calcular posición del watermark
  const getPositionStyles = () => {
    const padding = "20px";
    switch (watermarkPosition) {
      case "center":
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
      case "bottom-right":
        return { bottom: padding, right: padding };
      case "bottom-left":
        return { bottom: padding, left: padding };
      case "top-right":
        return { top: padding, right: padding };
      case "top-left":
        return { top: padding, left: padding };
      default:
        return { bottom: padding, right: padding };
    }
  };

  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[85vh] object-contain"
      />
      
      {/* Marca de agua como overlay */}
      <div 
        className="absolute pointer-events-none"
        style={{
          ...getPositionStyles(),
          width: `${watermarkSize}%`,
          minWidth: "80px",
          maxWidth: "200px",
          opacity: watermarkOpacity,
        }}
      >
        <img
          src={watermarkSrc}
          alt="INNOVAR"
          className="w-full h-auto"
          style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.9))" }}
        />
      </div>
    </div>
  );
}
