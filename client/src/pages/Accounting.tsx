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
  Calculator, 
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
  Download,
  FileSpreadsheet,
  FileType,
  CalendarRange,
  X,
  Edit
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// Categorías generales obligatorias
const GENERAL_CATEGORIES = [
  { value: "materiales", label: "Materiales" },
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otros", label: "Otros" },
] as const;

// Categorías operativas con etiquetas amigables
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
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseType: "materiales_proyecto",
    generalCategory: "materiales",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "materiales_proyecto" | "gasto_operativo">("all");
  const [viewExpense, setViewExpense] = useState<any>(null);
  
  // Estados para filtro de fechas
  const [dateFilterPeriod, setDateFilterPeriod] = useState<"all" | "this_month" | "last_month" | "last_quarter" | "this_year" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterGeneralCategory, setFilterGeneralCategory] = useState<string | "all">("all");
  const [searchDescription, setSearchDescription] = useState<string>("");
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  // Queries
  const { data: projects } = trpc.expenses.getProjectsForSelect.useQuery();
  const { data: expenses, refetch: refetchExpenses } = trpc.expenses.getAll.useQuery({ type: filterType });
  const { data: summary, refetch: refetchSummary } = trpc.expenses.getSummary.useQuery();

  // Mutations
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto registrado correctamente");
      resetForm();
      refetchExpenses();
      refetchSummary();
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar el gasto");
    },
  });

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Gasto actualizado correctamente");
      setEditingExpenseId(null);
      resetForm();
      refetchExpenses();
      refetchSummary();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar el gasto");
    },
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Gasto eliminado");
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

  // Mutation para subir soporte
  const uploadSupport = trpc.expenses.uploadSupport.useMutation({
    onSuccess: (data) => {
      setFormData(prev => ({
        ...prev,
        supportUrl: data.url,
        supportFileName: data.fileName,
      }));
      toast.success("Soporte subido correctamente");
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

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy grande. Máximo 5MB.");
      return;
    }

    setIsUploading(true);
    
    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadSupport.mutate({
        photoData: base64,
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    // Validación mínima
    if (!formData.description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("El valor debe ser mayor a 0");
      return;
    }

    if (formData.expenseType === "materiales_proyecto" && !formData.projectId && !formData.projectClientName) {
      toast.error("Debe especificar el proyecto o cliente para gastos de materiales");
      return;
    }

    if (formData.expenseType === "gasto_operativo" && !formData.operativeCategory) {
      toast.error("Debe especificar la categoría para gastos operativos");
      return;
    }

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

  // Calcular rango de fechas según el período seleccionado
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
      default:
        return null;
    }
    
    return { from: fromDate, to: toDate };
  };

  // Filtrar gastos por fecha
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
    
    return filtered;
  }, [expenses, dateFilterPeriod, customDateFrom, customDateTo, filterGeneralCategory, searchDescription]);

  // Calcular totales de gastos filtrados
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

  // Calcular totales
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
    
    return {
      materiales,
      operativos,
      total: materiales + operativos,
      byGeneralCategory,
    };
  }, [summary]);

  // Renderizar formulario simplificado
  const renderSimplifiedForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Registrar Nuevo Gasto
        </CardTitle>
        <CardDescription>Completa los campos y guarda el gasto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Tipo de Gasto */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Tipo de Gasto *</Label>
          <Select 
            value={formData.expenseType}
            onValueChange={(value) => {
              setFormData(prev => ({
                ...prev,
                expenseType: value as ExpenseType,
                projectId: undefined,
                operativeCategory: undefined,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="materiales_proyecto">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Gastos de Materiales de Proyecto
                </div>
              </SelectItem>
              <SelectItem value="gasto_operativo">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Gastos Operativos
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campos condicionales para Materiales de Proyecto */}
        {formData.expenseType === "materiales_proyecto" && (
          <div className="space-y-2">
            <Label className="text-base font-semibold">Proyecto o Cliente *</Label>
            <div className="space-y-3">
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
                <SelectTrigger>
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
                <>
                  <div className="text-center text-sm text-gray-500">o</div>
                  <Input 
                    placeholder="Escribir nombre del cliente/proyecto"
                    value={formData.projectClientName || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      projectClientName: e.target.value,
                      projectId: undefined 
                    }))}
                  />
                </>
              )}

              {formData.projectId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-600 font-medium">Proyecto seleccionado:</p>
                  <p className="text-emerald-800 font-semibold">{formData.projectClientName}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-gray-500"
                    onClick={() => setFormData(prev => ({ ...prev, projectId: undefined, projectClientName: "" }))}
                  >
                    Cambiar proyecto
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campos condicionales para Gastos Operativos */}
        {formData.expenseType === "gasto_operativo" && (
          <div className="space-y-2">
            <Label className="text-base font-semibold">Categoría Operativa *</Label>
            <Select 
              value={formData.operativeCategory || ""}
              onValueChange={(value) => setFormData(prev => ({ ...prev, operativeCategory: value as OperativeCategory }))}
            >
              <SelectTrigger>
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

        {/* Descripción */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Descripción *</Label>
          <Textarea 
            placeholder="Ej: madera RH, bisagras, rieles, vidrio, transporte..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Valor (COP) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              type="number"
              placeholder="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Fecha */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Fecha *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categoría General (para compatibilidad con BD) */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Categoría General *</Label>
          <Select 
            value={formData.generalCategory}
            onValueChange={(value) => setFormData(prev => ({ ...prev, generalCategory: value as GeneralCategory }))}
          >
            <SelectTrigger>
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

        {/* Soporte (Opcional) */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Soporte (Opcional)</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {isUploading ? "Subiendo..." : "Haz clic para subir recibo/factura"}
              </p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG o PDF (máx 5MB)</p>
            </label>
          </div>
          {formData.supportFileName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Archivo subido:</p>
              <p className="text-blue-800 font-semibold">{formData.supportFileName}</p>
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline"
            onClick={resetForm}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createExpense.isPending || updateExpense.isPending}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            {editingExpenseId ? "Actualizar Gasto" : "Guardar Gasto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistema Contable Interno"
        subtitle="Gestiona los gastos de INNOVAR Cocinas"
        showBack={false}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Resumen
          </TabsTrigger>
        </TabsList>

        {/* TAB: REGISTRAR */}
        <TabsContent value="register" className="space-y-4">
          {renderSimplifiedForm()}
        </TabsContent>

        {/* TAB: HISTORIAL */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Historial de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="grid md:grid-cols-4 gap-3">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="materiales_proyecto">Materiales</SelectItem>
                    <SelectItem value="gasto_operativo">Operativos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilterPeriod} onValueChange={(v: any) => setDateFilterPeriod(v)}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                />
              </div>

              {/* Fechas personalizadas */}
              {dateFilterPeriod === "custom" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <Input 
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    placeholder="Desde"
                  />
                  <Input 
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    placeholder="Hasta"
                  />
                </div>
              )}

              {/* Resumen de filtrados */}
              <div className="grid md:grid-cols-4 gap-2">
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">Materiales</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(filteredTotals.materiales)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">Operativos</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(filteredTotals.operativos)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(filteredTotals.total)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">Registros</p>
                    <p className="text-xl font-bold text-gray-600">{filteredTotals.count}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de gastos */}
              <div className="space-y-2">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay gastos registrados con estos filtros</p>
                  </div>
                ) : (
                  filteredExpenses.map(expense => (
                    <Card key={expense.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={expense.expenseType === "materiales_proyecto" ? "default" : "secondary"}>
                                {expense.expenseType === "materiales_proyecto" ? "Materiales" : "Operativo"}
                              </Badge>
                              <span className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</span>
                            </div>
                            <p className="font-semibold">{expense.description}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {expense.projectClientName || expense.operativeCategory || "Sin proyecto"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Categoría: {GENERAL_CATEGORIES.find(c => c.value === expense.generalCategory)?.label}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">{formatCurrency(expense.amount)}</p>
                            <div className="flex gap-1 mt-2">
              {expense.supportUrl && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open(expense.supportUrl || "", "_blank")}
                >
                  <Eye className="w-4 h-4" />
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
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  if (confirm("¿Eliminar este gasto?")) {
                                    deleteExpense.mutate(expense.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
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
        </TabsContent>

        {/* TAB: RESUMEN */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Resumen por tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Resumen por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Materiales de Proyecto</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(totals.materiales)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium">Gastos Operativos</span>
                  <span className="text-lg font-bold text-purple-600">{formatCurrency(totals.operativos)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                  <span className="font-bold">TOTAL</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Resumen por categoría general */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Resumen por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(totals.byGeneralCategory).map(([category, total]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium capitalize">
                      {GENERAL_CATEGORIES.find(c => c.value === category)?.label || category}
                    </span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Resumen por proyecto */}
          {summary?.byProject && summary.byProject.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Gastos por Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.byProject.map((project: any) => (
                    <div key={project.projectId || project.projectClientName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{project.projectClientName}</span>
                      <span className="font-bold text-blue-600">{formatCurrency(project.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
