// Descripción del PDF para "Centro de TV" versión 2 (cotización por casillas).
// Devuelve null para cotizaciones antiguas (sin pricingVersion 2): esas conservan su texto original.
export function buildTVQuoteDescription(rawConfig: any): string | null {
  const c: any = typeof rawConfig === "string" ? JSON.parse(rawConfig) : rawConfig;
  if (!c || c.pricingVersion !== 2) return null;
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);
  const section = (t: string) => { push(""); push(t); };
  const n = (v: any) => Number(v) || 0;

  push("CENTRO DE TV - MUEBLE FLOTANTE");
  push(`Ancho: ${n(c.width).toFixed(2)} m`);
  if (n(c.tvInches) > 0) push(`Diseñado para TV de ${n(c.tvInches)} pulgadas`);

  section("EL MUEBLE INCLUYE:");
  push("• Mueble flotante");
  push("• Panel para TV");
  if (n(c.alistonadoSides) > 0) push(`• Alistonado en ${n(c.alistonadoSides) === 1 ? "1 lado" : `${n(c.alistonadoSides)} lados`} del panel`);
  push(`• ${n(c.floatingShelves)} repisa${n(c.floatingShelves) === 1 ? "" : "s"} flotante${n(c.floatingShelves) === 1 ? "" : "s"}`);
  if (n(c.doors) > 0) push(`• ${n(c.doors)} puerta${n(c.doors) === 1 ? "" : "s"}`);
  if (n(c.drawerFronts) > 0) push(`• ${n(c.drawerFronts)} ${n(c.drawerFronts) === 1 ? "cajón" : "cajones"}`);

  const glass: any[] = Array.isArray(c.aluminumGlassDoors) ? c.aluminumGlassDoors.filter((d: any) => n(d.height) > 0 && n(d.width) > 0) : [];
  if (glass.length > 0) {
    section("PUERTAS DE ALUMINIO Y VIDRIO:");
    push(`• ${glass.length} puerta${glass.length === 1 ? "" : "s"} en marco de aluminio con vidrio ahumado`);
    glass.forEach((d, i) => {
      const h = n(d.height), w = n(d.width);
      const hinges = h > 1.4 ? 2 : h > 0.8 ? 1 : 0;
      push(`  - Puerta ${i + 1}: ${h.toFixed(2)} m × ${w.toFixed(2)} m = ${(Math.round(h * w * 100) / 100).toFixed(2)} m²${hinges ? ` (+${hinges} par${hinges > 1 ? "es" : ""} de bisagras adicionales)` : ""}`);
    });
  }

  if (c.hasPainting) {
    section("ACABADO:");
    push(`• Pintura poliuretano ${c.paintFinish === "mate" ? "mate" : "alto brillo"}`);
    const pieces: string[] = [];
    if (n(c.doors) > 0) pieces.push(`${n(c.doors)} puerta${n(c.doors) === 1 ? "" : "s"}`);
    if (n(c.drawerFronts) > 0) pieces.push(`${n(c.drawerFronts)} tapa${n(c.drawerFronts) === 1 ? "" : "s"} de cajón`);
    if (n(c.floatingShelves) > 0) pieces.push(`${n(c.floatingShelves)} repisa${n(c.floatingShelves) === 1 ? "" : "s"}`);
    if (pieces.length) push(`  - Piezas pintadas: ${pieces.join(", ")}`);
  }

  if (c.hasLedLights) {
    section("ILUMINACIÓN LED:");
    push(n(c.ledMeters) > 0 ? `• Luz LED: ${n(c.ledMeters).toFixed(2)} ml` : "• Luz LED");
  }

  if (c.includeTvBracket) {
    section("INSTALACIÓN DEL TV:");
    push("• Soporte para TV e instalación del televisor");
  }

  section("NO INCLUYE:");
  push("• Cables, canaletas ni instalación eléctrica.");
  push("• Televisor ni equipos (Innovar no los suministra).");

  if (c.notes && String(c.notes).trim()) {
    section("NOTAS ADICIONALES:");
    push(String(c.notes).trim());
  }
  return lines.join("\n");
}
