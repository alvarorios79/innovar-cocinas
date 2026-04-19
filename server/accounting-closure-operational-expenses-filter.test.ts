import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createAccountingClosure,
  confirmAccountingClosure,
  getClosureDetails,
} from "./db";
import { getDb } from "./db";
import { expenses, projects, users, clients, accountingClosures } from "../drizzle/schema";
import { eq, isNull } from "drizzle-orm";

describe("Accounting Closure - Operational Expenses Filtering", () => {
  let testUserId: number;
  let testClientId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Get test user (assuming admin exists)
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get or create test user
    const users_list = await db.select().from(users).limit(1);
    testUserId = users_list[0]?.id || 1;

    // Get or create test client
    const clients_list = await db.select().from(clients).limit(1);
    testClientId = clients_list[0]?.id || 1;

    // Get or create test project
    const projects_list = await db
      .select()
      .from(projects)
      .where(eq(projects.isArchived, 1))
      .limit(1);
    testProjectId = projects_list[0]?.id || 1;
  });

  describe("Gastos operativos filtrados por período", () => {
    it("Primer cierre debe incluir TODOS los gastos operativos hasta la fecha", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Limpiar gastos operativos previos de prueba
      await db
        .delete(expenses)
        .where(
          eq(expenses.expenseType, "gasto_operativo")
        );

      // Crear gastos operativos en diferentes fechas
      const expenseIds = [];
      const dates = [
        "2026-01-15",
        "2026-02-10",
        "2026-03-05",
      ];

      for (const date of dates) {
        const result = await db.insert(expenses).values({
          expenseType: "gasto_operativo",
          operativeCategory: "arriendo",
          description: `Gasto operativo ${date}`,
          amount: "500000",
          expenseDate: date,
          dataOrigin: "manual",
        } as any);
        expenseIds.push(result[0].insertId);
      }

      // Crear primer cierre (1 enero - 31 marzo)
      const closure1Id = await createAccountingClosure({
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        createdBy: testUserId,
        projectIds: [testProjectId],
      });

      // Confirmar cierre 1
      await confirmAccountingClosure(closure1Id, testUserId);

      // Obtener detalles del cierre 1
      const closure1 = await getClosureDetails(closure1Id);

      // Verificar que incluye los 3 gastos operativos
      expect(closure1.operationalExpenses).toBeDefined();
      expect(closure1.operationalExpenses.length).toBe(3);
      expect(closure1.totalOperationalExpenses).toBe("1500000");

      console.log(
        `✅ Cierre 1: ${closure1.operationalExpenses.length} gastos operativos, Total: $${closure1.totalOperationalExpenses}`
      );

      // Crear más gastos operativos DESPUÉS del cierre 1
      const newExpenseDates = [
        "2026-04-05",
        "2026-04-20",
      ];

      for (const date of newExpenseDates) {
        await db.insert(expenses).values({
          expenseType: "gasto_operativo",
          operativeCategory: "energia",
          description: `Gasto operativo ${date}`,
          amount: "300000",
          expenseDate: date,
          dataOrigin: "manual",
        } as any);
      }

      // Crear segundo cierre (1 abril - 30 abril)
      const closure2Id = await createAccountingClosure({
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        createdBy: testUserId,
        projectIds: [testProjectId],
      });

      // Confirmar cierre 2
      await confirmAccountingClosure(closure2Id, testUserId);

      // Obtener detalles del cierre 2
      const closure2 = await getClosureDetails(closure2Id);

      // Verificar que incluye SOLO los 2 gastos operativos nuevos
      expect(closure2.operationalExpenses).toBeDefined();
      expect(closure2.operationalExpenses.length).toBe(2);
      expect(closure2.totalOperationalExpenses).toBe("600000");

      console.log(
        `✅ Cierre 2: ${closure2.operationalExpenses.length} gastos operativos, Total: $${closure2.totalOperationalExpenses}`
      );

      // Verificar que los gastos del cierre 1 NO aparecen en el cierre 2
      const closure1ExpenseIds = closure1.operationalExpenses.map(
        (e: any) => e.expenseId
      );
      const closure2ExpenseIds = closure2.operationalExpenses.map(
        (e: any) => e.expenseId
      );

      const overlap = closure1ExpenseIds.filter((id: number) =>
        closure2ExpenseIds.includes(id)
      );
      expect(overlap.length).toBe(0);

      console.log(
        `✅ No hay solapamiento entre cierres: Cierre 1 tiene ${closure1ExpenseIds.length} gastos, Cierre 2 tiene ${closure2ExpenseIds.length} gastos`
      );
    });

    it("Segundo cierre debe incluir SOLO gastos operativos desde el cierre anterior", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Limpiar gastos operativos previos
      await db
        .delete(expenses)
        .where(
          eq(expenses.expenseType, "gasto_operativo")
        );

      // Crear gastos operativos antes del primer cierre
      await db.insert(expenses).values({
        expenseType: "gasto_operativo",
        operativeCategory: "arriendo",
        description: "Gasto enero",
        amount: "1000000",
        expenseDate: "2026-01-15",
        dataOrigin: "manual",
      } as any);

      // Crear primer cierre
      const closure1Id = await createAccountingClosure({
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        createdBy: testUserId,
        projectIds: [testProjectId],
      });

      await confirmAccountingClosure(closure1Id, testUserId);

      // Crear gastos operativos DESPUÉS del primer cierre
      await db.insert(expenses).values({
        expenseType: "gasto_operativo",
        operativeCategory: "energia",
        description: "Gasto abril",
        amount: "500000",
        expenseDate: "2026-04-15",
        dataOrigin: "manual",
      } as any);

      // Crear segundo cierre
      const closure2Id = await createAccountingClosure({
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        createdBy: testUserId,
        projectIds: [testProjectId],
      });

      const closure2 = await getClosureDetails(closure2Id);

      // El segundo cierre debe tener SOLO 1 gasto (el de abril)
      expect(closure2.operationalExpenses.length).toBe(1);
      expect(closure2.totalOperationalExpenses).toBe("500000");

      console.log(
        `✅ Cierre 2 tiene solo gastos nuevos: ${closure2.operationalExpenses.length} gasto, Total: $${closure2.totalOperationalExpenses}`
      );
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test expenses
    const db = await getDb();
    if (db) {
      await db
        .delete(expenses)
        .where(
          eq(expenses.expenseType, "gasto_operativo")
        );
    }
  });
});
