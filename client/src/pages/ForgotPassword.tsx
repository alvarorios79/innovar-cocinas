import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.whatsappLink) {
        setWhatsappLink(data.whatsappLink);
      }
      toast.success("Solicitud enviada", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo procesar la solicitud",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Campo requerido", {
        description: "Por favor ingresa tu email",
      });
      return;
    }
    resetMutation.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-3 md:p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2 p-4 md:p-6">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-2">
              <Mail className="text-white h-8 w-8 md:h-10 md:w-10" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-800">Revisa tu WhatsApp</CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">
              Si existe una cuenta con el email <strong>{email}</strong>, recibirás un mensaje con instrucciones para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            {whatsappLink && (
              <Button
                onClick={() => window.open(whatsappLink, "_blank")}
                className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </Button>
            )}
            
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500">
                ¿No recibiste el mensaje?
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setWhatsappLink(null);
                }}
                className="text-amber-600 hover:text-amber-700"
              >
                Intentar de nuevo
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link href="/login" className="text-sm text-gray-500 hover:text-amber-600 transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-3 md:p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2 p-4 md:p-6">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-2">
            <Mail className="text-white h-8 w-8 md:h-10 md:w-10" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold text-gray-800">¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-600">
            Ingresa tu email y te enviaremos instrucciones por WhatsApp para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={resetMutation.isPending}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar instrucciones
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              ¿Recordaste tu contraseña?{" "}
              <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                Inicia sesión
              </Link>
            </p>
            <button
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 hover:text-amber-600 transition-colors"
            >
              ← Volver a la página principal
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
