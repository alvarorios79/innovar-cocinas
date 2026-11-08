import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Box, Eye } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { MaterialsForm } from "@/components/MaterialsForm";
import { HardwareSelector } from "@/components/HardwareSelector";
import { canEditMaterials } from "@shared/materials";

/**
 * Pestaña "Materiales" del proyecto: madera, mesón y herrajes que lleva el proyecto.
 * Oficina (super_admin, admin, comercial, diseñador) elige; taller (jefe_taller, operario) consulta.
 */
export function ProjectMaterialsPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const readOnly = !canEditMaterials(user?.role);

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
          <Eye className="h-4 w-4 shrink-0" />
          Estos son los materiales y herrajes que lleva este proyecto.
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Madera y mesón
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MaterialsForm projectId={projectId} readOnly={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            Herrajes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <HardwareSelector projectId={projectId} readOnly={readOnly} />
        </CardContent>
      </Card>
    </div>
  );
}
