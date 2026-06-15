import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  X,
  DatabaseZap,
  Loader2,
} from "lucide-react";

// Configuración de categorías con colores e iconos
const categoryConfig: Record<string, {
  name: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
}> = {
  cocina_base: {
    name: "Cocina Base",
    icon: <ChefHat className="h-5 w-5" />,
    accentColor: "#10B981",
    iconBg: "bg-emerald-500/15 text-emerald-400"
  },
  mesones: {
    name: "Mesones",
    icon: <Layers className="h-5 w-5" />,
    accentColor: "#3B82F6",
    iconBg: "bg-blue-500/15 text-blue-400"
  },
  muebles_especiales: {
    name: "Muebles Especiales",
    icon: <Box className="h-5 w-5" />,
    accentColor: "#F59E0B",
    iconBg: "bg-amber-500/15 text-amber-400"
  },
  extras: {
    name: "Extras",
    icon: <Sparkles className="h-5 w-5" />,
    accentColor: "#A78BFA",
    iconBg: "bg-purple-500/15 text-purple-400"
  },
  puertas_tapas: {
    name: "Puertas y Tapas",
    icon: <DoorOpen className="h-5 w-5" />,
    accentColor: "#F43F5E",
    iconBg: "bg-rose-500/15 text-rose-400"
  },
  herrajes: {
    name: "Herrajes",
    icon: <Wrench className="h-5 w-5" />,
    accentColor: "#94A3B8",
    iconBg: "bg-white/[0.08] text-white/60"
  },
  closets: {
    name: "Closets",
    icon: <LayoutGrid className="h-5 w-5" />,
    accentColor: "#22D3EE",
    iconBg: "bg-cyan-500/15 text-cyan-400"
  },
  puertas_producto: {
    name: "Puertas (Producto)",
    icon: <DoorOpen className="h-5 w-5" />,
    accentColor: "#F97316",
    iconBg: "bg-orange-500/15 text-orange-400"
  },
  centros_tv: {
    name: "Centros de TV",
    icon: <Tv className="h-5 w-5" />,
    accentColor: "#6366F1",
    iconBg: "bg-indigo-500/15 text-indigo-400"
  },
  acabados_especiales: {
    name: "Acabados Especiales",
    icon: <Sparkles className="h-5 w-5" />,
    accentColor: "#14B8A6",
    iconBg: "bg-teal-500/15 text-teal-400"
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

  // Mutations
  const updatePricing = trpc.pricing.update.useMutation({
    onSuccess: () => {
      toast.success("Precio actualizado correctamente");
      refetch();
      setEditingItem(null);
      setNewValue("");
      setReason("");
      setDescriptionTemplate("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const seedDefaults = trpc.pricing.seedDefaults.useMutation({
    onSuccess: (result) => {
      toast.success(`✅ Biblioteca inicializada — ${result.created} precios creados, ${result.skipped} ya existían`);
      refetch();
    },
    onError: (error) => {
      toast.error("Error al inicializar: " + error.message);
    },
  });

  // Agrupar precios por categoría
  const pricingByCategory = allPricing?.reduce((acc, item) => {
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
    ? allPricing?.filter(item => {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        );
      }) || []
    : [];

  // Agrupar resultados de búsqueda por categoría
  const searchResultsByCategory = searchResults.reduce((acc, item) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500/20 border-t-emerald-400"></div>
      </div>
    );
  }

  // BD vacía — mostrar pantalla de inicialización
  if (!isLoading && (!allPricing || allPricing.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15">
          <DatabaseZap className="h-12 w-12 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white/85">Biblioteca de Precios vacía</h2>
          <p className="text-white/45 mt-2 max-w-md">
            La base de datos aún no tiene precios configurados. Haz clic en el botón para
            cargar todos los precios base del Motor de Cotización INNOVAR.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => seedDefaults.mutate()}
          disabled={seedDefaults.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 py-4 text-base"
        >
          {seedDefaults.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <DatabaseZap className="h-5 w-5" />
          )}
          {seedDefaults.isPending ? "Inicializando..." : "Inicializar Biblioteca de Precios"}
        </Button>
        <p className="text-xs text-white/30">
          Esto carga ~50 precios base. Después podrás ajustar cada uno individualmente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-[#162828] p-6 sm:p-8 shadow-lg border border-white/[0.06]" style={{ borderTop: "3px solid #1DB5A8" }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/15">
                <DollarSign className="h-8 w-8 text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white/90">Configuración de Precios</h1>
                <p className="text-white/45 mt-1">
                  Administra todos los precios del sistema de cotizaciones
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => seedDefaults.mutate()}
                disabled={seedDefaults.isPending}
                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] text-white/80 border border-white/[0.08]"
                title="Carga todos los precios base del catálogo INNOVAR en la BD"
              >
                {seedDefaults.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseZap className="h-4 w-4" />
                )}
                {allPricing?.length === 0 ? "Inicializar Biblioteca" : "Restaurar Precios Base"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] text-white/80 border border-white/[0.08]"
              >
                <History className="h-4 w-4" />
                Ver Historial
              </Button>
            </div>
          </div>
          
          {/* Stats rápidos */}
          <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white/[0.05] border border-white/[0.06] rounded-lg p-3 text-center" style={{ borderLeft: "3px solid #1DB5A8" }}>
              <p className="text-2xl font-bold text-white/90">{allPricing?.length || 0}</p>
              <p className="text-xs text-white/40">Precios Configurados</p>
            </div>
            <div className="bg-white/[0.05] border border-white/[0.06] rounded-lg p-3 text-center" style={{ borderLeft: "3px solid #6366F1" }}>
              <p className="text-2xl font-bold text-white/90">{categories.length}</p>
              <p className="text-xs text-white/40">Categorías</p>
            </div>
            <div className="bg-white/[0.05] border border-white/[0.06] rounded-lg p-3 text-center" style={{ borderLeft: "3px solid #F59E0B" }}>
              <p className="text-2xl font-bold text-white/90">{historyData?.length || 0}</p>
              <p className="text-xs text-white/40">Cambios Registrados</p>
            </div>
            <div className="bg-white/[0.05] border border-white/[0.06] rounded-lg p-3 text-center" style={{ borderLeft: "3px solid #22C55E" }}>
              <p className="text-2xl font-bold text-white/90">{activePricing.length}</p>
              <p className="text-xs text-white/40">En Categoría Actual</p>
            </div>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código (ej: mesón, COCINA_ML_L, pintado...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(e.target.value.trim().length > 0);
                }}
                className="w-full pl-12 pr-12 py-3 bg-white/[0.05] border-white/[0.10] text-white/85 placeholder:text-white/30 rounded-xl focus:bg-white/[0.07] focus:border-teal-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {isSearching && searchResults.length > 0 && (
              <p className="mt-2 text-sm text-white/45">
                Se encontraron <span className="font-bold">{searchResults.length}</span> resultados en <span className="font-bold">{Object.keys(searchResultsByCategory).length}</span> categorías
              </p>
            )}
            {isSearching && searchResults.length === 0 && searchQuery.trim() && (
              <p className="mt-2 text-sm text-white/45">
                No se encontraron resultados para "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Grid de categorías y contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de categorías */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 overflow-hidden shadow-lg bg-[#162828] border-white/[0.06]" style={{ borderTop: "3px solid #6366F1" }}>
              <div className="bg-[#162828] p-4 border-b border-white/[0.06]">
                <h2 className="text-white/80 font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-400" />
                  Categorías
                </h2>
              </div>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const config = categoryConfig[cat];
                    const isActive = activeCategory === cat;
                    const itemCount = pricingByCategory[cat]?.length || 0;
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                          isActive
                            ? 'bg-white/[0.07] text-white shadow-sm'
                            : 'hover:bg-white/[0.05] text-white/65 hover:text-white/85'
                        }`}
                        style={isActive ? { borderLeft: `3px solid ${config.accentColor}` } : { borderLeft: '3px solid transparent' }}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.iconBg}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {config.name}
                          </p>
                          <p className={`text-xs ${isActive ? 'text-white/55' : 'text-white/35'}`}>
                            {itemCount} {itemCount === 1 ? 'precio' : 'precios'}
                          </p>
                        </div>
                        {isActive && (
                          <ArrowRight className="h-4 w-4 text-white/50" />
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
                      <Card key={category} className="overflow-hidden border border-white/[0.06] shadow-lg bg-[#162828]" style={{ borderTop: `3px solid ${catConfig.accentColor}` }}>
                        <div className="bg-[#162828] p-4 border-b border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${catConfig.iconBg}`}>
                              {catConfig.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-white/85">{catConfig.name}</h3>
                              <p className="text-white/40 text-xs">
                                {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4 bg-[#0C1A1A]">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="group relative bg-[#162828] rounded-xl border border-white/[0.08] p-4 shadow-sm hover:bg-white/[0.03] transition-all duration-200"
                                style={{ borderLeft: `3px solid ${catConfig.accentColor}` }}
                              >
                                {item.unit && (
                                  <div className={`absolute -top-2 -right-2 ${catConfig.iconBg} text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                    {item.unit === "%" ? <Percent className="h-3 w-3" /> : null}
                                    {item.unit}
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white/85 truncate pr-8">
                                      {item.name.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                                        part.toLowerCase() === searchQuery.toLowerCase()
                                          ? <mark key={i} className="bg-yellow-400/30 text-yellow-300 px-0.5 rounded">{part}</mark>
                                          : part
                                      )}
                                    </h3>
                                    {item.description && (
                                      <p className="text-xs text-white/45 mt-1 line-clamp-2">{item.description}</p>
                                    )}
                                    <p className="text-xs text-white/30 mt-2 font-mono">
                                      {item.code.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                                        part.toLowerCase() === searchQuery.toLowerCase() 
                                          ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
                                          : part
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                  <span className="text-xl font-bold" style={{ color: catConfig.accentColor }}>
                                    {formatValue(item)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(item)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity border-white/[0.15] text-white/70 hover:text-white"
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
                  <Card className="overflow-hidden border-2 border-white/[0.08] shadow-lg bg-[#162828]">
                    <CardContent className="p-12 text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-white/30" />
                      </div>
                      <h3 className="font-semibold text-white/55 mb-2">Sin resultados</h3>
                      <p className="text-white/40 text-sm">
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
              <Card className="overflow-hidden border border-white/[0.06] shadow-lg bg-[#162828]" style={{ borderTop: `3px solid ${activeConfig.accentColor}` }}>
              {/* Header de la categoría */}
              <div className="bg-[#162828] p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${activeConfig.iconBg}`}>
                    {activeConfig.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white/90">{activeConfig.name}</h2>
                    <p className="text-white/40 text-sm">
                      {activePricing.length} {activePricing.length === 1 ? 'precio configurado' : 'precios configurados'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de precios */}
              <CardContent className="p-4 bg-[#0C1A1A]">
                {activePricing.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activePricing.map((item) => (
                      <div
                        key={item.id}
                        className="group relative bg-[#162828] rounded-xl border border-white/[0.08] p-4 shadow-sm hover:bg-white/[0.03] transition-all duration-200"
                        style={{ borderLeft: `3px solid ${activeConfig.accentColor}` }}
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
                            <h3 className="font-semibold text-white/85 truncate pr-8">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-white/45 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-xs text-white/30 mt-2 font-mono">
                              {item.code}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xl font-bold" style={{ color: activeConfig.accentColor }}>
                            {formatValue(item)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity border-white/[0.15] text-white/70 hover:text-white"
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
                    <p className="text-white/40">No hay precios configurados en esta categoría</p>
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
              <div
                className="-mx-6 -mt-6 mb-4 p-4 bg-[#162828] border-b border-white/[0.08] rounded-t-lg"
                style={{ borderTop: `3px solid ${editingItem ? (categoryConfig[editingItem.category]?.accentColor || '#1DB5A8') : '#1DB5A8'}` }}
              >
                <DialogTitle className="flex items-center gap-2 text-white/85">
                  <Edit2 className="h-5 w-5 text-white/50" />
                  Editar Precio
                </DialogTitle>
              </div>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-5">
                <div className="bg-white/[0.05] rounded-lg p-4">
                  <Label className="text-xs text-white/40 uppercase tracking-wider">Nombre del Precio</Label>
                  <p className="font-semibold text-white/85 mt-1">{editingItem.name}</p>
                  <p className="text-xs text-white/30 mt-1 font-mono">{editingItem.code}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                    <Label className="text-xs text-red-400 uppercase tracking-wider">Valor Actual</Label>
                    <p className="text-lg font-bold text-red-400 mt-1 line-through">
                      {formatValue(editingItem)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                    <Label className="text-xs text-emerald-400 uppercase tracking-wider">Nuevo Valor</Label>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
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
                    onChange={(e) => setNewValue(e.target.value)}
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
                    onChange={(e) => setReason(e.target.value)}
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
                    onChange={(e) => setDescriptionTemplate(e.target.value)}
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
              <div className="-mx-6 -mt-6 mb-4 p-4 bg-[#162828] border-b border-white/[0.08] rounded-t-lg" style={{ borderTop: "3px solid #F59E0B" }}>
                <DialogTitle className="flex items-center gap-2 text-white/85">
                  <History className="h-5 w-5 text-amber-400" />
                  Historial de Cambios de Precios
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {historyData && historyData.length > 0 ? (
                historyData.map((item: any) => {
    // @ts-ignore
                  const prevValue = parseFloat(item.previousValue);
                  const newVal = parseFloat(item.newValue);
                  const isIncrease = newVal > prevValue;
                  const percentChange = ((newVal - prevValue) / prevValue * 100).toFixed(1);
                  const config = categoryConfig[item.pricingCategory];
                  
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-white/[0.08] bg-[#162828]"
                      style={{ borderLeft: `3px solid ${config?.accentColor || '#1DB5A8'}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config?.iconBg || 'bg-white/[0.08] text-white/50'}`}>
                            {config?.icon || <Settings className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-white/85">{item.pricingName}</p>
                            <p className="text-xs text-white/40">
                              {config?.name || item.pricingCategory} • <span className="font-mono">{item.pricingCode}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                          isIncrease
                            ? "bg-red-500/15 text-red-400"
                            : "bg-green-500/15 text-green-400"
                        }`}>
                          {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isIncrease ? "+" : ""}{percentChange}%
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="text-white/35 line-through">{formatCurrency(prevValue)}</span>
                        <ArrowRight className="h-4 w-4 text-white/30" />
                        <span className="font-bold text-emerald-400">{formatCurrency(newVal)}</span>
                      </div>
                      
                      {item.reason && (
                        <p className="mt-2 text-sm text-white/55 bg-white/[0.04] rounded-lg p-2 italic">
                          "{item.reason}"
                        </p>
                      )}
                      
                      <div className="mt-3 flex items-center gap-3 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleString("es-CO")}
                        </span>
                        {item.changedByUser?.name && (
                          <span className="flex items-center gap-1">
                            • Modificado por: <span className="font-medium text-white/50">{item.changedByUser.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-white/30" />
                  </div>
                  <p className="text-white/45 font-medium">No hay cambios de precios registrados</p>
                  <p className="text-white/30 text-sm mt-1">Los cambios aparecerán aquí cuando edites un precio</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
