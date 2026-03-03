import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Hardware Catalog with Prices", () => {
  let hardwareId: number;

  beforeAll(async () => {
    // Asegurar que la conexión a la base de datos está disponible
    const connection = await db.getDb();
    expect(connection).toBeDefined();
  });

  it("should create hardware item with price", async () => {
    // Crear herraje con precio
    hardwareId = await db.createHardwareItem({
      category: "cocinas",
      name: "Bisagra Premium Test",
      description: "Bisagra de alta calidad para puertas de cocina",
      price: 15000,
      sortOrder: 1,
    });

    expect(hardwareId).toBeGreaterThan(0);
  });

  it("should retrieve hardware by category", async () => {
    const hardwareList = await db.getHardwareCatalog("cocinas");
    
    expect(Array.isArray(hardwareList)).toBe(true);
    
    // Buscar el herraje que acabamos de crear
    const createdHardware = hardwareList.find((h: any) => h.id === hardwareId);
    expect(createdHardware).toBeDefined();
    expect(createdHardware?.name).toBe("Bisagra Premium Test");
    expect(createdHardware?.category).toBe("cocinas");
    expect(createdHardware?.price).toBe("15000.00"); // Decimal se retorna como string
    expect(createdHardware?.active).toBe(true);
  });

  it("should update hardware price", async () => {
    // Actualizar precio
    await db.updateHardwareItem(hardwareId, {
      price: 18500,
    });

    // Verificar que el precio se actualizó
    const hardwareList = await db.getHardwareCatalog("cocinas");
    const updatedHardware = hardwareList.find((h: any) => h.id === hardwareId);
    
    expect(updatedHardware?.price).toBe("18500.00");
  });

  it("should update hardware name and description", async () => {
    await db.updateHardwareItem(hardwareId, {
      name: "Bisagra Premium Updated",
      description: "Descripción actualizada",
    });

    const hardwareList = await db.getHardwareCatalog("cocinas");
    const updatedHardware = hardwareList.find((h: any) => h.id === hardwareId);
    
    expect(updatedHardware?.name).toBe("Bisagra Premium Updated");
    expect(updatedHardware?.description).toBe("Descripción actualizada");
  });

  it("should soft delete hardware item", async () => {
    // Eliminar (soft delete)
    await db.deleteHardwareItem(hardwareId);

    // Verificar que ya no aparece en la lista de activos
    const activeHardware = await db.getHardwareCatalog("cocinas");
    const deletedHardware = activeHardware.find((h: any) => h.id === hardwareId);
    
    expect(deletedHardware).toBeUndefined();
  });

  it("should get all hardware including inactive", async () => {
    const allHardware = await db.getAllHardware();
    
    expect(Array.isArray(allHardware)).toBe(true);
    
    // El herraje eliminado debe estar en la lista completa pero con active=false
    const deletedHardware = allHardware.find((h: any) => h.id === hardwareId);
    expect(deletedHardware).toBeDefined();
    expect(deletedHardware?.active).toBe(false);
  });

  it("should filter hardware by different categories", async () => {
    // Crear herrajes en diferentes categorías
    const cocinasId = await db.createHardwareItem({
      category: "cocinas",
      name: "Test Cocinas",
      price: 10000,
    });

    const closetsId = await db.createHardwareItem({
      category: "closets",
      name: "Test Closets",
      price: 12000,
    });

    const puertasId = await db.createHardwareItem({
      category: "puertas",
      name: "Test Puertas",
      price: 8000,
    });

    // Verificar filtrado por categoría
    const cocinasHardware = await db.getHardwareCatalog("cocinas");
    const closetsHardware = await db.getHardwareCatalog("closets");
    const puertasHardware = await db.getHardwareCatalog("puertas");

    expect(cocinasHardware.some((h: any) => h.id === cocinasId)).toBe(true);
    expect(cocinasHardware.some((h: any) => h.id === closetsId)).toBe(false);
    
    expect(closetsHardware.some((h: any) => h.id === closetsId)).toBe(true);
    expect(closetsHardware.some((h: any) => h.id === cocinasId)).toBe(false);
    
    expect(puertasHardware.some((h: any) => h.id === puertasId)).toBe(true);
    expect(puertasHardware.some((h: any) => h.id === cocinasId)).toBe(false);

    // Limpiar
    await db.deleteHardwareItem(cocinasId);
    await db.deleteHardwareItem(closetsId);
    await db.deleteHardwareItem(puertasId);
  });
});
