import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { HardwareSelectorForQuotation } from "@/components/HardwareSelectorForQuotation";
import { ClosetConfigurator, ClosetConfig } from "@/components/ClosetConfigurator";
import { DoorConfigurator, DoorConfig } from "@/components/DoorConfigurator";
import { TVCenterConfigurator, TVCenterConfig } from "@/components/TVCenterConfigurator";
import { KitchenConfigurator, KitchenConfig } from "@/components/KitchenConfigurator";
import { CountertopConfigurator, CountertopConfig, defaultCountertopConfig } from "@/components/CountertopConfigurator";
import { PDFPreviewBeforeSave } from "@/components/PDFPreviewBeforeSave";
import { PDFContentEditor } from "@/components/PDFContentEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Plus, Trash2, FileText, Send, Eye, Pencil, Mail, Search, X, UserPlus, FolderPlus, ChefHat, Ruler, Package, Sofa, DoorOpen, Tv, Wrench, LayoutGrid, Calendar, User, Building2, Truck, Sparkles, CircleDollarSign, Lightbulb, Palette, Edit3, Lock, Unlock, ArrowLeft, Copy, Archive } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatters";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";
import { usePricing, getPriceFromMap } from "@/hooks/usePricing";
import { QuotationGroupCard } from "@/components/QuotationGroupCard";
import { ArchiveFilterTabs } from "@/components/ArchiveFilterTabs";
import { InitialPaymentModal } from "@/components/InitialPaymentModal";


interface HardwareSelection {
  hardwareId: number;
  name: string;
  price: string;
  quantity: number;
  subtotal: number;
}

interface AcabadosConfig {
  aluminumGlassDoors?: Array<{ height: number; width: number }>;
  ledLighting?: {
    enabled: boolean;
    meters: number;
  };
}

interface QuotationItem {
  itemNumber: number;
  itemType: string;
  description: string;
  quantity: string;
  unitPrice?: string;
  totalPrice: number;
  includesFixedCosts?: boolean;
  fixedCostsAmount?: number; // Monto de transporte e imprevistos (editable)
  kitchenConfig?: KitchenConfig;
  hardwareSelections?: HardwareSelection[];
  closetConfig?: ClosetConfig;
  doorConfig?: DoorConfig;
  tvCenterConfig?: TVCenterConfig;
  countertopConfig?: CountertopConfig;
  acabadosConfig?: AcabadosConfig;
}

