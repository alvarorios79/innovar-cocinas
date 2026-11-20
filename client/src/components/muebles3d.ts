import * as THREE from "three";

// Dibujo demostrativo de cada mueble de la cocina en 3D (para que el cliente entienda el proyecto y la distribución):
// la estufa con sus hornillas y su horno, el lavaplatos con la poceta y la llave, los cajoneros con sus gavetas, el extractor, la nevera…
// Son figuras simples (cajas y cilindros) para que no pese en la tablet. El «frente» del mueble mira hacia +z.
// Origen: centro de la base del mueble. Ancho en x, alto en y, fondo en z.

export interface OpcionesMueble { seleccionado?: boolean; fantasma?: boolean; claro?: boolean; manijas?: boolean; frente?: THREE.Material | null; interior?: THREE.Material | null; meson?: THREE.Material | null }
export interface MuebleConstruido { grupo: THREE.Group; cuerpo: THREE.Mesh }

const MAT: Record<string, THREE.MeshLambertMaterial> = {};
const mat = (color: number, opacity = 1): THREE.MeshLambertMaterial => {
  const k = `${color}-${opacity}`;
  return (MAT[k] ||= new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity }));
};
const C = {
  madera: 0xd8cdb8, maderaSup: 0xe6dfd0, puerta: 0xf1ece2, linea: 0x6b6358, manija: 0x4a4f55,
  acero: 0xb9c0c6, aceroOsc: 0x8d969d, negro: 0x1d2024, vidrioHorno: 0x2a3238, losa: 0x42464c, llave: 0xd7dde2,
  nevera: 0xc7ced4, hornilla: 0x15181b, vidrio: 0x9fd8f0, sel: 0x00e5ff,
};

// Estilo de apertura: GOLA (por defecto, todas las cocinas Innovar): la misma madera deja un canal para meter los dedos, sin manijas ni tiradores.
// Solo con manijas si el cliente lo pide. Se dibuja como una franja oscura (el canal) en el borde de la puerta.
let CON_MANIJAS = false;
let MESON: THREE.Material | null = null;   // piedra del mesón (el material es el real de la cotización; el color o la veta es orientativo)
// Color/textura elegida para los frentes (puertas y gavetas). Sin elegir: el tono claro de siempre. La gola toma la misma textura, más oscura.
let FRENTE: THREE.Material | null = null;
const GOLA_MATS = new WeakMap<THREE.Material, THREE.Material>();
const golaDe = (f: THREE.Material): THREE.Material => {
  let m = GOLA_MATS.get(f);
  if (!m) { m = new THREE.MeshLambertMaterial({ map: (f as THREE.MeshLambertMaterial).map ?? null, color: 0x8a8a8a }); GOLA_MATS.set(f, m); }
  return m;
};
const GOLA_COLOR = 0x6e5f4c;
const caja = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, color: number, op = 1) => {
  const material = MESON && color === C.losa ? MESON : FRENTE && color === C.puerta ? FRENTE : FRENTE && color === GOLA_COLOR ? golaDe(FRENTE) : mat(color, op);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); g.add(m); return m;
};
const cilindro = (g: THREE.Group, rt: number, rb: number, h: number, x: number, y: number, z: number, color: number, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z); g.add(m); return m;
};

