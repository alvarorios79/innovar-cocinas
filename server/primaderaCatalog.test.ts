import { describe, it, expect } from "vitest";
import { parseWoodColors, formatWoodColors, findPrimaderaDesign, emptyWoodColors } from "../shared/primaderaCatalog";

describe("Colores de madera (Primadera)", () => {
  it("cocina toda de un color con interior blanco", () => {
    const txt = formatWoodColors({ ...emptyWoodColors(), exterior: "Sikuani" });
    expect(txt).toBe("Interior: Blanco Tradicional · Exterior: Sikuani");
    expect(parseWoodColors(txt)).toMatchObject({ interior: "Blanco Tradicional", mode: "toda", exterior: "Sikuani" });
  });

  it("superiores e inferiores de distinto color, interior Yalaa", () => {
    const c = { interior: "Yalaa", mode: "dividida" as const, exterior: "", superiores: "Ártico", inferiores: "Sikuani" };
    const txt = formatWoodColors(c);
    expect(txt).toBe("Interior: Yalaa · Superiores: Ártico · Inferiores: Sikuani");
    expect(parseWoodColors(txt)).toEqual(c);
  });

  it("texto viejo sin etiquetas queda como exterior", () => {
    expect(parseWoodColors("Roble Natural")).toMatchObject({ mode: "toda", exterior: "Roble Natural", interior: "" });
  });

  it("vacío arranca con interior blanco", () => {
    expect(parseWoodColors("")).toEqual(emptyWoodColors());
  });

  it("cada color con foto tiene su muestra y los altos brillos tienen color aproximado", async () => {
    const fs = await import("fs");
    const { PRIMADERA_DESIGNS, woodHasPhoto, woodSwatchUrl } = await import("../shared/primaderaCatalog");
    for (const d of PRIMADERA_DESIGNS) {
      if (woodHasPhoto(d)) expect(fs.existsSync(`client/public${woodSwatchUrl(d)}`), d.code).toBe(true);
      else expect(d.color, d.code).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(PRIMADERA_DESIGNS.filter((d) => d.category === "altos_brillos").length).toBe(6);
    expect(PRIMADERA_DESIGNS.filter((d) => d.category.startsWith("dx_")).length).toBe(47);
    // Mismo nombre en dos marcas no se confunde: "Humo" es Primadera, "Humo (Duratex)" es Duratex
    expect(findPrimaderaDesign("Humo")?.category).toBe("unicolores");
    expect(findPrimaderaDesign("Humo (Duratex)")?.category).toBe("dx_maderas");
  });

  it("reconoce colores sin importar tildes ni mayúsculas", () => {
    expect(findPrimaderaDesign("artico")?.name).toBe("Ártico");
    expect(findPrimaderaDesign("Roble Natural")).toBeUndefined();
  });
});

import { findCountertopDesign, countertopLabel, countertopDesignsByType } from "../shared/countertopCatalog";

describe("Catálogo de mesones", () => {
  it("reconoce el mesón guardado con su acabado", () => {
    const d = findCountertopDesign("Calala Gold · Mate");
    expect(d?.code).toBe("calala_gold_mate");
    expect(countertopLabel(d!)).toBe("Calala Gold · Mate");
  });
  it("referencias sin acabado se guardan solo con el nombre", () => {
    expect(countertopLabel(findCountertopDesign("Verde Ubatuba")!)).toBe("Verde Ubatuba");
  });
  it("cada referencia con foto tiene su archivo de muestra", async () => {
    const fs = await import("fs");
    const { COUNTERTOP_DESIGNS, countertopHasPhoto } = await import("../shared/countertopCatalog");
    for (const d of COUNTERTOP_DESIGNS.filter(countertopHasPhoto)) {
      expect(fs.existsSync(`client/public/materiales/mesones/${d.code}.jpg`), d.code).toBe(true);
    }
  });
  it("un nombre sin acabado también encuentra la muestra", () => {
    expect(findCountertopDesign("carrara")?.code).toBe("carrara_brillante");
  });
  it("filtra por tipo de mesón", () => {
    expect(countertopDesignsByType("sinterizado").length).toBe(14);
    expect(countertopDesignsByType("cuarzo").length).toBe(9);
    expect(countertopDesignsByType("granito").length).toBe(6);
  });
});
