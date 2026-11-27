/**
 * GET /ejemplos/:clave — enlaces CORTOS a fotos de trabajos terminados para el primer mensaje de WhatsApp a los interesados.
 * Redirige (302) a la foto en Firebase; así el mensaje no lleva direcciones larguísimas. Es público a propósito (son fotos de portafolio).
 */
import type { Express, Request, Response } from "express";

const EJEMPLOS: Record<string, string> = {
  "tv-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/projects%2F50%2Fportafolio%2Fdespues%2F1794252510813-zhax2o.jpg?alt=media&token=47b88a95-8238-4044-aee0-8503058b939c",
  "tv-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/projects%2F49%2Fportafolio%2Fdespues%2F1794252492581-54j5l8.jpg?alt=media&token=18699d49-4d81-47b7-9b57-0893ea52f1c1",
  "cocina-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F4157e437da54-despues_261.jpg?alt=media&token=bffcb92f-3ab9-46f3-a9bb-1ebda10b73f8",
  "cocina-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Ff569034258fe-despues_led.jpg?alt=media&token=26557e18-bab9-4362-8222-ace11949258a",
  "closet-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fe0bd7a70b5a2-despues_678.jpg?alt=media&token=479e2e80-18ee-4cfa-ac16-4e94c2cc8b3a",
  "closet-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fbdf3f9019fcb-despues_679.jpg?alt=media&token=4903b081-359b-4aed-b157-df8ed80fb4f0",
  "bano-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Ff2cfc750de45-despues_851.jpg?alt=media&token=1893742d-7859-49d6-bf6c-7e65b644235a",
  "bano-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F2931bb47a103-despues_861.jpg?alt=media&token=74f8319b-d5ca-4b7d-8ff2-5fdb43eb1cd8",
};

export function registerEjemplosRoutes(app: Express) {
  app.get("/ejemplos/:clave", (req: Request, res: Response) => {
    const url = EJEMPLOS[String(req.params.clave)];
    if (!url) return res.status(404).send("No encontrado");
    return res.redirect(302, url);
  });
}