// Puertas del frente (n paneles con su línea de separación y su manija)
function puertas(g: THREE.Group, w: number, h: number, d: number, y0: number, n: number, manijaArriba: boolean) {
  const z = d / 2 + 0.004, pw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + pw * (i + 0.5);
    caja(g, pw - 0.012, h - 0.012, 0.012, cx, y0 + h / 2, z, C.puerta);
    if (CON_MANIJAS) {
      // manija: barra vertical cerca del centro de la pared de al lado
      const mx = cx + (i % 2 === 0 ? 1 : -1) * (pw / 2 - 0.045);
      caja(g, 0.012, Math.min(0.2, h * 0.35), 0.014, n === 1 ? cx + pw / 2 - 0.05 : mx, y0 + (manijaArriba ? h - Math.min(0.2, h * 0.35) / 2 - 0.05 : Math.min(0.2, h * 0.35) / 2 + 0.05), z + 0.012, C.manija);
    } else {
      // gola: canal en el borde superior de los inferiores y en el borde inferior de los superiores
      caja(g, pw - 0.03, 0.03, 0.008, cx, manijaArriba ? y0 + h - 0.021 : y0 + 0.021, z + 0.008, GOLA_COLOR);
    }
  }
}
function gavetas(g: THREE.Group, w: number, h: number, d: number, n: number) {
  const z = d / 2 + 0.004, gh = h / n;
  for (let i = 0; i < n; i++) {
    const cy = gh * (i + 0.5);
    caja(g, w - 0.012, gh - 0.012, 0.012, 0, cy, z, C.puerta);
    if (CON_MANIJAS) caja(g, Math.min(0.28, w * 0.5), 0.012, 0.014, 0, cy + gh / 2 - 0.045, z + 0.012, C.manija);
    else caja(g, w - 0.03, 0.03, 0.008, 0, cy + gh / 2 - 0.021, z + 0.008, GOLA_COLOR);   // gola en el borde de cada gaveta
  }
}
const nPuertas = (w: number) => (w <= 0.45 ? 1 : w <= 0.8 ? 2 : w <= 1.15 ? 3 : 4);

// Hornillas de una estufa (sobre la losa)
function estufa(g: THREE.Group, w: number, d: number, yTop: number) {
  caja(g, w - 0.04, 0.012, d - 0.06, 0, yTop + 0.006, 0, C.hornilla);
  const dx = (w - 0.04) / 4, dz = (d - 0.06) / 4;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cilindro(g, dx * 0.9, dx * 0.9, 0.012, a * dx * 1.0, yTop + 0.016, b * dz * 1.0, 0x30363b, 16));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cilindro(g, dx * 0.45, dx * 0.45, 0.014, a * dx * 1.0, yTop + 0.02, b * dz * 1.0, 0x0b0d0f, 12));
}
// Poceta con llave (sobre la losa)
function lavaplatos(g: THREE.Group, w: number, d: number, yTop: number, doble: boolean) {
  const n = doble ? 2 : 1, pw = (w - 0.1) / n - (doble ? 0.03 : 0);
  for (let i = 0; i < n; i++) {
    const cx = n === 1 ? 0 : (i === 0 ? -1 : 1) * (pw / 2 + 0.015);
    caja(g, pw, 0.014, d * 0.62, cx, yTop + 0.007, d * 0.07, C.aceroOsc);
    caja(g, pw - 0.06, 0.016, d * 0.62 - 0.06, cx, yTop + 0.012, d * 0.07, 0x59636a);
  }
  // llave: base, cuello y pico
  const zb = -d * 0.36;
  cilindro(g, 0.022, 0.026, 0.05, 0, yTop + 0.025, zb, C.llave, 10);
  cilindro(g, 0.011, 0.011, 0.28, 0, yTop + 0.19, zb, C.llave, 8);
  caja(g, 0.02, 0.02, 0.16, 0, yTop + 0.33, zb + 0.07, C.llave);
  caja(g, 0.014, 0.05, 0.014, 0.045, yTop + 0.06, zb, C.llave);
}

