import { describe, it, expect } from "vitest";
import { notifyOwner } from "./_core/notification";
import { getDb, getUsersByRole } from "./db";
import { notifications } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

// notifyOwner ya no usa el servicio de Manus: deja el aviso en la campanita de los super_admin
describe("notifyOwner", () => {
  it("crea la notificación para los super_admin", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const owners = await getUsersByRole("super_admin");
    const title = `Prueba notifyOwner ${Date.now()}`;
    const ok = await notifyOwner({ title, content: "Contenido de prueba" });
    expect(ok).toBe(owners.length > 0);
    if (owners.length) {
      const rows = await db.select().from(notifications)
        .where(and(eq(notifications.userId, owners[0].id), eq(notifications.title, title)));
      expect(rows.length).toBe(1);
      await db.delete(notifications).where(eq(notifications.title, title));
    }
  });

  it("no hace nada sin título o contenido", async () => {
    expect(await notifyOwner({ title: "", content: "x" })).toBe(false);
  });
});
