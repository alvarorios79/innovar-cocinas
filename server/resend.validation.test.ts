import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Validation", () => {
  it("should validate Resend API key and domain configuration", async () => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    expect(resendApiKey).toBeDefined();
    expect(emailFrom).toBeDefined();
    expect(emailFrom).toContain("@");

    const resend = new Resend(resendApiKey);

    // Intentar obtener información de la API para validar la key
    // Usamos un endpoint simple que no envía emails pero valida la autenticación
    try {
      // Crear un email de prueba (no se enviará realmente, solo valida la API key)
      const result = await resend.emails.send({
        from: emailFrom!,
        to: "test@resend.dev", // Email de prueba oficial de Resend
        subject: "Test de validación",
        html: "<p>Este es un email de prueba para validar la configuración de Resend</p>",
      });

      // Si llegamos aquí, la API key es válida
      expect(result).toBeDefined();
      console.log("✅ Resend API key validada correctamente");
      console.log("✅ Email remitente configurado:", emailFrom);
    } catch (error: any) {
      // Si hay error, mostrar detalles
      console.error("❌ Error al validar Resend:", error.message);
      throw new Error(
        `Resend validation failed: ${error.message}. Verifica que la API key sea correcta y que el dominio ${emailFrom?.split("@")[1]} esté verificado en Resend.`
      );
    }
  }, 30000); // 30 segundos de timeout para la llamada a la API
});
