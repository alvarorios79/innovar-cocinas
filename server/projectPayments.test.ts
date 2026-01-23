import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock del módulo db
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  createProjectPayment: vi.fn(),
  getProjectPaymentsByProjectId: vi.fn(),
  getProjectPaymentById: vi.fn(),
  deleteProjectPayment: vi.fn(),
  createProjectStatusHistory: vi.fn(),
}));

import * as db from "./db";

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createDesignerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "designer-user",
    email: "designer@example.com",
    name: "Designer User",
    loginMethod: "manus",
    role: "disenador",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("projectPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("allows admin to create a payment", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 1,
        name: "Test Project",
        status: "adelanto_recibido",
        clientId: 1,
        workType: "cocina",
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        quotationId: null,
        initialMeasurements: null,
        design3dFiles: null,
        despieceFiles: null,
        quotationSentAt: null,
        quotationApprovedAt: null,
        advanceReceivedAt: null,
        advanceAmount: null,
        advanceReceiptUrl: null,
        quotationPdfUrl: null,
        designDeadline: null,
        designDeliveredAt: null,
        clientApprovedAt: null,
        clientApprovalNotes: null,
        selectedColors: null,
        selectedMaterials: null,
        estimatedInstallDate: null,
        scheduledInstallDate: null,
        installDurationDays: 1,
        deliveredAt: null,
        designerId: null,
      });
      vi.mocked(db.createProjectPayment).mockResolvedValue(1);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);

      const result = await caller.projectPayments.create({
        projectId: 1,
        type: "saldo_final",
        amount: 5000000,
        paymentDate: new Date("2026-01-23"),
        notes: "Pago del 40% restante",
      });

      expect(result).toEqual({ success: true, paymentId: 1 });
      expect(db.createProjectPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 1,
          type: "saldo_final",
          amount: "5000000",
          registeredBy: 1,
        })
      );
    });

    it("rejects payment creation from non-admin users", async () => {
      const ctx = createDesignerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.projectPayments.create({
          projectId: 1,
          type: "saldo_final",
          amount: 5000000,
          paymentDate: new Date("2026-01-23"),
        })
      ).rejects.toThrow("Solo administradores pueden registrar pagos");
    });
  });

  describe("getByProjectId", () => {
    it("returns payments for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const mockPayments = [
        {
          id: 1,
          projectId: 1,
          type: "adelanto" as const,
          amount: "6000000",
          paymentDate: new Date("2026-01-15"),
          receiptUrl: null,
          notes: null,
          registeredBy: 1,
          createdAt: new Date(),
        },
        {
          id: 2,
          projectId: 1,
          type: "saldo_final" as const,
          amount: "4000000",
          paymentDate: new Date("2026-01-23"),
          receiptUrl: null,
          notes: null,
          registeredBy: 1,
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getProjectPaymentsByProjectId).mockResolvedValue(mockPayments);

      const result = await caller.projectPayments.getByProjectId({ projectId: 1 });

      expect(result).toEqual(mockPayments);
      expect(db.getProjectPaymentsByProjectId).toHaveBeenCalledWith(1);
    });

    it("returns empty array for designer users (cannot see payments)", async () => {
      const ctx = createDesignerContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projectPayments.getByProjectId({ projectId: 1 });

      expect(result).toEqual([]);
      expect(db.getProjectPaymentsByProjectId).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("allows admin to delete a payment", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      vi.mocked(db.getProjectPaymentById).mockResolvedValue({
        id: 1,
        projectId: 1,
        type: "saldo_final",
        amount: "5000000",
        paymentDate: new Date(),
        receiptUrl: null,
        notes: null,
        registeredBy: 1,
        createdAt: new Date(),
      });
      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 1,
        name: "Test Project",
        status: "entregado",
        clientId: 1,
        workType: "cocina",
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        quotationId: null,
        initialMeasurements: null,
        design3dFiles: null,
        despieceFiles: null,
        quotationSentAt: null,
        quotationApprovedAt: null,
        advanceReceivedAt: null,
        advanceAmount: null,
        advanceReceiptUrl: null,
        quotationPdfUrl: null,
        designDeadline: null,
        designDeliveredAt: null,
        clientApprovedAt: null,
        clientApprovalNotes: null,
        selectedColors: null,
        selectedMaterials: null,
        estimatedInstallDate: null,
        scheduledInstallDate: null,
        installDurationDays: 1,
        deliveredAt: null,
        designerId: null,
      });
      vi.mocked(db.deleteProjectPayment).mockResolvedValue(undefined);
      vi.mocked(db.createProjectStatusHistory).mockResolvedValue(1);

      const result = await caller.projectPayments.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(db.deleteProjectPayment).toHaveBeenCalledWith(1);
    });

    it("rejects deletion from non-admin users", async () => {
      const ctx = createDesignerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.projectPayments.delete({ id: 1 })
      ).rejects.toThrow("Solo administradores pueden eliminar pagos");
    });
  });
});
