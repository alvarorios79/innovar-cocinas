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

/**
 * Registra un error con contexto estructurado.
 */
function logError(type: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] [${type}] ${errorMessage}`);
  if (errorStack) {
    console.error(`[${timestamp}] [${type}] Stack: ${errorStack}`);
  }
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
    console.log(`[${new Date().toISOString()}] [Process] SIGTERM recibido. Cerrando servidor...`);
  });

  process.on("SIGINT", () => {
    console.log(`[${new Date().toISOString()}] [Process] SIGINT recibido. Cerrando servidor...`);
  });

  console.log("[GlobalErrorHandler] Handlers de errores globales inicializados");
}
