import { drizzle } from "drizzle-orm/mysql2";
import { quotations, quotationItems } from "./drizzle/schema";
import { desc, eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// Obtener última cotización
const lastQuotation = await db
  .select()
  .from(quotations)
  .orderBy(desc(quotations.id))
  .limit(1);

if (lastQuotation.length > 0) {
  console.log("\n=== ÚLTIMA COTIZACIÓN ===");
  console.log("ID:", lastQuotation[0].id);
  console.log("Número:", lastQuotation[0].quotationNumber);
  console.log("Subtotal:", lastQuotation[0].subtotal);
  console.log("Transporte:", lastQuotation[0].transportCost);
  console.log("Total:", lastQuotation[0].total);
  
  // Obtener items
  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, lastQuotation[0].id));
  
  console.log("\n=== ITEMS ===");
  items.forEach(item => {
    console.log(`Item ${item.itemNumber}:`, item.itemType, "- Total:", item.totalPrice);
  });
}

process.exit(0);
