import { describe, it, expect } from "vitest";
import { detectWorks, projectWorkTypeFor, worksLabel, worksGroups } from "@shared/workTypes";
import { buildCaption, captionHashtags } from "@shared/socialPosts";

// Casos reales (cotizaciones de Miriam Zapata, todas con productType "otro")
const puertas = [{ itemType: "otro", description: "Puertas corredizas en material RH macizas con chapa totalmente instaladas" }];
const cocinaYPuertas = [
  { itemType: "otro", description: "cocina modular en material RH sistema gola color a elegir por el cliente" },
  { itemType: "puerta", description: "Puerta(s) en material aglomerado tipo RH" },
];
const islaBanosCloset = [
  { itemType: "mueble_cocina", description: "Isla · 2ml madera · Isla con 2 cajoneros", kitchenConfig: { tipoPieza: "isla" } },
  { itemType: "otro", description: "mueble para baño en aglomerado tipo RH color a elegir por el cliente" },
  { itemType: "otro", description: "mueble para baño en aglomerado tipo RH color a elegir por el cliente" },
  { itemType: "closet", description: "Closet. Material aglomerado tipo RH" },
];

describe("Trabajos reales según la cotización", () => {
  it("lee los trabajos de los ítems (también los de tipo 'otro')", () => {
    expect(detectWorks(puertas, "cocina")).toEqual(["puertas"]);
    expect(detectWorks(cocinaYPuertas, "cocina")).toEqual(["cocina", "puertas"]);
    expect(detectWorks(islaBanosCloset, "cocina")).toEqual(["isla", "closet", "mueble_bano"]);
    expect(worksLabel(detectWorks(islaBanosCloset))).toBe("Isla, closet y mueble de baño");
    expect(worksGroups(detectWorks(islaBanosCloset))).toEqual(["cocina", "closet", "mueble_bano"]);
  });

  it("sin ítems usa el tipo guardado; herrajes sueltos no cuentan", () => {
    expect(detectWorks([], "closet")).toEqual(["closet"]);
    expect(detectWorks([], "puerta")).toEqual(["puertas"]);
    expect(detectWorks([{ itemType: "herrajes", description: "Bisagras" }], "centro_tv")).toEqual(["centro_tv"]);
  });

  it("tipo del proyecto nuevo: ya no queda 'cocina' para puertas o closets", () => {
    expect(projectWorkTypeFor("otro", puertas)).toBe("puertas");
    expect(projectWorkTypeFor("puerta", [])).toBe("puertas");
    expect(projectWorkTypeFor("otro", [{ itemType: "otro", description: "Closet en RH" }])).toBe("closet");
    expect(projectWorkTypeFor("otro", islaBanosCloset)).toBe("cocina");
    expect(projectWorkTypeFor("closet", cocinaYPuertas)).toBe("closet");
  });

  it("el texto para redes nombra el trabajo real", () => {
    expect(buildCaption({ type: "antes_despues", works: detectWorks(puertas), city: "Pereira" }, "instagram"))
      .toContain("Antes y después de estas puertas en Pereira");
    expect(buildCaption({ type: "video", works: detectWorks(islaBanosCloset) }, "tiktok"))
      .toContain("este proyecto a medida (isla, closet y mueble de baño), recién entregado");
    const tags = captionHashtags({ type: "terminado", works: detectWorks(islaBanosCloset) });
    expect(tags).toContain("#Closets");
    expect(tags).toContain("#MueblesDeBaño");
  });
});
