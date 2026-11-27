/**
 * GET /ejemplos/:clave — enlaces CORTOS a fotos de trabajos terminados para el primer mensaje de WhatsApp a los interesados.
 * Redirige (302) a la foto en Firebase; así el mensaje no lleva direcciones larguísimas. Es público a propósito (son fotos de portafolio).
 */
import type { Express, Request, Response } from "express";

const EJEMPLOS: Record<string, string> = {
  "tv-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/projects%2F50%2Fportafolio%2Fdespues%2F1794252510813-zhax2o.jpg?alt=media&token=47b88a95-8238-4044-aee0-8503058b939c",
  "tv-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/projects%2F49%2Fportafolio%2Fdespues%2F1794252492581-54j5l8.jpg?alt=media&token=18699d49-4d81-47b7-9b57-0893ea52f1c1",
};

export function registerEjemplosRoutes(app: Express) {
  app.get("/ejemplos/:clave", (req: Request, res: Response) => {
    const url = EJEMPLOS[String(req.params.clave)];
    if (!url) return res.status(404).send("No encontrado");
    return res.redirect(302, url);
  });
}
