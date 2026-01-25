/**
 * Servicio de notificaciones de cumpleaños para INNOVAR
 * Envía notificaciones a las 8am del día del cumpleaños de cada colaborador
 */

import * as db from "./db";
import { sendPushToUser } from "./push-notifications";

// Frases de cumpleaños para las notificaciones
const BIRTHDAY_MESSAGES = [
  "¡Feliz cumpleaños! 🎂 Que este día esté lleno de alegría y bendiciones. ¡Disfruta tu día especial!",
  "¡Muchas felicidades en tu día! 🎉 Que este nuevo año de vida te traiga mucha felicidad y éxitos.",
  "¡Feliz cumpleaños! 🎁 Gracias por ser parte de la familia INNOVAR. ¡Que tengas un día increíble!",
  "¡Hoy es tu día especial! 🎈 Celebramos contigo otro año de vida. ¡Felicidades!",
  "¡Feliz cumpleaños! 🌟 Que todos tus sueños se hagan realidad. ¡Disfruta tu día!",
];

/**
 * Verifica si hoy es el cumpleaños de un usuario
 */
function isTodayBirthday(birthDate: Date | null | undefined): boolean {
  if (!birthDate) return false;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
}

/**
 * Obtiene un mensaje de cumpleaños aleatorio
 */
function getRandomBirthdayMessage(): string {
  const index = Math.floor(Math.random() * BIRTHDAY_MESSAGES.length);
  return BIRTHDAY_MESSAGES[index];
}

/**
 * Envía notificaciones de cumpleaños a todos los usuarios que cumplen años hoy
 * Esta función debe ser llamada a las 8am todos los días
 */
export async function sendBirthdayNotifications(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  try {
    // Obtener todos los usuarios
    const allUsers = await db.getAllUsers();
    
    // Filtrar usuarios que cumplen años hoy
    const birthdayUsers = allUsers.filter(user => isTodayBirthday(user.birthDate as Date | null));
    
    console.log(`[Birthday Service] Encontrados ${birthdayUsers.length} usuarios con cumpleaños hoy`);
    
    for (const user of birthdayUsers) {
      try {
        const message = getRandomBirthdayMessage();
        
        // Crear notificación en la app
        await db.createNotification({
          userId: user.id,
          title: `🎂 ¡Feliz Cumpleaños, ${user.name?.split(' ')[0] || 'Amigo'}!`,
          body: message,
          type: "sistema",
        });
        
        // Enviar notificación push
        await sendPushToUser(user.id, {
          title: `🎂 ¡Feliz Cumpleaños!`,
          body: message,
        });
        
        console.log(`[Birthday Service] Notificación enviada a ${user.name} (ID: ${user.id})`);
        sent++;
      } catch (error) {
        console.error(`[Birthday Service] Error enviando notificación a usuario ${user.id}:`, error);
        errors++;
      }
    }
  } catch (error) {
    console.error("[Birthday Service] Error general:", error);
  }
  
  return { sent, errors };
}

/**
 * Verifica si ya se enviaron las notificaciones de cumpleaños hoy
 * Para evitar enviar duplicados si el servidor se reinicia
 */
let lastBirthdayCheckDate: string | null = null;

export function shouldSendBirthdayNotifications(): boolean {
  const today = new Date().toISOString().split('T')[0];
  
  if (lastBirthdayCheckDate === today) {
    return false;
  }
  
  lastBirthdayCheckDate = today;
  return true;
}

/**
 * Programa el envío de notificaciones de cumpleaños
 * Se ejecuta cada hora y verifica si son las 8am
 */
export function scheduleBirthdayNotifications(): void {
  // Verificar cada hora
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Enviar a las 8am (hora local del servidor)
    if (hour === 8 && shouldSendBirthdayNotifications()) {
      console.log("[Birthday Service] Ejecutando verificación de cumpleaños a las 8am");
      const result = await sendBirthdayNotifications();
      console.log(`[Birthday Service] Resultado: ${result.sent} enviados, ${result.errors} errores`);
    }
  }, 60 * 60 * 1000); // Cada hora
  
  // También verificar al iniciar el servidor (por si se reinicia después de las 8am)
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 8 && shouldSendBirthdayNotifications()) {
    console.log("[Birthday Service] Verificación inicial de cumpleaños (servidor iniciado después de las 8am)");
    sendBirthdayNotifications().then(result => {
      console.log(`[Birthday Service] Resultado inicial: ${result.sent} enviados, ${result.errors} errores`);
    });
  }
  
  console.log("[Birthday Service] Servicio de notificaciones de cumpleaños programado");
}
