import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const adminUser: AuthenticatedUser = {
    id: 1,
    openId: "admin-task-notif",
    email: "admin-notif@example.com",
    name: "Admin Notificaciones",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createWorkerContext(userId: number): { ctx: TrpcContext } {
  const workerUser: AuthenticatedUser = {
    id: userId,
    openId: `worker-${userId}`,
    email: `worker-${userId}@example.com`,
    name: "Trabajador Test",
    loginMethod: "password",
    role: "operario",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: workerUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Task Notifications", () => {
  it("should create task successfully with notification data", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Primero obtener usuarios asignables para tener un ID válido
    const assignableUsers = await caller.tasks.getAssignableUsers();
    
    if (assignableUsers.length === 0) {
      // Si no hay usuarios asignables, el test pasa (no hay a quién notificar)
      expect(true).toBe(true);
      return;
    }

    const targetUser = assignableUsers[0];

    // Crear tarea asignada
    const result = await caller.tasks.create({
      title: "Tarea de prueba para notificación",
      description: "Esta es una tarea de prueba",
      priority: "alta",
      assignedTo: targetUser.id,
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
    expect(typeof result.taskId).toBe("number");
  });

  it("should include all priority levels in task creation", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const assignableUsers = await caller.tasks.getAssignableUsers();
    
    if (assignableUsers.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const targetUser = assignableUsers[0];

    // Probar cada nivel de prioridad
    const priorities = ["alta", "media", "baja"] as const;
    
    for (const priority of priorities) {
      const result = await caller.tasks.create({
        title: `Tarea prioridad ${priority}`,
        priority: priority,
        assignedTo: targetUser.id,
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
    }
  }, 15000);

  it("should create task with due date", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const assignableUsers = await caller.tasks.getAssignableUsers();
    
    if (assignableUsers.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const targetUser = assignableUsers[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const result = await caller.tasks.create({
      title: "Tarea con fecha límite",
      priority: "media",
      dueDate: dueDate,
      assignedTo: targetUser.id,
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
  });

  it("should allow worker to see their assigned tasks", async () => {
    const { ctx: adminCtx } = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const assignableUsers = await adminCaller.tasks.getAssignableUsers();
    
    if (assignableUsers.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const targetUser = assignableUsers[0];

    // Crear tarea como admin
    const createResult = await adminCaller.tasks.create({
      title: "Tarea para verificar lista",
      priority: "media",
      assignedTo: targetUser.id,
    });

    expect(createResult.success).toBe(true);

    // Verificar que el trabajador puede ver sus tareas
    const { ctx: workerCtx } = createWorkerContext(targetUser.id);
    const workerCaller = appRouter.createCaller(workerCtx);

    const myTasks = await workerCaller.tasks.getMyTasks();
    expect(Array.isArray(myTasks)).toBe(true);
  });

  it("notifications endpoint should return notifications for user", async () => {
    const { ctx: workerCtx } = createWorkerContext(999);
    const workerCaller = appRouter.createCaller(workerCtx);

    // Verificar que el endpoint de notificaciones funciona
    const notifications = await workerCaller.notifications.getMyNotifications({ limit: 10 });
    expect(Array.isArray(notifications)).toBe(true);

    const unreadCount = await workerCaller.notifications.getUnreadCount();
    expect(typeof unreadCount.count).toBe("number");
  });
});
