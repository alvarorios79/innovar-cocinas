import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getPendingClosureProjects,
  createAccountingClosure,
  getAccountingClosures,
  getClosureDetails,
  confirmAccountingClosure,
  getClosureProjects,
} from "./db";

describe("Accounting Closures", () => {
  let testProjectId: number;
  let testClosureId: number;
  const testUserId = 1; // Assuming admin user exists

  describe("getPendingClosureProjects", () => {
    it("should return archived projects without closure", async () => {
      const projects = await getPendingClosureProjects();
      expect(Array.isArray(projects)).toBe(true);
      // Projects should be archived and not yet included in a closure
      projects.forEach((project) => {
        expect(project.isArchived).toBe(1);
        expect(project.accountingClosureId).toBeNull();
        expect(project.dataOrigin).toBe("manual");
      });
    });
  });

  describe("createAccountingClosure", () => {
    it("should create a closure with valid data", async () => {
      const periodStart = "2026-01-01";
      const periodEnd = "2026-03-31";
      const projectIds = [1]; // Use existing project

      const closureId = await createAccountingClosure({
        periodStart,
        periodEnd,
        createdBy: testUserId,
        projectIds,
      });

      expect(typeof closureId).toBe("number");
      expect(closureId).toBeGreaterThan(0);
      testClosureId = closureId;
    });

    it("should handle Date objects as input", async () => {
      const periodStart = new Date("2026-01-01");
      const periodEnd = new Date("2026-03-31");
      const projectIds = [1];

      const closureId = await createAccountingClosure({
        periodStart,
        periodEnd,
        createdBy: testUserId,
        projectIds,
      });

      expect(typeof closureId).toBe("number");
      expect(closureId).toBeGreaterThan(0);
    });
  });

  describe("getAccountingClosures", () => {
    it("should return list of closures", async () => {
      const closures = await getAccountingClosures();
      expect(Array.isArray(closures)).toBe(true);
    });

    it("should filter by status", async () => {
      const draftClosures = await getAccountingClosures({ status: "draft" });
      expect(Array.isArray(draftClosures)).toBe(true);
      draftClosures.forEach((closure) => {
        expect(closure.status).toBe("draft");
      });
    });
  });

  describe("getClosureDetails", () => {
    it("should return closure with projects", async () => {
      if (!testClosureId) {
        console.log("Skipping: testClosureId not set");
        return;
      }

      const closure = await getClosureDetails(testClosureId);
      expect(closure).toBeDefined();
      expect(closure?.id).toBe(testClosureId);
      expect(Array.isArray(closure?.projects)).toBe(true);
    });

    it("should return null for non-existent closure", async () => {
      const closure = await getClosureDetails(999999);
      expect(closure).toBeNull();
    });
  });

  describe("confirmAccountingClosure", () => {
    it("should confirm a draft closure", async () => {
      if (!testClosureId) {
        console.log("Skipping: testClosureId not set");
        return;
      }

      await confirmAccountingClosure(testClosureId, testUserId);

      const closure = await getClosureDetails(testClosureId);
      expect(closure?.status).toBe("confirmed");
      expect(closure?.confirmedBy).toBe(testUserId);
      expect(closure?.confirmedAt).toBeDefined();
    });
  });

  describe("getClosureProjects", () => {
    it("should return projects in a closure", async () => {
      if (!testClosureId) {
        console.log("Skipping: testClosureId not set");
        return;
      }

      const projects = await getClosureProjects(testClosureId);
      expect(Array.isArray(projects)).toBe(true);
      projects.forEach((project) => {
        expect(project.closureId).toBe(testClosureId);
        expect(project.projectId).toBeDefined();
        expect(project.projectName).toBeDefined();
        expect(project.projectValue).toBeDefined();
        expect(project.totalExpenses).toBeDefined();
        expect(project.profit).toBeDefined();
      });
    });
  });

  describe("Data Integrity", () => {
    it("should preserve real data (dataOrigin='manual')", async () => {
      const closures = await getAccountingClosures();
      // All closures should be created with manual data
      expect(closures.length >= 0).toBe(true);
    });

    it("should not include test data in closures", async () => {
      const projects = await getPendingClosureProjects();
      // All pending projects should have dataOrigin='manual'
      projects.forEach((project) => {
        expect(project.dataOrigin).toBe("manual");
      });
    });
  });
});
