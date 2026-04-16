import mysql from 'mysql2/promise';

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'innovar_cocinas',
  });

  try {
    // Buscar la cotización de Carolina Diaz
    const quotationNumber = 'COT-2026-1772833387900-2643089';
    console.log(`\n=== Buscando cotización: ${quotationNumber} ===`);
    
    const [quotations] = await connection.query(
      'SELECT id, quotationNumber, total, baseQuotationId FROM quotations WHERE quotationNumber = ? LIMIT 1',
      [quotationNumber]
    );
    
    if (quotations.length === 0) {
      console.log('✗ Cotización no encontrada');
      return;
    }
    
    const quotation = quotations[0];
    console.log(`✓ Cotización encontrada:`);
    console.log(`  - ID: ${quotation.id}`);
    console.log(`  - Número: ${quotation.quotationNumber}`);
    console.log(`  - Total: ${quotation.total}`);
    console.log(`  - BaseQuotationId: ${quotation.baseQuotationId}`);
    
    // Buscar proyecto vinculado a esta cotización
    console.log(`\n=== Buscando proyecto vinculado a quotationId=${quotation.id} ===`);
    
    const [projects] = await connection.query(
      'SELECT id, quotationId, totalAmount FROM projects WHERE quotationId = ? LIMIT 1',
      [quotation.id]
    );
    
    if (projects.length === 0) {
      console.log(`✗ No se encontró proyecto vinculado a quotationId=${quotation.id}`);
      
      // Buscar todos los proyectos de Carolina Diaz
      console.log(`\n=== Buscando TODOS los proyectos de Carolina Diaz ===`);
      const [allProjects] = await connection.query(`
        SELECT p.id, p.quotationId, p.totalAmount, q.quotationNumber, q.total
        FROM projects p
        LEFT JOIN quotations q ON p.quotationId = q.id
        WHERE p.clientId IN (SELECT id FROM clients WHERE name LIKE '%Carolina%Diaz%')
        LIMIT 10
      `);
      
      if (allProjects.length > 0) {
        console.log(`Encontrados ${allProjects.length} proyectos:`);
        allProjects.forEach((p, i) => {
          console.log(`  ${i+1}. Proyecto ID=${p.id}, quotationId=${p.quotationId}, totalAmount=${p.totalAmount}`);
          if (p.quotationNumber) {
            console.log(`     Cotización: ${p.quotationNumber}, total=${p.total}`);
          }
        });
      } else {
        console.log('No se encontraron proyectos');
      }
      return;
    }
    
    const project = projects[0];
    console.log(`✓ Proyecto encontrado:`);
    console.log(`  - ID: ${project.id}`);
    console.log(`  - quotationId: ${project.quotationId}`);
    console.log(`  - totalAmount: ${project.totalAmount}`);
    
    // Comparar
    console.log(`\n=== Comparación ===`);
    console.log(`Cotización total: ${quotation.total}`);
    console.log(`Proyecto totalAmount: ${project.totalAmount}`);
    
    if (quotation.total.toString() === project.totalAmount.toString()) {
      console.log(`✓ Los valores coinciden`);
    } else {
      console.log(`✗ Los valores NO coinciden`);
      console.log(`  Diferencia: ${quotation.total} vs ${project.totalAmount}`);
    }
    
  } finally {
    await connection.end();
  }
}

verify().catch(console.error);
