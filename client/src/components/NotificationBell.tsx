import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// iPhone/iPad: el push web solo funciona con el CRM instalado en la pantalla de inicio
// (iOS 16.4+) y el permiso solo se puede pedir al tocar un botón.
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
type PushState = "unsupported" | "needs-install" | "default" | "denied" | "granted";
function getPushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PushState;
}

// Último error al suscribirse (se muestra en el diagnóstico de la campanita)
let lastPushError = "";

// Función para solicitar permiso de notificaciones y suscribirse
async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {

    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {

      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();

    // Si la suscripción existente se hizo con otra clave VAPID (p. ej. claves viejas),
    // el servidor no podría enviarle nada: se anula y se crea una nueva.
    if (subscription) {
      const currentKey = subscription.options?.applicationServerKey;
      const wantedKey = urlBase64ToUint8Array(vapidPublicKey);
      const current = currentKey ? new Uint8Array(currentKey) : null;
      const sameKey = !!current && current.length === wantedKey.length && current.every((b, i) => b === wantedKey[i]);
      if (!sameKey) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

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
    lastPushError = (error as any)?.message || String(error);
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
    case "cotizacion": return "bg-amber-500";
    default: return "bg-gray-500";
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"selected" | "all">("selected");

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
  const sendTestMutation = trpc.notifications.sendTest.useMutation({
    onSuccess: (r: any) => {
      // Diagnóstico visible: a cuántos dispositivos salió el push y por qué falló
      if (!r?.enabled) toast.error("El servidor tiene el push desactivado (claves VAPID).");
      else if (!r.devices) toast.error("Tu usuario no tiene ningún dispositivo registrado. Toca 'Activar notificaciones' en cada dispositivo.");
      else if (r.failed > 0) toast.error(`Push: ${r.success} de ${r.devices} dispositivo(s) OK. Error: ${(r.errors || []).join(" | ").slice(0, 300)}`, { duration: 20000 });
      else toast.success(`Push enviado a ${r.success} dispositivo(s). Debe llegar en unos segundos.`);
      refetchUnread();
      refetchNotifications();
    },
    onError: (e) => toast.error(e.message || "No se pudo enviar la prueba"),
  });
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
  const deleteBulkMutation = trpc.notifications.deleteBulk.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      refetchUnread();
      refetchNotifications();
    },
  });
  const deleteAllMutation = trpc.notifications.deleteAll.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      refetchUnread();
      refetchNotifications();
    },
  });

  const [pushState, setPushState] = useState<PushState>(() => getPushState());

  const [pushDiag, setPushDiag] = useState("");
  const refreshPushDiag = async () => {
    try {
      const iosVer = navigator.userAgent.match(/OS (\d+)_(\d+)/);
      let suscrito = "no";
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        suscrito = reg ? (sub ? "sí" : "no") : "sin service worker";
      }
      setPushDiag([
        `permiso: ${typeof Notification !== "undefined" ? Notification.permission : "no disponible"}`,
        `instalada: ${isStandalone() ? "sí" : "no"}`,
        iosVer ? `iOS ${iosVer[1]}.${iosVer[2]}` : "",
        `push: ${"PushManager" in window ? "sí" : "no"}`,
        `registrado: ${suscrito}`,
        `clave servidor: ${vapidData?.publicKey ? "sí" : "no"}`,
        lastPushError ? `error: ${lastPushError}` : "",
      ].filter(Boolean).join(" · "));
    } catch (e: any) {
      setPushDiag("diagnóstico falló: " + (e?.message || e));
    }
  };

  const activatePush = async (): Promise<boolean> => {
    if (!vapidData?.publicKey) { lastPushError = "el servidor no entregó la clave pública"; refreshPushDiag(); return false; }
    const subscription = await subscribeToPush(vapidData.publicKey);
    setPushState(getPushState());
    refreshPushDiag();
    if (!subscription) return false;
    const keys = subscription.toJSON().keys;
    if (!keys) { lastPushError = "la suscripción no trae claves"; refreshPushDiag(); return false; }
    subscribeMutation.mutate({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh || "",
      auth: keys.auth || "",
      userAgent: navigator.userAgent,
    });
    setIsSubscribed(true);
    return true;
  };

  // Al abrir la campanita, actualizar el diagnóstico de este dispositivo
  useEffect(() => { if (open) refreshPushDiag(); }, [open, vapidData?.publicKey]);

  // Suscribirse a notificaciones push cuando el usuario inicia sesión.
  // En iPhone/iPad solo si el permiso ya está dado: pedirlo sin un toque no funciona allí
  // (para eso está el botón "Activar notificaciones" en la campanita).
  useEffect(() => {
    if (!user || !vapidData?.publicKey || isSubscribed) return;
    const state = getPushState();
    if (state === "granted" || (state === "default" && !isIOS())) {
      activatePush();
    }
  }, [user, vapidData?.publicKey, isSubscribed]);

  // Mantener el Service Worker activo con keep-alive periódico
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;

    const keepAlive = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          const messageChannel = new MessageChannel();
          registration.active.postMessage({ type: "KEEP_ALIVE" }, [messageChannel.port2]);
        }
      } catch (e) {
        // Error silencioso - keep alive no es crítico
      }
    };

    // Ejecutar inmediatamente y luego cada 5 minutos
    keepAlive();
    const interval = setInterval(keepAlive, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = unreadData?.count || 0;
  const allSelected = notifications && notifications.length > 0 && selectedIds.size === notifications.length;

  const handleSelectAll = () => {
    if (!notifications) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleSelectNotification = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteType("selected");
    setShowDeleteConfirm(true);
  };

  const handleDeleteAll = () => {
    setDeleteType("all");
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteType === "selected") {
      deleteBulkMutation.mutate({ ids: Array.from(selectedIds) });
    } else {
      deleteAllMutation.mutate();
    }
    setShowDeleteConfirm(false);
  };

  if (!user) return null;

  return (
    <>
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
            <div className="flex gap-2">
              {!!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Enviar una notificación de prueba a este dispositivo"
                  onClick={() => sendTestMutation.mutate()}
                  disabled={sendTestMutation.isPending}
                >
                  Probar
                </Button>
              )}
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
          </div>

          {/* Diagnóstico de push de ESTE dispositivo (todos los roles: así cada persona puede
              registrar su celular si no le llegan las notificaciones) */}
          {!!user && (
            <div className="px-3 py-2 border-b text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Este dispositivo</span>
                <div className="flex gap-2">
                  <button className="underline" onClick={() => refreshPushDiag()}>Revisar</button>
                  <button className="underline" onClick={async () => {
                    const ok = await activatePush();
                    toast[ok ? "success" : "error"](ok ? "Dispositivo registrado para notificaciones" : "No se pudo registrar: " + (lastPushError || getPushState()));
                  }}>Registrar de nuevo</button>
                </div>
              </div>
              {pushDiag && <p className="break-words">{pushDiag}</p>}
            </div>
          )}

          {/* Activar notificaciones push en este dispositivo */}
          {pushState !== "granted" && pushState !== "unsupported" && (
            <div className="p-3 border-b bg-muted/40 text-xs space-y-2">
              {pushState === "needs-install" && (
                <p>
                  📱 Para recibir avisos en el iPhone: en Safari toca <b>Compartir</b> → <b>Agregar a pantalla de inicio</b>,
                  abre el CRM desde ese ícono y vuelve aquí para activar las notificaciones.
                </p>
              )}
              {pushState === "default" && (
                <>
                  <p>Activa las notificaciones para recibir los avisos en este dispositivo, aunque el CRM esté cerrado.</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      const ok = await activatePush();
                      if (ok) toast.success("Notificaciones activadas en este dispositivo");
                      else if (getPushState() === "denied") toast.error("Las notificaciones quedaron bloqueadas. Actívalas en Ajustes del teléfono → Notificaciones → Innovar.");
                      else toast.error("No se pudieron activar las notificaciones");
                    }}
                  >
                    Activar notificaciones
                  </Button>
                </>
              )}
              {pushState === "denied" && (
                <p>🔕 Las notificaciones están bloqueadas en este dispositivo. Actívalas en los ajustes del teléfono o del navegador (Notificaciones → Innovar) y vuelve a abrir el CRM.</p>
              )}
            </div>
          )}

          {/* Bulk actions toolbar */}
          {selectedIds.size > 0 && (
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteBulkMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Select All checkbox */}
          {notifications && notifications.length > 0 && (
            <div className="px-4 py-2 border-b flex items-center gap-2 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border border-input"
              />
              <span className="text-sm text-muted-foreground">Seleccionar todas</span>
            </div>
          )}

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
                      "p-4 hover:bg-muted/50 transition-colors relative group",
                      !notification.read && "bg-muted/30",
                      selectedIds.has(notification.id) && "bg-muted"
                    )}
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => handleSelectNotification(notification.id)}
                        className="mt-2 rounded border border-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (!notification.read) {
                            markAsReadMutation.mutate({ id: notification.id });
                          }
                          // Navegar según el tipo de notificación y rol del usuario
                          const isClient = user?.role === "user";
                          // Avisos de interesados (tipo "cita" con referenceType "lead" / "lead_resumen")
                          if (String((notification as any).referenceType || "").startsWith("postventa")) {
                            // Avisos de postventa (mensaje del mes, revisión del año, reporte del cliente, resúmenes)
                            setOpen(false);
                            setLocation("/postventa");
                          } else if ((notification as any).referenceType === "despiece" && notification.referenceId) {
                            // Despiece enviado al taller: abre el proyecto
                            setOpen(false);
                            setLocation(`/projects/${notification.referenceId}`);
                          } else if (String((notification as any).referenceType || "").startsWith("lead")) {
                            setOpen(false);
                            setLocation("/interesados");
                          } else if (notification.type === "tarea") {
                            setOpen(false);
                            setLocation("/tasks");
                          } else if (notification.type === "proyecto") {
                            setOpen(false);
                            if (isClient && notification.referenceId) {
                              setLocation(`/portal?project=${notification.referenceId}`);
                            } else if (notification.referenceId) {
                              setLocation("/projects");
                            }
                          } else if (notification.type === "cita") {
                            setOpen(false);
                            if (isClient) {
                              setLocation("/portal");
                            } else {
                              setLocation("/appointments-calendar");
                            }
                          } else if (notification.type === "cotizacion") {
                            setOpen(false);
                            if (isClient) {
                              setLocation("/portal");
                            } else {
                              setLocation("/admin");
                            }
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              String((notification as any).referenceType || "").startsWith("lead") ? "bg-amber-500" : getNotificationColor(notification.type)
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
                        </div>
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

          {/* Footer with Clear All button */}
          {notifications && notifications.length > 0 && (
            <div className="p-3 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar todo
              </Button>
            </div>
          )}

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

      {/* Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {deleteType === "selected" ? "Eliminar notificaciones seleccionadas" : "Limpiar todas las notificaciones"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteType === "selected"
              ? `¿Estás seguro de que deseas eliminar ${selectedIds.size} notificación${selectedIds.size !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`
              : "¿Estás seguro de que deseas eliminar todas tus notificaciones? Esta acción no se puede deshacer."}
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteType === "selected" ? deleteBulkMutation.isPending : deleteAllMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
