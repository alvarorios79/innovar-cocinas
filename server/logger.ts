import pino from "pino";

/**
 * Logger centralizado con Pino
 * Niveles: trace, debug, info, warn, error, fatal
 * Incluye timestamp, contexto del módulo y stack traces automáticos
 */

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          singleLine: false,
        },
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Crea un logger con contexto de módulo
 * @param moduleName - Nombre del módulo (ej: "clients", "quotations")
 */
export function getLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}

/**
 * Logger para tRPC procedures
 */
export function getProcedureLogger(procedureName: string) {
  return logger.child({ procedure: procedureName, type: "trpc" });
}

export default logger;
