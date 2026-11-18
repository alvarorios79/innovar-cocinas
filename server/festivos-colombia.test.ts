import { describe, it, expect } from "vitest";
import { festivosColombia, sumarDiasHabiles, esDiaHabil } from "../shared/festivosColombia";
import { COLOMBIAN_HOLIDAYS } from "./business-days";

describe("Festivos de Colombia calculados", () => {
  it("coinciden con la lista oficial escrita a mano de 2024, 2025 y 2026", () => {
    for (const y of [2024, 2025, 2026]) {
      const esperado = new Set(COLOMBIAN_HOLIDAYS.filter((h) => h.date.startsWith(String(y))).map((h) => h.date));
      expect([...festivosColombia(y)].sort()).toEqual([...esperado].sort());
    }
  });
  it("2027 ya tiene festivos (1 y 11 de enero, etc.)", () => {
    const f = festivosColombia(2027);
    expect(f.has("2027-01-01")).toBe(true);
    expect(f.has("2027-01-11")).toBe(true); // Reyes (6 ene, miércoles) pasa al lunes 11
    expect(f.size).toBe(18);
  });
  it("25 días hábiles desde el martes 17 nov 2026 caen el miércoles 23 dic 2026", () => {
    const d = sumarDiasHabiles(new Date(2026, 10, 17), 25);
    expect(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`).toBe("2026-12-23");
  });
  it("cruzando el año nuevo no cuenta el 1 ni el 11 de enero de 2027", () => {
    const d = sumarDiasHabiles(new Date(2026, 11, 28), 5); // lun 28 dic → mar 29, mié 30, jue 31, (vie 1 ene festivo), lun 4, mar 5
    expect(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`).toBe("2027-1-5");
    expect(esDiaHabil(new Date(2027, 0, 11))).toBe(false);
  });
});
