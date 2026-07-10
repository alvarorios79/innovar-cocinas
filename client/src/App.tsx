import { Toaster } from "sonner";
import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";

import { MobileBottomNavigation } from "./components/navigation/MobileBottomNavigation";
import { OfflineIndicator } from "./components/OfflineIndicator";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Portal from "./pages/Portal";
import Projects from "./pages/Projects";
import DashboardLayout from "./components/DashboardLayout";
import Tasks from "./pages/Tasks";
import InstallationCalendar from "./pages/InstallationCalendar";
import Quotations from "./pages/Quotations";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProjectDetail from "./pages/ProjectDetail";
import Comercial from "./pages/Comercial";
import PublicGallery from "./pages/PublicGallery";
import PricingConfig from "./pages/PricingConfig";
import Accounting from "./pages/Accounting";
import AppointmentsCalendar from "./pages/AppointmentsCalendar";
import { CEODashboard } from "./pages/CEODashboard";
import { Redirect } from "wouter";
import LimpiezaSistema from "./pages/LimpiezaSistema";
// ── Nuevos módulos (Fase 1 — placeholders) ───────────────────────────────────
import Clients from "./pages/Clients";
import Design from "./pages/Design";
import Production from "./pages/Production";
import Postventa from "./pages/Postventa";
import Herrajes from "./pages/Herrajes";
import GalleryAdmin from "./pages/GalleryAdmin";
import Contador from "./pages/Contador";


function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading } = useAuth();

  // Rutas siempre públicas (nunca usan DashboardLayout)
  const alwaysPublicRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/portal", "/gallery"];
  const isAlwaysPublic = alwaysPublicRoutes.some(
    route => location === route || location.startsWith("/portal") || location.startsWith("/gallery")
  );
  if (isAlwaysPublic) return <>{children}</>;

  // "/" solo es pública para usuarios no autenticados
  if (location === "/" && !user && !loading) return <>{children}</>;

  // Todo lo demás (incluye "/" para usuarios autenticados) usa DashboardLayout
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <LayoutWrapper>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/admin"}><Admin /></Route>
        <Route path={"/comercial"}><Comercial /></Route>
        <Route path={"/portal"} component={Portal} />
        <Route path={"/projects"}><Projects /></Route>
        <Route path={"/projects/:id"}><ProjectDetail /></Route>
        <Route path={"/tasks"}><Tasks /></Route>
        <Route path={"/calendar"}><InstallationCalendar /></Route>
        <Route path={"/appointments-calendar"}><AppointmentsCalendar /></Route>
        <Route path={"/quotations"}><Quotations /></Route>
        <Route path={"/login"} component={Login} />
        <Route path={"/register"} component={Register} />
        <Route path={"/forgot-password"} component={ForgotPassword} />
        <Route path={"/reset-password"} component={ResetPassword} />
        <Route path={"/gallery"}><PublicGallery /></Route>
        <Route path={"/pricing-config"}><PricingConfig /></Route>
        <Route path={"/herrajes"}><Herrajes /></Route>
        <Route path={"/accounting"}><Accounting /></Route>
        <Route path={"/ceo-dashboard"}><CEODashboard /></Route>
        <Route path={"/profitability-dashboard"}><Redirect to="/ceo-dashboard" /></Route>
        <Route path={"/limpieza-sistema"} component={LimpiezaSistema} />
        {/* Nuevos módulos */}
        <Route path={"/clients"}><Clients /></Route>
        <Route path={"/design"}><Design /></Route>
        <Route path={"/production"}><Production /></Route>
        <Route path={"/postventa"}><Postventa /></Route>
        <Route path={"/galerias"}><GalleryAdmin /></Route>
        <Route path={"/contador"}><Contador /></Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </LayoutWrapper>
  );
}

function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[App] Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('[App] Error al registrar Service Worker:', error);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <MobileBottomNavigation />
          <OfflineIndicator />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
