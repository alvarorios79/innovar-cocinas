/**
 * Informes imprimibles de Proyectos y Cotizaciones (reemplazan los Excel).
 * Arman el contenido; la plantilla común (reportTemplate.ts) lo dibuja en PDF y Word.
 */
import { getCategoryLabel } from "./expenseCategories";
import { STATUS_LABELS } from "./permissions";
import { fmtDay, fmtDayLong, fmtMoney, type ReportDoc } from "./reportTemplate";

// ─── Datos que manda el servidor ───────────────────────────────────────────
export type ProjectListRow = {
  id: number; name: string; clientName: string; status: string;
  valor: number; pagado: number; porCobrar: number; gastos: number; installDate: string | null;
};
export type ProjectReportData = {
  project: {
    id: number; name: string; clientName: string; quotationNumber: string; status: string; workType: string;
    createdAt: string; installDate: string | null; deliveredAt: string | null;
  };
  balance: { totalAmount: number; discounts: number; surcharges: number; valorFinal: number; pagado: number; porCobrar: number };
  payments: { date: string; movementType: string; type: string; method: string; notes: string; amount: number }[];
  expenses: { date: string; description: string; operativeCategory: string | null; subcategory: string | null; generalCategory: string | null; amount: number }[];
};
export type QuotationListRow = {
  quotationNumber: string; version: number; clientName: string; status: string; total: number; createdAt: string; hasProject: boolean;
};

// ─── Etiquetas ─────────────────────────────────────────────────────────────
export function projectStatusLabel(status: string): string {
  if (status === "aprobacion_final") return "Diseño Aprobado";
  return (STATUS_LABELS as Record<string, string>)[status] || status || "—";
}
const QUOTATION_STATUS: Record<string, string> = { draft: "Borrador", sent: "Enviada", approved: "Aprobada", rejected: "Rechazada" };
const MOVEMENT: Record<string, string> = { payment: "Pago", discount: "Descuento", surcharge: "Recargo" };
const PAYMENT_TYPE: Record<string, string> = { advance: "Adelanto", final: "Pago final", partial: "Abono", other: "Otro" };
const METHOD: Record<string, string> = { transfer: "Transferencia", cash: "Efectivo", check: "Cheque", other: "Otro" };
const WORK_TYPE: Record<string, string> = {
  cocina: "Cocina integral", closet: "Closet", puertas: "Puertas", centro_tv: "Centro de TV", mueble_bano: "Mueble de baño", otro: "Otro",
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((s, x) => s + f(x), 0);
const generated = (today: Date) => `Generado el ${fmtDayLong(today)}`;

// ─── Lista de proyectos ────────────────────────────────────────────────────
export function buildProjectsListReport(rows: ProjectListRow[], archived: boolean, today = new Date()): ReportDoc {
  const valor = sum(rows, r => r.valor), pagado = sum(rows, r => r.pagado), porCobrar = sum(rows, r => Math.max(0, r.porCobrar));
  return {
    title: "Listado de Proyectos",
    subtitle: archived ? "Proyectos archivados" : "Proyectos activos",
    meta: [generated(today)],
    cards: [
      { label: "Proyectos", value: String(rows.length) },
      { label: "Valor total", value: fmtMoney(valor) },
      { label: "Pagado", value: fmtMoney(pagado) },
      { label: "Por cobrar", value: fmtMoney(porCobrar), highlight: true },
    ],
    sections: [{
      title: "Proyectos",
      intro: "Valor = precio final con descuentos o recargos. Por cobrar = valor − pagado.",
      tables: rows.length ? [{
        columns: [
          { label: "Proyecto", width: 0.36 },
          { label: "Valor", width: 0.16, align: "right" },
          { label: "Pagado", width: 0.16, align: "right" },
          { label: "Por cobrar", width: 0.16, align: "right" },
          { label: "Gastos", width: 0.16, align: "right" },
        ],
        rows: rows.map(r => [
          {
            text: r.clientName || r.name,
            note: [r.clientName && r.name !== r.clientName ? r.name : "", projectStatusLabel(r.status), r.installDate ? `Instalación ${fmtDay(r.installDate)}` : ""].filter(Boolean).join(" · "),
          },
          fmtMoney(r.valor),
          fmtMoney(r.pagado),
          { text: fmtMoney(r.porCobrar), bold: r.porCobrar > 0.5, tone: r.porCobrar > 0.5 ? "neg" : "muted" },
          fmtMoney(r.gastos),
        ]),
        footer: ["Totales", fmtMoney(valor), fmtMoney(pagado), fmtMoney(porCobrar), fmtMoney(sum(rows, r => r.gastos))],
      }] : [],
      emptyText: "No hay proyectos en esta lista.",
    }],
  };
}

// ─── Reporte de un proyecto ────────────────────────────────────────────────
export function buildProjectReport(d: ProjectReportData, today = new Date()): ReportDoc {
  const { project: p, balance: b } = d;
  const gastos = sum(d.expenses, e => e.amount);
  const utilidad = b.valorFinal - gastos;
  const pays = d.payments.slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));
  const exps = d.expenses.slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));

  const info: [string, string][] = [
    ["Cliente", p.clientName || "—"],
    ["Proyecto", p.name],
    ["Tipo de trabajo", WORK_TYPE[p.workType] || p.workType || "—"],
    ["Estado", projectStatusLabel(p.status)],
    ["Cotización", p.quotationNumber || "—"],
    ["Creado", fmtDay(p.createdAt) || "—"],
    ["Instalación programada", fmtDay(p.installDate) || "Sin fecha"],
  ];
  if (p.deliveredAt) info.push(["Entregado", fmtDay(p.deliveredAt)]);

  const money: [string, string][] = [["Valor cotizado", fmtMoney(b.totalAmount)]];
  if (b.discounts) money.push(["Descuentos", `− ${fmtMoney(b.discounts)}`]);
  if (b.surcharges) money.push(["Recargos", `+ ${fmtMoney(b.surcharges)}`]);

  return {
    title: "Reporte de Proyecto",
    subtitle: p.clientName || p.name,
    meta: [p.quotationNumber ? `Cotización ${p.quotationNumber}` : "", generated(today)].filter(Boolean),
    cards: [
      { label: "Valor final", value: fmtMoney(b.valorFinal) },
      { label: "Pagado", value: fmtMoney(b.pagado) },
      { label: "Por cobrar", value: fmtMoney(b.porCobrar), tone: b.porCobrar > 0.5 ? "neg" : undefined },
      { label: "Utilidad estimada", value: fmtMoney(utilidad), hint: `Gastos ${fmtMoney(gastos)}`, highlight: true, tone: utilidad < 0 ? "neg" : undefined },
    ],
    formula: "Utilidad estimada = valor final del proyecto − gastos del proyecto",
    sections: [
      {
        title: "Datos del proyecto",
        tables: [{
          hideHeader: true,
          columns: [{ label: "Dato", width: 0.35 }, { label: "Valor", width: 0.65 }],
          rows: [...info, ...money, ["Valor final", fmtMoney(b.valorFinal)]].map(([k, v]) => [{ text: k, bold: true }, v]),
        }],
      },
      {
        title: "Pagos y movimientos",
        intro: "Pagos recibidos del cliente, descuentos y recargos.",
        tables: pays.length ? [{
          columns: [
            { label: "Fecha", width: 0.14 },
            { label: "Movimiento", width: 0.22 },
            { label: "Medio", width: 0.18 },
            { label: "Notas", width: 0.28 },
            { label: "Valor", width: 0.18, align: "right" },
          ],
          rows: pays.map(x => [
            fmtDay(x.date),
            x.movementType === "payment" ? `Pago · ${PAYMENT_TYPE[x.type] || x.type}` : MOVEMENT[x.movementType] || x.movementType,
            METHOD[x.method] || x.method || "—",
            x.notes || "",
            { text: fmtMoney(x.amount), tone: x.movementType === "discount" ? "neg" : undefined },
          ]),
          footer: ["Total pagado", "", "", "", fmtMoney(b.pagado)],
        }] : [],
        emptyText: "Todavía no hay pagos registrados.",
      },
      {
        title: "Gastos del proyecto",
        intro: "Materiales y servicios cargados a este proyecto.",
        tables: exps.length ? [{
          columns: [
            { label: "Fecha", width: 0.14 },
            { label: "Descripción", width: 0.44 },
            { label: "Categoría", width: 0.26 },
            { label: "Valor", width: 0.16, align: "right" },
          ],
          rows: exps.map(e => {
            const raw = e.operativeCategory || e.subcategory || "";
            const cat = (raw ? getCategoryLabel(raw, e.subcategory) : "") || e.generalCategory || "—";
            return [fmtDay(e.date), e.description, cat.replace(" / ", " · "), fmtMoney(e.amount)];
          }),
          footer: ["Total gastos", "", "", fmtMoney(gastos)],
        }] : [],
        emptyText: "Todavía no hay gastos registrados para este proyecto.",
      },
    ],
  };
}

