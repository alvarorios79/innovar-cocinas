/**
 * PERMISOS CENTRALIZADOS - INNOVAR Cocinas
 * 
 * Este archivo centraliza todos los permisos del sistema para facilitar
 * el mantenimiento y evitar inconsistencias entre frontend y backend.
 */

// Tipos de roles del sistema
export type UserRole = 'super_admin' | 'admin' | 'comercial' | 'disenador' | 'jefe_taller' | 'operario';

// Estados del proyecto (14 estados después de simplificación)
export type ProjectStatus = 
  | 'contacto'              // Fusión de contacto_inicial + visita_medidas
  | 'cotizacion_enviada'
  | 'cotizacion_aprobada'
  | 'adelanto_recibido'
  | 'en_diseno'
  | 'pendiente_modelado'    // Cliente revisa modelado 3D
  | 'pendiente_render'      // Cliente revisa renders (eliminado pendiente_cliente)
  | 'aprobacion_final'
  | 'despiece'
  | 'corte'
  | 'enchape'
  | 'ensamble'
  | 'en_instalacion'     // Fusión de en_instalacion + instalacion_programada
  | 'entregado';

// Categorías de fotos
export type PhotoCategory = 'cotizacion' | 'medidas' | 'disenos' | 'avance' | 'instalacion' | 'entrega';

// Subcategorías de fotos
export type PhotoSubcategory = 
  | 'documento_cotizacion'
  | 'fotos_iniciales'
  | 'dibujo'
  | 'modelado_3d'           // Renombrado de 'modelado'
  | 'renders'
  | 'detalles'
  | 'despieces'
  | 'corte'
  | 'enchape'
  | 'armado'
  | 'proceso_instalacion'
  | 'fotos_finales';

// ============================================
// PERMISOS DE VISUALIZACIÓN DE PROYECTOS
// ============================================

/**
 * Estados que cada rol puede ver en la lista de proyectos
 */
