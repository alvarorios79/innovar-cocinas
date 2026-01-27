import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { HardwareSelectorForQuotation } from "@/components/HardwareSelectorForQuotation";
import { ClosetConfigurator, ClosetConfig } from "@/components/ClosetConfigurator";
import { DoorConfigurator, DoorConfig } from "@/components/DoorConfigurator";
import { TVCenterConfigurator, TVCenterConfig } from "@/components/TVCenterConfigurator";
import { KitchenConfigurator, KitchenConfig } from "@/components/KitchenConfigurator";
import { CountertopConfigurator, CountertopConfig, defaultCountertopConfig } from "@/components/CountertopConfigurator";
import { PDFPreviewDialog } from "@/components/PDFPreviewDialog";
import { PDFPreviewBeforeSave } from "@/components/PDFPreviewBeforeSave";
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
import { Plus, Trash2, FileText, Send, Eye, Pencil, Mail, Search, X, UserPlus, FolderPlus, ChefHat, Ruler, Package, Sofa, DoorOpen, Tv, Wrench, LayoutGrid, Calendar, User, Building2, Truck, Sparkles, CircleDollarSign, Lightbulb, Palette } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatters";
import { CreateQuickClientDialog } from "@/components/CreateQuickClientDialog";

interface HardwareSelection {
  hardwareId: number;
  name: string;
  price: string;
  quantity: number;
  subtotal: number;
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
}

