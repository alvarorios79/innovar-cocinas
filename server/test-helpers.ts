/**
 * Test Helpers - Wrappers para creación de datos de prueba
 * 
 * Estos helpers automáticamente marcan todos los datos de prueba como dataOrigin = "system"
 * para permitir limpieza selectiva sin afectar datos reales (manual).
 */

import * as db from './db';

/**
 * Crear un cliente de prueba con dataOrigin = "system"
 */
export async function createTestClient(client: any) {
  return db.createClient(client, "system");
}

/**
 * Crear un proyecto de prueba con dataOrigin = "system"
 */
export async function createTestProject(project: any) {
  return db.createProject(project, "system");
}

/**
 * Crear una cotización de prueba con dataOrigin = "system"
 */
export async function createTestQuotation(quotation: any) {
  return db.createQuotation(quotation, "system");
}

/**
 * Crear una cita de prueba con dataOrigin = "system"
 */
export async function createTestAppointment(appointment: any) {
  return db.createAppointment(appointment, "system");
}

/**
 * Alias para compatibilidad - algunos tests pueden usar db.createClient directamente
 * En esos casos, se debe reemplazar por createTestClient
 */
export const testDb = {
  createClient: createTestClient,
  createProject: createTestProject,
  createQuotation: createTestQuotation,
  createAppointment: createTestAppointment,
};

export default testDb;
