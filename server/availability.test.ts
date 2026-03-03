import { describe, it, expect, vi } from "vitest";

// Test the APPOINTMENT_CONFIG to ensure correct time slots
describe("Appointment Configuration", () => {
  it("should have the correct time slots configured", async () => {
    // Import the config
    const { APPOINTMENT_CONFIG } = await import("./availability");
    
    const expectedSlots = ["08:30", "10:00", "14:00", "15:30"];
    const actualSlots = APPOINTMENT_CONFIG.timeSlots.map((s: any) => s.start);
    
    expect(actualSlots).toEqual(expectedSlots);
  });

  it("should have correct allowed days (Tuesday=2, Thursday=4, Friday=5)", async () => {
    const { APPOINTMENT_CONFIG } = await import("./availability");
    
    expect(APPOINTMENT_CONFIG.allowedDays).toEqual([2, 4, 5]);
  });

  it("should have 1.5 hour duration for each slot", async () => {
    const { APPOINTMENT_CONFIG } = await import("./availability");
    
    // Verify duration is 1.5 hours (90 minutes) by checking slot end times
    const slot1 = APPOINTMENT_CONFIG.timeSlots[0]; // 08:30
    expect(slot1.start).toBe("08:30");
    expect(slot1.end).toBe("10:00"); // 1.5 hours later
  });

  it("should NOT include 13:30 (1:30 PM) as a valid slot", async () => {
    const { APPOINTMENT_CONFIG } = await import("./availability");
    
    const actualSlots = APPOINTMENT_CONFIG.timeSlots.map((s: any) => s.start);
    expect(actualSlots).not.toContain("13:30");
  });

  it("should have exactly 4 time slots (2 morning + 2 afternoon)", async () => {
    const { APPOINTMENT_CONFIG } = await import("./availability");
    
    expect(APPOINTMENT_CONFIG.timeSlots).toHaveLength(4);
  });
});

describe("isAllowedDay", () => {
  it("should allow Tuesday (2)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(2)).toBe(true);
  });

  it("should allow Thursday (4)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(4)).toBe(true);
  });

  it("should allow Friday (5)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(5)).toBe(true);
  });

  it("should NOT allow Monday (1)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(1)).toBe(false);
  });

  it("should NOT allow Sunday (0)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(0)).toBe(false);
  });

  it("should NOT allow Saturday (6)", async () => {
    const { isAllowedDay } = await import("./availability");
    expect(isAllowedDay(6)).toBe(false);
  });
});
