import fetch from 'node-fetch';

// Primero buscar el proyecto
const response = await fetch('http://localhost:3000/api/trpc/projects.list?input={}', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
const projects = data.result?.data || [];

// Buscar el proyecto de Diana Ortiz
const dianaProject = projects.find(p => 
  p.name?.includes('COT-2026-1772833387890-1825427') || 
  p.name?.includes('Diana Ortiz')
);

if (!dianaProject) {
  console.log('❌ Proyecto no encontrado');
  console.log('Proyectos encontrados:', projects.length);
  process.exit(1);
}

console.log('✅ PROYECTO ENCONTRADO');
console.log('ID:', dianaProject.id);
console.log('Nombre:', dianaProject.name);
console.log('Precio Original (totalAmount):', dianaProject.totalAmount);
console.log('Archivado:', dianaProject.isArchived);
console.log('Status:', dianaProject.status);

process.exit(0);
