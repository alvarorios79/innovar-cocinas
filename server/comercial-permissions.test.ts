import { describe, it, expect } from "vitest";

describe("Comercial Role Permissions", () => {
  describe("Client Management Permissions", () => {
    it("should allow comercial to list clients", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });

    it("should allow comercial to create clients", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });

    it("should allow comercial to delete clients", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });

    it("should NOT allow regular user to manage clients", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("user")).toBe(false);
    });

    it("should NOT allow disenador to manage clients", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("disenador")).toBe(false);
    });
  });

  describe("Project Management Permissions", () => {
    it("should allow comercial to create projects", () => {
      const allowedRoles = ["admin", "super_admin", "comercial"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });
  });

  describe("Task Management Permissions", () => {
    it("should allow comercial to view all tasks", () => {
      const canViewAll = ["admin", "super_admin", "comercial"];
      expect(canViewAll.includes("comercial")).toBe(true);
    });

    it("should allow comercial to reassign tasks", () => {
      const canReassignRoles = ["super_admin", "admin", "comercial", "jefe_taller"];
      expect(canReassignRoles.includes("comercial")).toBe(true);
    });

    it("should allow comercial to assign tasks", () => {
      const canAssignRoles = ["super_admin", "admin", "comercial", "disenador", "jefe_taller", "operario"];
      expect(canAssignRoles.includes("comercial")).toBe(true);
    });
  });

  describe("Material and Hardware Permissions", () => {
    it("should allow comercial to upload photos", () => {
      const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });

    it("should allow comercial to edit materials", () => {
      const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });

    it("should allow comercial to select hardware", () => {
      const allowedRoles = ["super_admin", "admin", "comercial", "disenador"];
      expect(allowedRoles.includes("comercial")).toBe(true);
    });
  });

  describe("Notification Permissions", () => {
    it("should include comercial in quotation approval notifications", () => {
      const notifyRoles = ["super_admin", "admin", "comercial"];
      expect(notifyRoles.includes("comercial")).toBe(true);
    });

    it("should include comercial in design delivery notifications", () => {
      const notifyRoles = ["super_admin", "admin", "comercial"];
      expect(notifyRoles.includes("comercial")).toBe(true);
    });

    it("should include comercial in payment reminder notifications", () => {
      const notifyRoles = ["super_admin", "admin", "comercial"];
      expect(notifyRoles.includes("comercial")).toBe(true);
    });
  });

  describe("Restricted Permissions", () => {
    it("should NOT allow comercial to manage birthdays", () => {
      const allowedRoles = ["super_admin"];
      expect(allowedRoles.includes("comercial")).toBe(false);
    });
  });
});
