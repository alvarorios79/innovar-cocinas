/**
 * seed-pricing.mjs
 * Pobla la tabla pricing_config con todos los precios del Motor de Cotización INNOVAR.
 * Ejecutar: node scripts/seed-pricing.mjs
 *
 * Si un código ya existe en la BD, lo actualiza. Si no existe, lo crea.
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL || "mysql://root@localhost:3306/innovar_dev";

// Parsear DATABASE_URL
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:@]*)(?::([^@]*))?@([^:\/]+)(?::(\d+))?\/(.+)/);
  if (!match) throw new Error("DATABASE_URL inválida: " + url);
  return {
    user:     match[1] || "root",
    password: match[2] || "",
    host:     match[3] || "localhost",
    port:     parseInt(match[4] || "3306"),
    database: match[5],
  };
}

// ─── CATÁLOGO DE PRECIOS ─────────────────────────────────────────────────────
// Fuente: Motor de Cotización INNOVAR (documentos aprobados)
// Para editar: usar /pricing-config en la app
const PRICING_CATALOG = [
  // ── COCINA BASE ─────────────────────────────────────────────────────────────
  { category: "cocina_base", code: "MUEBLE_INFERIOR_ML",    name: "Mueble Inferior (por ml)",         value: 900000,  unit: "ml",      sortOrder: 1 },
  { category: "cocina_base", code: "MUEBLE_SUPERIOR_ML",    name: "Mueble Superior (por ml)",         value: 900000,  unit: "ml",      sortOrder: 2 },
  { category: "cocina_base", code: "COCINA_ML_LINEAL",      name: "Cocina Lineal (inf+sup/ml)",       value: 1800000, unit: "ml",      sortOrder: 3 },
  { category: "cocina_base", code: "COCINA_ML_L",           name: "Cocina en L (inf+sup/ml)",         value: 1800000, unit: "ml",      sortOrder: 4 },
  { category: "cocina_base", code: "COCINA_ML_U",           name: "Cocina en U (inf+sup/ml)",         value: 1800000, unit: "ml",      sortOrder: 5 },
  { category: "cocina_base", code: "COCINA_ML_FRENTE_PLL",  name: "Cocina frente (solo un módulo)",   value: 900000,  unit: "ml",      sortOrder: 6 },
  { category: "cocina_base", code: "COCINA_ML_SOLO_MUEBLES",name: "Solo muebles (sin mesón)",         value: 900000,  unit: "ml",      sortOrder: 7 },
  { category: "cocina_base", code: "TRANSPORTE_IMPREVISTOS",name: "Transporte e Imprevistos (fijo)",  value: 600000,  unit: "fijo",    sortOrder: 8 },

  // ── MESONES ──────────────────────────────────────────────────────────────────
  { category: "mesones", code: "MESON_GRANITO",            name: "Mesón Granito (fondo estándar)",   value: 700000,  unit: "ml",    sortOrder: 1 },
  { category: "mesones", code: "MESON_CUARZO",             name: "Mesón Cuarzo (fondo estándar)",    value: 850000,  unit: "ml",    sortOrder: 2 },
  { category: "mesones", code: "MESON_SINTERIZADO",        name: "Mesón Sinterizado (fondo std)",    value: 1200000, unit: "ml",    sortOrder: 3 },
  { category: "mesones", code: "MESON_ACERO",              name: "Mesón Acero Inoxidable",           value: 800000,  unit: "ml",    sortOrder: 4 },
  { category: "mesones", code: "MESON_GRANITO_ANGOSTA",    name: "Mesón Granito (fondo angosto)",    value: 490000,  unit: "ml",    sortOrder: 5 },
  { category: "mesones", code: "MESON_CUARZO_ANGOSTA",     name: "Mesón Cuarzo (fondo angosto)",     value: 600000,  unit: "ml",    sortOrder: 6 },
  { category: "mesones", code: "MESON_SINTERIZADO_ANGOSTA",name: "Mesón Sinterizado (fondo angosto)",value: 1000000, unit: "ml",    sortOrder: 7 },
  { category: "mesones", code: "MESON_RECARGO_FONDO",      name: "Recargo fondo 61–90cm (%)",        value: 30,      unit: "%",     sortOrder: 8,
    description: "Porcentaje adicional al precio base del mesón. Fondo 61-90cm: +30%. Fondo 91-120cm: ×2 (100%)." },
  { category: "mesones", code: "LAVAPLATOS_MESON",         name: "Orificio lavaplatos",              value: 130000,  unit: "unidad",sortOrder: 9 },

  // ── MUEBLES ESPECIALES ────────────────────────────────────────────────────────
  { category: "muebles_especiales", code: "NICHO_NEVECON",      name: "Nicho Nevecón",            value: 1200000, unit: "unidad", sortOrder: 1,
    description: "Descuenta 1.0 ml al precio base de la cocina." },
  { category: "muebles_especiales", code: "NICHO_NEVERA",       name: "Nicho Nevera pequeña",     value: 1100000, unit: "unidad", sortOrder: 2,
    description: "Descuenta 0.75 ml al precio base de la cocina." },
  { category: "muebles_especiales", code: "ALACENA_ENTREPANOS", name: "Alacena con Entrepaños",   value: 1250000, unit: "unidad", sortOrder: 3,
    description: "Descuenta 0.5 ml al precio base de la cocina." },
  { category: "muebles_especiales", code: "ALACENA_HERRAJE",    name: "Alacena con Herraje",      value: 900000,  unit: "unidad", sortOrder: 4,
    description: "Descuenta 0.5 ml al precio base de la cocina." },
  { category: "muebles_especiales", code: "TORRE_HORNOS",       name: "Torre para Hornos",        value: 1350000, unit: "unidad", sortOrder: 5,
    description: "Descuenta 0.7 ml al precio base de la cocina." },

  // ── EXTRAS (ISLAS, BARRAS, LED) ───────────────────────────────────────────────
  { category: "extras", code: "ISLA_ML",     name: "Isla (por ml)",           value: 900000, unit: "ml",      sortOrder: 1 },
  { category: "extras", code: "ISLA_LATERAL",name: "Lateral de Isla",         value: 350000, unit: "unidad",  sortOrder: 2 },
  { category: "extras", code: "BARRA_ML",    name: "Barra (por ml)",          value: 900000, unit: "ml",      sortOrder: 3 },
  { category: "extras", code: "BARRA_LATERAL",name:"Lateral de Barra",        value: 350000, unit: "unidad",  sortOrder: 4 },
  { category: "extras", code: "LED_ML",      name: "LED (por ml)",            value: 220000, unit: "ml",      sortOrder: 5 },

  // ── PUERTAS Y TAPAS (cocinas) ──────────────────────────────────────────────────
  { category: "puertas_tapas", code: "PUERTA_SUP_70",    name: "Puerta Superior 70cm",   value: 120000, unit: "unidad", sortOrder: 1 },
  { category: "puertas_tapas", code: "PUERTA_SUP_90",    name: "Puerta Superior 90cm",   value: 150000, unit: "unidad", sortOrder: 2 },
  { category: "puertas_tapas", code: "PUERTA_SUP_100",   name: "Puerta Superior 100cm",  value: 180000, unit: "unidad", sortOrder: 3 },
  { category: "puertas_tapas", code: "PUERTA_INF",       name: "Puerta Inferior",        value: 150000, unit: "unidad", sortOrder: 4 },
  { category: "puertas_tapas", code: "PUERTA_ALACENA",   name: "Puerta Alacena",         value: 180000, unit: "unidad", sortOrder: 5 },
  { category: "puertas_tapas", code: "TAPA_CAJON",       name: "Tapa Cajón",             value: 90000,  unit: "unidad", sortOrder: 6 },
  { category: "puertas_tapas", code: "TAPA_PEQUENA",     name: "Tapa Pequeña",           value: 45000,  unit: "unidad", sortOrder: 7 },
  { category: "puertas_tapas", code: "PINTADO_SUP",      name: "Alto Brillo Puerta Sup", value: 120000, unit: "unidad", sortOrder: 8 },
  { category: "puertas_tapas", code: "PINTADO_INF",      name: "Alto Brillo Puerta Inf", value: 150000, unit: "unidad", sortOrder: 9 },
  { category: "puertas_tapas", code: "PINTADO_ALACENA",  name: "Alto Brillo Alacena",    value: 250000, unit: "unidad", sortOrder: 10 },
  { category: "puertas_tapas", code: "PINTADO_CAJON",    name: "Alto Brillo Cajón",      value: 80000,  unit: "unidad", sortOrder: 11 },
  { category: "puertas_tapas", code: "PINTADO_ESPECIERO",name: "Alto Brillo Especiero",  value: 100000, unit: "unidad", sortOrder: 12 },
  { category: "puertas_tapas", code: "PINTADO_GOLA",     name: "Alto Brillo Gola",       value: 45000,  unit: "unidad", sortOrder: 13 },

  // ── CLOSETS ────────────────────────────────────────────────────────────────────
  { category: "closets", code: "CLOSET_ESTANDAR_M2",  name: "Closet Estándar (m²)",  value: 750000, unit: "m2", sortOrder: 1 },
  { category: "closets", code: "CLOSET_ESPECIAL_M2",  name: "Closet Especial (m²)",  value: 650000, unit: "m2", sortOrder: 2 },
  { category: "closets", code: "CLOSET_EMPOTRADO_M2", name: "Closet Empotrado (m²)", value: 900000, unit: "m2", sortOrder: 3 },

  // ── PUERTAS (PRODUCTO) ────────────────────────────────────────────────────────
  { category: "puertas_producto", code: "PUERTA_BATIENTE_50_85",   name: "Batiente ancho 50–85 cm",   value: 890000,  unit: "unidad", sortOrder: 1,
    description: "Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación." },
  { category: "puertas_producto", code: "PUERTA_BATIENTE_85_110",  name: "Batiente ancho 85–110 cm",  value: 950000,  unit: "unidad", sortOrder: 2,
    description: "Incluye: Marco RH, chapa gama alta, bisagras omega, tope, instalación." },
  { category: "puertas_producto", code: "PUERTA_CORREDIZA_50_85",  name: "Corrediza ancho 50–85 cm",  value: 1250000, unit: "unidad", sortOrder: 3,
    description: "Incluye: Riel, guías, instalación." },
  { category: "puertas_producto", code: "PUERTA_CORREDIZA_85_110", name: "Corrediza ancho 85–110 cm", value: 1350000, unit: "unidad", sortOrder: 4,
    description: "Incluye: Riel, guías, instalación." },
  // aliases legacy
  { category: "puertas_producto", code: "PUERTA_BATIENTE",           name: "Puerta Batiente (alias)",        value: 890000,  unit: "unidad", sortOrder: 5 },
  { category: "puertas_producto", code: "PUERTA_CORREDIZA_SENCILLA", name: "Puerta Corrediza Sencilla (alias)", value: 1250000, unit: "unidad", sortOrder: 6 },
  { category: "puertas_producto", code: "PUERTA_CORREDIZA_DOBLE",    name: "Puerta Corrediza Doble (alias)",    value: 1350000, unit: "unidad", sortOrder: 7 },

  // ── CENTROS DE ENTRETENIMIENTO ────────────────────────────────────────────────
  { category: "centros_tv", code: "TV_CENTER_BASE",        name: "Centro TV base (hasta 1.60m)", value: 2800000, unit: "unidad", sortOrder: 1,
    description: "Precio base para TV center de 1.60m. Cada 20cm adicionales suma $500.000." },
  { category: "centros_tv", code: "TV_CENTER_ALTO_BRILLO", name: "Incremento Alto Brillo",       value: 350000,  unit: "unidad", sortOrder: 2 },
  { category: "centros_tv", code: "TV_CENTER_LED",         name: "LED (por ml)",                 value: 220000,  unit: "ml",     sortOrder: 3 },
  { category: "centros_tv", code: "TV_CENTER_REPISA",      name: "Repisa adicional",             value: 100000,  unit: "unidad", sortOrder: 4 },
  { category: "centros_tv", code: "TV_CENTER_ESPACIO_EQUIPO",name:"Espacio para equipo",         value: 150000,  unit: "unidad", sortOrder: 5 },
  { category: "centros_tv", code: "TV_CENTER_TRANSPORTE",  name: "Transporte e imprevistos",     value: 150000,  unit: "unidad", sortOrder: 6 },

  // ── ACABADOS ESPECIALES ───────────────────────────────────────────────────────
  { category: "acabados_especiales", code: "ACABADO_ALUMINIO_VIDRIO_M2", name: "Aluminio + Vidrio (m²)",  value: 1200000, unit: "m2",    sortOrder: 1 },
  { category: "acabados_especiales", code: "ACABADO_BISAGRA_PAR",        name: "Bisagra (par)",           value: 15000,   unit: "par",   sortOrder: 2 },
  { category: "acabados_especiales", code: "ACABADO_LED_ML",             name: "LED acabados (por ml)",   value: 150000,  unit: "ml",    sortOrder: 3 },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const cfg = parseDbUrl(DB_URL);
  console.log(`\n🔌 Conectando a MySQL: ${cfg.host}:${cfg.port}/${cfg.database}...\n`);

  const conn = await mysql.createConnection({ ...cfg, multipleStatements: false });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of PRICING_CATALOG) {
    const [rows] = await conn.execute(
      "SELECT id, value FROM pricingConfig WHERE code = ? AND active = 1 LIMIT 1",
      [item.code]
    );

    if (rows.length > 0) {
      const existing = rows[0];
      if (Number(existing.value) !== item.value) {
        await conn.execute(
          "UPDATE pricingConfig SET value = ?, name = ?, description = ?, sortOrder = ?, updatedAt = NOW() WHERE id = ?",
          [item.value, item.name, item.description || null, item.sortOrder, existing.id]
        );
        console.log(`  ✏️  Actualizado  [${item.category}] ${item.code}: ${Number(existing.value).toLocaleString()} → ${item.value.toLocaleString()}`);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await conn.execute(
        `INSERT INTO pricingConfig (category, code, name, description, value, unit, sortOrder, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [item.category, item.code, item.name, item.description || null, item.value, item.unit, item.sortOrder]
      );
      console.log(`  ✅ Creado       [${item.category}] ${item.code}: $${item.value.toLocaleString()} / ${item.unit}`);
      created++;
    }
  }

  await conn.end();

  console.log(`\n${"─".repeat(55)}`);
  console.log(`  ✅ Creados:      ${created}`);
  console.log(`  ✏️  Actualizados: ${updated}`);
  console.log(`  ⏭  Sin cambios:  ${skipped}`);
  console.log(`  📦 Total:        ${PRICING_CATALOG.length}`);
  console.log(`${"─".repeat(55)}\n`);
  console.log("✅ Biblioteca de precios actualizada.\n");
  console.log("   → Para ajustar precios entra a: http://localhost:3000/pricing-config\n");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
