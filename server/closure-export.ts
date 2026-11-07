/**
 * Cierre contable en PDF y Word (Contabilidad → Cierre Contable / Cierres Confirmados).
 * El contenido se arma una vez (buildClosureReport) y se dibuja con la plantilla común:
 * PDF → server/report-pdf.ts · Word → shared/reportTemplate.ts
 */
import { Packer } from "docx";
import { getClosureDetails, getClosureProjects, getClosureOperationalExpenses } from "./db";
import { getCategoryLabel } from "@shared/expenseCategories";
import { fmtDay, fmtDayLong, fmtDayShort, fmtMoney, fmtPeriod, renderReportDocx, type ReportDoc } from "@shared/reportTemplate";
import { loadReportLogo, renderReportPdf } from "./report-pdf";

const num = (v: unknown) => Number(v ?? 0) || 0;

type ClosureLike = {
  periodStart: string; periodEnd: string; status: string; confirmedAt?: string | null;
  totalSales: unknown; totalExpenses: unknown; totalProfit: unknown;
};
type ClosureProjectLike = { projectName: string; projectValue?: unknown; totalPaid: unknown; totalExpenses: unknown; profit: unknown };
type ClosureOpExpenseLike = { expenseDate: string; description: string; category: string; amount: unknown };

export function buildClosureReport(closure: ClosureLike, projects: ClosureProjectLike[], opExpenses: ClosureOpExpenseLike[], today = new Date()): ReportDoc {
  const ingresos = num(closure.totalSales);
  const gastosProyectos = projects.reduce((s, p) => s + num(p.totalExpenses), 0);
  const gastosOperativos = Math.max(0, num(closure.totalExpenses) - gastosProyectos);
  const utilidad = num(closure.totalProfit);
  const confirmed = closure.status === "confirmed";

  // Valor neto de cada proyecto (precio con descuentos/recargos) = utilidad + gastos
  const projectRows = projects.map(p => {
    const gastos = num(p.totalExpenses), ganancia = num(p.profit), valor = ganancia + gastos, pagado = num(p.totalPaid);
    const porCobrar = valor - pagado;
    return [
      { text: p.projectName, note: porCobrar > 0.5 ? `Por cobrar: ${fmtMoney(porCobrar)}` : "Pagado completo" },
      fmtMoney(valor),
      fmtMoney(pagado),
      fmtMoney(gastos),
      { text: fmtMoney(ganancia), bold: true, tone: ganancia < 0 ? ("neg" as const) : ("pos" as const) },
    ];
  });
  const sumPagado = projects.reduce((s, p) => s + num(p.totalPaid), 0);
  const sumUtilProy = projects.reduce((s, p) => s + num(p.profit), 0);

  const opSorted = opExpenses.slice().sort((a, b) => String(a.expenseDate).localeCompare(String(b.expenseDate)));
  const opTotal = opSorted.reduce((s, e) => s + num(e.amount), 0);

  return {
    title: "Cierre Contable",
    subtitle: fmtPeriod(closure.periodStart, closure.periodEnd),
    meta: [
      confirmed ? `Confirmado el ${fmtDayShort(closure.confirmedAt)}` : "Borrador (sin confirmar)",
      `Generado el ${fmtDayLong(today)}`,
    ],
    cards: [
      { label: "Ingresos", value: fmtMoney(ingresos), hint: `${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}` },
      { label: "Gastos proyectos", value: fmtMoney(gastosProyectos) },
      { label: "Gastos operativos", value: fmtMoney(gastosOperativos) },
      { label: "Utilidad neta", value: fmtMoney(utilidad), highlight: true, tone: utilidad < 0 ? "neg" : undefined },
    ],
    formula: "Cómo se calcula:  Ingresos  –  Gastos de proyectos  –  Gastos operativos  =  Utilidad neta",
    sections: [
      {
        title: "Proyectos del cierre",
        intro: "Valor = precio final del proyecto (con descuentos o recargos). Utilidad = valor – gastos del proyecto (antes de restar los gastos operativos).",
        tables: projectRows.length ? [{
          columns: [
            { label: "Proyecto", width: 0.32 },
            { label: "Valor", width: 0.17, align: "right" },
            { label: "Pagado", width: 0.17, align: "right" },
            { label: "Gastos", width: 0.17, align: "right" },
            { label: "Utilidad", width: 0.17, align: "right" },
          ],
          rows: projectRows,
          footer: ["Totales", fmtMoney(ingresos), fmtMoney(sumPagado), fmtMoney(gastosProyectos), fmtMoney(sumUtilProy)],
        }] : [],
        emptyText: "Este cierre no incluye proyectos.",
      },
      {
        title: "Gastos operativos del período",
        intro: "Gastos generales de la empresa (bodega, servicios, nómina, vehículos…) que se restan de la utilidad.",
        tables: opSorted.length ? [{
          columns: [
            { label: "Fecha", width: 0.13 },
            { label: "Descripción", width: 0.45 },
            { label: "Categoría", width: 0.26 },
            { label: "Valor", width: 0.16, align: "right" },
          ],
          rows: opSorted.map(e => [fmtDay(e.expenseDate), e.description, (getCategoryLabel(e.category) || "—").replace(" / ", " · "), fmtMoney(num(e.amount))]),
          footer: ["Total gastos operativos", "", "", fmtMoney(opTotal)],
        }] : [],
        emptyText: "No hubo gastos operativos en este cierre.",
      },
    ],
  };
}

async function loadClosureReport(closureId: number): Promise<ReportDoc> {
  const closure = await getClosureDetails(closureId);
  if (!closure) throw new Error("Cierre no encontrado");
  const [projects, opExpenses] = await Promise.all([getClosureProjects(closureId), getClosureOperationalExpenses(closureId)]);
  return buildClosureReport(closure as any, projects as any, opExpenses as any);
}

export async function generateClosurePDFBuffer(closureId: number): Promise<Buffer> {
  return renderReportPdf(await loadClosureReport(closureId), loadReportLogo());
}

export async function generateClosureDocxBuffer(closureId: number): Promise<Buffer> {
  const logo = loadReportLogo();
  const doc = renderReportDocx(await loadClosureReport(closureId), logo ? { data: logo, width: 64, height: 80 } : undefined);
  return await Packer.toBuffer(doc);
}
