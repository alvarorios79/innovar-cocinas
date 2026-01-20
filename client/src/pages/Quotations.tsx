import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Plus, Trash2, FileText, Send, Eye } from "lucide-react";
import { toast } from "sonner";

interface QuotationItem {
  itemNumber: number;
  description: string;
  quantity: string;
  unitPrice?: string;
  totalPrice: number;
  includesFixedCosts?: boolean;
}

export default function Quotations() {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState("Alvaro Gutierrez");
  const [workType, setWorkType] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([
    { itemNumber: 1, description: "", quantity: "", totalPrice: 0, includesFixedCosts: false },
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
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar email");
    },
  });

  const resetForm = () => {
    setEditingQuotation(null);
    setSelectedClient(null);
    setVendorName("Alvaro Gutierrez");
    setWorkType("");
    setItems([{ itemNumber: 1, description: "", quantity: "", totalPrice: 0, includesFixedCosts: false }]);
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
      setWorkType(quotation.workType);
      
      // Cargar items si existen
      if (quotationData && quotationData.items && Array.isArray(quotationData.items)) {
        setItems(quotationData.items.map((item: any) => ({
          itemNumber: item.itemNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice || "",
          totalPrice: item.totalPrice,
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
        description: "",
        quantity: "",
        totalPrice: 0,
        includesFixedCosts: false,
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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (!workType) {
      toast.error("Ingresa el tipo de trabajo");
      return;
    }

    if (items.some((item) => !item.description || !item.quantity)) {
      toast.error("Completa todos los items");
      return;
    }

    if (editingQuotation) {
      // Actualizar cotización existente
      updateQuotation.mutate({
        id: editingQuotation,
        clientId: selectedClient,
        vendorName,
        workType,
        items,
      });
    } else {
      // Crear nueva cotización
      createQuotation.mutate({
        clientId: selectedClient,
        vendorName,
        workType,
        items,
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
                    <span className="font-medium">Trabajo:</span> {quot.workType}
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

                  {quot.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(quot.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Enviar cotización por email a ${quot.client?.email}?`)) {
                            sendByEmail.mutate({ id: quot.id });
                          }
                        }}
                        disabled={sendByEmail.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar Email
                      </Button>
                    </>
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
              <Label>Tipo de Trabajo *</Label>
              <Input
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                placeholder="Ej: Cocina Integral, Closet, Puertas..."
              />
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
                              
                              if (e.target.checked && !wasChecked) {
                                // Agregar $600,000
                                newItems[index].totalPrice = currentTotal + 600000;
                              } else if (!e.target.checked && wasChecked) {
                                // Restar $600,000
                                newItems[index].totalPrice = Math.max(0, currentTotal - 600000);
                              }
                              
                              newItems[index].includesFixedCosts = e.target.checked;
                              setItems(newItems);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor={`fixedCosts-${index}`} className="text-sm font-normal cursor-pointer">
                            Incluye transporte e imprevistos ($600,000)
                          </Label>
                        </div>
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
    </div>
  );
}
