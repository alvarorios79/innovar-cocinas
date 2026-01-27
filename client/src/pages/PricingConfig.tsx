import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  DollarSign, 
  Edit2, 
  History, 
  Save, 
  ChefHat, 
  Layers, 
  Box, 
  Sparkles,
  DoorOpen,
  Wrench,
  LayoutGrid,
  Tv,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";

// Mapeo de categorías a nombres legibles
const categoryNames: Record<string, string> = {
  cocina_base: "Cocina Base",
  mesones: "Mesones",
  muebles_especiales: "Muebles Especiales",
  extras: "Extras",
  puertas_tapas: "Puertas y Tapas",
  herrajes: "Herrajes",
  closets: "Closets",
  puertas_producto: "Puertas (Producto)",
  centros_tv: "Centros de TV",
  otros: "Otros / Descuentos",
};

// Iconos por categoría
const categoryIcons: Record<string, React.ReactNode> = {
  cocina_base: <ChefHat className="h-5 w-5" />,
  mesones: <Layers className="h-5 w-5" />,
  muebles_especiales: <Box className="h-5 w-5" />,
  extras: <Sparkles className="h-5 w-5" />,
  puertas_tapas: <DoorOpen className="h-5 w-5" />,
  herrajes: <Wrench className="h-5 w-5" />,
  closets: <LayoutGrid className="h-5 w-5" />,
  puertas_producto: <DoorOpen className="h-5 w-5" />,
  centros_tv: <Tv className="h-5 w-5" />,
  otros: <Settings className="h-5 w-5" />,
};

// Colores por categoría
const categoryColors: Record<string, string> = {
  cocina_base: "bg-emerald-50 border-emerald-200",
  mesones: "bg-blue-50 border-blue-200",
  muebles_especiales: "bg-amber-50 border-amber-200",
  extras: "bg-purple-50 border-purple-200",
  puertas_tapas: "bg-rose-50 border-rose-200",
  herrajes: "bg-slate-50 border-slate-200",
  closets: "bg-cyan-50 border-cyan-200",
  puertas_producto: "bg-orange-50 border-orange-200",
  centros_tv: "bg-indigo-50 border-indigo-200",
  otros: "bg-gray-50 border-gray-200",
};

interface PricingItem {
  id: number;
  category: string;
  code: string;
  name: string;
  description: string | null;
  value: string;
  unit: string | null;
  sortOrder: number;
  active: boolean;
  updatedAt: Date;
}

interface HistoryItem {
  id: number;
  pricingConfigId: number;
  previousValue: string;
  newValue: string;
  changedBy: number;
  reason: string | null;
  createdAt: Date;
  pricingName: string;
  pricingCode: string;
  pricingCategory: string;
  changedByUser?: { name: string | null } | null;
}

export default function PricingConfig() {
  const [activeTab, setActiveTab] = useState("cocina_base");
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Queries
  const { data: allPricing, isLoading, refetch } = trpc.pricing.getAll.useQuery();
  const { data: historyData } = trpc.pricing.getAllHistory.useQuery({ limit: 100 });

  // Mutation
  const updatePricing = trpc.pricing.update.useMutation({
    onSuccess: () => {
      toast.success("Precio actualizado correctamente");
      refetch();
      setEditingItem(null);
      setNewValue("");
      setReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Agrupar precios por categoría
  const pricingByCategory = allPricing?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PricingItem[]>) || {};

  // Categorías disponibles
  const categories = Object.keys(categoryNames);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatValue = (item: PricingItem) => {
    if (item.unit === "%") {
      return `${item.value}%`;
    }
    if (item.unit === "ml" && item.category === "otros") {
      return `${item.value} ml`;
    }
    return formatCurrency(item.value);
  };

  const handleEdit = (item: PricingItem) => {
    setEditingItem(item);
    setNewValue(item.value);
    setReason("");
  };

  const handleSave = () => {
    if (!editingItem) return;
    
    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("El valor debe ser un número válido mayor o igual a 0");
      return;
    }

    updatePricing.mutate({
      id: editingItem.id,
      value: numValue,
      reason: reason || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-7 w-7 text-emerald-600" />
              Configuración de Precios
            </h1>
            <p className="text-gray-500 mt-1">
              Administra los precios del sistema de cotizaciones
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Ver Historial
          </Button>
        </div>

        {/* Tabs por categoría */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 data-[state=active]:bg-white"
              >
                {categoryIcons[cat]}
                <span className="hidden sm:inline">{categoryNames[cat]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4">
              <Card className={`border-2 ${categoryColors[cat]}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {categoryIcons[cat]}
                    {categoryNames[cat]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {pricingByCategory[cat]?.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border shadow-sm gap-3"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Código: {item.code} | Unidad: {item.unit || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-emerald-600">
                            {formatValue(item)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1"
                          >
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-center py-4">
                        No hay precios configurados en esta categoría
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Modal de edición */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-emerald-600" />
                Editar Precio
              </DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Nombre</Label>
                  <p className="font-medium">{editingItem.name}</p>
                </div>
                <div>
                  <Label className="text-gray-700">Valor Actual</Label>
                  <p className="text-lg font-bold text-gray-500 line-through">
                    {formatValue(editingItem)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="newValue">Nuevo Valor {editingItem.unit === "%" ? "(%)" : "(COP)"}</Label>
                  <Input
                    id="newValue"
                    type="number"
                    min="0"
                    step={editingItem.unit === "%" ? "0.1" : "1000"}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Razón del cambio (opcional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Ajuste por inflación, Promoción temporal..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updatePricing.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePricing.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de historial */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                Historial de Cambios de Precios
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {historyData && historyData.length > 0 ? (
                historyData.map((item: HistoryItem) => {
                  const prevValue = parseFloat(item.previousValue);
                  const newVal = parseFloat(item.newValue);
                  const isIncrease = newVal > prevValue;
                  const percentChange = ((newVal - prevValue) / prevValue * 100).toFixed(1);
                  
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.pricingName}</p>
                          <p className="text-xs text-gray-500">
                            {categoryNames[item.pricingCategory]} • {item.pricingCode}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-medium ${isIncrease ? "text-red-600" : "text-green-600"}`}>
                          {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isIncrease ? "+" : ""}{percentChange}%
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-gray-500 line-through">{formatCurrency(prevValue)}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(newVal)}</span>
                      </div>
                      {item.reason && (
                        <p className="mt-1 text-xs text-gray-600 italic">"{item.reason}"</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleString("es-CO")}
                        {item.changedByUser?.name && (
                          <span>• Por: {item.changedByUser.name}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No hay cambios de precios registrados
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
