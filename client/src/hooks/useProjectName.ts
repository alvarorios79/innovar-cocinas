import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { extractProjectId, isProjectFormat } from '@/lib/projectNameParser';

/**
 * Hook para obtener el nombre del proyecto desde la BD
 * Si projectClientName está en formato "Proyecto #XXXX", extrae el ID y obtiene el nombre real
 * Si es "Operativo", devuelve "Operativo"
 */
export function useProjectName(projectClientName: string | null | undefined) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectClientName) {
      setDisplayName(null);
      return;
    }

    // Si es "Operativo", mostrar directamente
    if (projectClientName === 'Operativo' || projectClientName.toLowerCase() === 'operativo') {
      setDisplayName('Operativo');
      return;
    }

    // Si no está en formato "Proyecto #XXXX", mostrar como está
    if (!isProjectFormat(projectClientName)) {
      setDisplayName(projectClientName);
      return;
    }

    // Extraer el ID del proyecto
    const projectId = extractProjectId(projectClientName);
    if (!projectId) {
      setDisplayName(projectClientName);
      return;
    }

    // Obtener el nombre del proyecto desde la BD
    setIsLoading(true);
    // Aquí iría una llamada a tRPC para obtener el nombre del proyecto
    // Por ahora, solo mostramos el ID extraído
    setDisplayName(projectClientName);
    setIsLoading(false);
  }, [projectClientName]);

  return { displayName, isLoading };
}
