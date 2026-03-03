import { describe, it, expect } from "vitest";
import * as whatsappCloud from "./whatsapp-cloud";

describe("WhatsApp Phone Number ID Discovery", () => {
  it("should get Phone Number ID from WABA", async () => {
    // Verify environment variables are set
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    expect(accessToken).toBeDefined();
    expect(wabaId).toBeDefined();

    if (!accessToken || !wabaId) {
      console.log("⚠️  Skipping test: WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID not set");
      return;
    }

    console.log(`\n[TEST] Getting Phone Number ID from WABA: ${wabaId}`);

    const result = await whatsappCloud.getPhoneNumberIdFromWABA();

    console.log(`[TEST] Result:`, JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`✅ Phone Number ID found: ${result.phoneNumberId}`);
      console.log(`📱 Phone Number: ${result.phoneNumber}`);
      console.log(`\n🔑 USE THIS ID FOR WHATSAPP_PHONE_NUMBER_ID: ${result.phoneNumberId}`);
      
      expect(result.phoneNumberId).toBeDefined();
      expect(result.phoneNumber).toBeDefined();
      expect(result.phoneNumberId).toMatch(/^\d+$/);
    } else {
      console.error(`❌ Error: ${result.error}`);
      throw new Error(`Failed to get Phone Number ID: ${result.error}`);
    }
  });
});