export function crearMueble3D(key: string, row: "upper" | "lower" | "tall", w: number, h: number, d: number, op: OpcionesMueble = {}): MuebleConstruido {
  CON_MANIJAS = !!op.manijas; FRENTE = op.frente ?? null; MESON = op.meson ?? null;
  const g = new THREE.Group();
  const sup = row === "upper";
  const color = op.seleccionado ? 0xbdeff5 : sup ? C.maderaSup : C.madera;
  // Inferior terminado = 0,90 m desde el piso: zócalo de 10 cm + carcasa + losa de 4 cm. Los superiores y los altos no llevan zócalo ni losa.
  const ZOC = row === "lower" ? 0.10 : 0;
  const cuerpoAlto = row === "lower" ? h - 0.04 - ZOC : h;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(w, cuerpoAlto, d), op.interior && !op.seleccionado ? op.interior : mat(color, 1));
  cuerpo.position.set(0, ZOC + cuerpoAlto / 2, 0); g.add(cuerpo);

  if (row === "lower") {
    // losa de piedra
    caja(g, w + 0.004, 0.04, d + 0.03, 0, h - 0.02, 0.015, C.losa);
    const yTop = h;
    const hf = cuerpoAlto - 0.04;
    // El frente (puertas, gavetas, perillas) arranca sobre el zócalo
    const fr = new THREE.Group(); fr.position.y = ZOC; g.add(fr);
    switch (key) {
      case "moduloEstufaPuerta":
        estufa(g, w, d, yTop); puertas(fr, w, hf, d, 0.02, 1, true); break;
      case "moduloEstufaHorno": {
        estufa(g, w, d, yTop);
        const z = d / 2 + 0.005;
        caja(fr, w - 0.06, 0.07, 0.012, 0, hf - 0.04, z, C.negro);                 // panel de perillas
        [-0.2, -0.1, 0, 0.1, 0.2].forEach((fx) => { if (Math.abs(fx) < w / 2 - 0.05) cilindro(fr, 0.012, 0.012, 0.012, fx * (w / 0.7), hf - 0.04, z + 0.01, C.acero, 8).rotation.x = Math.PI / 2; });
        caja(fr, w - 0.08, hf - 0.2, 0.012, 0, (hf - 0.2) / 2 + 0.04, z, C.acero);   // puerta del horno
        caja(fr, w - 0.18, hf - 0.34, 0.014, 0, (hf - 0.2) / 2 + 0.06, z + 0.008, C.vidrioHorno);
        caja(fr, w - 0.14, 0.016, 0.02, 0, hf - 0.19, z + 0.02, C.manija);
        break;
      }
      case "moduloLavaplatos": lavaplatos(g, w, d, yTop, false); puertas(fr, w, hf, d, 0.02, 2, true); break;
      case "moduloLavaplatosDoble": lavaplatos(g, w, d, yTop, true); puertas(fr, w, hf, d, 0.02, 2, true); break;
      case "cajoneroTriple": gavetas(fr, w, hf, d, 3); break;
      case "cajoneroDoble": gavetas(fr, w, hf, d, 2); break;
      case "basurero": puertas(fr, w, hf, d, 0.02, 1, true); caja(fr, 0.1, 0.1, 0.01, 0, hf * 0.45, d / 2 + 0.014, 0x7a8288); break;
      case "especiero": puertas(fr, w, hf, d, 0.02, 1, true); [0.2, 0.45, 0.7].forEach((f) => caja(fr, w * 0.55, 0.014, 0.01, 0, hf * f, d / 2 + 0.014, 0x8a7d66)); break;
      case "botellero": {
        puertas(fr, w, hf, d, 0.02, 1, true);
        [0.25, 0.5, 0.75].forEach((f) => [-1, 1].forEach((s) => cilindro(fr, 0.028, 0.028, 0.012, s * w * 0.22, hf * f, d / 2 + 0.014, 0x2d2a26, 12).rotation.x = Math.PI / 2));
        break;
      }
      case "esquinero1x1": puertas(fr, w, hf, d, 0.02, w < 0.55 ? 1 : 2, true); break;   // el brazo corto de la «L» lleva una puerta
      default: puertas(fr, w, hf, d, 0.02, nPuertas(w), true);   // almacenamiento inferior
    }
    caja(g, w - 0.004, ZOC, d - 0.05, 0, ZOC / 2, -0.025, 0x2b2b2b);   // zócalo de 10 cm, metido 5 cm hacia atrás para que se vea
  } else if (sup) {
    const z = d / 2 + 0.004;
    switch (key) {
      case "moduloExtractor": case "moduloExtractorMicroondas": {
        // Módulo de 0,70 m: el extractor va en la parte de ABAJO (frente de acero con su luz y sus botones) y arriba lleva puerta
        const hExt = Math.min(0.32, h * 0.38);
        caja(g, w - 0.02, hExt, d - 0.02, 0, hExt / 2 + 0.005, 0.0, C.acero);                              // cuerpo del extractor
        caja(g, w - 0.04, hExt * 0.55, 0.014, 0, hExt * 0.55, d / 2 + 0.006, C.aceroOsc);                    // frente de acero
        caja(g, w - 0.14, 0.012, 0.018, 0, hExt * 0.9, d / 2 + 0.01, 0x2b3036);                              // manija
        [-0.12, 0, 0.12].forEach((fx) => cilindro(g, 0.012, 0.012, 0.012, fx * (w / 0.7), hExt * 0.3, d / 2 + 0.014, 0x15181b, 8).rotation.x = Math.PI / 2);   // botones
        caja(g, w * 0.5, 0.006, d * 0.7, 0, 0.004, 0.0, 0xfff2b0);                                          // luz de la campana
        if (key === "moduloExtractorMicroondas") {
          caja(g, w - 0.03, 0.26, 0.02, 0, hExt + 0.17, z + 0.005, C.negro);
          caja(g, w * 0.62, 0.17, 0.024, -0.03, hExt + 0.17, z + 0.012, C.vidrioHorno);
          puertas(g, w, h - hExt - 0.3, d, hExt + 0.3, 1, false);
        } else {
          puertas(g, w, h - hExt, d, hExt, nPuertas(w) > 2 ? 2 : nPuertas(w), false);                       // arriba: puerta(s)
        }
        break;
      }
      case "moduloMicroondas":
        caja(g, w - 0.03, h * 0.45, 0.02, 0, h * 0.28, z + 0.005, C.negro);
        caja(g, w * 0.62, h * 0.33, 0.024, -0.03, h * 0.28, z + 0.012, C.vidrioHorno);
        [0.4, 0.2].forEach((f) => cilindro(g, 0.014, 0.014, 0.014, w * 0.38, h * f, z + 0.016, C.acero, 8).rotation.x = Math.PI / 2);
        puertas(g, w, h * 0.3, d, h * 0.68, 1, false);
        break;
      case "moduloRepisa": {
        cuerpo.material = mat(color, 0.25);
        [0.33, 0.66].forEach((f) => caja(g, w - 0.02, 0.02, d - 0.02, 0, h * f, 0, C.maderaSup));
        break;
      }
      case "moduloPlatero": {
        puertas(g, w, h, d, 0, 2, false);
        // se insinúan los platos en el escurridor (varillas)
        [-0.28, -0.1, 0.1, 0.28].forEach((f) => caja(g, 0.008, h * 0.5, 0.008, f * w * 1.3, h * 0.35, z + 0.014, 0xcfd6db));
        break;
      }
      case "ventana": break;
      default: puertas(g, w, h, d, 0, nPuertas(w), false);
    }
  } else {
    // módulos de piso a techo
    const z = d / 2 + 0.005;
    switch (key) {
      case "nichoNevecon": case "nichoNevera": {
        const ancho = key === "nichoNevecon" ? w : w;
        const altoNev = Math.min(h - 0.35, 1.85);
        cuerpo.material = mat(op.seleccionado ? 0xbdeff5 : 0x9a9488);
        caja(g, ancho - 0.06, altoNev, d - 0.06, 0, altoNev / 2 + 0.03, 0.02, C.nevera);
        const hf = altoNev;
        if (key === "nichoNevecon") {
          caja(g, 0.01, hf * 0.62, 0.012, 0, hf * 0.32 + 0.03, d / 2 - 0.02, C.aceroOsc);
          [-1, 1].forEach((s) => caja(g, 0.016, hf * 0.3, 0.03, s * 0.05, hf * 0.62, d / 2 - 0.0, C.manija));
          caja(g, ancho - 0.1, 0.01, 0.012, 0, hf * 0.66 + 0.03, d / 2 - 0.02, C.aceroOsc);
        } else {
          caja(g, ancho - 0.1, 0.012, 0.012, 0, hf * 0.62, d / 2 - 0.02, C.aceroOsc);
          caja(g, 0.016, hf * 0.3, 0.03, ancho * 0.36, hf * 0.8, d / 2, C.manija);
          caja(g, 0.016, hf * 0.45, 0.03, ancho * 0.36, hf * 0.3, d / 2, C.manija);
        }
        // gabinete superior sobre la nevera (hasta el techo)
        caja(g, ancho - 0.02, h - altoNev - 0.06, d - 0.02, 0, altoNev + 0.06 + (h - altoNev - 0.06) / 2, 0, C.maderaSup);
        caja(g, ancho - 0.04, h - altoNev - 0.08, 0.012, 0, altoNev + 0.07 + (h - altoNev - 0.08) / 2, z, C.puerta);
        break;
      }
      case "torreHornos": {
        caja(g, w - 0.04, 0.4, 0.014, 0, h * 0.42, z, C.acero); caja(g, w - 0.14, 0.26, 0.018, 0, h * 0.42, z + 0.008, C.vidrioHorno);
        caja(g, w - 0.04, 0.4, 0.014, 0, h * 0.42 + 0.46, z, C.acero); caja(g, w - 0.14, 0.26, 0.018, 0, h * 0.42 + 0.46, z + 0.008, C.vidrioHorno);
        caja(g, w - 0.04, 0.2, 0.014, 0, h * 0.42 - 0.34, z, C.puerta); if (CON_MANIJAS) caja(g, w * 0.4, 0.012, 0.016, 0, h * 0.42 - 0.26, z + 0.01, C.manija); else caja(g, w - 0.06, 0.028, 0.008, 0, h * 0.42 - 0.26, z + 0.012, GOLA_COLOR);
        caja(g, w - 0.04, h * 0.3, 0.012, 0, h * 0.86, z, C.puerta);
        break;
      }
      case "alacenaHerraje": puertas(g, w, h - 0.04, d, 0.02, 1, false); [0.3, 0.55, 0.8].forEach((f) => caja(g, w * 0.7, 0.01, 0.01, 0, h * f, z + 0.012, 0x8a7d66)); break;
      default: puertas(g, w, h - 0.04, d, 0.02, 1, false);   // alacena con entrepaños
    }
  }
  // contorno de selección
  if (op.seleccionado) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: C.sel, depthTest: false, transparent: true }));
    e.position.set(0, h / 2, 0); e.renderOrder = 8; g.add(e);
  }
  return { grupo: g, cuerpo };
}

