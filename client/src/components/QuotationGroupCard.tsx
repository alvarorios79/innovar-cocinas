import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Edit, FileText, Send, Copy, Download, FolderPlus, FileEdit, Lock, Trash2, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QuotationGroupCardProps {
  group: {
    baseQuotationId: number;
    quotationNumber: string;
    clientId: number;
    versions: any[];
    activeVersion: any;
    versionCount: number;
  };
  client: any;
  onEdit: (quotation: any) => void;
  onViewPDF: (quotation: any) => void;
  onSend: (quotation: any) => void;
  onCreateVersion: (quotation: any) => void;
  onCreateProject: (quotation: any) => void;
  onEditPDF?: (quotation: any) => void;
  onToggleLock?: (quotation: any) => void;
  onDelete?: (quotation: any) => void;
}

export function QuotationGroupCard({
  group,
  client,
  onEdit,
  onViewPDF,
  onSend,
  onCreateVersion,
  onCreateProject,
  onEditPDF,
  onToggleLock,
  onDelete,
}: QuotationGroupCardProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(group.activeVersion.id);
  const [showValues, setShowValues] = useState(false);
  const [expandDetails, setExpandDetails] = useState(false);
  
  const selectedVersion = group.versions.find(v => v.id === selectedVersionId) || group.activeVersion;
  const isActiveVersion = selectedVersionId === group.activeVersion.id;
  const isLocked = selectedVersion.isLocked;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "approved": return "bg-emerald-100 text-emerald-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Borrador";
      case "sent": return "Enviada";
      case "approved": return "Aprobada";
      case "rejected": return "Rechazada";
      default: return status;
    }
  };

  const calculateEstimatedDelivery = (createdDate: Date | string) => {
    const startDate = new Date(createdDate);
    let businessDays = 0;
    let currentDate = new Date(startDate);

    while (businessDays < 25) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    return currentDate;
  };

  const createdDate = new Date(selectedVersion.createdAt);
  const validUntilDate = selectedVersion.validUntil ? new Date(selectedVersion.validUntil) : new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const estimatedDeliveryDate = calculateEstimatedDelivery(createdDate);

  return (
    <Card className="w-full overflow-hidden shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-teal-500">
      {/* HEADER - Información principal */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{group.quotationNumber}</h3>
              {isActiveVersion && (
                <Badge className="bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                  Activa
                </Badge>
              )}
              {group.versionCount > 1 && (
                <Badge variant="outline" className="text-xs text-gray-600">
                  {group.versionCount} versión{group.versionCount !== 1 ? "es" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {client?.name || "Cliente"} {client?.phone && `• ${client.phone}`}
            </p>
          </div>
          
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {showValues ? (
                `$${parseFloat(selectedVersion.total || "0").toLocaleString("es-CO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              ) : (
                <span className="text-gray-400">••••••••</span>
              )}
            </div>
            <Badge className={`${getStatusColor(selectedVersion.status)} border-0`}>
              {getStatusLabel(selectedVersion.status)}
            </Badge>
          </div>
        </div>

        {/* Fechas importantes - Fila compacta */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-xs">
          <div>
            <span className="text-gray-500 block font-medium">Creación</span>
            <span className="text-gray-900 font-semibold">{createdDate.toLocaleDateString('es-CO')}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Válida hasta</span>
            <span className="text-gray-900 font-semibold">{validUntilDate.toLocaleDateString('es-CO')}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Entrega est.*</span>
            <span className="text-gray-900 font-semibold">{estimatedDeliveryDate.toLocaleDateString('es-CO')}</span>
          </div>
        </div>
      </div>

      <CardContent className="px-6 py-4">
        {/* Selector de versiones - Solo si hay múltiples versiones */}
        {group.versionCount > 1 && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Versión</label>
            <Select
              value={selectedVersionId.toString()}
              onValueChange={(value) => setSelectedVersionId(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.versions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    V{version.versionNumber}
                    {version.id === group.activeVersion.id ? " (Activa)" : " (Histórica)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sección de Precios - Colapsable */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <button
            onClick={() => setShowValues(!showValues)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Información de Precios</span>
            <div className="flex items-center gap-2">
              {showValues ? (
                <EyeOff className="w-4 h-4 text-gray-600" />
              ) : (
                <Eye className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </button>
          
          {showValues && (
            <div className="mt-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 text-xs font-medium block mb-1">Subtotal</span>
                  <div className="text-lg font-bold text-gray-900">
                    ${parseFloat(selectedVersion.subtotal || "0").toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-xs font-medium block mb-1">Transporte</span>
                  <div className="text-lg font-bold text-gray-900">
                    ${parseFloat(selectedVersion.transportCost || "0").toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción - Jerarquía clara */}
        <div className="space-y-3">
          {/* Botones principales - Fila 1 */}
          <div className="flex flex-col sm:flex-row gap-2">
            {isActiveVersion && (
              <>
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                  onClick={() => onEdit(selectedVersion)}
                  disabled={isLocked}
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none gap-2 font-medium"
                  onClick={() => onCreateVersion(selectedVersion)}
                  disabled={isLocked}
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Nueva Versión</span>
                  <span className="sm:hidden">V. Nueva</span>
                </Button>
              </>
            )}
            
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none gap-2 font-medium"
              onClick={() => onViewPDF(selectedVersion)}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Ver PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>

          {/* Botones secundarios - Fila 2 */}
          <div className="flex flex-col sm:flex-row gap-2">
            {isActiveVersion && !selectedVersion.projectId && (
              <Button
                size="sm"
                className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={() => onCreateProject(selectedVersion)}
                disabled={isLocked}
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Crear Proyecto</span>
                <span className="sm:hidden">Proyecto</span>
              </Button>
            )}

            {isActiveVersion && onEditPDF && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none gap-2 font-medium"
                onClick={() => onEditPDF(selectedVersion)}
                disabled={isLocked}
              >
                <FileEdit className="w-4 h-4" />
                <span className="hidden sm:inline">Editar PDF</span>
                <span className="sm:hidden">Edit PDF</span>
              </Button>
            )}

            {isActiveVersion && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none gap-2 font-medium"
                onClick={() => onSend(selectedVersion)}
                disabled={isLocked}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
                <span className="sm:hidden">Enviar</span>
              </Button>
            )}

            {!isActiveVersion && selectedVersion.pdfUrl && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none gap-2 font-medium"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = selectedVersion.pdfUrl;
                  link.download = `${group.quotationNumber}-V${selectedVersion.versionNumber}.pdf`;
                  link.click();
                }}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
                <span className="sm:hidden">Descar.</span>
              </Button>
            )}
          </div>

          {/* Botones de control - Fila 3 */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
            {isActiveVersion && onToggleLock && (
              <Button
                size="sm"
                variant={isLocked ? "default" : "outline"}
                className={`flex-1 sm:flex-none gap-2 font-medium ${isLocked ? "bg-gray-800 hover:bg-gray-900" : ""}`}
                onClick={() => onToggleLock(selectedVersion)}
              >
                <Lock className="w-4 h-4" />
                {isLocked ? "Bloqueada" : "Bloquear"}
              </Button>
            )}

            {isActiveVersion && onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 sm:flex-none gap-2 font-medium"
                onClick={() => onDelete(selectedVersion)}
                disabled={isLocked}
                title={isLocked ? "Desbloquea la cotización para poder eliminar" : "Eliminar cotización"}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar</span>
                <span className="sm:hidden">Elim.</span>
              </Button>
            )}
          </div>
        </div>

        {/* Indicador de versión histórica */}
        {!isActiveVersion && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
            ℹ️ Versión histórica - No se puede editar desde aquí
          </div>
        )}
      </CardContent>
    </Card>
  );
}
