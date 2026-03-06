"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calculator, 
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  X,
  ArrowLeft,
  Edit2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { ExpenseImportModal } from "@/components/ExpenseImportModal";
import { Upload } from "lucide-react";

// Categorías operativas
const OPERATIVE_CATEGORIES = [
  { value: "arriendo", label: "Arriendo" },
  { value: "energia", label: "Energía" },
  { value: "agua", label: "Agua" },
  { value: "internet", label: "Internet" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "herramientas", label: "Herramientas" },
  { value: "jardineria", label: "Jardinería" },
  { value: "reparaciones", label: "Reparaciones" },
  { value: "transporte", label: "Transporte" },
  { value: "papeleria", label: "Papelería" },
  { value: "aseo", label: "Aseo" },
  { value: "otro", label: "Otro" },
] as const;

const GENERAL_CATEGORIES = [
  { value: "materiales", label: "Materiales" },
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otros", label: "Otros" },
] as const;

type ExpenseType = "materiales_proyecto" | "gasto_operativo";

export default function Accounting() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [expenseType, setExpenseType] = useState<ExpenseType>("materiales_proyecto");
  const [projectId, setProjectId] = useState<string>("");
  const [operativeCategory, setOperativeCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<"all" | ExpenseType>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Queries
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: expenses } = trpc.expenses.getAll.useQuery();

  // Check if user has permission to import
  const canImport = user?.role === "admin" || user?.role === "super_admin";

  // Mutations
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto registrado correctamente");
      utils.expenses.getAll.invalidate();
      // Autolimpieza inteligente
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setEditingId(null);
      // Mantener tipo, proyecto/categoría y fecha
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto actualizado correctamente");
      utils.expenses.getAll.invalidate();
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto eliminado correctamente");
      utils.expenses.getAll.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Filtrar gastos
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    let filtered = expenses;

    if (filterType !== "all") {
      filtered = filtered.filter(e => e.expenseType === filterType);
    }

    if (minAmount) {
      const min = parseFloat(minAmount);
      filtered = filtered.filter(e => e.amount >= min);
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount);
      filtered = filtered.filter(e => e.amount <= max);
    }

    return filtered;
  }, [expenses, filterType, minAmount, maxAmount]);

  // Validar y guardar
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Validaciones
    if (!description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (expenseType === "materiales_proyecto" && !projectId) {
      toast.error("Selecciona un proyecto");
      return;
    }

    if (expenseType === "gasto_operativo" && !operativeCategory) {
      toast.error("Selecciona una categoría operativa");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateExpense.mutateAsync({
          id: editingId,
          description: description.trim(),
          amount: parseFloat(amount),
          expenseDate,
          expenseType,
          operativeCategory: expenseType === "gasto_operativo" ? (operativeCategory as any) : undefined,
          generalCategory: expenseType === "materiales_proyecto" ? "materiales" : "servicios",
        });
      } else {
        await createExpense.mutateAsync({
          expenseType,
          projectId: expenseType === "materiales_proyecto" ? parseInt(projectId) : undefined,
          operativeCategory: expenseType === "gasto_operativo" ? (operativeCategory as any) : undefined,
          description: description.trim(),
          amount: parseFloat(amount),
          expenseDate,
          generalCategory: expenseType === "materiales_proyecto" ? "materiales" : "servicios",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingId(expense.id);
    setExpenseType(expense.expenseType);
    setProjectId(expense.projectId?.toString() || "");
    setOperativeCategory(expense.operativeCategory || "");
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setExpenseDate(new Date(expense.expenseDate).toISOString().split("T")[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setProjectId("");
    setOperativeCategory("");
  };

  const handleDeleteExpense = async (id: number) => {
    await deleteExpense.mutateAsync(id);
  };

  const canEditDelete = user && ["admin", "super_admin"].includes(user.role);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <ExpenseImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        projects={projects || []}
      />
      {/* Botón de navegación */}
      <div className="bg-white border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full md:w-auto h-10 md:h-9 mb-3 md:mb-0 text-gray-700 hover:text-teal-600 hover:bg-teal-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Panel
            </Button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-teal-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
                <p className="text-gray-600">Registro de gastos del proyecto</p>
              </div>
            </div>
            {canImport && (
              <Button
                onClick={() => setImportModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar gastos
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Formulario Simple */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>{editingId ? "Actualizar Gasto" : "Registrar Gasto"}</CardTitle>
            <CardDescription>
              {editingId ? "Modifica los datos del gasto" : "Completa el formulario para registrar un nuevo gasto"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECCIÓN 1: Tipo de Gasto - Botones Toggle */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Tipo de Gasto</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setExpenseType("materiales_proyecto")}
                    className={`flex-1 h-12 text-base font-semibold transition-all ${
                      expenseType === "materiales_proyecto"
                        ? "bg-teal-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Proyecto
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setExpenseType("gasto_operativo")}
                    className={`flex-1 h-12 text-base font-semibold transition-all ${
                      expenseType === "gasto_operativo"
                        ? "bg-amber-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Operativo
                  </Button>
                </div>
              </div>

              {/* SECCIÓN 2: Campos Dinámicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expenseType === "materiales_proyecto" ? (
                  <div>
                    <Label htmlFor="project">Proyecto *</Label>
                    <Select value={projectId} onValueChange={(v: any) => setProjectId(v)}>
                      <SelectTrigger id="project" className="h-12">
                        <SelectValue placeholder="Selecciona un proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="category">Categoría Operativa *</Label>
                    <Select value={operativeCategory} onValueChange={(v: any) => setOperativeCategory(v)}>
                      <SelectTrigger id="category" className="h-12">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATIVE_CATEGORIES.map((c: any) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Fecha */}
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e: any) => setExpenseDate(e.target.value)}
                  className="h-12"
                />
                </div>
              </div>

              {/* SECCIÓN 3: Campos Comunes */}
              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Describe el gasto"
                  value={description}
                  onChange={(e: any) => setDescription((e as any).target.value)}
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="amount">Monto ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    min="1"
                    value={amount}
                    onChange={(e: any) => setAmount((e as any).target.value)}
                    className="h-12"
                  />
              </div>

              {/* SECCIÓN 4: Botón */}
              <div className="flex justify-end gap-3 pt-4">
                {editingId && (
                  <Button
                    type="button"
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="h-12 px-8 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-8 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                >
                  {editingId ? "Actualizar gasto" : "Guardar gasto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>



        {/* Historial de Gastos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial de Gastos</CardTitle>
                <CardDescription>Últimos gastos registrados</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v as any)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="materiales_proyecto">Proyecto</SelectItem>
                    <SelectItem value="gasto_operativo">Operativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Monto Mín</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e: any) => setMinAmount((e as any).target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Monto Máx</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={maxAmount}
                  onChange={(e: any) => setMaxAmount((e as any).target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setMinAmount("");
                    setMaxAmount("");
                  }}
                  className="w-full h-10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold">Descripción</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-right py-3 px-4 font-semibold">Monto</th>
                    {canEditDelete && <th className="text-center py-3 px-4 font-semibold">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.slice(0, 10).map((expense: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(expense.expenseDate).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3 px-4">{expense.description}</td>
                      <td className="py-3 px-4">
                        <Badge variant={expense.expenseType === "materiales_proyecto" ? "default" : "secondary"}>
                          {expense.expenseType === "materiales_proyecto" ? "Proyecto" : "Operativo"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ${expense.amount.toLocaleString()}
                      </td>
                      {canEditDelete && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditExpense(expense)}
                              className="h-8 w-8 p-0 md:h-auto md:w-auto md:px-2"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Editar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(expense.id)}
                              className="h-8 w-8 p-0 md:h-auto md:w-auto md:px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Eliminar</span>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay gastos registrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Gasto</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDeleteExpense(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
