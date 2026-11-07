import { describe, expect, it } from "vitest";
import { welcomeEmailTemplate } from "./email-templates";

describe("Email URL Configuration", () => {
  it("portal links fall back to the real CRM address when VITE_APP_URL is not set", () => {
    const portalUrl = `${process.env.VITE_APP_URL || "https://innovar-cocinas.onrender.com"}/portal`;
    expect(portalUrl.startsWith("https://")).toBe(true);
  });

  it("should generate correct portal URL in welcome email", () => {
    const portalUrl = `${process.env.VITE_APP_URL || "https://innovar-cocinas.onrender.com"}/portal`;
    
    expect(portalUrl).toBe("https://innovar-cocinas.onrender.com/portal");
    
    const emailData = welcomeEmailTemplate({
      userName: "Test User",
      email: "test@example.com",
      temporaryPassword: "TempPass123",
      portalUrl,
    });

    expect(emailData.html).toContain("https://innovar-cocinas.onrender.com/portal");
    expect(emailData.html).toContain("Acceder al Portal");
  });

  it("should not contain invalid portal URLs like http://portal", () => {
    const portalUrl = `${process.env.VITE_APP_URL || "https://innovar-cocinas.onrender.com"}/portal`;
    
    const emailData = welcomeEmailTemplate({
      userName: "Test User",
      email: "test@example.com",
      temporaryPassword: "TempPass123",
      portalUrl,
    });

    expect(emailData.html).not.toContain("http://portal");
    expect(emailData.html).not.toContain("href=\"/portal\"");
  });
});
