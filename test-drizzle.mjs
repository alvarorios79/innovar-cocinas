import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import { eq } from "drizzle-orm";
import { projects } from "./drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select().from(projects).where(eq(projects.id, 390003)).limit(1);
console.log('Drizzle result quotationId:', result[0]?.quotationId);
console.log('Full result:', JSON.stringify(result[0], null, 2));

await connection.end();
