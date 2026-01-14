import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// Función para solicitar permiso de notificaciones y suscribirse
async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Crear nueva suscripción
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

// Convertir clave VAPID de base64 a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Formatear fecha relativa
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Obtener color según tipo de notificación
function getNotificationColor(type: string): string {
  switch (type) {
    case "proyecto": return "bg-blue-500";
    case "tarea": return "bg-purple-500";
    case "cita": return "bg-green-500";
    case "cotizacion": return "bg-yellow-500";
    default: return "bg-gray-500";
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Queries
  const { data: unreadData, refetch: refetchUnread } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 30000 } // Refrescar cada 30 segundos
  );
  
  const { data: notifications, refetch: refetchNotifications } = trpc.notifications.getMyNotifications.useQuery(
    { limit: 20 },
    { enabled: !!user && open }
  );

  const { data: vapidData } = trpc.notifications.getVapidPublicKey.useQuery(undefined, {
    enabled: !!user,
  });

  // Mutations
  const subscribeMutation = trpc.notifications.subscribe.useMutation();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });

  // Suscribirse a notificaciones push cuando el usuario inicia sesión
  useEffect(() => {
    if (user && vapidData?.publicKey && !isSubscribed) {
      subscribeToPush(vapidData.publicKey).then((subscription) => {
        if (subscription) {
          const keys = subscription.toJSON().keys;
          if (keys) {
            subscribeMutation.mutate({
              endpoint: subscription.endpoint,
              p256dh: keys.p256dh || "",
              auth: keys.auth || "",
              userAgent: navigator.userAgent,
            });
            setIsSubscribed(true);
          }
        }
      });
    }
  }, [user, vapidData?.publicKey, isSubscribed]);

  const unreadCount = unreadData?.count || 0;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                    !notification.read && "bg-muted/30"
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      markAsReadMutation.mutate({ id: notification.id });
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                        getNotificationColor(notification.type)
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(new Date(notification.createdAt))}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate({ id: notification.id });
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: notification.id });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Prompt para habilitar notificaciones */}
        {"Notification" in window && Notification.permission === "default" && (
          <div className="p-3 border-t bg-muted/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                if (vapidData?.publicKey) {
                  await subscribeToPush(vapidData.publicKey);
                }
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Activar notificaciones push
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