export const VIEW_PROJECT_STATES: Record<UserRole, ProjectStatus[]> = {
  super_admin: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  admin: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  comercial: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  disenador: ['adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  jefe_taller: ['despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  operario: ['despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
};

// ============================================
// PERMISOS DE CAMBIO DE ESTADO
// ============================================

/**
 * Estados a los que cada rol puede avanzar un proyecto
 */
export const ADVANCE_STATUS_PERMISSIONS: Record<UserRole, ProjectStatus[]> = {
  super_admin: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  admin: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido', 'en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece', 'corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  comercial: ['contacto', 'cotizacion_enviada', 'cotizacion_aprobada', 'adelanto_recibido'],
  disenador: ['en_diseno', 'pendiente_modelado', 'pendiente_render', 'aprobacion_final', 'despiece'],
  jefe_taller: ['corte', 'enchape', 'ensamble', 'en_instalacion', 'entregado'],
  operario: ['corte', 'enchape', 'ensamble'],
};

// ============================================
// PERMISOS DE FOTOS
// ============================================

/**
 * Carpetas de fotos que cada rol puede ver
 */
export const VIEW_PHOTO_FOLDERS: Record<UserRole, PhotoSubcategory[]> = {
  super_admin: ['documento_cotizacion', 'fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  admin: ['documento_cotizacion', 'fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  comercial: ['documento_cotizacion', 'fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  disenador: ['fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  jefe_taller: ['modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  operario: ['modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
};

/**
 * Carpetas de fotos donde cada rol puede subir
 */
export const UPLOAD_PHOTO_FOLDERS: Record<UserRole, PhotoSubcategory[]> = {
  super_admin: ['documento_cotizacion', 'fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  admin: ['documento_cotizacion', 'fotos_iniciales', 'dibujo', 'modelado_3d', 'renders', 'detalles', 'despieces', 'corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  comercial: ['documento_cotizacion', 'fotos_iniciales', 'dibujo'],
  disenador: ['modelado_3d', 'renders', 'detalles', 'despieces'],
  jefe_taller: ['corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
  operario: ['corte', 'enchape', 'armado', 'proceso_instalacion', 'fotos_finales'],
};

// ============================================
// MAPEOS DE CARPETAS Y CATEGORÍAS
// ============================================

/**
 * Mapeo de subcategoría a categoría principal
 */
export const FOLDER_TO_CATEGORY: Record<PhotoSubcategory, PhotoCategory> = {
  documento_cotizacion: 'cotizacion',
  fotos_iniciales: 'medidas',
  dibujo: 'medidas',
  modelado_3d: 'disenos',
  renders: 'disenos',
  detalles: 'disenos',
  despieces: 'disenos',
  corte: 'avance',
  enchape: 'avance',
  armado: 'avance',
  proceso_instalacion: 'instalacion',
  fotos_finales: 'entrega',
};

/**
 * Mapeo de categoría a subcategorías
 */
export const CATEGORY_TO_FOLDERS: Record<PhotoCategory, PhotoSubcategory[]> = {
  cotizacion: ['documento_cotizacion'],
  medidas: ['fotos_iniciales', 'dibujo'],
  disenos: ['modelado_3d', 'renders', 'detalles', 'despieces'],
  avance: ['corte', 'enchape', 'armado'],
  instalacion: ['proceso_instalacion'],
  entrega: ['fotos_finales'],
};

/**
 * Etiquetas legibles para subcategorías
 */
export const FOLDER_LABELS: Record<PhotoSubcategory, string> = {
  documento_cotizacion: 'Documento Cotización',
  fotos_iniciales: 'Fotos Iniciales',
  dibujo: 'Dibujo',
  modelado_3d: 'Modelado 3D',
  renders: 'Renders',
  detalles: 'Detalles',
  despieces: 'Despieces',
  corte: 'Corte',
  enchape: 'Enchape',
  armado: 'Armado',
  proceso_instalacion: 'Proceso Instalación',
  fotos_finales: 'Fotos Finales',
};

/**
 * Etiquetas legibles para categorías
 */
export const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  cotizacion: 'Cotización',
  medidas: 'Medidas',
  disenos: 'Diseños',
  avance: 'Avance',
  instalacion: 'Instalación',
  entrega: 'Entrega',
};

/**
 * Etiquetas legibles para estados
 */
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  contacto: 'Contacto',
  cotizacion_enviada: 'Cotización Enviada',
  cotizacion_aprobada: 'Cotización Aprobada',
  adelanto_recibido: 'Adelanto Recibido',
  en_diseno: 'En Diseño',
  pendiente_modelado: 'Pendiente Modelado',
  pendiente_render: 'Pendiente Render',
  aprobacion_final: 'Aprobación Final',
  despiece: 'Despiece',
  corte: 'Corte',
  enchape: 'Enchape',
  ensamble: 'Ensamble',
  en_instalacion: 'Listo para Instalación',
  entregado: 'Entregado',
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Verifica si un rol puede ver un estado de proyecto
 */
export function canViewProjectStatus(role: UserRole, status: ProjectStatus): boolean {
  return VIEW_PROJECT_STATES[role]?.includes(status) ?? false;
}

/**
 * Verifica si un rol puede avanzar a un estado
 */
export function canAdvanceToStatus(role: UserRole, status: ProjectStatus): boolean {
  return ADVANCE_STATUS_PERMISSIONS[role]?.includes(status) ?? false;
}

/**
 * Verifica si un rol puede ver una carpeta de fotos
 */
export function canViewPhotoFolder(role: UserRole, folder: PhotoSubcategory): boolean {
  return VIEW_PHOTO_FOLDERS[role]?.includes(folder) ?? false;
}

/**
 * Verifica si un rol puede subir a una carpeta de fotos
 */
export function canUploadToFolder(role: UserRole, folder: PhotoSubcategory): boolean {
  return UPLOAD_PHOTO_FOLDERS[role]?.includes(folder) ?? false;
}

/**
 * Verifica si un rol puede eliminar una foto
 * - Admin/Super Admin/Comercial pueden eliminar cualquier foto
 * - Diseñador/Jefe Taller/Operario solo pueden eliminar sus propias fotos
 */
export function canDeletePhoto(role: UserRole, photoUploadedBy: number | null, userId: number): boolean {
  if (['super_admin', 'admin', 'comercial'].includes(role)) {
    return true;
  }
  return photoUploadedBy === userId;
}

/**
 * Verifica si un rol puede ver información financiera
 */
export function canViewFinancialInfo(role: UserRole): boolean {
  return ['super_admin', 'admin', 'comercial'].includes(role);
}

/**
 * Verifica si un rol puede ver información completa del cliente
 */
export function canViewFullClientInfo(role: UserRole): boolean {
  // Diseñador solo ve nombre y dirección
  if (role === 'disenador') {
    return false;
  }
  return ['super_admin', 'admin', 'comercial', 'jefe_taller'].includes(role);
}

/**
 * Obtiene las carpetas visibles para un rol en una categoría
 */
export function getVisibleFoldersForCategory(role: UserRole, category: PhotoCategory): PhotoSubcategory[] {
  const categoryFolders = CATEGORY_TO_FOLDERS[category] || [];
  const viewableFolders = VIEW_PHOTO_FOLDERS[role] || [];
  return categoryFolders.filter(folder => viewableFolders.includes(folder));
}

/**
 * Obtiene las carpetas donde un rol puede subir en una categoría
 */
export function getUploadableFoldersForCategory(role: UserRole, category: PhotoCategory): PhotoSubcategory[] {
  const categoryFolders = CATEGORY_TO_FOLDERS[category] || [];
  const uploadableFolders = UPLOAD_PHOTO_FOLDERS[role] || [];
  return categoryFolders.filter(folder => uploadableFolders.includes(folder));
}
