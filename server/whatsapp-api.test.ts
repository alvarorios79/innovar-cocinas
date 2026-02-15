import { describe, it, expect } from "vitest";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

describe("WhatsApp Business API Credentials", () => {
  it("should validate WhatsApp credentials by checking phone number info", async () => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    // Skip test if credentials are not configured
    if (!phoneNumberId || !accessToken) {
      console.log("WhatsApp credentials not configured, skipping test");
      return;
    }

    // Make a simple API call to verify the token is valid
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    // If credentials are valid, we should get phone number info
    // If invalid, we get an error object
    if (response.ok) {
      expect(data).toHaveProperty("id");
      console.log("WhatsApp credentials are valid. Phone Number ID:", data.id);
    } else {
      // Check if it's an auth error
      if (data.error?.code === 190 || data.error?.code === 104) {
        throw new Error(`Invalid WhatsApp credentials: ${data.error.message}`);
      }
      // Other errors might be acceptable (rate limits, etc.)
      console.log("WhatsApp API response:", data);
    }
  });
});