// ─── Lista de cotizaciones ─────────────────────────────────────────────────
export function buildQuotationsListReport(rows: QuotationListRow[], filterText: string, today = new Date()): ReportDoc {
  const approved = rows.filter(r => r.status === "approved");
  return {
    title: "Listado de Cotizaciones",
    subtitle: filterText || "Todas las cotizaciones",
    meta: [generated(today)],
    cards: [
      { label: "Cotizaciones", value: String(rows.length) },
      { label: "Aprobadas", value: String(approved.length), hint: fmtMoney(sum(approved, r => r.total)) },
      { label: "Valor cotizado", value: fmtMoney(sum(rows, r => r.total)), highlight: true },
    ],
    sections: [{
      title: "Cotizaciones",
      intro: "Se muestra la última versión de cada cotización.",
      tables: rows.length ? [{
        columns: [
          { label: "Fecha", width: 0.14 },
          { label: "Cliente", width: 0.40 },
          { label: "Estado", width: 0.24 },
          { label: "Valor", width: 0.22, align: "right" },
        ],
        rows: rows.map(r => [
          fmtDay(r.createdAt),
          { text: r.clientName || "—", note: `${r.quotationNumber}${r.version > 1 ? ` · versión ${r.version}` : ""}` },
          {
            text: QUOTATION_STATUS[r.status] || r.status,
            note: r.hasProject ? "Con proyecto" : undefined,
            tone: r.status === "approved" ? "pos" : r.status === "rejected" ? "neg" : undefined,
            bold: r.status === "approved",
          },
          fmtMoney(r.total),
        ]),
        footer: ["Total", "", "", fmtMoney(sum(rows, r => r.total))],
      }] : [],
      emptyText: "No hay cotizaciones con estos filtros.",
    }],
  };
}

