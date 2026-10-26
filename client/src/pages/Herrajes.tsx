import { trpc } from "@/lib/trpc";
import { HardwareCatalogAdmin } from "@/components/HardwareCatalogAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Herrajes() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const utils = trpc.useUtils();

  const initMutation = trpc.hardwareCatalog.initializeCatalog.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.hardwareCatalog.list.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al inicializar catálogo");
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(106,207,199,0.15)", border: "1px solid rgba(106,207,199,0.3)" }}
          >
            <Package className="h-5 w-5" style={{ color: "#6ACFC7" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Catálogo de Herrajes</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Gestiona los herrajes disponibles para cotizaciones y proyectos
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
            style={{
              borderColor: "rgba(106,207,199,0.3)",
              color: "#6ACFC7",
              background: "rgba(106,207,199,0.07)",
            }}
          >
            {initMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Inicializar Catálogo
          </Button>
        )}
      </div>

      {/* Info */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "rgba(106,207,199,0.07)",
          border: "1px solid rgba(106,207,199,0.2)",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <p>
          <span className="font-semibold" style={{ color: "#6ACFC7" }}>Herrajes con precio &gt; $0</span>
          {" "}— se cobran como adicionales en la cotización (ej. herraje alacena, esquinero, basurero, botellero).
        </p>
        <p className="mt-1">
          <span className="font-semibold" style={{ color: "#6ACFC7" }}>Herrajes con precio $0</span>
          {" "}— informativos, incluidos en el precio base. Sirven para que el equipo (operarios, diseñador, jefe de taller) vea qué herrajes lleva cada proyecto.
        </p>
      </div>

      {/* Catálogo */}
      <HardwareCatalogAdmin />
    </div>
  );
}
