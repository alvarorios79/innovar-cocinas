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
});
