/**
 * Funciones helper compartidas entre routers.
 * Extraídas del router monolítico original.
 */

// Validar permisos de cambio de estado de proyecto
export function validateStatusChange(role: string, currentStatus: string, newStatus: string): boolean {
  // Super admin y admin pueden hacer cualquier cambio
  if (role === "super_admin" || role === "admin") return true;

  // Diseñador puede:
  // - adelanto_recibido -> en_diseno (empezar a diseñar)
  // - en_diseno -> pendiente_modelado/pendiente_render (entregar diseño)
  // - aprobacion_final -> despiece (hacer despiece)
  if (role === "disenador") {
    if (currentStatus === "adelanto_recibido" && newStatus === "en_diseno") return true;
    if (currentStatus === "en_diseno" && (newStatus === "pendiente_modelado" || newStatus === "pendiente_render")) return true;
    if (currentStatus === "pendiente_modelado" && newStatus === "en_diseno") return true; // Cliente solicita cambios en modelado
    if (currentStatus === "pendiente_render" && newStatus === "en_diseno") return true; // Cliente solicita cambios en render
    if (currentStatus === "aprobacion_final" && newStatus === "despiece") return true;
    return false;
  }

  // Jefe de taller puede:
  // - despiece -> corte (pasar a producción)
  // - corte -> enchape -> ensamble -> listo_instalacion -> entregado
  if (role === "jefe_taller") {
    if (currentStatus === "despiece" && newStatus === "corte") return true;
    const productionFlow = ["corte", "enchape", "ensamble", "listo_instalacion", "entregado"];
    const currentIndex = productionFlow.indexOf(currentStatus);
    const newIndex = productionFlow.indexOf(newStatus);
    if (currentIndex >= 0 && newIndex === currentIndex + 1) return true;
    return false;
  }

  // Operario puede: corte -> enchape -> ensamble -> listo_instalacion
  // Ayuda al jefe de taller con el avance de producción
  if (role === "operario") {
    const operarioFlow = ["corte", "enchape", "ensamble", "listo_instalacion"];
    const currentIndex = operarioFlow.indexOf(currentStatus);
    const newIndex = operarioFlow.indexOf(newStatus);
    if (currentIndex >= 0 && newIndex === currentIndex + 1) return true;
    return false;
  }

  return false;
}

// Validar permisos de subida de fotos según rol y etapa
export function validatePhotoUploadPermission(role: string, stage: string, category?: string): boolean {
  if (role === "super_admin" || role === "admin") {
    return true;
  }

  if (role === "comercial") {
    // Comercial puede subir fotos de cotización y medidas en cualquier etapa
    if (category && ["cotizacion", "medidas"].includes(category)) {
      return true;
    }
    return false;
  }

  if (role === "disenador") {
    return ["inicial", "diseno"].includes(stage);
  }

  if (role === "jefe_taller") {
    // jefe_taller puede subir en todas las etapas de producción
    return ["corte", "enchape", "ensamble", "final"].includes(stage);
  }

  if (role === "operario") {
    // operario puede subir en etapas de producción pero NO en final (fotos finales)
    return ["corte", "enchape", "ensamble"].includes(stage);
  }

  return false;
}

// Validar permisos de asignación de tareas
export function validateTaskAssignmentPermission(assignerRole: string, assignedToId: number): { allowed: boolean; message: string } {
  // Por ahora, validamos que el rol tenga permisos generales de asignar
  // La validación específica del usuario asignado se hace en getAssignableUsers
  const canAssignRoles = ["super_admin", "admin", "disenador", "jefe_taller", "operario"];
  
  if (!canAssignRoles.includes(assignerRole)) {
    return { allowed: false, message: "No tienes permisos para asignar tareas" };
  }

  return { allowed: true, message: "" };
}
