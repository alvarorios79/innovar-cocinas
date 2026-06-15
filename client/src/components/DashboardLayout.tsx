import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  FolderKanban,
  FileText,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Calculator,
  DollarSign,
  Shield,
  Image as ImageIcon,
  ChevronDown,
  Users,
  KanbanSquare,
  Palette,
  Wrench,
  Truck,
  Star,
  Trash2,
  BarChart3,
  Package,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

// ── Tipos ────────────────────────────────────────────────────────────────────
type MenuItem = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  path: string;
  roles?: string[]; // si está definido, solo esos roles ven el ítem
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

// ── Estructura de navegación ─────────────────────────────────────────────────
const menuSections: MenuSection[] = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/ceo-dashboard",
        roles: ["super_admin", "admin"] },
    ],
  },
  {
    title: "CRM / Clientes",
    items: [
      { icon: Users, label: "Clientes", path: "/clients" },
    ],
  },
  {
    title: "Comercial",
    items: [
      { icon: KanbanSquare,  label: "Pipeline",     path: "/comercial",
        roles: ["super_admin", "admin", "comercial"] },
      { icon: FileText,      label: "Cotizaciones",  path: "/quotations" },
      { icon: CalendarCheck, label: "Citas",         path: "/appointments-calendar" },
    ],
  },
  {
    title: "Proyectos",
    items: [
      { icon: FolderKanban, label: "Proyectos", path: "/projects" },
    ],
  },
  {
    title: "Financiero",
    items: [
      { icon: DollarSign, label: "Contabilidad", path: "/accounting",
        roles: ["super_admin", "admin"] },
      { icon: BarChart3,  label: "Rentabilidad", path: "/profitability-dashboard",
        roles: ["super_admin", "admin"] },
    ],
  },
  {
    title: "Diseño",
    items: [
      { icon: Palette, label: "Diseño", path: "/design",
        roles: ["super_admin", "admin", "disenador"] },
    ],
  },
  {
    title: "Producción",
    items: [
      { icon: Wrench,        label: "Producción", path: "/production",
        roles: ["super_admin", "admin", "jefe_taller", "operario"] },
      { icon: ClipboardList, label: "Tareas",     path: "/tasks" },
    ],
  },
  {
    title: "Instalaciones",
    items: [
      { icon: Truck, label: "Instalaciones", path: "/calendar",
        roles: ["super_admin", "admin", "jefe_taller", "operario"] },
    ],
  },
  {
    title: "Postventa",
    items: [
      { icon: Star, label: "Postventa", path: "/postventa" },
    ],
  },
  {
    title: "Administración",
    items: [
      { icon: Shield,     label: "Admin",            path: "/admin",
        roles: ["super_admin", "admin"] },
      { icon: Calculator, label: "Motor de Cotización",           path: "/pricing-config",
        roles: ["super_admin", "admin"] },
      { icon: Package,    label: "Herrajes",                      path: "/herrajes",
        roles: ["super_admin", "admin"] },
      { icon: ImageIcon,  label: "Galerías",          path: "/galerias" },
    ],
  },
];

// ── Etiquetas de rol ─────────────────────────────────────────────────────────
const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500/15 text-purple-300 border-purple-400/25" },
  admin:       { label: "Admin",       color: "bg-[#6ACFC7]/15 text-[#6ACFC7] border-[#6ACFC7]/25" },
  comercial:   { label: "Comercial",   color: "bg-[#6ACFC7]/10 text-[#88d9d3] border-[#6ACFC7]/20" },
  disenador:   { label: "Diseñador",   color: "bg-indigo-500/15 text-indigo-300 border-indigo-400/25" },
  jefe_taller: { label: "Jefe Taller", color: "bg-amber-500/15 text-amber-300 border-amber-400/25" },
  operario:    { label: "Operario",    color: "bg-white/10 text-white/60 border-white/15" },
  user:        { label: "Usuario",     color: "bg-white/10 text-white/60 border-white/15" },
};

// ── Constantes de resize ─────────────────────────────────────────────────────
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 380;

// ── Logo INNOVAR ─────────────────────────────────────────────────────────────
function InnovarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 min-w-0">
      {/* Logo: mix-blend-mode:screen hace el fondo negro del JPG transparente */}
      <div
        className="shrink-0 rounded overflow-hidden flex items-center justify-center"
        style={{
          width: collapsed ? 36 : 44,
          height: collapsed ? 36 : 44,
          background: "#0C1A1A",
          border: "1px solid rgba(106,207,199,0.15)",
        }}
      >
        <img
          src="/logo-dark.jpg"
          alt="INNOVAR"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Texto: oculto en collapsed via clase shadcn */}
      <div
        className="flex flex-col min-w-0 leading-none"
        style={{ display: collapsed ? "none" : "flex" }}
      >
        <span
          className="font-bold text-sm text-white"
          style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          INNOVAR
        </span>
        <span className="text-[10px] mt-0.5" style={{ color: "rgba(106,207,199,0.55)" }}>
          Cocinas de Diseño
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Forzar cookie de sidebar a "expanded" siempre (debe ir antes de cualquier return condicional)
  useEffect(() => {
    document.cookie = "sidebar:state=expanded;path=/;max-age=31536000";
  }, []);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen"
        style={{ background: "#0C1A1A" }}>
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full rounded-2xl"
          style={{ background: "#162828", border: "1px solid rgba(106,207,199,0.20)" }}>
          <div className="flex flex-col items-center gap-3">
            <img src="/logo-dark.jpg" alt="INNOVAR"
              style={{ width: 90, height: 90, objectFit: "contain", borderRadius: 12 }} />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>Bienvenido</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Inicia sesión para acceder al sistema.</p>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg"
            className="w-full font-semibold transition-all"
            style={{ background: "#6ACFC7", color: "#0C1A1A" }}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": `${sidebarWidth}px`, "--sidebar-background": "#0A1616" } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ── Contenido interno ────────────────────────────────────────────────────────
