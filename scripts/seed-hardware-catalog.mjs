import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const hardwareItems = [
  // ============ COCINAS ============
  { category: 'cocinas', name: 'Bisagras', description: 'Bisagras para puertas de cocina', options: 'Cierre lento Acero, Estándar', sortOrder: 1 },
  { category: 'cocinas', name: 'Rieles de cajón', description: 'Rieles para cajones de cocina', options: 'Peso alto, Peso medio, Sencillo | Cierre lento, Push | Cromado, Negro, Gama alta (montaje bajo/oculto)', sortOrder: 2 },
  { category: 'cocinas', name: 'Platero inoxidable', description: 'Platero en acero inoxidable', options: 'Incluido', sortOrder: 3 },
  { category: 'cocinas', name: 'Pistones a gas', description: 'Sistema de apertura para puertas elevables', options: 'Incluido', sortOrder: 4 },
  { category: 'cocinas', name: 'Herraje puerta partida', description: 'Herraje para puerta partida con cierre lento', options: 'Cierre lento', sortOrder: 5 },
  { category: 'cocinas', name: 'Patas zócalo', description: 'Patas para zócalo de cocina', options: 'Incluido', sortOrder: 6 },
  { category: 'cocinas', name: 'Basurero', description: 'Sistema de basurero integrado', options: 'Incluido', sortOrder: 7 },
  { category: 'cocinas', name: 'Alacena', description: 'Sistema de alacena', options: 'Incluido', sortOrder: 8 },
  { category: 'cocinas', name: 'Esquinero', description: 'Sistema esquinero giratorio', options: 'Incluido', sortOrder: 9 },
  { category: 'cocinas', name: 'Especiero', description: 'Especiero extraíble', options: 'Incluido', sortOrder: 10 },
  
  // ============ CLOSETS ============
  { category: 'closets', name: 'Rieles de cajón', description: 'Rieles para cajones de closet', options: 'Peso alto, Peso medio, Sencillo | Cierre lento, Push', sortOrder: 1 },
  { category: 'closets', name: 'Tubo de colgar', description: 'Tubo para colgar ropa', options: 'Cromado, Negro', sortOrder: 2 },
  { category: 'closets', name: 'Sistema de correderas', description: 'Sistema de puertas correderas', options: 'Incluido', sortOrder: 3 },
  { category: 'closets', name: 'Manijas', description: 'Manijas para puertas y cajones', options: 'Cromada, Negra', sortOrder: 4 },
  { category: 'closets', name: 'Pantaloneros', description: 'Sistema para colgar pantalones', options: 'Incluido', sortOrder: 5 },
  { category: 'closets', name: 'Relojeros para cajón', description: 'Organizador de relojes para cajón', options: 'Incluido', sortOrder: 6 },
  { category: 'closets', name: 'Organizador corbatas', description: 'Organizador de corbatas', options: 'Incluido', sortOrder: 7 },
  { category: 'closets', name: 'Colgadero elevador', description: 'Sistema de colgadero elevador', options: 'Incluido', sortOrder: 8 },
  
  // ============ PUERTAS ============
  { category: 'puertas', name: 'Chapas gama alta', description: 'Chapas de alta gama para puertas', options: 'Cromada, Negra', sortOrder: 1 },
  { category: 'puertas', name: 'Bisagras', description: 'Bisagras para puertas', options: 'Cromada, Negra', sortOrder: 2 },
  { category: 'puertas', name: 'Topes de puerta', description: 'Topes para puertas', options: 'Cromado, Negro', sortOrder: 3 },
];

async function seedHardwareCatalog() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Poblando catálogo de herrajes...');
    
    for (const item of hardwareItems) {
      // Check if already exists
      const [existing] = await connection.execute(
        'SELECT id FROM hardwareCatalog WHERE category = ? AND name = ?',
        [item.category, item.name]
      );
      
      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO hardwareCatalog (category, name, description, options, sortOrder, active) VALUES (?, ?, ?, ?, ?, true)',
          [item.category, item.name, item.description, item.options, item.sortOrder]
        );
        console.log(`✓ Agregado: ${item.category} - ${item.name}`);
      } else {
        console.log(`- Ya existe: ${item.category} - ${item.name}`);
      }
    }
    
    console.log('\n¡Catálogo poblado exitosamente!');
    
    // Show summary
    const [cocinas] = await connection.execute('SELECT COUNT(*) as count FROM hardwareCatalog WHERE category = "cocinas"');
    const [closets] = await connection.execute('SELECT COUNT(*) as count FROM hardwareCatalog WHERE category = "closets"');
    const [puertas] = await connection.execute('SELECT COUNT(*) as count FROM hardwareCatalog WHERE category = "puertas"');
    
    console.log(`\nResumen:`);
    console.log(`- Cocinas: ${cocinas[0].count} herrajes`);
    console.log(`- Closets: ${closets[0].count} herrajes`);
    console.log(`- Puertas: ${puertas[0].count} herrajes`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

seedHardwareCatalog();
