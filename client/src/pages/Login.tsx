import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("¡Bienvenido!", {
        description: "Has iniciado sesión correctamente",
      });
      // Recargar la página para actualizar el estado de autenticación
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error("Error de inicio de sesión", {
        description: error.message || "Email o contraseña incorrectos",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Campos requeridos", {
        description: "Por favor ingresa tu email y contraseña",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)" }}>
      <Card className="w-full max-w-md shadow-xl border border-teal-100">
        <CardHeader className="text-center space-y-2 p-4 md:p-6">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <img src="/logo-original.png" alt="INNOVAR Cocinas de Diseño" style={{ width: 90, height: "auto", objectFit: "contain" }} />
          </div>
          <CardDescription className="text-sm md:text-base text-muted-foreground pt-1">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-white font-semibold" style={{ background: "linear-gradient(135deg, #1DB5A8 0%, #0D9B8F 100%)" }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Ingresar
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="mt-6 text-center space-y-2 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium">
                Regístrate aquí
              </Link>
            </p>
            <button
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 hover:text-amber-400 transition-colors"
            >
              ← Volver a la página principal
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
