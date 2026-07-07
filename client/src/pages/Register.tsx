import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("¡Cuenta creada exitosamente!", {
        description: "Bienvenido a INNOVAR Cocinas",
      });
      window.location.href = "/portal";
    },
    onError: (error) => {
      toast.error("Error al crear la cuenta", {
        description: error.message || "Por favor verifica los datos e intenta de nuevo",
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
    
    if (!name || !email || !password || !whatsappPhone) {
      toast.error("Campos requeridos", {
        description: "Por favor completa todos los campos",
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

    registerMutation.mutate({ name, email, password, whatsappPhone });
  };

  const PasswordCheck = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-green-600" : "text-gray-400"}`}>
      {valid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {text}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)" }}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2 p-4 md:p-6">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <img src="/logo-original.png" alt="INNOVAR Cocinas de Diseño" style={{ width: 90, height: "auto", objectFit: "contain" }} />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold text-foreground">Crear Cuenta</CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Regístrate para agendar citas y dar seguimiento a tus proyectos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="3001234567"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                disabled={registerMutation.isPending}
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
                  disabled={registerMutation.isPending}
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
                disabled={registerMutation.isPending}
                className="h-11"
              />
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                  {passwordsMatch ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold"
              disabled={registerMutation.isPending || !isPasswordValid || !passwordsMatch}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Cuenta
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Inicia sesión
              </Link>
            </p>
            <button
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
            >
              ← Volver a la página principal
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
