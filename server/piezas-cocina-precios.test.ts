import { describe, it, expect } from "vitest";
import { applyCocinaBase as applyPiezaPrices, precioMuebleSuelto, precioPiezaFija, precioFrentePollo } from "../shared/piezasCocinaPrecios";

// Precios del Motor (17 nov 2026)
const MOTOR: Record<string, number> = {
  COCINA_ML_ESTANDAR: 900000, COCINA_ML_PREMIUM: 1000000, COCINA_ML_DELUXE: 1100000, COCINA_ML_FRENTE_PLL: 900000,
  NICHO_NEVECON: 1200000, NICHO_NEVERA: 1100000, ALACENA_ENTREPANOS: 1250000, ALACENA_HERRAJE: 900000, TORRE_HORNOS: 1350000,
  RECARGO_PIEZA_SUELTA: 15, RECARGO_PIEZA_FIJA: 10,
  PIEZA_FRENTE_POLLO_ML: 750000, PIEZA_NICHO_NEVECON: 1, // valores viejos de PIEZA_* ya no se usan para estas piezas
};

describe("Piezas de cocina: precio = cocina + recargo", () => {
  applyPiezaPrices((c) => MOTOR[c]);

  it("mueble alto/bajo suelto = categoría + 15 %", () => {
    expect(precioMuebleSuelto("estandar")).toBe(1035000);
    expect(precioMuebleSuelto("premium")).toBe(1150000);
    expect(precioMuebleSuelto("deluxe")).toBe(1265000);
    expect(2 * precioMuebleSuelto("premium")).toBe(2300000);
  });

  it("nichos, alacenas y torre como pieza sola = precio de la cocina + 10 %", () => {
    expect(precioPiezaFija("nicho_nevecon")).toBe(1320000);
    expect(precioPiezaFija("nicho_nevera")).toBe(1210000);
    expect(precioPiezaFija("alacena_entrepanos")).toBe(1375000);
    expect(precioPiezaFija("alacena_herraje")).toBe(990000);
    expect(precioPiezaFija("torre_hornos")).toBe(1485000);
  });

  it("frente pollo = Frente PLL de la cocina ($900.000)", () => {
    expect(precioFrentePollo()).toBe(900000);
  });

  it("si cambia el precio de la cocina en el Motor, la pieza lo sigue", () => {
    applyPiezaPrices((c) => ({ ...MOTOR, COCINA_ML_PREMIUM: 1200000 } as any)[c]);
    expect(precioMuebleSuelto("premium")).toBe(1380000);
    applyPiezaPrices((c) => MOTOR[c]);
  });
});
