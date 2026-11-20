import { describe, it, expect } from "vitest";
import { fechaValidezCotizacion, validezRecortadaPorDiciembre } from "../shared/validezCotizacion";

const d = (y: number, m: number, dia: number) => new Date(y, m - 1, dia, 10, 0, 0);
const ymd = (f: Date) => `${f.getFullYear()}-${f.getMonth() + 1}-${f.getDate()}`;

describe("Validez de la cotización: 15 días, sin pasar del 15 de diciembre", () => {
  it("emitida en noviembre vale 15 días", () => {
    expect(ymd(fechaValidezCotizacion(d(2026, 11, 20)))).toBe("2026-12-5");
    expect(validezRecortadaPorDiciembre(d(2026, 11, 20))).toBe(false);
  });
  it("si los 15 días caerían después del 15 de diciembre, vence el 15", () => {
    expect(ymd(fechaValidezCotizacion(d(2026, 12, 10)))).toBe("2026-12-15");
    expect(ymd(fechaValidezCotizacion(d(2026, 12, 1)))).toBe("2026-12-15");
    expect(validezRecortadaPorDiciembre(d(2026, 12, 10))).toBe(true);
  });
  it("emitida del 16 al 31 de diciembre no tiene validez después de ese día (los precios cambian en enero)", () => {
    expect(ymd(fechaValidezCotizacion(d(2026, 12, 20)))).toBe("2026-12-20");
  });
  it("emitida en enero vuelve a valer 15 días", () => {
    expect(ymd(fechaValidezCotizacion(d(2027, 1, 5)))).toBe("2027-1-20");
  });
});
