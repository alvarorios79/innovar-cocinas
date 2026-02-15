import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

const allUsers = await db.select({
  id: users.id, 
  email: users.email, 
  name: users.name, 
  role: users.role
}).from(users);

console.log(JSON.stringify(allUsers, null, 2));
process.exit(0);
