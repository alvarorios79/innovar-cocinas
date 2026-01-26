import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { quotations } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

const result = await db.select().from(quotations).where(eq(quotations.id, 510009)).limit(1);
console.log('Quotation result:', JSON.stringify(result[0], null, 2));
console.log('createdAt:', result[0]?.createdAt);
console.log('validUntil:', result[0]?.validUntil);

await pool.end();
