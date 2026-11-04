// ─────────────────────────────────────────────────────────────────────────────
// Redactor ÚNICO de la descripción de "Cocina integral" para cotizaciones.
// Lo usan: PDF (generar), vista previa del PDF, correo y página pública.
// Solo describe lo configurado; NO calcula precios.
//
// Convención de formato (texto plano):
//   - Línea en MAYÚSCULAS (opcionalmente terminada en ":") = encabezado de sección.
//   - "• " = viñeta;  "  - " = sub-viñeta.
// ─────────────────────────────────────────────────────────────────────────────

const toQty = (v: any): number => (typeof v === "boolean" ? (v ? 1 : 0) : Number(v) || 0);
const ml = (n: any) => `${(Number(n) || 0).toFixed(2)} ml`;

const CLASS_LABEL: Record<string, string> = {
  estandar: "ESTÁNDAR", premium: "PREMIUM", deluxe: "DELUXE",
  // Valores antiguos (cotizaciones anteriores)
  L: "ESTÁNDAR", U: "PREMIUM", lineal: "DELUXE",
  frente_pll: "FRENTE PLL (SOLO INFERIORES)",
  solo_superiores: "SOLO MUEBLES SUPERIORES",
  solo_inferiores: "SOLO MUEBLES INFERIORES",
  puertas_tapas: "PUERTAS Y TAPAS",
  solo_acabados: "ACABADOS ESPECIALES",
};

const LAYOUT_LABEL: Record<string, string> = {
  L: "en L", U: "en U", lineal: "lineal / recta", cuadrada: "cuadrada / paralela", isla: "con isla central", otra: "otra",
};

const STONE: Record<string, string> = { quarzone: "Quarzone", granito: "Granito", sinterizado: "Porcelanato sinterizado", acero: "Acero inoxidable" };
const stoneName = (type: string, imported?: boolean) =>
  `${STONE[type] || type}${imported && type !== "acero" ? " importado" : ""}`;

const FULL_KITCHEN = new Set(["estandar", "premium", "deluxe", "L", "U", "lineal"]);
const PREMIUM_CLASS = new Set(["premium", "deluxe", "U", "lineal"]);

function depthText(s?: string): string {
  if (s === "30percent") return "fondo especial 61–90 cm";
  if (s === "40percent") return "fondo especial 91–100 cm";
  if (s === "double") return "fondo especial 91–120 cm";
  return "";
}

