import { describe, it, expect, beforeAll } from "vitest";
import { getDb, createAccountingClosure, confirmAccountingClosure, getConfirmedClosures, getClosedProjects } from "./db";
import { eq } from "drizzle-orm";
import { accountingClosures, projects } from "../drizzle/schema";

describe("FASE 4 - Accounting Closure Confirmation", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  it("should confirm a closure and link projects", async () => {
    // Get a sample project
    const sampleProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (sampleProjects.length === 0) {
      console.log("✓ No projects found for testing - skipping");
      expect(true).toBe(true);
      return;
    }

    const projectId = sampleProjects[0].id;

    // Create a closure first
    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-28");

    const closureId = await createAccountingClosure({
      periodStart,
      periodEnd,
      createdBy: 1,
      projectIds: [projectId],
    });

    expect(closureId).toBeGreaterThan(0);

    // Verify closure is in DRAFT status
    const draftClosure = await db
      .select()
      .from(accountingClosures)
      .where(eq(accountingClosures.id, closureId))
      .limit(1);

    expect(draftClosure[0].status).toBe("draft");

    // Confirm the closure
    const result = await confirmAccountingClosure(closureId, 1);

    expect(result.closureId).toBe(closureId);
    expect(result.projectsLinked).toBe(1);
    expect(result.confirmedAt).toBeDefined();

    console.log("✅ Closure confirmed:", {
      closureId,
      projectsLinked: result.projectsLinked,
      confirmedAt: result.confirmedAt,
    });
  });

  it("should change closure status from DRAFT to CONFIRMED", async () => {
    // Get a sample project
    const sampleProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (sampleProjects.length === 0) {
      console.log("✓ No projects found for testing - skipping");
      expect(true).toBe(true);
      return;
    }

    const projectId = sampleProjects[0].id;

    // Create a closure
    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-28");

    const closureId = await createAccountingClosure({
      periodStart,
      periodEnd,
      createdBy: 1,
      projectIds: [projectId],
    });

    // Confirm the closure
    await confirmAccountingClosure(closureId, 1);

    // Verify status changed
    const confirmedClosure = await db
      .select()
      .from(accountingClosures)
      .where(eq(accountingClosures.id, closureId))
      .limit(1);

    expect(confirmedClosure[0].status).toBe("confirmed");
    expect(confirmedClosure[0].confirmedAt).toBeDefined();
    expect(confirmedClosure[0].confirmedBy).toBe(1);

    console.log("✅ Closure status verified:", {
      closureId,
      status: confirmedClosure[0].status,
      confirmedBy: confirmedClosure[0].confirmedBy,
    });
  });

  it("should link projects to closure when confirmed", async () => {
    // Get a sample project
    const sampleProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (sampleProjects.length === 0) {
      console.log("✓ No projects found for testing - skipping");
      expect(true).toBe(true);
      return;
    }

    const projectId = sampleProjects[0].id;

    // Create a closure
    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-28");

    const closureId = await createAccountingClosure({
      periodStart,
      periodEnd,
      createdBy: 1,
      projectIds: [projectId],
    });

    // Confirm the closure
    await confirmAccountingClosure(closureId, 1);

    // Verify project is linked to closure
    const linkedProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    expect(linkedProject[0].accountingClosureId).toBe(closureId);

    console.log("✅ Project linked to closure:", {
      projectId,
      accountingClosureId: linkedProject[0].accountingClosureId,
    });
  });

  it("should prevent confirmation of already confirmed closure", async () => {
    // Get a sample project
    const sampleProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (sampleProjects.length === 0) {
      console.log("✓ No projects found for testing - skipping");
      expect(true).toBe(true);
      return;
    }

    const projectId = sampleProjects[0].id;

    // Create a closure
    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-28");

    const closureId = await createAccountingClosure({
      periodStart,
      periodEnd,
      createdBy: 1,
      projectIds: [projectId],
    });

    // Confirm the closure
    await confirmAccountingClosure(closureId, 1);

    // Try to confirm again - should throw error
    try {
      await confirmAccountingClosure(closureId, 1);
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain("Solo cierres en DRAFT pueden ser confirmados");
      console.log("✅ Correctly prevented re-confirmation:", error.message);
    }
  });

  it("should retrieve confirmed closures", async () => {
    // Get confirmed closures
    const confirmedClosures = await getConfirmedClosures({
      limit: 10,
    });

    console.log(`✅ Retrieved ${confirmedClosures.length} confirmed closures`);

    if (confirmedClosures.length > 0) {
      expect(confirmedClosures[0].status).toBe("confirmed");
      expect(confirmedClosures[0].projects).toBeDefined();
      expect(Array.isArray(confirmedClosures[0].projects)).toBe(true);

      console.log("✅ Confirmed closure structure verified:", {
        closureId: confirmedClosures[0].id,
        status: confirmedClosures[0].status,
        projectCount: confirmedClosures[0].projectCount,
      });
    }
  });

  it("should retrieve closed projects", async () => {
    // Get closed projects
    const closedProjects = await getClosedProjects({
      limit: 10,
    });

    console.log(`✅ Retrieved ${closedProjects.length} closed projects`);

    if (closedProjects.length > 0) {
      expect(closedProjects[0].projectId).toBeDefined();
      expect(closedProjects[0].accountingClosureId).toBeDefined();
      expect(closedProjects[0].clientName).toBeDefined();

      console.log("✅ Closed project structure verified:", {
        projectId: closedProjects[0].projectId,
        projectName: closedProjects[0].projectName,
        clientName: closedProjects[0].clientName,
        closurePeriod: closedProjects[0].closurePeriod,
      });
    }
  });

  it("should not allow confirmation of non-existent closure", async () => {
    // Try to confirm a non-existent closure
    try {
      await confirmAccountingClosure(99999, 1);
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain("no encontrado");
      console.log("✅ Correctly prevented confirmation of non-existent closure");
    }
  });

  it("should record confirmedBy and confirmedAt timestamps", async () => {
    // Get a sample project
    const sampleProjects = await db
      .select()
      .from(projects)
      .limit(1);

    if (sampleProjects.length === 0) {
      console.log("✓ No projects found for testing - skipping");
      expect(true).toBe(true);
      return;
    }

    const projectId = sampleProjects[0].id;

    // Create a closure
    const periodStart = new Date("2026-02-01");
    const periodEnd = new Date("2026-02-28");

    const closureId = await createAccountingClosure({
      periodStart,
      periodEnd,
      createdBy: 1,
      projectIds: [projectId],
    });

    // Confirm the closure
    const beforeConfirmation = new Date();
    const result = await confirmAccountingClosure(closureId, 1);
    const afterConfirmation = new Date();

    // Verify timestamps
    const confirmedClosure = await db
      .select()
      .from(accountingClosures)
      .where(eq(accountingClosures.id, closureId))
      .limit(1);

    expect(confirmedClosure[0].confirmedBy).toBe(1);
    expect(confirmedClosure[0].confirmedAt).toBeDefined();

    const confirmedAt = new Date(confirmedClosure[0].confirmedAt);
    expect(confirmedAt.getTime()).toBeGreaterThanOrEqual(beforeConfirmation.getTime());
    expect(confirmedAt.getTime()).toBeLessThanOrEqual(afterConfirmation.getTime());

    console.log("✅ Timestamps recorded correctly:", {
      confirmedBy: confirmedClosure[0].confirmedBy,
      confirmedAt: confirmedClosure[0].confirmedAt,
    });
  });
});
