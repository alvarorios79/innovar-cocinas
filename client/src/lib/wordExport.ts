/**
 * wordExport.ts
 * Genera documentos Word (.doc) desde HTML sin dependencias adicionales.
 * Word/LibreOffice abren HTML guardado con MIME application/msword.
 */

/** Descarga un string HTML como archivo .doc que Word abre directamente */
export function downloadWordDoc(html: string, filename: string) {
  const fullHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: 21cm 29.7cm; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
    h1 { font-size: 18pt; color: #1DB5A8; margin-bottom: 4pt; }
    h2 { font-size: 13pt; color: #0F172A; border-bottom: 1pt solid #1DB5A8; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 6pt; }
    h3 { font-size: 11pt; color: #374151; margin-top: 10pt; margin-bottom: 4pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
    th { background-color: #0F172A; color: white; padding: 5pt 8pt; text-align: left; font-size: 10pt; }
    td { padding: 4pt 8pt; font-size: 10pt; border-bottom: 0.5pt solid #e5e7eb; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    .total-row td { background-color: #f0fdf4; font-weight: bold; border-top: 1pt solid #1DB5A8; }
    .label { color: #6b7280; font-size: 9pt; }
    .value { font-weight: bold; }
    .badge { display: inline-block; padding: 1pt 6pt; border-radius: 3pt; font-size: 9pt; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .header-block { border-left: 3pt solid #1DB5A8; padding-left: 10pt; margin-bottom: 14pt; }
    .footer { margin-top: 20pt; padding-top: 8pt; border-top: 0.5pt solid #d1d5db; font-size: 9pt; color: #9ca3af; }
    .kpi-grid { display: table; width: 100%; margin-bottom: 14pt; }
    .kpi { display: table-cell; text-align: center; padding: 8pt; border: 0.5pt solid #e5e7eb; }
    .kpi-value { font-size: 14pt; font-weight: bold; color: #1DB5A8; }
    .kpi-label { font-size: 9pt; color: #6b7280; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

  const blob = new Blob(['﻿', fullHtml], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers de formato ────────────────────────────────────────────────────────
const fmtCOP = (v: number | string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDate = (v: string | Date | null | undefined) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return String(v); }
};

const STATUS_BADGES: Record<string, string> = {
  draft: '<span class="badge badge-gray">Borrador</span>',
  sent: '<span class="badge badge-blue">Enviada</span>',
  approved: '<span class="badge badge-green">Aprobada</span>',
  rejected: '<span class="badge badge-red">Rechazada</span>',
  pending: '<span class="badge badge-gray">Pendiente</span>',
  diseno: '<span class="badge badge-blue">Diseño</span>',
  produccion: '<span class="badge badge-amber">Producción</span>',
  instalacion: '<span class="badge badge-amber">Instalación</span>',
  entregado: '<span class="badge badge-green">Entregado</span>',
  cancelado: '<span class="badge badge-red">Cancelado</span>',
};

// ─── Cotización individual ─────────────────────────────────────────────────────
export interface QuotationForWord {
  quotationNumber: string;
  versionNumber?: number;
  status: string;
  createdAt: string;
  validUntil?: string;
  total: number | string;
  discountPercentage?: number;
  totalWithDiscount?: number | string;
  notes?: string;
  client: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  items: Array<{
    itemNumber: number;
    itemType: string;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice: number | string;
  }>;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  cocina: 'Cocina Integral',
  closet: 'Closet',
  bano: 'Mueble de Baño',
  puerta: 'Puerta',
  centro_entretenimiento: 'Centro de Entretenimiento',
  escalera: 'Escalera',
  mobiliario_empresa: 'Mobiliario Empresa',
  meson: 'Mesón',
  otros: 'Otros',
};

export function generateQuotationWord(q: QuotationForWord): string {
  const discount = Number(q.discountPercentage || 0);
  const total = Number(q.total || 0);
  const totalWithDiscount = Number(q.totalWithDiscount || total);

  const itemRows = q.items.map(item => `
    <tr>
      <td>${item.itemNumber}</td>
      <td>${ITEM_TYPE_LABELS[item.itemType] || item.itemType}</td>
      <td>${item.description}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${fmtCOP(item.unitPrice)}</td>
      <td style="text-align:right"><strong>${fmtCOP(item.totalPrice)}</strong></td>
    </tr>`).join('');

  const discountRow = discount > 0 ? `
    <tr>
      <td colspan="5" style="text-align:right; color:#6b7280">Descuento (${discount}%)</td>
      <td style="text-align:right; color:#dc2626">- ${fmtCOP(total - totalWithDiscount)}</td>
    </tr>` : '';

  return `
    <div class="header-block">
      <h1>INNOVAR Cocinas de Diseño</h1>
      <p style="color:#6b7280; margin:0">Km 9 Vía Cerritos, Pereira, Risaralda · WhatsApp: 313 680 2025</p>
    </div>

    <h2>Cotización ${q.quotationNumber}${q.versionNumber && q.versionNumber > 1 ? ` — V${q.versionNumber}` : ''}</h2>

    <table style="margin-bottom:12pt">
      <tr>
        <td class="label">Estado</td><td>${STATUS_BADGES[q.status] || q.status}</td>
        <td class="label">Fecha</td><td>${fmtDate(q.createdAt)}</td>
      </tr>
      <tr>
        <td class="label">Válida hasta</td><td>${q.validUntil ? fmtDate(q.validUntil) : '—'}</td>
        <td class="label">Tiempo de entrega</td><td>3 a 4 semanas desde aprobación</td>
      </tr>
    </table>

    <h2>Datos del Cliente</h2>
    <table style="margin-bottom:12pt">
      <tr>
        <td class="label" style="width:20%">Nombre</td>
        <td class="value">${q.client.name}</td>
        <td class="label" style="width:20%">Teléfono</td>
        <td>${q.client.phone || '—'}</td>
      </tr>
      <tr>
        <td class="label">Correo</td>
        <td>${q.client.email || '—'}</td>
        <td class="label">Ciudad</td>
        <td>${q.client.city || '—'}</td>
      </tr>
      ${q.client.address ? `<tr><td class="label">Dirección</td><td colspan="3">${q.client.address}</td></tr>` : ''}
    </table>

    <h2>Ítems Cotizados</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:18%">Tipo</th>
          <th>Descripción</th>
          <th style="width:8%; text-align:center">Cant.</th>
          <th style="width:13%; text-align:right">Precio Unit.</th>
          <th style="width:13%; text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        ${discountRow}
        <tr class="total-row">
          <td colspan="5" style="text-align:right">TOTAL</td>
          <td style="text-align:right; font-size:12pt">${fmtCOP(totalWithDiscount)}</td>
        </tr>
      </tfoot>
    </table>

    ${q.notes ? `<h2>Notas</h2><p>${q.notes.replace(/\n/g, '<br>')}</p>` : ''}

    <h2>Condiciones</h2>
    <ul style="font-size:10pt; color:#374151">
      <li>Garantía incluida en todos los proyectos.</li>
      <li>Diseño personalizado con renders previos (SketchUp).</li>
      <li>Venta directa de fábrica — sin intermediarios.</li>
      <li>Tiempo de entrega: <strong>3 a 4 semanas</strong> desde aprobación de diseños.</li>
      <li>Esta cotización es válida hasta la fecha indicada arriba.</li>
    </ul>

    <div class="footer">
      <p>Generado por INNOVAR CRM · ${new Date().toLocaleDateString('es-CO')} · cocinasintegralespereira.co</p>
    </div>`;
}
