import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { HardwareSelectorForQuotation } from "@/components/HardwareSelectorForQuotation";
import { PDFPreviewDialog } from "@/components/PDFPreviewDialog";
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
import { Plus, Trash2, FileText, Send, Eye, Pencil, Mail } from "lucide-react";
import { toast } from "sonner";

interface KitchenConfig {
  shape: string;
  totalMeters: number;
  lowerCabinets: number;
  upperCabinets: number;
  specialModules: {
    nichoNevecon: boolean;
    nichoNevera: boolean;
    alacenaEntrepanos: boolean;
    alacenaHerraje: boolean;
    torreHornos: boolean;
  };
  countertop: {
    type: string;
    meters: number;
    depthSurcharge: string;
  };
  island: {
    enabled: boolean;
    meters: number;
    countertopType: string;
    hasLaterals: boolean;
  };
  bar: {
    enabled: boolean;
    meters: number;
    countertopType: string;
    hasLateral: boolean;
  };
  ledLighting: number;
}

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
  const [selectedQuotationForEmail, setSelectedQuotationForEmail] = useState<{id: number, email: string} | null>(null);
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
      }
    },
  ]);

  const { data: quotations = [], isLoading } = trpc.quotations.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();

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

  const handleEmailClick = async (quotationId: number, clientEmail: string) => {
    setSelectedQuotationForEmail({ id: quotationId, email: clientEmail });
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
          hardwareSelections: item.hardwareSelections || [],
          kitchenConfig: item.kitchenConfig ? {
            shape: item.kitchenConfig.shape ?? "",
            totalMeters: item.kitchenConfig.totalMeters ?? 0,
            lowerCabinets: item.kitchenConfig.lowerCabinets ?? 0,
            upperCabinets: item.kitchenConfig.upperCabinets ?? 0,
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
    console.log('[Quotations] updateItem called:', { index, field, value, currentItem: items[index] });
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    console.log('[Quotations] Updated item:', newItems[index]);
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
    let deductions = 0;
    if (config.specialModules?.nichoNevecon) deductions += 1.0; // 100cm
    if (config.specialModules?.nichoNevera) deductions += 0.75; // 75cm
    if (config.specialModules?.alacenaEntrepanos) deductions += 0.5; // 50cm
    if (config.specialModules?.alacenaHerraje) deductions += 0.5; // 50cm
    if (config.specialModules?.torreHornos) deductions += 0.7; // 70cm

    const resultingMeters = Math.max(0, config.totalMeters - deductions);
    
    // Actualizar muebles lineales automáticamente
    const newItems = [...itemsArray];
    newItems[index].kitchenConfig!.lowerCabinets = resultingMeters;
    newItems[index].kitchenConfig!.upperCabinets = resultingMeters;
    setItems(newItems);

    // 2. Muebles lineales (inferiores + superiores)
    total += resultingMeters * 900000; // Inferiores
    total += resultingMeters * 900000; // Superiores

    // 3. Muebles especiales
    if (config.specialModules?.nichoNevecon) total += 1200000;
    if (config.specialModules?.nichoNevera) total += 1200000;
    if (config.specialModules?.alacenaEntrepanos) total += 1250000;
    if (config.specialModules?.alacenaHerraje) total += 900000;
    if (config.specialModules?.torreHornos) total += 1350000;

    // 4. Mesón principal (usa metraje resultante automáticamente)
    if (config.countertop.type) {
      const basePrice = config.countertop.type === "quarzone" ? 850000 : 1200000;
      let countertopPrice = basePrice;
      
      if (config.countertop.depthSurcharge === "30percent") {
        countertopPrice = basePrice * 1.3;
      } else if (config.countertop.depthSurcharge === "double") {
        countertopPrice = basePrice * 2;
      }
      
      // Usar metraje resultante automáticamente
      total += resultingMeters * countertopPrice;
    }

    // 5. Isla
    if (config.island.enabled && config.island.meters > 0) {
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

    // 6. Barra
    if (config.bar.enabled && config.bar.meters > 0) {
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

    // 7. Luz LED
    if (config.ledLighting > 0) {
      total += config.ledLighting * 180000;
    }

    // 8. Transporte e imprevistos (si está marcado el checkbox)
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
          toast.error(`Item ${i + 1}: Selecciona la forma de la cocina (L, U o Lineal)`);
          return;
        }
        if (!item.kitchenConfig?.totalMeters || item.kitchenConfig.totalMeters <= 0) {
          toast.error(`Item ${i + 1}: Ingresa el metraje total de la cocina`);
          return;
        }
        if (!item.kitchenConfig?.countertop.type) {
          toast.error(`Item ${i + 1}: Selecciona el tipo de mesón`);
          return;
        }
      } else if (item.itemType === "herrajes") {
        // Para herrajes: validar que haya al menos un herraje seleccionado
        if (!item.hardwareSelections || item.hardwareSelections.length === 0) {
          toast.error(`Item ${i + 1}: Selecciona al menos un herraje`);
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

        // Transporte
        if (item.includesFixedCosts) {
          total += 600000;
        }

        return { ...item, description, quantity, totalPrice: total, includesFixedCosts: item.includesFixedCosts };
      }
      // Para herrajes: generar descripción automática y cantidad basada en selecciones
      if (item.itemType === "herrajes" && item.hardwareSelections && item.hardwareSelections.length > 0) {
        const description = item.hardwareSelections.map(s => `${s.name} x${s.quantity}`).join(", ");
        const totalQuantity = item.hardwareSelections.reduce((sum, s) => sum + s.quantity, 0);
        let totalPrice = item.hardwareSelections.reduce((sum, s) => sum + s.subtotal, 0);
        // Incluir transporte si está marcado
        if (item.includesFixedCosts) {
          totalPrice += 600000;
        }
        return { 
          ...item, 
          description, 
          quantity: totalQuantity.toString(),
          totalPrice,
          includesFixedCosts: item.includesFixedCosts
        };
      }
      return item;
    });

    if (editingQuotation) {
      // Actualizar cotización existente
      console.log("[DEBUG] Enviando items actualizados:");
      console.log(JSON.stringify(itemsWithUpdatedPrices, null, 2));
      updateQuotation.mutate({
        id: editingQuotation,
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "otro",
        items: itemsWithUpdatedPrices,
      });
    } else {
      // Crear nueva cotización
      createQuotation.mutate({
        clientId: selectedClient,
        vendorName,
        productType: (workType || items[0]?.itemType || "otro") as "cocina" | "closet" | "puerta" | "centro_tv" | "herrajes" | "otro",
        items: itemsWithUpdatedPrices,
      });
    }
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(num);
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
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay cotizaciones creadas
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotations.map((quot: any) => (
            <Card key={quot.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{quot.quotationNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quot.client?.name}
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
                  {quot.validUntil && (
                    <p className="text-xs text-muted-foreground">
                      Válida hasta:{" "}
                      {new Date(quot.validUntil).toLocaleDateString("es-CO")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
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
                    onClick={() => handleEmailClick(quot.id, quot.client?.email || "")}
                    disabled={generatePDF.isPending || !quot.client?.email}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Enviar Email
                  </Button>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuotation ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={selectedClient?.toString() || ""}
                  onValueChange={(value) => setSelectedClient(parseInt(value))}
                >
                  <SelectTrigger>
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
              </div>

              <div>
                <Label>Vendedor *</Label>
                <Select value={vendorName} onValueChange={setVendorName}>
                  <SelectTrigger>
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Ítem
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex gap-2 mb-2">
                        <span className="font-bold">Ítem {item.itemNumber}</span>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <Label>Tipo de Producto *</Label>
                          <Select 
                            value={item.itemType} 
                            onValueChange={(value) => {
                              console.log('[Quotations] itemType changed to:', value);
                              updateItem(index, "itemType", value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cocina">Cocina Integral</SelectItem>
                              <SelectItem value="closet">Closet</SelectItem>
                              <SelectItem value="puerta">Puerta</SelectItem>
                              <SelectItem value="centro_tv">Centro de TV</SelectItem>
                              <SelectItem value="meson_quarzone">Mesón Quarzone</SelectItem>
                              <SelectItem value="meson_sinterizado">Mesón Sinterizado</SelectItem>
                              <SelectItem value="luz_led">Luz LED</SelectItem>
                              <SelectItem value="herrajes">Herrajes</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos dinámicos para COCINA */}
                        {item.itemType === "cocina" && (
                          <div className="space-y-4 p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold text-lg">Configuración de Cocina Integral</h3>
                            
                            {/* 1. Forma */}
                            <div>
                              <Label>Forma de la Cocina</Label>
                              <Select 
                                value={item.kitchenConfig?.shape || ""} 
                                onValueChange={(value) => updateKitchenConfig(index, "shape", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona la forma" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L">En L</SelectItem>
                                  <SelectItem value="U">En U</SelectItem>
                                  <SelectItem value="lineal">Lineal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 2. Metraje total */}
                            <div>
                              <Label>Metraje Total de la Cocina (ml)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.kitchenConfig?.totalMeters || ""}
                                onChange={(e) => updateKitchenConfig(index, "totalMeters", parseFloat(e.target.value) || 0)}
                                placeholder="Ej: 5.00"
                              />
                            </div>

                            {/* 3. Muebles especiales */}
                            <div>
                              <Label className="mb-2 block">Muebles Especiales (se descuentan del metraje)</Label>
                              <div className="space-y-2">
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

                            {/* Mostrar metraje resultante y muebles */}
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

                            {/* 4. Mesón principal */}
                            <div className="space-y-2">
                              <Label className="text-base font-semibold">Mesón Principal</Label>
                              <div className="grid grid-cols-2 gap-3">
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

                            {/* 5. Isla */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`islandEnabled-${index}`}
                                  checked={item.kitchenConfig?.island.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "island.enabled", e.target.checked)}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`islandEnabled-${index}`} className="text-base font-semibold cursor-pointer">
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

                            {/* 6. Barra */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`barEnabled-${index}`}
                                  checked={item.kitchenConfig?.bar.enabled || false}
                                  onChange={(e) => updateKitchenConfig(index, "bar.enabled", e.target.checked)}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`barEnabled-${index}`} className="text-base font-semibold cursor-pointer">
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

                            {/* 7. Luz LED (opcional) */}
                            <div>
                              <Label>Luz LED (opcional) - $180,000/ml</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.kitchenConfig?.ledLighting || ""}
                                onChange={(e) => updateKitchenConfig(index, "ledLighting", parseFloat(e.target.value) || 0)}
                                placeholder="Dejar en 0 si no lleva LED"
                              />
                            </div>

                            {/* 8. Transporte */}
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
                          console.log('[Quotations] Rendering HardwareSelectorForQuotation for item:', item);
                          return (
                          <>
                          <HardwareSelectorForQuotation
                            itemIndex={index}
                            selectedHardware={item.hardwareSelections || []}
                            onHardwareChange={(selections: HardwareSelection[]) => {
                              // Calcular el total directamente con las nuevas selecciones
                              let total = selections.reduce((sum, s) => sum + s.subtotal, 0);
                              // Incluir transporte si está marcado
                              if (items[index].includesFixedCosts) {
                                total += 600000;
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
                                const fixedAmount = newItems[index].fixedCostsAmount || 600000;
                                
                                if (e.target.checked) {
                                  newItems[index].totalPrice = hardwareTotal + fixedAmount;
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
                                value={item.fixedCostsAmount || 600000}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  const hardwareTotal = (newItems[index].hardwareSelections || []).reduce((sum, s) => sum + s.subtotal, 0);
                                  const newAmount = parseFloat(e.target.value) || 0;
                                  newItems[index].totalPrice = hardwareTotal + newAmount;
                                  newItems[index].fixedCostsAmount = newAmount;
                                  setItems(newItems);
                                }}
                                className="w-32 h-8"
                                placeholder="Monto"
                              />
                            )}
                          </div>
                          </>
                          );
                        })()}

                        {/* Campos estándar para otros tipos */}
                        {item.itemType !== "cocina" && item.itemType !== "herrajes" && (
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
                                  value={item.fixedCostsAmount || 600000}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    const oldAmount = newItems[index].fixedCostsAmount || 600000;
                                    const newAmount = parseFloat(e.target.value) || 0;
                                    // Actualizar el total: restar el monto anterior y sumar el nuevo
                                    newItems[index].totalPrice = newItems[index].totalPrice - oldAmount + newAmount;
                                    newItems[index].fixedCostsAmount = newAmount;
                                    setItems(newItems);
                                  }}
                                  className="w-32 h-8"
                                  placeholder="Monto"
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-muted">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">TOTAL:</span>
                    <span className="font-bold text-primary">
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createQuotation.isPending || updateQuotation.isPending}>
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
      />
    </div>
  );
}
