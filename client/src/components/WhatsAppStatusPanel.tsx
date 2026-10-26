/**
 * WhatsAppStatusPanel
 * Muestra el estado de conexión de WhatsApp Cloud API y los eventos activos.
 * Se coloca en Admin → Zona del Sistema.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Smartphone,
  Building2,
  ShieldCheck,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";

// Eventos que tienen notificaciones WA conectadas
const ACTIVE_EVENTS = [
  {
    id: "project_created",
    label: "Proyecto creado",
    description: "Bienvenida al cliente cuando se crea un proyecto",
    recipient: "Cliente",
    enabled: true,
  },
  {
    id: "payment_received",
    label: "Pago recibido",
    description: "Confirmación al cliente cuando se registra un pago",
    recipient: "Cliente",
    enabled: true,
  },
  {
    id: "quotation_approved",
    label: "Cotización aprobada",
    description: "Alerta al equipo cuando un cliente aprueba una cotización",
    recipient: "Equipo (admin/comercial)",
    enabled: true,
  },
  {
    id: "quotation_sent",
    label: "Cotización enviada al cliente",
    description: "Notificación al cliente con enlace a su cotización",
    recipient: "Cliente",
    enabled: true,
  },
];

export function WhatsAppStatusPanel() {
  const [refetchKey, setRefetchKey] = useState(0);

  const { data: status, isLoading, refetch } = trpc.whatsappCloud.getStatus.useQuery(undefined, {
    retry: false,
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success("Estado actualizado");
  };

  return (
    <Card className="border-emerald-200 bg-emerald-500/10/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-300">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Cloud API
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-emerald-300 hover:text-emerald-300 hover:bg-emerald-500/15"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Notificaciones automáticas a clientes y equipo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Estado de conexión */}
        <div className="rounded-lg border bg-[#162828] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estado de conexión
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando…
            </div>
          ) : !status?.configured ? (
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">No configurado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Variables de entorno faltantes:{" "}
                  <code className="bg-muted px-1 rounded text-[11px]">WHATSAPP_ACCESS_TOKEN</code>{" "}
                  y{" "}
                  <code className="bg-muted px-1 rounded text-[11px]">WHATSAPP_PHONE_NUMBER_ID</code>
                </p>
              </div>
            </div>
          ) : status.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-emerald-300">Conectado</span>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-300 bg-emerald-500/10">
                  ACTIVO
                </Badge>
              </div>
              {status.displayName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pl-7">
                  <Building2 className="h-3.5 w-3.5" />
                  {status.displayName}
                </div>
              )}
              {status.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pl-7">
                  <Smartphone className="h-3.5 w-3.5" />
                  {status.phoneNumber}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">Configurado, sin conexión</p>
                <p className="text-xs text-muted-foreground mt-0.5">{status.error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Eventos activos */}
        <div className="rounded-lg border bg-[#162828] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eventos con notificación automática
          </p>

          <div className="space-y-2">
            {ACTIVE_EVENTS.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 border-b last:border-0"
              >
                <div className="mt-0.5 shrink-0">
                  {status?.connected ? (
                    <Bell className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{event.label}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 border-[rgba(106,207,199,0.12)] text-white/60"
                    >
                      → {event.recipient}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {event.description}
                  </p>
                </div>
                <div className="shrink-0">
                  <ShieldCheck
                    className={`h-4 w-4 ${status?.connected ? "text-emerald-500" : "text-slate-300"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instrucciones si no está configurado */}
        {!status?.configured && !isLoading && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
            <p className="font-semibold">Para activar WhatsApp Cloud API:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Ve a Meta for Developers → tu app de WhatsApp</li>
              <li>Copia el <strong>Access Token</strong> y el <strong>Phone Number ID</strong></li>
              <li>
                Agrega al archivo <code className="bg-amber-500/15 px-1 rounded">.env</code>:
                <pre className="mt-1 bg-amber-500/15 rounded p-2 whitespace-pre-wrap font-mono text-[11px]">{`WHATSAPP_ACCESS_TOKEN=tu_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id`}</pre>
              </li>
              <li>Reinicia el servidor</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
