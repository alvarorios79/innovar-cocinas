// OJO: elevador de colgadero, pantalonero, corbatero, joyero y demás accesorios NO van aquí: son herrajes y se cobran aparte
// en el ítem «Herrajes» (catálogo de herrajes de closets), igual que en las cocinas.
// Componentes que puede llevar un closet o vestier (casillas del cotizador). Una sola lista para la pantalla, la descripción y el PDF.
// `cantidad` opcional: si hay más de una unidad se escribe «2 cajoneros triples» (plural) en lugar de «Cajonero triple».
export interface ComponenteCloset { key: string; grupo: string; uno: string; varios?: string; conCantidad?: boolean; ayuda?: string }

export const COMPONENTES_CLOSET: ComponenteCloset[] = [
  // Cajoneros
  { key: "cajoneroSencillo", grupo: "Cajoneros", uno: "Cajonero sencillo", varios: "cajoneros sencillos", conCantidad: true },
  { key: "doubleCajonero", grupo: "Cajoneros", uno: "Doble cajonero", varios: "dobles cajoneros", conCantidad: true },
  { key: "cajoneroTriple", grupo: "Cajoneros", uno: "Cajonero triple", varios: "cajoneros triples", conCantidad: true },
  { key: "cajonero4", grupo: "Cajoneros", uno: "Cajonero de 4 cajones", varios: "cajoneros de 4 cajones", conCantidad: true },
  // Colgaderos
  { key: "dobleColgadero", grupo: "Colgaderos", uno: "Doble colgadero", varios: "dobles colgaderos", conCantidad: true },
  { key: "colgaderoSencillo", grupo: "Colgaderos", uno: "Colgadero sencillo (prendas largas)", varios: "colgaderos sencillos (prendas largas)", conCantidad: true },
  // Repisas y estantes
  { key: "entrepanos", grupo: "Repisas y estantes", uno: "Entrepaños" },
  { key: "torreRepisas", grupo: "Repisas y estantes", uno: "Torre de repisas abiertas", varios: "torres de repisas abiertas", conCantidad: true },
  { key: "cubiculos", grupo: "Repisas y estantes", uno: "Cubículos para ropa doblada" },
  { key: "repisasAbiertas", grupo: "Repisas y estantes", uno: "Repisas abiertas" },
  { key: "estanteriaAbierta", grupo: "Repisas y estantes", uno: "Estantería abierta decorativa" },
  { key: "esquineroCuadrado", grupo: "Repisas y estantes", uno: "Estantería esquinera cuadrada (en lugar de la curva)",
    ayuda: "Las estanterías curvas casi no se hacen en RH por la curva del zócalo: se propone esquinero cuadrado." },
  // Zapatos y otros
  { key: "zapatero", grupo: "Zapatos y otros", uno: "Zapatero" },
  { key: "espacioZapatos", grupo: "Zapatos y otros", uno: "Espacio inferior para zapatos" },
  { key: "maletero", grupo: "Zapatos y otros", uno: "Maletero" },
  { key: "divisor", grupo: "Zapatos y otros", uno: "Divisor de ropa" },
  { key: "espejo", grupo: "Zapatos y otros", uno: "Espejo en puertas" },
];

/** Líneas de «Incluye» de los componentes marcados (con su cantidad si la tienen). */
export function componentesMarcados(a: Record<string, any> | undefined, cantidades?: Record<string, number>): string[] {
  const out: string[] = [];
  for (const c of COMPONENTES_CLOSET) {
    if (!a?.[c.key]) continue;
    const n = Math.max(1, Math.floor(Number(cantidades?.[c.key]) || 1));
    out.push(c.conCantidad && n > 1 && c.varios ? `${n} ${c.varios}` : c.uno);
  }
  return out;
}
