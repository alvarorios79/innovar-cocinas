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

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    show = setPending;
    return () => { show = null; };
  }, []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const destructive = pending?.destructive;
  const confirmText = pending?.confirmText || (destructive ? (/cancelar/i.test(pending?.title || "") ? "Sí, cancelar" : "Sí, eliminar") : "Aceptar");

  return (
    <AlertDialog open={!!pending} onOpenChange={o => { if (!o) close(false); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg leading-snug">{pending?.title}</AlertDialogTitle>
          {pending?.description && (
            <AlertDialogDescription className="whitespace-pre-line text-sm">{pending.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{pending?.cancelText || "No, volver"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
