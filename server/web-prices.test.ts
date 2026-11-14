import { describe, it, expect } from "vitest";
import { buildWebPrices, PRECIOS_WEB, proximosDiasLibres } from "./web-prices-routes";

describe("precios públicos para la página web", () => {
  const filas = [
    { code: "COCINA_ML_ESTANDAR", value: "900000" },
    { code: "COCINA_ML_PREMIUM", value: 1000000 },
    { code: "COCINA_ML_DELUXE", value: 1100000 },
    { code: "MESON_GRANITO", value: 700000 },
    { code: "HERRAJE_SECRETO", value: 12345 },
  ];

  it("publica solo los códigos de la lista blanca", () => {
    const p = buildWebPrices(filas)!;
    expect(p).toEqual({ mlEstandar: 900000, mlPremium: 1000000, mlDeluxe: 1100000, mesonGranito: 700000 });
    expect(Object.values(PRECIOS_WEB)).not.toContain("herrajeSecreto");
  });

  it("no publica nada si falta alguno de los tres precios base", () => {
    expect(buildWebPrices(filas.slice(0, 2))).toBeNull();
  });

  it("ignora valores no numéricos o en cero", () => {
    const p = buildWebPrices([...filas, { code: "MESON_CUARZO", value: "abc" }, { code: "LED_ML", value: 0 }])!;
    expect(p.mesonCuarzo).toBeUndefined();
    expect(p.ledMl).toBeUndefined();
  });
});

describe("días de visita para la página web", () => {
  // Domingo 15 nov 2026, 10 a. m. en Colombia (15:00 UTC)
  const ahora = new Date("2026-11-15T15:00:00Z");

  it("empieza mañana y solo ofrece martes, jueves y viernes", async () => {
    const dias = await proximosDiasLibres(4, async () => 4, ahora);
    expect(dias).toEqual(["2026-11-17", "2026-11-19", "2026-11-20", "2026-11-24"]); // mar, jue, vie, mar
  });

  it("salta los días sin horarios libres", async () => {
    const dias = await proximosDiasLibres(2, async (iso) => (iso === "2026-11-17" ? 0 : 3), ahora);
    expect(dias).toEqual(["2026-11-19", "2026-11-20"]);
  });
});
