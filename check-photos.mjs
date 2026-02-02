import { db } from './server/db.ts';

async function checkPhotos() {
  const photos = await db.execute(`
    SELECT pp.id, pp.subcategory, pp.stage, pp.category, p.name as project_name 
    FROM projectPhotos pp 
    JOIN projects p ON pp.projectId = p.id 
    WHERE p.name LIKE '%Ruth%' OR p.name LIKE '%Naranjo%' OR p.name LIKE '%Viterbo%'
    ORDER BY pp.subcategory
  `);
  console.log('Fotos del proyecto:', JSON.stringify(photos, null, 2));
}

checkPhotos().catch(console.error);
