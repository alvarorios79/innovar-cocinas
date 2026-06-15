import { useLocation } from "wouter";
import { Home, FolderOpen, FileText, Users, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";

export function MobileBottomNavigation() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Detectar pantalla móvil y cambios de tamaño
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animar al cambiar de ruta
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  if (!isMobile || !user) return null;

  const isActive = (path: string) => location.startsWith(path);

  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: FolderOpen, label: "Proyectos", path: "/projects" },
    { icon: FileText, label: "Cotizaciones", path: "/quotations" },
    { icon: Users, label: "Clientes", path: "/admin" },
    { icon: Menu, label: "Menú", path: "/menu" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-teal-600 to-teal-700 border-t border-teal-800 md:hidden z-40 safe-area-inset-bottom shadow-2xl">
      {/* Línea de indicador de carga */}
      {isAnimating && (
        <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-accent via-accent to-transparent animate-pulse" />
      )}

      <div className="flex justify-around items-center h-16">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-full rounded-none flex-1 transition-all duration-300 ease-in-out relative group ${
                active
                  ? "bg-[#162828]/20 text-white font-semibold"
                  : "text-white/70 hover:bg-[#162828]/10"
              }`}
              onClick={() => setLocation(item.path)}
              style={{
                animation: active ? `slideUp 0.3s ease-out ${index * 0.05}s` : "none",
              }}
            >
              {/* Icono con animación */}
              <Icon
                className={`w-5 h-5 transition-all duration-300 ${
                  active ? "scale-110 animate-bounce" : "scale-100 group-hover:scale-105"
                }`}
              />

              {/* Etiqueta con animación */}
              <span
                className={`text-xs font-medium transition-all duration-300 ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>

              {/* Indicador de ruta activa */}
              {active && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
