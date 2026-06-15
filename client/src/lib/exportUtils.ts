/**
 * exportUtils.ts
 * Funciones utilitarias para exportación Excel y Word en INNOVAR CRM
 */
import * as XLSX from 'xlsx';

// ─── Helpers de formato ────────────────────────────────────────────────────────
export const fmtCOP = (v: number | string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);

export const fmtDate = (v: string | Date | null | undefined) => {
  if (!v) return '';
  try { return new Date(v).toLocaleDateString('es-CO'); } catch { return String(v); }
};

export const fmtPct = (v: number) => `${Math.round(v * 10) / 10}%`;

// ─── Estilos XLSX ──────────────────────────────────────────────────────────────
// SheetJS CE no soporta estilos nativamente, pero podemos usar column widths y freeze

export function autoColWidths(data: Record<string, any>[]): XLSX.ColInfo[] {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  return keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.slice(0, 200).map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
}

// ─── Descarga ──────────────────────────────────────────────────────────────────
export function downloadXlsx(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

// ─── Builder de hoja con encabezado INNOVAR ────────────────────────────────────
export function buildSheet(
  rows: Record<string, any>[],
  opts?: { freeze?: boolean }
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoColWidths(rows);
  if (opts?.freeze) ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

// ─── Libro multi-hoja ──────────────────────────────────────────────────────────
export function createWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  (wb as any).Props = {
    Title: 'INNOVAR Cocinas de Diseño',
    Author: 'INNOVAR CRM',
    CreatedDate: new Date(),
  };
  return wb;
}

export function addSheet(wb: XLSX.WorkBook, ws: XLSX.WorkSheet, name: string) {
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel limit: 31 chars
}

// ─── Timestamp para nombre de archivo ─────────────────────────────────────────
export function exportTimestamp() {
  return new Date().toISOString().slice(0, 10); // 2026-06-13
}

// ─── Etiquetas legibles ───────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending: 'Pendiente',
  diseno: 'Diseño',
  produccion: 'Producción',
  instalacion: 'Instalación',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  materiales_proyecto: 'Materiales proyecto',
  operativo: 'Operativo empresa',
};

export const CATEGORY_LABELS: Record<string, string> = {
  materiales: 'Materiales',
  mano_de_obra: 'Mano de obra',
  transporte: 'Transporte',
  alquiler: 'Alquiler',
  servicios: 'Servicios',
  mantenimiento: 'Mantenimiento',
  otros: 'Otros',
  nomina: 'Nómina',
  arrendamiento: 'Arrendamiento',
  servicios_publicos: 'Servicios públicos',
  marketing: 'Marketing',
  impuestos: 'Impuestos',
};
