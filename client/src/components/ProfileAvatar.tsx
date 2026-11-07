import { useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type AvatarUser = { name?: string | null; avatarUrl?: string | null } | null | undefined;

/** Círculo con la foto de perfil del usuario; si no tiene, muestra la inicial. */
export function ProfileAvatar({ user, size = 32 }: { user: AvatarUser; size?: number }) {
  const initial = user?.name?.charAt(0).toUpperCase() ?? "?";
  return (
    // key: al cambiar/quitar la foto se vuelve a montar (si no, Radix se queda sin mostrar la inicial)
    <Avatar key={user?.avatarUrl ?? "sin-foto"} className="shrink-0" style={{ width: size, height: size, border: "2px solid #6ACFC7" }}>
      {user?.avatarUrl && (
        <AvatarImage src={user.avatarUrl} alt={user?.name ?? "Foto de perfil"} className="object-cover" />
      )}
      <AvatarFallback
        className="font-bold"
        style={{ background: "#6ACFC7", color: "var(--background)", fontSize: Math.round(size * 0.4) }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

const AVATAR_PX = 320;

/** Recorta la imagen al centro en cuadrado y la reduce a 320x320 (JPEG). */
async function squareResize(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Formato de imagen no compatible"));
    el.src = dataUrl;
  });
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_PX;
  canvas.height = AVATAR_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite procesar la imagen");
  ctx.fillStyle = "#ffffff"; // fondo blanco para logos PNG transparentes
  ctx.fillRect(0, 0, AVATAR_PX, AVATAR_PX);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Lógica para elegir, subir y quitar la foto de perfil del usuario actual. */
export function useProfileAvatar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();
  const updateMutation = trpc.auth.updateMyAvatar.useMutation();
  const removeMutation = trpc.auth.removeMyAvatar.useMutation();

  const openPicker = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige una imagen (foto o logo)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máximo 15 MB)");
      return;
    }
    setBusy(true);
    try {
      const fileData = await squareResize(file);
      await updateMutation.mutateAsync({ fileData, contentType: "image/jpeg" });
      await utils.auth.me.invalidate();
      toast.success("Foto de perfil actualizada");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cambiar la foto");
    } finally {
      setBusy(false);
    }
  };

  const removeAvatar = async () => {
    setBusy(true);
    try {
      await removeMutation.mutateAsync();
      await utils.auth.me.invalidate();
      toast.success("Foto de perfil quitada");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo quitar la foto");
    } finally {
      setBusy(false);
    }
  };

  const fileInput = (
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
  );

  return { openPicker, removeAvatar, fileInput, busy };
}
