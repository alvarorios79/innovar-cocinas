import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TeamDashboard } from "@/components/TeamDashboard";
import { OperarioDashboard } from "@/components/OperarioDashboard";

/**
 * Inicio del CRM. Cada rol del equipo ve su panel.
 * (Se quitó la página vieja para clientes con cuenta —citas, asesorías, estimados, "Mi Portal"—:
 *  los clientes ya no inician sesión; todo lo ven por enlace.)
 */
export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role || "";

  // Comercial y medidor tienen su propia pantalla de inicio
  useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "comercial") setLocation("/comercial");
    if (role === "medidor") setLocation("/medidor");
  }, [isAuthenticated, role]);

  if (!isAuthenticated) return null;
  if (role === "comercial" || role === "medidor") return null;
  if (role === "operario") return <OperarioDashboard />;

  const teamRoles = ["super_admin", "admin", "disenador", "jefe_taller", "contador"];
  if (teamRoles.includes(role)) return <TeamDashboard />;

  // Cuenta sin rol del equipo (p. ej. cuentas viejas de clientes)
  return (
    <div className="max-w-md mx-auto mt-16 rounded-xl border border-border bg-card p-6 text-center space-y-3">
      <h2 className="text-lg font-semibold">Esta cuenta no tiene acceso al CRM</h2>
      <p className="text-sm text-muted-foreground">
        Si eres cliente, revisa el enlace que te enviamos por WhatsApp. Si eres del equipo, pide a un administrador que te asigne un rol.
      </p>
      <Button variant="outline" onClick={() => logout()}>Cerrar sesión</Button>
    </div>
  );
}
