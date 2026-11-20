import { describe, it, expect } from "vitest";
import { evaluarGrupo, siguientePaso, proponerExtension, mensajeSeguimiento, primerNombre, restarDiasHabiles, type EntradaSeguimiento } from "../shared/seguimientoCotizacion";

const f = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0, 0);
const ymd = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
const base = (o: Partial<EntradaSeguimiento> = {}): EntradaSeguimiento => ({ status: "sent", sentAt: f(2026, 11, 2), createdAt: f(2026, 11, 2), validUntil: f(2026, 11, 17), approvedAt: null, hayProyecto: false, archivado: false, logs: [], ...o });

describe("Seguimiento de cotizaciones enviadas", () => {
  it("el primer mensaje corresponde a los 2 días hábiles", () => {
    const p = siguientePaso(base(), f(2026, 11, 3))!;   // lunes 2 nov enviada (festivo el 2 de noviembre 2026: Todos los Santos se traslada al lunes 2)
    expect(p.step).toBe("s1");
    expect(p.porEnviar).toBe(false);
    const q = siguientePaso(base(), f(2026, 11, 6))!;
    expect(q.step).toBe("s1");
    expect(q.porEnviar).toBe(true);
  });
  it("después de enviar un mensaje, el siguiente espera al menos 2 días hábiles", () => {
    const p = siguientePaso(base({ logs: [{ step: "s1", at: f(2026, 11, 6) }] }), f(2026, 11, 9))!;
    expect(p.step).toBe("s2");
    expect(p.due.getTime()).toBeGreaterThanOrEqual(f(2026, 11, 10).getTime() - 86400000);
  });
  it("si ya pasaron varias fechas, no se acumulan: aparece solo el último paso que corresponde", () => {
    const p = siguientePaso(base(), f(2026, 11, 13))!;
    expect(["s3", "s4"]).toContain(p.step);
    expect(p.porEnviar).toBe(true);
  });
  it("el aviso de vencimiento ofrece ampliar 7 días con el mismo precio", () => {
    const p = siguientePaso(base({ logs: [{ step: "s1", at: f(2026, 11, 5) }, { step: "s2", at: f(2026, 11, 9) }, { step: "s3", at: f(2026, 11, 11) }] }), f(2026, 11, 13))!;
    expect(p.step).toBe("s4");
    expect(ymd(p.extension!)).toBe("2026-11-24");
  });
  it("el cierre amable solo después del aviso de vencimiento", () => {
    const logs = [{ step: "s1", at: f(2026, 11, 5) }, { step: "s2", at: f(2026, 11, 9) }, { step: "s3", at: f(2026, 11, 11) }];
    expect(siguientePaso(base({ logs }), f(2026, 11, 16))!.step).not.toBe("s5");
    const conS4 = siguientePaso(base({ validUntil: f(2026, 11, 24), logs: [...logs, { step: "s4", at: f(2026, 11, 13), extendedUntil: f(2026, 11, 24) }] }), f(2026, 11, 20))!;
    expect(conS4.step).toBe("s5");
  });
  it("no se avisa si está vencida, archivada, con seguimiento cerrado o ya aprobada con proyecto", () => {
    expect(siguientePaso(base(), f(2026, 12, 1))).toBeNull();
    expect(siguientePaso(base({ archivado: true }), f(2026, 11, 6))).toBeNull();
    expect(siguientePaso(base({ logs: [{ step: "cierre", at: f(2026, 11, 5) }] }), f(2026, 11, 6))).toBeNull();
    expect(siguientePaso(base({ status: "approved", approvedAt: f(2026, 11, 4), hayProyecto: true }), f(2026, 11, 6))).toBeNull();
    expect(siguientePaso(base({ status: "draft" }), f(2026, 11, 6))).toBeNull();
  });
});

describe("Aprobada sin anticipo (sin proyecto)", () => {
  it("el primer mensaje es el mismo día hábil de la aprobación y luego se espacian", () => {
    const e = base({ status: "approved", approvedAt: f(2026, 11, 10) });
    expect(siguientePaso(e, f(2026, 11, 10))).toMatchObject({ tipo: "anticipo", step: "a1", porEnviar: true });
    const p = siguientePaso({ ...e, logs: [{ step: "a1", at: f(2026, 11, 10) }] }, f(2026, 11, 11))!;
    expect(p.step).toBe("a2");
    expect(p.porEnviar).toBe(false);
  });
  it("una aprobación de hace más de un mes ya no genera avisos", () => {
    expect(siguientePaso(base({ status: "approved", approvedAt: f(2026, 9, 1) }), f(2026, 11, 6))).toBeNull();
  });
  it("máximo 3 mensajes", () => {
    const e = base({ status: "approved", approvedAt: f(2026, 11, 10), logs: [{ step: "a1", at: f(2026, 11, 10) }, { step: "a2", at: f(2026, 11, 13) }, { step: "a3", at: f(2026, 11, 20) }] });
    expect(siguientePaso(e, f(2026, 12, 1))).toBeNull();
  });
});

