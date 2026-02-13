/**
 * Rate Limiting - Fase 1: Blindaje inmediato
 * 
 * Límites:
 * - API tRPC general: 60 req/min por IP
 * - Endpoints de autenticación: 5 req/min por IP
 * - Uploads/image proxy: 5 req/min por IP
 * 
 * No modifica lógica de negocio. Solo protege contra abuso.
 * Usa keyGenerator por defecto de express-rate-limit (IP con soporte IPv6).
 */
import rateLimit from "express-rate-limit";

/**
 * Rate limiter general para la API tRPC (60 req/min por IP)
 * Protección base contra abuso sin bloquear tráfico legítimo
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas solicitudes a la API. Intente de nuevo en un minuto.",
    code: "API_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * Rate limiter para endpoints de autenticación (5 req/min por IP)
 * Protege contra fuerza bruta en login/password/OAuth
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de autenticación. Intente de nuevo en un minuto.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * Rate limiter para uploads/image proxy (5 req/min por IP)
 * Protege contra abuso de recursos de descarga/subida
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas subidas de archivos. Intente de nuevo en un minuto.",
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
});