export default function Quotations() {
  const utils = trpc.useUtils();
  const [location] = useLocation();
  
  // Hook para precios dinámicos desde la base de datos
  const { prices, isLoading: isPricingLoading, getPrice } = usePricing();
  const { data: allPricing } = trpc.pricing.getAll.useQuery();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [lockConfirmDialog, setLockConfirmDialog] = useState<{ open: boolean; quotationId: number | null; isLocking: boolean }>({ open: false, quotationId: null, isLocking: false });
  
  // Abrir diálogo automáticamente si viene con ?new en la URL
  useEffect(() => {
    if (location.includes("?new") || location.includes("&new")) {
      setShowCreateDialog(true);
    }
  }, [location]);
  const [editingQuotation, setEditingQuotation] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState("Alvaro Gutierrez");
  const [workType, setWorkType] = useState("");
  
  // Estados para vista previa antes de guardar
  const [previewBeforeSaveOpen, setPreviewBeforeSaveOpen] = useState(false);
  const [previewBeforeSaveUrl, setPreviewBeforeSaveUrl] = useState("");
  const [previewQuotationNumber, setPreviewQuotationNumber] = useState("");
  
  // Estados para filtros
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [archiveTab, setArchiveTab] = useState<"active" | "archived">("active");
  const [quotationPage, setQuotationPage] = useState(1);
  const QUOTATIONS_PER_PAGE = 50;
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  
  // Estados para editor de contenido PDF
  const [pdfEditorOpen, setPdfEditorOpen] = useState(false);
  const [pdfEditorQuotationId, setPdfEditorQuotationId] = useState<number | null>(null);
  const [pdfEditorItems, setPdfEditorItems] = useState<any[]>([]);
  const [pdfEditorDescriptions, setPdfEditorDescriptions] = useState<Record<number, string>>({});
  const [pdfEditorNotes, setPdfEditorNotes] = useState("");
  const [pdfEditorClientName, setPdfEditorClientName] = useState("");
  const [pdfEditorQuotationNumber, setPdfEditorQuotationNumber] = useState("");
  
  // Estados para modal de pago inicial
  const [initialPaymentModalOpen, setInitialPaymentModalOpen] = useState(false);
  const [pendingQuotationForProject, setPendingQuotationForProject] = useState<any | null>(null);
  
  // Estado para descuento
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [items, setItems] = useState<QuotationItem[]>([
    { 
      itemNumber: 1, 
      itemType: "", 
      description: "", 
      quantity: "", 
      totalPrice: 0, 
      includesFixedCosts: false,
      fixedCostsAmount: 600000, // Valor por defecto
      kitchenConfig: {
        shape: "",
        totalMeters: 0,
        includeUpperModule: false,
        upperModuleMeters: 0,
        specialModules: {
          nichoNevecon: false,
          nichoNevera: false,
          alacenaEntrepanos: false,
          alacenaHerraje: false,
          torreHornos: false,
        },
          countertop: {
            type: "",
            depthSurcharge: "none",
          },
        island: {
          enabled: false,
          meters: 0,
          countertopType: "",
          hasLaterals: false,
        },
        bar: {
          enabled: false,
          meters: 0,
          countertopType: "",
          hasLateral: false,
        },
        ledLighting: 0,
        paintedDoors: {
          enabled: false,
          upperQty: 0,
          lowerQty: 0,
          pantryQty: 0,
          drawerQty: 0,
          spiceQty: 0,
          golaQty: 0,
        },
        specialFinishes: {
          enabled: false,
          aluminumGlassDoors: [] as { id: string; height: number; width: number; squareMeters: number; extraHinges: number }[],
          ledLighting: {
            enabled: false,
            meters: 0,
          },
        },
      }
    },
  ]);

  const { data: quotationsData, isLoading } = trpc.quotations.listPaginatedGrouped.useQuery({
    page: quotationPage,
    limit: QUOTATIONS_PER_PAGE,
    status: filterStatus !== "all" ? filterStatus : undefined,
    archived: archiveTab === "archived",
  });
  const quotations = quotationsData?.data || [];
  const { data: clients = [] } = trpc.clients.list.useQuery();

  // Filtrar cotizaciones
  const filteredQuotations = quotations.filter((quot: any) => {
    // Filtro por cliente (nombre)
    if (filterClient && !quot.client?.name?.toLowerCase().includes(filterClient.toLowerCase())) {
      return false;
    }
    // Filtro por estado
    if (filterStatus !== "all" && quot.status !== filterStatus) {
      return false;
    }
    // Filtro por fecha desde
    if (filterDateFrom) {
      const quotDate = new Date(quot.createdAt);
      const fromDate = new Date(filterDateFrom);
      if (quotDate < fromDate) return false;
    }
    // Filtro por fecha hasta
    if (filterDateTo) {
      const quotDate = new Date(quot.createdAt);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      if (quotDate > toDate) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilterClient("");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters = filterClient || filterStatus !== "all" || filterDateFrom || filterDateTo;

  const createQuotation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success("Cotización creada exitosamente");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear cotización");
    },
  });

  const updateQuotation = trpc.quotations.update.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success("Cotización actualizada exitosamente");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar cotización");
    },
  });

  const updateStatus = trpc.quotations.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success("Estado actualizado");
    },
  });

  const deleteQuotation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success("Cotización eliminada");
    },
  });

  const toggleLock = trpc.quotations.toggleLock.useMutation({
    onSuccess: (data) => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generatePDF = trpc.quotations.generatePDF.useMutation({
    onSuccess: (data) => {
      // Detectar si es iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // En iOS, abrir en nueva pestana
        window.open(data.downloadUrl, '_blank');
      } else {
        // En desktop, descargar directamente
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success("PDF generado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar PDF");
    },
  });

  const sendWhatsApp = trpc.quotations.sendByWhatsApp.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      toast.success("Cotizacion enviada por WhatsApp");
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar por WhatsApp");
    },
  });

  const sendByEmail = trpc.quotations.sendByEmail.useMutation();

  const previewPDF = trpc.quotations.previewPDF.useMutation({
    onSuccess: (data) => {
      const previewUrl = `${data.downloadUrl}?preview=true`;
      setPreviewBeforeSaveUrl(previewUrl);
      setPreviewBeforeSaveOpen(true);
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar vista previa");
    },
  });

  const createProjectFromQuotation = trpc.quotations.createProject.useMutation({
    onSuccess: (data) => {
      toast.success(`Proyecto #${data.projectId} creado exitosamente`);
      utils.quotations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear el proyecto");
    },
  });

  const handleCreateProjectWithPayment = (paymentData: { amount: number; method: string }) => {
    if (!pendingQuotationForProject) return;
    createProjectFromQuotation.mutate({
      quotationId: pendingQuotationForProject.id,
      initialPayment: {
        amount: paymentData.amount,
        method: paymentData.method,
      },
    });
  };

  // Mutación para crear nueva versión de cotización
  const createVersion = trpc.quotationsVersioning.createVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Nueva versión creada exitosamente`);
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
      // Abrir la nueva versión en el editor
      handleEdit(data.newQuotationId);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear nueva versión");
    },
  });

  const handlePreviewClick = (quotationId: number, quotationNumber: string) => {
    setPreviewQuotationNumber(quotationNumber);
    previewPDF.mutate({ id: quotationId });
  };

  const handleEmailClick = async (quotationId: number, clientEmail: string, quotationNumber: string, clientName: string) => {
    if (!clientEmail) {
      toast.error("El cliente no tiene email configurado");
      return;
    }
    
    try {
      await sendByEmail.mutateAsync({ id: quotationId });
      toast.success("Cotizacion enviada correctamente");
      
      // Invalidar cache
      utils.quotations.list.invalidate();
      utils.quotations.listPaginatedGrouped.invalidate();
    } catch (error) {
      toast.error((error as any)?.message || "Error al enviar la cotizacion");
    }
  };


  // Función para abrir el editor de contenido PDF
  const handleOpenPdfEditor = async (quotationId: number) => {
    try {
      const quotationData: any = await utils.client.quotations.getById.query({ id: quotationId });
      if (quotationData) {
        const client = clients?.find(c => c.id === quotationData.clientId);
        setPdfEditorQuotationId(quotationId);
        setPdfEditorItems(quotationData.items || []);
        setPdfEditorDescriptions(quotationData.customDescriptions || {});
        setPdfEditorNotes(quotationData.generalNotes || "");
        setPdfEditorClientName(client?.name || "");
        setPdfEditorQuotationNumber(quotationData.quotationNumber || "");
        setPdfEditorOpen(true);
      }
    } catch (error) {
      toast.error("Error al cargar la cotización");
    }
  };

  // Función para guardar las descripciones del PDF
  const handleSavePdfDescriptions = async (descriptions: Record<number, string>, notes: string) => {
    if (!pdfEditorQuotationId) return;
    
    try {
      await updateQuotation.mutateAsync({
        id: pdfEditorQuotationId,
        customDescriptions: descriptions,
        generalNotes: notes,
      });
      toast.success("Descripciones guardadas exitosamente");
      setPdfEditorOpen(false);
    } catch (error) {
      toast.error("Error al guardar las descripciones");
    }
  };

  const resetForm = () => {
    setEditingQuotation(null);
    setSelectedClient(null);
    setVendorName("Alvaro Gutierrez");
    setWorkType("");
    setDiscountPercent(0);
    setItems([{ 
      itemNumber: 1, 
      itemType: "", 
      description: "", 
      quantity: "", 
      totalPrice: 0, 
      includesFixedCosts: false,
      fixedCostsAmount: 600000, // Valor por defecto
      kitchenConfig: {
        shape: "",
        totalMeters: 0,
        includeUpperModule: false,
        upperModuleMeters: 0,
        specialModules: {
          nichoNevecon: false,
          nichoNevera: false,
          alacenaEntrepanos: false,
          alacenaHerraje: false,
          torreHornos: false,
        },
        countertop: {
          type: "",
          depthSurcharge: "none",
        },
        island: {
          enabled: false,
          meters: 0,
          countertopType: "",
          hasLaterals: false,
        },
        bar: {
          enabled: false,
          meters: 0,
          countertopType: "",
          hasLateral: false,
        },
        ledLighting: 0,
        paintedDoors: {
          enabled: false,
          upperQty: 0,
          lowerQty: 0,
          pantryQty: 0,
          drawerQty: 0,
          spiceQty: 0,
          golaQty: 0,
        },
      }
    }]);
  };

  const handleEdit = async (quotationId: number) => {
    // Buscar la versión en todos los grupos
    let selectedVersion = null;
    let quotationGroup = null;
    
    for (const group of quotations) {
      const version = group.versions?.find((v: any) => v.id === quotationId);
      if (version) {
        selectedVersion = version;
        quotationGroup = group;
        break;
      }
    }
    
    if (!selectedVersion || !quotationGroup) {
      toast.error("No se encontró la versión de la cotización");
      return;
    }

    // Verificar si la cotización está bloqueada
    if (selectedVersion.isLocked) {
      toast.error("No se puede editar una cotización bloqueada. Desblóqueala primero.");
      return;
    }

    try {
      // Cargar items de la cotización usando el endpoint getById
      const quotationData: any = await new Promise((resolve, reject) => {
        utils.client.quotations.getById.query({ id: quotationId })
          .then(resolve)
          .catch(reject);
      });
      
      setEditingQuotation(quotationId);
      setSelectedClient(quotationGroup.clientId);
      setVendorName(quotationGroup.vendorName);
      setWorkType(quotationGroup.productType);
      
      // Cargar descuento si existe
      const quotationDiscount = (quotationData as any)?.discountPercent;
      setDiscountPercent(quotationDiscount ? parseFloat(quotationDiscount) : 0);
      
      // Cargar items si existen
      if (quotationData && quotationData.items && Array.isArray(quotationData.items)) {
        setItems(quotationData.items.map((item: any) => ({
          itemNumber: item.itemNumber,
          itemType: item.itemType || "",
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice || "",
          totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice,
          includesFixedCosts: item.includesFixedCosts || false,
          fixedCostsAmount: typeof item.fixedCostsAmount === 'string' ? parseFloat(item.fixedCostsAmount) : (item.fixedCostsAmount || 600000),
          hardwareSelections: item.hardwareSelections || [],
          closetConfig: item.closetConfig ? {
            type: item.closetConfig.type || "estandar",
            width: item.closetConfig.width || 0,
            height: item.closetConfig.height || 0,
            doorType: item.closetConfig.doorType || "sliding",
            squareMeters: typeof item.closetConfig.squareMeters === 'string' ? parseFloat(item.closetConfig.squareMeters) : (item.closetConfig.squareMeters || 0),
            pricePerSquareMeter: typeof item.closetConfig.pricePerSquareMeter === 'string' ? parseFloat(item.closetConfig.pricePerSquareMeter) : (item.closetConfig.pricePerSquareMeter || 750000),
            subtotal: typeof item.closetConfig.subtotal === 'string' ? parseFloat(item.closetConfig.subtotal) : (item.closetConfig.subtotal || 0),
            notes: item.closetConfig.notes || "",
          } : undefined,
          tvCenterConfig: item.tvCenterConfig ? {
            width: typeof item.tvCenterConfig.width === 'string' ? parseFloat(item.tvCenterConfig.width) : (item.tvCenterConfig.width ?? 1.60),
            basePrice: item.tvCenterConfig.basePrice ?? 2800000,
            hasHighGloss: item.tvCenterConfig.hasHighGloss ?? false,
            highGlossPrice: item.tvCenterConfig.highGlossPrice ?? 0,
            hasLedLights: item.tvCenterConfig.hasLedLights ?? false,
            ledLightsPrice: item.tvCenterConfig.ledLightsPrice ?? 0,
            floatingShelves: item.tvCenterConfig.floatingShelves ?? 2,
            extraShelvesPrice: item.tvCenterConfig.extraShelvesPrice ?? 0,
            equipmentSpaces: item.tvCenterConfig.equipmentSpaces ?? 0,
            equipmentSpacesPrice: item.tvCenterConfig.equipmentSpacesPrice ?? 0,
            includeTransport: item.tvCenterConfig.includeTransport ?? false,
            transportCost: item.tvCenterConfig.transportCost ?? 150000,
            notes: item.tvCenterConfig.notes || "",
            subtotal: item.tvCenterConfig.subtotal ?? 2800000,
          } : undefined,
          doorConfig: item.doorConfig ? {
            // Soporte para estructura antigua (puerta única) y nueva (lista de puertas)
            doors: item.doorConfig.doors && Array.isArray(item.doorConfig.doors) 
              ? item.doorConfig.doors.map((door: any) => ({
                  id: door.id || Math.random().toString(36).substr(2, 9),
                  type: door.type || "batiente",
                  widthRange: door.widthRange || "50-85",
                  width: door.width ?? 80,
                  height: door.height ?? 2.10,
                  quantity: door.quantity ?? 1,
                  hardwareColor: door.hardwareColor || "aluminio",
                  hasLintel: door.hasLintel ?? true,
                  location: door.location || "",
                  notes: door.notes || "",
                  pricePerUnit: door.pricePerUnit ?? 890000,
                  lineTotal: door.lineTotal ?? (door.pricePerUnit ?? 890000) * (door.quantity ?? 1),
                }))
              : [{
                  // Convertir estructura antigua a nueva
                  id: Math.random().toString(36).substr(2, 9),
                  type: item.doorConfig.type || "batiente",
                  widthRange: item.doorConfig.widthRange || "50-85",
                  width: item.doorConfig.width ?? 80,
                  height: item.doorConfig.height ?? 2.10,
                  quantity: item.doorConfig.quantity ?? 1,
                  hardwareColor: item.doorConfig.hardwareColor || "aluminio",
                  hasLintel: true,
                  location: "",
                  notes: "",
                  pricePerUnit: item.doorConfig.pricePerUnit ?? 890000,
                  lineTotal: (item.doorConfig.pricePerUnit ?? 890000) * (item.doorConfig.quantity ?? 1),
                }],
            subtotal: item.doorConfig.subtotal ?? 890000,
            includeTransport: item.doorConfig.includeTransport ?? false,
            transportCost: item.doorConfig.transportCost ?? 150000,
            notes: item.doorConfig.notes || "",
          } : undefined,
          countertopConfig: item.countertopConfig ? {
            mesones: item.countertopConfig.mesones || [{
              id: `meson-legacy-${Date.now()}`,
              material: (item.countertopConfig as any).material || "quarzo",
              tipo: (item.countertopConfig as any).tipo || "meson",
              metrosLineales: (item.countertopConfig as any).metrosLineales ?? 1,
              fondo: (item.countertopConfig as any).fondo ?? 60,
              precioML: (item.countertopConfig as any).precioML ?? 850000,
              incluyeLaterales: (item.countertopConfig as any).incluyeLaterales ?? false,
              incluyeRegrueso: (item.countertopConfig as any).incluyeRegrueso ?? false,
              alturaLateral: (item.countertopConfig as any).alturaLateral ?? 0,
              incluyeSalpicaderoAlto: (item.countertopConfig as any).incluyeSalpicaderoAlto ?? false,
              subtotalMeson: (item.countertopConfig as any).subtotalMeson ?? 0,
              subtotalLaterales: (item.countertopConfig as any).subtotalLaterales ?? 0,
              subtotalRegrueso: (item.countertopConfig as any).subtotalRegrueso ?? 0,
              subtotalLavaplatos: (item.countertopConfig as any).subtotalLavaplatos ?? 130000,
              subtotalSalpicaderoAlto: (item.countertopConfig as any).subtotalSalpicaderoAlto ?? 0,
              subtotal: (item.countertopConfig as any).total ?? 0,
            }],
            total: item.countertopConfig.total ?? 0,
            notes: item.countertopConfig.notes || "",
            includeTransport: item.countertopConfig.includeTransport ?? false,
            transportCost: item.countertopConfig.transportCost ?? 150000,
          } : undefined,
          kitchenConfig: item.kitchenConfig ? {
            shape: item.kitchenConfig.shape ?? "",
            totalMeters: item.kitchenConfig.totalMeters ?? 0,
            includeUpperModule: item.kitchenConfig.includeUpperModule ?? false,
            upperModuleMeters: item.kitchenConfig.upperModuleMeters ?? 0,
            specialModules: {
              nichoNevecon: item.kitchenConfig.specialModules?.nichoNevecon ?? false,
              nichoNevera: item.kitchenConfig.specialModules?.nichoNevera ?? false,
              alacenaEntrepanos: item.kitchenConfig.specialModules?.alacenaEntrepanos ?? false,
              alacenaHerraje: item.kitchenConfig.specialModules?.alacenaHerraje ?? false,
              torreHornos: item.kitchenConfig.specialModules?.torreHornos ?? false,
            },
            countertop: {
              type: item.kitchenConfig.countertop?.type ?? "",
              meters: item.kitchenConfig.countertop?.meters ?? 0,
              depthSurcharge: item.kitchenConfig.countertop?.depthSurcharge ?? "none",
            },
            island: {
              enabled: item.kitchenConfig.island?.enabled ?? false,
              meters: item.kitchenConfig.island?.meters ?? 0,
              countertopType: item.kitchenConfig.island?.countertopType ?? "",
              hasLaterals: item.kitchenConfig.island?.hasLaterals ?? false,
            },
            bar: {
              enabled: item.kitchenConfig.bar?.enabled ?? false,
              meters: item.kitchenConfig.bar?.meters ?? 0,
              countertopType: item.kitchenConfig.bar?.countertopType ?? "",
              hasLateral: item.kitchenConfig.bar?.hasLateral ?? false,
            },
            ledLighting: item.kitchenConfig.ledLighting ?? 0,
          } : {
            shape: "",
            totalMeters: 0,
            lowerCabinets: 0,
            upperCabinets: 0,
            includeUpperModule: false,
            upperModuleMeters: 0,
            specialModules: {
              nichoNevecon: false,
              nichoNevera: false,
              alacenaEntrepanos: false,
              alacenaHerraje: false,
              torreHornos: false,
            },
            countertop: {
              type: "",
              meters: 0,
              depthSurcharge: "none",
            },
            island: {
              enabled: false,
              meters: 0,
              countertopType: "",
              hasLaterals: false,
            },
            bar: {
              enabled: false,
              meters: 0,
              countertopType: "",
              hasLateral: false,
            },
            ledLighting: 0,
            paintedDoors: {
              enabled: false,
              upperQty: 0,
              lowerQty: 0,
              pantryQty: 0,
              drawerQty: 0,
              spiceQty: 0,
              golaQty: 0,
            },
          }
        })));
      }
      
      setShowCreateDialog(true);
    } catch (error) {
      toast.error("Error al cargar la cotización");
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemNumber: items.length + 1,
        itemType: "",
        description: "",
        quantity: "",
        totalPrice: 0,
        includesFixedCosts: false,
        fixedCostsAmount: 600000,
        kitchenConfig: {
          shape: "",
          totalMeters: 0,
          includeUpperModule: false,
          upperModuleMeters: 0,
          specialModules: {
            nichoNevecon: false,
            nichoNevera: false,
            alacenaEntrepanos: false,
            alacenaHerraje: false,
            torreHornos: false,
          },
          countertop: {
            type: "",
            depthSurcharge: "none",
          },
          island: {
            enabled: false,
            meters: 0,
            countertopType: "",
            hasLaterals: false,
          },
          bar: {
            enabled: false,
            meters: 0,
            countertopType: "",
            hasLateral: false,
          },
          ledLighting: 0,
          paintedDoors: {
            enabled: false,
            upperQty: 0,
            lowerQty: 0,
            pantryQty: 0,
            drawerQty: 0,
            spiceQty: 0,
            golaQty: 0,
          },
        },
        hardwareSelections: [],
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error("Debe haber al menos un ítem");
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    // Renumerar items
    newItems.forEach((item, i) => {
      item.itemNumber = i + 1;
    });
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calcular total para items "Otro" cuando cambia cantidad o precio unitario

    if (newItems[index].itemType === "otro" && (field === "quantity" || field === "unitPrice")) {
      // Obtener cantidad: si es el campo que cambió, usar el nuevo valor; si no, usar el existente
      let quantity = 0;
      if (field === "quantity") {
        // Extraer número de la cantidad (puede ser "8" o "8 unidades")
        const quantityStr = (value as string) || "";
        quantity = parseFloat(quantityStr.match(/\d+(\.\d+)?/)?.[0] || "0") || 0;
      } else {
        const quantityStr = (newItems[index].quantity as string) || "";
        quantity = parseFloat(quantityStr.match(/\d+(\.\d+)?/)?.[0] || "0") || 0;
      }
      
      // Obtener precio unitario
      let unitPrice = 0;
      if (field === "unitPrice") {
        unitPrice = parseFloat((value as string) || "0") || 0;
      } else {
        unitPrice = parseFloat((newItems[index].unitPrice as string) || "0") || 0;
      }
      
      // Calcular total
      newItems[index].totalPrice = quantity * unitPrice;
    }
    
    setItems(newItems);
  };

  const updateKitchenConfig = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const config = newItems[index].kitchenConfig!;
    
    // Actualizar campo específico usando notación de punto
    const fields = field.split('.');
    let current: any = config;
    for (let i = 0; i < fields.length - 1; i++) {
      current = current[fields[i]];
    }
    current[fields[fields.length - 1]] = value;
    
    // Autocompletar descripcion si se selecciona shape y la descripcion esta vacia
    if (field === 'shape' && (!newItems[index].description || newItems[index].description.trim() === '')) {
      const shapeToCode: Record<string, string> = {
        'L': 'COCINA_ML_L',
        'U': 'COCINA_ML_U',
        'lineal': 'COCINA_ML_LINEAL',
      };
      
      const code = shapeToCode[value];
      if (code && allPricing) {
        const pricingItem = allPricing.find((p: any) => p.code === code);
        if (pricingItem && pricingItem.descriptionTemplate) {
          newItems[index].description = pricingItem.descriptionTemplate;
        }
      }
    }
    
    // Recalcular automaticamente con el item actualizado
    calculateKitchenTotal(index, newItems);
  };

  const calculateHardwareTotal = (index: number) => {
    const item = items[index];
    if (!item.hardwareSelections || item.hardwareSelections.length === 0) {
      updateItem(index, "totalPrice", 0);
      return;
    }

    const total = item.hardwareSelections.reduce((sum, selection) => sum + selection.subtotal, 0);
    updateItem(index, "totalPrice", total);
  };

  // Función para calcular el total de acabados especiales
  const calculateAcabadosTotal = (item: QuotationItem): number => {
    let total = 0;
    const config = item.acabadosConfig;
    
    if (config) {
      // Puertas de aluminio con vidrio
      if (config.aluminumGlassDoors && config.aluminumGlassDoors.length > 0) {
        for (const door of config.aluminumGlassDoors) {
          const sqm = (door.height || 0) * (door.width || 0);
          total += sqm * getPrice('ACABADO_ALUMINIO_VIDRIO_M2');
          
          // Bisagras adicionales
          const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
          total += extraHinges * getPrice('ACABADO_BISAGRA_PAR');
        }
      }
      
      // LED para alacenas
      if (config.ledLighting?.enabled && config.ledLighting.meters > 0) {
        total += config.ledLighting.meters * getPrice('ACABADO_LED_ML');
      }
    }
    
    // Transporte e imprevistos
    if (item.includesFixedCosts) {
      total += (item.fixedCostsAmount || 600000);
    }
    
    return total;
  };

  const calculateKitchenTotal = (index: number, itemsArray: typeof items = items) => {
    const item = itemsArray[index];
    const config = item.kitchenConfig!;
    let total = 0;

    // 1. Calcular metraje resultante después de descontar muebles especiales
    // Solo aplica para cocinas completas (no para frente_pll, solo_superiores, solo_inferiores)
    let deductions = 0;
    const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas', 'solo_acabados'].includes(config.shape);
    
    if (!isSpecialShape) {
      if (config.specialModules?.nichoNevecon) deductions += 1.0; // 100cm
      if (config.specialModules?.nichoNevera) deductions += 0.75; // 75cm
      if (config.specialModules?.alacenaEntrepanos) deductions += 0.5; // 50cm
      if (config.specialModules?.alacenaHerraje) deductions += 0.5; // 50cm
      if (config.specialModules?.torreHornos) deductions += 0.7; // 70cm
    }

    const resultingMeters = Math.max(0, config.totalMeters - deductions);
    
    // 2. Muebles lineales según la forma (precios dinámicos)
    if (config.shape === 'frente_pll') {
      // Frente PLL
      total += config.totalMeters * getPrice('COCINA_ML_FRENTE_PLL');
      // Módulo superior opcional
      if (config.includeUpperModule && config.upperModuleMeters) {
        total += config.upperModuleMeters * getPrice('MUEBLE_SUPERIOR_ML');
      }
    } else if (config.shape === 'solo_superiores') {
      // Solo muebles superiores
      total += config.totalMeters * getPrice('MUEBLE_SUPERIOR_ML');
    } else if (config.shape === 'solo_inferiores') {
      // Solo muebles inferiores
      total += config.totalMeters * getPrice('MUEBLE_INFERIOR_ML');
    } else if (config.shape === 'puertas_tapas') {
      // Puertas y Tapas (solo cambio) - precios dinámicos
      const dc = (config.doorsAndCovers || {}) as any;
      total += (dc.upperDoors70 || 0) * getPrice('PUERTA_SUP_70');
      total += (dc.upperDoors90 || 0) * getPrice('PUERTA_SUP_90');
      total += (dc.upperDoors100 || 0) * getPrice('PUERTA_SUP_100');
      total += (dc.lowerDoors || 0) * getPrice('PUERTA_INF');
      total += (dc.pantryDoors || 0) * getPrice('PUERTA_ALACENA');
      total += (dc.drawerCovers || 0) * getPrice('TAPA_CAJON');
      total += (dc.smallCovers || 0) * getPrice('TAPA_PEQUENA');
    } else {
      // Cocinas completas (Lineal, L, U, etc.): inferiores + superiores
      total += resultingMeters * getPrice('MUEBLE_INFERIOR_ML');
      total += resultingMeters * getPrice('MUEBLE_SUPERIOR_ML');
    }

    // 3. Muebles especiales (para cocinas completas y puertas_tapas) - precios dinámicos
    if (!isSpecialShape || config.shape === 'puertas_tapas') {
      if (config.specialModules?.nichoNevecon) total += getPrice('NICHO_NEVECON');
      if (config.specialModules?.nichoNevera) total += getPrice('NICHO_NEVERA');
      if (config.specialModules?.alacenaEntrepanos) total += getPrice('ALACENA_ENTREPANOS');
      if (config.specialModules?.alacenaHerraje) total += getPrice('ALACENA_HERRAJE');
      if (config.specialModules?.torreHornos) total += getPrice('TORRE_HORNOS');
    }

    // 4. Mesón principal (usa metraje resultante automáticamente) - precios dinámicos
    // No aplica para solo_superiores ni puertas_tapas
    if (config.shape !== 'solo_superiores' && config.shape !== 'puertas_tapas' && config.countertop.type) {
      const basePrice = config.countertop.type === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
      let countertopPrice = basePrice;
      
      const surchargePercent = getPrice('MESON_RECARGO_FONDO') / 100;
      if (config.countertop.depthSurcharge === "30percent") {
        countertopPrice = basePrice * (1 + surchargePercent);
      } else if (config.countertop.depthSurcharge === "double") {
        countertopPrice = basePrice * 2;
      }
      
      // Usar metraje resultante automáticamente (o totalMeters para formas especiales)
      const metersForCountertop = isSpecialShape ? config.totalMeters : resultingMeters;
      total += metersForCountertop * countertopPrice;
    }

    // 5. Isla (para cocinas completas y puertas_tapas) - precios dinámicos
    if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.island.enabled && config.island.meters > 0) {
      // Muebles de isla
      total += config.island.meters * getPrice('ISLA_ML');
      
      // Mesón superior de isla
      if (config.island.countertopType) {
        const islandCountertopPrice = config.island.countertopType === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
        total += config.island.meters * islandCountertopPrice;
        
        // Laterales de isla
        if (config.island.hasLaterals) {
          total += 1.8 * islandCountertopPrice; // Lateral
          total += 0.9 * islandCountertopPrice; // Regrueso
        }
      }
    }

    // 6. Barra (para cocinas completas y puertas_tapas) - precios dinámicos
    if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.bar.enabled && config.bar.meters > 0) {
      // Muebles de barra
      total += config.bar.meters * getPrice('BARRA_ML');
      
      // Mesón superior de barra
      if (config.bar.countertopType) {
        const barCountertopPrice = config.bar.countertopType === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
        total += config.bar.meters * barCountertopPrice;
        
        // Lateral de barra
        if (config.bar.hasLateral) {
          total += 0.9 * barCountertopPrice;
        }
      }
    }

    // 7. Luz LED (no aplica para solo_inferiores ni puertas_tapas) - precio dinámico
    if (config.shape !== 'solo_inferiores' && config.shape !== 'puertas_tapas' && config.ledLighting > 0) {
      total += config.ledLighting * getPrice('LED_ML');
    }

    // 8. Pintado Puertas Alto Brillo - precios dinámicos
    if (config.paintedDoors?.enabled) {
      total += (config.paintedDoors.upperQty || 0) * getPrice('PINTADO_SUP');
      total += (config.paintedDoors.lowerQty || 0) * getPrice('PINTADO_INF');
      total += (config.paintedDoors.pantryQty || 0) * getPrice('PINTADO_ALACENA');
      total += (config.paintedDoors.drawerQty || 0) * getPrice('PINTADO_CAJON');
      total += (config.paintedDoors.spiceQty || 0) * getPrice('PINTADO_ESPECIERO');
      total += (config.paintedDoors.golaQty || 0) * getPrice('PINTADO_GOLA');
    }

    // 9. Acabados Especiales - Puertas Aluminio + Vidrio y LED Alacenas
    if (config.specialFinishes?.enabled) {
      // Puertas de aluminio + vidrio ahumado (precio desde configuración)
      if (config.specialFinishes.aluminumGlassDoors && config.specialFinishes.aluminumGlassDoors.length > 0) {
        config.specialFinishes.aluminumGlassDoors.forEach(door => {
          const sqm = door.height * door.width;
          // Bisagras adicionales: >0.8m = 1 par, >1.4m = 2 pares
          const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
          total += sqm * getPrice('ACABADO_ALUMINIO_VIDRIO_M2');
          total += extraHinges * getPrice('ACABADO_BISAGRA_PAR');
        });
      }
      // LED para alacenas (precio desde configuración)
      if (config.specialFinishes.ledLighting?.enabled && config.specialFinishes.ledLighting.meters > 0) {
        total += config.specialFinishes.ledLighting.meters * getPrice('ACABADO_LED_ML');
      }
    }

    // 10. Transporte e imprevistos - OPCIONAL (se maneja con checkbox)
    // Solo incluir si el checkbox está marcado
    if (item.includesFixedCosts) {
      total += (item.fixedCostsAmount ?? 600000);
    }

    // Actualizar total del item
    const finalItems = [...items];
    finalItems[index].totalPrice = total;
    setItems(finalItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (items.some((item) => !item.itemType)) {
      toast.error("Selecciona el tipo de producto para todos los items");
      return;
    }

    // Validar campos obligatorios según tipo de item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.itemType === "cocina") {
        // Para cocinas: validar campos específicos
        if (!item.kitchenConfig?.shape) {
          toast.error(`Item ${i + 1}: Selecciona la forma de la cocina`);
          return;
        }
        // Metraje solo requerido para formas que no sean puertas_tapas ni solo_acabados
        if (!['puertas_tapas', 'solo_acabados'].includes(item.kitchenConfig?.shape || '')) {
          if (!item.kitchenConfig?.totalMeters || item.kitchenConfig.totalMeters <= 0) {
            toast.error(`Item ${i + 1}: Ingresa el metraje total de la cocina`);
            return;
          }
        }
        // Para solo_acabados, validar que tenga al menos un acabado especial
        if (item.kitchenConfig?.shape === 'solo_acabados') {
          const sf = item.kitchenConfig?.specialFinishes;
          const hasDoors = sf?.aluminumGlassDoors && sf.aluminumGlassDoors.length > 0;
          const hasLed = sf?.ledLighting?.enabled && sf.ledLighting.meters > 0;
          if (!sf?.enabled || (!hasDoors && !hasLed)) {
            toast.error(`Item ${i + 1}: Agrega al menos una puerta de aluminio o metros de LED`);
            return;
          }
        }
        // Mesón es opcional - el cliente puede no necesitar mesón
        // (ya tiene uno o solo quiere la madera)
      } else if (item.itemType === "herrajes") {
        // Para herrajes: validar que haya al menos un herraje seleccionado
        if (!item.hardwareSelections || item.hardwareSelections.length === 0) {
          toast.error(`Item ${i + 1}: Selecciona al menos un herraje`);
          return;
        }
      } else if (item.itemType === "closet") {
        // Para closets: validar que tenga configuración
        if (!item.closetConfig || !item.closetConfig.width || !item.closetConfig.height) {
          toast.error(`Item ${i + 1}: Configura las medidas del closet`);
          return;
        }
        if (item.closetConfig.subtotal <= 0) {
          toast.error(`Item ${i + 1}: El subtotal del closet debe ser mayor a 0`);
          return;
        }
      } else if (item.itemType === "puerta") {
        // Para puertas: validar que tenga al menos una puerta configurada
        if (!item.doorConfig || !item.doorConfig.doors || item.doorConfig.doors.length === 0) {
          toast.error(`Item ${i + 1}: Agrega al menos una puerta`);
          return;
        }
        // Validar cada puerta individual
        for (let j = 0; j < item.doorConfig.doors.length; j++) {
          const door = item.doorConfig.doors[j];
          if (!door.width || door.width < 50 || door.width > 110) {
            toast.error(`Item ${i + 1}, Puerta ${j + 1}: El ancho debe estar entre 50cm y 110cm`);
            return;
          }
        }
        if (item.doorConfig.subtotal <= 0) {
          toast.error(`Item ${i + 1}: El subtotal de las puertas debe ser mayor a 0`);
          return;
        }
      } else if (item.itemType === "centro_tv") {
        // Para centro de TV: validar que tenga configuración
        if (!item.tvCenterConfig || !item.tvCenterConfig.width) {
          toast.error(`Item ${i + 1}: Configura el centro de TV`);
          return;
        }
        if (item.tvCenterConfig.subtotal <= 0) {
          toast.error(`Item ${i + 1}: El subtotal del centro de TV debe ser mayor a 0`);
          return;
        }
      } else if (item.itemType === "mesones") {
        // Para mesones: validar que tenga configuración
        if (!item.countertopConfig || !item.countertopConfig.mesones || item.countertopConfig.mesones.length === 0) {
          toast.error(`Item ${i + 1}: Configura el mesón`);
          return;
        }
        if (item.countertopConfig.total <= 0) {
          toast.error(`Item ${i + 1}: El total del mesón debe ser mayor a 0`);
          return;
        }
      } else if (item.itemType === "acabados_especiales") {
        // Para acabados especiales: validar que tenga al menos un acabado
        const config = item.acabadosConfig;
        const hasDoors = config?.aluminumGlassDoors && config.aluminumGlassDoors.length > 0;
        const hasLed = config?.ledLighting?.enabled && config.ledLighting.meters > 0;
        if (!hasDoors && !hasLed) {
          toast.error(`Item ${i + 1}: Agrega al menos una puerta de aluminio o metros de LED`);
          return;
        }
        if (item.totalPrice <= 0) {
          toast.error(`Item ${i + 1}: El total de acabados especiales debe ser mayor a 0`);
          return;
        }
      } else {
        // Para otros tipos: validar description y quantity
        if (!item.description) {
          toast.error(`Item ${i + 1}: Ingresa la descripción`);
          return;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          toast.error(`Item ${i + 1}: Ingresa la cantidad`);
          return;
        }
      }
    }

    // Recalcular totales de items de cocina antes de enviar
    const itemsWithUpdatedPrices = items.map((item, index) => {
      if (item.itemType === "cocina" && item.kitchenConfig) {
        // Asegurar que campos requeridos tengan valores para items de cocina
        const description = item.description || "Cocina integral";
        const quantity = item.quantity || "1";
        // Recalcular el total basado en la configuración actual
        const config = item.kitchenConfig;
        let total = 0;

        // Calcular metraje resultante después de descontar muebles especiales
        // Solo aplica para cocinas completas (no para frente_pll, solo_superiores, solo_inferiores)
        let deductions = 0;
        const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas', 'solo_acabados'].includes(config.shape);
        
        if (!isSpecialShape) {
          if (config.specialModules?.nichoNevecon) deductions += 1.0; // 100cm
          if (config.specialModules?.nichoNevera) deductions += 0.75; // 75cm
          if (config.specialModules?.alacenaEntrepanos) deductions += 0.5; // 50cm
          if (config.specialModules?.alacenaHerraje) deductions += 0.5; // 50cm
          if (config.specialModules?.torreHornos) deductions += 0.7; // 70cm
        }

        const resultingMeters = Math.max(0, config.totalMeters - deductions);
        
        // Muebles lineales según la forma (precios dinámicos)
        if (config.shape === 'frente_pll') {
          // Frente PLL
          total += config.totalMeters * getPrice('COCINA_ML_FRENTE_PLL');
          // Módulo superior opcional
          if (config.includeUpperModule && config.upperModuleMeters) {
            total += config.upperModuleMeters * getPrice('MUEBLE_SUPERIOR_ML');
          }
        } else if (config.shape === 'solo_superiores') {
          // Solo muebles superiores
          total += config.totalMeters * getPrice('MUEBLE_SUPERIOR_ML');
        } else if (config.shape === 'solo_inferiores') {
          // Solo muebles inferiores
          total += config.totalMeters * getPrice('MUEBLE_INFERIOR_ML');
        } else if (config.shape === 'puertas_tapas') {
          // Puertas y Tapas (solo cambio) - precios dinámicos
          const dc = (config.doorsAndCovers || {}) as any;
          total += (dc.upperDoors70 || 0) * getPrice('PUERTA_SUP_70');
          total += (dc.upperDoors90 || 0) * getPrice('PUERTA_SUP_90');
          total += (dc.upperDoors100 || 0) * getPrice('PUERTA_SUP_100');
          total += (dc.lowerDoors || 0) * getPrice('PUERTA_INF');
          total += (dc.pantryDoors || 0) * getPrice('PUERTA_ALACENA');
          total += (dc.drawerCovers || 0) * getPrice('TAPA_CAJON');
          total += (dc.smallCovers || 0) * getPrice('TAPA_PEQUENA');
        } else {
          // Cocinas completas (Lineal, L, U, etc.): inferiores + superiores
          total += resultingMeters * getPrice('MUEBLE_INFERIOR_ML');
          total += resultingMeters * getPrice('MUEBLE_SUPERIOR_ML');
        }

        // Muebles especiales (para cocinas completas y puertas_tapas) - precios dinámicos
        if (!isSpecialShape || config.shape === 'puertas_tapas') {
          if (config.specialModules?.nichoNevecon) total += getPrice('NICHO_NEVECON');
          if (config.specialModules?.nichoNevera) total += getPrice('NICHO_NEVERA');
          if (config.specialModules?.alacenaEntrepanos) total += getPrice('ALACENA_ENTREPANOS');
          if (config.specialModules?.alacenaHerraje) total += getPrice('ALACENA_HERRAJE');
          if (config.specialModules?.torreHornos) total += getPrice('TORRE_HORNOS');
        }

        // Mesón principal (usa metraje resultante automáticamente) - precios dinámicos
        // No aplica para solo_superiores ni puertas_tapas
        if (config.shape !== 'solo_superiores' && config.shape !== 'puertas_tapas' && config.countertop.type) {
          const basePrice = config.countertop.type === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
          let countertopPrice = basePrice;
          
          const surchargePercent = getPrice('MESON_RECARGO_FONDO') / 100;
          if (config.countertop.depthSurcharge === "30percent") {
            countertopPrice = basePrice * (1 + surchargePercent);
          } else if (config.countertop.depthSurcharge === "double") {
            countertopPrice = basePrice * 2;
          }
          
          // Usar metraje resultante automáticamente (o totalMeters para formas especiales)
          const metersForCountertop = isSpecialShape ? config.totalMeters : resultingMeters;
          total += metersForCountertop * countertopPrice;
        }

        // Isla (para cocinas completas y puertas_tapas) - precios dinámicos
        if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.island.enabled && config.island.meters > 0) {
          // Muebles de isla
          total += config.island.meters * getPrice('ISLA_ML');
          
          // Mesón superior de isla
          if (config.island.countertopType) {
            const islandCountertopPrice = config.island.countertopType === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
            total += config.island.meters * islandCountertopPrice;
            
            // Laterales de isla
            if (config.island.hasLaterals) {
              total += 1.8 * islandCountertopPrice; // Lateral
              total += 0.9 * islandCountertopPrice; // Regrueso
            }
          }
        }

        // Barra (para cocinas completas y puertas_tapas) - precios dinámicos
        if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.bar.enabled && config.bar.meters > 0) {
          // Muebles de barra
          total += config.bar.meters * getPrice('BARRA_ML');
          
          // Mesón superior de barra
          if (config.bar.countertopType) {
            const barCountertopPrice = config.bar.countertopType === "quarzone" ? getPrice('MESON_CUARZO') : getPrice('MESON_SINTERIZADO');
            total += config.bar.meters * barCountertopPrice;
            
            // Lateral de barra
            if (config.bar.hasLateral) {
              total += 0.9 * barCountertopPrice;
            }
          }
        }

        // Luz LED (no aplica para solo_inferiores ni puertas_tapas) - precio dinámico
        if (config.shape !== 'solo_inferiores' && config.shape !== 'puertas_tapas' && config.ledLighting > 0) {
          total += config.ledLighting * getPrice('LED_ML');
        }

        // Pintado Puertas Alto Brillo - precios dinámicos
        if (config.paintedDoors?.enabled) {
          total += (config.paintedDoors.upperQty || 0) * getPrice('PINTADO_SUP');
          total += (config.paintedDoors.lowerQty || 0) * getPrice('PINTADO_INF');
          total += (config.paintedDoors.pantryQty || 0) * getPrice('PINTADO_ALACENA');
          total += (config.paintedDoors.drawerQty || 0) * getPrice('PINTADO_CAJON');
          total += (config.paintedDoors.spiceQty || 0) * getPrice('PINTADO_ESPECIERO');
          total += (config.paintedDoors.golaQty || 0) * getPrice('PINTADO_GOLA');
        }

        // Transporte e imprevistos - OPCIONAL (se maneja con checkbox)
        // Solo incluir si el checkbox está marcado
        if (item.includesFixedCosts) {
          total += (item.fixedCostsAmount ?? 600000);
        }

        return { ...item, description, quantity, totalPrice: total, includesFixedCosts: item.includesFixedCosts };
      }
      // Para centro de TV: generar descripción automática
      if (item.itemType === "centro_tv" && item.tvCenterConfig) {
        const config = item.tvCenterConfig;
        const parts: string[] = [`Centro de TV ${config.width}m`];
        if (config.hasHighGloss) parts.push("alto brillo");
        if (config.hasLedLights) parts.push("luces LED");
        if (config.equipmentSpaces > 0) parts.push(`${config.equipmentSpaces} espacios equipos`);
        parts.push(`${config.floatingShelves} repisas`);
        const description = parts.join(", ");
        return {
          ...item,
          description,
          quantity: "1",
          totalPrice: config.subtotal,
        };
      }
      // Para mesones: generar descripción automática basada en múltiples mesones
      if (item.itemType === "mesones" && item.countertopConfig && item.countertopConfig.mesones) {
        const config = item.countertopConfig;
        const getTipoTexto = (tipo: string) => tipo === "meson" ? "Mesón" : tipo === "isla" ? "Isla" : "Barra";
        const getMaterialTexto = (material: string) => material === "quarzo" ? "Quarzo" : "Sinterizado";
        
        const descriptions = config.mesones.map((meson, idx) => {
          const parts: string[] = [`${getTipoTexto(meson.tipo)} en ${getMaterialTexto(meson.material)} ${meson.metrosLineales}ML x ${meson.fondo}cm`];
          if (meson.tipo === "isla" && meson.incluyeLaterales) parts.push("con laterales");
          if (meson.tipo === "barra" && meson.alturaLateral > 0) parts.push(`lateral ${meson.alturaLateral}cm`);
          if (meson.incluyeSalpicaderoAlto) parts.push("salpicadero alto");
          return parts.join(", ");
        });
        
        const description = descriptions.join(" + ");
        return {
          ...item,
          description,
          quantity: config.mesones.length.toString(),
          totalPrice: config.total,
        };
      }
      // Para herrajes: generar descripción automática y cantidad basada en selecciones
      if (item.itemType === "herrajes" && item.hardwareSelections && item.hardwareSelections.length > 0) {
        const description = item.hardwareSelections.map(s => `${s.name} x${s.quantity}`).join(", ");
        const totalQuantity = item.hardwareSelections.reduce((sum, s) => sum + s.quantity, 0);
        let totalPrice = item.hardwareSelections.reduce((sum, s) => sum + s.subtotal, 0);
        // Incluir transporte si está marcado (usar el monto editable)
        if (item.includesFixedCosts) {
          totalPrice += (item.fixedCostsAmount || 600000);
        }
        return { 
          ...item, 
          description, 
          quantity: totalQuantity.toString(),
          totalPrice,
          includesFixedCosts: item.includesFixedCosts,
          fixedCostsAmount: item.fixedCostsAmount
        };
      }
      // Para acabados especiales: generar descripción automática
      if (item.itemType === "acabados_especiales" && item.acabadosConfig) {
        const parts: string[] = [];
        const config = item.acabadosConfig;
        
        // Puertas de aluminio
        if (config.aluminumGlassDoors && config.aluminumGlassDoors.length > 0) {
          const totalSqm = config.aluminumGlassDoors.reduce((sum, d) => sum + (d.height * d.width), 0);
          parts.push(`Puertas aluminio+vidrio: ${config.aluminumGlassDoors.length} puerta(s) (${totalSqm.toFixed(2)} m²)`);
        }
        
        // LED
        if (config.ledLighting?.enabled && config.ledLighting.meters > 0) {
          parts.push(`LED alacenas: ${config.ledLighting.meters.toFixed(2)} ml`);
        }
        
        const description = parts.length > 0 ? parts.join(" + ") : "Acabados especiales";
        return {
          ...item,
          description,
          quantity: "1",
          totalPrice: item.totalPrice,
          includesFixedCosts: item.includesFixedCosts,
          fixedCostsAmount: item.fixedCostsAmount
        };
      }
      return item;
    });

    if (editingQuotation) {
      // Actualizar cotización existente
      updateQuotation.mutate({
        id: editingQuotation,
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "mesones" | "otro",
        discountPercent,
        items: itemsWithUpdatedPrices,
      });
    } else {
      // Crear nueva cotización
      createQuotation.mutate({
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "mesones" | "otro",
        discountPercent,
        items: itemsWithUpdatedPrices,
      });
    }
  };



  const getStatusBadge = (status: string) => {
    const badges = {
      draft: <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">Borrador</span>,
      sent: <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">Enviada</span>,
      approved: <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">Aprobada</span>,
      rejected: <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">Rechazada</span>,
    };
    return badges[status as keyof typeof badges] || status;
  };

  return (
    <div className="container mx-auto py-8">
      {/* Botón de volver atrás */}
      <Button 
        variant="ghost" 
        className="mb-4 gap-2" 
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-3">Cotizaciones</h1>
          <ArchiveFilterTabs
            activeTab={archiveTab}
            onTabChange={setArchiveTab}
            tabs={[
              { id: "active", label: "Activas" },
              { id: "archived", label: "Archivadas" },
            ]}
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="hidden sm:block">
            <CreateQuickClientDialog 
              onClientCreated={() => utils.clients.list.invalidate()}
              trigger={
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Crear Cliente Rápido
                </Button>
              }
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar Cliente</Label>
              <Input
                placeholder="Nombre del cliente..."
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Fecha Creación</Label>
              <div className="h-9 px-3 py-2 bg-muted/50 rounded border text-sm font-medium flex items-center">
                {new Date().toLocaleDateString('es-CO')}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Válida hasta</Label>
              <div className="h-9 px-3 py-2 bg-muted/50 rounded border text-sm font-medium flex items-center">
                {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  return d.toLocaleDateString('es-CO');
                })()}
                <span className="text-xs text-muted-foreground ml-1">(7 días)</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Entrega estimada</Label>
              <div className="h-9 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 flex items-center">
                {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 35);
                  return d.toLocaleDateString('es-CO');
                })()}
                <span className="text-xs text-red-500 ml-1">* Tentativa</span>
              </div>
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="h-9 w-full">
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-3">
              Mostrando {filteredQuotations.length} de {quotations.length} cotizaciones
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <p>Cargando...</p>
      ) : filteredQuotations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {hasActiveFilters ? "No hay cotizaciones que coincidan con los filtros" : "No hay cotizaciones creadas"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(() => {
            console.log("[DIAGNOSTICO] quotations.length:", quotations.length);
            console.log("[DIAGNOSTICO] filteredQuotations.length:", filteredQuotations.length);
            console.log("[DIAGNOSTICO] filteredQuotations:", filteredQuotations);
            return null;
          })()}
          {filteredQuotations.map((group: any) => (
            <QuotationGroupCard
              key={group.baseQuotationId}
              group={group}
              client={group.client}
              archiveTab={archiveTab}
              onEdit={(quotation) => handleEdit(quotation.id)}
              onViewPDF={(quotation) => handlePreviewClick(quotation.id, `${group.quotationNumber} - ${group.client?.name || 'Cliente'}`)}
              onSend={(quotation) => handleEmailClick(quotation.id, group.client?.email || "", group.quotationNumber, group.client?.name || "Cliente")}
              onCreateVersion={(quotation) => {
                if (window.confirm(`¿Crear nueva versión de la cotización ${group.quotationNumber}?`)) {
                  createVersion.mutate({ quotationId: quotation.id });
                }
              }}
              onCreateProject={(quotation) => {
                setPendingQuotationForProject(quotation);
                setInitialPaymentModalOpen(true);
              }}
              onEditPDF={(quotation) => handleOpenPdfEditor(quotation.id)}
              onToggleLock={(quotation) => {
                toggleLock.mutate({ id: quotation.id });
              }}
              onArchive={() => {
                utils.quotations.listPaginatedGrouped.invalidate();
              }}
              onDelete={(quotation) => {
                if (window.confirm(`¿Eliminar la cotización ${group.quotationNumber}?\n\nEsta acción no se puede deshacer.`)) {
                  deleteQuotation.mutate({ id: quotation.id });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* LEGACY CODE - KEPT FOR REFERENCE */}
      {false && (
        <div className="grid gap-4">
          {filteredQuotations.map((quot: any) => (
            <Card key={quot.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{quot.quotationNumber} - {quot.client?.name}</CardTitle>
                      {quot.versionNumber > 1 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">V{quot.versionNumber}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quot.productType === "cocina" ? "Cocina Integral" : 
                       quot.productType === "closet" ? "Closet" :
                       quot.productType === "puerta" ? "Puertas" :
                       quot.productType === "centro_tv" ? "Centro de TV" :
                       quot.productType === "herrajes" ? "Herrajes" :
                       quot.productType === "mesones" ? "Mesones" : "Otro"}
                    </p>
                  </div>
                  {getStatusBadge(quot.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Vendedor:</span> {quot.vendorName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Producto:</span> {quot.productType}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(quot.total)}
                  </p>
                  {/* Fechas de la cotización */}
                  <div className="grid grid-cols-3 gap-2 mt-3 p-2 bg-muted/50 rounded text-xs">
                    <div>
                      <span className="text-muted-foreground block">Creación</span>
                      <span className="font-medium">
                        {new Date(quot.createdAt).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Válida hasta</span>
                      <span className="font-medium">
                        {quot.validUntil ? new Date(quot.validUntil).toLocaleDateString("es-CO") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Entrega est.</span>
                      <span className="font-medium text-red-600">
                        {new Date(new Date(quot.createdAt).getTime() + 35 * 24 * 60 * 60 * 1000).toLocaleDateString("es-CO")}
                      </span>
                      <span className="block text-red-500 text-[10px]">* Tentativa</span>
                    </div>
                  </div>
                </div>



                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewClick(quot.id, `${quot.quotationNumber} - ${quot.client?.name || 'Cliente'}`)}
                    disabled={previewPDF.isPending}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Vista Previa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePDF.mutate({ id: quot.id })}
                    disabled={generatePDF.isPending}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(quot.id)}
                    disabled={quot.isLocked}
                    title={quot.isLocked ? "Cotización bloqueada - no se puede editar" : "Editar cotización"}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      if (quot.isLocked) {
                        toast.error("No se puede editar el contenido PDF de una cotización bloqueada. Desblóqueala primero.");
                        return;
                      }
                      handleOpenPdfEditor(quot.id);
                    }}
                    disabled={quot.isLocked}
                    title={quot.isLocked ? "Cotización bloqueada - no se puede editar contenido" : "Editar contenido del PDF"}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Contenido PDF
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEmailClick(quot.id, quot.client?.email || "", quot.quotationNumber, quot.client?.name || "Cliente")}
                    disabled={generatePDF.isPending || !quot.client?.email}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Enviar Email
                  </Button>


                  <Button className="bg-red-500 text-white">TEST</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* END LEGACY CODE */}

      {/* Dialog para crear cotización */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-0">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] p-4 sm:p-6 rounded-t-lg relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 sm:right-4 sm:top-4 text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setShowCreateDialog(false)}
              title="Cerrar (ESC)"
            >
              ✕
            </Button>
            <DialogHeader>
              <DialogTitle className="text-white text-lg sm:text-xl flex items-center gap-2 sm:gap-3 pr-8">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                {editingQuotation ? "Editar Cotización" : "Nueva Cotización"}
              </DialogTitle>
              <p className="text-white/80 text-xs sm:text-sm mt-1">Complete los datos para generar la cotización</p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            {/* Sección: Información General */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3 sm:mb-4">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-[oklch(0.72_0.14_180)]" />
                Información General
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Cliente
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedClient?.toString() || ""}
                      onValueChange={(value) => setSelectedClient(parseInt(value))}
                    >
                      <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-[oklch(0.72_0.14_180)] transition-colors">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <CreateQuickClientDialog
                      trigger={
                        <Button type="button" variant="outline" size="icon" title="Crear nuevo cliente" className="border-[oklch(0.72_0.14_180)] text-[oklch(0.72_0.14_180)] hover:bg-[oklch(0.72_0.14_180)] hover:text-white transition-colors">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      }
                      onClientCreated={(client) => {
                        utils.clients.list.invalidate();
                        setSelectedClient(client.id);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Vendedor
                  </Label>
                  <Select value={vendorName} onValueChange={setVendorName}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-[oklch(0.72_0.14_180)] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alvaro Gutierrez">
                        Alvaro Gutierrez
                      </SelectItem>
                      <SelectItem value="Martha Serna">Martha Serna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sección: Fechas */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-blue-200 dark:border-blue-800 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3 sm:mb-4">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Fechas de la Cotización
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <Label className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Creación</Label>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-amber-100 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                    </div>
                    <Label className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Validez</Label>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const validUntil = new Date();
                      validUntil.setDate(validUntil.getDate() + 7);
                      return validUntil.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    })()}
                  </p>
                  <span className="text-xs text-amber-600 dark:text-amber-400">7 días</span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                    </div>
                    <Label className="text-[10px] sm:text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Entrega Est.</Label>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const COLOMBIA_HOLIDAYS_2025 = [
                        '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
                        '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-20',
                        '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17',
                        '2025-12-08', '2025-12-25'
                      ];
                      const COLOMBIA_HOLIDAYS_2026 = [
                        '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
                        '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
                        '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
                        '2026-11-16', '2026-12-08', '2026-12-25'
                      ];
                      const holidays = [...COLOMBIA_HOLIDAYS_2025, ...COLOMBIA_HOLIDAYS_2026];
                      let date = new Date();
                      let businessDays = 0;
                      while (businessDays < 25) {
                        date.setDate(date.getDate() + 1);
                        const dayOfWeek = date.getDay();
                        const dateStr = date.toISOString().split('T')[0];
                        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
                          businessDays++;
                        }
                      }
                      return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    })()}
                  </p>
                  <span className="text-xs text-red-500">* Tentativa (25 días hábiles)</span>
                </div>
              </div>
            </div>

            {/* Sección: Productos */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  Productos a Cotizar
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addItem}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Agregar Producto
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {/* Header del Item */}
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                          {item.itemNumber}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm sm:text-base">
                          {item.itemType === 'cocina' ? 'Cocina Integral' : 
                           item.itemType === 'closet' ? 'Closet' :
                           item.itemType === 'puerta' ? 'Puerta' :
                           item.itemType === 'centro_tv' ? 'Centro de TV' :
                           item.itemType === 'mesones' ? 'Mesones' :
                           item.itemType === 'herrajes' ? 'Herrajes' :
                           item.itemType === 'otro' ? 'Otro' : 'Nuevo Producto'}
                        </span>
                        {item.totalPrice > 0 && (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 px-2 py-1 rounded">
                            {formatPrice(item.totalPrice)}
                          </span>
                        )}
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <div className="grid gap-3 sm:gap-4">
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-1 sm:mb-2">
                            <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
                            Tipo de Producto
                          </Label>
                          <Select 
                            value={item.itemType} 
                            onValueChange={(value) => {
                              updateItem(index, "itemType", value);
                            }}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition-colors">
                              <SelectValue placeholder="Selecciona el tipo de producto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cocina">
                                <span className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-orange-500" /> Cocina Integral</span>
                              </SelectItem>
                              <SelectItem value="closet">
                                <span className="flex items-center gap-2"><Sofa className="h-4 w-4 text-purple-500" /> Closet</span>
                              </SelectItem>
                              <SelectItem value="puerta">
                                <span className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-amber-500" /> Puerta</span>
                              </SelectItem>
                              <SelectItem value="centro_tv">
                                <span className="flex items-center gap-2"><Tv className="h-4 w-4 text-blue-500" /> Centro de TV</span>
                              </SelectItem>
                              <SelectItem value="mesones">
                                <span className="flex items-center gap-2"><Ruler className="h-4 w-4 text-slate-500" /> Mesones</span>
                              </SelectItem>
                              <SelectItem value="herrajes">
                                <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-gray-500" /> Herrajes</span>
                              </SelectItem>
                              <SelectItem value="acabados_especiales">
                                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-500" /> Acabados Especiales</span>
                              </SelectItem>
                              <SelectItem value="otro">
                                <span className="flex items-center gap-2"><Package className="h-4 w-4 text-teal-500" /> Otro</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos dinámicos para COCINA */}
                        {item.itemType === "cocina" && (
                          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg sm:rounded-xl border border-orange-200 dark:border-orange-800">
                            <h3 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200 flex items-center gap-2">
                              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                              Configuración de Cocina Integral
                            </h3>
                            
                            {/* 1. Forma */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">Forma de la Cocina</Label>
                              <Select 
                                value={item.kitchenConfig?.shape || ""} 
                                onValueChange={(value) => updateKitchenConfig(index, "shape", value)}
                              >
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-orange-400 transition-colors">
                                  <SelectValue placeholder="Selecciona la forma" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L">Cocina Estándar</SelectItem>
                                  <SelectItem value="U">Cocina Premium</SelectItem>
                                  <SelectItem value="lineal">Cocina Deluxe</SelectItem>
                                  <SelectItem value="frente_pll">Frente PLL ($650,000/ml)</SelectItem>
                                  <SelectItem value="solo_superiores">Solo Muebles Superiores ($900,000/ml)</SelectItem>
                                  <SelectItem value="solo_inferiores">Solo Muebles Inferiores ($900,000/ml)</SelectItem>
                                  <SelectItem value="puertas_tapas">Puertas y Tapas (solo cambio)</SelectItem>
                                  <SelectItem value="solo_acabados">Solo Acabados Especiales (Aluminio/Vidrio/LED)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 2. Metraje total - No aplica para puertas_tapas ni solo_acabados */}
                            {!['puertas_tapas', 'solo_acabados'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <Ruler className="h-4 w-4" />
                                Metraje Total {item.kitchenConfig?.shape === 'frente_pll' ? 'del Frente PLL' : item.kitchenConfig?.shape === 'solo_superiores' ? 'Muebles Superiores' : item.kitchenConfig?.shape === 'solo_inferiores' ? 'Muebles Inferiores' : 'de la Cocina'} (ml)
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.kitchenConfig?.totalMeters || ""}
                                onChange={(e) => updateKitchenConfig(index, "totalMeters", parseFloat(e.target.value) || 0)}
                                placeholder="Ej: 5.00"
                                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-orange-400 transition-colors"
                              />
                            </div>
                            )}

                            {/* Checkbox módulo superior para Frente PLL */}
                            {item.kitchenConfig?.shape === 'frente_pll' && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`includeUpperModule-${index}`}
                                    checked={item.kitchenConfig?.includeUpperModule || false}
                                    onChange={(e) => updateKitchenConfig(index, "includeUpperModule", e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`includeUpperModule-${index}`} className="text-sm font-medium cursor-pointer">
                                    Incluir Módulo Superior (+$750,000/ml)
                                  </Label>
                                </div>
                                {item.kitchenConfig?.includeUpperModule && (
                                  <div className="mt-2">
                                    <Label className="text-sm">Metraje Módulo Superior (ml)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="Ej: 3.50"
                                      value={item.kitchenConfig?.upperModuleMeters || ''}
                                      onChange={(e) => updateKitchenConfig(index, "upperModuleMeters", parseFloat(e.target.value) || 0)}
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-amber-700 mt-1">Ingrese los metros lineales del módulo superior (puede ser diferente al frente)</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Sección Puertas y Tapas */}
                            {item.kitchenConfig?.shape === 'puertas_tapas' && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                                  <span>🚪</span> Puertas y Tapas (Solo Cambio)
                                </h4>
                                
                                {/* Puertas Superiores */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-purple-700">Puertas Superiores</Label>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <Label className="text-xs">Hasta 70cm ($120,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.upperDoors70 || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, upperDoors70: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Hasta 90cm ($150,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.upperDoors90 || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, upperDoors90: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Más de 100cm ($180,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.upperDoors100 || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, upperDoors100: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Puertas Inferiores y de Alacena */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-purple-700">Puertas Inferiores y Alacena</Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Puertas Inferiores ($150,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.lowerDoors || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, lowerDoors: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Puertas de Alacena ($180,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.pantryDoors || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, pantryDoors: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Tapas */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-purple-700">Tapas</Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Tapas de Cajón ($90,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.drawerCovers || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, drawerCovers: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Pequeñas y demás ($45,000)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={item.kitchenConfig?.doorsAndCovers?.smallCovers || ''}
                                        onChange={(e) => {
                                          const current = item.kitchenConfig?.doorsAndCovers || {};
                                          updateKitchenConfig(index, "doorsAndCovers", { ...current, smallCovers: parseInt(e.target.value) || 0 });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Resumen de Puertas y Tapas */}
                                {(() => {
                                  const dc = item.kitchenConfig?.doorsAndCovers || {} as any;
                                  const total = 
                                    (dc.upperDoors70 || 0) * 120000 +
                                    (dc.upperDoors90 || 0) * 150000 +
                                    (dc.upperDoors100 || 0) * 180000 +
                                    (dc.lowerDoors || 0) * 150000 +
                                    (dc.pantryDoors || 0) * 180000 +
                                    (dc.drawerCovers || 0) * 90000 +
                                    (dc.smallCovers || 0) * 45000;
                                  const hasItems = total > 0;
                                  return hasItems ? (
                                    <div className="bg-purple-100 rounded p-3 mt-2">
                                      <p className="text-sm font-semibold text-purple-800">Total Puertas y Tapas: ${total.toLocaleString('es-CO')}</p>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            )}

                            {/* 3. Muebles especiales - Para cocinas completas y puertas_tapas */}
                            {!['frente_pll', 'solo_superiores', 'solo_inferiores'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-orange-100 dark:border-orange-900">
                              <Label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                                Muebles Especiales (se descuentan del metraje)
                              </Label>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`nichoNevecon-${index}`}
                                    checked={item.kitchenConfig?.specialModules.nichoNevecon || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.nichoNevecon", e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5"
                                  />
                                  <Label htmlFor={`nichoNevecon-${index}`} className="text-xs sm:text-sm font-normal cursor-pointer leading-tight">
                                    Nicho nevecon (100cm) - $1,200,000
                                  </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`nichoNevera-${index}`}
                                    checked={item.kitchenConfig?.specialModules.nichoNevera || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.nichoNevera", e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5"
                                  />
                                  <Label htmlFor={`nichoNevera-${index}`} className="text-xs sm:text-sm font-normal cursor-pointer leading-tight">
                                    Nicho nevera estándar (75cm) - $1,200,000
                                  </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`alacenaEntrepanos-${index}`}
                                    checked={item.kitchenConfig?.specialModules.alacenaEntrepanos || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.alacenaEntrepanos", e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5"
                                  />
                                  <Label htmlFor={`alacenaEntrepanos-${index}`} className="text-xs sm:text-sm font-normal cursor-pointer leading-tight">
                                    Alacena entrepaños (50cm) - $1,250,000
                                  </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`alacenaHerraje-${index}`}
                                    checked={item.kitchenConfig?.specialModules.alacenaHerraje || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.alacenaHerraje", e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5"
                                  />
                                  <Label htmlFor={`alacenaHerraje-${index}`} className="text-xs sm:text-sm font-normal cursor-pointer leading-tight">
                                    Alacena herraje (50cm) - $900,000
                                  </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`torreHornos-${index}`}
                                    checked={item.kitchenConfig?.specialModules.torreHornos || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.torreHornos", e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5"
                                  />
                                  <Label htmlFor={`torreHornos-${index}`} className="text-xs sm:text-sm font-normal cursor-pointer leading-tight">
                                    Torre hornos (70cm) - $1,350,000
                                  </Label>
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Mostrar metraje resultante y muebles - Solo para cocinas completas */}
                            {!['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="p-3 bg-blue-50 rounded space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">Metraje resultante:</span>{" "}
                                {(() => {
                                  const config = item.kitchenConfig;
                                  if (!config) return "0.00";
                                  let deductions = 0;
                                  if (config.specialModules.nichoNevecon) deductions += 1.0;
                                  if (config.specialModules.nichoNevera) deductions += 0.75;
                                  if (config.specialModules.alacenaEntrepanos) deductions += 0.5;
                                  if (config.specialModules.alacenaHerraje) deductions += 0.5;
                                  if (config.specialModules.torreHornos) deductions += 0.7;
                                  return Math.max(0, config.totalMeters - deductions).toFixed(2);
                                })()} ml
                              </p>
                              <p className="text-sm text-gray-600">
                                • Muebles Inferiores: {(() => {
                                  const config = item.kitchenConfig;
                                  if (!config || !config.specialModules) return "0.00";
                                  let deductions = 0;
                                  if (config.specialModules.nichoNevecon) deductions += 1.0;
                                  if (config.specialModules.nichoNevera) deductions += 0.75;
                                  if (config.specialModules.alacenaEntrepanos) deductions += 0.5;
                                  if (config.specialModules.alacenaHerraje) deductions += 0.5;
                                  if (config.specialModules.torreHornos) deductions += 0.7;
                                  return Math.max(0, config.totalMeters - deductions).toFixed(2);
                                })()} ml
                              </p>
                              <p className="text-sm text-gray-600">
                                • Muebles Superiores: {(() => {
                                  const config = item.kitchenConfig;
                                  if (!config || !config.specialModules) return "0.00";
                                  let deductions = 0;
                                  if (config.specialModules.nichoNevecon) deductions += 1.0;
                                  if (config.specialModules.nichoNevera) deductions += 0.75;
                                  if (config.specialModules.alacenaEntrepanos) deductions += 0.5;
                                  if (config.specialModules.alacenaHerraje) deductions += 0.5;
                                  if (config.specialModules.torreHornos) deductions += 0.7;
                                  return Math.max(0, config.totalMeters - deductions).toFixed(2);
                                })()} ml
                              </p>
                            </div>
                            )}

                            {/* 4. Mesón principal - Solo para cocinas completas y solo_inferiores */}
                            {!['solo_superiores', 'puertas_tapas'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-orange-100 dark:border-orange-900 space-y-2 sm:space-y-3">
                              <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Ruler className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                                Mesón Principal
                              </Label>
                              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                <div>
                                  <Label>Tipo de Mesón *</Label>
                                  <Select 
                                    value={item.kitchenConfig?.countertop.type || ""} 
                                    onValueChange={(value) => updateKitchenConfig(index, "countertop.type", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="quarzone">Quarzone ($850k/ml)</SelectItem>
                                      <SelectItem value="sinterizado">Sinterizado ($1.2M/ml)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Recargo por Fondo</Label>
                                  <Select 
                                    value={item.kitchenConfig?.countertop.depthSurcharge || "none"} 
                                    onValueChange={(value) => updateKitchenConfig(index, "countertop.depthSurcharge", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sin recargo (≤60cm)</SelectItem>
                                      <SelectItem value="30percent">+30% (61-90cm)</SelectItem>
                                      <SelectItem value="double">×2 (91-120cm)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            )}

                            {/* 5. Isla - Para cocinas completas y puertas_tapas */}
                            {!['frente_pll', 'solo_superiores', 'solo_inferiores'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-blue-100 dark:border-blue-900 space-y-2 sm:space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`islandEnabled-${index}`}
                                  checked={item.kitchenConfig?.island.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "island.enabled", e.target.checked)}
                                  className="h-4 w-4 accent-blue-500"
                                />
                                <Label htmlFor={`islandEnabled-${index}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                                  Isla
                                </Label>
                              </div>
                              
                              {item.kitchenConfig?.island.enabled && (
                                <div className="pl-4 sm:pl-6 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <Label>Metros de isla (ml)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.kitchenConfig?.island.meters || ""}
                                        onChange={(e) => updateKitchenConfig(index, "island.meters", parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div>
                                      <Label>Tipo de mesón</Label>
                                      <Select 
                                        value={item.kitchenConfig?.island.countertopType || ""} 
                                        onValueChange={(value) => updateKitchenConfig(index, "island.countertopType", value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="quarzone">Quarzone</SelectItem>
                                          <SelectItem value="sinterizado">Sinterizado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`islandLaterals-${index}`}
                                      checked={item.kitchenConfig?.island.hasLaterals || false}
                                      onChange={(e) => updateKitchenConfig(index, "island.hasLaterals", e.target.checked)}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`islandLaterals-${index}`} className="text-sm font-normal cursor-pointer">
                                      Incluir laterales (+1.80ml lateral + 0.90ml regrueso)
                                    </Label>
                                  </div>
                                </div>
                              )}
                            </div>
                            )}

                            {/* 6. Barra - Para cocinas completas y puertas_tapas */}
                            {!['frente_pll', 'solo_superiores', 'solo_inferiores'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-purple-100 dark:border-purple-900 space-y-2 sm:space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`barEnabled-${index}`}
                                  checked={item.kitchenConfig?.bar.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "bar.enabled", e.target.checked)}
                                  className="h-4 w-4 accent-purple-500"
                                />
                                <Label htmlFor={`barEnabled-${index}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Ruler className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                                  Barra
                                </Label>
                              </div>
                              
                              {item.kitchenConfig?.bar.enabled && (
                                <div className="pl-4 sm:pl-6 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <Label>Metros de barra (ml)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.kitchenConfig?.bar.meters || ""}
                                        onChange={(e) => updateKitchenConfig(index, "bar.meters", parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div>
                                      <Label>Tipo de mesón</Label>
                                      <Select 
                                        value={item.kitchenConfig?.bar.countertopType || ""} 
                                        onValueChange={(value) => updateKitchenConfig(index, "bar.countertopType", value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="quarzone">Quarzone</SelectItem>
                                          <SelectItem value="sinterizado">Sinterizado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`barLateral-${index}`}
                                      checked={item.kitchenConfig?.bar.hasLateral || false}
                                      onChange={(e) => updateKitchenConfig(index, "bar.hasLateral", e.target.checked)}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`barLateral-${index}`} className="text-sm font-normal cursor-pointer">
                                      Incluir lateral (+0.90ml fijo)
                                    </Label>
                                  </div>
                                </div>
                              )}
                            </div>
                            )}

                            {/* 7. Luz LED (opcional) - Solo para cocinas completas, frente_pll y solo_superiores */}
                            {!['solo_inferiores', 'puertas_tapas'].includes(item.kitchenConfig?.shape || '') && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-yellow-100 dark:border-yellow-900 space-y-2">
                              <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                                Luz LED - $180,000/ml
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.kitchenConfig?.ledLighting || ""}
                                onChange={(e) => updateKitchenConfig(index, "ledLighting", parseFloat(e.target.value) || 0)}
                                placeholder="Dejar en 0 si no lleva LED"
                                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                              />
                            </div>
                            )}

                            {/* 8. Pintado Puertas Alto Brillo */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-pink-200 dark:border-pink-900 space-y-2 sm:space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`paintedDoors-${index}`}
                                  checked={item.kitchenConfig?.paintedDoors?.enabled || false}
                                  onChange={(e) => {
                                    updateKitchenConfig(index, "paintedDoors.enabled", e.target.checked);
                                    calculateKitchenTotal(index);
                                  }}
                                  className="h-4 w-4 accent-pink-500"
                                />
                                <Label htmlFor={`paintedDoors-${index}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Palette className="h-3 w-3 sm:h-4 sm:w-4 text-pink-500" />
                                  Pintado Puertas Alto Brillo
                                </Label>
                              </div>
                              {item.kitchenConfig?.paintedDoors?.enabled && (
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                  <div>
                                    <Label className="text-xs text-pink-700">Puertas Superiores ($120,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.upperQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.upperQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-pink-700">Puertas Inferiores ($150,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.lowerQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.lowerQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-pink-700">Puertas Alacena ($250,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.pantryQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.pantryQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-pink-700">Tapas Cajón ($80,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.drawerQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.drawerQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-pink-700">Tapa Especiero ($100,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.spiceQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.spiceQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-pink-700">Tapas Pequeña/Gola ($45,000)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.kitchenConfig?.paintedDoors?.golaQty || ""}
                                      onChange={(e) => {
                                        updateKitchenConfig(index, "paintedDoors.golaQty", parseInt(e.target.value) || 0);
                                        calculateKitchenTotal(index);
                                      }}
                                      placeholder="0"
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 9. Acabados Especiales - Puertas Aluminio + Vidrio y LED Alacenas */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-900 space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`specialFinishes-${index}`}
                                  checked={item.kitchenConfig?.specialFinishes?.enabled || false}
                                  onChange={(e) => {
                                    updateKitchenConfig(index, "specialFinishes.enabled", e.target.checked);
                                    calculateKitchenTotal(index);
                                  }}
                                  className="h-4 w-4 accent-purple-500"
                                />
                                <Label htmlFor={`specialFinishes-${index}`} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                                  Acabados Especiales (Aluminio + Vidrio / LED Alacenas)
                                </Label>
                              </div>
                              
                              {item.kitchenConfig?.specialFinishes?.enabled && (
                                <div className="space-y-4 mt-3">
                                  {/* Puertas de Aluminio con Vidrio Ahumado */}
                                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg space-y-2">
                                    <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                      Puertas de Aluminio con Vidrio Ahumado - {formatPrice(getPrice('ACABADO_ALUMINIO_VIDRIO_M2'))}/m²
                                    </Label>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                      Bisagras adicionales: +1 par (alto mayor a 80cm) o +2 pares (alto mayor a 140cm) a {formatPrice(getPrice('ACABADO_BISAGRA_PAR'))}/par
                                    </p>
                                    
                                    {/* Lista de puertas */}
                                    {(item.kitchenConfig?.specialFinishes?.aluminumGlassDoors || []).map((door, doorIdx) => (
                                      <div key={door.id} className="flex items-center gap-2 bg-white dark:bg-slate-700 p-2 rounded border">
                                        <span className="text-xs font-medium text-purple-600">#{doorIdx + 1}</span>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Alto (m)</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={door.height || ""}
                                              onChange={(e) => {
                                                const newDoors = [...(item.kitchenConfig?.specialFinishes?.aluminumGlassDoors || [])];
                                                const height = parseFloat(e.target.value) || 0;
                                                const width = newDoors[doorIdx].width;
                                                newDoors[doorIdx] = {
                                                  ...newDoors[doorIdx],
                                                  height,
                                                  squareMeters: height * width,
                                                  extraHinges: height > 1.4 ? 2 : (height > 0.8 ? 1 : 0)
                                                };
                                                updateKitchenConfig(index, "specialFinishes.aluminumGlassDoors", newDoors);
                                                calculateKitchenTotal(index);
                                              }}
                                              className="h-8"
                                              placeholder="0.70"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Ancho (m)</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={door.width || ""}
                                              onChange={(e) => {
                                                const newDoors = [...(item.kitchenConfig?.specialFinishes?.aluminumGlassDoors || [])];
                                                const width = parseFloat(e.target.value) || 0;
                                                const height = newDoors[doorIdx].height;
                                                newDoors[doorIdx] = {
                                                  ...newDoors[doorIdx],
                                                  width,
                                                  squareMeters: height * width,
                                                };
                                                updateKitchenConfig(index, "specialFinishes.aluminumGlassDoors", newDoors);
                                                calculateKitchenTotal(index);
                                              }}
                                              className="h-8"
                                              placeholder="0.40"
                                            />
                                          </div>
                                        </div>
                                        <div className="text-xs text-right min-w-[80px]">
                                          <div className="text-purple-600 font-medium">{door.squareMeters?.toFixed(2) || '0.00'} m²</div>
                                          {door.extraHinges > 0 && (
                                            <div className="text-orange-500">+{door.extraHinges} par{door.extraHinges > 1 ? 'es' : ''}</div>
                                          )}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newDoors = (item.kitchenConfig?.specialFinishes?.aluminumGlassDoors || []).filter((_, i) => i !== doorIdx);
                                            updateKitchenConfig(index, "specialFinishes.aluminumGlassDoors", newDoors);
                                            calculateKitchenTotal(index);
                                          }}
                                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newDoor = {
                                          id: `door-${Date.now()}`,
                                          height: 0,
                                          width: 0,
                                          squareMeters: 0,
                                          extraHinges: 0
                                        };
                                        const newDoors = [...(item.kitchenConfig?.specialFinishes?.aluminumGlassDoors || []), newDoor];
                                        updateKitchenConfig(index, "specialFinishes.aluminumGlassDoors", newDoors);
                                      }}
                                      className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                                    >
                                      <Plus className="h-4 w-4 mr-1" /> Agregar Puerta
                                    </Button>
                                  </div>
                                  
                                  {/* LED para Alacenas */}
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`specialLed-${index}`}
                                        checked={item.kitchenConfig?.specialFinishes?.ledLighting?.enabled || false}
                                        onChange={(e) => {
                                          updateKitchenConfig(index, "specialFinishes.ledLighting.enabled", e.target.checked);
                                          calculateKitchenTotal(index);
                                        }}
                                        className="h-4 w-4 accent-yellow-500"
                                      />
                                      <Label htmlFor={`specialLed-${index}`} className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 cursor-pointer">
                                        <Lightbulb className="inline h-3 w-3 mr-1" />
                                        Luz LED para Alacenas - {formatPrice(getPrice('ACABADO_LED_ML'))}/ml
                                      </Label>
                                    </div>
                                    {item.kitchenConfig?.specialFinishes?.ledLighting?.enabled && (
                                      <div className="flex items-center gap-2 ml-6">
                                        <Label className="text-xs">Metros lineales:</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={item.kitchenConfig?.specialFinishes?.ledLighting?.meters || ""}
                                          onChange={(e) => {
                                            updateKitchenConfig(index, "specialFinishes.ledLighting.meters", parseFloat(e.target.value) || 0);
                                            calculateKitchenTotal(index);
                                          }}
                                          className="w-24 h-8"
                                          placeholder="0"
                                        />
                                        <span className="text-xs text-yellow-600">
                                          = {formatPrice((item.kitchenConfig?.specialFinishes?.ledLighting?.meters || 0) * getPrice('ACABADO_LED_ML'))}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 10. Transporte e imprevistos - Opcional y editable */}
                            <div className={`flex flex-col gap-2 p-3 rounded ${item.includesFixedCosts ? 'bg-green-100 border border-green-300' : 'bg-yellow-50'}`}>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`fixedCosts-${index}`}
                                  checked={item.includesFixedCosts || false}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    const fixedAmount = newItems[index].fixedCostsAmount ?? 600000;
                                    
                                    if (e.target.checked) {
                                      // Sumar el transporte al total
                                      newItems[index].totalPrice = newItems[index].totalPrice + fixedAmount;
                                      if (newItems[index].fixedCostsAmount === undefined) {
                                        newItems[index].fixedCostsAmount = 600000;
                                      }
                                    } else {
                                      // Restar el transporte del total
                                      newItems[index].totalPrice = Math.max(0, newItems[index].totalPrice - fixedAmount);
                                    }
                                    
                                    newItems[index].includesFixedCosts = e.target.checked;
                                    setItems(newItems);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor={`fixedCosts-${index}`} className="text-sm font-normal cursor-pointer">
                                  <Truck className="inline h-4 w-4 mr-1" />
                                  Incluye transporte e imprevistos
                                </Label>
                              </div>
                              {item.includesFixedCosts && (
                                <div className="flex items-center gap-2 ml-6">
                                  <Label className="text-sm text-gray-600">Monto:</Label>
                                  <Input
                                    type="number"
                                    value={item.fixedCostsAmount ?? 600000}
                                    onChange={(e) => {
                                      const newItems = [...items];
                                      const oldAmount = newItems[index].fixedCostsAmount ?? 600000;
                                      const newAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      // Actualizar el total: restar el monto anterior y sumar el nuevo
                                      newItems[index].totalPrice = newItems[index].totalPrice - oldAmount + newAmount;
                                      newItems[index].fixedCostsAmount = newAmount;
                                      setItems(newItems);
                                    }}
                                    className="w-32 h-8"
                                    min="0"
                                    step="10000"
                                  />
                                  <span className="text-sm text-gray-500">({formatPrice(item.fixedCostsAmount ?? 600000)})</span>
                                </div>
                              )}
                            </div>

                            {/* Total calculado */}
                            <div className="p-3 sm:p-4 bg-green-50 rounded">
                              <p className="text-sm sm:text-lg font-bold text-green-800">
                                Total Cocina: {formatPrice(item.totalPrice)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Campos dinámicos para HERRAJES */}
                        {item.itemType === "herrajes" && (() => {
                          return (
                          <>
                          <HardwareSelectorForQuotation
                            itemIndex={index}
                            selectedHardware={item.hardwareSelections || []}
                            onHardwareChange={(selections: HardwareSelection[]) => {
                              // Calcular el total directamente con las nuevas selecciones
                              let total = selections.reduce((sum, s) => sum + s.subtotal, 0);
                              // Incluir transporte si está marcado (usar monto editable)
                              if (items[index].includesFixedCosts) {
                                total += (items[index].fixedCostsAmount || 600000);
                              }
                              // Actualizar ambos campos juntos
                              const newItems = [...items];
                              newItems[index] = { 
                                ...newItems[index], 
                                hardwareSelections: selections,
                                totalPrice: total 
                              };
                              setItems(newItems);
                            }}
                          />
                          
                          {/* Checkbox de transporte para herrajes */}
                          <div className="flex items-center space-x-2 mt-4 flex-wrap gap-2">
                            <input
                              type="checkbox"
                              id={`fixedCosts-herrajes-${index}`}
                              checked={item.includesFixedCosts || false}
                              onChange={(e) => {
                                const newItems = [...items];
                                const hardwareTotal = (newItems[index].hardwareSelections || []).reduce((sum, s) => sum + s.subtotal, 0);
                                const fixedAmount = newItems[index].fixedCostsAmount ?? 600000;
                                
                                if (e.target.checked) {
                                  newItems[index].totalPrice = hardwareTotal + fixedAmount;
                                  // Inicializar fixedCostsAmount si no existe
                                  if (newItems[index].fixedCostsAmount === undefined) {
                                    newItems[index].fixedCostsAmount = 600000;
                                  }
                                } else {
                                  newItems[index].totalPrice = hardwareTotal;
                                }
                                
                                newItems[index].includesFixedCosts = e.target.checked;
                                setItems(newItems);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor={`fixedCosts-herrajes-${index}`} className="text-sm font-normal cursor-pointer">
                              Incluye transporte e imprevistos
                            </Label>
                            {item.includesFixedCosts && (
                              <Input
                                type="number"
                                value={item.fixedCostsAmount ?? 600000}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  const hardwareTotal = (newItems[index].hardwareSelections || []).reduce((sum, s) => sum + s.subtotal, 0);
                                  const newAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  newItems[index].totalPrice = hardwareTotal + newAmount;
                                  newItems[index].fixedCostsAmount = newAmount;
                                  setItems(newItems);
                                }}
                                className="w-32 h-8"
                                placeholder="Monto"
                                min="0"
                              />
                            )}
                          </div>
                          </>
                          );
                        })()}

                        {/* Campos dinámicos para ACABADOS ESPECIALES */}
                        {item.itemType === "acabados_especiales" && (
                          <div className="space-y-4 p-4 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800">
                            <h3 className="font-semibold text-base text-slate-700 dark:text-slate-200 flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-cyan-500" />
                              Configuración de Acabados Especiales
                            </h3>
                            
                            {/* Puertas de Aluminio con Vidrio Ahumado */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-cyan-100 dark:border-cyan-900 space-y-3">
                              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <DoorOpen className="h-4 w-4 text-cyan-500" />
                                Puertas de Aluminio con Vidrio Ahumado - {formatPrice(getPrice('ACABADO_ALUMINIO_VIDRIO_M2'))}/m²
                              </Label>
                              <p className="text-xs text-slate-500">
                                Bisagras adicionales: +1 par (alto mayor a 80cm) o +2 pares (alto mayor a 140cm) a {formatPrice(getPrice('ACABADO_BISAGRA_PAR'))}/par
                              </p>
                              
                              {/* Lista de puertas */}
                              {(item.acabadosConfig?.aluminumGlassDoors || []).map((door: any, doorIdx: number) => {
                                const sqm = (door.height || 0) * (door.width || 0);
                                const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
                                return (
                                  <div key={doorIdx} className="flex flex-wrap items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                    <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Puerta #{doorIdx + 1}</span>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Alto (m)"
                                        value={door.height || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          const doors = [...(newItems[index].acabadosConfig?.aluminumGlassDoors || [])];
                                          doors[doorIdx] = { ...doors[doorIdx], height: parseFloat(e.target.value) || 0 };
                                          newItems[index].acabadosConfig = { ...newItems[index].acabadosConfig, aluminumGlassDoors: doors };
                                          // Recalcular total
                                          newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                          setItems(newItems);
                                        }}
                                        className="w-20 h-8 text-sm"
                                      />
                                      <span className="text-slate-400">×</span>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ancho (m)"
                                        value={door.width || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          const doors = [...(newItems[index].acabadosConfig?.aluminumGlassDoors || [])];
                                          doors[doorIdx] = { ...doors[doorIdx], width: parseFloat(e.target.value) || 0 };
                                          newItems[index].acabadosConfig = { ...newItems[index].acabadosConfig, aluminumGlassDoors: doors };
                                          // Recalcular total
                                          newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                          setItems(newItems);
                                        }}
                                        className="w-20 h-8 text-sm"
                                      />
                                    </div>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                      = {sqm.toFixed(2)} m²
                                      {extraHinges > 0 && <span className="text-cyan-600"> + {extraHinges} par{extraHinges > 1 ? 'es' : ''} bisagras</span>}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                      onClick={() => {
                                        const newItems = [...items];
                                        const doors = [...(newItems[index].acabadosConfig?.aluminumGlassDoors || [])];
                                        doors.splice(doorIdx, 1);
                                        newItems[index].acabadosConfig = { ...newItems[index].acabadosConfig, aluminumGlassDoors: doors };
                                        newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                        setItems(newItems);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-cyan-600 border-cyan-300 hover:bg-cyan-50"
                                onClick={() => {
                                  const newItems = [...items];
                                  const doors = [...(newItems[index].acabadosConfig?.aluminumGlassDoors || []), { height: 0, width: 0 }];
                                  newItems[index].acabadosConfig = { ...newItems[index].acabadosConfig, aluminumGlassDoors: doors };
                                  setItems(newItems);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Agregar Puerta
                              </Button>
                            </div>
                            
                            {/* Luz LED para Alacenas */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-yellow-100 dark:border-yellow-900 space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`acabados-led-${index}`}
                                  checked={item.acabadosConfig?.ledLighting?.enabled || false}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].acabadosConfig = {
                                      ...newItems[index].acabadosConfig,
                                      ledLighting: {
                                        ...newItems[index].acabadosConfig?.ledLighting,
                                        enabled: e.target.checked,
                                        meters: e.target.checked ? (newItems[index].acabadosConfig?.ledLighting?.meters || 0) : 0
                                      }
                                    };
                                    newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                    setItems(newItems);
                                  }}
                                  className="h-4 w-4 accent-yellow-500"
                                />
                                <Label htmlFor={`acabados-led-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                                  Luz LED para Alacenas - {formatPrice(getPrice('ACABADO_LED_ML'))}/ml
                                </Label>
                              </div>
                              
                              {item.acabadosConfig?.ledLighting?.enabled && (
                                <div className="flex items-center gap-2 pl-6">
                                  <Label className="text-sm">Metros lineales:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.acabadosConfig?.ledLighting?.meters || ''}
                                    onChange={(e) => {
                                      const newItems = [...items];
                                      newItems[index].acabadosConfig = {
                                        ...newItems[index].acabadosConfig,
                                        ledLighting: {
                                          ...newItems[index].acabadosConfig?.ledLighting,
                                          enabled: true,
                                          meters: parseFloat(e.target.value) || 0
                                        }
                                      };
                                      newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                      setItems(newItems);
                                    }}
                                    className="w-24 h-8"
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Transporte e imprevistos */}
                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                              <input
                                type="checkbox"
                                id={`fixedCosts-acabados-${index}`}
                                checked={item.includesFixedCosts || false}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].includesFixedCosts = e.target.checked;
                                  if (e.target.checked && newItems[index].fixedCostsAmount === undefined) {
                                    newItems[index].fixedCostsAmount = 600000;
                                  }
                                  newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                  setItems(newItems);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`fixedCosts-acabados-${index}`} className="text-sm font-normal cursor-pointer flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                Incluye transporte e imprevistos
                              </Label>
                              {item.includesFixedCosts && (
                                <Input
                                  type="number"
                                  value={item.fixedCostsAmount ?? 600000}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].fixedCostsAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    newItems[index].totalPrice = calculateAcabadosTotal(newItems[index]);
                                    setItems(newItems);
                                  }}
                                  className="w-32 h-8"
                                  placeholder="Monto"
                                  min="0"
                                />
                              )}
                            </div>
                            
                            {/* Total */}
                            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                              <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
                                Total Acabados: {formatPrice(item.totalPrice || 0)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Campos dinámicos para CLOSET */}
                        {item.itemType === "closet" && (
                          <>
                            <ClosetConfigurator
                              config={item.closetConfig || null}
                              onChange={(config: ClosetConfig) => {
                                const newItems = [...items];
                                let total = config.subtotal;
                                // Incluir transporte si está marcado
                                if (newItems[index].includesFixedCosts) {
                                  total += (newItems[index].fixedCostsAmount || 600000);
                                }
                                newItems[index] = {
                                  ...newItems[index],
                                  closetConfig: config,
                                  totalPrice: total
                                };
                                setItems(newItems);
                              }}
                            />

                            {/* Checkbox de transporte para closets */}
                            <div className="flex items-center space-x-2 mt-4 flex-wrap gap-2">
                              <input
                                type="checkbox"
                                id={`fixedCosts-closet-${index}`}
                                checked={item.includesFixedCosts || false}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  const closetTotal = newItems[index].closetConfig?.subtotal || 0;
                                  const fixedAmount = newItems[index].fixedCostsAmount ?? 600000;
                                  
                                  if (e.target.checked) {
                                    newItems[index].totalPrice = closetTotal + fixedAmount;
                                    if (newItems[index].fixedCostsAmount === undefined) {
                                      newItems[index].fixedCostsAmount = 600000;
                                    }
                                  } else {
                                    newItems[index].totalPrice = closetTotal;
                                  }
                                  
                                  newItems[index].includesFixedCosts = e.target.checked;
                                  setItems(newItems);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`fixedCosts-closet-${index}`} className="text-sm font-normal cursor-pointer">
                                Incluye transporte e imprevistos
                              </Label>
                              {item.includesFixedCosts && (
                                <Input
                                  type="number"
                                  value={item.fixedCostsAmount ?? 600000}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    const closetTotal = newItems[index].closetConfig?.subtotal || 0;
                                    const newAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    newItems[index].totalPrice = closetTotal + newAmount;
                                    newItems[index].fixedCostsAmount = newAmount;
                                    setItems(newItems);
                                  }}
                                  className="w-32 h-8"
                                  placeholder="Monto"
                                  min="0"
                                />
                              )}
                            </div>
                          </>
                        )}

                        {/* Campos dinámicos para PUERTA */}
                        {item.itemType === "puerta" && (
                          <>
                            <DoorConfigurator
                              config={item.doorConfig || null}
                              onChange={(config: DoorConfig) => {
                                const newItems = [...items];
                                let total = config.subtotal;
                                // Incluir transporte si está marcado
                                if (newItems[index].includesFixedCosts) {
                                  total += (newItems[index].fixedCostsAmount || 600000);
                                }
                                newItems[index] = {
                                  ...newItems[index],
                                  doorConfig: config,
                                  totalPrice: total
                                };
                                setItems(newItems);
                              }}
                            />

                            {/* Checkbox de transporte para puertas */}
                            <div className="flex items-center space-x-2 mt-4 flex-wrap gap-2">
                              <input
                                type="checkbox"
                                id={`fixedCosts-puerta-${index}`}
                                checked={item.includesFixedCosts || false}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  const doorTotal = newItems[index].doorConfig?.subtotal || 0;
                                  const fixedAmount = newItems[index].fixedCostsAmount ?? 600000;
                                  
                                  if (e.target.checked) {
                                    newItems[index].totalPrice = doorTotal + fixedAmount;
                                    if (newItems[index].fixedCostsAmount === undefined) {
                                      newItems[index].fixedCostsAmount = 600000;
                                    }
                                  } else {
                                    newItems[index].totalPrice = doorTotal;
                                  }
                                  
                                  newItems[index].includesFixedCosts = e.target.checked;
                                  setItems(newItems);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`fixedCosts-puerta-${index}`} className="text-sm font-normal cursor-pointer">
                                Incluye transporte e imprevistos
                              </Label>
                              {item.includesFixedCosts && (
                                <Input
                                  type="number"
                                  value={item.fixedCostsAmount ?? 600000}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    const doorTotal = newItems[index].doorConfig?.subtotal || 0;
                                    const newAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    newItems[index].totalPrice = doorTotal + newAmount;
                                    newItems[index].fixedCostsAmount = newAmount;
                                    setItems(newItems);
                                  }}
                                  className="w-32 h-8"
                                  placeholder="Monto"
                                  min="0"
                                />
                              )}
                            </div>
                          </>
                        )}

                        {/* Campos dinámicos para CENTRO DE TV */}
                        {item.itemType === "centro_tv" && (
                          <>
                            <TVCenterConfigurator
                              config={item.tvCenterConfig || null}
                              onChange={(config: TVCenterConfig) => {
                                const newItems = [...items];
                                newItems[index] = {
                                  ...newItems[index],
                                  tvCenterConfig: config,
                                  totalPrice: config.subtotal
                                };
                                setItems(newItems);
                              }}
                            />
                          </>
                        )}

                        {/* Configurador de Mesones */}
                        {item.itemType === "mesones" && (
                          <>
                            <CountertopConfigurator
                              config={item.countertopConfig || defaultCountertopConfig}
                              onChange={(config: CountertopConfig) => {
                                const newItems = [...items];
                                newItems[index] = {
                                  ...newItems[index],
                                  countertopConfig: config,
                                  totalPrice: config.total
                                };
                                setItems(newItems);
                              }}
                            />
                          </>
                        )}

                        {/* Campos estándar para otros tipos */}
                        {item.itemType !== "cocina" && item.itemType !== "herrajes" && item.itemType !== "closet" && item.itemType !== "puerta" && item.itemType !== "centro_tv" && item.itemType !== "mesones" && (
                          <>
                            <div>
                              <Label>Descripción *</Label>
                              <Textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(index, "description", e.target.value)
                                }
                                placeholder="Descripción detallada del ítem..."
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label>Cantidad *</Label>
                                <Input
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(index, "quantity", e.target.value)
                                  }
                                  placeholder="Ej: 5ml, 2 unidades"
                                />
                              </div>

                              <div>
                                <Label>Precio Unitario</Label>
                                <Input
                                  value={item.unitPrice || ""}
                                  onChange={(e) =>
                                    updateItem(index, "unitPrice", e.target.value)
                                  }
                                  placeholder="Opcional"
                                />
                              </div>

                              <div>
                                <Label>Total *</Label>
                                <Input
                                  type="number"
                                  value={item.totalPrice}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "totalPrice",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="checkbox"
                                id={`fixedCosts-${index}`}
                                checked={item.includesFixedCosts || false}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  const currentTotal = newItems[index].totalPrice;
                                  const wasChecked = newItems[index].includesFixedCosts || false;
                                  const fixedAmount = newItems[index].fixedCostsAmount || 600000;
                                  
                                  if (e.target.checked && !wasChecked) {
                                    newItems[index].totalPrice = currentTotal + fixedAmount;
                                  } else if (!e.target.checked && wasChecked) {
                                    newItems[index].totalPrice = Math.max(0, currentTotal - fixedAmount);
                                  }
                                  
                                  newItems[index].includesFixedCosts = e.target.checked;
                                  setItems(newItems);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`fixedCosts-${index}`} className="text-sm font-normal cursor-pointer">
                                Incluye transporte e imprevistos
                              </Label>
                              {item.includesFixedCosts && (
                                <Input
                                  type="number"
                                  value={item.fixedCostsAmount ?? 600000}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    const oldAmount = newItems[index].fixedCostsAmount ?? 600000;
                                    const newAmount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    // Actualizar el total: restar el monto anterior y sumar el nuevo
                                    newItems[index].totalPrice = newItems[index].totalPrice - oldAmount + newAmount;
                                    newItems[index].fixedCostsAmount = newAmount;
                                    setItems(newItems);
                                  }}
                                  className="w-32 h-8"
                                  placeholder="Monto"
                                  min="0"
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección: Resumen con Descuento */}
            <div className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-lg">
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-white/90">
                  <span className="text-sm sm:text-base">Subtotal:</span>
                  <span className="text-base sm:text-lg font-semibold">{formatPrice(calculateTotal())}</span>
                </div>
                
                {/* Descuento */}
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white/90 text-sm sm:text-base">Descuento:</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-16 sm:w-20 h-8 text-center bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm"
                      />
                      <span className="text-white/90 text-sm">%</span>
                    </div>
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-white/90">
                    -{formatPrice(calculateTotal() * (discountPercent / 100))}
                  </span>
                </div>
                
                {/* Separador */}
                <div className="border-t border-white/30"></div>
                
                {/* Total Final */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-xs sm:text-sm font-medium">Total Final</p>
                      <p className="text-white text-lg sm:text-xl md:text-2xl font-bold">
                        {formatPrice(calculateTotal() * (1 - discountPercent / 100))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 pt-2">
              <div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addItem}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Agregar Producto
                </Button>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 sm:px-6 text-sm sm:text-base border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuotation.isPending || updateQuotation.isPending}
                  className="px-4 sm:px-6 text-sm sm:text-base bg-[oklch(0.72_0.14_180)] hover:bg-[oklch(0.60_0.14_180)] text-white shadow-md flex-1 sm:flex-none"
                >
                  {editingQuotation 
                    ? (updateQuotation.isPending ? "Guardando..." : "Guardar Cambios")
                    : (createQuotation.isPending ? "Creando..." : "Crear Cotización")
                  }
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>


      <PDFPreviewBeforeSave
        open={previewBeforeSaveOpen}
        onOpenChange={setPreviewBeforeSaveOpen}
        pdfUrl={previewBeforeSaveUrl}
        isGenerating={previewPDF.isPending}
        quotationNumber={previewQuotationNumber}
      />

      <PDFContentEditor
        open={pdfEditorOpen}
        onOpenChange={setPdfEditorOpen}
        items={pdfEditorItems}
        customDescriptions={pdfEditorDescriptions}
        generalNotes={pdfEditorNotes}
        onSave={handleSavePdfDescriptions}
        onGeneratePDF={() => {
          if (pdfEditorQuotationId) {
            generatePDF.mutate({ id: pdfEditorQuotationId });
          }
        }}
        isSaving={updateQuotation.isPending}
        clientName={pdfEditorClientName}
        quotationNumber={pdfEditorQuotationNumber}
      />

      <Dialog open={lockConfirmDialog.open} onOpenChange={(open) => setLockConfirmDialog({ ...lockConfirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lockConfirmDialog.isLocking ? "Bloquear cotizacion" : "Desbloquear cotizacion"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {lockConfirmDialog.isLocking
                ? "Estás seguro de bloquear esta cotización? No podrás editarla ni eliminarla hasta desbloquearla."
                : "Estás seguro de desbloquear esta cotización? Podrás editarla y eliminarla nuevamente."}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setLockConfirmDialog({ open: false, quotationId: null, isLocking: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (lockConfirmDialog.quotationId) {
                  toggleLock.mutate({ id: lockConfirmDialog.quotationId });
                  setLockConfirmDialog({ open: false, quotationId: null, isLocking: false });
                }
              }}
              disabled={toggleLock.isPending}
              className={lockConfirmDialog.isLocking ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"}
            >
              {lockConfirmDialog.isLocking ? "Bloquear" : "Desbloquear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pago Inicial */}
      {pendingQuotationForProject && (
        <InitialPaymentModal
          open={initialPaymentModalOpen}
          totalAmount={parseFloat(pendingQuotationForProject.total || "0")}
          quotationNumber={pendingQuotationForProject.quotationNumber || ""}
          onConfirm={handleCreateProjectWithPayment}
          onCancel={() => {
            setInitialPaymentModalOpen(false);
            setPendingQuotationForProject(null);
          }}
          isLoading={createProjectFromQuotation.isPending}
        />
      )}
    </div>
  );
}
