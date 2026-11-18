// Texto de las piezas «Frente de mesón» (antes «frente pollo») y «Frente de cocina» (puertas y tapas) y del pintado de piezas.
export function lineasFrentePieza(cfg: any): string[] | null {
  const f = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
  if (cfg?.tipoPieza === "frente_pollo") {
    const out = [`FRENTE DE MESÓN A MEDIDA — ${Number(cfg.frentePolloML) || 0} ml`];
    if (cfg.frentePolloIncluyeCajonero) out.push(`• Incluye cajonero${cfg.frentePolloCajoneroNombre ? `: ${cfg.frentePolloCajoneroNombre}` : ""}${cfg.frentePolloCajoneroPrecio > 0 ? ` (${f.format(cfg.frentePolloCajoneroPrecio)})` : ""}`);
    return out;
  }
  if (cfg?.tipoPieza === "frente_cocina") {
    const p = cfg.puertas || {};
    const out = ["FRENTE DE COCINA — PUERTAS Y TAPAS A MEDIDA"];
    const filas: Array<[number, string]> = [
      [p.superiores70, "Puertas superiores de 70 cm"], [p.superiores90, "Puertas superiores de 90 cm"], [p.superiores100, "Puertas superiores de 100 cm"],
      [p.inferiores, "Puertas inferiores"], [p.alacena, "Puertas de alacena"], [p.tapasCarjon, "Tapas de cajón"], [p.tapasPequenas, "Tapas pequeñas"],
    ];
    filas.forEach(([n, l]) => { if (n > 0) out.push(`• ${l}: ${n} und`); });
    return out;
  }
  return null;
}

/** Pintado alto brillo de una pieza: cuántas piezas de cada clase (en lugar de solo «incluye pintado»). */
export function lineaPintadoPieza(cfg: any): string | null {
  if (!cfg?.incluyePintado) return null;
  const p = cfg.pintadoPuertas || {};
  const partes: string[] = [];
  const add = (n: number, l: string) => { if (n > 0) partes.push(`${n} ${l}`); };
  add(p.superiores, "puertas superiores"); add(p.inferiores, "puertas inferiores"); add(p.alacena, "puertas de alacena");
  add(p.cajon, "tapas de cajón"); add(p.especiero, "tapas de especiero"); add(p.gola, "golas");
  return partes.length ? `Pintado alto brillo: ${partes.join(", ")}` : "Pintado alto brillo";
}