export default function Quotations() {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState("Alvaro Gutierrez");
  const [workType, setWorkType] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [selectedQuotationForEmail, setSelectedQuotationForEmail] = useState<{id: number, email: string, quotationNumber: string, clientName: string} | null>(null);
  
  // Estados para vista previa antes de guardar
  const [previewBeforeSaveOpen, setPreviewBeforeSaveOpen] = useState(false);
  const [previewBeforeSaveUrl, setPreviewBeforeSaveUrl] = useState("");
  const [previewQuotationNumber, setPreviewQuotationNumber] = useState("");
  
  // Estados para filtros
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
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
    },
  ]);

  const { data: quotations = [], isLoading } = trpc.quotations.list.useQuery();
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
      toast.success("Cotización actualizada exitosamente");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar cotización");
    },
  });

  const updateStatus = trpc.quotations.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      toast.success("Estado actualizado");
    },
  });

  const deleteQuotation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      toast.success("Cotización eliminada");
    },
  });

  const generatePDF = trpc.quotations.generatePDF.useMutation({
    onSuccess: (data) => {
      // Descargar PDF usando URL
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.filename;
      link.click();
      toast.success("PDF generado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar PDF");
    },
  });

  const sendByEmail = trpc.quotations.sendByEmail.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate();
      toast.success("Cotización enviada por email");
      setPreviewDialogOpen(false);
      setSelectedQuotationForEmail(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar email");
    },
  });

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

  const handlePreviewClick = (quotationId: number, quotationNumber: string) => {
    setPreviewQuotationNumber(quotationNumber);
    previewPDF.mutate({ id: quotationId });
  };

  const handleEmailClick = async (quotationId: number, clientEmail: string, quotationNumber: string, clientName: string) => {
    setSelectedQuotationForEmail({ id: quotationId, email: clientEmail, quotationNumber, clientName });
    // Generar PDF para vista previa
    generatePDF.mutate(
      { id: quotationId },
      {
        onSuccess: (data) => {
          // Agregar parámetro preview=true para visualización inline
          const previewUrl = `${data.downloadUrl}?preview=true`;
          setPreviewPdfUrl(previewUrl);
          setPreviewDialogOpen(true);
        },
        onError: (error) => {
          toast.error(error.message || "Error al generar vista previa");
        },
      }
    );
  };

  const handleConfirmSend = () => {
    if (selectedQuotationForEmail) {
      sendByEmail.mutate({ id: selectedQuotationForEmail.id });
    }
  };

  const resetForm = () => {
    setEditingQuotation(null);
    setSelectedClient(null);
    setVendorName("Alvaro Gutierrez");
    setWorkType("");
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
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;

    try {
      // Cargar items de la cotización usando el endpoint getById
      const quotationData: any = await new Promise((resolve, reject) => {
        utils.client.quotations.getById.query({ id: quotationId })
          .then(resolve)
          .catch(reject);
      });
      
      setEditingQuotation(quotationId);
      setSelectedClient(quotation.clientId);
      setVendorName(quotation.vendorName);
      setWorkType(quotation.productType);
      
      // Cargar items si existen
      if (quotationData && quotationData.items && Array.isArray(quotationData.items)) {
        setItems(quotationData.items.map((item: any) => ({
          itemNumber: item.itemNumber,
          itemType: item.itemType || "",
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice || "",
          totalPrice: item.totalPrice,
          includesFixedCosts: item.includesFixedCosts || false,
          fixedCostsAmount: item.fixedCostsAmount || 600000,
          hardwareSelections: item.hardwareSelections || [],
          closetConfig: item.closetConfig ? {
            type: item.closetConfig.type || "estandar",
            width: item.closetConfig.width || 0,
            height: item.closetConfig.height || 0,
            doorType: item.closetConfig.doorType || "sliding",
            squareMeters: item.closetConfig.squareMeters || 0,
            pricePerSquareMeter: item.closetConfig.pricePerSquareMeter || 750000,
            subtotal: item.closetConfig.subtotal || 0,
            notes: item.closetConfig.notes || "",
          } : undefined,
          tvCenterConfig: item.tvCenterConfig ? {
            width: item.tvCenterConfig.width ?? 1.60,
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
    
    // Recalcular automáticamente con el item actualizado
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

  const calculateKitchenTotal = (index: number, itemsArray: typeof items = items) => {
    const item = itemsArray[index];
    const config = item.kitchenConfig!;
    let total = 0;

    // 1. Calcular metraje resultante después de descontar muebles especiales
    // Solo aplica para cocinas completas (no para frente_pll, solo_superiores, solo_inferiores)
    let deductions = 0;
    const isSpecialShape = ['frente_pll', 'solo_superiores', 'solo_inferiores', 'puertas_tapas'].includes(config.shape);
    
    if (!isSpecialShape) {
      if (config.specialModules?.nichoNevecon) deductions += 1.0; // 100cm
      if (config.specialModules?.nichoNevera) deductions += 0.75; // 75cm
      if (config.specialModules?.alacenaEntrepanos) deductions += 0.5; // 50cm
      if (config.specialModules?.alacenaHerraje) deductions += 0.5; // 50cm
      if (config.specialModules?.torreHornos) deductions += 0.7; // 70cm
    }

    const resultingMeters = Math.max(0, config.totalMeters - deductions);
    
    // 2. Muebles lineales según la forma
    if (config.shape === 'frente_pll') {
      // Frente PLL: $650,000/ml
      total += config.totalMeters * 650000;
      // Módulo superior opcional: +$750,000/ml (metraje separado)
      if (config.includeUpperModule && config.upperModuleMeters) {
        total += config.upperModuleMeters * 750000;
      }
    } else if (config.shape === 'solo_superiores') {
      // Solo muebles superiores: $900,000/ml
      total += config.totalMeters * 900000;
    } else if (config.shape === 'solo_inferiores') {
      // Solo muebles inferiores: $900,000/ml
      total += config.totalMeters * 900000;
    } else if (config.shape === 'puertas_tapas') {
      // Puertas y Tapas (solo cambio)
      const dc = config.doorsAndCovers || {};
      total += (dc.upperDoors70 || 0) * 120000;  // Puertas superiores hasta 70cm
      total += (dc.upperDoors90 || 0) * 150000;  // Puertas superiores hasta 90cm
      total += (dc.upperDoors100 || 0) * 180000; // Puertas superiores más de 100cm
      total += (dc.lowerDoors || 0) * 150000;    // Puertas inferiores
      total += (dc.pantryDoors || 0) * 180000;   // Puertas de alacena
      total += (dc.drawerCovers || 0) * 90000;   // Tapas de cajón
      total += (dc.smallCovers || 0) * 45000;    // Pequeñas y demás
    } else {
      // Cocinas completas (Lineal, L, U, etc.): inferiores + superiores
      total += resultingMeters * 900000; // Inferiores
      total += resultingMeters * 900000; // Superiores
    }

    // 3. Muebles especiales (para cocinas completas y puertas_tapas)
    if (!isSpecialShape || config.shape === 'puertas_tapas') {
      if (config.specialModules?.nichoNevecon) total += 1200000;
      if (config.specialModules?.nichoNevera) total += 1200000;
      if (config.specialModules?.alacenaEntrepanos) total += 1250000;
      if (config.specialModules?.alacenaHerraje) total += 900000;
      if (config.specialModules?.torreHornos) total += 1350000;
    }

    // 4. Mesón principal (usa metraje resultante automáticamente)
    // No aplica para solo_superiores ni puertas_tapas
    if (config.shape !== 'solo_superiores' && config.shape !== 'puertas_tapas' && config.countertop.type) {
      const basePrice = config.countertop.type === "quarzone" ? 850000 : 1200000;
      let countertopPrice = basePrice;
      
      if (config.countertop.depthSurcharge === "30percent") {
        countertopPrice = basePrice * 1.3;
      } else if (config.countertop.depthSurcharge === "double") {
        countertopPrice = basePrice * 2;
      }
      
      // Usar metraje resultante automáticamente (o totalMeters para formas especiales)
      const metersForCountertop = isSpecialShape ? config.totalMeters : resultingMeters;
      total += metersForCountertop * countertopPrice;
    }

    // 5. Isla (para cocinas completas y puertas_tapas)
    if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.island.enabled && config.island.meters > 0) {
      // Muebles de isla
      total += config.island.meters * 900000;
      
      // Mesón superior de isla
      if (config.island.countertopType) {
        const islandCountertopPrice = config.island.countertopType === "quarzone" ? 850000 : 1200000;
        total += config.island.meters * islandCountertopPrice;
        
        // Laterales de isla
        if (config.island.hasLaterals) {
          total += 1.8 * islandCountertopPrice; // Lateral
          total += 0.9 * islandCountertopPrice; // Regrueso
        }
      }
    }

    // 6. Barra (para cocinas completas y puertas_tapas)
    if ((!isSpecialShape || config.shape === 'puertas_tapas') && config.bar.enabled && config.bar.meters > 0) {
      // Muebles de barra
      total += config.bar.meters * 900000;
      
      // Mesón superior de barra
      if (config.bar.countertopType) {
        const barCountertopPrice = config.bar.countertopType === "quarzone" ? 850000 : 1200000;
        total += config.bar.meters * barCountertopPrice;
        
        // Lateral de barra
        if (config.bar.hasLateral) {
          total += 0.9 * barCountertopPrice;
        }
      }
    }

    // 7. Luz LED (no aplica para solo_inferiores ni puertas_tapas)
    if (config.shape !== 'solo_inferiores' && config.shape !== 'puertas_tapas' && config.ledLighting > 0) {
      total += config.ledLighting * 180000;
    }

    // 8. Pintado Puertas Alto Brillo
    if (config.paintedDoors?.enabled) {
      total += (config.paintedDoors.upperQty || 0) * 120000; // Puertas superiores
      total += (config.paintedDoors.lowerQty || 0) * 150000; // Puertas inferiores
      total += (config.paintedDoors.pantryQty || 0) * 250000; // Puertas de alacena
      total += (config.paintedDoors.drawerQty || 0) * 80000; // Tapas de cajón
      total += (config.paintedDoors.spiceQty || 0) * 100000; // Tapa de especiero
      total += (config.paintedDoors.golaQty || 0) * 45000; // Tapas pequeña/gola
    }

    // 9. Transporte e imprevistos (si está marcado el checkbox)
    if (item.includesFixedCosts) {
      total += 600000;
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
        // Metraje solo requerido para formas que no sean puertas_tapas
        if (item.kitchenConfig?.shape !== 'puertas_tapas') {
          if (!item.kitchenConfig?.totalMeters || item.kitchenConfig.totalMeters <= 0) {
            toast.error(`Item ${i + 1}: Ingresa el metraje total de la cocina`);
            return;
          }
        }
        // Mesón solo requerido para formas que no sean solo_superiores ni puertas_tapas
        if (item.kitchenConfig?.shape !== 'solo_superiores' && item.kitchenConfig?.shape !== 'puertas_tapas') {
          if (!item.kitchenConfig?.countertop.type) {
            toast.error(`Item ${i + 1}: Selecciona el tipo de mesón`);
            return;
          }
        }
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

        // Calcular metraje resultante
        let deductions = 0;
        if (config.specialModules?.nichoNevecon) deductions += 1.0;
        if (config.specialModules?.nichoNevera) deductions += 0.75;
        if (config.specialModules?.alacenaEntrepanos) deductions += 0.5;
        if (config.specialModules?.alacenaHerraje) deductions += 0.5;
        if (config.specialModules?.torreHornos) deductions += 0.7;
        const resultingMeters = Math.max(0, config.totalMeters - deductions);

        // Muebles lineales
        total += resultingMeters * 900000 * 2; // Inferiores + Superiores

        // Muebles especiales
        if (config.specialModules?.nichoNevecon) total += 1200000;
        if (config.specialModules?.nichoNevera) total += 1200000;
        if (config.specialModules?.alacenaEntrepanos) total += 1250000;
        if (config.specialModules?.alacenaHerraje) total += 900000;
        if (config.specialModules?.torreHornos) total += 1350000;

        // Mesón principal
        if (config.countertop.type) {
          const basePrice = config.countertop.type === "quarzone" ? 850000 : 1200000;
          let countertopPrice = basePrice;
          if (config.countertop.depthSurcharge === "30percent") countertopPrice = basePrice * 1.3;
          else if (config.countertop.depthSurcharge === "double") countertopPrice = basePrice * 2;
          total += resultingMeters * countertopPrice;
        }

        // Isla
        if (config.island.enabled && config.island.meters > 0) {
          total += config.island.meters * 900000;
          if (config.island.countertopType) {
            const islandPrice = config.island.countertopType === "quarzone" ? 850000 : 1200000;
            total += config.island.meters * islandPrice;
            if (config.island.hasLaterals) {
              total += 1.8 * islandPrice + 0.9 * islandPrice;
            }
          }
        }

        // Barra
        if (config.bar.enabled && config.bar.meters > 0) {
          total += config.bar.meters * 900000;
          if (config.bar.countertopType) {
            const barPrice = config.bar.countertopType === "quarzone" ? 850000 : 1200000;
            total += config.bar.meters * barPrice;
            if (config.bar.hasLateral) {
              total += 0.9 * barPrice;
            }
          }
        }

        // LED
        if (config.ledLighting > 0) {
          total += config.ledLighting * 180000;
        }

        // Pintado Puertas Alto Brillo
        if (config.paintedDoors?.enabled) {
          total += (config.paintedDoors.upperQty || 0) * 120000;
          total += (config.paintedDoors.lowerQty || 0) * 150000;
          total += (config.paintedDoors.pantryQty || 0) * 250000;
          total += (config.paintedDoors.drawerQty || 0) * 80000;
          total += (config.paintedDoors.spiceQty || 0) * 100000;
          total += (config.paintedDoors.golaQty || 0) * 45000;
        }

        // Transporte (usar el monto editable)
        if (item.includesFixedCosts) {
          total += (item.fixedCostsAmount || 600000);
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
      return item;
    });

    if (editingQuotation) {
      // Actualizar cotización existente
      updateQuotation.mutate({
        id: editingQuotation,
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "mesones" | "otro",
        items: itemsWithUpdatedPrices,
      });
    } else {
      // Crear nueva cotización
      createQuotation.mutate({
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "mesones" | "otro",
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cotizaciones</h1>
        <div className="flex gap-2">
          <CreateQuickClientDialog 
            onClientCreated={() => utils.clients.list.invalidate()}
            trigger={
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Crear Cliente Rápido
              </Button>
            }
          />
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
          {filteredQuotations.map((quot: any) => (
            <Card key={quot.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{quot.quotationNumber} - {quot.client?.name}</CardTitle>
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
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEmailClick(quot.id, quot.client?.email || "", quot.quotationNumber, quot.client?.name || "Cliente")}
                    disabled={generatePDF.isPending || !quot.client?.email}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Enviar Email
                  </Button>

                  {!quot.projectId && (
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Crear proyecto para la cotización ${quot.quotationNumber}?\n\nEsto creará un proyecto con los datos financieros y fechas de la cotización.`
                          )
                        ) {
                          createProjectFromQuotation.mutate({ quotationId: quot.id });
                        }
                      }}
                      disabled={createProjectFromQuotation.isPending}
                    >
                      <FolderPlus className="h-4 w-4 mr-1" />
                      Crear Proyecto
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Estás seguro de eliminar esta cotización?"
                        )
                      ) {
                        deleteQuotation.mutate({ id: quot.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para crear cotización */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] p-6 rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-3">
                <FileText className="h-6 w-6" />
                {editingQuotation ? "Editar Cotización" : "Nueva Cotización"}
              </DialogTitle>
              <p className="text-white/80 text-sm mt-1">Complete los datos para generar la cotización</p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Sección: Información General */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-[oklch(0.72_0.14_180)]" />
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800 shadow-sm">
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-blue-600" />
                Fechas de la Cotización
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <Label className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Creación</Label>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-100 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <Label className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Validez</Label>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const validUntil = new Date();
                      validUntil.setDate(validUntil.getDate() + 7);
                      return validUntil.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    })()}
                  </p>
                  <span className="text-xs text-amber-600 dark:text-amber-400">7 días</span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-red-600" />
                    </div>
                    <Label className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Entrega Est.</Label>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Productos a Cotizar
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addItem}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {/* Header del Item */}
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                          {item.itemNumber}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
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

                    <div className="p-4">
                      <div className="grid gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-2">
                            <LayoutGrid className="h-4 w-4" />
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
                              <SelectItem value="otro">
                                <span className="flex items-center gap-2"><Package className="h-4 w-4 text-teal-500" /> Otro</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos dinámicos para COCINA */}
                        {item.itemType === "cocina" && (
                          <div className="space-y-4 p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                            <h3 className="font-semibold text-base text-slate-700 dark:text-slate-200 flex items-center gap-2">
                              <ChefHat className="h-5 w-5 text-orange-500" />
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
                                  <SelectItem value="L">En L</SelectItem>
                                  <SelectItem value="U">En U</SelectItem>
                                  <SelectItem value="lineal">Lineal</SelectItem>
                                  <SelectItem value="frente_pll">Frente PLL ($650,000/ml)</SelectItem>
                                  <SelectItem value="solo_superiores">Solo Muebles Superiores ($900,000/ml)</SelectItem>
                                  <SelectItem value="solo_inferiores">Solo Muebles Inferiores ($900,000/ml)</SelectItem>
                                  <SelectItem value="puertas_tapas">Puertas y Tapas (solo cambio)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 2. Metraje total - No aplica para puertas_tapas */}
                            {item.kitchenConfig?.shape !== 'puertas_tapas' && (
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
                                  const dc = item.kitchenConfig?.doorsAndCovers || {};
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-orange-100 dark:border-orange-900">
                              <Label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Package className="h-4 w-4 text-orange-500" />
                                Muebles Especiales (se descuentan del metraje)
                              </Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`nichoNevecon-${index}`}
                                    checked={item.kitchenConfig?.specialModules.nichoNevecon || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.nichoNevecon", e.target.checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`nichoNevecon-${index}`} className="text-sm font-normal cursor-pointer">
                                    Nicho para nevecon (100cm) - $1,200,000
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`nichoNevera-${index}`}
                                    checked={item.kitchenConfig?.specialModules.nichoNevera || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.nichoNevera", e.target.checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`nichoNevera-${index}`} className="text-sm font-normal cursor-pointer">
                                    Nicho para nevera estándar (75cm) - $1,200,000
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`alacenaEntrepanos-${index}`}
                                    checked={item.kitchenConfig?.specialModules.alacenaEntrepanos || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.alacenaEntrepanos", e.target.checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`alacenaEntrepanos-${index}`} className="text-sm font-normal cursor-pointer">
                                    Alacena con entrepaños (50cm) - $1,250,000
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`alacenaHerraje-${index}`}
                                    checked={item.kitchenConfig?.specialModules.alacenaHerraje || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.alacenaHerraje", e.target.checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`alacenaHerraje-${index}`} className="text-sm font-normal cursor-pointer">
                                    Alacena para herraje (50cm) - $900,000
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`torreHornos-${index}`}
                                    checked={item.kitchenConfig?.specialModules.torreHornos || false}
                                    onChange={(e) => {
                                      updateKitchenConfig(index, "specialModules.torreHornos", e.target.checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`torreHornos-${index}`} className="text-sm font-normal cursor-pointer">
                                    Torre de hornos (70cm) - $1,350,000
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-orange-100 dark:border-orange-900 space-y-3">
                              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-orange-500" />
                                Mesón Principal
                              </Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900 space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`islandEnabled-${index}`}
                                  checked={item.kitchenConfig?.island.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "island.enabled", e.target.checked)}
                                  className="h-4 w-4 accent-blue-500"
                                />
                                <Label htmlFor={`islandEnabled-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <LayoutGrid className="h-4 w-4 text-blue-500" />
                                  Isla
                                </Label>
                              </div>
                              
                              {item.kitchenConfig?.island.enabled && (
                                <div className="pl-6 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-purple-100 dark:border-purple-900 space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`barEnabled-${index}`}
                                  checked={item.kitchenConfig?.bar.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "bar.enabled", e.target.checked)}
                                  className="h-4 w-4 accent-purple-500"
                                />
                                <Label htmlFor={`barEnabled-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Ruler className="h-4 w-4 text-purple-500" />
                                  Barra
                                </Label>
                              </div>
                              
                              {item.kitchenConfig?.bar.enabled && (
                                <div className="pl-6 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-yellow-100 dark:border-yellow-900 space-y-2">
                              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                Luz LED (opcional) - $180,000/ml
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
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-pink-200 dark:border-pink-900 space-y-3">
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
                                <Label htmlFor={`paintedDoors-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                                  <Palette className="h-4 w-4 text-pink-500" />
                                  Pintado Puertas Alto Brillo
                                </Label>
                              </div>
                              {item.kitchenConfig?.paintedDoors?.enabled && (
                                <div className="grid grid-cols-2 gap-3 text-sm">
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

                            {/* 9. Transporte */}
                            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded">
                              <input
                                type="checkbox"
                                id={`fixedCosts-${index}`}
                                checked={item.includesFixedCosts || false}
                                onChange={(e) => {
                                  updateItem(index, "includesFixedCosts", e.target.checked);
                                  calculateKitchenTotal(index);
                                }}
                                className="h-4 w-4"
                              />
                              <Label htmlFor={`fixedCosts-${index}`} className="text-sm font-normal cursor-pointer">
                                Incluye transporte e imprevistos ($600,000)
                              </Label>
                            </div>

                            {/* Total calculado */}
                            <div className="p-4 bg-green-50 rounded">
                              <p className="text-lg font-bold text-green-800">
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

            {/* Sección: Resumen Total */}
            <div className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] rounded-xl p-5 shadow-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <CircleDollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">Total de la Cotización</p>
                    <p className="text-white text-2xl font-bold">
                      {formatPrice(calculateTotal())}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="px-6 border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createQuotation.isPending || updateQuotation.isPending}
                className="px-6 bg-[oklch(0.72_0.14_180)] hover:bg-[oklch(0.60_0.14_180)] text-white shadow-md"
              >
                {editingQuotation 
                  ? (updateQuotation.isPending ? "Guardando..." : "Guardar Cambios")
                  : (createQuotation.isPending ? "Creando..." : "Crear Cotización")
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PDFPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        pdfUrl={previewPdfUrl}
        recipientEmail={selectedQuotationForEmail?.email || ""}
        onConfirmSend={handleConfirmSend}
        isSending={sendByEmail.isPending}
        quotationNumber={selectedQuotationForEmail ? `${selectedQuotationForEmail.quotationNumber} - ${selectedQuotationForEmail.clientName}` : ""}
      />

      <PDFPreviewBeforeSave
        open={previewBeforeSaveOpen}
        onOpenChange={setPreviewBeforeSaveOpen}
        pdfUrl={previewBeforeSaveUrl}
        isGenerating={previewPDF.isPending}
        quotationNumber={previewQuotationNumber}
      />
    </div>
  );
}
