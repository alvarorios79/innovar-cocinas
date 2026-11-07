/**
 * Informe de gastos (Contabilidad → Historial de Gastos → PDF / Word).
 * Arma el contenido una vez; la plantilla (reportTemplate.ts) lo dibuja en PDF y en Word.
 */
import { getCategoryLabel } from "./expenseCategories";
import { fmtDay, fmtDayLong, fmtMoney, fmtPeriod, parseLocalDate, type ReportDoc, type ReportSection, type ReportTable } from "./reportTemplate";

export type ExpenseReportRow = {
  id: number;
  expenseDate: string;
  expenseType: string;
  description: string;
  amount: number | string;
  operativeCategory?: string | null;
  generalCategory?: string | null;
  subcategory?: string | null;
  projectId?: number | null;
  projectClientName?: string | null;
};
export type ExpenseReportFilter = "all" | "proyecto" | "bodega";

export const isProjectExpense = (e: ExpenseReportRow) => e.expenseType === "materiales_proyecto";
const sum = (list: ExpenseReportRow[]) => list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
const byDate = (a: ExpenseReportRow, b: ExpenseReportRow) =>
  (parseLocalDate(a.expenseDate)?.getTime() ?? 0) - (parseLocalDate(b.expenseDate)?.getTime() ?? 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function categoryText(e: ExpenseReportRow): string {
  const raw = e.operativeCategory || e.subcategory || "";
  const label = raw ? getCategoryLabel(raw, e.subcategory) : "";
  return (label || e.generalCategory || "—").replace(" / ", " · ");
}

const COLUMNS = [
  { label: "Fecha", width: 0.13 },
  { label: "Descripción", width: 0.45 },
  { label: "Categoría", width: 0.26 },
  { label: "Valor", width: 0.16, align: "right" as const },
];

function rowsOf(list: ExpenseReportRow[]) {
  return list.slice().sort(byDate).map(e => [fmtDay(e.expenseDate), e.description || "", categoryText(e), fmtMoney(e.amount)]);
}

export function expensesForFilter(expenses: ExpenseReportRow[], filter: ExpenseReportFilter) {
  return filter === "all" ? expenses : filter === "proyecto" ? expenses.filter(isProjectExpense) : expenses.filter(e => !isProjectExpense(e));
}

export function buildExpenseReport(expenses: ExpenseReportRow[], filter: ExpenseReportFilter, today = new Date()): ReportDoc {
  const proyecto = filter === "bodega" ? [] : expenses.filter(isProjectExpense);
  const bodega = filter === "proyecto" ? [] : expenses.filter(e => !isProjectExpense(e));
  const included = [...proyecto, ...bodega];

  // Período = de la fecha más antigua a la más reciente de los gastos incluidos
  const dates = included.map(e => parseLocalDate(e.expenseDate)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  const period = dates.length ? fmtPeriod(dates[0], dates[dates.length - 1]) : "";

  // Gastos de proyecto agrupados por cliente / proyecto
  const groups = new Map<string, ExpenseReportRow[]>();
  for (const e of proyecto) {
    const key = (e.projectClientName || "").trim() || (e.projectId ? `Proyecto #${e.projectId}` : "Sin proyecto asignado");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const projectTables: ReportTable[] = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([name, list]) => ({
      title: `${name}  ·  ${plural(list.length, "gasto", "gastos")}`,
      columns: COLUMNS,
      rows: rowsOf(list),
      footer: [`Subtotal ${name}`, "", "", fmtMoney(sum(list))],
    }));

  const sections: ReportSection[] = [];
  if (filter !== "bodega") {
    sections.push({
      title: "Gastos de proyecto",
      intro: "Materiales y servicios cargados a cada proyecto, agrupados por cliente.",
      tables: projectTables,
      emptyText: "No hay gastos de proyecto en este período.",
      total: proyecto.length ? { label: "Total gastos de proyecto", value: fmtMoney(sum(proyecto)) } : undefined,
    });
  }
  if (filter !== "proyecto") {
    sections.push({
      title: "Gastos operativos (bodega)",
      intro: "Gastos generales de la empresa: arriendo, servicios, nómina, vehículos, herramientas…",
      tables: bodega.length ? [{ columns: COLUMNS, rows: rowsOf(bodega), footer: ["Total gastos operativos", "", "", fmtMoney(sum(bodega))] }] : [],
      emptyText: "No hay gastos operativos en este período.",
    });
  }

  const cards = filter === "all"
    ? [
        { label: "Gastos de proyecto", value: fmtMoney(sum(proyecto)), hint: plural(proyecto.length, "gasto", "gastos") },
        { label: "Gastos operativos", value: fmtMoney(sum(bodega)), hint: plural(bodega.length, "gasto", "gastos") },
        { label: "Total gastos", value: fmtMoney(sum(included)), hint: plural(included.length, "gasto", "gastos"), highlight: true },
      ]
    : filter === "proyecto"
      ? [
          { label: "Proyectos", value: String(groups.size), hint: plural(proyecto.length, "gasto", "gastos") },
          { label: "Total gastos de proyecto", value: fmtMoney(sum(proyecto)), highlight: true },
        ]
      : [
          { label: "Gastos registrados", value: String(bodega.length) },
          { label: "Total gastos operativos", value: fmtMoney(sum(bodega)), highlight: true },
        ];

  return {
    title: "Informe de Gastos",
    subtitle: filter === "proyecto" ? "Gastos de proyecto" : filter === "bodega" ? "Gastos operativos (bodega)" : "Todos los gastos",
    meta: [period ? `Período: ${period}` : "", `Generado el ${fmtDayLong(today)}`].filter(Boolean),
    cards,
    sections,
  };
}
