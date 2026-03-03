import { appRouter } from "./server/routers.ts";

console.log("=== TRPC ROUTER DEBUG START ===");
console.log("Registered procedures:");
console.log(Object.keys(appRouter._def.procedures));
console.log("=== TRPC ROUTER DEBUG END ===");

// Verificar si revertStatus está en projects
const projectsProcedures = appRouter._def.procedures.projects?._def?.procedures;
if (projectsProcedures) {
  console.log("\n=== PROJECTS PROCEDURES ===");
  console.log(Object.keys(projectsProcedures));
  console.log("=== END PROJECTS PROCEDURES ===\n");
}
