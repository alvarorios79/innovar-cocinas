import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Edit, FileText, Send, Copy, Download, FolderPlus, FileEdit, Lock, Trash2, Image as ImageIcon } from "lucide-react";
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
  
  // Calcular días hasta vencimiento
  const daysUntilExpiry = Math.ceil((validUntilDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 2 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  const cardBorderClass = isExpired ? 'border-l-red-500' : isExpiringSoon ? 'border-l-yellow-500' : 'border-l-[#14B8A6]';
  const cardBgClass = isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : 'bg-white';

  return (
    <Card className={`w-full overflow-hidden shadow-sm border-l-2 ${cardBorderClass} ${cardBgClass}`}>
      {/* HEADER COMPACTO - UNA SOLA LÍNEA */}
      <div className={`px-3 py-2 md:px-3 md:py-2 border-b border-gray-200 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : 'bg-white'}`}>
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          {/* Thumbnail pequeño */}
          <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {selectedVersion.thumbnailUrl ? (
              <img 
                src={selectedVersion.thumbnailUrl} 
                alt="Thumbnail" 
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {/* Información principal en una línea */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                {group.quotationNumber}
              </h3>
              {isActiveVersion && (
                <Badge className="bg-[#14B8A6] text-white text-xs py-0 px-2">
                  Activa
                </Badge>
              )}
              {group.versionCount > 1 && (
                <Badge variant="outline" className="text-xs py-0 px-2 text-gray-600">
                  {group.versionCount}v
                </Badge>
              )}
              <Badge className={`${getStatusColor(selectedVersion.status)} text-xs py-0 px-2 border-0`}>
                {getStatusLabel(selectedVersion.status)}
              </Badge>
              {isExpired && (
                <Badge className="bg-red-500 text-white text-xs py-0 px-2 border-0">
                  Vencida
                </Badge>
              )}
              {isExpiringSoon && !isExpired && (
                <Badge className="bg-yellow-500 text-white text-xs py-0 px-2 border-0">
                  Vence pronto
                </Badge>
              )}
              {selectedVersion.projectId ? (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs py-0 px-2 border border-emerald-300 flex items-center gap-1">
                  <span className="text-base">✅</span>
                  <span>Proyecto</span>
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 text-xs py-0 px-2 border border-red-300 flex items-center gap-1">
                  <span className="text-base">❌</span>
                  <span>Sin Proyecto</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {client?.name || "Cliente"} {client?.phone && `• ${client.phone}`}
            </p>
          </div>

          {/* Total y fechas compactas */}
          <div className="flex-shrink-0 text-right">
            <div className="text-sm md:text-base font-bold text-gray-900">
              {showValues ? (
                `$${parseFloat(selectedVersion.total || "0").toLocaleString("es-CO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              ) : (
                <span className="text-gray-400 text-xs">••••••••</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
              <div>Crea: {createdDate.toLocaleDateString('es-CO', { month: '2-digit', day: '2-digit' })}</div>
              <div>Vence: {validUntilDate.toLocaleDateString('es-CO', { month: '2-digit', day: '2-digit' })}</div>
            </div>
          </div>
        </div>

        {/* Selector de versión compacto - Solo si hay múltiples versiones */}
        {group.versionCount > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Versión:</label>
            <Select
              value={selectedVersionId.toString()}
              onValueChange={(value) => setSelectedVersionId(parseInt(value))}
            >
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.versions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    V{version.versionNumber}
                    {version.id === group.activeVersion.id ? " (Activa)" : " (Hist)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <CardContent className="px-3 py-2 md:px-3 md:py-2 space-y-2">
        {/* Sección de Precios - Colapsable compacta */}
        {isActiveVersion && (
          <div className="border-b border-gray-200 pb-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className="w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>Precios</span>
              {showValues ? (
                <EyeOff className="w-3 h-3 text-gray-500" />
              ) : (
                <Eye className="w-3 h-3 text-gray-500" />
              )}
            </button>
            
            {showValues && (
              <div className="mt-1 p-2 rounded bg-[#14B8A6]/5 border border-[#14B8A6]/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">
                    ${parseFloat(selectedVersion.subtotal || "0").toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transporte:</span>
                  <span className="font-semibold">
                    ${parseFloat(selectedVersion.transportCost || "0").toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones - Jerarquía clara y compacta */}
        <div className="flex flex-wrap gap-1">
          {/* PRIMARIOS - Editar disponible para cualquier versión */}
          <Button
            size="sm"
            className="text-xs py-1 px-2 h-7 gap-1 bg-[#14B8A6] hover:bg-[#0d9488] text-white"
            onClick={() => onEdit(selectedVersion)}
            disabled={isLocked}
          >
            <Edit className="w-3 h-3" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          
          {isActiveVersion && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2 h-7 gap-1"
              onClick={() => onCreateVersion(selectedVersion)}
              disabled={isLocked}
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">V.Nueva</span>
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="text-xs py-1 px-2 h-7 gap-1"
            onClick={() => onViewPDF(selectedVersion)}
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">PDF</span>
          </Button>

          {/* SECUNDARIOS */}
          {isActiveVersion && !selectedVersion.projectId && (
            <Button
              size="sm"
              className="text-xs py-1 px-2 h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onCreateProject(selectedVersion)}
              disabled={isLocked}
            >
              <FolderPlus className="w-3 h-3" />
              <span className="hidden sm:inline">Proyecto</span>
            </Button>
          )}

          {isActiveVersion && onEditPDF && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2 h-7 gap-1"
              onClick={() => onEditPDF(selectedVersion)}
              disabled={isLocked}
            >
              <FileEdit className="w-3 h-3" />
              <span className="hidden sm:inline">Edit.PDF</span>
            </Button>
          )}

          {isActiveVersion && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2 h-7 gap-1"
              onClick={() => onSend(selectedVersion)}
              disabled={isLocked}
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          )}

          {isActiveVersion && (
            <Button
              size="sm"
              className="text-xs py-1 px-2 h-7 gap-1 bg-[#14B8A6] hover:bg-[#0d9488] text-white"
              onClick={() => {
                if (!client?.phone) {
                  toast.error("El cliente no tiene número de teléfono registrado");
                  return;
                }
                toast.info("Enviando por WhatsApp API...");
              }}
              disabled={isLocked || !client?.phone}
              title={client?.phone ? "Enviar cotización por WhatsApp API" : "Cliente sin teléfono registrado"}
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}

          {!isActiveVersion && selectedVersion.pdfUrl && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2 h-7 gap-1"
              onClick={() => {
                const link = document.createElement("a");
                link.href = selectedVersion.pdfUrl;
                link.download = `${group.quotationNumber}-V${selectedVersion.versionNumber}.pdf`;
                link.click();
              }}
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Descar</span>
            </Button>
          )}

          {/* CONTROL - Discretos */}
          {isActiveVersion && onToggleLock && (
            <Button
              size="sm"
              variant={isLocked ? "default" : "outline"}
              className={`text-xs py-1 px-2 h-7 gap-1 ${isLocked ? "bg-gray-800 hover:bg-gray-900" : ""}`}
              onClick={() => onToggleLock(selectedVersion)}
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">{isLocked ? "Bloq" : "Bloquear"}</span>
            </Button>
          )}

          {isActiveVersion && onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="text-xs py-1 px-2 h-7 gap-1"
              onClick={() => onDelete(selectedVersion)}
              disabled={isLocked}
              title={isLocked ? "Desbloquea la cotización para poder eliminar" : "Eliminar cotización"}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Elim</span>
            </Button>
          )}
        </div>

        {/* Indicador de versión histórica */}
        {!isActiveVersion && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Versión histórica - Solo lectura
          </div>
        )}

        {/* Sección de Notas */}
        {isActiveVersion && (
          <div className="mt-3 p-3 rounded bg-pink-50 border border-pink-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Notas del Cliente</label>
              <div className="flex gap-1">
                <select className="text-xs px-2 py-1 rounded border border-pink-300 bg-white">
                  <option value="">Sin estado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="revision">Revisión</option>
                </select>
              </div>
            </div>
            <textarea
              className="w-full text-xs p-2 rounded border border-pink-300 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="Ingresa la respuesta del cliente aquí..."
              rows={2}
              defaultValue={selectedVersion.clientResponseNotes || ""}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
