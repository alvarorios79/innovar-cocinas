/** Ejemplos de trabajos para el primer mensaje de WhatsApp a los interesados (fotos en server/ejemplos-routes.ts → /ejemplos/<clave>-<n>). */
export const EJEMPLOS_POR_TRABAJO: Record<string, { clave: string; cantidad: number; titulo: string }> = {
  centro_tv: { clave: "tv", cantidad: 2, titulo: "Mira dos centros de TV que hicimos hace poco:" },
  cocina: { clave: "cocina", cantidad: 5, titulo: "Mira algunas cocinas que hicimos:" },
  closet: { clave: "closet", cantidad: 2, titulo: "Mira dos closets que hicimos:" },
  puertas: { clave: "puerta", cantidad: 3, titulo: "Mira unas puertas que hicimos:" },
  otro: { clave: "especial", cantidad: 4, titulo: "Mira algunos muebles especiales a medida que hicimos:" },
};
