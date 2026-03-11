import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock,
  Tag,
  Percent,
  ArrowRight,
  Search,
  X
} from "lucide-react";

// Configuración de categorías con colores e iconos
const categoryConfig: Record<string, { 
  name: string; 
  icon: React.ReactNode; 
  gradient: string;
  bgLight: string;
  borderColor: string;
  iconBg: string;
}> = {
  cocina_base: {
    name: "Cocina Base",
    icon: <ChefHat className="h-5 w-5" />,
    gradient: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-600"
  },
  mesones: {
    name: "Mesones",
    icon: <Layers className="h-5 w-5" />,
    gradient: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100 text-blue-600"
  },
  muebles_especiales: {
    name: "Muebles Especiales",
    icon: <Box className="h-5 w-5" />,
    gradient: "from-amber-500 to-amber-600",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100 text-amber-600"
  },
  extras: {
    name: "Extras",
    icon: <Sparkles className="h-5 w-5" />,
    gradient: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
    iconBg: "bg-purple-100 text-purple-600"
  },
  puertas_tapas: {
    name: "Puertas y Tapas",
    icon: <DoorOpen className="h-5 w-5" />,
    gradient: "from-rose-500 to-rose-600",
    bgLight: "bg-rose-50",
    borderColor: "border-rose-200",
    iconBg: "bg-rose-100 text-rose-600"
  },
  herrajes: {
    name: "Herrajes",
    icon: <Wrench className="h-5 w-5" />,
    gradient: "from-slate-500 to-slate-600",
    bgLight: "bg-slate-50",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-100 text-slate-600"
  },
  closets: {
    name: "Closets",
    icon: <LayoutGrid className="h-5 w-5" />,
    gradient: "from-cyan-500 to-cyan-600",
    bgLight: "bg-cyan-50",
    borderColor: "border-cyan-200",
    iconBg: "bg-cyan-100 text-cyan-600"
  },
  puertas_producto: {
    name: "Puertas (Producto)",
    icon: <DoorOpen className="h-5 w-5" />,
    gradient: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-200",
    iconBg: "bg-orange-100 text-orange-600"
  },
  centros_tv: {
    name: "Centros de TV",
    icon: <Tv className="h-5 w-5" />,
    gradient: "from-indigo-500 to-indigo-600",
    bgLight: "bg-indigo-50",
    borderColor: "border-indigo-200",
    iconBg: "bg-indigo-100 text-indigo-600"
  },
  otros: {
    name: "Otros / Descuentos",
    icon: <Settings className="h-5 w-5" />,
    gradient: "from-gray-500 to-gray-600",
    bgLight: "bg-gray-50",
    borderColor: "border-gray-200",
    iconBg: "bg-gray-100 text-gray-600"
  },
  acabados_especiales: {
    name: "Acabados Especiales",
    icon: <Sparkles className="h-5 w-5" />,
    gradient: "from-teal-500 to-teal-600",
    bgLight: "bg-teal-50",
    borderColor: "border-teal-200",
    iconBg: "bg-teal-100 text-teal-600"
  },
};

interface PricingItem {
  id: number;
  category: string;
  code: string;
  name: string;
  description: string | null;
  descriptionTemplate: string | null;
  value: string;
  unit: string | null;
  sortOrder: number;
  active: boolean | number;
  updatedAt: Date | string;
}

interface HistoryItem {
  id: number;
  pricingConfigId: number;
  previousValue: string;
  newValue: string;
  changedBy: number;
  reason: string | null;
  createdAt: Date | string;
  pricingName: string;
  pricingCode: string;
  pricingCategory: string;
  changedByUser?: { name: string | null } | null;
}

