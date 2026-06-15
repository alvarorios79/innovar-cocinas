import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench } from "lucide-react";

interface HardwareSelection {
  hardwareId: number;
  name: string;
  price: string;
  quantity: number;
  subtotal: number;
}

interface HardwareSelectorForQuotationProps {
  itemIndex: number;
  selectedHardware: HardwareSelection[];
  onHardwareChange: (selections: HardwareSelection[]) => void;
}

export function HardwareSelectorForQuotation({ selectedHardware, onHardwareChange }: HardwareSelectorForQuotationProps) {
  const [selectedCategory, setSelectedCategory] = useState<"cocinas" | "closets" | "puertas">("cocinas");
  
  const { data: catalog = [], isLoading } = trpc.hardwareCatalog.list.useQuery({ category: selectedCategory });

  const handleToggleHardware = (hardware: any, checked: boolean) => {
    if (checked) {
      const newSelection: HardwareSelection = {
        hardwareId: hardware.id,
        name: hardware.name,
        price: hardware.price || "0",
        quantity: 1,
        subtotal: parseFloat(hardware.price || "0"),
      };
      onHardwareChange([...selectedHardware, newSelection]);
    } else {
      onHardwareChange(selectedHardware.filter(s => s.hardwareId !== hardware.id));
    }
  };

  const handleQuantityChange = (hardwareId: number, quantity: number) => {
    const updated = selectedHardware.map(s => {
      if (s.hardwareId === hardwareId) {
        const newQuantity = Math.max(1, quantity);
        return {
          ...s,
          quantity: newQuantity,
          subtotal: parseFloat(s.price) * newQuantity,
        };
      }
      return s;
    });
    onHardwareChange(updated);
  };

  const isSelected = (hardwareId: number) => {
    return selectedHardware.some(s => s.hardwareId === hardwareId);
  };

  const getQuantity = (hardwareId: number) => {
    const selection = selectedHardware.find(s => s.hardwareId === hardwareId);
    return selection?.quantity || 1;
  };

  const totalPrice = selectedHardware.reduce((sum, s) => sum + s.subtotal, 0);

  return (
    <Card className="mt-4 border-[rgba(106,207,199,0.18)]">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(106,207,199,0.12)]">
          <Wrench className="h-5 w-5 text-white/60" />
          <h4 className="font-bold text-white/90 text-lg">Selección de Herrajes</h4>
        </div>

        <div className="space-y-4">
          {/* Filtro por categoría */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "cocinas"
                  ? "bg-slate-700 text-white"
                  : "bg-[#0F2222] text-white/85 hover:bg-slate-200"
              }`}
              onClick={() => setSelectedCategory("cocinas")}
            >
              Herrajes de Cocina
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "closets"
                  ? "bg-slate-700 text-white"
                  : "bg-[#0F2222] text-white/85 hover:bg-slate-200"
              }`}
              onClick={() => setSelectedCategory("closets")}
            >
              Herrajes de Closet
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "puertas"
                  ? "bg-slate-700 text-white"
                  : "bg-[#0F2222] text-white/85 hover:bg-slate-200"
              }`}
              onClick={() => setSelectedCategory("puertas")}
            >
              Herrajes de Puerta
            </button>
          </div>

          {/* Lista de herrajes */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/45" />
            </div>
          ) : catalog.length === 0 ? (
            <div className="text-center py-8 text-white/45 bg-[#0F2222] rounded-lg">
              No hay herrajes disponibles en esta categoría
            </div>
          ) : (
            <div className="space-y-3">
              {catalog.map((hardware: any) => {
                const selected = isSelected(hardware.id);
                const quantity = getQuantity(hardware.id);
                const price = parseFloat(hardware.price || "0");

                return (
                  <div
                    key={hardware.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      selected ? "bg-[#0F2222] border-slate-400" : "bg-[#162828] border-[rgba(106,207,199,0.12)] hover:border-[rgba(106,207,199,0.18)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => handleToggleHardware(hardware, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[rgba(106,207,199,0.18)] text-white/60 focus:ring-slate-500"
                      />

                      {/* Imagen miniatura */}
                      <div className="w-16 h-16 flex-shrink-0 bg-[#0F2222] rounded overflow-hidden">
                        {hardware.photoUrl ? (
                          <img
                            src={hardware.photoUrl}
                            alt={hardware.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/35">
                            Sin foto
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white/90">{hardware.name}</h4>
                            {hardware.description && (
                              <p className="text-sm text-white/45 line-clamp-1">
                                {hardware.description}
                              </p>
                            )}
                          </div>
                          <Badge className="ml-2 bg-slate-200 text-white/85 hover:bg-slate-200">
                            ${price.toLocaleString('es-CO')}
                          </Badge>
                        </div>

                        {/* Cantidad si está seleccionado */}
                        {selected && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-white/60">Cantidad:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) =>
                                  handleQuantityChange(hardware.id, parseInt(e.target.value) || 1)
                                }
                                className="w-20 h-8 bg-[#162828]"
                              />
                            </div>
                            <div className="text-sm font-semibold text-white/85">
                              Subtotal: ${(price * quantity).toLocaleString('es-CO')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumen Total */}
          {selectedHardware.length > 0 && (
            <div className="bg-slate-200 p-4 rounded-lg border border-slate-400">
              <h5 className="font-semibold text-white/90 mb-3">Resumen del Precio</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{selectedHardware.length} herraje{selectedHardware.length !== 1 ? 's' : ''} seleccionado{selectedHardware.length !== 1 ? 's' : ''}:</span>
                  <span className="font-medium">${totalPrice.toLocaleString('es-CO')}</span>
                </div>
                <div className="border-t border-slate-400 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-slate-900">TOTAL:</span>
                  <span className="text-2xl font-bold text-slate-900">${totalPrice.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