type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const userRole = (user as any)?.role ?? "user";
  const roleInfo = roleLabels[userRole] ?? roleLabels["user"];

  // Filtrar secciones y ítems según el rol del usuario
  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    }))
    .filter((section) => section.items.length > 0);

  const activeMenuItem = visibleSections
    .flatMap((s) => s.items)
    .find((item) => item.path === location);

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-white/[0.06] bg-[#0C1A1A]"
        >
          {/* Header — logo */}
          <SidebarHeader className="h-16 justify-center border-b border-white/[0.06] bg-[#0C1A1A]">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-3 px-2 w-full rounded-lg transition-colors focus:outline-none"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(106,207,199,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              aria-label="Alternar navegación"
            >
              <InnovarLogo collapsed={isCollapsed} />
            </button>
          </SidebarHeader>

          {/* Menú con secciones */}
          <SidebarContent className="gap-0 py-2 bg-[#0C1A1A]">
            {visibleSections.map((section) => (
              <div key={section.title} className="mb-1">
                {!isCollapsed && (
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
                    style={{ color: "rgba(106,207,199,0.45)" }}>
                    {section.title}
                  </p>
                )}
                {isCollapsed && (
                  <div className="mx-3 my-1" style={{ borderTop: "1px solid rgba(106,207,199,0.12)" }} />
                )}
                <SidebarMenu className="px-2">
                  {section.items.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 rounded-lg font-normal transition-all"
                          style={
                            isActive
                              ? { backgroundColor: "#6ACFC7", color: "#0C1A1A" }
                              : { backgroundColor: "transparent", color: "rgba(255,255,255,0.72)" }
                          }
                          onMouseEnter={(e) => {
                            if (!isActive)
                              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(106,207,199,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          <item.icon
                            className="h-4 w-4 shrink-0"
                            style={{ color: isActive ? "#0C1A1A" : "rgba(255,255,255,0.45)" }}
                          />
                          <span style={{ color: isActive ? "#0C1A1A" : "rgba(255,255,255,0.72)" }}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* Footer con perfil */}
          <SidebarFooter className="p-3 border-t border-white/[0.06] bg-[#0C1A1A]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors w-full text-left focus:outline-none"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(106,207,199,0.10)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <Avatar className="h-8 w-8 shrink-0" style={{ border: "2px solid #6ACFC7" }}>
                    <AvatarFallback className="text-xs font-bold"
                      style={{ background: "#6ACFC7", color: "#0C1A1A" }}>
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight" style={{ color: "rgba(255,255,255,0.90)" }}>
                        {user?.name ?? "—"}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#475569" }} />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl"
                style={{ background: "#162828", border: "1px solid rgba(106,207,199,0.18)" }}>
                <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(106,207,199,0.12)" }}>
                  <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.90)" }}>{user?.name}</p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{(user as any)?.email}</p>
                </div>
                <DropdownMenuItem onClick={logout}
                  className="cursor-pointer m-1 rounded-lg"
                  style={{ color: "rgba(248,113,113,0.90)" }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Handle de resize */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors"
            style={{ zIndex: 50, backgroundColor: "transparent" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(106,207,199,0.40)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* Contenido principal */}
      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between px-3 sticky top-0 z-40"
            style={{ backgroundColor: "#0C1A1A", borderColor: "rgba(106,207,199,0.10)" }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>
                {activeMenuItem?.label ?? "Menú"}
              </span>
            </div>
            <img src="/logo-dark.jpg" alt="INNOVAR" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 6 }} />
          </div>
        )}
        {/* Top header bar — desktop */}
        {!isMobile && (
          <header
            className="h-14 flex items-center justify-between px-5 sticky top-0 z-30"
            style={{
              background: "rgba(12,26,26,0.96)",
              borderBottom: "1px solid rgba(106,207,199,0.12)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Izquierda: toggle + breadcrumb */}
            <div className="flex items-center gap-3">
              <SidebarTrigger
                className="h-8 w-8 rounded-lg transition-colors"
                style={{ color: "rgba(106,207,199,0.7)" }}
              />
              <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>
                {activeMenuItem?.label ?? "Panel"}
              </span>
            </div>

            {/* Derecha: rol del usuario */}
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "#6ACFC7" }}
              >
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 min-h-screen" style={{ background: "#0C1A1A" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
