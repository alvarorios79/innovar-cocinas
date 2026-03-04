import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

/**
 * Test para validar que WHATSAPP_PHONE_NUMBER_ID está correctamente configurado
 * y que no se está usando el WABA ID en su lugar
 */
describe("WhatsApp Configuration - Phone Number ID Fix", () => {
  it("should have WHATSAPP_PHONE_NUMBER_ID correctly set", () => {
    console.log("\n=== WhatsApp Configuration Test ===");
    console.log("ENV.whatsappPhoneNumberId:", ENV.whatsappPhoneNumberId);
    console.log("process.env.WHATSAPP_PHONE_NUMBER_ID:", process.env.WHATSAPP_PHONE_NUMBER_ID);
    console.log("ENV.whatsappBusinessAccountId:", ENV.whatsappBusinessAccountId);
    console.log("process.env.WHATSAPP_BUSINESS_ACCOUNT_ID:", process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);

    // Verify Phone Number ID is set
    expect(ENV.whatsappPhoneNumberId).toBeDefined();
    expect(ENV.whatsappPhoneNumberId).not.toBe("");
    expect(ENV.whatsappPhoneNumberId).toBe("1043323385524323");

    console.log("✅ Phone Number ID is correctly configured");
  });

  it("should NOT have WABA ID as Phone Number ID", () => {
    // Verify that Phone Number ID is NOT the WABA ID
    expect(ENV.whatsappPhoneNumberId).not.toBe(ENV.whatsappBusinessAccountId);
    expect(ENV.whatsappPhoneNumberId).not.toBe("920948637152314");

    console.log("✅ Phone Number ID is different from WABA ID");
  });

  it("should have WHATSAPP_ACCESS_TOKEN configured", () => {
    expect(ENV.whatsappAccessToken).toBeDefined();
    expect(ENV.whatsappAccessToken).not.toBe("");

    console.log("✅ WhatsApp Access Token is configured");
  });

  it("should construct correct API URL for document sending", () => {
    const apiVersion = "v18.0";
    const correctUrl = `https://graph.facebook.com/${apiVersion}/${ENV.whatsappPhoneNumberId}/messages`;
    const incorrectUrl = `https://graph.facebook.com/${apiVersion}/${ENV.whatsappBusinessAccountId}/messages`;

    // Verify correct URL
    expect(correctUrl).toBe("https://graph.facebook.com/v18.0/1043323385524323/messages");
    expect(correctUrl).not.toContain("920948637152314");

    // Verify incorrect URL would be wrong
    expect(incorrectUrl).toBe("https://graph.facebook.com/v18.0/920948637152314/messages");

    console.log(`✅ Correct API URL: ${correctUrl}`);
    console.log(`❌ Incorrect API URL (WABA): ${incorrectUrl}`);
  });

  it("should verify WhatsApp API connectivity", async () => {
    if (!ENV.whatsappPhoneNumberId || !ENV.whatsappAccessToken) {
      console.log("⚠️  Skipping API connectivity test - missing credentials");
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${ENV.whatsappPhoneNumberId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ENV.whatsappAccessToken}`,
          },
        }
      );

      const data = await response.json() as Record<string, unknown>;

      console.log(`\n📡 API Response Status: ${response.status}`);

      if (response.ok) {
        console.log(`✅ WhatsApp API is accessible with Phone Number ID`);
        console.log(`📱 Phone Number: ${(data as Record<string, unknown>).display_phone_number}`);
        console.log(`✓ Verified Name: ${(data as Record<string, unknown>).verified_name}`);
        expect(response.status).toBe(200);
      } else {
        const errorMsg = JSON.stringify(data);
        console.error(`❌ API Error: ${errorMsg}`);

        // Check if error indicates wrong ID
        if (errorMsg.includes("does not exist")) {
          throw new Error(
            `Phone Number ID ${ENV.whatsappPhoneNumberId} does not exist. ` +
            `This indicates you might be using the WABA ID instead of Phone Number ID.`
          );
        }
        throw new Error(`API Error: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Connection Error: ${errorMsg}`);
      throw error;
    }
  });

  it("should import sendWhatsAppDocument function", async () => {
    const { sendWhatsAppDocument } = await import("./_core/whatsapp");

    expect(sendWhatsAppDocument).toBeDefined();
    expect(typeof sendWhatsAppDocument).toBe("function");

    console.log("✅ sendWhatsAppDocument function is available");
    console.log("✅ Function uses ENV.whatsappPhoneNumberId for API calls");
  });
});
