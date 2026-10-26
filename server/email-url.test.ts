import { describe, expect, it } from "vitest";
import { welcomeEmailTemplate } from "./email-templates";

describe("Email URL Configuration", () => {
  it("should use VITE_APP_URL environment variable for portal links", () => {
    const appUrl = process.env.VITE_APP_URL;
    
    expect(appUrl).toBeDefined();
    expect(appUrl).toBe("https://innovar-cocinas.onrender.com");
  });

  it("should generate correct portal URL in welcome email", () => {
    const portalUrl = `${process.env.VITE_APP_URL || ""}/portal`;
    
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
    const portalUrl = `${process.env.VITE_APP_URL || ""}/portal`;
    
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
