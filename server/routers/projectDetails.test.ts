import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "../db";
import { appRouter } from "../routers";

describe("projectDetails router", () => {
  let testProjectId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Obtener un usuario existente
    const users = await db.getAllUsers();
    if (users.length === 0) {
      throw new Error("No test user available");
    }
    testUserId = users[0].id;

    // Obtener un proyecto existente
    const projects = await db.getAllProjects();
    if (projects.length === 0) {
      throw new Error("No test project available");
    }
    testProjectId = projects[0].id;
  });

  it("should create a project detail successfully", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        role: "super_admin",
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
      },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.projectDetails.create({
      projectId: testProjectId,
      type: "nota_importante",
      title: "Test Note",
      content: "This is a test note",
      photoUrl: undefined,
    });

    expect(result).toEqual({ success: true });

    // Verify the detail was created
    const details = await caller.projectDetails.getByProject({ projectId: testProjectId });
    const testDetail = details.find((d) => d.title === "Test Note");
    expect(testDetail).toBeDefined();
    expect(testDetail?.content).toBe("This is a test note");
  });

  it("should reject creation without required fields", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        role: "super_admin",
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
      },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.projectDetails.create({
        projectId: testProjectId,
        type: "nota_importante",
        title: "", // Empty title
        content: "This is a test note",
        photoUrl: undefined,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("El título es requerido");
    }
  });

  it("should reject creation for unauthorized roles", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        role: "operario", // Not allowed role
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
      },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.projectDetails.create({
        projectId: testProjectId,
        type: "nota_importante",
        title: "Test Note",
        content: "This is a test note",
        photoUrl: undefined,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
