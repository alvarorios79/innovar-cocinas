import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAccountingClosure, getAccountingClosures } from "./db";
import { getDb } from "./db";
import { expenses, projects, payments, users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

describe("Accounting Closure - Expense Calculation", () => {
  let testUserId: number;
  let testProjectId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const userResult = await db
      .insert(users)
      .values({
        email: `test-closure-${Date.now()}@test.com`,
        name: "Test User",
        role: "admin",
      })
      .$returningId();
    testUserId = userResult[0].id;

    // Create test project
    const projectResult = await db
      .insert(projects)
      .values({
        name: "Test Project for Expenses",
        clientId: 1,
        quotationId: 1,
        status: "archived",
        totalAmount: 10000000,
        createdBy: testUserId,
      })
      .$returningId();
    testProjectId = projectResult[0].id;

    // Add payment to project
    await db.insert(payments).values({
      projectId: testProjectId,
      amount: 10000000,
      movementType: "payment",
      paymentDate: new Date(),
      createdBy: testUserId,
    });

    // Add project expenses (materiales_proyecto)
    await db.insert(expenses).values({
      projectId: testProjectId,
      expenseType: "materiales_proyecto",
      description: "Test project material",
      amount: 2000000,
      expenseDate: new Date().toISOString().split("T")[0],
      createdBy: testUserId,
      generalCategory: "materiales",
      dataOrigin: "manual",
    });

    // Add operational expenses (gasto_operativo) - should be included regardless of project
    await db.insert(expenses).values({
      expenseType: "gasto_operativo",
      operativeCategory: "otro",
      description: "Test operational expense",
      amount: 500000,
      expenseDate: new Date().toISOString().split("T")[0],
      createdBy: testUserId,
      generalCategory: "otros",
      dataOrigin: "manual",
    });
  });

  afterAll(async () => {
    if (!db) return;
    // Cleanup
    await db.delete(expenses).where(eq(expenses.createdBy, testUserId));
    await db.delete(payments).where(eq(payments.createdBy, testUserId));
    await db.delete(projects).where(eq(projects.createdBy, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should calculate expenses correctly: project expenses + ALL operational expenses", async () => {
    const closureId = await createAccountingClosure({
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdBy: testUserId,
      projectIds: [testProjectId],
    });

    const closures = await getAccountingClosures({ status: "draft" });
    const closure = closures.find((c) => c.id === closureId);

    expect(closure).toBeDefined();
    expect(closure?.totalSales).toBeGreaterThan(0); // Should have payment
    expect(closure?.totalExpenses).toBeGreaterThan(0); // Should have expenses

    // Expected calculation:
    // totalExpenses = project_expenses (2000000) + ALL operational_expenses (500000)
    // = 2500000
    const expectedExpenses = 2500000;
    expect(Number(closure?.totalExpenses)).toBe(expectedExpenses);

    // Expected profit = totalSales - totalExpenses
    // = 10000000 - 2500000 = 7500000
    const expectedProfit = 7500000;
    expect(Number(closure?.totalProfit)).toBe(expectedProfit);
  });

  it("should include ALL operational expenses even if outside period", async () => {
    // Add an old operational expense (outside period)
    await db.insert(expenses).values({
      expenseType: "gasto_operativo",
      operativeCategory: "otro",
      description: "Old operational expense",
      amount: 300000,
      expenseDate: "2025-01-01", // Outside period
      createdBy: testUserId,
      generalCategory: "otros",
      dataOrigin: "manual",
    });

    const closureId = await createAccountingClosure({
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdBy: testUserId,
      projectIds: [testProjectId],
    });

    const closures = await getAccountingClosures({ status: "draft" });
    const closure = closures.find((c) => c.id === closureId);

    expect(closure).toBeDefined();

    // Expected: project_expenses (2000000) + ALL operational_expenses (500000 + 300000)
    // = 2800000
    const expectedExpenses = 2800000;
    expect(Number(closure?.totalExpenses)).toBe(expectedExpenses);
  });

  it("should only include expenses from selected projects", async () => {
    // Create another project with expenses
    const otherProjectResult = await db
      .insert(projects)
      .values({
        name: "Other Project",
        clientId: 1,
        quotationId: 1,
        status: "archived",
        totalAmount: 5000000,
        createdBy: testUserId,
      })
      .$returningId();
    const otherProjectId = otherProjectResult[0].id;

    // Add payment to other project
    await db.insert(payments).values({
      projectId: otherProjectId,
      amount: 5000000,
      movementType: "payment",
      paymentDate: new Date(),
      createdBy: testUserId,
    });

    // Add expenses to other project
    await db.insert(expenses).values({
      projectId: otherProjectId,
      expenseType: "materiales_proyecto",
      description: "Other project material",
      amount: 1000000,
      expenseDate: new Date().toISOString().split("T")[0],
      createdBy: testUserId,
      generalCategory: "materiales",
      dataOrigin: "manual",
    });

    // Create closure with ONLY testProject (not otherProject)
    const closureId = await createAccountingClosure({
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdBy: testUserId,
      projectIds: [testProjectId], // Only testProject
    });

    const closures = await getAccountingClosures({ status: "draft" });
    const closure = closures.find((c) => c.id === closureId);

    expect(closure).toBeDefined();

    // Expected: ONLY testProject expenses (2000000) + ALL operational_expenses
    // Should NOT include otherProject expenses (1000000)
    // = 2000000 + operational_expenses
    expect(Number(closure?.totalExpenses)).toBeGreaterThanOrEqual(2000000);
    expect(Number(closure?.totalExpenses)).toBeLessThan(4000000); // Should not include other project
  });
});
