import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, FolderKanban, ListTodo, Calendar, Settings, User, LogOut, Calculator } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { NotificationBell } from "@/components/NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  // Query para contar proyectos nuevos según el rol
  const { data: projects = [] } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated && ["comercial", "disenador", "jefe_taller", "operario"].includes(user?.role || ""),
  });
  
  // Calcular proyectos "nuevos" según el rol
  const getNewProjectsCount = () => {
    if (!user?.role) return 0;
    if (user.role === "comercial") {
      // Para comercial: proyectos activos (no entregados ni cancelados)
      return projects.filter((p: any) => !['entregado', 'cancelado'].includes(p.status)).length;
    }
    if (user.role === "disenador") {
      // Proyectos en adelanto_recibido (nuevos para diseñar)
      return projects.filter((p: any) => p.status === "adelanto_recibido").length;
    }
    if (user.role === "jefe_taller") {
      // Proyectos en despiece (nuevos para producción)
      return projects.filter((p: any) => p.status === "despiece").length;
    }
    if (user.role === "operario") {
      // Proyectos en etapas de producción activa
      return projects.filter((p: any) => ["corte", "enchape", "ensamble"].includes(p.status)).length;
    }
    return 0;
  };
  
  const newProjectsCount = getNewProjectsCount();
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const navItems: NavItem[] = [
    { href: "/", label: "Inicio", icon: <Home className="h-5 w-5" /> },
    { href: "/portal", label: "Mi Portal", icon: <User className="h-5 w-5" /> },
    { 
      href: "/projects", 
      label: "Proyectos", 
      icon: <FolderKanban className="h-5 w-5" />,
      roles: ["admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario"]
    },
    { 
      href: "/tasks", 
      label: "Tareas", 
      icon: <ListTodo className="h-5 w-5" />,
      roles: ["admin", "super_admin", "comercial", "disenador", "jefe_taller", "operario"]
    },
    { 
      href: "/calendar", 
      label: "Calendario", 
      icon: <Calendar className="h-5 w-5" />,
      roles: ["admin", "super_admin", "comercial", "jefe_taller"]
    },
    { 
      href: user?.role === "comercial" ? "/comercial" : "/admin", 
      label: user?.role === "comercial" ? "Panel Comercial" : "Panel Admin", 
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin", "super_admin", "comercial"]
    },
    { 
      href: "/accounting", 
      label: "Contabilidad", 
      icon: <Calculator className="h-5 w-5" />,
      roles: ["admin", "super_admin", "comercial"]
    },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 md:hidden">
      {/* NotificationBell removido aquí - ya se muestra en el componente padre */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] sm:w-[320px]">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="rounded overflow-hidden flex items-center justify-center shrink-0"
                style={{ width: 40, height: 40, background: "#0C1A1A", border: "1px solid rgba(106,207,199,0.15)" }}>
                <img src="/logo-dark.jpg" alt="INNOVAR"
                  style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "screen" }} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-sm text-white" style={{ letterSpacing: "0.14em" }}>INNOVAR</span>
                <span className="text-[10px]" style={{ color: "rgba(106,207,199,0.55)" }}>Cocinas de Diseño</span>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          {isAuthenticated ? (
            <div className="flex flex-col h-[calc(100%-80px)]">
              {/* User info */}
              <div className="px-2 py-3 mb-4 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{user?.name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role === "super_admin" ? "Super Admin" : 
                   user?.role === "jefe_taller" ? "Jefe de Taller" :
                   user?.role === "disenador" ? "Diseñador" :
                   user?.role === "operario" ? "Operario" :
                   user?.role === "admin" ? "Administrador" : "Usuario"}
                </p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1">
                {filteredNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <button
                      onClick={() => setOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        location === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium flex-1">{item.label}</span>
                      {item.href === "/projects" && newProjectsCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                          {newProjectsCount}
                        </span>
                      )}
                    </button>
                  </Link>
                ))}
              </nav>

              {/* Logout */}
              <div className="pt-4 border-t mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Link href="/login">
                <Button className="w-full" onClick={() => setOpen(false)}>
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
