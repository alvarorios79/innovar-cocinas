// Estas funciones están deprecadas - usar tRPC mutations directamente en Projects.tsx
// Mantener solo para referencia histórica

export async function archiveProject(projectId: number) {
  throw new Error("Use tRPC mutation: trpc.projects.archive.mutate() instead");
}

export async function unarchiveProject(projectId: number) {
  throw new Error("Use tRPC mutation: trpc.projects.unarchive.mutate() instead");
}
