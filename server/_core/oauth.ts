import type { Express } from "express";

// OAuth de Manus eliminado. INNOVAR usa autenticación propia con email/contraseña.
export function registerOAuthRoutes(_app: Express) {
  // No-op: ruta /api/oauth/callback ya no es necesaria.
}
