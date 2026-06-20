import "dotenv/config";
import { initGlobalErrorHandlers } from "../global-error-handler";

// Inicializar handlers globales de errores ANTES de cualquier otra cosa
initGlobalErrorHandlers();

import express, { Request, Response } from "express";
import { createServer } from "http";
import net from "net";
import { unlinkSync, existsSync } from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startAutoReminderSystem } from "../task-auto-reminders";
import { scheduleBirthdayNotifications } from "../birthday-service";
import { startOverdueChangesService } from "../overdue-changes-service";
import { startAppointmentReminderService } from "../appointment-reminder-service";
import { startTeamWhatsAppService } from "../whatsapp-team-notifications";
import { startPeriodicCleanup } from "../tmp-cleanup";
import { startApprovalReminderService } from "../approval-reminder-service";
import { startWhatsAppTokenMonitor } from "../whatsapp-token-monitor";
import { backupScheduler } from "../services/backupScheduler";
import { apiRateLimiter, authRateLimiter, uploadRateLimiter } from "../rate-limiter";
import cors from "cors";
import quotationPdfRouter from "../routes/quotation-pdf";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Correr migraciones de columnas nuevas antes de aceptar tráfico
  try {
    const { runMigrations } = await import("../migrations");
    await runMigrations();
  } catch (err) {
    console.error("[startup] Migration error (non-fatal):", err);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Trust proxy para obtener IP real detrás de reverse proxy
  app.set('trust proxy', 1);
  
  // CORS configuration
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Rate limiting para endpoints de autenticación
  app.use("/api/oauth", authRateLimiter);
  // tRPC API con rate limiting integrado
  app.use(
    "/api/trpc",
    apiRateLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // Rate limiting para uploads (image proxy puede usarse para abuso)
  app.use("/api/image-proxy", uploadRateLimiter);
  // Image proxy endpoint - sirve imágenes desde S3 usando credenciales del servidor
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const { storageDownloadDirect, extractKeyFromUrl } = await import('../storage');
      
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
      }
      
      // Extraer la key de la URL de CloudFront
      const key = extractKeyFromUrl(url);
      if (!key) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      
      // Descargar directamente usando la API de storage con autenticación
      const { buffer, contentType } = await storageDownloadDirect(key);
      
      // Configurar headers de caché
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 día
      res.send(buffer);
    } catch (error) {
      console.error('[ImageProxy] Error proxying image:', error);
      res.status(500).json({ error: 'Error proxying image', message: String(error) });
    }
  });

  // PDF preview endpoint - Envuelve PDF en HTML para evitar que WebKit iOS lo promueva a visor nativo
  app.get("/api/pdf-preview/:quotationId", async (req, res) => {
    try {
      const quotationId = parseInt(req.params.quotationId);
      if (isNaN(quotationId)) {
        return res.status(400).json({ error: 'Invalid quotation ID' });
      }
      
      // Obtener la URL del PDF desde la base de datos o generar
      // Por ahora, asumimos que se pasa como query param
      const pdfUrl = req.query.url as string;
      if (!pdfUrl) {
        return res.status(400).json({ error: 'PDF URL required' });
      }
      
      // Envolver en HTML para evitar que WebKit iOS lo promueva a visor nativo
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    embed { display: block; width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <embed src="${pdfUrl}" type="application/pdf" />
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(html);
    } catch (error) {
      console.error('[PDFPreview] Error serving PDF preview:', error);
      res.status(500).json({ error: 'Error serving PDF preview' });
    }
  });

  // Quotation PDF endpoint (ver y descargar)
  app.use("/api", quotationPdfRouter);

  // PDF download endpoint
  app.get("/api/pdf/:filename", async (req: Request, res: Response) => {
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      
      const filename = req.params.filename;
      const filepath = join('/tmp', filename);
      
      if (!existsSync(filepath)) {
        return res.status(404).json({ error: 'PDF not found' });
      }
      
      const pdfBuffer = readFileSync(filepath);
      
      // Si tiene parámetro preview=true, mostrar inline, sino descargar
      const isPreview = req.query.preview === 'true';
      const disposition = isPreview ? 'inline' : 'attachment';
      
      // Usar el nombre real del archivo si se pasa como query param, sino usar el nombre del archivo temporal
      const downloadFilename = req.query.name ? String(req.query.name) : filename;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${downloadFilename}"`);
      res.send(pdfBuffer);
      
      // Limpiar archivo después de enviarlo
      setTimeout(() => {
        try {
          if (existsSync(filepath)) {
            unlinkSync(filepath);
          }
        } catch (e) {
          console.error('Error cleaning up PDF:', e);
        }
      }, 5000);
    } catch (error) {
      console.error('Error serving PDF:', error);
      res.status(500).json({ error: 'Error serving PDF' });
    }
  });
  // ── ENDPOINT TEMPORAL: crear usuarios iniciales ──────────────────────────
  // BORRAR después de ejecutar una vez
  app.get("/api/seed-users", async (req: Request, res: Response) => {
    if (req.query.key !== "innovar-seed-2026") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { hashPassword } = await import("../password-auth");
    const { createUser, getUserByEmail } = await import("../db");
    const PASSWORD = "Innovar2026#";
    const hash = await hashPassword(PASSWORD);
    const USERS = [
      { email: "alejoile@gmail.com",           role: "disenador"   as const, name: "Alejo" },
      { email: "martha79s@hotmail.com",         role: "admin"       as const, name: "Martha" },
      { email: "jefetaller@innovarcocinas.com", role: "jefe_taller" as const, name: "Jefe Taller" },
      { email: "operario@innovarcocinas.com",   role: "operario"    as const, name: "Operario" },
      { email: "comercial@innovarcocinas.com",  role: "comercial"   as const, name: "Comercial" },
    ];
    const results: string[] = [];
    for (const u of USERS) {
      try {
        const existing = await getUserByEmail(u.email);
        if (existing) { results.push(`⚠️ Ya existe: ${u.email}`); continue; }
        await createUser({ email: u.email, name: u.name, role: u.role, passwordHash: hash });
        results.push(`✅ Creado: ${u.email} → ${u.role}`);
      } catch (e: any) {
        results.push(`❌ Error ${u.email}: ${e.message}`);
      }
    }
    return res.json({ results });
  });
  // ── FIN ENDPOINT TEMPORAL ─────────────────────────────────────────────────

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Iniciar sistema de recordatorios automáticos de tareas
    startAutoReminderSystem();
    
    // Iniciar servicio de notificaciones de cumpleaños
    scheduleBirthdayNotifications();
    
    // Iniciar servicio de verificación de cambios pendientes vencidos (>48h)
    startOverdueChangesService();
    
    // Iniciar servicio de recordatorios de citas por WhatsApp (7pm, día anterior)
    startAppointmentReminderService();
    
    // Iniciar servicio de notificaciones WhatsApp al equipo (8am y 12pm)
    startTeamWhatsAppService();
    
    // Iniciar limpieza periódica de archivos temporales en /tmp
    startPeriodicCleanup();

    // Iniciar servicio de recordatorios de aprobación de diseño (5h, día 2, día 4)
    startApprovalReminderService();
    
    // Iniciar monitoreo diario del token de WhatsApp
    startWhatsAppTokenMonitor();
    
    // Iniciar scheduler de backups automáticos
    backupScheduler.initialize().catch(console.error);
  });
}

startServer().catch(console.error);
