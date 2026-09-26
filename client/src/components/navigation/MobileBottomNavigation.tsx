import { useLocation } from "wouter";
import { Home, FolderOpen, FileText, Users, Menu, Ruler, MessageCircle, X, Calendar, ListTodo, Settings, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

export function MobileBottomNavigation() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Draggable WhatsApp button state
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem("wa-btn-pos");
      return saved ? JSON.parse(saved) : { x: window.innerWidth - 72, y: window.innerHeight - 160 };
    } catch { return { x: 300, y: 500 }; }
  });
  const dragging = useRef(false);
  const startOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current = true;
    const nx = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - startOffset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - startOffset.current.y));
    setPos({ x: nx, y: ny });
  };
  const onPointerUp = () => {
    dragging.current = false;
    localStorage.setItem("wa-btn-pos", JSON.stringify(pos));
  };
  const onWaClick = () => {
    if (!moved.current) window.open("https://wa.me/573136802025", "_blank", "noopener,noreferrer");
  };

  if (!isMobile || !user) return null;

  const isActive = (path: string) => location === path || (path !== "/" && location.startsWith(path));

  const navItems = user.role === "medidor"
    ? [{ icon: Ruler, label: "Mis Visitas", path: "/medidor" }]
    : [
        { icon: Home, label: "Inicio", path: "/" },
        { icon: FolderOpen, label: "Proyectos", path: "/projects" },
        { icon: FileText, label: "Cotizaciones", path: "/quotations" },
        { icon: Users, label: "Clientes", path: "/admin" },
      ];

  const menuLinks = [
    { label: "Citas", path: "/citas", icon: Calendar },
    { label: "Tareas", path: "/tasks", icon: ListTodo },
    { label: "Diseño", path: "/design", icon: Settings },
    { label: "Producción", path: "/production", icon: Settings },
    { label: "Contabilidad", path: "/financiero", icon: FileText },
  ];

  return (
    <>
      {/* Botón WhatsApp flotante arrastrable */}
      <div
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, touchAction: "none", userSelect: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onWaClick}
      >
        <div className="w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Sheet del Menú */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-[#0C1A1A] border-r border-white/10">
          <SheetHeader>
            <SheetTitle className="text-white text-left">Menú</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 space-y-1">
            {menuLinks.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => { setLocation(path); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors text-left"
              >
                <Icon className="h-5 w-5 text-teal-400" />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            ))}
          </nav>
          <div className="absolute bottom-8 left-4 right-4">
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-teal-600 to-teal-700 border-t border-teal-800 md:hidden z-40 safe-area-inset-bottom shadow-2xl">
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
                className={`flex flex-col items-center gap-1 h-full rounded-none flex-1 transition-all duration-200 relative group ${
                  active ? "bg-[#162828]/20 text-white font-semibold" : "text-white/70 hover:bg-[#162828]/10"
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${active ? "scale-110" : "scale-100"}`} />
                <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />}
              </Button>
            );
          })}
          {/* Botón Menú — abre Sheet */}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-full rounded-none flex-1 text-white/70 hover:bg-[#162828]/10 transition-all duration-200"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-medium">Menú</span>
          </Button>
        </div>
      </div>

      <style>{`
        .safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </>
  );
}
