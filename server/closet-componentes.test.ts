import { describe, it, expect } from "vitest";
import { lineasCloset } from "../shared/closetTexto";
import { componentesMarcados } from "../shared/closetComponentes";

describe("Closet: componentes, cantidades y concepto abierto", () => {
  it("escribe cantidades en plural y el concepto abierto", () => {
    const lineas = lineasCloset({ type: "estandar", width: 3.15, height: 2.4, squareMeters: 7.56, doorType: "abierto",
      accessories: { cajoneroTriple: true, cajonero4: true, esquineroCuadrado: true, dobleColgadero: true }, cantidades: { cajoneroTriple: 2 }, medidasCm: { cajoneroTriple: 85, dobleColgadero: 120 } });
    const t = lineas.join("\n");
    expect(t).toContain("CONCEPTO ABIERTO (VESTIER)");
    expect(t).toContain("Madera aglomerado de alta presión tipo RH, color a elegir por el cliente, con regruesos en los paneles, zócalo, base y techo.");
    expect(t).not.toMatch(/Maletero|corrediz|batiente/i); // no habla de puertas ni de lo de un closet con puertas
    expect(t).toContain("• 2 cajoneros triples (0,85 m de ancho cada uno)");
    expect(t).toContain("• Doble colgadero (1,20 m de ancho)");
    expect(t).not.toContain("Espaldar");
    expect(t).toContain("• Cajonero de 4 cajones");
    expect(t).toContain("• Estantería esquinera cuadrada");
  });
  it("las cotizaciones antiguas (sin casillas nuevas) siguen igual", () => {
    expect(componentesMarcados({ maletero: true, zapatero: true })).toEqual(["Zapatero", "Maletero"]);
    const viejo = lineasCloset({ type: "premium", width: 2, height: 2.4, squareMeters: 4.8, doorType: "corredizas", accessories: {} }).join("\n");
    expect(viejo).toContain("• Maletero");
    expect(viejo).toContain("• Doble cajonero");
  });
  it("el sistema corredizo de la gama Deluxe es Ducasse; en las demás, el herraje corredizo normal", async () => {
    const { appendHouseStandards } = await import("./kitchen-description");
    const de = appendHouseStandards("closet", "Closet", { closetConfig: { type: "deluxe", doorType: "corredizas" } });
    const es = appendHouseStandards("closet", "Closet", { closetConfig: { type: "estandar", doorType: "corredizas" } });
    expect(de).toContain("corredizas Ducasse");
    expect(es).not.toContain("Ducasse");
  });
  it("el closet con puertas lleva su frase fija y no repite material ni color", async () => {
    const { appendHouseStandards } = await import("./kitchen-description");
    const cc: any = { type: "premium", doorType: "batientes", width: 2.5, height: 2.4, squareMeters: 6, accessories: { entrepanos: true } };
    const t = appendHouseStandards("closet", lineasCloset(cc).join("\n"), { closetConfig: cc });
    expect(t).toContain("Closet en madera aglomerada de alta presión tipo RH color a elegir por el cliente (diseño final por definir).");
    expect(t).toContain("Puertas batientes");
    expect(t.match(/color a elegir/gi)?.length).toBe(1);
    expect(t).not.toContain("15 mm");
  });
  it("mueble de baño: cajones llevan rieles y puertas llevan bisagras en acero inoxidable de cierre lento", async () => {
    const { appendHouseStandards } = await import("./kitchen-description");
    const puertas = appendHouseStandards("baño", "Mueble de Baño", { bathroomConfig: { puertas: 2, entrepanos: 1 } });
    expect(puertas).toContain("Bisagras en acero inoxidable de cierre lento");
    expect(puertas).not.toContain("Rieles"); // sin cajones no hay rieles
    const cajones = appendHouseStandards("baño", "Mueble de Baño", { bathroomConfig: { cajones: 6 } });
    expect(cajones).toContain("Rieles telescópicos");
    expect(cajones).not.toContain("Bisagras"); // sin puertas no hay bisagras
    const viejo = appendHouseStandards("baño", "Mueble de Baño", { bathroomConfig: { frentes: 3 } });
    expect(viejo).toContain("Bisagras de cierre lento");
    expect(viejo).toContain("Rieles telescópicos");
  });
});
