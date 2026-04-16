import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DebugSync() {
  const [projectId, setProjectId] = useState(2130117);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSync = async () => {
    setLoading(true);
    try {
      const response = await trpc.debugSync.checkProjectSync.query({
        projectId,
      });
      setResult(response);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  const forceUpdate = async () => {
    setLoading(true);
    try {
      const response = await trpc.debugSync.forceUpdateProjectAmount.mutate({
        projectId,
      });
      setResult(response);
      // Recargar la página después de 1 segundo
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Sincronización Proyecto-Cotización</h1>

      <Card className="p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">ID del Proyecto</label>
          <input
            type="number"
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={checkSync} disabled={loading}>
            {loading ? "Cargando..." : "Verificar Sincronización"}
          </Button>
          <Button onClick={forceUpdate} disabled={loading} variant="destructive">
            {loading ? "Actualizando..." : "Forzar Actualización"}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Resultado:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
