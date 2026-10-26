import { useState, useEffect } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Extraer token de la URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchString]);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("¡Contraseña actualizada!", {
        description: "Ya puedes iniciar sesión con tu nueva contraseña",
      });
      setLocation("/login");
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo restablecer la contraseña",
      });
    },
  });

  // Validación de contraseña en tiempo real
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("Token inválido", {
        description: "El enlace de recuperación no es válido",
      });
      return;
    }

    if (!isPasswordValid) {
      toast.error("Contraseña débil", {
        description: "La contraseña no cumple con los requisitos de seguridad",
      });
      return;
    }

    if (!passwordsMatch) {
      toast.error("Las contraseñas no coinciden", {
        description: "Por favor verifica que ambas contraseñas sean iguales",
      });
      return;
    }

    resetMutation.mutate({ token, newPassword: password });
  };

  const PasswordCheck = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-green-400" : "text-gray-400"}`}>
      {valid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {text}
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 md:p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)" }}>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2 p-4 md:p-6">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl flex items-center justify-center mb-2">
              <AlertTriangle className="text-white h-8 w-8 md:h-10 md:w-10" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-foreground">Enlace inválido</CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">
              El enlace de recuperación no es válido o ha expirado. Por favor solicita uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Link href="/forgot-password">
              <Button className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold">
                Solicitar nuevo enlace
              </Button>
            </Link>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">
                ← Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)" }}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2 p-4 md:p-6">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl flex items-center justify-center mb-2">
            <Lock className="text-white h-8 w-8 md:h-10 md:w-10" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold text-foreground">Nueva Contraseña</CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Ingresa tu nueva contraseña para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={resetMutation.isPending}
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
              {password.length > 0 && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <PasswordCheck valid={passwordChecks.length} text="8+ caracteres" />
                  <PasswordCheck valid={passwordChecks.uppercase} text="Mayúscula" />
                  <PasswordCheck valid={passwordChecks.lowercase} text="Minúscula" />
                  <PasswordCheck valid={passwordChecks.number} text="Número" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={resetMutation.isPending}
                className="h-11"
              />
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-green-400" : "text-red-500"}`}>
                  {passwordsMatch ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold"
              disabled={resetMutation.isPending || !isPasswordValid || !passwordsMatch}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Restablecer Contraseña
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">
              ← Volver a iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