export default function PricingConfig() {
  const [activeCategory, setActiveCategory] = useState("cocina_base");
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [descriptionTemplate, setDescriptionTemplate] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
      setDescriptionTemplate("");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Agrupar precios por categoría
  const pricingByCategory = allPricing?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    // @ts-ignore
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PricingItem[]>) || {};

  // Categorías disponibles
  const categories = Object.keys(categoryConfig);

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
    setDescriptionTemplate(item.descriptionTemplate || "");
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
      descriptionTemplate: descriptionTemplate || undefined,
    });
  };

  const activeConfig = categoryConfig[activeCategory];
  const activePricing = pricingByCategory[activeCategory] || [];

  // Filtrar precios por búsqueda
  const searchResults = searchQuery.trim() 
    ? allPricing?.filter((item: any) => {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        );
      }) || []
    : [];

  // Agrupar resultados de búsqueda por categoría
  const searchResultsByCategory = searchResults.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    // @ts-ignore
    return acc;
  }, {} as Record<string, PricingItem[]>);

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNC0yLTItNCAyLTQgMi00IDQtMiA0LTIgMi00IDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Configuración de Precios</h1>
                <p className="text-emerald-100 mt-1">
                  Administra todos los precios del sistema de cotizaciones
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
            >
              <History className="h-4 w-4" />
              Ver Historial
            </Button>
          </div>
          
          {/* Stats rápidos */}
          <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{allPricing?.length || 0}</p>
              <p className="text-xs text-emerald-100">Precios Configurados</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-emerald-100">Categorías</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{historyData?.length || 0}</p>
              <p className="text-xs text-emerald-100">Cambios Registrados</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{activePricing.length}</p>
              <p className="text-xs text-emerald-100">En Categoría Actual</p>
            </div>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-200" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código (ej: mesón, COCINA_ML_L, pintado...)"
                value={searchQuery}
                onChange={(e: any) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(e.target.value.trim().length > 0);
                }}
                className="w-full pl-12 pr-12 py-3 bg-white/20 border-white/30 text-white placeholder:text-emerald-200 rounded-xl focus:bg-white/30 focus:border-white/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {isSearching && searchResults.length > 0 && (
              <p className="mt-2 text-sm text-emerald-100">
                Se encontraron <span className="font-bold">{searchResults.length}</span> resultados en <span className="font-bold">{Object.keys(searchResultsByCategory).length}</span> categorías
              </p>
            )}
            {isSearching && searchResults.length === 0 && searchQuery.trim() && (
              <p className="mt-2 text-sm text-emerald-100">
                No se encontraron resultados para "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Grid de categorías y contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de categorías */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categorías
                </h2>
              </div>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {categories.map((cat: any) => {
                    const config = categoryConfig[cat];
                    const isActive = activeCategory === cat;
                    const itemCount = pricingByCategory[cat]?.length || 0;
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                          isActive 
                            ? `bg-gradient-to-r ${config.gradient} text-white shadow-md` 
                            : `hover:${config.bgLight} text-gray-700 hover:text-gray-900`
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isActive ? 'bg-white/20' : config.iconBg
                        }`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isActive ? 'text-white' : ''}`}>
                            {config.name}
                          </p>
                          <p className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                            {itemCount} {itemCount === 1 ? 'precio' : 'precios'}
                          </p>
                        </div>
                        {isActive && (
                          <ArrowRight className="h-4 w-4 text-white/70" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal - Lista de precios o Resultados de búsqueda */}
          <div className="lg:col-span-3">
            {/* Resultados de búsqueda */}
            {isSearching && searchQuery.trim() ? (
              <div className="space-y-6">
                {searchResults.length > 0 ? (
                  Object.entries(searchResultsByCategory).map(([category, items]) => {
                    const catConfig = categoryConfig[category];
                    return (
                      <Card key={category} className={`overflow-hidden border-2 ${catConfig.borderColor} shadow-lg`}>
                        <div className={`bg-gradient-to-r ${catConfig.gradient} p-4 text-white`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                              {catConfig.icon}
                            </div>
                            <div>
                              <h3 className="font-bold">{catConfig.name}</h3>
                              <p className="text-white/80 text-xs">
                                {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <CardContent className={`p-4 ${catConfig.bgLight}`}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {items.map((item: any) => (
                              <div
                                key={item.id}
                                className={`group relative bg-white rounded-xl border-2 ${catConfig.borderColor} p-4 shadow-sm hover:shadow-md transition-all duration-200`}
                              >
                                {item.unit && (
                                  <div className={`absolute -top-2 -right-2 ${catConfig.iconBg} text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                    {item.unit === "%" ? <Percent className="h-3 w-3" /> : null}
                                    {item.unit}
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate pr-8">
                                      {item.name.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: any, i: any) => 
                                        part.toLowerCase() === searchQuery.toLowerCase() 
                                          ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
                                          : part
                                      )}
                                    </h3>
                                    {item.description && (
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2 font-mono">
                                      {item.code.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: any, i: any) => 
                                        part.toLowerCase() === searchQuery.toLowerCase() 
                                          ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
                                          : part
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                  <span className={`text-xl font-bold bg-gradient-to-r ${catConfig.gradient} bg-clip-text text-transparent`}>
                                    {formatValue(item)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(item)}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${catConfig.borderColor}`}
                                  >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="overflow-hidden border-2 border-gray-200 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-gray-700 mb-2">Sin resultados</h3>
                      <p className="text-gray-500 text-sm">
                        No se encontraron precios que coincidan con "{searchQuery}"
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleClearSearch}
                        className="mt-4"
                      >
                        Limpiar búsqueda
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Vista normal por categoría */
              <Card className={`overflow-hidden border-2 ${activeConfig.borderColor} shadow-lg`}>
              {/* Header de la categoría */}
              <div className={`bg-gradient-to-r ${activeConfig.gradient} p-5 text-white`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    {activeConfig.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{activeConfig.name}</h2>
                    <p className="text-white/80 text-sm">
                      {activePricing.length} {activePricing.length === 1 ? 'precio configurado' : 'precios configurados'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de precios */}
              <CardContent className={`p-4 ${activeConfig.bgLight}`}>
                {activePricing.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activePricing.map((item: any) => (
                      <div
                        key={item.id}
                        className={`group relative bg-white rounded-xl border-2 ${activeConfig.borderColor} p-4 shadow-sm hover:shadow-md transition-all duration-200`}
                      >
                        {/* Badge de unidad */}
                        {item.unit && (
                          <div className={`absolute -top-2 -right-2 ${activeConfig.iconBg} text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1`}>
                            {item.unit === "%" ? <Percent className="h-3 w-3" /> : null}
                            {item.unit}
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate pr-8">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2 font-mono">
                              {item.code}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <span className={`text-xl font-bold bg-gradient-to-r ${activeConfig.gradient} bg-clip-text text-transparent`}>
                            {formatValue(item)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeConfig.borderColor} hover:${activeConfig.bgLight}`}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className={`mx-auto h-16 w-16 rounded-full ${activeConfig.iconBg} flex items-center justify-center mb-4`}>
                      {activeConfig.icon}
                    </div>
                    <p className="text-gray-500">No hay precios configurados en esta categoría</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>

        {/* Modal de edición mejorado */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className={`-mx-6 -mt-6 mb-4 p-4 bg-gradient-to-r ${editingItem ? categoryConfig[editingItem.category]?.gradient || 'from-emerald-500 to-emerald-600' : 'from-emerald-500 to-emerald-600'} text-white rounded-t-lg`}>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Edit2 className="h-5 w-5" />
                  Editar Precio
                </DialogTitle>
              </div>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-5">
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Nombre del Precio</Label>
                  <p className="font-semibold text-gray-900 mt-1">{editingItem.name}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{editingItem.code}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <Label className="text-xs text-red-600 uppercase tracking-wider">Valor Actual</Label>
                    <p className="text-lg font-bold text-red-600 mt-1 line-through">
                      {formatValue(editingItem)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <Label className="text-xs text-emerald-600 uppercase tracking-wider">Nuevo Valor</Label>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {newValue ? (editingItem.unit === "%" ? `${newValue}%` : formatCurrency(newValue)) : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newValue" className="text-sm font-medium">
                    Ingresa el nuevo valor {editingItem.unit === "%" ? "(porcentaje)" : "(COP)"}
                  </Label>
                  <Input
                    id="newValue"
                    type="number"
                    min="0"
                    step={editingItem.unit === "%" ? "0.1" : "1000"}
                    value={newValue}
                    onChange={(e: any) => setNewValue(e.target.value)}
                    className="mt-2 text-lg font-semibold"
                    placeholder={editingItem.unit === "%" ? "Ej: 30" : "Ej: 2500000"}
                  />
                </div>
                
                <div>
                  <Label htmlFor="reason" className="text-sm font-medium">
                    Razon del cambio <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e: any) => setReason(e.target.value)}
                    placeholder="Ej: Ajuste por inflacion, Promocion temporal, Actualizacion de costos..."
                    className="mt-2"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="descriptionTemplate" className="text-sm font-medium">
                    Template de Descripcion <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <Textarea
                    id="descriptionTemplate"
                    value={descriptionTemplate}
                    onChange={(e: any) => setDescriptionTemplate(e.target.value)}
                    placeholder="Descripcion tecnica que se autocompletara en cotizaciones..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updatePricing.isPending || !newValue}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePricing.isPending ? "Guardando..." : "Guardar Cambio"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de historial mejorado */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <div className="-mx-6 -mt-6 mb-4 p-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
                <DialogTitle className="flex items-center gap-2 text-white">
                  <History className="h-5 w-5" />
                  Historial de Cambios de Precios
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {historyData && historyData.length > 0 ? (
                historyData.map((item: HistoryItem) => {
    // @ts-ignore
                  const prevValue = parseFloat(item.previousValue);
                  const newVal = parseFloat(item.newValue);
                  const isIncrease = newVal > prevValue;
                  const percentChange = ((newVal - prevValue) / prevValue * 100).toFixed(1);
                  const config = categoryConfig[item.pricingCategory];
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border-2 ${config?.borderColor || 'border-gray-200'} ${config?.bgLight || 'bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config?.iconBg || 'bg-gray-100'}`}>
                            {config?.icon || <Settings className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.pricingName}</p>
                            <p className="text-xs text-gray-500">
                              {config?.name || item.pricingCategory} • <span className="font-mono">{item.pricingCode}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                          isIncrease 
                            ? "bg-red-100 text-red-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isIncrease ? "+" : ""}{percentChange}%
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="text-gray-500 line-through">{formatCurrency(prevValue)}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-bold text-emerald-600">{formatCurrency(newVal)}</span>
                      </div>
                      
                      {item.reason && (
                        <p className="mt-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2 italic">
                          "{item.reason}"
                        </p>
                      )}
                      
                      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleString("es-CO")}
                        </span>
                        {item.changedByUser?.name && (
                          <span className="flex items-center gap-1">
                            • Modificado por: <span className="font-medium text-gray-600">{item.changedByUser.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No hay cambios de precios registrados</p>
                  <p className="text-gray-400 text-sm mt-1">Los cambios aparecerán aquí cuando edites un precio</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
