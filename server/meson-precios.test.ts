import { describe, it, expect } from "vitest";
import { lineasSubMeson, hierrosBarra, precioHerrajeBarra, applyMesonPrices, precioPiedraML, multiplicadorFondoCm, precioLavaplatos, cantLateralesIsla, piedraMesonPrincipal, piedraIsla, piedraBarra, normalizarPiedra } from "../shared/mesonPrecios";

describe("Mesones: una sola fuente de precios", () => {
  applyMesonPrices(() => undefined); // respaldo = precios de Álvaro

  it("piedras: granito 750, cuarzo 850, sinterizado 1.200 (cuarzo se escribe de 3 formas)", () => {
    expect(precioPiedraML("granito")).toBe(750000);
    expect(precioPiedraML("quarzone")).toBe(850000);
    expect(precioPiedraML("quarzo")).toBe(850000);
    expect(precioPiedraML("cuarzo")).toBe(850000);
    expect(precioPiedraML("sinterizado")).toBe(1200000);
    expect(normalizarPiedra("acero")).toBe("sinterizado"); // el acero ya no se cotiza
  });

  it("fondo sin huecos: 90,5 cm ya no sale más barato que 90", () => {
    expect(multiplicadorFondoCm(60)).toBe(1);
    expect(multiplicadorFondoCm(65)).toBe(1);
    expect(multiplicadorFondoCm(66)).toBe(1.3);
    expect(multiplicadorFondoCm(90)).toBe(1.3);
    expect(multiplicadorFondoCm(90.5)).toBe(2);
    expect(multiplicadorFondoCm(120)).toBe(2);
  });

  it("barra: siempre precio angosta, también menos de 35 cm", () => {
    expect(piedraBarra({ countertopType: "granito", meters: 2 })).toBe(980000);
    expect(piedraBarra({ countertopType: "quarzone", meters: 2, hasLateral: true, barraAlturaLateral: 90 })).toBe(2 * 600000 + 0.9 * 600000);
  });

  it("lavaplatos: sencillo 180, doble 700, otro = precio escrito, antiguo = 130", () => {
    expect(precioLavaplatos({ lavaplatosTipo: "sencillo" })).toBe(180000);
    expect(precioLavaplatos({ lavaplatosTipo: "doble" })).toBe(700000);
    expect(precioLavaplatos({ lavaplatosTipo: "otro", lavaprecio: 450000 })).toBe(450000);
    expect(precioLavaplatos({ lavaplatosTipo: "ninguno", incluyeLavaplatos: true })).toBe(0);
    expect(precioLavaplatos({ incluyeLavaplatos: true })).toBe(130000);
    expect(precioLavaplatos({ incluyeLavaplatos: false })).toBe(0);
  });

  it("laterales de isla por separado: 0, 1 o 2; la casilla antigua vale 2", () => {
    expect(cantLateralesIsla({ cantLateralesIsla: 1 })).toBe(1);
    expect(cantLateralesIsla({ incluyeLateralesIsla: true })).toBe(2);
    expect(cantLateralesIsla({})).toBe(0);
    const base = { countertopType: "cuarzo", meters: 2 };
    const sin = piedraIsla({ ...base, cantLateralesIsla: 0 });
    expect(piedraIsla({ ...base, cantLateralesIsla: 1 }) - sin).toBe(0.9 * 850000);
    expect(piedraIsla({ ...base, cantLateralesIsla: 2 }) - sin).toBe(1.8 * 850000);
  });

  it("mesón principal de cocina: metros resultantes × piedra, con fondo, regrueso y lavaplatos", () => {
    expect(piedraMesonPrincipal({ type: "quarzone" }, 3)).toBe(2550000);
    expect(piedraMesonPrincipal({ type: "granito", depthSurcharge: "30percent" }, 2)).toBe(2 * 750000 * 1.3);
    expect(piedraMesonPrincipal({ type: "quarzone", lavaplatosTipo: "doble" }, 3)).toBe(2550000 + 700000);
    expect(piedraMesonPrincipal({}, 3)).toBe(0);
  });

  it("barra nueva con herraje: piedra = largo + lateral + regrueso interior (altura); herraje proporcional a 1,20 m", () => {
    const bar = { reglaV2: true, countertopType: "quarzone", meters: 2, incluyeHerraje: true, barraAlturaLateral: 100 };
    expect(piedraBarra(bar)).toBe((2 + 2 * 1.0) * 600000);
    expect(precioHerrajeBarra(1.2)).toBe(380000);
    expect(precioHerrajeBarra(2)).toBe(633000); // 380.000 × 2 / 1,2 redondeado al millar
    expect(hierrosBarra(bar)).toBe(633000);
  });

  it("barra nueva con pedestal y sin herraje: solo mesón superior; pedestal por unidad", () => {
    const bar = { reglaV2: true, countertopType: "granito", meters: 2, incluyeHerraje: false, incluyePedestal: true, cantPedestales: 2, barraAlturaLateral: 100 };
    expect(piedraBarra(bar)).toBe(2 * 490000);
    expect(hierrosBarra(bar)).toBe(500000);
  });

  it("barra antigua conserva precio fijo de pedestal y herraje", () => {
    expect(hierrosBarra({ incluyePedestal: true, incluyeHerraje: true, meters: 3 })).toBe(250000 + 380000);
  });

  it("importado: el precio escrito manda sobre el del Motor", () => {
    expect(piedraMesonPrincipal({ type: "granito", esImportado: true, precioImportadoML: 1000000 }, 2)).toBe(2000000);
  });

  it("Mesón Solo: texto con lavaplatos sencillo/doble, laterales de isla e importado", () => {
    const f = (n: number) => String(n);
    const meson = lineasSubMeson({ tipo: "meson", material: "quarzo", metrosLineales: 2, fondo: 60, reglaV2: true, lavaplatosTipo: "doble", subtotal: 1 }, 0, f).join("\n");
    expect(meson).toContain("Lavaplatos doble y pegado");
    const isla = lineasSubMeson({ tipo: "isla", material: "granito", metrosLineales: 2, fondo: 60, reglaV2: true, cantLaterales: 1, esImportado: true, subtotal: 1 }, 1, f).join("\n");
    expect(isla).toContain("1 lateral en piedra");
    expect(isla).toContain("GRANITO IMPORTADO");
  });
});
