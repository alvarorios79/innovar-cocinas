import { getDb } from "./server/_core/db.js";

(async () => {
  try {
    const db = await getDb();
    
    console.log('\n=== PROYECTOS ARCHIVADOS (archived: true) ===\n');
    
    const archived = await db.query.projects.findMany({
      where: (projects, { eq }) => eq(projects.isArchived, 1),
      limit: 10,
    });
    
    console.log(`Total archivados: ${archived.length}`);
    archived.forEach(p => {
      console.log(`- ${p.id}: ${p.name} (status: ${p.status}, isArchived: ${p.isArchived})`);
    });

    console.log('\n=== PROYECTO 540001 ESPECÍFICO ===\n');
    const specific = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, 540001),
    });
    
    if (specific) {
      console.log(`Encontrado: ${specific.id} - ${specific.name}`);
      console.log(`Status: ${specific.status}`);
      console.log(`isArchived: ${specific.isArchived}`);
    } else {
      console.log('No encontrado');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
