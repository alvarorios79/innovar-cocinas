/**
 * GET /ejemplos/:clave — enlaces CORTOS a fotos de trabajos terminados para el primer mensaje de WhatsApp a los interesados.
 * Redirige (302) a la foto en Firebase; así el mensaje no lleva direcciones larguísimas. Es público a propósito (son fotos de portafolio).
 * Las claves y cuántas hay por trabajo están en shared/ejemplos.ts (deben coincidir).
 */
import type { Express, Request, Response } from "express";

const EJEMPLOS: Record<string, string> = {
  "tv-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fd7419e575851-tv1.jpg?alt=media&token=9f118a0e-0963-43b2-ab81-90dc73a5552a",
  "closet-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F3f3b81efac4d-closet1.jpg?alt=media&token=5ae8923c-1cb9-451d-abf8-51446e3d9815",
  "closet-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fff62cbf7a103-closet2.jpg?alt=media&token=492814b8-577d-4c24-8d6f-8fa4079684d5",
  "cocina-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F739106c56386-cocina1.jpg?alt=media&token=9f27d996-00c0-47c6-98d8-e4419eff13d8",
  "cocina-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F7bf19f079fda-cocina2.jpg?alt=media&token=a88b26ff-2e6b-48b6-a88a-46a76bd4d4d8",
  "cocina-3": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fe5652201fad8-cocina3.jpg?alt=media&token=ee1e2f8e-e699-4194-acb2-b4aafda0ba61",
  "cocina-4": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F462824466352-cocina4.jpg?alt=media&token=6a13a526-1b2f-407a-ba79-87932ed0b78a",
  "cocina-5": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F68c25becf650-cocina5.jpg?alt=media&token=bae2540f-c931-437d-b929-aaaac2c379e8",
  "puerta-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fd82e46aecbc8-puerta1.jpg?alt=media&token=2e057f66-f833-4312-950f-2654d3a9367a",
  "puerta-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F5d94436bfddd-puerta2.jpg?alt=media&token=fc0d6ae5-62bc-404d-b2c6-8e2371e7c3e0",
  "puerta-3": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Feb52fb73a14f-puerta3.jpg?alt=media&token=ebcccfd4-5ebb-4244-93d1-c5e3ec40c569",
  "especial-1": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F81cc8615fbe0-esp1.jpg?alt=media&token=ae55b03b-79ee-4ad3-9e30-e2398acfd3b5",
  "especial-2": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Fa125bd1bc1ba-esp2.jpg?alt=media&token=db774937-c02c-482f-aeb2-1df3b1cd600d",
  "especial-3": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2Faa6884d3668e-esp3.jpg?alt=media&token=f36faeeb-5ab5-4ddf-917a-cb5f3309a47e",
  "especial-4": "https://firebasestorage.googleapis.com/v0/b/innovar-app-70e13.firebasestorage.app/o/redes%2F2026-11%2F6a67dc5154a9-esp4.jpg?alt=media&token=b37a5d02-b848-4b34-8c23-17dca8e9eac2",
};

export function registerEjemplosRoutes(app: Express) {
  app.get("/ejemplos/:clave", (req: Request, res: Response) => {
    const url = EJEMPLOS[String(req.params.clave)];
    if (!url) return res.status(404).send("No encontrado");
    return res.redirect(302, url);
  });
}
