import { useLocation } from "wouter";
import { useRouter } from "wouter";
import { Home, FolderOpen, FileText, Users, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

export function MobileBottomNavigation() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Solo mostrar en pantallas móviles (< 768px)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (!isMobile || !user) return null;

  const isActive = (path: string) => location.startsWith(path);

  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: FolderOpen, label: "Proyectos", path: "/projects" },
    { icon: FileText, label: "Cotizaciones", path: "/quotations" },
    { icon: Users, label: "Clientes", path: "/clients" },
    { icon: Menu, label: "Menú", path: "/menu" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border md:hidden z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-full rounded-none flex-1 ${
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
