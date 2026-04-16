import * as db from "./db";

async function testUpdateProject() {
  try {
    console.log("=== TEST: Verificar actualización de proyecto ===");
    
    // Buscar la cotización de Carolina Diaz
    const quotationNumber = "COT-2026-1772833387900-2643089";
    console.log(`\n1. Buscando cotización: ${quotationNumber}`);
    
    // Buscar proyecto por quotationId
    // Primero necesitamos obtener el quotationId
    const dbInstance = await (db as any).getDb();
    if (!dbInstance) {
      console.error("No se pudo conectar a la BD");
      return;
    }
    
    // Buscar la cotización
    const quotations = await dbInstance.query.quotations.findMany({
      where: (q: any) => q.quotationNumber === quotationNumber,
      limit: 1,
    });
    
    if (quotations.length === 0) {
      console.error(`No se encontró cotización: ${quotationNumber}`);
      return;
    }
    
    const quotation = quotations[0];
    console.log(`✓ Cotización encontrada: ID=${quotation.id}, Total=${quotation.total}`);
    
    // Buscar proyecto vinculado
    console.log(`\n2. Buscando proyecto vinculado a quotationId=${quotation.id}`);
    const linkedProject = await db.getProjectByQuotationId(quotation.id);
    
    if (!linkedProject) {
      console.error(`✗ No se encontró proyecto para quotationId=${quotation.id}`);
      return;
    }
    
    console.log(`✓ Proyecto encontrado: ID=${linkedProject.id}, totalAmount=${linkedProject.totalAmount}`);
    
    // Comparar valores
    console.log(`\n3. Comparando valores:`);
    console.log(`   - Cotización total: ${quotation.total}`);
    console.log(`   - Proyecto totalAmount: ${linkedProject.totalAmount}`);
    
    if (quotation.total.toString() === linkedProject.totalAmount) {
      console.log(`✓ Los valores coinciden`);
    } else {
      console.log(`✗ Los valores NO coinciden`);
      console.log(`   Diferencia: Cotización tiene ${quotation.total}, Proyecto tiene ${linkedProject.totalAmount}`);
    }
    
  } catch (error) {
    console.error("Error en test:", error);
  }
}

testUpdateProject().then(() => process.exit(0));
