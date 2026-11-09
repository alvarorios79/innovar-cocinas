import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // Carga .env solo si la base es local (ver server/test-setup.ts)
    setupFiles: ["./server/test-setup.ts"],
    // Al terminar, borra de la base de pruebas lo que crearon las pruebas (ver server/test-global-setup.ts)
    globalSetup: ["./server/test-global-setup.ts"],
  },
});
