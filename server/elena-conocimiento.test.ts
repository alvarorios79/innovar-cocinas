import { describe, it, expect } from "vitest";
import { ELENA_CATEGORIAS, elenaRouter, temasActivosParaWeb } from "./routers/elena";

describe("Conocimiento de Elena", () => {
  it("expone solo lo necesario para la página y solo temas activos", async () => {
    const temas = await temasActivosParaWeb();
    for (const t of temas) {
      expect(Object.keys(t).sort()).toEqual(["categoria", "contenido", "id", "titulo"]);
      expect(String(t.id)).toMatch(/^crm-\d+$/);
    }
  });

  it("las categorías ofrecidas coinciden con las de la pantalla", () => {
    expect(ELENA_CATEGORIAS).toContain("promocion");
    expect(ELENA_CATEGORIAS).toContain("info");
  });

  it("un usuario sin sesión no puede ver ni editar", async () => {
    const caller = elenaRouter.createCaller({ user: null } as never);
    await expect(caller.list()).rejects.toThrow();
    await expect(caller.create({ titulo: "Tema de prueba", categoria: "info", contenido: "Contenido de prueba largo" })).rejects.toThrow();
  });

  it("un usuario de taller tampoco", async () => {
    const caller = elenaRouter.createCaller({ user: { id: 1, role: "jefe_taller" } } as never);
    await expect(caller.list()).rejects.toThrow();
  });
});
