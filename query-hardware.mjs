import { getDb } from './server/db.ts';

const db = await getDb();
if (!db) {
  console.error('Database not available');
  process.exit(1);
}

const result = await db.select().from(db._).limit(50);
console.log(JSON.stringify(result, null, 2));
