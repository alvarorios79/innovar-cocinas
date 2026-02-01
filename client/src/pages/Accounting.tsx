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
  Filter
} from "lucide-react";
// Storage upload will be handled via tRPC

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
type OperativeCategory = typeof OPERATIVE_CATEGORIES[number]["value"];

interface ExpenseFormData {
  expenseType: ExpenseType;
  projectId?: number;
  projectClientName?: string;
  operativeCategory?: OperativeCategory;
  description: string;
  amount: string;
  expenseDate: string;
  supportUrl?: string;
  supportFileName?: string;
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<"register" | "history" | "summary">("register");
  const [expenseType, setExpenseType] = useState<ExpenseType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseType: "materiales_proyecto",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "materiales_proyecto" | "gasto_operativo">("all");
  const [viewExpense, setViewExpense] = useState<any>(null);

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
    setExpenseType(null);
    setCurrentStep(0);
    setFormData({
      expenseType: "materiales_proyecto",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
    });
    setShowConfirmDialog(false);
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
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("El valor debe ser mayor a 0");
      return;
    }

    createExpense.mutate({
      expenseType: expenseType!,
      projectId: formData.projectId,
      projectClientName: formData.projectClientName,
      operativeCategory: formData.operativeCategory as any,
      description: formData.description,
      amount: parseFloat(formData.amount),
      expenseDate: formData.expenseDate,
      supportUrl: formData.supportUrl,
      supportFileName: formData.supportFileName,
    });
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

  // Calcular totales
  const totals = useMemo(() => {
    if (!summary) return { materiales: 0, operativos: 0, total: 0 };
    
    const materiales = summary.byType.find(t => t.expenseType === "materiales_proyecto")?.total || 0;
    const operativos = summary.byType.find(t => t.expenseType === "gasto_operativo")?.total || 0;
    
    return {
      materiales,
      operativos,
      total: materiales + operativos,
    };
  }, [summary]);

  // Renderizar menú inicial
  const renderMainMenu = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <Calculator className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sistema Contable Interno</h2>
        <p className="text-gray-500 mt-2">Selecciona el tipo de gasto que deseas registrar</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all"
          onClick={() => {
            setExpenseType("materiales_proyecto");
            setFormData(prev => ({ ...prev, expenseType: "materiales_proyecto" }));
            setCurrentStep(1);
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gastos de Materiales</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Para compras de materiales o servicios relacionados con un cliente o proyecto específico
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Madera</Badge>
                  <Badge variant="secondary">Bisagras</Badge>
                  <Badge variant="secondary">Rieles</Badge>
                  <Badge variant="secondary">Vidrio</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all"
          onClick={() => {
            setExpenseType("gasto_operativo");
            setFormData(prev => ({ ...prev, expenseType: "gasto_operativo" }));
            setCurrentStep(1);
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gastos Operativos</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Para gastos generales del negocio que NO pertenecen a un cliente específico
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Arriendo</Badge>
                  <Badge variant="secondary">Energía</Badge>
                  <Badge variant="secondary">Agua</Badge>
                  <Badge variant="secondary">Internet</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Renderizar formulario de materiales
  const renderMaterialsForm = () => {
    const steps = [
      { title: "Proyecto o Cliente", description: "¿Para qué cliente o proyecto es este gasto?" },
      { title: "Descripción", description: "¿Qué material o servicio se pagó?" },
      { title: "Valor", description: "¿Cuál fue el valor pagado?" },
      { title: "Fecha", description: "¿Qué fecha tiene este gasto?" },
      { title: "Soporte", description: "Sube la foto del recibo o factura" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 1 ? resetForm() : setCurrentStep(currentStep - 1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-blue-600">Gastos de Materiales</h2>
            <p className="text-sm text-gray-500">Paso {currentStep} de 5</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 flex-1 rounded-full ${i < currentStep ? "bg-blue-500" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Seleccionar Proyecto Existente</Label>
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
                </div>
                {/* Solo mostrar campo manual si NO hay proyecto seleccionado */}
                {!formData.projectId && (
                  <>
                    <div className="text-center text-gray-500">o</div>
                    <div>
                      <Label>Escribir nombre del cliente/proyecto</Label>
                      <Input 
                        placeholder="Ej: Sra. María García - Cocina"
                        value={formData.projectClientName || ""}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          projectClientName: e.target.value,
                          projectId: undefined 
                        }))}
                      />
                    </div>
                  </>
                )}
                {/* Mostrar proyecto seleccionado */}
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
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.projectId && !formData.projectClientName}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <Textarea 
                  placeholder="Ej: madera RH, bisagras, rieles, vidrio, transporte de mesón, instalación..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(3)}
                  disabled={!formData.description.trim()}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    type="number"
                    placeholder="0"
                    className="pl-10 text-2xl font-bold"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                {formData.amount && (
                  <p className="text-center text-lg text-gray-600">
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </p>
                )}
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(4)}
                  disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    type="date"
                    className="pl-10"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(5)}
                  disabled={!formData.expenseDate}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {formData.supportUrl ? (
                    <div className="space-y-2">
                      <Check className="w-12 h-12 text-green-500 mx-auto" />
                      <p className="font-medium">{formData.supportFileName}</p>
                      <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, supportUrl: undefined, supportFileName: undefined }))}>
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Haz clic para subir el soporte</p>
                      <p className="text-sm text-gray-400">JPG, PNG o PDF</p>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1" 
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    Omitir soporte
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!formData.supportUrl}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar formulario de gastos operativos
  const renderOperativeForm = () => {
    const steps = [
      { title: "Categoría", description: "¿Este gasto corresponde a qué tipo?" },
      { title: "Descripción", description: "Describe el gasto" },
      { title: "Valor", description: "¿Cuál fue el valor pagado?" },
      { title: "Fecha", description: "¿Qué fecha tiene este gasto?" },
      { title: "Soporte", description: "Sube la foto del recibo o factura" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 1 ? resetForm() : setCurrentStep(currentStep - 1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-purple-600">Gastos Operativos</h2>
            <p className="text-sm text-gray-500">Paso {currentStep} de 5</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 flex-1 rounded-full ${i < currentStep ? "bg-purple-500" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {OPERATIVE_CATEGORIES.map(cat => (
                    <Button
                      key={cat.value}
                      variant={formData.operativeCategory === cat.value ? "default" : "outline"}
                      className="h-auto py-3"
                      onClick={() => setFormData(prev => ({ ...prev, operativeCategory: cat.value }))}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.operativeCategory}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <Textarea 
                  placeholder="Ej: energía bodega enero, arreglo taladro, mantenimiento sierra..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(3)}
                  disabled={!formData.description.trim()}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    type="number"
                    placeholder="0"
                    className="pl-10 text-2xl font-bold"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                {formData.amount && (
                  <p className="text-center text-lg text-gray-600">
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </p>
                )}
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(4)}
                  disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    type="date"
                    className="pl-10"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(5)}
                  disabled={!formData.expenseDate}
                >
                  Continuar
                </Button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {formData.supportUrl ? (
                    <div className="space-y-2">
                      <Check className="w-12 h-12 text-green-500 mx-auto" />
                      <p className="font-medium">{formData.supportFileName}</p>
                      <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, supportUrl: undefined, supportFileName: undefined }))}>
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Haz clic para subir el soporte</p>
                      <p className="text-sm text-gray-400">JPG, PNG o PDF</p>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1" 
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    Omitir soporte
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!formData.supportUrl}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar historial de gastos
  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Historial de Gastos</h2>
        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los gastos</SelectItem>
            <SelectItem value="materiales_proyecto">Materiales</SelectItem>
            <SelectItem value="gasto_operativo">Operativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {expenses?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay gastos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses?.map(expense => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${expense.expenseType === "materiales_proyecto" ? "bg-blue-100" : "bg-purple-100"}`}>
                      {expense.expenseType === "materiales_proyecto" ? (
                        <Package className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Building2 className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-500">
                        {expense.expenseType === "materiales_proyecto" 
                          ? expense.projectClientName || "Proyecto"
                          : OPERATIVE_CATEGORIES.find(c => c.value === expense.operativeCategory)?.label || expense.operativeCategory
                        }
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(expense.expenseDate)} • Por {expense.createdByUser?.name || "Usuario"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                    <div className="flex gap-1 mt-2">
                      {expense.supportUrl && (
                        <Button variant="ghost" size="icon" onClick={() => setViewExpense(expense)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm("¿Estás seguro de eliminar este gasto?")) {
                            deleteExpense.mutate(expense.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Renderizar resumen
  const renderSummary = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Resumen de Gastos</h2>

      {/* Totales generales */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Materiales</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totals.materiales)}</p>
              </div>
              <Package className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Operativos</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totals.operativos)}</p>
              </div>
              <Building2 className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100">Total General</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totals.total)}</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gastos por categoría operativa */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Gastos Operativos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.byCategory.map(cat => (
                <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {OPERATIVE_CATEGORIES.find(c => c.value === cat.category)?.label || cat.category}
                    </Badge>
                    <span className="text-sm text-gray-500">{cat.count} gastos</span>
                  </div>
                  <span className="font-bold">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gastos por proyecto */}
      {summary?.byProject && summary.byProject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Gastos por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.byProject.map(proj => (
                <div key={proj.projectId || proj.projectClientName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{proj.projectClientName || `Proyecto #${proj.projectId}`}</p>
                    <p className="text-sm text-gray-500">{proj.count} gastos</p>
                  </div>
                  <span className="font-bold">{formatCurrency(proj.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="container max-w-4xl py-8">
      <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); if (v === "register") resetForm(); }}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
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

        <TabsContent value="register">
          {currentStep === 0 && renderMainMenu()}
          {expenseType === "materiales_proyecto" && currentStep > 0 && renderMaterialsForm()}
          {expenseType === "gasto_operativo" && currentStep > 0 && renderOperativeForm()}
        </TabsContent>

        <TabsContent value="history">
          {renderHistory()}
        </TabsContent>

        <TabsContent value="summary">
          {renderSummary()}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Gasto</DialogTitle>
            <DialogDescription>
              Revisa la información antes de guardar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-medium">
                  {expenseType === "materiales_proyecto" ? "Materiales de Proyecto" : "Gasto Operativo"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {expenseType === "materiales_proyecto" ? "Proyecto/Cliente" : "Categoría"}
                </p>
                <p className="font-medium">
                  {expenseType === "materiales_proyecto" 
                    ? formData.projectClientName 
                    : OPERATIVE_CATEGORIES.find(c => c.value === formData.operativeCategory)?.label
                  }
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Descripción</p>
                <p className="font-medium">{formData.description}</p>
              </div>
              <div>
                <p className="text-gray-500">Valor</p>
                <p className="font-bold text-lg text-emerald-600">
                  {formatCurrency(parseFloat(formData.amount) || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Fecha</p>
                <p className="font-medium">{formatDate(formData.expenseDate)}</p>
              </div>
              {formData.supportFileName && (
                <div className="col-span-2">
                  <p className="text-gray-500">Soporte</p>
                  <p className="font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {formData.supportFileName}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createExpense.isPending}>
              {createExpense.isPending ? "Guardando..." : "Guardar Gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver soporte */}
      <Dialog open={!!viewExpense} onOpenChange={() => setViewExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Soporte del Gasto</DialogTitle>
          </DialogHeader>
          {viewExpense?.supportUrl && (
            <div className="mt-4">
              {viewExpense.supportUrl.includes(".pdf") ? (
                <a 
                  href={viewExpense.supportUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <FileText className="w-5 h-5" />
                  Ver PDF: {viewExpense.supportFileName}
                </a>
              ) : (
                <img 
                  src={viewExpense.supportUrl} 
                  alt="Soporte" 
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
