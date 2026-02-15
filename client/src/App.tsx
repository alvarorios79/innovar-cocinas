import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WhatsAppButton } from "./components/WhatsAppButton";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Portal from "./pages/Portal";
import Projects from "./pages/Projects";
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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/comercial"} component={Comercial} />
      <Route path={"/portal"} component={Portal} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id"} component={ProjectDetail} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/calendar"} component={InstallationCalendar} />
      <Route path={"/appointments-calendar"} component={AppointmentsCalendar} />
      <Route path={"/quotations"} component={Quotations} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/gallery"} component={PublicGallery} />
      <Route path={"/pricing-config"} component={PricingConfig} />
      <Route path={"/accounting"} component={Accounting} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <WhatsAppButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
