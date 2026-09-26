import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("¡Bienvenido!");
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
      toast.error("Por favor ingresa tu email y contraseña");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #0d2d2a 50%, #0f172a 100%)" }}
    >
      {/* Logo + Bienvenida */}
      <div className="text-center mb-8 space-y-4">
        <img
          src="/logo-original.png"
          alt="INNOVAR Cocinas de Diseño"
          className="h-20 mx-auto object-contain"
        />
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "#00BCD4" }}>
            INNOVAR
          </h1>
          <p className="text-sm font-semibold text-gray-400 tracking-widest uppercase" style={{ letterSpacing: "0.18em" }}>
            Cocinas de Diseño
          </p>
        </div>
        <div className="w-12 h-0.5 mx-auto rounded-full" style={{ background: "linear-gradient(90deg, transparent, #00BCD4, transparent)" }} />
        <div>
          <h2 className="text-lg font-bold text-white">Bienvenido al sistema CRM</h2>
          <p className="text-sm text-gray-400 mt-1">Por favor ingresa tus credenciales para acceder</p>
        </div>
      </div>

      {/* Card del formulario */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,188,212,0.2)", backdropFilter: "blur(10px)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Email</Label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loginMutation.isPending}
              className="h-11 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Contraseña</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-11 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-600 focus:border-teal-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-white font-semibold rounded-xl"
            style={{ background: "linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)" }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ingresando...</>
            ) : (
              <><LogIn className="mr-2 h-4 w-4" />Ingresar</>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="pt-3 text-center border-t border-white/10">
          <p className="text-sm text-gray-500">
            ¿Eres cliente?{" "}
            <Link href="/agendar" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Agenda tu visita aquí →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
