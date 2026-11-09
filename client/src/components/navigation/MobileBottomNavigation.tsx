import { useLocation } from "wouter";
import {
  Home, FolderOpen, FileText, Users, Menu, Ruler, MessageCircle, ListTodo, Wrench, Palette, BookOpen, LogOut, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { getVisibleMenuSections } from "@/components/DashboardLayout";

type NavItem = { icon: React.ComponentType<{ className?: string }>; label: string; path: string };

/** Accesos rápidos de la barra de abajo (celular): cada rol ve solo lo suyo. */
function shortcutsForRole(role: string): NavItem[] {
  const inicio = { icon: Home, label: "Inicio", path: "/" };
  const proyectos = { icon: FolderOpen, label: "Proyectos", path: "/projects" };
  switch (role) {
    case "medidor":
      return [{ icon: Ruler, label: "Mis visitas", path: "/medidor" }];
    case "jefe_taller":
    case "operario":
      return [inicio, proyectos, { icon: Wrench, label: "Producción", path: "/production" }, { icon: ListTodo, label: "Tareas", path: "/tasks" }];
    case "disenador":
      return [inicio, proyectos, { icon: Palette, label: "Diseño", path: "/design" }, { icon: ListTodo, label: "Tareas", path: "/tasks" }];
    case "contador":
      return [inicio, proyectos, { icon: BookOpen, label: "Contador", path: "/contador" }, { icon: ListTodo, label: "Tareas", path: "/tasks" }];
    default: // super_admin, admin, comercial
      return [inicio, proyectos, { icon: FileText, label: "Cotizaciones", path: "/quotations" }, { icon: Users, label: "Clientes", path: "/clients" }];
  }
}

/** La burbuja de WhatsApp (atajo para escribirle a la central, 313 680 2025) no se le muestra a quien maneja ese número. */
function hidesWhatsAppBubble(name?: string | null) {
  const n = (name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return n.includes("martha") && n.includes("serna");
}

export function MobileBottomNavigation() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Burbuja de WhatsApp arrastrable
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
    try { localStorage.setItem("wa-btn-pos", JSON.stringify(pos)); } catch { /* sin almacenamiento */ }
  };
  const onWaClick = () => {
    if (!moved.current) window.open("https://wa.me/573136802025", "_blank", "noopener,noreferrer");
  };

  // Páginas públicas para clientes: sin la barra del CRM aunque haya sesión abierta
  const PUBLIC_PREFIXES = ["/visita", "/agendar", "/gallery", "/cita", "/cotizacion", "/login"];
  if (!isMobile || !user || PUBLIC_PREFIXES.some(p => location.startsWith(p))) return null;

  const isActive = (path: string) => location === path || (path !== "/" && location.startsWith(path));
  const navItems = shortcutsForRole(user.role);
  // Menú completo = el mismo del computador, con los permisos de cada rol (super_admin ve todo)
  const sections = getVisibleMenuSections(user.role);
  const showWhatsApp = !hidesWhatsAppBubble(user.name);

  return (
    <>
      {/* Burbuja de WhatsApp: atajo para escribirle a la central de Innovar */}
      {showWhatsApp && (
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, touchAction: "none", userSelect: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={onWaClick}
          title="Escribir a la central de Innovar"
        >
          <div className="w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
        </div>
      )}

      {/* Menú completo */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-background border-r border-border flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left">Menú</SheetTitle>
          </SheetHeader>
          <nav className="mt-2 flex-1 overflow-y-auto space-y-4 pb-4">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
                {section.items.map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => { setLocation(path); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${isActive(path) ? "bg-primary/15 text-primary" : "text-foreground/85 hover:bg-accent"}`}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="flex-1 font-medium">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="mb-6 w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </SheetContent>
      </Sheet>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-teal-600 to-teal-700 border-t border-teal-800 md:hidden z-40 safe-area-inset-bottom shadow-2xl">
        {isAnimating && (
          <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-accent via-accent to-transparent animate-pulse" />
        )}
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-1 h-full rounded-none flex-1 transition-all duration-200 relative group ${
                  active ? "bg-card/20 text-white font-semibold" : "text-white/70 hover:bg-card/10"
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${active ? "scale-110" : "scale-100"}`} />
                <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-full rounded-none flex-1 text-white/70 hover:bg-card/10 transition-all duration-200"
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
