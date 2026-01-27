import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Save, Eye, Package, StickyNote, Loader2 } from "lucide-react";

interface QuotationItem {
  itemType: string;
  description: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  kitchenConfig?: any;
  hardwareSelections?: any[];
  closetConfig?: any;
}

interface PDFContentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QuotationItem[];
  customDescriptions: Record<number, string>;
  generalNotes: string;
  onSave: (customDescriptions: Record<number, string>, generalNotes: string) => void;
  onGeneratePDF?: () => void;
  isSaving?: boolean;
  clientName?: string;
  quotationNumber?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

const getItemTypeName = (itemType: string) => {
  const names: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puerta: "Puerta",
    centro_tv: "Centro de TV",
    herrajes: "Herrajes",
    mesones: "Mesones",
    otro: "Otro"
  };
  return names[itemType] || itemType;
};

const getKitchenShapeName = (shape: string) => {
  const names: Record<string, string> = {
    L: "Forma L",
    U: "Forma U",
    lineal: "Lineal",
    frente_pll: "Frente PLL",
    solo_superiores: "Solo Muebles Superiores",
    solo_inferiores: "Solo Muebles Inferiores",
    puertas_tapas: "Puertas y Tapas (solo cambio)"
  };
  return names[shape] || shape;
};

const generateAutoDescription = (item: QuotationItem, index: number): string => {
  if (item.itemType === "cocina" && item.kitchenConfig) {
    const config = item.kitchenConfig;
    const parts: string[] = [];
    
    // Forma de la cocina
    if (config.shape) {
      parts.push(`• ${getKitchenShapeName(config.shape)}`);
    }
    
    // Metraje
    if (config.totalMeters) {
      parts.push(`• Metraje total: ${config.totalMeters} ml`);
    }
    
    // Muebles inferiores y superiores
    if (config.lowerCabinets?.meters) {
      parts.push(`• Muebles inferiores: ${config.lowerCabinets.meters} ml`);
    }
    if (config.upperCabinets?.meters) {
      parts.push(`• Muebles superiores: ${config.upperCabinets.meters} ml`);
    }
    
    // Muebles especiales
    if (config.specialCabinets?.nichoNevecon) {
      parts.push("• Nicho nevecon (100cm)");
    }
    if (config.specialCabinets?.nichoNevera) {
      parts.push("• Nicho nevera estándar (75cm)");
    }
    if (config.specialCabinets?.alacenaEntrepanos) {
      parts.push("• Alacena entrepaños (50cm)");
    }
    if (config.specialCabinets?.alacenaHerraje) {
      parts.push("• Alacena herraje (50cm)");
    }
    if (config.specialCabinets?.torreHornos) {
      parts.push("• Torre hornos (70cm)");
    }
    
    // Mesón
    if (config.countertop?.type) {
      const mesonType = config.countertop.type === "quarzone" ? "Quarzone" : "Sinterizado";
      parts.push(`• Mesón en ${mesonType}`);
      if (config.countertop.depthSurcharge === "surcharge_30") {
        parts.push("  - Con recargo por fondo (61-90cm)");
      } else if (config.countertop.depthSurcharge === "double") {
        parts.push("  - Precio doble por fondo (91-120cm)");
      }
    }
    
    // Isla
    if (config.island?.enabled) {
      const islandMeson = config.island.countertopType === "quarzone" ? "Quarzone" : "Sinterizado";
      parts.push(`• Isla: ${config.island.meters || 0} ml con mesón ${islandMeson}`);
      if (config.island.hasLaterals) {
        parts.push("  - Incluye laterales");
      }
    }
    
    // Barra
    if (config.bar?.enabled) {
      const barMeson = config.bar.countertopType === "quarzone" ? "Quarzone" : "Sinterizado";
      parts.push(`• Barra: ${config.bar.meters || 0} ml con mesón ${barMeson}`);
      if (config.bar.hasLateral) {
        parts.push("  - Incluye lateral");
      }
    }
    
    // LED
    if (config.ledLighting && config.ledLighting > 0) {
      parts.push(`• Luz LED: ${config.ledLighting} ml`);
    }
    
    // Pintado puertas
    if (config.paintedDoors?.enabled) {
      const paintParts: string[] = [];
      if (config.paintedDoors.upperQty > 0) paintParts.push(`${config.paintedDoors.upperQty} superiores`);
      if (config.paintedDoors.lowerQty > 0) paintParts.push(`${config.paintedDoors.lowerQty} inferiores`);
      if (config.paintedDoors.pantryQty > 0) paintParts.push(`${config.paintedDoors.pantryQty} alacena`);
      if (config.paintedDoors.drawerQty > 0) paintParts.push(`${config.paintedDoors.drawerQty} tapas cajón`);
      if (paintParts.length > 0) {
        parts.push(`• Pintado alto brillo: ${paintParts.join(", ")}`);
      }
    }
    
    return parts.join("\n");
  }
  
  if (item.itemType === "herrajes" && item.hardwareSelections) {
    const parts: string[] = [];
    item.hardwareSelections.forEach((hw: any) => {
      parts.push(`• ${hw.name}: ${hw.quantity} unidades`);
    });
    return parts.join("\n");
  }
  
  if (item.itemType === "closet" && item.closetConfig) {
    const config = item.closetConfig;
    const parts: string[] = [];
    
    if (config.width) parts.push(`• Ancho: ${config.width} cm`);
    if (config.height) parts.push(`• Alto: ${config.height} cm`);
    if (config.depth) parts.push(`• Profundidad: ${config.depth} cm`);
    if (config.doors) parts.push(`• Puertas: ${config.doors}`);
    if (config.drawers) parts.push(`• Cajones: ${config.drawers}`);
    
    return parts.join("\n");
  }
  
  // Para otros tipos, usar la descripción existente
  return item.description || "";
};

