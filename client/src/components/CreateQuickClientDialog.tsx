import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserPlus, Copy, MessageCircle, Check, Loader2, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateQuickClientDialogProps {
  trigger?: React.ReactNode;
  onClientCreated?: (client: any) => void;
}

export function CreateQuickClientDialog({ trigger, onClientCreated }: CreateQuickClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    address: "",
    internalManagement: false,
  });

  // Mutation para enviar credenciales por WhatsApp
  const sendCredentialsMutation = trpc.quotations.sendByWhatsApp.useMutation({
    onSuccess: () => {
      toast.success("Credenciales enviadas correctamente por WhatsApp");
      handleClose();
    },
    onError: (error) => {
      toast.error(`Error enviando credenciales: ${error.message}`);
      console.error("Error al enviar por WhatsApp:", error);
    }
  });

  const createQuickMutation = trpc.clients.createQuick.useMutation({
    onSuccess: (data) => {
      if (data.isInternalManagement || !data.credentials) {
        // Cliente con gestión interna: no mostrar credenciales
        toast.success("¡Cliente creado! (Gestión interna - sin acceso al portal)");
        if (onClientCreated && data.client) {
          onClientCreated(data.client);
        }
        handleClose();
      } else {
        // Cliente normal: mostrar credenciales
        setCredentials(data.credentials);
        setShowCredentials(true);
        toast.success("Cliente creado exitosamente");
        if (onClientCreated && data.client) {
          onClientCreated(data.client);
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuickMutation.mutate(formData);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!credentials) return;
    
    // Nota: Este componente está diseñado para enviar credenciales de nuevo cliente
    // pero sendByWhatsApp está diseñado para cotizaciones.
    // Por ahora, usamos window.open para mantener la funcionalidad original.
    // TODO: Crear endpoint separado para enviar credenciales por WhatsApp
    
    const message = `¡Hola ${formData.name}! 👋

Te hemos creado una cuenta en INNOVAR Cocinas para que puedas seguir el estado de tu proyecto.

🔐 *Tus credenciales de acceso:*
📧 Usuario: ${credentials.email}
🔑 Contraseña: ${credentials.password}

🌐 Ingresa aquí: ${window.location.origin}/login

¡Gracias por confiar en nosotros!`;

    const whatsappUrl = `https://wa.me/57${formData.whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleClose = () => {
    setOpen(false);
    setShowCredentials(false);
    setCredentials(null);
    setFormData({ name: "", email: "", whatsappPhone: "", address: "", internalManagement: false });
  };

  const handleCopyAll = async () => {
    if (!credentials) return;
    
    const text = `Usuario: ${credentials.email}\nContraseña: ${credentials.password}\nEnlace: ${window.location.origin}/login`;
    await navigator.clipboard.writeText(text);
    toast.success("Credenciales copiadas al portapapeles");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Crear Cliente Rápido
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {!showCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Crear Cliente Rápido
              </DialogTitle>
              <DialogDescription>
                Crea un cliente con usuario y contraseña para que pueda acceder al portal.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappPhone">WhatsApp *</Label>
                <Input
                  id="whatsappPhone"
                  value={formData.whatsappPhone}
                  onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                  placeholder="3001234567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle 123 #45-67"
                />
              </div>
              
              {/* Checkbox Gestión Interna */}
              <div className="flex items-start space-x-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                <Checkbox
                  id="internalManagement"
                  checked={formData.internalManagement}
                  onCheckedChange={(checked) => setFormData({ ...formData, internalManagement: checked === true })}
                />
                <div className="space-y-1">
                  <Label htmlFor="internalManagement" className="flex items-center gap-2 font-medium text-amber-300 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    Gestión interna
                  </Label>
                  <p className="text-xs text-amber-300">
                    El cliente no maneja tecnología. Las aprobaciones y seguimiento serán gestionados por el equipo comercial.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createQuickMutation.isPending}>
                  {createQuickMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear Cliente
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-400">
                <Check className="h-5 w-5" />
                ¡Cliente Creado!
              </DialogTitle>
              <DialogDescription>
                Envía estas credenciales al cliente por WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-white/[0.03] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Usuario (Email)</p>
                    <p className="font-medium">{credentials?.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(credentials?.email || "", "email")}
                  >
                    {copiedField === "email" ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Contraseña</p>
                    <p className="font-medium font-mono">{credentials?.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(credentials?.password || "", "password")}
                  >
                    {copiedField === "password" ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Enlace de acceso</p>
                    <p className="font-medium text-sm text-blue-400">{window.location.origin}/login</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${window.location.origin}/login`, "link")}
                  >
                    {copiedField === "link" ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleSendWhatsApp} 
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  disabled={sendCredentialsMutation.isPending}
                >
                  <MessageCircle className="h-4 w-4" />
                  {sendCredentialsMutation.isPending ? "Enviando..." : "Enviar por WhatsApp"}
                </Button>
                <Button variant="outline" onClick={handleCopyAll} className="w-full gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar Todo
                </Button>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
