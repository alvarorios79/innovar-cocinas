import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Receipt, 
  Building2, 
  Package, 
  ArrowLeft, 
  Check, 
  Upload, 
  Calendar,
  TrendingUp,
  DollarSign,
  FileText,
  Trash2,
  Eye,
  Plus,
  Filter,
  Edit,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const GENERAL_CATEGORIES = [
  { value: "materiales", label: "Materiales" },
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otros", label: "Otros" },
] as const;

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

type ExpenseType = "materiales_proyecto" | "gasto_operativo";
type GeneralCategory = typeof GENERAL_CATEGORIES[number]["value"];
type OperativeCategory = typeof OPERATIVE_CATEGORIES[number]["value"];

interface ExpenseFormData {
  expenseType: ExpenseType;
  projectId?: number | null;
  projectClientName?: string | null;
  generalCategory: GeneralCategory;
  subcategory?: string | null;
  operativeCategory?: OperativeCategory | null;
  description: string;
  amount: string;
  expenseDate: string;
  supportUrl?: string | null;
  supportFileName?: string | null;
  id?: number;
  createdBy?: number;
  createdByUser?: any;
  createdAt?: string;
  updatedAt?: string;
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<"register" | "history" | "summary">("register");
  const [selectedExpenseType, setSelectedExpenseType] = useState<null | "materiales_proyecto" | "gasto_operativo">(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseType: "materiales_proyecto",
    generalCategory: "materiales",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "materiales_proyecto" | "gasto_operativo">("all");
  const [dateFilterPeriod, setDateFilterPeriod] = useState<"all" | "this_month" | "last_month" | "last_quarter" | "this_year" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [filterGeneralCategory, setFilterGeneralCategory] = useState<string | "all">("all");
  const [searchDescription, setSearchDescription] = useState<string>("");
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [showAmountWarning, setShowAmountWarning] = useState(false);
  const [amountWarningType, setAmountWarningType] = useState<"high" | "low" | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [filterMinAmount, setFilterMinAmount] = useState<string>("");
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>("");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string | "all">("all");

  const { data: projects } = trpc.expenses.getProjectsForSelect.useQuery();
  const { data: expenses, refetch: refetchExpenses } = trpc.expenses.getAll.useQuery({ type: filterType });
  const { data: summary, refetch: refetchSummary } = trpc.expenses.getSummary.useQuery();

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto registrado correctamente", { duration: 3000 });
      resetFormAfterSuccess();
      refetchExpenses();
      refetchSummary();
      setPendingSubmit(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el gasto");
      setPendingSubmit(false);
    },
  });

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto actualizado correctamente");
      setEditingExpenseId(null);
      resetForm();
      refetchExpenses();
      refetchSummary();
      setPendingSubmit(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar el gasto");
      setPendingSubmit(false);
    },
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("✅ Gasto eliminado");
      refetchExpenses();
      refetchSummary();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar el gasto");
    },
  });

  const resetForm = () => {
    setFormData({
      expenseType: "materiales_proyecto",
      generalCategory: "materiales",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
    });
    setEditingExpenseId(null);
  };

  const resetFormAfterSuccess = () => {
    setFormData(prev => ({
      ...prev,
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      supportUrl: undefined,
      supportFileName: undefined,
    }));
  };

  const uploadSupport = trpc.expenses.uploadSupport.useMutation({
    onSuccess: (data) => {
      setFormData(prev => ({
        ...prev,
        supportUrl: data.url,
        supportFileName: data.fileName,
      }));
      toast.success("✅ Soporte subido correctamente");
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir el archivo");
      setIsUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy grande. Máximo 5MB.");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadSupport.mutate({ photoData: base64, fileName: file.name });
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const checkForDuplicates = (): boolean => {
    if (!expenses) return false;
    const amount = parseFloat(formData.amount);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const similar = expenses.find(exp => {
      const expDate = new Date(exp.expenseDate);
      if (expDate < threeDaysAgo) return false;
      const sameProject = formData.projectId ? exp.projectId === formData.projectId : true;
      const sameAmount = Math.abs(exp.amount - amount) < 100;
      const similarDesc = exp.description.toLowerCase().includes(formData.description.toLowerCase().substring(0, 10));
      return sameProject && sameAmount && similarDesc;
    });
    return !!similar;
  };

  const validateAmount = (): boolean => {
    const amount = parseFloat(formData.amount);
    if (amount > 5000000) {
      setAmountWarningType("high");
      setShowAmountWarning(true);
      return false;
    }
    if (amount < 1000) {
      setAmountWarningType("low");
      setShowAmountWarning(true);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!formData.description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("El valor debe ser mayor a 0");
      return;
    }
    if (formData.expenseType === "materiales_proyecto" && !formData.projectId && !formData.projectClientName) {
      toast.error("Debe especificar el proyecto o cliente");
      return;
    }
    if (formData.expenseType === "gasto_operativo" && !formData.operativeCategory) {
      toast.error("Debe especificar la categoría");
      return;
    }
    if (!validateAmount()) return;
    if (!editingExpenseId && checkForDuplicates()) {
      setShowDuplicateWarning(true);
      return;
    }
    proceedWithSubmit();
  };

  const proceedWithSubmit = () => {
    setPendingSubmit(true);
    if (editingExpenseId) {
      updateExpense.mutate({
        id: editingExpenseId,
        generalCategory: formData.generalCategory,
        subcategory: formData.subcategory || undefined,
        operativeCategory: formData.operativeCategory as any,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        supportUrl: formData.supportUrl || undefined,
        supportFileName: formData.supportFileName || undefined,
      });
    } else {
      createExpense.mutate({
        expenseType: formData.expenseType,
        projectId: formData.projectId || undefined,
        projectClientName: formData.projectClientName || undefined,
        generalCategory: formData.generalCategory,
        subcategory: formData.subcategory || undefined,
        operativeCategory: formData.operativeCategory as any,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        supportUrl: formData.supportUrl || undefined,
        supportFileName: formData.supportFileName || undefined,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDateRange = () => {
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    switch (dateFilterPeriod) {
      case "this_month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last_quarter":
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        toDate = now;
        break;
      case "this_year":
        fromDate = new Date(now.getFullYear(), 0, 1);
        toDate = now;
        break;
      case "custom":
        if (customDateFrom) fromDate = new Date(customDateFrom);
        if (customDateTo) toDate = new Date(customDateTo);
        break;
    }
    return { from: fromDate, to: toDate };
  };

  const createdByUsers = useMemo(() => {
    if (!expenses) return [];
    const users = new Map<number, string>();
    expenses.forEach(exp => {
      if (exp.createdByUser?.name) {
        users.set(exp.createdBy, exp.createdByUser.name);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    const dateRange = getDateRange();
    let filtered = dateRange ? expenses.filter(expense => {
      const expenseDate = new Date(expense.expenseDate);
      if (dateRange.from && expenseDate < dateRange.from) return false;
      if (dateRange.to && expenseDate > dateRange.to) return false;
      return true;
    }) : expenses;
    if (filterGeneralCategory !== "all") {
      filtered = filtered.filter(expense => expense.generalCategory === filterGeneralCategory);
    }
    if (searchDescription.trim()) {
      const searchLower = searchDescription.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchLower)
      );
    }
    if (filterMinAmount) {
      const minAmount = parseFloat(filterMinAmount);
      filtered = filtered.filter(expense => expense.amount >= minAmount);
    }
    if (filterMaxAmount) {
      const maxAmount = parseFloat(filterMaxAmount);
      filtered = filtered.filter(expense => expense.amount <= maxAmount);
    }
    if (filterCreatedBy !== "all") {
      const userId = parseInt(filterCreatedBy);
      filtered = filtered.filter(expense => expense.createdBy === userId);
    }
    return filtered;
  }, [expenses, dateFilterPeriod, customDateFrom, customDateTo, filterGeneralCategory, searchDescription, filterMinAmount, filterMaxAmount, filterCreatedBy]);

  const filteredTotals = useMemo(() => {
    const materiales = filteredExpenses
      .filter(e => e.expenseType === "materiales_proyecto")
      .reduce((sum, e) => sum + e.amount, 0);
    const operativos = filteredExpenses
      .filter(e => e.expenseType === "gasto_operativo")
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      materiales,
      operativos,
      total: materiales + operativos,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  const totals = useMemo(() => {
    if (!summary) return { materiales: 0, operativos: 0, total: 0, byGeneralCategory: {} };
    const materiales = summary.byType.find(t => t.expenseType === "materiales_proyecto")?.total || 0;
    const operativos = summary.byType.find(t => t.expenseType === "gasto_operativo")?.total || 0;
    const byGeneralCategory: Record<string, number> = {};
    if (summary.byGeneralCategory) {
      summary.byGeneralCategory.forEach((cat: any) => {
        byGeneralCategory[cat.generalCategory] = cat.total;
      });
    }
    return { materiales, operativos, total: materiales + operativos, byGeneralCategory };
  }, [summary]);

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <PageHeader
        title="Sistema Contable Interno"
        subtitle="Selecciona el tipo de gasto"
        showBack={false}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-98 transition-all duration-300 cursor-pointer border bg-white group touch-manipulation"
            onClick={() => {
              setSelectedExpenseType("materiales_proyecto");
              setFormData(prev => ({ ...prev, expenseType: "materiales_proyecto" }));
            }}
          >
            <CardContent className="p-6 sm:p-8 md:p-10">
              <div className="space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Gastos de Proyecto</h3>
                  <p className="text-sm sm:text-base text-gray-600 mt-2 leading-relaxed">
                    Materiales y costos vinculados a un cliente o proyecto específico.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs sm:text-sm">Madera</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs sm:text-sm">Bisagras</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs sm:text-sm">Rieles</Badge>
                </div>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg rounded-lg transition-colors h-12 sm:h-14">
                  Registrar Gasto
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-98 transition-all duration-300 cursor-pointer border bg-white group touch-manipulation"
            onClick={() => {
              setSelectedExpenseType("gasto_operativo");
              setFormData(prev => ({ ...prev, expenseType: "gasto_operativo" }));
            }}
          >
            <CardContent className="p-6 sm:p-8 md:p-10">
              <div className="space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Gastos Operativos</h3>
                  <p className="text-sm sm:text-base text-gray-600 mt-2 leading-relaxed">
                    Arriendo, servicios, transporte y gastos generales del negocio.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs sm:text-sm">Arriendo</Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs sm:text-sm">Energía</Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs sm:text-sm">Agua</Badge>
                </div>
                <Button className="w-full mt-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg rounded-lg transition-colors h-12 sm:h-14">
                  Registrar Gasto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderSimplifiedForm = () => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 md:mb-0">
      <Card className="bg-white rounded-2xl shadow-md">
        <CardHeader className="p-6 sm:p-8 md:p-10">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            Registrar Nuevo Gasto
          </CardTitle>
          <CardDescription className="text-sm sm:text-base mt-2">
            {selectedExpenseType === "materiales_proyecto" ? "Gastos de Materiales de Proyecto" : "Gastos Operativos"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 md:p-10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {selectedExpenseType === "materiales_proyecto" && (
                <div className="space-y-2">
                  <Label className="font-semibold text-sm sm:text-base">Proyecto o Cliente *</Label>
                  <Select 
                    value={formData.projectId?.toString() || ""} 
                    onValueChange={(v) => {
                      const project = projects?.find(p => p.id === parseInt(v));
                      setFormData(prev => ({ 
                        ...prev, 
                        projectId: parseInt(v),
                        projectClientName: project ? `${project.name} - ${project.clientName}` : ""
                      }));
                    }}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecciona un proyecto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} - {p.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.projectId && (
                    <Input 
                      placeholder="O escribe nombre del cliente/proyecto"
                      value={formData.projectClientName || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        projectClientName: e.target.value,
                        projectId: undefined 
                      }))}
                      className="h-12 text-base px-4"
                    />
                  )}
                </div>
              )}

              {selectedExpenseType === "gasto_operativo" && (
                <div className="space-y-2">
                  <Label className="font-semibold text-sm sm:text-base">Categoría Operativa *</Label>
                  <Select 
                    value={formData.operativeCategory || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, operativeCategory: value as OperativeCategory }))}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecciona una categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATIVE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-semibold text-sm sm:text-base">Valor (COP) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="pl-10 h-12 text-base px-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm sm:text-base">Fecha *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="pl-10 h-12 text-base px-4"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold text-sm sm:text-base">Descripción *</Label>
                <Textarea 
                  placeholder="Ej: madera RH, bisagras, rieles..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="text-base px-4 py-2"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm sm:text-base">Categoría General *</Label>
                <Select 
                  value={formData.generalCategory}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, generalCategory: value as GeneralCategory }))}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm sm:text-base">Soporte (Opcional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      {isUploading ? "Subiendo..." : "Haz clic para subir"}
                    </p>
                  </label>
                </div>
                {formData.supportFileName && (
                  <p className="text-xs text-blue-600 font-medium">✓ {formData.supportFileName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Botones: Sticky en móvil, normal en desktop */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-inner md:static md:shadow-none md:p-0 md:bg-transparent border-t md:border-t-0 flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline"
              onClick={resetForm}
              className="flex-1 h-12 text-base active:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createExpense.isPending || updateExpense.isPending || pendingSubmit}
              className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
            >
              <Check className="w-4 h-4 mr-2" />
              {editingExpenseId ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {selectedExpenseType === null && activeTab === "register" ? (
        renderTypeSelection()
      ) : (
        <>
          <PageHeader
            title="Sistema Contable Interno"
            subtitle="Gestiona los gastos de INNOVAR Cocinas"
            showBack={false}
          />

          {activeTab === "register" && selectedExpenseType !== null && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <Button
                variant="ghost"
                onClick={() => setSelectedExpenseType(null)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cambiar tipo de gasto
              </Button>
            </div>
          )}
        </>
      )}

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as any);
        if (v === "register") {
          setSelectedExpenseType(null);
        }
      }} className="space-y-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabsList className="grid w-full grid-cols-3 h-auto bg-gray-100">
            <TabsTrigger value="register" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-white">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Registrar</span>
              <span className="sm:hidden">Reg</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-white">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Hist</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-white">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Resumen</span>
              <span className="sm:hidden">Res</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="register" className="space-y-4">
          {selectedExpenseType === null ? renderTypeSelection() : renderSimplifiedForm()}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-white rounded-2xl shadow-md">
              <CardHeader className="p-6 sm:p-8">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                  Historial de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="h-12 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="materiales_proyecto">Materiales</SelectItem>
                      <SelectItem value="gasto_operativo">Operativos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilterPeriod} onValueChange={(v: any) => setDateFilterPeriod(v)}>
                    <SelectTrigger className="h-12 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      <SelectItem value="this_month">Este mes</SelectItem>
                      <SelectItem value="last_month">Mes anterior</SelectItem>
                      <SelectItem value="last_quarter">Último trimestre</SelectItem>
                      <SelectItem value="this_year">Este año</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterGeneralCategory} onValueChange={(v) => setFilterGeneralCategory(v)}>
                    <SelectTrigger className="h-12 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {GENERAL_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input 
                    placeholder="Buscar descripción..."
                    value={searchDescription}
                    onChange={(e) => setSearchDescription(e.target.value)}
                    className="h-12 text-sm px-4"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <Input 
                    type="number"
                    placeholder="Valor mínimo"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    className="h-12 text-sm px-4"
                  />
                  <Input 
                    type="number"
                    placeholder="Valor máximo"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    className="h-12 text-sm px-4"
                  />
                  <Select value={filterCreatedBy} onValueChange={(v) => setFilterCreatedBy(v)}>
                    <SelectTrigger className="h-12 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {createdByUsers.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dateFilterPeriod === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input 
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="h-12 text-sm px-4"
                    />
                    <Input 
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="h-12 text-sm px-4"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-3 p-3 text-center">
                      <p className="text-xs text-gray-600">Materiales</p>
                      <p className="text-sm sm:text-base font-bold text-blue-600">{formatCurrency(filteredTotals.materiales)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50">
                    <CardContent className="pt-3 p-3 text-center">
                      <p className="text-xs text-gray-600">Operativos</p>
                      <p className="text-sm sm:text-base font-bold text-purple-600">{formatCurrency(filteredTotals.operativos)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-3 p-3 text-center">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-sm sm:text-base font-bold text-green-600">{formatCurrency(filteredTotals.total)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="pt-3 p-3 text-center">
                      <p className="text-xs text-gray-600">Registros</p>
                      <p className="text-sm sm:text-base font-bold text-gray-600">{filteredTotals.count}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay gastos registrados</p>
                    </div>
                  ) : (
                    filteredExpenses.map(expense => (
                      <Card key={expense.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-3 p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={expense.expenseType === "materiales_proyecto" ? "default" : "secondary"} className="text-xs">
                                  {expense.expenseType === "materiales_proyecto" ? "Mat" : "Op"}
                                </Badge>
                                <span className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</span>
                              </div>
                              <p className="font-semibold text-sm truncate">{expense.description}</p>
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {expense.projectClientName || expense.operativeCategory || "Sin proyecto"}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold text-green-600">{formatCurrency(expense.amount)}</p>
                              <div className="flex gap-1 mt-2">
                                {expense.supportUrl && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => window.open(expense.supportUrl || "", "_blank")}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setFormData({
                                      expenseType: expense.expenseType,
                                      projectId: expense.projectId,
                                      projectClientName: expense.projectClientName,
                                      generalCategory: expense.generalCategory,
                                      subcategory: expense.subcategory,
                                      operativeCategory: expense.operativeCategory,
                                      description: expense.description,
                                      amount: expense.amount.toString(),
                                      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
                                      supportUrl: expense.supportUrl,
                                      supportFileName: expense.supportFileName,
                                    });
                                    setEditingExpenseId(expense.id);
                                    setActiveTab("register");
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("¿Eliminar este gasto?")) {
                                      deleteExpense.mutate(expense.id);
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader className="p-6 sm:p-8">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                    Resumen por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-2">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded text-sm">
                    <span className="font-medium">Materiales</span>
                    <span className="font-bold text-blue-600">{formatCurrency(totals.materiales)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded text-sm">
                    <span className="font-medium">Operativos</span>
                    <span className="font-bold text-purple-600">{formatCurrency(totals.operativos)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded border-2 border-green-200 text-sm">
                    <span className="font-bold">TOTAL</span>
                    <span className="font-bold text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader className="p-6 sm:p-8">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                    Por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-1 max-h-64 overflow-y-auto">
                  {Object.entries(totals.byGeneralCategory).map(([category, total]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs sm:text-sm">
                      <span className="font-medium capitalize">
                        {GENERAL_CATEGORIES.find(c => c.value === category)?.label || category}
                      </span>
                      <span className="font-semibold">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {summary?.byProject && summary.byProject.length > 0 && (
              <Card className="bg-white rounded-2xl shadow-md mt-4">
                <CardHeader className="p-6 sm:p-8">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    Gastos por Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {summary.byProject.map((project: any) => (
                      <div key={project.projectId || project.projectClientName} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs sm:text-sm">
                        <span className="font-medium">{project.projectClientName}</span>
                        <span className="font-bold text-blue-600">{formatCurrency(project.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAmountWarning} onOpenChange={setShowAmountWarning}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Advertencia de Monto
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-3 text-sm sm:text-base">
            {amountWarningType === "high" && (
              <>
                <p className="font-semibold">El valor es mayor a $5.000.000</p>
                <p className="text-sm">Valor ingresado: <span className="font-bold">{formatCurrency(parseFloat(formData.amount))}</span></p>
              </>
            )}
            {amountWarningType === "low" && (
              <>
                <p className="font-semibold">El valor es menor a $1.000</p>
                <p className="text-sm">Valor ingresado: <span className="font-bold">{formatCurrency(parseFloat(formData.amount))}</span></p>
              </>
            )}
            <p className="text-gray-600">¿Confirmas que este monto es correcto?</p>
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAmountWarning(false)} className="flex-1 h-10">
              Editar
            </Button>
            <Button onClick={() => {
              setShowAmountWarning(false);
              proceedWithSubmit();
            }} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Posible Duplicado
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-3 text-sm sm:text-base">
            <p className="font-semibold">Se encontró un gasto similar en los últimos 3 días</p>
            <div className="bg-orange-50 p-3 rounded border border-orange-200 text-xs sm:text-sm">
              <p><strong>Proyecto:</strong> {formData.projectClientName}</p>
              <p><strong>Monto:</strong> {formatCurrency(parseFloat(formData.amount))}</p>
              <p><strong>Descripción:</strong> {formData.description.substring(0, 50)}...</p>
            </div>
            <p className="text-gray-600">¿Deseas continuar de todas formas?</p>
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateWarning(false)} className="flex-1 h-10">
              Cancelar
            </Button>
            <Button onClick={() => {
              setShowDuplicateWarning(false);
              proceedWithSubmit();
            }} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
