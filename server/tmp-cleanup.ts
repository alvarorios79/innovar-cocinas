/**
 * Limpieza segura de archivos temporales - Fase 1: Blindaje inmediato
 * 
 * Garantiza que los archivos en /tmp se eliminen después de usarlos,
 * incluso si ocurre un error durante el procesamiento.
 */
import { existsSync, unlinkSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { logger } from "./logger";

/**
 * Elimina un archivo temporal de forma segura.
 * No lanza error si el archivo no existe.
 */
export function cleanupTempFile(filepath: string): void {
  try {
    if (filepath && existsSync(filepath)) {
      unlinkSync(filepath);
    }
  } catch (error) {
    logger.error({ filepath, error }, "[TmpCleanup] Error eliminando archivo temporal");
  }
}

/**
 * Ejecuta una función con un archivo temporal, garantizando limpieza con try/finally.
 * El archivo se elimina después de que la función termine, exitosa o no.
 */
export async function withTempFile<T>(
  filepath: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } finally {
    cleanupTempFile(filepath);
  }
}

/**
 * Limpia archivos PDF huérfanos en /tmp que tengan más de maxAgeMinutes.
 * Se ejecuta periódicamente para evitar acumulación.
 */
export function cleanupOrphanedPDFs(maxAgeMinutes: number = 30): { cleaned: number; errors: number } {
  let cleaned = 0;
  let errors = 0;
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  const dirs = ["/tmp", "/tmp/quotation-pdfs"];

  for (const dir of dirs) {
    try {
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir);

      for (const file of files) {
        if (!file.endsWith(".pdf")) continue;

        const filepath = join(dir, file);
        try {
          const stat = statSync(filepath);
          if (now - stat.mtimeMs > maxAgeMs) {
            unlinkSync(filepath);
            cleaned++;
          }
        } catch (e) {
          errors++;
        }
      }
    } catch (e) {
      // Directorio no accesible, ignorar
    }
  }

  return { cleaned, errors };
}

/**
 * Inicia limpieza periódica de archivos temporales huérfanos.
 * Se ejecuta cada 30 minutos.
 */
export function startPeriodicCleanup(): void {
  // Limpieza inicial
  const initial = cleanupOrphanedPDFs(30);
  if (initial.cleaned > 0) {
    logger.info({ cleaned: initial.cleaned }, "[TmpCleanup] Limpieza inicial");
  }

  // Limpieza periódica cada 30 minutos
  setInterval(() => {
    const result = cleanupOrphanedPDFs(30);
    if (result.cleaned > 0) {
      logger.info({ cleaned: result.cleaned, errors: result.errors }, "[TmpCleanup] Limpieza periódica");
    }
  }, 30 * 60 * 1000);

  logger.info("[TmpCleanup] Limpieza periódica de /tmp iniciada");
}
