import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Package, Plus, Trash2, Wrench, Truck, MoreHorizontal,
  TrendingDown, Receipt,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  materiales:    { label: "Materiales",     color: "#6366F1", icon: <Package className="h-3 w-3" /> },
  mano_de_obra:  { label: "Mano de obra",   color: "#F59E0B", icon: <Wrench className="h-3 w-3" /> },
  transporte:    { label: "Transporte",     color: "#10B981", icon: <Truck className="h-3 w-3" /> },
  alquiler:      { label: "Alquiler",       color: "#EC4899", icon: <Receipt className="h-3 w-3" /> },
  servicios:     { label: "Servicios",      color: "#8B5CF6", icon: <MoreHorizontal className="h-3 w-3" /> },
  mantenimiento: { label: "Mantenimiento",  color: "#0EA5E9", icon: <Wrench className="h-3 w-3" /> },
  otros:         { label: "Otros",          color: "#64748B", icon: <MoreHorizontal className="h-3 w-3" /> },
};

interface Props {
  projectId: number;
  isAdmin: boolean;
  onTotalChange?: (total: number) => void;
}

export function ProjectExpensesSection({ projectId, isAdmin, onTotalChange }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    generalCategory: "materiales" as string,
    subcategory: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const { data, isLoading, refetch } = trpc.expenses.getProjectMaterialExpenses.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto registrado");
      setOpen(false);
      resetForm();
      refetch().then((r) => {
        if (r.data?.total !== undefined) onTotalChange?.(r.data.total);
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Gasto eliminado");
      refetch().then((r) => {
        if (r.data?.total !== undefined) onTotalChange?.(r.data.total);
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () =>
    setForm({
      description: "",
      amount: "",
      generalCategory: "materiales",
      subcategory: "",
      expenseDate: new Date().toISOString().slice(0, 10),
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error("Ingresa un valor válido");
    createExpense.mutate({
      expenseType: "materiales_proyecto",
      projectId,
      generalCategory: form.generalCategory as any,
      subcategory: form.subcategory || undefined,
      description: form.description,
      amount,
      expenseDate: form.expenseDate,
    });
  };

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  // Agrupar por categoría
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.generalCategory || "otros";
    acc[cat] = (acc[cat] || 0) + parseFloat(e.amount?.toString() || "0");
    return acc;
  }, {});

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-3">
      {/* Header con total */}
      <Card className="border-orange-500/20">
        <CardHeader className="py-3 bg-orange-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-300">
              <TrendingDown className="h-4 w-4" />
              Gastos del Proyecto
            </CardTitle>
            <span className="text-base font-bold text-orange-300">{fmt(total)}</span>
          </div>
        </CardHeader>

        {/* Desglose por categoría */}
        {Object.keys(byCategory).length > 0 && (
          <CardContent className="pt-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(byCategory).map(([cat, val]) => {
                const meta = CATEGORY_META[cat] ?? CATEGORY_META.otros;
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="text-xs gap-1 px-2"
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    {meta.icon}
                    {meta.label}: {fmt(val)}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Botón agregar */}
      {isAdmin && (
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="w-full border-orange-500/25 text-orange-300 hover:bg-orange-500/10 gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar Gasto
        </Button>
      )}

      {/* Lista de gastos */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Sin gastos registrados
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp: any) => {
            const meta = CATEGORY_META[exp.generalCategory] ?? CATEGORY_META.otros;
            const date = new Date(exp.expenseDate).toLocaleDateString("es-CO", {
              day: "2-digit", month: "short",
            });
            return (
              <div
                key={exp.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: meta.color + "20", color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">{exp.description}</p>
                  <p className="text-xs text-slate-400">
                    {meta.label} · {date}
                    {exp.subcategory && ` · ${exp.subcategory}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-orange-400 shrink-0">
                  {fmt(parseFloat(exp.amount))}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 shrink-0"
                    onClick={() => deleteExpense.mutate(exp.id)}
                    disabled={deleteExpense.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo gasto */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Ej: Tableros MDF 15mm — 8 unidades"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor (COP)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoría</Label>
              <Select
                value={form.generalCategory}
                onValueChange={(v) => setForm({ ...form, generalCategory: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subcategoría <span className="text-slate-400">(opcional)</span></Label>
              <Input
                placeholder="Ej: MDF, herrajes, bisagras…"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createExpense.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {createExpense.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
