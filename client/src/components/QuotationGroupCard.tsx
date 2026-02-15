import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, FileText, Send, Copy, Download, FolderPlus } from "lucide-react";
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
}

export function QuotationGroupCard({
  group,
  client,
  onEdit,
  onViewPDF,
  onSend,
  onCreateVersion,
  onCreateProject,
}: QuotationGroupCardProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(group.activeVersion.id);
  const selectedVersion = group.versions.find(v => v.id === selectedVersionId) || group.activeVersion;
  const isActiveVersion = selectedVersionId === group.activeVersion.id;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "approved": return "bg-green-100 text-green-800";
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{group.quotationNumber}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {group.versionCount} versión{group.versionCount !== 1 ? "es" : ""}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {client?.name || "Cliente"} • {client?.phone || ""}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">
              ${parseFloat(selectedVersion.total || "0").toLocaleString("es-CO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <Badge className={`mt-1 ${getStatusColor(selectedVersion.status)}`}>
              {getStatusLabel(selectedVersion.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selector de versiones */}
        {group.versionCount > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Versión</label>
            <Select
              value={selectedVersionId.toString()}
              onValueChange={(value) => setSelectedVersionId(parseInt(value))}
            >
              <SelectTrigger>
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

        {/* Información de la versión seleccionada */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Subtotal:</span>
            <div className="font-semibold">
              ${parseFloat(selectedVersion.subtotal || "0").toLocaleString("es-CO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Transporte:</span>
            <div className="font-semibold">
              ${parseFloat(selectedVersion.transportCost || "0").toLocaleString("es-CO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Creada:</span>
            <div className="font-semibold">
              {new Date(selectedVersion.createdAt).toLocaleDateString("es-CO")}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Estado:</span>
            <div className="font-semibold">{getStatusLabel(selectedVersion.status)}</div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Botones disponibles para versión activa */}
          {isActiveVersion && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => onEdit(selectedVersion)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCreateVersion(selectedVersion)}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Crear Nueva Versión
              </Button>
              {!selectedVersion.projectId && (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => onCreateProject(selectedVersion)}
                >
                  <FolderPlus className="w-4 h-4" />
                  Crear Proyecto
                </Button>
              )}
            </>
          )}

          {/* Botones disponibles para todas las versiones */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewPDF(selectedVersion)}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Ver PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSend(selectedVersion)}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </Button>

          {/* Descargar PDF para versiones históricas */}
          {!isActiveVersion && selectedVersion.pdfUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const link = document.createElement("a");
                link.href = selectedVersion.pdfUrl;
                link.download = `${group.quotationNumber}-V${selectedVersion.versionNumber}.pdf`;
                link.click();
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          )}
        </div>

        {/* Indicador de versión histórica */}
        {!isActiveVersion && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            Esta es una versión histórica. No se puede editar ni crear nuevas versiones desde aquí.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
