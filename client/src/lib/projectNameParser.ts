/**
 * Extrae el ID del proyecto del formato "Proyecto #XXXX"
 * Ejemplo: "Proyecto #2130113" → 2130113
 */
export function extractProjectId(projectClientName: string | null | undefined): number | null {
  if (!projectClientName) return null;
  
  const match = projectClientName.match(/#(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Verifica si el valor es un proyecto (contiene "Proyecto #")
 */
export function isProjectFormat(projectClientName: string | null | undefined): boolean {
  if (!projectClientName) return false;
  return projectClientName.includes("Proyecto #");
}