const r2 = (n: number) => (Math.round((Number(n) || 0) * 100 + 1e-9) / 100).toFixed(2); // 0.245 -> 0.25
export function buildKitchenQuoteDescription(rawConfig: any, manualDescription?: string | null): string {
  const config: any = typeof rawConfig === "string" ? JSON.parse(rawConfig) : (rawConfig || {});
  const shape: string = config.shape || "";
  const isFull = FULL_KITCHEN.has(shape);
  const isOnlyFinishes = shape === "solo_acabados";
  const isDoorsOnly = shape === "puertas_tapas";
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);
  const section = (title: string) => { push(""); push(title); };

  // ── Título ──────────────────────────────────────────────────────────────
  const claseLabel = CLASS_LABEL[shape] || String(shape).toUpperCase();
  push(isOnlyFinishes ? "ACABADOS ESPECIALES PARA COCINA" : `COCINA INTEGRAL ${isFull ? "" : "- "}${claseLabel}`.replace("  ", " ").trim());
  if (config.layout && LAYOUT_LABEL[config.layout]) push(`Forma de la cocina: ${LAYOUT_LABEL[config.layout]}`);
  const totalMeters = Number(config.totalMeters) || 0;
  if (!isOnlyFinishes && !isDoorsOnly && totalMeters > 0) {
    if (config.independentMeters && (config.lowerMeters !== undefined || config.upperMeters !== undefined)) {
      push(`Metraje: inferiores ${ml(config.lowerMeters)} · superiores ${ml(config.upperMeters)}`);
    } else {
      push(`Metraje total: ${ml(totalMeters)}`);
    }
  }

  // Metros útiles después de módulos especiales que descuentan ml
  const sm = config.specialModules || {};
  let deductions = 0;
  if (isFull) {
    if (sm.nichoNevecon) deductions += 1.0;
    if (sm.nichoNevera) deductions += 0.75;
    if (sm.alacenaEntrepanos) deductions += 0.5;
    if (sm.alacenaHerraje) deductions += 0.5;
    if (sm.torreHornos) deductions += 0.7;
  }
  const resulting = Math.max(0, totalMeters - deductions);

  // Muebles que lleva la cocina (casillas descriptivas). No incluye los que ya salen en "Módulos y equipamiento".
  const DM: any = config.descriptiveModules || {};
  const kmQ: any = config.kitchenModules || {};
  const DM_SUP: Array<[string, string]> = [
    ["esquineroSuperior", "esquinero superior"], ["moduloExtractor", "módulo para extractor"], ["moduloMicroondas", "módulo para microondas"],
    ["moduloExtractorMicroondas", "módulo para extractor y microondas"], ["moduloPlatero", "platero"], ["moduloRepisa", "repisas"], ["moduloAlmacSup", "módulo de almacenamiento"],
  ];
  const DM_INF: Array<[string, string]> = [
    ["esquinero1x1", "esquinero 1×1"], ["cajoneroTriple", "cajonero triple"], ["cajoneroDoble", "cajonero doble"], ["especiero", "especiero"],
    ["botellero", "botellero"], ["basurero", "basurero integrado"], ["moduloLavaplatos", "módulo para lavaplatos"],
    ["moduloEstufaPuerta", "módulo para estufa (con doble puerta inferior)"], ["moduloEstufaHorno", "módulo para estufa y horno"], ["moduloAlmacInf", "módulo de almacenamiento"],
  ];
  const includesLine = (kind: "sup" | "inf"): string | null => {
    const list = (kind === "sup" ? DM_SUP : DM_INF)
      .filter(([k]) => DM[k] && !(Number(typeof kmQ[k] === "boolean" ? (kmQ[k] ? 1 : 0) : kmQ[k]) > 0))
      .map(([, l]) => l);
    return list.length ? `  - Incluyen: ${list.join(", ")}` : null;
  };

  // ── Muebles ─────────────────────────────────────────────────────────────
  if (!isOnlyFinishes) {
    const mueble: string[] = [];
    if (shape === "frente_pll") {
      mueble.push(`• Muebles inferiores (frente PLL): ${ml(totalMeters)}`);
      if (config.includeUpperModule && config.upperModuleMeters > 0) mueble.push(`• Muebles superiores: ${ml(config.upperModuleMeters)}`);
    } else if (shape === "solo_superiores") {
      mueble.push(`• Muebles superiores: ${ml(totalMeters)}`);
      { const ls = includesLine("sup"); if (ls) mueble.push(ls); }
    } else if (shape === "solo_inferiores") {
      mueble.push(`• Muebles inferiores: ${ml(totalMeters)}`);
      { const li = includesLine("inf"); if (li) mueble.push(li); }
    } else if (isDoorsOnly) {
      const dc = config.doorsAndCovers || {};
      if (dc.upperDoors70 > 0) mueble.push(`• Puertas superiores hasta 70 cm: ${dc.upperDoors70} und`);
      if (dc.upperDoors90 > 0) mueble.push(`• Puertas superiores hasta 90 cm: ${dc.upperDoors90} und`);
      if (dc.upperDoors100 > 0) mueble.push(`• Puertas superiores de 100 cm o más: ${dc.upperDoors100} und`);
      if (dc.lowerDoors > 0) mueble.push(`• Puertas inferiores: ${dc.lowerDoors} und`);
      if (dc.pantryDoors > 0) mueble.push(`• Puertas de alacena: ${dc.pantryDoors} und`);
      if (dc.drawerCovers > 0) mueble.push(`• Tapas de cajón: ${dc.drawerCovers} und`);
      if (dc.smallCovers > 0) mueble.push(`• Tapas pequeñas: ${dc.smallCovers} und`);
    } else {
      if (config.includeLower !== false) {
        const lower = config.independentMeters && config.lowerMeters !== undefined ? Math.max(0, (config.lowerMeters || 0) - deductions) : resulting;
        mueble.push(`• Muebles inferiores: ${ml(lower)}`);
        const li = includesLine("inf"); if (li) mueble.push(li);
      }
      if (config.includeUpper !== false) {
        const upper = config.independentMeters && config.upperMeters !== undefined ? (config.upperMeters || 0) : resulting;
        mueble.push(`• Muebles superiores: ${ml(upper)}`);
        const ls = includesLine("sup"); if (ls) mueble.push(ls);
      }
    }
    if (mueble.length) { section("MUEBLES:"); lines.push(...mueble); }
  }

  // ── Módulos y equipamiento ──────────────────────────────────────────────
  if (!isOnlyFinishes) {
    const mods: string[] = [];
    if (sm.nichoNevecon) mods.push("• Nicho para nevecón (100 cm)");
    if (sm.nichoNevera) mods.push("• Nicho para nevera (75 cm)");
    if (sm.alacenaEntrepanos) mods.push("• Alacena con entrepaños (50 cm)");
    if (sm.alacenaHerraje) mods.push("• Alacena para herraje (50 cm)");
    if (sm.torreHornos) mods.push("• Torre de hornos (70 cm)");
    const km: any = config.kitchenModules || {};
    const KM: Array<[string, string]> = [
      ["esquineroSuperior", "Esquinero superior"], ["moduloAlmacSup", "Módulo de almacenamiento superior"],
      ["moduloExtractor", "Módulo para extractor"], ["moduloMicroondas", "Módulo para microondas"],
      ["especiero", "Especiero"], ["botellero", "Botellero"], ["moduloRepisa", "Repisa"],
      ["esquinero1x1", "Esquinero inferior 1×1"], ["cajoneroTriple", "Cajonero triple"], ["cajoneroDoble", "Cajonero doble"],
      ["basurero", "Basurero integrado"], ["moduloEstufaHorno", "Módulo para estufa y horno"], ["moduloAlmacInf", "Módulo de almacenamiento inferior"],
      ["moduloExtractorMicroondas", "Módulo para extractor y microondas"], ["moduloPlatero", "Platero (2 puertas)"],
      ["moduloLavaplatos", "Módulo para lavaplatos"], ["moduloEstufaPuerta", "Módulo para estufa (con doble puerta inferior)"],
    ];
    for (const [k, label] of KM) {
      const q = toQty(km[k]);
      if (q > 0) mods.push(`• ${q > 1 ? `${q} × ` : ""}${label}`);
    }
    const latNN = toQty(km.lateralNichoNevera), latSup = toQty(km.lateralMuebleSuperior), latInf = toQty(km.lateralMuebleInferior);
    if (latNN > 0) mods.push(`• ${latNN} lateral${latNN > 1 ? "es" : ""} de nicho de nevera`);
    if (latSup > 0) mods.push(`• ${latSup} lateral${latSup > 1 ? "es" : ""} de mueble superior`);
    if (latInf > 0) mods.push(`• ${latInf} lateral${latInf > 1 ? "es" : ""} de mueble inferior`);
    if (mods.length) { section("MÓDULOS Y EQUIPAMIENTO:"); lines.push(...mods); }
  }

  // ── Mesón ───────────────────────────────────────────────────────────────
  const ct = config.countertop;
  if (!isOnlyFinishes && ct && ct.type) {
    const mesonML = config.independentMeters && config.lowerMeters !== undefined ? Math.max(0, (config.lowerMeters || 0) - deductions) : resulting;
    section("MESÓN:");
    const depth = depthText(ct.depthSurcharge);
    push(`• Mesón en ${stoneName(ct.type, ct.esImportado)}: ${ml(mesonML)}${depth ? ` (${depth})` : ""}`);
    if (ct.incluyeSalpicaderoAlto) {
      push(`  - Salpicadero alto en ${stoneName(ct.type, ct.esImportado)} (${ml(mesonML)}) y regrueso en el visto`);
      const nl = Number(ct.cantLateralesSalpicadero) || 0;
      if (nl > 0) push(`  - ${nl} lateral${nl > 1 ? "es" : ""} de cierre del salpicadero (0.62 × 0.60 m)`);
    } else {
      push("  - Incluye salpicadero de 10 cm y regrueso en el visto");
    }
    if (ct.incluyeLaterales) push(`  - ${ct.cantLaterales || 1} lateral${(ct.cantLaterales || 1) > 1 ? "es" : ""} en piedra (${((ct.cantLaterales || 1) * 0.9).toFixed(2)} ml)`);
    if (ct.incluyeRegrueso) push("  - Regrueso adicional (0.90 ml)");
    if (ct.incluyeLavaplatos) push("  - Pegado de lavaplatos y lavaplatos");
  }

  // ── Isla ────────────────────────────────────────────────────────────────
  const isl = config.island;
  if (!isOnlyFinishes && isl && isl.enabled && isl.meters > 0) {
    section("ISLA:");
    push(`• Isla con muebles en madera: ${ml(isl.meters)}`);
    const mods: string[] = [];
    const IM: Array<[string, string]> = [["especiero", "Especiero"], ["botellero", "Botellero"], ["cajoneroTriple", "Cajonero triple"], ["cajoneroDoble", "Cajonero doble"], ["basurero", "Basurero"]];
    for (const [k, label] of IM) if (isl.modulosDescriptivos && isl.modulosDescriptivos[k]) mods.push(label);
    if (mods.length) push(`  - Incluye: ${mods.join(", ")}`);
    if (isl.countertopType) {
      const d = depthText(isl.depthSurcharge);
      push(`• Mesón de isla en ${stoneName(isl.countertopType, isl.esImportado)}${d ? ` (${d})` : ""}`);
      push(isl.incluyeSalpicaderoAlto ? "  - Salpicadero alto y regrueso en el visto" : "  - Incluye salpicadero de 10 cm y regrueso en el visto");
      const lat = isl.incluyeLateralesIsla ?? isl.hasLaterals;
      if (lat) push("  - Laterales en piedra");
      if (isl.incluyeRegrueso ?? isl.hasLaterals) push("  - Regrueso adicional");
      if (isl.incluyeLavaplatos) push("  - Lavaplatos y pegado");
    }
    if (isl.incluyeLedIsla && isl.ledMLIsla > 0) push(`• Iluminación LED en isla: ${ml(isl.ledMLIsla)}`);
  }

  // ── Barra ───────────────────────────────────────────────────────────────
  const bar = config.bar;
  if (!isOnlyFinishes && bar && bar.enabled && bar.meters > 0) {
    section("BARRA:");
    push(`• Barra con muebles en madera: ${ml(bar.meters)}`);
    if (bar.countertopType) {
      push(`• Mesón de barra en ${stoneName(bar.countertopType, bar.esImportado)}`);
      push("  - Incluye salpicadero de 10 cm y regrueso en el visto");
    }
    if (bar.hasLateral) push(`  - Lateral en piedra (${bar.barraAlturaLateral ?? 90} cm de alto)`);
    if (bar.incluyePedestal) push("• Pedestal metálico");
    if (bar.incluyeHerraje) push("• Herraje de barra");
  }

  // ── Iluminación LED (general) ───────────────────────────────────────────
  const km2: any = config.kitchenModules || {};
  if (!isOnlyFinishes && (config.ledLighting > 0 || km2.luzLed)) {
    section("ILUMINACIÓN LED:");
    push(config.ledLighting > 0 ? `• Luz LED: ${ml(config.ledLighting)}` : "• Luz LED");
  }

  // ── Acabados especiales ─────────────────────────────────────────────────
  const sf = config.specialFinishes;
  if (sf && sf.enabled) {
    const doors: any[] = Array.isArray(sf.aluminumGlassDoors) ? sf.aluminumGlassDoors : [];
    const hasLed = sf.ledLighting && sf.ledLighting.enabled && sf.ledLighting.meters > 0;
    if (doors.length > 0 || hasLed) {
      section("ACABADOS ESPECIALES:");
      if (doors.length > 0) {
        const sqm = doors.reduce((s, d) => s + (Number(d.height) || 0) * (Number(d.width) || 0), 0);
        push(`• Puertas en marco de aluminio con vidrio ahumado: ${doors.length} ${doors.length === 1 ? "puerta" : "puertas"} (${r2(sqm)} m²)`);
        doors.forEach((d, i) => {
          const h = Number(d.height) || 0, w = Number(d.width) || 0;
          const hinges = h > 1.4 ? 2 : (h > 0.8 ? 1 : 0);
          push(`  - Puerta ${i + 1}: ${h.toFixed(2)} m × ${w.toFixed(2)} m = ${r2(h * w)} m²${hinges ? ` (+${hinges} par${hinges > 1 ? "es" : ""} de bisagras adicionales)` : ""}`);
        });
      }
      if (hasLed) push(`• Iluminación LED para alacenas: ${ml(sf.ledLighting.meters)}`);
    }
  }

  // ── Desmonte de cocina existente (servicio opcional) ───────────────────
  if (config.dismantle) {
    section("SERVICIO ADICIONAL:");
    push("• Desmonte de la cocina existente");
  }

  // ── Pintado alto brillo ─────────────────────────────────────────────────
  const pd = config.paintedDoors;
  if (pd && pd.enabled) {
    const items: Array<[number, string]> = [
      [pd.upperQty, "Puertas superiores"], [pd.lowerQty, "Puertas inferiores"], [pd.pantryQty, "Puertas de alacena"],
      [pd.drawerQty, "Tapas de cajón"], [pd.spiceQty, "Tapas de especiero"], [pd.golaQty, "Tapas gola / pequeñas"],
    ];
    const present = items.filter(([q]) => q > 0);
    if (present.length) {
      section("PINTADO ALTO BRILLO:");
      for (const [q, label] of present) push(`• ${label}: ${q} und`);
    }
  }

  // ── Materiales y herrajes (estándar de la casa) ─────────────────────────
  if (!isOnlyFinishes) {
    section("MATERIALES Y HERRAJES:");
    push("• Aglomerado de alta presión tipo RH de 15 mm (resistente a la humedad)");
    push(`• Color exterior: ${config.boardFinish || "a elegir por el cliente"}`);
    push(`• Color interior: ${config.interiorFinish || "a elegir por el cliente"}`);
    // Herrajes incluidos según el tipo de cocina: Estándar = bisagras normales con cierre lento y rieles full extensión normales;
    // Premium = rieles con cierre lento; Deluxe = bisagras en acero inoxidable con cierre lento y rieles con cierre lento.
    const isDeluxeClass = shape === "deluxe" || shape === "lineal";
    push(`• Bisagras ${(config.hardware?.bisagras === "inox" || isDeluxeClass) ? "en acero inoxidable " : ""}de cierre lento`);
    if (shape !== "solo_superiores" && !isDoorsOnly) {
      const explicit = config.hardware?.rieles;
      const premium = PREMIUM_CLASS.has(shape);
      if (explicit === "peso_alto") push("• Rieles telescópicos full extensión de peso alto");
      else if (explicit === "cierre_lento") push("• Rieles telescópicos full extensión con cierre lento");
      else push(premium ? "• Rieles telescópicos full extensión con cierre lento" : "• Rieles telescópicos full extensión");
    }
    if (isFull || config.incluyePlatero) {
      push(`• Platero en acero inoxidable incluido${config.plateroDesc ? ` — ${config.plateroDesc}` : ""}`);
    }
    const ap = config.appliances;
    if (ap) {
      const list: string[] = [];
      if (ap.estufa) list.push("estufa");
      if (ap.horno) list.push("horno empotrable");
      if (ap.extractor) list.push("extractor");
      if (ap.llaveLavaplatos) list.push("llave de lavaplatos");
      if (ap.nevera) list.push("nevera");
      if (ap.microondas) list.push("microondas");
      if (ap.lavaVajillas) list.push("lavavajillas");
      if (list.length) push(`• Espacios para electrodomésticos (no suministrados): ${list.join(", ")}`);
    }
  }

  // ── Diseño ──────────────────────────────────────────────────────────────
  section("DISEÑO:");
  push("• Diseño por definir: al aprobar la cotización se desarrolla el diseño con las medidas reales de su espacio y se presenta con render para su aprobación.");

  // ── Notas ───────────────────────────────────────────────────────────────
  if (config.notes && String(config.notes).trim()) {
    section("NOTAS ADICIONALES:");
    push(String(config.notes).trim());
  }

  // Texto manual escrito a mano por el usuario (se conserva), salvo el resumen automático antiguo
  const manual = typeof manualDescription === "string" ? manualDescription.trim() : "";
  const isAutoSummary = /^Cocina integral/i.test(manual) && /color a elegir por el cliente/i.test(manual);
  if (manual && !isAutoSummary && !manual.startsWith("COCINA INTEGRAL")) {
    push("");
    push(manual);
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Estándares de la casa para productos que NO son cocina integral (closet,
// puertas, centro de TV, baño, mueble de cocina). Solo AGREGA un bloque al final
// de la descripción ya existente; no cambia precios ni lo que ya se describía.
// ─────────────────────────────────────────────────────────────────────────────
const STD_DESIGN = "• Diseño por definir: al aprobar la cotización se desarrolla el diseño con las medidas reales de su espacio y se presenta con render para su aprobación.";

export function appendHouseStandards(itemType: string | undefined | null, description: string | undefined | null, item?: any): string {
  const base = String(description ?? "");
  if (!itemType) return base;
  if (/MATERIALES Y HERRAJES|Diseño por definir/i.test(base)) return base; // ya lo trae
  const mat = "• Aglomerado de alta presión tipo RH de 15 mm (resistente a la humedad)";
  const color = /color/i.test(base) ? null : "• Color: a elegir por el cliente"; // no contradecir un color ya descrito
  const hinges = "• Bisagras de cierre lento";
  const rails = "• Rieles telescópicos full extensión con cierre lento";
  let lines: string[] | null = null;
  switch (itemType) {
    case "closet": {
      // Herrajes incluidos según el tipo de closet: Estándar = rieles full extensión normales; Premium en adelante = rieles con cierre lento.
      let cc: any = item?.closetConfig;
      if (typeof cc === "string") { try { cc = JSON.parse(cc); } catch { cc = null; } }
      const t = cc?.type;
      const closetRails = t === "estandar" ? "• Rieles telescópicos full extensión" : rails;
      // Bisagras solo con puertas batientes (las corredizas no llevan); acero inoxidable únicamente en Deluxe.
      const corredizas = cc?.doorType === "corredizas";
      const closetHinges = t === "deluxe" ? "• Bisagras en acero inoxidable de cierre lento" : hinges;
      lines = [mat, color, ...(corredizas ? [] : [closetHinges]), closetRails].filter((x): x is string => !!x);
      if (corredizas) lines.push("• Herraje y sistema de puertas corredizas incluido");
      break;
    }
    case "mueble_cocina":
    case "centro_tv":
    case "baño":
      lines = [mat, color, hinges, rails].filter((x): x is string => !!x); break;
    case "puerta":
      lines = [mat, color, ...(/omega/i.test(base) ? [] : ["• Bisagras omega", "• Tope de puerta", "• Chapa gama alta"])].filter((x): x is string => !!x); break;
    default:
      return base;
  }
  const block = ["MATERIALES Y HERRAJES:", ...lines, "", "DISEÑO:", STD_DESIGN].join("\n");
  return base.trim() ? `${base.replace(/\s+$/, "")}\n\n${block}` : block;
}
