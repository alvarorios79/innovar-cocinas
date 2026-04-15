/**
 * Quotation Versioning Logic
 * 
 * Handles creation of new versions of quotations with proper tracking of:
 * - Parent quotation (previous version)
 * - Base quotation (original)
 * - Version number (auto-incremented)
 * - isAdditional derived automatically (true if versionNumber > 1)
 * - Lock only if status === "approved"
 */

import { getDb } from "./db";
import { quotations, quotationItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface QuotationVersionInfo {
  parentQuotationId: number | null;
  isAdditional: number;
  baseQuotationId: number | null;
  versionNumber: number;
}

/**
 * Get versioning info for a quotation
 */
export async function getQuotationVersionInfo(quotationId: number): Promise<QuotationVersionInfo | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      parentQuotationId: quotations.parentQuotationId,
      isAdditional: quotations.isAdditional,
      baseQuotationId: quotations.baseQuotationId,
      versionNumber: quotations.versionNumber,
    })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get all versions of a quotation (including the base and all versions)
 */
export async function getQuotationVersionChain(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First, find the quotation to determine its base
  const quotation = await db
    .select({
      id: quotations.id,
      baseQuotationId: quotations.baseQuotationId,
      parentQuotationId: quotations.parentQuotationId,
      versionNumber: quotations.versionNumber,
      isAdditional: quotations.isAdditional,
      status: quotations.status,
      createdAt: quotations.createdAt,
      quotationNumber: quotations.quotationNumber,
      total: quotations.total,
    })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  if (!quotation[0]) return [];

  const baseId = quotation[0].baseQuotationId || quotation[0].id;
  console.log(`[VERSIONING-CHAIN] Buscando cadena para quotationId=${quotationId}, baseId=${baseId}, currentVersion=${quotation[0].versionNumber}`);

  // Get all versions that share the same base
  const allVersions = await db
    .select({
      id: quotations.id,
      baseQuotationId: quotations.baseQuotationId,
      parentQuotationId: quotations.parentQuotationId,
      versionNumber: quotations.versionNumber,
      isAdditional: quotations.isAdditional,
      status: quotations.status,
      createdAt: quotations.createdAt,
      quotationNumber: quotations.quotationNumber,
      total: quotations.total,
    })
    .from(quotations)
    .where(eq(quotations.baseQuotationId, baseId));
  
  console.log(`[VERSIONING-CHAIN] Versiones encontradas con baseQuotationId=${baseId}: ${allVersions.map(v => `V${v.versionNumber}(id=${v.id})`).join(', ')}`);

  // Include the base quotation itself if not already in the list
  if (!allVersions.some(v => v.id === baseId)) {
    console.log(`[VERSIONING-CHAIN] Base quotation (id=${baseId}) no está en la lista, buscando...`);
    const baseQuotation = await db
      .select({
        id: quotations.id,
        baseQuotationId: quotations.baseQuotationId,
        parentQuotationId: quotations.parentQuotationId,
        versionNumber: quotations.versionNumber,
        isAdditional: quotations.isAdditional,
        status: quotations.status,
        createdAt: quotations.createdAt,
        quotationNumber: quotations.quotationNumber,
        total: quotations.total,
      })
      .from(quotations)
      .where(eq(quotations.id, baseId))
      .limit(1);

    if (baseQuotation[0]) {
      console.log(`[VERSIONING-CHAIN] Base quotation encontrada: V${baseQuotation[0].versionNumber}(id=${baseQuotation[0].id})`);
      allVersions.push(baseQuotation[0]);
    } else {
      console.log(`[VERSIONING-CHAIN] Base quotation NO encontrada para id=${baseId}`);
    }
  } else {
    console.log(`[VERSIONING-CHAIN] Base quotation ya está en la lista`);
  }

  const sorted = allVersions.sort((a, b) => (a.versionNumber || 1) - (b.versionNumber || 1));
  console.log(`[VERSIONING-CHAIN] Cadena final: ${sorted.map(v => `V${v.versionNumber}(id=${v.id})`).join(' -> ')}`);
  return sorted;
}

/**
 * Create a new version of a quotation.
 * isAdditional is derived automatically: true (1) if versionNumber > 1.
 * baseQuotationId always points to the original base quotation.
 */