describe("Ampliar la validez sin cambiar el precio", () => {
  it("7 días, una sola vez, sin pasar del 15 de diciembre", () => {
    expect(ymd(proponerExtension(f(2026, 11, 17), false)!)).toBe("2026-11-24");
    expect(ymd(proponerExtension(f(2026, 12, 10), false)!)).toBe("2026-12-15");
    expect(proponerExtension(f(2026, 12, 15), false)).toBeNull();
    expect(proponerExtension(f(2026, 11, 17), true)).toBeNull();
  });
});

describe("Mensajes", () => {
  const c = { nombre: "Adriana", vendedor: "Martha", tipo: "cocina", enlace: "https://x/cotizacion?token=1", vence: "27 de noviembre", nuevaFecha: "4 de diciembre", anticipo: "$13.196.400" };
  it("son cercanos y respetuosos (usted), con el nombre y el enlace", () => {
    for (const p of ["s1", "s2", "s3", "s4", "s5", "a1", "a2", "a3"] as const) {
      const m = mensajeSeguimiento(p, c);
      expect(m).toContain("Adriana");
      expect(m).not.toMatch(/\btú\b|\btu\b|\bte\b/i);   // se trata de «usted»
    }
    expect(mensajeSeguimiento("s1", c)).toContain(c.enlace);
  });
  it("el aviso de vencimiento promete el mismo valor cuando se amplía, y avisa del cambio de enero cuando no se puede", () => {
    expect(mensajeSeguimiento("s4", c)).toMatch(/mismo valor, sin ningún cambio de precio/);
    expect(mensajeSeguimiento("s4", { ...c, nuevaFecha: undefined })).toMatch(/enero actualizamos nuestros precios/);
  });
  it("el anticipo menciona el 60 % y su valor", () => {
    expect(mensajeSeguimiento("a1", c)).toMatch(/60 % \(\$13\.196\.400\)/);
  });
  it("nombres y fechas", () => {
    expect(primerNombre("ADRIANA ABONCE")).toBe("Adriana");
    expect(primerNombre("")).toBe("cliente");
    expect(ymd(restarDiasHabiles(f(2026, 11, 17), 2))).toBe("2026-11-12");
  });
});

describe("Versiones: el seguimiento va por grupo, no por versión (caso Martha Zuluaga)", () => {
  // V1 (133) aprobada por el enlace; V2 (138) con el ajuste, aprobada por llamada; el proyecto quedó en V2
  const versiones = [{ id: 133, baseId: null, version: 1, status: "approved" }, { id: 138, baseId: 133, version: 2, status: "approved" }];
  it("la versión anterior (V1) no genera avisos aunque el proyecto esté en V2", () => {
    const v1 = evaluarGrupo(versiones, new Set([138]), 133);
    expect(v1.esUltima).toBe(false);
    expect(v1.hayProyecto).toBe(true);
  });
  it("la última versión con proyecto tampoco", () => {
    const v2 = evaluarGrupo(versiones, new Set([138]), 138);
    expect(v2.esUltima).toBe(true);
    expect(v2.hayProyecto).toBe(true);
    expect(siguientePaso(base({ status: "approved", approvedAt: f(2026, 11, 20), hayProyecto: v2.hayProyecto }), f(2026, 11, 22))).toBeNull();
  });
  it("aunque el proyecto esté en V1, V2 aprobada no se persigue", () => {
    expect(evaluarGrupo(versiones, new Set([133]), 138).hayProyecto).toBe(true);
  });
  it("con V1 y V2 enviadas, solo V2 cuenta", () => {
    const vs = [{ id: 10, baseId: null, version: 1, status: "sent" }, { id: 11, baseId: 10, version: 2, status: "sent" }];
    expect(evaluarGrupo(vs, new Set(), 10).esUltima).toBe(false);
    expect(evaluarGrupo(vs, new Set(), 11).esUltima).toBe(true);
  });
  it("si una versión del grupo ya se aprobó, la versión enviada no se persigue", () => {
    const vs = [{ id: 20, baseId: null, version: 1, status: "approved" }, { id: 21, baseId: 20, version: 2, status: "sent" }];
    expect(evaluarGrupo(vs, new Set(), 21).grupoAprobado).toBe(true);
  });
  it("una cotización sin versiones se evalúa sola", () => {
    expect(evaluarGrupo([{ id: 5, baseId: null, version: 1, status: "sent" }], new Set(), 5)).toEqual({ esUltima: true, hayProyecto: false, grupoAprobado: false });
  });
});