/**
 * Esquinero en «L»: UN SOLO mueble (una carcasa continua), no dos cajas pegadas. Como el modelo de referencia (carcasa de 18 mm, zócalo de 10 cm, losa encima):
 * dos brazos que se juntan en la esquina y dos frentes (uno por brazo) en el rincón de la L.
 *  · inferior: 1,00 × 1,00 m con 0,60 de fondo; superior: 0,60 × 0,60 m con 0,35 de fondo.
 * Se dibuja en el marco de la pared que lo lleva: x a lo largo de la pared, z hacia la cocina (por `sg`), la esquina al final de la pared (xFin) y la pared vecina a su derecha.
 */
export function crearEsquinero3D(row: "lower" | "upper", ancho: number, alto: number, fondo: number, sg: number, xFin: number, z0: number, op: OpcionesMueble = {}): MuebleConstruido {
  CON_MANIJAS = !!op.manijas; FRENTE = op.frente ?? null; MESON = op.meson ?? null;
  const g = new THREE.Group();
  const xE = xFin - z0, X0 = xE - ancho;           // la cara de la pared vecina está en xE
  const lower = row === "lower";
  const hCuerpo = lower ? alto - 0.04 : alto;
  const extruir = (pts: Array<[number, number]>, y0: number, h: number, color: number) => {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -sg * z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
    const m = new THREE.Mesh(geo, MESON && color === C.losa ? MESON : op.interior && !op.seleccionado && (color === C.madera || color === C.maderaSup) ? op.interior : mat(color));
    g.add(m); return m;
  };
  const L = (arm: number, th: number, extra = 0): Array<[number, number]> => [[X0, z0], [xE, z0], [xE, z0 + arm + extra], [xE - th - extra, z0 + arm + extra], [xE - th - extra, z0 + th + extra], [X0, z0 + th + extra]];
  const color = op.seleccionado ? 0xbdeff5 : lower ? C.madera : C.maderaSup;
  const zocalo = lower ? 0.10 : 0;
  if (lower) extruir(L(ancho - 0.04, fondo - 0.04), 0, zocalo, 0x2b2b2b);                        // zócalo de 10 cm, un poco metido
  const cuerpo = extruir(L(ancho, fondo), zocalo, hCuerpo - zocalo, color);                        // carcasa en L (una sola pieza)
  if (lower) extruir(L(ancho, fondo, 0.015), alto - 0.04, 0.04, C.losa);                           // losa continua encima
  // Los dos frentes del rincón de la L (cada uno de «ancho − fondo» de largo), con su puerta y su manija
  const largoF = ancho - fondo, yIni = zocalo + 0.012, hf = hCuerpo - zocalo - 0.024;
  const zf = (z: number) => sg * z;
  const puerta = (w: number, h: number, d: number, x: number, y: number, z: number, color: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MESON && color === C.losa ? MESON : FRENTE && color === C.puerta ? FRENTE : FRENTE && color === GOLA_COLOR ? golaDe(FRENTE) : mat(color)); m.position.set(x, y, zf(z)); g.add(m); return m; };
  // frente del brazo A (mira hacia la cocina): en z = z0 + fondo
  puerta(largoF - 0.012, hf, 0.012, X0 + largoF / 2, yIni + hf / 2, z0 + fondo + 0.006, C.puerta);
  if (CON_MANIJAS) puerta(0.012, Math.min(0.2, hf * 0.35), 0.014, X0 + largoF - 0.05, yIni + (lower ? hf - 0.12 : 0.12), z0 + fondo + 0.016, C.manija);
  else puerta(largoF - 0.03, 0.03, 0.008, X0 + largoF / 2, yIni + (lower ? hf - 0.021 : 0.021), z0 + fondo + 0.016, GOLA_COLOR);
  // frente del brazo B (mira hacia la pared A… hacia el rincón): en x = xE − fondo
  const mB = puerta(0.012, hf, largoF - 0.012, xE - fondo - 0.006, yIni + hf / 2, z0 + fondo + largoF / 2, C.puerta); void mB;
  if (CON_MANIJAS) puerta(0.014, Math.min(0.2, hf * 0.35), 0.012, xE - fondo - 0.016, yIni + (lower ? hf - 0.12 : 0.12), z0 + fondo + 0.05, C.manija);
  else puerta(0.008, 0.03, largoF - 0.03, xE - fondo - 0.016, yIni + (lower ? hf - 0.021 : 0.021), z0 + fondo + largoF / 2, GOLA_COLOR);
  if (lower) { // un entrepaño insinuado en el rincón (se ve en el modelo de referencia)
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), mat(C.madera)); e.visible = false; g.add(e);
  }
  if (op.seleccionado) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(cuerpo.geometry), new THREE.LineBasicMaterial({ color: C.sel, depthTest: false, transparent: true }));
    e.renderOrder = 8; g.add(e);
  }
  return { grupo: g, cuerpo };
}