export async function createQuotationVersion(
  parentQuotationId: number,
  userId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the parent quotation
  const parentQuotation = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, parentQuotationId))
    .limit(1);

  if (!parentQuotation[0]) {
    throw new Error("Parent quotation not found");
  }

  const parent = parentQuotation[0];
  // baseQuotationId always points to the original base
  const baseId = parent.baseQuotationId || parentQuotationId;

  // Get the highest version number for this base quotation
  const latestVersions = await db
    .select({ vn: quotations.versionNumber })
    .from(quotations)
    .where(eq(quotations.baseQuotationId, baseId));

  const nextVersionNumber = Math.max(
    ...(latestVersions.map(v => v.vn || 0)),
    parent.versionNumber || 1
  ) + 1;

  // isAdditional derived: true (1) if versionNumber > 1
  const derivedIsAdditional = nextVersionNumber > 1 ? 1 : 0;

  // Create new quotation record
  const result = await db.insert(quotations).values({
    quotationNumber: `${parent.quotationNumber.split('-v')[0]}-v${nextVersionNumber}`,
    clientId: parent.clientId,
    vendorName: parent.vendorName,
    productType: parent.productType,
    status: "draft",
    subtotal: parent.subtotal,
    transportCost: parent.transportCost,
    total: parent.total,
    createdBy: userId,
    parentQuotationId: parentQuotationId,
    isAdditional: derivedIsAdditional,
    baseQuotationId: baseId,
    versionNumber: nextVersionNumber,
    customDescriptions: parent.customDescriptions,
    generalNotes: parent.generalNotes,
    discountPercent: parent.discountPercent,
    discountAmount: parent.discountAmount,
  });

  const newQuotationId = result[0].insertId;

  // Copy all items from parent quotation
  const parentItems = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, parentQuotationId));

  if (parentItems.length > 0) {
    await db.insert(quotationItems).values(
      parentItems.map(item => ({
        quotationId: newQuotationId,
        itemNumber: item.itemNumber,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        includesFixedCosts: item.includesFixedCosts,
        fixedCostsAmount: item.fixedCostsAmount,
        kitchenConfig: item.kitchenConfig,
        hardwareSelections: item.hardwareSelections,
        closetConfig: item.closetConfig,
        doorConfig: item.doorConfig,
        tvCenterConfig: item.tvCenterConfig,
        countertopConfig: item.countertopConfig,
      }))
    );
  }

  return newQuotationId;
}

/**
 * Lock a quotation to prevent further editing.
 * Only allows locking if status === "approved".
 */
export async function lockQuotation(quotationId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const quotation = await db
    .select({ status: quotations.status })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  if (!quotation[0]) {
    throw new Error("Quotation not found");
  }

  if (quotation[0].status !== "approved") {
    throw new Error("Solo se pueden bloquear cotizaciones aprobadas");
  }

  await db
    .update(quotations)
    .set({
      isLocked: 1,
      lockedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      lockedBy: userId,
    })
    .where(eq(quotations.id, quotationId));
}

/**
 * Unlock a quotation.
 */
export async function unlockQuotation(quotationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(quotations)
    .set({
      isLocked: 0,
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(quotations.id, quotationId));
}

/**
 * Check if a quotation is locked.
 */
export async function isQuotationLocked(quotationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const quotation = await db
    .select({ isLocked: quotations.isLocked })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  return quotation[0]?.isLocked === 1;
}


/**
 * Set a previous version as the active version for a project
 * This updates the project to point to the selected version
 */
export async function setActiveVersion(
  quotationId: number,
  userId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the quotation to activate
  const quotationToActivate = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  if (!quotationToActivate[0]) {
    throw new Error("Cotización no encontrada");
  }

  const quotation = quotationToActivate[0];

  // Get the base quotation ID
  const baseId = quotation.baseQuotationId || quotation.id;

  // Get all versions with the same base
  const allVersions = await db
    .select({ id: quotations.id, versionNumber: quotations.versionNumber })
    .from(quotations)
    .where(eq(quotations.baseQuotationId, baseId));

  // Find the current active version (the one with highest version number)
  const currentActive = allVersions.sort((a, b) => (b.versionNumber || 1) - (a.versionNumber || 1))[0];

  // Validate: Cannot activate the same version that is already active
  if (currentActive?.id === quotationId) {
    throw new Error("Esta versión ya es la versión activa");
  }

  // Import getProjectByQuotationId to find the project
  const { getProjectByQuotationId, updateProject } = await import("./db");

  // Find the project linked to any version of this quotation
  let project = null;
  for (const version of allVersions) {
    project = await getProjectByQuotationId(version.id);
    if (project) break;
  }

  if (!project) {
    throw new Error("No se encontró proyecto vinculado a esta cotización");
  }

  // Update the project to point to the new version
  await updateProject(project.id, {
    quotationId: quotationId,
    totalAmount: String(quotation.total || 0),
  });

  console.log(`[VERSIONING] Proyecto ${project.id} actualizado a versión V${quotation.versionNumber} (ID: ${quotationId})`);

  return {
    success: true,
    message: `Versión V${quotation.versionNumber} activada exitosamente`,
  };
}

/**
 * Delete a previous version of a quotation
 * Cannot delete the base version or a version linked to a project
 */
export async function deleteVersion(
  quotationId: number,
  userId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the quotation to delete
  const quotationToDelete = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1);

  if (!quotationToDelete[0]) {
    throw new Error("Cotización no encontrada");
  }

  const quotation = quotationToDelete[0];
  const baseId = quotation.baseQuotationId || quotation.id;

  // Validation 1: Cannot delete the base version (V1)
  if (quotation.id === baseId) {
    throw new Error("No se puede eliminar la versión base (V1) de la cotización");
  }

  // Validation 2: Check if this version is linked to a project
  const { getProjectByQuotationId } = await import("./db");
  const linkedProject = await getProjectByQuotationId(quotationId);

  if (linkedProject) {
    throw new Error(
      `No se puede eliminar esta versión porque está vinculada al proyecto "${linkedProject.name}". ` +
      `Cambia el proyecto a otra versión antes de eliminar esta.`
    );
  }

  // Soft delete: Mark as deleted
  await db
    .update(quotations)
    .set({
      deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(quotations.id, quotationId));

  console.log(`[VERSIONING] Versión V${quotation.versionNumber} (ID: ${quotationId}) eliminada por usuario ${userId}`);

  return {
    success: true,
    message: `Versión V${quotation.versionNumber} eliminada exitosamente`,
  };
}
