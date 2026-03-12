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

// Validar permisos de lectura de fotos según rol y categoría
export function validatePhotoViewPermission(role: string, category: string): boolean {
  if (role === "super_admin" || role === "admin") {
    return true;
  }

  if (role === "comercial" || role === "disenador") {
    // Comercial y diseñador pueden ver todas las categorías
    return true;
  }

  if (role === "jefe_taller" || role === "operario") {
    // jefe_taller y operario pueden ver:
    // - disenos: para ver planos, modelado, despiece (solo lectura)
    // - avance: para ver y subir fotos de su trabajo
    // - instalacion: para ver y subir fotos de su trabajo
    // - entrega: para ver y subir fotos finales
    return ["disenos", "avance", "instalacion", "entrega"].includes(category);
  }

  return false;
}

// Validar permisos de subida de fotos según rol y categoría
export function validatePhotoUploadPermission(role: string, category: string): boolean {
  if (role === "super_admin" || role === "admin") {
    return true;
  }

  if (role === "comercial") {
    // Comercial puede subir fotos de cotización y medidas
    return ["cotizacion", "medidas"].includes(category);
  }

  if (role === "disenador") {
    // Diseñador puede subir fotos de diseño
    return ["disenos"].includes(category);
  }

  if (role === "jefe_taller" || role === "operario") {
    // jefe_taller y operario pueden subir en:
    // - avance: fotos de producción (corte, enchape, ensamble)
    // - instalacion: fotos de instalación
    // - entrega: fotos finales
    return ["avance", "instalacion", "entrega"].includes(category);
  }

  return false;
}

// Validar permisos de eliminación de fotos según rol y categoría
export function validatePhotoDeletePermission(role: string, category: string, uploadedByUserId: number, currentUserId: number): boolean {
  if (role === "super_admin" || role === "admin") {
    return true;
  }

  if (role === "comercial" || role === "disenador") {
    // Comercial y diseñador pueden eliminar sus propias fotos
    return uploadedByUserId === currentUserId;
  }

  if (role === "jefe_taller" || role === "operario") {
    // jefe_taller y operario solo pueden eliminar fotos que ellos subieron
    // Y solo en categorías donde pueden subir (avance, instalacion, entrega)
    const canDeleteCategories = ["avance", "instalacion", "entrega"];
    return canDeleteCategories.includes(category) && uploadedByUserId === currentUserId;
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
