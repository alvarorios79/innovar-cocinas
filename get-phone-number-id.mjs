#!/usr/bin/env node

/**
 * Script para obtener el Phone Number ID correcto desde Meta
 * Usa el endpoint whatsappCloud.getPhoneNumberId que ya existe en el servidor
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

async function getPhoneNumberId() {
  try {
    console.log("Obteniendo Phone Number ID desde Meta...");
    console.log("API URL:", API_URL);
    
    const response = await fetch(`${API_URL}/api/trpc/whatsappCloud.getPhoneNumberId`);
    
    if (!response.ok) {
      console.error("Error HTTP:", response.status, response.statusText);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }
    
    const data = await response.json();
    console.log("\nRespuesta de Meta:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data[0]?.result?.data?.success) {
      const phoneNumberId = data[0].result.data.phoneNumberId;
      const phoneNumber = data[0].result.data.phoneNumber;
      
      console.log("\n✅ Phone Number ID encontrado:");
      console.log("   ID:", phoneNumberId);
      console.log("   Número:", phoneNumber);
      console.log("\nUSA ESTE ID EN LA VARIABLE DE ENTORNO WHATSAPP_PHONE_NUMBER_ID");
    } else {
      console.error("\n❌ Error obteniendo Phone Number ID:");
      console.error(data[0]?.result?.data?.error || "Error desconocido");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getPhoneNumberId();
