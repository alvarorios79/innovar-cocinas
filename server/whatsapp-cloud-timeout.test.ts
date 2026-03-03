import { describe, it, expect, vi, beforeEach } from "vitest";
import * as whatsappCloud from "./whatsapp-cloud";

describe("WhatsApp Cloud - Timeout Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect abort error as timeout", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => {
      throw new Error("The operation was aborted");
    }) as any;

    const result = await whatsappCloud.sendTextMessage("573105570247", "Test");
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Timeout");
    expect(result.errorCode).toBe("TIMEOUT");
    
    global.fetch = originalFetch;
  });

  it("should return error message for API failures", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "Invalid phone number",
          code: 400,
        },
      }),
    })) as any;

    const result = await whatsappCloud.sendTextMessage("invalid", "Test");
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
    
    global.fetch = originalFetch;
  });

  it("should successfully send message when API responds quickly", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        messages: [{ id: "msg_123" }],
      }),
    })) as any;

    const result = await whatsappCloud.sendTextMessage("573105570247", "Test");
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_123");
    
    global.fetch = originalFetch;
  });

  it("should handle network errors gracefully", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => {
      throw new Error("Network request failed");
    }) as any;

    const result = await whatsappCloud.sendTextMessage("573105570247", "Test");
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Network");
    
    global.fetch = originalFetch;
  });

  it("should format phone numbers correctly", () => {
    const testCases = [
      { input: "3105570247", expected: "573105570247" },
      { input: "573105570247", expected: "573105570247" },
      { input: "+573105570247", expected: "573105570247" },
      { input: "310 557 0247", expected: "573105570247" },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = whatsappCloud.formatPhoneForWhatsApp(input);
      expect(result).toBe(expected);
    });
  });
});
