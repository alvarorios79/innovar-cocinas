import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { expenses } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Test suite for receipt upload functionality in expenses
 * 
 * Tests:
 * 1. Create expense with receipt URL
 * 2. Update expense to add receipt
 * 3. Update expense to replace receipt
 * 4. Retrieve expense with receipt URL
 * 5. Delete expense with receipt
 */

describe("Expenses Receipt Upload", () => {
  const testReceiptUrl = "https://s3.amazonaws.com/bucket/receipts/test-receipt-123.pdf";
  const testReceiptUrl2 = "https://s3.amazonaws.com/bucket/receipts/test-receipt-456.jpg";

  // Create test context with admin user
  function createAdminContext() {
    return {
      user: {
        id: 1,
        openId: "test-admin",
        email: "admin@test.com",
        name: "Test Admin",
        loginMethod: "manus" as const,
        role: "super_admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { headers: { host: "localhost:3000" } } as any,
      res: { 
        cookie: () => {},
        clearCookie: () => {} 
      } as any,
    };
  }

  it("should create expense with receipt URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "mantenimiento",
      generalCategory: "servicios",
      description: "Test expense with receipt",
      amount: 5000,
      expenseDate: new Date().toISOString().split("T")[0],
      receiptUrl: testReceiptUrl,
    });

    expect(result.expenseId).toBeDefined();
    expect(result.success).toBe(true);

    // Verify the expense was created with receipt
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === result.expenseId);
    expect(found?.receiptUrl).toBe(testReceiptUrl);
    expect(found?.description).toBe("Test expense with receipt");

    // Clean up
    await caller.expenses.delete(result.expenseId);
  });

  it("should create expense without receipt URL (optional field)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "arriendo",
      generalCategory: "servicios",
      description: "Test expense without receipt",
      amount: 3000,
      expenseDate: new Date().toISOString().split("T")[0],
    });

    expect(result.expenseId).toBeDefined();
    expect(result.success).toBe(true);

    // Verify the expense was created without receipt
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === result.expenseId);
    expect(found?.receiptUrl).toBeNull();

    // Clean up
    await caller.expenses.delete(result.expenseId);
  });

  it("should update expense to add receipt URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create expense without receipt
    const created = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "transporte",
      generalCategory: "servicios",
      description: "Test expense to add receipt",
      amount: 2000,
      expenseDate: new Date().toISOString().split("T")[0],
    });

    // Update with receipt
    await caller.expenses.update({
      id: created.expenseId,
      receiptUrl: testReceiptUrl,
    });

    // Verify the receipt was added
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === created.expenseId);
    expect(found?.receiptUrl).toBe(testReceiptUrl);

    // Clean up
    await caller.expenses.delete(created.expenseId);
  });

  it("should update expense to replace receipt URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create expense with first receipt
    const created = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "mantenimiento",
      generalCategory: "servicios",
      description: "Test expense to replace receipt",
      amount: 4000,
      expenseDate: new Date().toISOString().split("T")[0],
      receiptUrl: testReceiptUrl,
    });

    // Update with different receipt
    await caller.expenses.update({
      id: created.expenseId,
      receiptUrl: testReceiptUrl2,
    });

    // Verify the receipt was replaced
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === created.expenseId);
    expect(found?.receiptUrl).toBe(testReceiptUrl2);

    // Clean up
    await caller.expenses.delete(created.expenseId);
  });

  it("should retrieve expense with receipt URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create expense with receipt
    const created = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "energia",
      generalCategory: "servicios",
      description: "Test expense to retrieve",
      amount: 1500,
      expenseDate: new Date().toISOString().split("T")[0],
      receiptUrl: testReceiptUrl,
    });

    // Get all expenses
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === created.expenseId);

    expect(found).toBeDefined();
    expect(found?.receiptUrl).toBe(testReceiptUrl);

    // Clean up
    await caller.expenses.delete(created.expenseId);
  });

  it("should delete expense with receipt URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create expense with receipt
    const created = await caller.expenses.create({
      expenseType: "gasto_operativo",
      operativeCategory: "agua",
      generalCategory: "servicios",
      description: "Test expense to delete",
      amount: 800,
      expenseDate: new Date().toISOString().split("T")[0],
      receiptUrl: testReceiptUrl,
    });

    const idToDelete = created.expenseId;

    // Delete it
    await caller.expenses.delete(idToDelete);

    // Verify it's gone
    const allExpenses = await caller.expenses.getAll();
    const found = allExpenses.find(e => e.id === idToDelete);

    expect(found).toBeUndefined();
  });
});
