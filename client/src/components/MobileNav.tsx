import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, FolderKanban, ListTodo, Calendar, Settings, User, LogOut } from "lucide-react";
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
      roles: ["admin", "super_admin", "disenador", "jefe_taller", "operario"]
    },
    { 
      href: "/tasks", 
      label: "Tareas", 
      icon: <ListTodo className="h-5 w-5" />,
      roles: ["admin", "super_admin", "disenador", "jefe_taller", "operario"]
    },
    { 
      href: "/calendar", 
      label: "Calendario", 
      icon: <Calendar className="h-5 w-5" />,
      roles: ["admin", "super_admin", "jefe_taller"]
    },
    { 
      href: "/admin", 
      label: "Panel Admin", 
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin", "super_admin"]
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
      {isAuthenticated && <NotificationBell />}
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
              <img 
                src="/logo-light.png" 
                alt="INNOVAR" 
                className="h-10 w-auto object-contain"
              />
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
                      <span className="font-medium">{item.label}</span>
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
