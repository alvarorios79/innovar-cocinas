/**
 * Categorías de gastos (Contabilidad).
 * Compartido entre la pantalla de Contabilidad, los informes de gastos (PDF/Word)
 * y el cierre contable del servidor, para que todos muestren los mismos nombres.
 */

// Jerarquía de categorías operativas
export const OPERATIVE_HIERARCHY: Record<string, { label: string; subcategories: { value: string; label: string }[] }> = {
  bodega_admin: {
    label: "Bodega y Administración",
    subcategories: [
      { value: "arriendo", label: "Arriendo bodega" },
      { value: "energia", label: "Energía" },
      { value: "agua", label: "Agua" },
      { value: "internet", label: "Internet" },
      { value: "aseo", label: "Aseo e insumos" },
      { value: "papeleria", label: "Papelería" },
      { value: "reparaciones", label: "Reparaciones y mantenimiento" },
      { value: "jardineria", label: "Jardinería / jardín" },
    ],
  },
  vehiculos: {
    label: "Vehículos",
    subcategories: [
      { value: "gasolina_moto", label: "Gasolina Moto Innovar / Remolque" },
      { value: "gasolina_luchito", label: "Gasolina Luchito" },
      { value: "gasolina_alvaro", label: "Gasolina Álvaro" },
      { value: "taller_repuestos", label: "Taller y repuestos moto" },
    ],
  },
  nominas: {
    label: "Nóminas y Personal",
    subcategories: [
      { value: "nomina_operario", label: "Daniel Beltrán — Operario" },
      { value: "nomina_disenador", label: "Alejandro Gutiérrez — Diseñador" },
      { value: "nomina_contador", label: "Felipe Idárraga — Contador" },
      { value: "nomina_jardinero", label: "Jardinero (pago suelto)" },
      { value: "seguridad_social", label: "Seguridad social" },
      { value: "industria_comercio", label: "Industria y comercio" },
    ],
  },
  herramientas: {
    label: "Herramientas",
    subcategories: [
      { value: "compra_herramientas", label: "Compra de herramientas" },
      { value: "mantenimiento_herramientas", label: "Mantenimiento de herramientas" },
    ],
  },
  dotacion_seguridad: {
    label: "Dotación y Seguridad",
    subcategories: [
      { value: "dotacion", label: "Dotación" },
      { value: "seguridad", label: "Seguridad" },
    ],
  },
  viaticos_alimentacion: {
    label: "Viáticos, Peajes y Alimentación",
    subcategories: [
      { value: "viaticos", label: "Viáticos" },
      { value: "peajes", label: "Peajes" },
      { value: "alimentacion", label: "Alimentación" },
    ],
  },
  proveedor_insumos: {
    label: "Proveedor de Insumos",
    subcategories: [
      { value: "insumos_generales", label: "Insumos generales" },
      { value: "silicones_adhesivos", label: "Silicones y adhesivos" },
      { value: "consumibles_taller", label: "Consumibles de taller" },
    ],
  },
};

// Jerarquía de categorías para proyectos (materiales_proyecto)
// Mapea las claves de PROJECT_HIERARCHY al enum generalCategory del schema (v2)
export type GeneralCategory = "materiales" | "mano_de_obra" | "alquiler" | "servicios" | "transporte" | "mantenimiento" | "otros";
export const PROJECT_GROUP_TO_CATEGORY: Record<string, GeneralCategory> = {
  madera_tableros:  "materiales",
  herrajes:         "materiales",
  mano_de_obra:     "mano_de_obra",
  pintura_acabados: "materiales",
  transporte:       "transporte",
  otros_proyecto:   "otros",
};

export const PROJECT_HIERARCHY: Record<string, { label: string; subcategories: { value: string; label: string }[] }> = {
  madera_tableros: {
    label: "Madera y Tableros",
    subcategories: [
      { value: "mademax", label: "Mademax" },
      { value: "moduofi", label: "Moduofi" },
      { value: "metales_maderas", label: "Metales y Maderas" },
      { value: "aglocol", label: "Aglocol" },
      { value: "otro_madera", label: "Otro proveedor madera" },
    ],
  },
  herrajes: {
    label: "Herrajes",
    subcategories: [
      { value: "el_ebanista", label: "El Ebanista" },
      { value: "otro_herraje", label: "Otro proveedor herrajes" },
    ],
  },
  mano_de_obra: {
    label: "Mano de obra",
    subcategories: [
      { value: "instalacion", label: "Instalación" },
      { value: "marmol_superficies", label: "Mármol y superficies" },
      { value: "electricidad", label: "Electricidad" },
      { value: "otro_mano_obra", label: "Otro subcontratista" },
    ],
  },
  pintura_acabados: {
    label: "Pintura y acabados",
    subcategories: [
      { value: "pintura", label: "Pintura" },
      { value: "lacado", label: "Lacado / laminado" },
    ],
  },
  transporte: {
    label: "Transporte e instalación",
    subcategories: [
      { value: "transporte_materiales", label: "Transporte de materiales" },
      { value: "flete", label: "Flete instalación" },
    ],
  },
  otros_proyecto: {
    label: "Otros materiales",
    subcategories: [
      { value: "tornilleria", label: "Tornillería y fijaciones" },
      { value: "silicona_pegante", label: "Silicona y pegantes" },
      { value: "otro_proyecto", label: "Otro" },
    ],
  },
};

// Helper: buscar label de una categoría/subcategoría
export function getCategoryLabel(operativeCategory: string, subcategory?: string | null): string {
  // Buscar operativeCategory como valor de subcategoría dentro de la jerarquía
  for (const [, cat] of Object.entries(OPERATIVE_HIERARCHY)) {
    const sub = cat.subcategories.find(s => s.value === operativeCategory);
    if (sub) return `${cat.label} / ${sub.label}`;
  }
  // Buscar operativeCategory como clave de categoría padre
  const parentCat = OPERATIVE_HIERARCHY[operativeCategory];
  if (parentCat) return parentCat.label;
  // Buscar en PROJECT_HIERARCHY también
  for (const [, cat] of Object.entries(PROJECT_HIERARCHY)) {
    const sub = cat.subcategories.find(s => s.value === (subcategory || operativeCategory));
    if (sub) return `${cat.label} / ${sub.label}`;
  }
  const projCat = PROJECT_HIERARCHY[operativeCategory];
  if (projCat) return projCat.label;
  // Legacy fallback
  const legacyLabels: Record<string, string> = {
    arriendo: "Arriendo", energia: "Energía", agua: "Agua", internet: "Internet",
    mantenimiento: "Mantenimiento", herramientas: "Herramientas", jardineria: "Jardinería",
    reparaciones: "Reparaciones", transporte: "Transporte", papeleria: "Papelería",
    aseo: "Aseo", otro: "Otro",
  };
  return legacyLabels[operativeCategory] || operativeCategory;
}
