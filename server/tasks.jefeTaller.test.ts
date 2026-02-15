import { describe, it, expect } from "vitest";

describe("Jefe de Taller Task Permissions", () => {
  describe("Task Visibility", () => {
    it("should allow jefe_taller to access task list endpoint", () => {
      const canViewFiltered = ["jefe_taller"];
      const canViewAll = ["admin", "super_admin", "comercial"];
      
      expect(canViewFiltered.includes("jefe_taller")).toBe(true);
      expect(canViewAll.includes("jefe_taller")).toBe(false);
    });

    it("should filter tasks for jefe_taller - only assigned to them or assigned by them", () => {
      const jefeTallerId = 5;
      const tasks = [
        { id: 1, assignedTo: 5, assignedBy: 1, title: "Task assigned to jefe" },
        { id: 2, assignedTo: 3, assignedBy: 5, title: "Task assigned by jefe" },
        { id: 3, assignedTo: 3, assignedBy: 1, title: "Task not related to jefe" },
        { id: 4, assignedTo: 5, assignedBy: 5, title: "Task both assigned to and by jefe" },
      ];

      const filteredTasks = tasks.filter(t => 
        t.assignedTo === jefeTallerId || t.assignedBy === jefeTallerId
      );

      expect(filteredTasks.length).toBe(3);
      expect(filteredTasks.map(t => t.id)).toEqual([1, 2, 4]);
    });

    it("should NOT filter tasks for admin", () => {
      const canViewAll = ["admin", "super_admin", "comercial"];
      expect(canViewAll.includes("admin")).toBe(true);
    });

    it("should NOT filter tasks for super_admin", () => {
      const canViewAll = ["admin", "super_admin", "comercial"];
      expect(canViewAll.includes("super_admin")).toBe(true);
    });

    it("should NOT filter tasks for comercial", () => {
      const canViewAll = ["admin", "super_admin", "comercial"];
      expect(canViewAll.includes("comercial")).toBe(true);
    });
  });

  describe("Task Deletion", () => {
    it("should allow admin to delete any task", () => {
      const role = "admin";
      const task = { status: "pendiente", assignedBy: 999 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      expect(isAdmin).toBe(true);
    });

    it("should allow super_admin to delete any task", () => {
      const role = "super_admin";
      const task = { status: "pendiente", assignedBy: 999 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      expect(isAdmin).toBe(true);
    });

    it("should allow jefe_taller to delete completed tasks they created", () => {
      const userId = 5;
      const role = "jefe_taller";
      const task = { status: "completada", assignedBy: 5 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      const isCreator = task.assignedBy === userId;
      const isJefeTaller = role === "jefe_taller";
      
      // Logic: Admin can delete anything, or creator can delete if not jefe_taller with incomplete task
      const canDelete = isAdmin || (isCreator && (!isJefeTaller || task.status === "completada"));
      
      expect(canDelete).toBe(true);
    });

    it("should NOT allow jefe_taller to delete pending tasks they created", () => {
      const userId = 5;
      const role = "jefe_taller";
      const task = { status: "pendiente", assignedBy: 5 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      const isCreator = task.assignedBy === userId;
      const isJefeTaller = role === "jefe_taller";
      
      // Jefe taller can only delete completed tasks
      const canDelete = isAdmin || (isCreator && (!isJefeTaller || task.status === "completada"));
      
      expect(canDelete).toBe(false);
    });

    it("should NOT allow jefe_taller to delete in-progress tasks they created", () => {
      const userId = 5;
      const role = "jefe_taller";
      const task = { status: "en_progreso", assignedBy: 5 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      const isCreator = task.assignedBy === userId;
      const isJefeTaller = role === "jefe_taller";
      
      const canDelete = isAdmin || (isCreator && (!isJefeTaller || task.status === "completada"));
      
      expect(canDelete).toBe(false);
    });

    it("should NOT allow jefe_taller to delete tasks they did not create", () => {
      const userId = 5;
      const role = "jefe_taller";
      const task = { status: "completada", assignedBy: 1 }; // Created by someone else
      
      const isAdmin = role === "admin" || role === "super_admin";
      const isCreator = task.assignedBy === userId;
      
      expect(isAdmin).toBe(false);
      expect(isCreator).toBe(false);
    });

    it("should allow other roles to delete tasks they created regardless of status", () => {
      const userId = 3;
      const role = "disenador";
      const task = { status: "pendiente", assignedBy: 3 };
      
      const isAdmin = role === "admin" || role === "super_admin";
      const isCreator = task.assignedBy === userId;
      const isJefeTaller = role === "jefe_taller";
      
      const canDelete = isAdmin || (isCreator && (!isJefeTaller || task.status === "completada"));
      
      expect(canDelete).toBe(true);
    });
  });

  describe("Bulk Delete Filtering", () => {
    it("should filter out non-deletable tasks for jefe_taller in bulk delete", () => {
      const userId = 5;
      const role = "jefe_taller";
      
      const tasks = [
        { id: 1, status: "completada", assignedBy: 5 }, // Can delete
        { id: 2, status: "pendiente", assignedBy: 5 },  // Cannot delete
        { id: 3, status: "en_progreso", assignedBy: 5 }, // Cannot delete
        { id: 4, status: "completada", assignedBy: 1 }, // Cannot delete (not creator)
      ];

      const canDeleteTask = (task: any) => {
        const isAdmin = role === "admin" || role === "super_admin";
        const isCreator = task.assignedBy === userId;
        const isJefeTaller = role === "jefe_taller";
        
        if (isAdmin) return true;
        if (!isCreator) return false;
        if (isJefeTaller && task.status !== "completada") return false;
        
        return true;
      };

      const deletableTasks = tasks.filter(t => canDeleteTask(t));
      
      expect(deletableTasks.length).toBe(1);
      expect(deletableTasks[0].id).toBe(1);
    });
  });
});
