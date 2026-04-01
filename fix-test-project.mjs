import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { projects } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "localhost",
  user: process.env.DATABASE_URL?.split("://")[1]?.split(":")[0] || "root",
  password: process.env.DATABASE_URL?.split(":")[2]?.split("@")[0] || "",
  database: process.env.DATABASE_URL?.split("/").pop() || "innovar",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = drizzle(pool);

async function fixTestProject() {
  try {
    console.log("🔍 Buscando proyecto TEST-NO-DISCOUNT-PROJECT...");
    
    const result = await db
      .update(projects)
      .set({ dataOrigin: "test" })
      .where(eq(projects.name, "TEST-NO-DISCOUNT-PROJECT"));
    
    console.log("✅ Proyecto actualizado exitosamente");
    console.log("📊 Cambios realizados:", result);
    
    // Verificar que se actualizó
    const verify = await db
      .select()
      .from(projects)
      .where(eq(projects.name, "TEST-NO-DISCOUNT-PROJECT"));
    
    if (verify.length > 0) {
      console.log("✓ Verificación: dataOrigin ahora es:", verify[0].dataOrigin);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixTestProject();
