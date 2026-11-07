import { describe, it, expect } from "vitest";
import { computeDesignVersions, groupByVersion } from "../shared/designVersions";

describe("computeDesignVersions", () => {
  const photos = [
    { id: 1, subcategory: "renders", createdAt: "2026-10-28 10:00:00" },
    { id: 2, subcategory: "renders", createdAt: "2026-10-28 10:05:00" },
    { id: 3, subcategory: "renders", createdAt: "2026-11-04 09:00:00" }, // ajustes
    { id: 4, subcategory: "renders", createdAt: "2026-11-06 09:00:00" }, // ajustes aún no enviados
    { id: 5, subcategory: "modelado_3d", createdAt: "2026-10-20 09:00:00" },
  ];
  const history = [
    { notes: "Modelado 3D enviado al cliente por WhatsApp (Revisión #1)", createdAt: "2026-10-21 09:00:00" },
    { notes: "Renders enviados al cliente por WhatsApp (Revisión #1)", createdAt: "2026-10-28 12:00:00" },
    { notes: "Nueva aprobación de renders solicitada (Revisión #2)", createdAt: "2026-11-05 08:00:00" },
    { notes: "Renders enviados al cliente por WhatsApp (Revisión #2)", createdAt: "2026-11-05 08:01:00" },
  ];
  it("asigna versiones por fecha de envío", () => {
    const v = computeDesignVersions(photos, history);
    expect(v.byPhotoId).toEqual({ 1: 1, 2: 1, 3: 2, 4: 3, 5: 1 });
    expect(v.latest).toEqual({ renders: 3, modelado_3d: 1 });
    const g = groupByVersion(photos.filter(p => p.subcategory === "renders"), v);
    expect(g.map(x => [x.version, x.photos.map(p => p.id)])).toEqual([[3, [4]], [2, [3]], [1, [1, 2]]]);
  });
  it("sin historial todo es versión 1", () => {
    const v = computeDesignVersions(photos, []);
    expect(new Set(Object.values(v.byPhotoId))).toEqual(new Set([1]));
  });
});
