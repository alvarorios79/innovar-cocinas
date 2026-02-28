import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, 'server');

// Funciones que necesitan dataOrigin
const functionsToUpdate = [
  'createClient',
  'createProject',
  'createQuotation',
  'createAppointment'
];

// Patrón para detectar llamadas sin dataOrigin
const createCallPattern = new RegExp(
  `((?:const|let|var)\\s+\\w+\\s*=\\s*)?await\\s+db\\.(${functionsToUpdate.join('|')})\\(([^)]+)\\)`,
  'g'
);

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let modified = false;

    // Buscar todas las llamadas
    const matches = [...content.matchAll(createCallPattern)];
    
    for (const match of matches) {
      const fullMatch = match[0];
      const assignment = match[1] || '';
      const functionName = match[2];
      const args = match[3];

      // Verificar si ya tiene dataOrigin
      if (args.includes('dataOrigin')) {
        continue; // Ya tiene dataOrigin, no modificar
      }

      // Agregar dataOrigin: "system" como último parámetro
      const newArgs = args.trim().endsWith(',') 
        ? `${args} "system"`
        : `${args}, "system"`;
      
      const newMatch = `${assignment}await db.${functionName}(${newArgs})`;
      content = content.replace(fullMatch, newMatch);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Actualizado: ${path.relative(serverDir, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error en ${filePath}:`, error.message);
    return false;
  }
}

// Procesar todos los archivos .test.ts
function processTestFiles() {
  const testFiles = [];
  
  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.test.ts')) {
        testFiles.push(filePath);
      }
    }
  }

  walk(serverDir);
  
  console.log(`\n📊 Encontrados ${testFiles.length} archivos .test.ts\n`);
  
  let updated = 0;
  for (const file of testFiles) {
    if (updateFile(file)) {
      updated++;
    }
  }

  console.log(`\n✅ Actualización completada: ${updated}/${testFiles.length} archivos modificados\n`);
}

processTestFiles();