export function PDFContentEditor({
  open,
  onOpenChange,
  items,
  customDescriptions: initialDescriptions,
  generalNotes: initialNotes,
  onSave,
  onGeneratePDF,
  isSaving = false,
  clientName = "",
  quotationNumber = ""
}: PDFContentEditorProps) {
  const [descriptions, setDescriptions] = useState<Record<number, string>>(initialDescriptions || {});
  const [notes, setNotes] = useState(initialNotes || "");
  
  // Inicializar descripciones automáticas si no existen
  useEffect(() => {
    if (open) {
      const newDescriptions: Record<number, string> = { ...initialDescriptions };
      items.forEach((item, index) => {
        if (!newDescriptions[index]) {
          newDescriptions[index] = generateAutoDescription(item, index);
        }
      });
      setDescriptions(newDescriptions);
      setNotes(initialNotes || "");
    }
  }, [open, items, initialDescriptions, initialNotes]);
  
  const handleDescriptionChange = (index: number, value: string) => {
    setDescriptions(prev => ({
      ...prev,
      [index]: value
    }));
  };
  
  const handleSave = () => {
    onSave(descriptions, notes);
  };
  
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] -m-6 mb-4 p-6 rounded-t-lg">
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Editor de Contenido del PDF
          </DialogTitle>
          {quotationNumber && (
            <p className="text-white/80 text-sm mt-1">
              {quotationNumber} {clientName && `- ${clientName}`}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Instrucciones:</strong> Edita la descripción de cada producto para personalizar el contenido del PDF. 
              Los cambios se guardarán con la cotización y aparecerán en el documento final.
            </p>
          </div>
          
          {/* Lista de productos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Productos de la Cotización
            </h3>
            
            {items.map((item, index) => (
              <Card key={index} className="border-l-4 border-l-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      {getItemTypeName(item.itemType)}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {formatPrice(item.totalPrice)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor={`desc-${index}`} className="text-sm text-slate-600 mb-2 block">
                    Descripción detallada (aparecerá en el PDF)
                  </Label>
                  <Textarea
                    id={`desc-${index}`}
                    value={descriptions[index] || ""}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    placeholder="Escribe la descripción detallada de este producto..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Usa viñetas (•) para listar características. Cada línea aparecerá como un ítem separado.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Notas generales */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-amber-600" />
                Observaciones Generales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="general-notes" className="text-sm text-slate-600 mb-2 block">
                Notas adicionales que aparecerán al final del PDF
              </Label>
              <Textarea
                id="general-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones especiales, garantías, observaciones para el cliente..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
          
          {/* Resumen total */}
          <div className="bg-gradient-to-r from-[oklch(0.72_0.14_180)] to-[oklch(0.60_0.14_180)] rounded-lg p-4 text-white">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total de la Cotización:</span>
              <span className="text-2xl font-bold">{formatPrice(calculateTotal())}</span>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Descripciones
                </>
              )}
            </Button>
            {onGeneratePDF && (
              <Button
                type="button"
                onClick={() => {
                  handleSave();
                  onGeneratePDF();
                }}
                disabled={isSaving}
                className="bg-[oklch(0.72_0.14_180)] hover:bg-[oklch(0.60_0.14_180)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Guardar y Ver PDF
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
