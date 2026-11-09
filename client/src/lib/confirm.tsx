/**
 * Confirmaciones con el cuadro del CRM (reemplaza window.confirm del navegador).
 *
 *   if (!(await confirmAction("¿Eliminar esta cita?"))) return;
 *   await confirmAction({ title: "Eliminar cita", description: "No se puede deshacer.", confirmText: "Eliminar", destructive: true })
 *
 * <ConfirmHost /> va una sola vez en App.tsx.
 */
import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

const DESTRUCTIVE_WORDS = /eliminar|borrar|cancelar esta|limpieza|no se puede deshacer|retroceder/i;

/** Convierte un texto tipo "¿Eliminar X?\n\nNo se puede deshacer." en título + descripción. */
function fromMessage(message: string): ConfirmOptions {
  const [first, ...rest] = message.split(/\n+/);
  return {
    title: first.trim(),
    description: rest.join("\n").trim() || undefined,
    destructive: DESTRUCTIVE_WORDS.test(message),
  };
}

export function confirmAction(input: string | ConfirmOptions): Promise<boolean> {
  const opts = typeof input === "string" ? fromMessage(input) : input;
  if (!show) return Promise.resolve(window.confirm([opts.title, opts.description].filter(Boolean).join("\n\n")));
  return new Promise<boolean>(resolve => show!({ ...opts, resolve }));
}

/**
 * En el celular, el mismo toque que abre el cuadro puede llegar otra vez como un segundo "clic"
 * justo después y caer sobre el botón de confirmar (pasaba en el iPhone: borraba sin preguntar).
 * Por eso el botón de confirmar no responde durante el primer momento después de abrirse.
 */
const ARM_DELAY_MS = 600;

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [armed, setArmed] = useState(false);
  // Lo último mostrado: se sigue viendo mientras el cuadro se cierra (sin parpadear vacío)
  const [shown, setShown] = useState<Pending | null>(null);
  useEffect(() => {
    show = setPending;
    return () => { show = null; };
  }, []);

  useEffect(() => {
    if (!pending) return;
    setShown(pending);
    setArmed(false);
    const t = setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const view = pending || shown;
  const destructive = view?.destructive;
  const confirmText = view?.confirmText || (destructive ? (/cancelar/i.test(view?.title || "") ? "Sí, cancelar" : "Sí, eliminar") : "Aceptar");

  return (
    <AlertDialog open={!!pending} onOpenChange={o => { if (!o) close(false); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg leading-snug">{view?.title}</AlertDialogTitle>
          {view?.description && (
            <AlertDialogDescription className="whitespace-pre-line text-sm">{view.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              if (!armed) { e.preventDefault(); return; }
              close(false);
            }}
          >{view?.cancelText || "No, volver"}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!armed}
            onClick={(e) => {
              if (!armed) { e.preventDefault(); return; }
              close(true);
            }}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90", !armed && "opacity-60")}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
