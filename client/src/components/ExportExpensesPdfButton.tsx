/**
 * ExportExpensesPdfButton
 * Informe de gastos listo para imprimir o guardar como PDF (hoja horizontal).
 * Abre una ventana con el informe y el cuadro de impresión del navegador:
 * ahí se elige la impresora o "Guardar como PDF".
 * Mismo contenido que el informe Word (ExportExpensesWordButton).
 */
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { EXPENSE_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/exportUtils';
import type { ExpenseRow } from './ExportExpensesWordButton';

interface Props {
  expenses: ExpenseRow[];
  filter?: 'all' | 'bodega' | 'proyecto';
  title?: string;
  label?: string;
  size?: 'sm' | 'default';
}

const isProyecto = (e: ExpenseRow) => e.expenseType === 'materiales_proyecto';

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  if (!d) return '';
  // "2026-11-02" se lee como fecha local (si no, en Colombia sale el día anterior)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-CO');
  try { return new Date(d).toLocaleDateString('es-CO'); } catch { return d; }
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sum = (list: ExpenseRow[]) => list.reduce((s, e) => s + Number(e.amount || 0), 0);

function table(rows: ExpenseRow[], subtotalLabel: string): string {
  const body = rows.map(e => {
    const cat = CATEGORY_LABELS[e.generalCategory || e.operativeCategory || ''] || e.generalCategory || e.operativeCategory || '';
    const tipo = EXPENSE_TYPE_LABELS[e.expenseType] || e.expenseType || '';
    return `<tr>
      <td class="nowrap">${esc(fmtDate(e.expenseDate))}</td>
      <td>${esc(tipo)}</td>
      <td>${esc(e.description)}</td>
      <td>${esc(cat)}</td>
      <td class="num">${esc(fmtCOP(Number(e.amount || 0)))}</td>
      <td>${esc(e.notes)}</td>
    </tr>`;
  }).join('');
  return `<table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th>Monto (COP)</th><th>Notas</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="4" class="num">${esc(subtotalLabel)}</td><td colspan="2" class="num total">${esc(fmtCOP(sum(rows)))}</td></tr></tfoot>
  </table>`;
}

export function buildExpensesReportHtml(expenses: ExpenseRow[], filter: 'all' | 'bodega' | 'proyecto', title: string): string {
  const proyecto = filter === 'bodega' ? [] : expenses.filter(isProyecto);
  const bodega = filter === 'proyecto' ? [] : expenses.filter(e => !isProyecto(e));
  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const filterLabel = filter === 'proyecto' ? ' — Solo Proyecto' : filter === 'bodega' ? ' — Solo Bodega' : '';

  let html = '';
  if (filter === 'all') {
    html += `<h2>Resumen</h2>
    <table class="summary">
      <tr><td>Gastos de Proyecto</td><td class="num">${esc(fmtCOP(sum(proyecto)))}</td></tr>
      <tr><td>Gastos Operativos / Bodega</td><td class="num">${esc(fmtCOP(sum(bodega)))}</td></tr>
      <tr class="grand"><td>TOTAL GENERAL</td><td class="num">${esc(fmtCOP(sum(proyecto) + sum(bodega)))}</td></tr>
    </table>`;
  }
  if (filter !== 'bodega') {
    html += `<h2>Gastos de Proyecto</h2>`;
    html += proyecto.length ? table(proyecto, 'SUBTOTAL PROYECTO') : `<p class="empty">Sin gastos de proyecto en el período seleccionado.</p>`;
  }
  if (filter !== 'proyecto') {
    html += `<h2>Gastos Operativos / Bodega</h2>`;
    html += bodega.length ? table(bodega, 'SUBTOTAL BODEGA') : `<p class="empty">Sin gastos operativos en el período seleccionado.</p>`;
  }

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: letter landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; color: #3A3A3A; font-size: 10.5pt; margin: 0; padding: 16px; background: #fff; }
  .brand { color: #00BCD4; font-size: 20pt; font-weight: bold; margin: 0; }
  h1 { color: #1A1A2E; font-size: 15pt; margin: 2px 0; }
  .date { color: #666; margin: 0 0 14px; }
  h2 { color: #1A1A2E; font-size: 12.5pt; margin: 18px 0 6px; border-left: 4px solid #00BCD4; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  th { background: #00BCD4; color: #fff; padding: 5px 6px; border: 1px solid #ccc; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { padding: 4px 6px; border: 1px solid #ccc; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F5F5F5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tfoot td { background: #1A1A2E; color: #fff; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total { color: #00BCD4; }
  .num { text-align: right; white-space: nowrap; }
  .nowrap { white-space: nowrap; }
  .summary { width: 60%; }
  .summary .grand td { background: #1A1A2E; color: #fff; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .summary .grand .num { color: #00BCD4; }
  .empty { color: #888; }
  .foot { color: #888; font-size: 8.5pt; margin-top: 20px; }
  .toolbar { margin-bottom: 14px; }
  .toolbar button { background: #00BCD4; color: #fff; border: 0; border-radius: 6px; padding: 8px 16px; font-size: 11pt; cursor: pointer; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
  <p class="brand">INNOVAR Cocinas de Diseño</p>
  <h1>Informe de Gastos${esc(filterLabel)}</h1>
  <p class="date">Generado el ${esc(today)}</p>
  ${html}
  <p class="foot">Kilómetro 9 vía Cerritos, Pereira, Risaralda · innovarcocinasarte@gmail.com · 313 680 2025</p>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`;
}

export function ExportExpensesPdfButton({ expenses, filter = 'all', title, label = 'PDF', size = 'sm' }: Props) {
  const handleClick = () => {
    const list = filter === 'all' ? expenses : filter === 'proyecto' ? expenses.filter(isProyecto) : expenses.filter(e => !isProyecto(e));
    if (list.length === 0) { toast.warning('No hay gastos para exportar'); return; }
    const docTitle = title || `Informe_Gastos_${new Date().toISOString().slice(0, 10)}`;
    // Se abre la ventana en el mismo clic (si no, el navegador la bloquea)
    const win = window.open('', '_blank');
    if (!win) { toast.error('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.'); return; }
    win.document.open();
    win.document.write(buildExpensesReportHtml(expenses, filter, docTitle));
    win.document.close();
  };

  return (
    <Button variant="outline" size={size} onClick={handleClick} className="gap-2">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
