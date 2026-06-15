import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Phone, Mail, MapPin, Plus, Search, Edit2, Trash2,
  CheckCircle, X, UserPlus, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

// ── Tipo ──────────────────────────────────────────────────────────────────────
type Client = {
  id: number;
  name: string;
  email: string | null;
  whatsappPhone: string;
  address: string | null;
  createdAt: string;
  internalManagement: number;
  userId: number | null;
};

type FormState = {
  name: string;
  email: string;
  whatsappPhone: string;
  address: string;
  internalManagement: boolean;
};

const EMPTY_FORM: FormState = {
  name: "", email: "", whatsappPhone: "", address: "", internalManagement: false,
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = trpc.clients.listPaginated.useQuery({
    search: debouncedSearch || undefined,
    limit: 200,
  });

  const createMutation = trpc.clients.createQuick.useMutation({
    onSuccess: (res) => {
      toast.success(`Cliente "${res.client?.name}" creado`);
      if (res.credentials) setCreatedCreds(res.credentials);
      refetch();
      setNewOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente actualizado");
      refetch();
      setEditTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente eliminado");
      refetch();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (c: Client) => {
    setEditTarget(c);
    setForm({
      name: c.name,
      email: c.email ?? "",
      whatsappPhone: c.whatsappPhone,
      address: c.address ?? "",
      internalManagement: c.internalManagement === 1,
    });
  };

  const clients: Client[] = (data?.clients ?? []) as Client[];
  const total = data?.total ?? 0;

  const now = new Date();
  const newThisMonth = clients.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const withAccount = clients.filter((c) => c.userId).length;

  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Clientes"
        icon={<Users className="h-5 w-5" />}
        showBack={false}
        actions={
          <Button
            onClick={() => { setForm(EMPTY_FORM); setNewOpen(true); }}
            className="text-white gap-2"
            style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total", value: total, accent: "#1DB5A8" },
          { label: "Con cuenta", value: withAccount, accent: "#0D9B8F" },
          { label: "Este mes", value: newThisMonth, accent: "#0F766E" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(106,207,199,0.07)", border: "1px solid rgba(106,207,199,0.12)" }}>
            <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Búsqueda ── */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, teléfono o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Lista ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Users className="h-14 w-14 opacity-20" />
          <p className="font-medium text-base">
            {search ? "Sin resultados para esa búsqueda" : "Todavía no hay clientes registrados"}
          </p>
          {!search && (
            <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setNewOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" /> Agregar el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      {/* ── Dialog: Nuevo Cliente ── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, email: form.email || undefined })}
              disabled={createMutation.isPending || !form.name.trim() || !form.whatsappPhone.trim()}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
            >
              {createMutation.isPending ? "Guardando…" : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Cliente ── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button
              onClick={() =>
                editTarget &&
                updateMutation.mutate({
                  id: editTarget.id,
                  name: form.name,
                  email: form.email || undefined,
                  whatsappPhone: form.whatsappPhone,
                  address: form.address || undefined,
                })
              }
              disabled={updateMutation.isPending || !form.name.trim() || !form.whatsappPhone.trim()}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }}
            >
              {updateMutation.isPending ? "Guardando…" : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Eliminar ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleteTarget?.name}</strong> junto con todas sus citas,
              asesorías, cotizaciones y proyectos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Credenciales creadas ── */}
      <Dialog open={!!createdCreds} onOpenChange={(v) => !v && setCreatedCreds(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <CheckCircle className="h-5 w-5" /> Credenciales generadas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Se creó una cuenta para el cliente. Comparte estas credenciales de acceso al portal:
            </p>
            <CredRow label="Email" value={createdCreds?.email ?? ""} />
            <CredRow label="Contraseña temporal" value={createdCreds?.password ?? ""} />
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)} style={{ background: "linear-gradient(135deg, #1DB5A8, #0D9B8F)" }} className="text-white w-full">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ClientCard ────────────────────────────────────────────────────────────────
function ClientCard({
  client, onEdit, onDelete,
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = client.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const waNumber = `57${client.whatsappPhone.replace(/\D/g, "")}`;

  return (
    <Card className="hover:shadow-md transition-all" style={{ borderColor: "rgba(106,207,199,0.15)" }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6ACFC7, #4ABDB5)", color: "#0C1A1A" }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-semibold text-sm truncate" style={{ color: "rgba(255,255,255,0.90)" }}>{client.name}</span>
              {client.internalManagement === 1 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ color: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.15)" }}>
                  Interno
                </Badge>
              )}
              {client.userId && (
                <Badge className="text-[10px] px-1.5 py-0" style={{ background: "rgba(106,207,199,0.15)", color: "#6ACFC7", border: "1px solid rgba(106,207,199,0.25)" }}>
                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                  Portal
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: "#6ACFC7" }}
              >
                <Phone className="h-3 w-3 shrink-0" />
                {client.whatsappPhone}
              </a>
              {client.email && (
                <p className="flex items-center gap-1.5 text-xs truncate" style={{ color: "rgba(255,255,255,0.50)" }}>
                  <Mail className="h-3 w-3 shrink-0" />
                  {client.email}
                </p>
              )}
              {client.address && (
                <p className="flex items-center gap-1.5 text-xs truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  {client.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(106,207,199,0.10)" }}>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {new Date(client.createdAt).toLocaleDateString("es-CO", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </span>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 w-7 p-0"
              style={{ color: "rgba(255,255,255,0.40)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#6ACFC7"; e.currentTarget.style.background = "rgba(106,207,199,0.10)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.background = "transparent"; }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0"
              style={{ color: "rgba(255,255,255,0.40)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.10)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.background = "transparent"; }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── ClientForm ────────────────────────────────────────────────────────────────
function ClientForm({
  form, setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const update = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label>Nombre completo *</Label>
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ej: Carlos Ramírez"
        />
      </div>
      <div className="space-y-1.5">
        <Label>WhatsApp *</Label>
        <Input
          value={form.whatsappPhone}
          onChange={(e) => update("whatsappPhone", e.target.value)}
          placeholder="Ej: 3001234567"
          type="tel"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="correo@ejemplo.com"
          type="email"
        />
        <p className="text-[11px] text-slate-400">
          Si se ingresa email se creará una cuenta de acceso al portal del cliente.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Dirección</Label>
        <Input
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="Ej: Calle 15 # 32-10, Pereira"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="internalMgmt"
          checked={form.internalManagement}
          onCheckedChange={(v) => update("internalManagement", !!v)}
        />
        <Label htmlFor="internalMgmt" className="text-sm font-normal cursor-pointer text-slate-600">
          Gestión interna (no crear cuenta de usuario aunque tenga email)
        </Label>
      </div>
    </div>
  );
}

// ── CredRow ───────────────────────────────────────────────────────────────────
function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.05] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] text-white/35 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-mono font-medium text-white/80 truncate">{value}</p>
      </div>
      <button onClick={copy} className="text-white/35 hover:text-teal-400 shrink-0 transition-colors">
        {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
