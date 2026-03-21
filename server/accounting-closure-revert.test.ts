import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createAccountingClosure,
  confirmAccountingClosure,
  revertAccountingClosure,
  getClosureDetails,
  getDb,
} from "./db";
import { projects, accountingClosures } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Accounting Closure Revert", () => {
  let testProjectIds: number[] = [];
  let testClosureId: number | null = null;

  beforeAll(async () => {
    // Create test projects (archived and fully paid)
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // We'll use existing projects from the database
    // For testing, we need projects that are archived and fully paid
    const existingProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.status, "archived"))
      .limit(3);

    if (existingProjects.length > 0) {
      testProjectIds = existingProjects.map((p) => p.id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    if (!db) return;

    if (testClosureId) {
      try {
        await db
          .delete(accountingClosures)
          .where(eq(accountingClosures.id, testClosureId));
      } catch (error) {
        console.error("Error cleaning up test closure:", error);
      }
    }
  });

  it("should revert a confirmed closure from CONFIRMED to DRAFT", async () => {
    if (testProjectIds.length === 0) {
      console.warn("No test projects available, skipping test");
      return;
    }

    // Create a closure
    const closureId = await createAccountingClosure({
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-01-31"),
      createdBy: 1,
      projectIds: testProjectIds,
    });

    testClosureId = closureId;
    expect(closureId).toBeGreaterThan(0);

    // Confirm the closure
    const confirmResult = await confirmAccountingClosure(closureId, 1);
    expect(confirmResult.status).toBe("confirmed");

    // Verify closure is confirmed
    let closure = await getClosureDetails(closureId);
    expect(closure?.status).toBe("confirmed");

    // Revert the closure
    const revertResult = await revertAccountingClosure(closureId, 1);
    expect(revertResult.projectsUnlinked).toBe(testProjectIds.length);

    // Verify closure is now draft
    closure = await getClosureDetails(closureId);
    expect(closure?.status).toBe("draft");
    expect(closure?.confirmedBy).toBeNull();
    expect(closure?.confirmedAt).toBeNull();
  });

  it("should unlink all projects when reverting a closure", async () => {
    if (testProjectIds.length === 0) {
      console.warn("No test projects available, skipping test");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create and confirm a closure
    const closureId = await createAccountingClosure({
      periodStart: new Date("2026-02-01"),
      periodEnd: new Date("2026-02-28"),
      createdBy: 1,
      projectIds: testProjectIds,
    });

    await confirmAccountingClosure(closureId, 1);

    // Verify projects are linked
    let linkedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.accountingClosureId, closureId));
    expect(linkedProjects.length).toBe(testProjectIds.length);

    // Revert the closure
    await revertAccountingClosure(closureId, 1);

    // Verify projects are unlinked
    linkedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.accountingClosureId, closureId));
    expect(linkedProjects.length).toBe(0);

    // Clean up
    await db
      .delete(accountingClosures)
      .where(eq(accountingClosures.id, closureId));
  });

  it("should throw error when trying to revert a draft closure", async () => {
    if (testProjectIds.length === 0) {
      console.warn("No test projects available, skipping test");
      return;
    }

    // Create a closure (but don't confirm it)
    const closureId = await createAccountingClosure({
      periodStart: new Date("2026-03-01"),
      periodEnd: new Date("2026-03-31"),
      createdBy: 1,
      projectIds: testProjectIds,
    });

    // Try to revert a draft closure (should fail)
    try {
      await revertAccountingClosure(closureId, 1);
      throw new Error("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("draft");
    }

    // Clean up
    const db = await getDb();
    if (db) {
      await db
        .delete(accountingClosures)
        .where(eq(accountingClosures.id, closureId));
    }
  });

  it("should throw error when trying to revert a non-existent closure", async () => {
    try {
      await revertAccountingClosure(999999, 1);
      throw new Error("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("no encontrado");
    }
  });

  it("should allow projects to become eligible again after revert", async () => {
    if (testProjectIds.length === 0) {
      console.warn("No test projects available, skipping test");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create and confirm a closure
    const closureId = await createAccountingClosure({
      periodStart: new Date("2026-04-01"),
      periodEnd: new Date("2026-04-30"),
      createdBy: 1,
      projectIds: testProjectIds,
    });

    await confirmAccountingClosure(closureId, 1);

    // Verify projects have accountingClosureId set
    let projectsWithClosure = await db
      .select()
      .from(projects)
      .where(eq(projects.accountingClosureId, closureId));
    expect(projectsWithClosure.length).toBeGreaterThan(0);

    // Revert the closure
    await revertAccountingClosure(closureId, 1);

    // Verify projects no longer have accountingClosureId set
    projectsWithClosure = await db
      .select()
      .from(projects)
      .where(eq(projects.accountingClosureId, closureId));
    expect(projectsWithClosure.length).toBe(0);

    // Clean up
    await db
      .delete(accountingClosures)
      .where(eq(accountingClosures.id, closureId));
  });
});
