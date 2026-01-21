import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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
  console.log('[HardwareSelector] Component rendered with props:', { selectedHardware, onHardwareChange: typeof onHardwareChange });
  const [selectedCategory, setSelectedCategory] = useState<"cocinas" | "closets" | "puertas">("cocinas");
  
  const { data: catalog = [], isLoading } = trpc.hardwareCatalog.list.useQuery({ category: selectedCategory });
  console.log('[HardwareSelector] Catalog loaded:', { category: selectedCategory, count: catalog.length, isLoading });

  const handleToggleHardware = (hardware: any, checked: boolean) => {
    console.log('[HardwareSelector] handleToggleHardware called:', { hardwareName: hardware.name, checked, currentSelections: selectedHardware });
    if (checked) {
      // Agregar herraje con cantidad 1
      const newSelection: HardwareSelection = {
        hardwareId: hardware.id,
        name: hardware.name,
        price: hardware.price || "0",
        quantity: 1,
        subtotal: parseFloat(hardware.price || "0"),
      };
      onHardwareChange([...selectedHardware, newSelection]);
    } else {
      // Remover herraje
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
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <h3 className="font-semibold text-lg">Selección de Herrajes</h3>

      {/* Filtro por categoría */}
      <div className="flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded text-sm ${
            selectedCategory === "cocinas"
              ? "bg-primary text-primary-foreground"
              : "bg-background border"
          }`}
          onClick={() => setSelectedCategory("cocinas")}
        >
          Herrajes de Cocina
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded text-sm ${
            selectedCategory === "closets"
              ? "bg-primary text-primary-foreground"
              : "bg-background border"
          }`}
          onClick={() => setSelectedCategory("closets")}
        >
          Herrajes de Closet
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded text-sm ${
            selectedCategory === "puertas"
              ? "bg-primary text-primary-foreground"
              : "bg-background border"
          }`}
          onClick={() => setSelectedCategory("puertas")}
        >
          Herrajes de Puerta
        </button>
      </div>

      {/* Lista de herrajes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : catalog.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
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
                className={`border rounded-lg p-3 ${
                  selected ? "bg-blue-50 border-blue-300" : "bg-background"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => handleToggleHardware(hardware, e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />

                  {/* Imagen miniatura */}
                  <div className="w-16 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                    {hardware.photoUrl ? (
                      <img
                        src={hardware.photoUrl}
                        alt={hardware.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{hardware.name}</h4>
                        {hardware.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {hardware.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        ${price.toLocaleString('es-CO')}
                      </Badge>
                    </div>

                    {/* Cantidad si está seleccionado */}
                    {selected && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Cantidad:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) =>
                              handleQuantityChange(hardware.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 h-8"
                          />
                        </div>
                        <div className="text-sm font-semibold text-primary">
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

      {/* Total */}
      {selectedHardware.length > 0 && (
        <div className="p-4 bg-green-50 rounded">
          <p className="text-lg font-bold text-green-800">
            Total Herrajes: ${totalPrice.toLocaleString('es-CO')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedHardware.length} herraje{selectedHardware.length !== 1 ? 's' : ''} seleccionado{selectedHardware.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
