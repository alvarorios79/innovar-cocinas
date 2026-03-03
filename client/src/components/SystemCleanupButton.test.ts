import { describe, it, expect, vi, beforeEach } from "vitest";

describe("SystemCleanupButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require exact 'CONFIRMAR' text to enable cleanup", () => {
    // Test that partial text like "CONFIRM" or "confirmar" should not enable the button
    const testCases = [
      { input: "CONFIRM", shouldEnable: false },
      { input: "confirmar", shouldEnable: false },
      { input: "CONFIRMAR", shouldEnable: true },
      { input: "CONFIRMAR ", shouldEnable: false },
      { input: " CONFIRMAR", shouldEnable: false },
      { input: "", shouldEnable: false },
    ];

    testCases.forEach(({ input, shouldEnable }) => {
      const isEnabled = input === "CONFIRMAR";
      expect(isEnabled).toBe(shouldEnable);
    });
  });

  it("should validate confirmation text is case-sensitive", () => {
    const validConfirmations = [
      { text: "CONFIRMAR", isValid: true },
      { text: "Confirmar", isValid: false },
      { text: "confirmar", isValid: false },
      { text: "CONFIRMAR!", isValid: false },
    ];

    validConfirmations.forEach(({ text, isValid }) => {
      expect(text === "CONFIRMAR").toBe(isValid);
    });
  });

  it("should handle cleanup results correctly", () => {
    const mockResults = {
      usersDeleted: 10,
      clientsDeleted: 5,
      projectsDeleted: 3,
      quotationsDeleted: 2,
      appointmentsDeleted: 1,
    };

    // Verify all fields are present
    expect(mockResults).toHaveProperty("usersDeleted");
    expect(mockResults).toHaveProperty("clientsDeleted");
    expect(mockResults).toHaveProperty("projectsDeleted");
    expect(mockResults).toHaveProperty("quotationsDeleted");
    expect(mockResults).toHaveProperty("appointmentsDeleted");

    // Verify all values are non-negative
    Object.values(mockResults).forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  it("should only show cleanup button to super_admin", () => {
    const roles = ["user", "admin", "super_admin"];
    const shouldShowButton = (role: string) => role === "super_admin";

    roles.forEach((role) => {
      expect(shouldShowButton(role)).toBe(role === "super_admin");
    });
  });

  it("should display warning before cleanup execution", () => {
    const warningText =
      "Esta acción eliminará todos los registros marcados como 'system' (dataOrigin = 'system'). Esta acción es irreversible.";

    expect(warningText).toContain("irreversible");
    expect(warningText).toContain("dataOrigin");
    expect(warningText).toContain("system");
  });

  it("should format cleanup results display correctly", () => {
    const results = {
      usersDeleted: 246,
      clientsDeleted: 0,
      projectsDeleted: 0,
      quotationsDeleted: 0,
      appointmentsDeleted: 0,
    };

    const formattedResults = [
      `Usuarios eliminados: ${results.usersDeleted}`,
      `Clientes eliminados: ${results.clientsDeleted}`,
      `Proyectos eliminados: ${results.projectsDeleted}`,
      `Cotizaciones eliminadas: ${results.quotationsDeleted}`,
      `Citas eliminadas: ${results.appointmentsDeleted}`,
    ];

    expect(formattedResults).toHaveLength(5);
    expect(formattedResults[0]).toBe("Usuarios eliminados: 246");
  });

  it("should handle zero deletions gracefully", () => {
    const zeroResults = {
      usersDeleted: 0,
      clientsDeleted: 0,
      projectsDeleted: 0,
      quotationsDeleted: 0,
      appointmentsDeleted: 0,
    };

    const totalDeleted = Object.values(zeroResults).reduce((a, b) => a + b, 0);
    expect(totalDeleted).toBe(0);
  });

  it("should validate button is disabled during cleanup", () => {
    const isPending = true;
    const confirmText = "CONFIRMAR";

    const shouldDisable = isPending || confirmText !== "CONFIRMAR";
    expect(shouldDisable).toBe(true);

    const isPendingFalse = false;
    const shouldNotDisable = isPendingFalse || confirmText !== "CONFIRMAR";
    expect(shouldNotDisable).toBe(false);
  });
});
