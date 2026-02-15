/**
 * Manejo global de errores no capturados - Fase 1: Blindaje inmediato
 * 
 * Captura:
 * - uncaughtException: errores síncronos no capturados
 * - unhandledRejection: promesas rechazadas sin .catch()
 * 
 * Registra errores sin detener el proceso abruptamente.
 * No modifica flujos funcionales existentes.
 */

import { logger } from "./logger";

/**
 * Registra un error con contexto estructurado usando Pino.
 */
function logError(type: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    {
      type,
      message: errorMessage,
      stack: errorStack,
    },
    `[${type}] Error no capturado`
  );
}

/**
 * Inicializa los handlers globales de errores.
 * Debe llamarse una sola vez al inicio del servidor.
 */
export function initGlobalErrorHandlers(): void {
  // Errores síncronos no capturados
  process.on("uncaughtException", (error: Error) => {
    logError("UncaughtException", error);
    // No llamar process.exit() para evitar detener el servidor
    // El error ya fue logueado para diagnóstico
  });

  // Promesas rechazadas sin .catch()
  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    logError("UnhandledRejection", reason);
  });

  // Señales de terminación (para logging limpio)
  process.on("SIGTERM", () => {
    logger.info("[Process] SIGTERM recibido. Cerrando servidor...");
  });

  process.on("SIGINT", () => {
    logger.info("[Process] SIGINT recibido. Cerrando servidor...");
  });

  logger.info("[GlobalErrorHandler] Handlers de errores globales inicializados");
}
