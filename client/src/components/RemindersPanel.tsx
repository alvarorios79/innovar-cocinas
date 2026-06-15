import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Paintbrush, 
  Hammer, 
  Truck,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface RemindersPanelProps {
  userId: number;
  userRole: string;
  compact?: boolean;
}

// Configuración de tipos de recordatorio
const REMINDER_TYPE_CONFIG: Record<string, {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}> = {
  cotizacion_sin_respuesta: {
    label: "Cotización sin respuesta",
    icon: FileText,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/20"
  },
  diseno_pendiente: {
    label: "Diseño pendiente",
    icon: Paintbrush,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20"
  },
  aprobacion_pendiente: {
    label: "Aprobación pendiente",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20"
  },
  produccion_retrasada: {
    label: "Producción retrasada",
    icon: Hammer,
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20"
  },
  instalacion_proxima: {
    label: "Instalación próxima",
    icon: Truck,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10 border-teal-500/20"
  },
};

export function RemindersPanel({ userId, userRole, compact = false }: RemindersPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  const { data: reminders = [], isLoading, refetch } = trpc.reminders.getMyReminders.useQuery();
  
  const completeReminder = trpc.reminders.complete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Recordatorio marcado como completado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al completar recordatorio");
    },
  });

  const activeReminders = reminders.filter(
    (r: any) => r.status === "pendiente" || r.status === "enviado"
  );

  const urgentReminders = activeReminders.filter((r: any) => {
    const dueDate = new Date(r.dueDate);
    return dueDate <= new Date();
  });

  const upcomingReminders = activeReminders.filter((r: any) => {
    const dueDate = new Date(r.dueDate);
    return dueDate > new Date();
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeReminders.length === 0) {
    return (
      <Card className="bg-[#162828] border-amber-500/20" style={{ borderTop: "3px solid #F59E0B" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            Recordatorios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
            <p className="text-sm text-white/45">No tienes recordatorios pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ReminderItem = ({ reminder }: { reminder: any }) => {
    const config = REMINDER_TYPE_CONFIG[reminder.type] || {
      label: reminder.type,
      icon: Bell,
      color: "text-white/55",
      bgColor: "bg-white/[0.05] border-white/[0.08]"
    };
    const Icon = config.icon;
    const isOverdue = new Date(reminder.dueDate) <= new Date();

    return (
      <div className={`p-3 rounded-lg border ${config.bgColor} ${isOverdue ? "animate-pulse" : ""}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full bg-white/[0.07] ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${config.color}`}>
                {config.label}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vencido
                </Badge>
              )}
            </div>
            <p className="text-sm text-white/65 mt-1 line-clamp-2">
              {reminder.message}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {isOverdue ? "Venció" : "Vence"}: {new Date(reminder.dueDate).toLocaleDateString("es-CO", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <Link href={`/projects?highlight=${reminder.projectId}`}>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver Proyecto
                </Button>
              </Link>
              {reminder.project?.client?.whatsappPhone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7 text-green-400 border-green-500/30 hover:bg-green-500/10"
                  onClick={() => {
                    const phone = reminder.project.client.whatsappPhone.replace(/\D/g, "");
                    const fullPhone = phone.startsWith("57") ? phone : `57${phone}`;
                    window.open(`https://wa.me/${fullPhone}`, "_blank");
                  }}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => completeReminder.mutate({ reminderId: reminder.id })}
                disabled={completeReminder.isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#162828] border-amber-500/20" style={{ borderTop: "3px solid #F59E0B" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            Recordatorios
            {activeReminders.length > 0 && (
              <Badge variant={urgentReminders.length > 0 ? "destructive" : "secondary"}>
                {activeReminders.length}
              </Badge>
            )}
          </CardTitle>
          {compact && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {urgentReminders.length > 0 && (
          <CardDescription className="text-red-400 font-medium">
            {urgentReminders.length} recordatorio{urgentReminders.length > 1 ? "s" : ""} vencido{urgentReminders.length > 1 ? "s" : ""}
          </CardDescription>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {/* Recordatorios vencidos primero */}
          {urgentReminders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-400 uppercase tracking-wide">
                Requieren atención inmediata
              </p>
              {urgentReminders.map((reminder: any) => (
                <ReminderItem key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
          
          {/* Recordatorios próximos */}
          {upcomingReminders.length > 0 && (
            <div className="space-y-2">
              {urgentReminders.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
                  Próximos
                </p>
              )}
              {upcomingReminders.map((reminder: any) => (
                <ReminderItem key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Componente compacto para mostrar en el header o sidebar
export function RemindersIndicator({ userId }: { userId: number }) {
  const { data: reminders = [] } = trpc.reminders.getMyReminders.useQuery();
  
  const activeReminders = reminders.filter(
    (r: any) => r.status === "pendiente" || r.status === "enviado"
  );

  const urgentCount = activeReminders.filter((r: any) => {
    const dueDate = new Date(r.dueDate);
    return dueDate <= new Date();
  }).length;

  if (activeReminders.length === 0) return null;

  return (
    <div className="relative">
      <Bell className={`h-5 w-5 ${urgentCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
      <span className={`absolute -top-1 -right-1 h-4 w-4 rounded-full text-xs flex items-center justify-center text-white ${
        urgentCount > 0 ? "bg-red-500" : "bg-primary"
      }`}>
        {activeReminders.length}
      </span>
    </div>
  );
}
