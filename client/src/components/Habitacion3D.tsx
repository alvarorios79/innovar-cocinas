import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { geometriaParedes, anchoMuroCm, descuentosEsquinas, ALTO_INFERIOR_CM, ARRANQUE_SUPERIOR_CM, FONDO_INFERIOR_CM, FONDO_SUPERIOR_CM, ALTO_COCINA_POR_DEFECTO, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

// Habitación de la cocina en 3D (solo paredes, ventanas y puertas) para el levantamiento.
// Hecho para NO pesar: figuras simples (cajas), sin sombras ni texturas, y dibuja SOLO cuando algo cambia (no hay animación continua).
// Si el equipo no puede dibujar 3D, avisa con `onFalla` y la pantalla muestra el dibujo plano.

interface Props {
  forma: string;
  paredes: ParedCocina[];
  separacionCm?: number;
  altoCm?: number;
  aberturas: AberturaCocina[];
  activa: number;
  onPickPared?: (i: number) => void;
  onFalla?: () => void;
  /** Alto del visor en pantalla (por defecto 300 px). En pantalla completa se usa casi todo el alto. */
  altura?: number | string;
  /** Profundo de los muebles (cm); sirve para dibujar las filas de muebles */
  profundoCm?: number;
  /** Fondo de los muebles superiores (cm) y qué pared llega a cada esquina */
  profundoSupCm?: number;
  esquinas?: number[];
  /** Isla y barra (ancho, profundo y alto en cm) */
  isla?: { ancho: number; profundo: number; alto: number } | null;
  barra?: { ancho: number; profundo: number; alto: number } | null;
  /** Mostrar todas las cotas de todas las paredes (la foto de la pizarra las lleva todas) */
  todo?: boolean;
  /** Posición de cámara elegida para la pizarra (si ya se fijó una) */
  vistaPizarra?: PoseCamara | null;
  /** Si se pasa, aparece el botón «Enviar a la pizarra»: guarda la posición actual de la cámara (null = volver a automática) */
  onFijarVista?: (pose: PoseCamara | null) => void;
}

export interface PoseCamara { p: [number, number, number]; t: [number, number, number] }

export interface Habitacion3DRef {
  /** Foto del dibujo 3D (JPEG en data URL) para la pizarra y el plano del levantamiento. Con `pose` usa esa posición de cámara; si no, la vista automática. */
  capturar(pose?: PoseCamara | null): string | null;
}

const COLOR_PARED = 0x8d9aa0, COLOR_ACTIVA = 0x00bcd4, COLOR_PISO = 0x1f2a2e, COLOR_VIDRIO = 0x7fd4ff, COLOR_PUERTA = 0x8a5a2b;
const GROSOR = 0.08;
const fm = (m: number) => (Math.round(m * 100) / 100).toFixed(2).replace(".", ",");   // 3.6 → "3,60"

const Habitacion3D = forwardRef<Habitacion3DRef, Props>(function Habitacion3D({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, altura = 300, profundoCm, profundoSupCm, esquinas, isla, barra, vistaPizarra, onFijarVista, todo }, ref) {
  const [verTodo, setVerTodo] = useState(false);   // botón «Todas las cotas»
  const verTodoRef = useRef(false);
  verTodoRef.current = verTodo || !!todo;
  const host = useRef<HTMLDivElement>(null);
  // La escena se arma una vez; los cambios de medidas la reconstruyen (es pequeña) y se vuelve a dibujar una sola vez.
  const api = useRef<{ rebuild: (p: Props) => void; vista: (v: "arriba" | "frente" | "iso") => void; capturar: (pose?: PoseCamara | null) => string | null; pose: () => PoseCamara } | null>(null);
  useImperativeHandle(ref, () => ({ capturar: (pose) => api.current?.capturar(pose) ?? null }), []);
  const ultimo = useRef<Props>({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, profundoSupCm, esquinas, isla, barra });
  ultimo.current = { forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, profundoSupCm, esquinas, isla, barra };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      ultimo.current.onFalla?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(4, 8, 6);
    scene.add(sol);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // no se puede pasar por debajo del piso
    controls.minDistance = 1.5;
    controls.maxDistance = 25;

    let raf = 0;
    const dibujar = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; renderer.render(scene, camera); }); };
    controls.addEventListener("change", dibujar);

    const contenido = new THREE.Group();
    scene.add(contenido);
    const hitPared: Array<{ mesh: THREE.Object3D; i: number }> = [];

    const limpiar = () => {
      contenido.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => { m.map?.dispose?.(); m.dispose(); }); }
      });
      contenido.clear();
      hitPared.length = 0;
    };

    const etiqueta = (texto: string, x: number, y: number, z: number, activo: boolean) => {
      const c = document.createElement("canvas"); c.width = 64; c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = activo ? "#00bcd4" : "#3a3a3a"; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, 32, 34);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
      sp.position.set(x, y, z); sp.scale.set(0.34, 0.34, 1);
      return sp;
    };

    // Etiqueta de texto con una medida (se dibuja sobre el 3D y también sale en la foto de la pizarra)
    const medida = (texto: string, x: number, y: number, z: number, color = "#ffffff", fondo = "rgba(15,26,29,0.82)", altoM = 0.17) => {
      const c = document.createElement("canvas");
      const g = c.getContext("2d")!;
      g.font = "bold 30px sans-serif";
      const w = Math.ceil(g.measureText(texto).width) + 20, h = 42;
      c.width = w; c.height = h;
      const g2 = c.getContext("2d")!;
      g2.fillStyle = fondo; g2.beginPath(); g2.roundRect?.(0, 0, w, h, 10); if (!g2.roundRect) g2.rect(0, 0, w, h); g2.fill();
      g2.font = "bold 30px sans-serif"; g2.fillStyle = color; g2.textBaseline = "middle"; g2.textAlign = "center"; g2.fillText(texto, w / 2, h / 2 + 1);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      sp.position.set(x, y, z); sp.scale.set(altoM * (w / h), altoM, 1);
      return sp;
    };

    let encuadre = { cx: 0, cz: 0, r: 3 };
    let movidoPorUsuario = false;
    controls.addEventListener("start", () => { movidoPorUsuario = true; });

    const construir = (p: Props) => {
      limpiar();
      const altoGeneral = (p.altoCm && p.altoCm > 100 ? p.altoCm : ALTO_COCINA_POR_DEFECTO) / 100;
      let geo = geometriaParedes(p.forma, p.paredes, p.separacionCm).filter((w) => w.largo > 0.05);
      // Sin medidas todavía: se muestra la forma con paredes de 3 m (transparentes) para que se entienda cómo es
      const fantasma = geo.length === 0;
      if (fantasma) {
        const nominal = (p.paredes.length ? p.paredes : [{}, {}, {}]).map(() => ({ inf: 300, sup: 300 }));
        geo = geometriaParedes(p.forma, nominal, p.separacionCm ?? undefined);
      }
      if (geo.length === 0) { dibujar(); return; }

      // Piso: del tamaño de lo dibujado + un margen
      const xs = geo.flatMap((w) => [w.x1, w.x2]), zs = geo.flatMap((w) => [w.z1, w.z2]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      const sx = maxX - minX + 1.2, sz = maxZ - minZ + 1.2;
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshLambertMaterial({ color: COLOR_PISO }));
      piso.rotation.x = -Math.PI / 2; piso.position.set(cx, 0, cz);
      contenido.add(piso);
      const rejilla = new THREE.GridHelper(Math.max(sx, sz), Math.round(Math.max(sx, sz)), 0x3b4a50, 0x2a363b);
      rejilla.position.set(cx, 0.002, cz);
      contenido.add(rejilla);

      const altoMax = Math.max(altoGeneral, ...geo.map((w) => w.altoM || 0));
      geo.forEach((w) => {
        const alto = w.altoM && w.altoM > 0.5 ? w.altoM : altoGeneral; // cada pared puede tener su propio alto
        const dx = w.x2 - w.x1, dz = w.z2 - w.z1, largo = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        const g = new THREE.Group();
        g.position.set(w.x1, 0, w.z1);
        g.rotation.y = -ang;
        const activo = w.indice === p.activa;
        const mat = new THREE.MeshLambertMaterial({ color: activo ? COLOR_ACTIVA : COLOR_PARED, transparent: true, opacity: fantasma ? 0.25 : activo ? 0.95 : 0.8 });
        const caja = (x0: number, x1: number, y0: number, y1: number, material: THREE.Material, pickable = false) => {
          if (x1 - x0 < 0.001 || y1 - y0 < 0.001) return;
          const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, GROSOR), material);
          m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
          g.add(m);
          if (pickable) hitPared.push({ mesh: m, i: w.indice });
        };
        // Aberturas de ESTA pared, ordenadas (en metros, ya recortadas para que quepan)
        const ab = p.aberturas.filter((a) => a.pared === w.indice).map((a) => {
          const desde = Math.max(0, Math.min(a.desde / 100, largo)), ancho = Math.max(0.1, Math.min(a.ancho / 100, largo - desde));
          const base = Math.max(0, a.antepecho / 100), h = Math.max(0.1, Math.min(a.alto / 100, alto - base));
          return { ...a, d: desde, a: ancho, base, h };
        }).sort((u, v) => u.d - v.d);
        let cursor = 0;
        ab.forEach((a) => {
          caja(cursor, a.d, 0, alto, mat, true);                       // pared llena hasta la abertura
          caja(a.d, a.d + a.a, 0, a.base, mat, true);                  // debajo de la ventana (antepecho)
          caja(a.d, a.d + a.a, a.base + a.h, alto, mat, true);         // encima de la abertura
          if (a.tipo === "ventana") {
            const v = new THREE.Mesh(new THREE.BoxGeometry(a.a, a.h, 0.015), new THREE.MeshLambertMaterial({ color: COLOR_VIDRIO, transparent: true, opacity: 0.4 }));
            v.position.set(a.d + a.a / 2, a.base + a.h / 2, 0); g.add(v);
          } else {
            const marco = new THREE.MeshLambertMaterial({ color: COLOR_PUERTA });
            caja(a.d - 0.03, a.d, 0, a.h, marco); caja(a.d + a.a, a.d + a.a + 0.03, 0, a.h, marco); caja(a.d - 0.03, a.d + a.a + 0.03, a.h, a.h + 0.04, marco);
          }
          cursor = a.d + a.a;
        });
        caja(cursor, largo, 0, alto, mat, true);
        contenido.add(g);

        // ── COTAS (estilo plano): líneas con topes y la medida en el centro ──
        const par = p.paredes[w.indice] || {};
        const ux = dx / largo, uz = dz / largo;            // a lo largo de la pared
        const nzx = -uz, nzz = ux;                         // perpendicular
        const mx = w.x1 + dx / 2, mz = w.z1 + dz / 2;
        const signo = ((cx - mx) * nzx + (cz - mz) * nzz) >= 0 ? 1 : -1; // hacia el interior de la cocina
        const fuera = -signo;                                             // hacia afuera de la cocina
        type P3 = [number, number, number];
        const aMundo = (lx: number, y: number, lz: number): P3 => [w.x1 + lx * ux + lz * nzx, y, w.z1 + lx * uz + lz * nzz];
        // detalle completo: pared elegida, vista de lectura (activa < 0) o cuando se piden todas
        const detalle = !!p.todo || w.indice === p.activa || p.activa < 0;
        // Cota estilo plano: línea de medida (a–b) con topes en diagonal, líneas de referencia que la unen con los puntos medidos (r1, r2) y la medida al centro.
        // Todo se dibuja EN EL PLANO de lo que se mide, así al girar el 3D cada cota sigue pegada a su elemento.
        const cota = (a1: P3, b1: P3, r1: P3, r2: P3, texto: string, color: number, colorTxt: string, escala = 0.17) => {
          const norm = (v: P3): P3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
          const dir = norm([b1[0] - a1[0], b1[1] - a1[1], b1[2] - a1[2]]);
          const e1 = norm([a1[0] - r1[0], a1[1] - r1[1], a1[2] - r1[2]]), e2 = norm([b1[0] - r2[0], b1[1] - r2[1], b1[2] - r2[2]]);
          const ext = (r: P3, e: P3, l: P3): number[] => [r[0] + e[0] * 0.03, r[1] + e[1] * 0.03, r[2] + e[2] * 0.03, l[0] + e[0] * 0.07, l[1] + e[1] * 0.07, l[2] + e[2] * 0.07];
          const t = 0.06;
          const tk = (pt: P3, e: P3): number[] => { const d = norm([dir[0] + e[0], dir[1] + e[1], dir[2] + e[2]]); return [pt[0] - d[0] * t, pt[1] - d[1] * t, pt[2] - d[2] * t, pt[0] + d[0] * t, pt[1] + d[1] * t, pt[2] + d[2] * t]; };
          const pts = new Float32Array([...a1, ...b1, ...ext(r1, e1, a1), ...ext(r2, e2, b1), ...tk(a1, e1), ...tk(b1, e2)]);
          const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
          const ln = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 }));
          ln.renderOrder = 5; contenido.add(ln);
          contenido.add(medida(texto, (a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2, (a1[2] + b1[2]) / 2, colorTxt, "rgba(15,26,29,0.78)", escala));
        };
        const zc = signo * (GROSOR / 2 + 0.012);   // cara de la pared hacia el interior de la cocina
        const alLargo: P3 = [ux, 0, uz], aTraves: P3 = [nzx, 0, nzz], vertical: P3 = [0, 1, 0];
        // Ancho total de la pared (cota exterior) y alto
        cota(aMundo(0, alto + 0.42, zc), aMundo(largo, alto + 0.42, zc), aMundo(0, alto, zc), aMundo(largo, alto, zc), `${fm(largo)} m`, activo ? 0x00e5ff : 0xcfd8dc, activo ? "#80f0ff" : "#ffffff", 0.2);
        if (detalle) cota(aMundo(-0.3, 0, zc), aMundo(-0.3, alto, zc), aMundo(0, 0, zc), aMundo(0, alto, zc), `${fm(alto)} m`, 0xffd54f, "#ffe082", 0.17);

        // Muebles: cajas y su cota
        const fondoI = p.profundoCm && p.profundoCm > 10 ? p.profundoCm : FONDO_INFERIOR_CM, fondoS = p.profundoSupCm && p.profundoSupCm > 10 ? p.profundoSupCm : FONDO_SUPERIOR_CM;
        const profBajo = fondoI / 100, profAlto = fondoS / 100;
        const dsc = descuentosEsquinas(p.forma, p.paredes, fondoI, fondoS, p.esquinas)[w.indice] || { infIni: 0, infFin: 0, supIni: 0, supFin: 0 };
        void dsc; const x0i = 0, x0s = 0;   // la madera se cobra plena: los muebles cubren todo el ancho de la pared (el descuento de esquina es solo del mesón)
        const inf = (par.inf === undefined || par.inf === null ? anchoMuroCm(par) : Number(par.inf) || 0) / 100, sup = (par.sup === undefined || par.sup === null ? anchoMuroCm(par) : Number(par.sup) || 0) / 100;
        if (inf > 0.05) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(inf, largo), ALTO_INFERIOR_CM / 100, profBajo), new THREE.MeshLambertMaterial({ color: 0x26a69a, transparent: true, opacity: 0.6 }));
          m.position.set(x0i + Math.min(inf, largo) / 2, ALTO_INFERIOR_CM / 200, signo * (GROSOR / 2 + profBajo / 2)); g.add(m);
          if (detalle) { const zf = signo * (GROSOR / 2 + profBajo), yy = ALTO_INFERIOR_CM / 100; cota(aMundo(x0i, yy + 0.11, zf), aMundo(x0i + Math.min(inf, largo), yy + 0.11, zf), aMundo(x0i, yy, zf), aMundo(x0i + Math.min(inf, largo), yy, zf), `inf ${fm(inf)}`, 0x80cbc4, "#b2dfdb", 0.15); }
        }
        if (sup > 0.05) {
          // Superiores: arrancan a 1,50 m (0,90 de inferiores + 0,60 de salpicadero) y suben hasta el techo
          const arranque = ARRANQUE_SUPERIOR_CM / 100, altoSup = Math.max(0.3, alto - arranque), ySup = arranque + altoSup / 2;
          const m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(sup, largo), altoSup, profAlto), new THREE.MeshLambertMaterial({ color: 0x7e57c2, transparent: true, opacity: 0.55 }));
          m.position.set(x0s + Math.min(sup, largo) / 2, ySup, signo * (GROSOR / 2 + profAlto / 2)); g.add(m);
          if (detalle) { const zf = signo * (GROSOR / 2 + profAlto); cota(aMundo(x0s, arranque - 0.11, zf), aMundo(x0s + Math.min(sup, largo), arranque - 0.11, zf), aMundo(x0s, arranque, zf), aMundo(x0s + Math.min(sup, largo), arranque, zf), `sup ${fm(sup)}`, 0xb39ddb, "#d1c4e9", 0.15); }
        }

        // Ventanas y puertas: a cada lado queda tanto, y cuánto mide (cadena de cotas), más la altura desde el piso
        if (detalle && ab.length) {
          const quiebres: Array<{ de: number; a: number; tipo: "hueco" | "ventana" | "puerta" }> = [];
          let cur = 0;
          ab.forEach((x) => {
            if (x.d - cur > 0.02) quiebres.push({ de: cur, a: x.d, tipo: "hueco" });
            quiebres.push({ de: x.d, a: x.d + x.a, tipo: x.tipo });
            cur = x.d + x.a;
          });
          if (largo - cur > 0.02) quiebres.push({ de: cur, a: largo, tipo: "hueco" });
          quiebres.forEach((q) => {
            const col = q.tipo === "hueco" ? 0xffffff : q.tipo === "ventana" ? 0x4fc3f7 : 0xffb74d;
            const txt = q.tipo === "hueco" ? "#ffffff" : q.tipo === "ventana" ? "#b3e5fc" : "#ffe0b2";
            // las líneas de referencia salen del borde de la ventana/puerta (su parte de arriba) o del borde de la pared, y suben hasta la cota
            const topAt = (xx: number) => { const it = ab.find((o) => Math.abs(o.d - xx) < 0.006 || Math.abs(o.d + o.a - xx) < 0.006); return it ? it.base + it.h : alto; };
            cota(aMundo(q.de, alto + 0.17, zc), aMundo(q.a, alto + 0.17, zc), aMundo(q.de, topAt(q.de), zc), aMundo(q.a, topAt(q.a), zc), fm(q.a - q.de), col, txt, 0.15);
          });
          ab.forEach((x) => {
            const aDer = x.d + x.a + 0.4 <= largo, bordeX = aDer ? x.d + x.a : x.d, lx = aDer ? bordeX + 0.3 : bordeX - 0.3;   // al lado de la ventana (donde haya espacio)
            const col = x.tipo === "ventana" ? 0x4fc3f7 : 0xffb74d, tx = x.tipo === "ventana" ? "#b3e5fc" : "#ffe0b2";
            if (x.base > 0.02) cota(aMundo(lx, 0, zc), aMundo(lx, x.base, zc), aMundo(bordeX, 0, zc), aMundo(bordeX, x.base, zc), fm(x.base), 0xffffff, "#ffffff", 0.14);
            cota(aMundo(lx, x.base, zc), aMundo(lx, x.base + x.h, zc), aMundo(bordeX, x.base, zc), aMundo(bordeX, x.base + x.h, zc), fm(x.h), col, tx, 0.14);
          });
        }

        // Etiqueta A/B/C encima de la mitad de la pared
        contenido.add(etiqueta(w.nombre, w.x1 + dx / 2, alto + 0.85, w.z1 + dz / 2, activo));
      });

      // Isla y barra (referencia: la posición exacta se arma en el plano de módulos de la cotización)
      const caja3 = (anc: number, pro: number, alt: number, x: number, z: number, color: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(anc, alt, pro), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.8 }));
        m.position.set(x, alt / 2, z); contenido.add(m);
      };
      let zIsla = cz;
      if (p.isla && p.isla.ancho > 0) {
        const anc = p.isla.ancho / 100, pro = (p.isla.profundo || 90) / 100, alt = (p.isla.alto || 90) / 100;
        caja3(anc, pro, alt, cx, cz, 0xffb74d);
        contenido.add(medida(`Isla ${fm(p.isla.ancho / 100)}×${fm((p.isla.profundo || 0) / 100)}×${fm((p.isla.alto || 0) / 100)} m`, cx, alt + 0.2, cz, "#ffcc80", "rgba(15,26,29,0.82)", 0.15));
        zIsla = cz + pro / 2 + 0.12;
      }
      if (p.barra && p.barra.ancho > 0) {
        const anc = p.barra.ancho / 100, pro = (p.barra.profundo || 40) / 100, alt = (p.barra.alto || 100) / 100;
        const zb = zIsla + pro / 2;
        caja3(anc, pro, alt, cx, zb, 0xef5350);
        contenido.add(medida(`Barra ${fm(p.barra.ancho / 100)}×${fm((p.barra.profundo || 0) / 100)}×${fm((p.barra.alto || 0) / 100)} m`, cx, alt + 0.2, zb, "#ef9a9a"));
      }

      encuadre = { cx, cz, r: Math.max(sx, sz, altoMax * 1.4) };
      if (!movidoPorUsuario) vista("iso"); else dibujar();
    };

    function vista(v: "arriba" | "frente" | "iso") {
      // En un visor angosto (pantalla dividida en horizontal) la cámara se aleja un poco para que quepa toda la cocina
      const { cx, cz } = encuadre;
      const r = encuadre.r * Math.min(2.2, Math.max(1, 1.5 / (camera.aspect || 1.5)));
      controls.target.set(cx, 0.9, cz);
      if (v === "arriba") camera.position.set(cx, r * 1.6, cz + 0.001);
      else if (v === "frente") camera.position.set(cx, r * 0.45, cz + r * 1.5);
      else camera.position.set(cx + r * 0.9, r * 0.95, cz + r * 1.1);
      controls.update(); dibujar();
    }

    const ajustar = () => {
      const w = el.clientWidth || 300, h = el.clientHeight || 260;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (!movidoPorUsuario && encuadre.r > 0) vista("iso"); else dibujar(); // al cambiar de tamaño (pantalla completa) se vuelve a encuadrar solo
    };
    const ro = new ResizeObserver(ajustar); ro.observe(el);

    // Tocar una pared la selecciona (solo si fue un toque, no un giro)
    let ini: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { ini = { x: e.clientX, y: e.clientY }; };
    const up = (e: PointerEvent) => {
      if (!ini || Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 6) { ini = null; return; }
      ini = null;
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
      const hit = rc.intersectObjects(hitPared.map((h) => h.mesh), false)[0];
      if (hit) { const f = hitPared.find((h) => h.mesh === hit.object); if (f) ultimo.current.onPickPared?.(f.i); }
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);

    // Si el equipo pierde el contexto 3D, se avisa y la pantalla cambia al dibujo plano
    const perdido = (e: Event) => { e.preventDefault(); ultimo.current.onFalla?.(); };
    renderer.domElement.addEventListener("webglcontextlost", perdido);

    const poseActual = (): PoseCamara => ({
      p: [Math.round(camera.position.x * 100) / 100, Math.round(camera.position.y * 100) / 100, Math.round(camera.position.z * 100) / 100],
      t: [Math.round(controls.target.x * 100) / 100, Math.round(controls.target.y * 100) / 100, Math.round(controls.target.z * 100) / 100],
    });
    // Foto de tamaño fijo (1280×800) desde la posición pedida (o la vista automática); después todo vuelve como estaba
    const capturar = (pose?: PoseCamara | null) => {
      const posAnt = camera.position.clone(), tarAnt = controls.target.clone(), aspAnt = camera.aspect;
      const tam = new THREE.Vector2(); renderer.getSize(tam); const pr = renderer.getPixelRatio();
      try {
        construir({ ...ultimo.current, todo: true });   // la foto de la pizarra lleva todas las cotas
        renderer.setPixelRatio(1); renderer.setSize(1280, 800, false);
        camera.aspect = 1.6; camera.updateProjectionMatrix();
        if (pose) { camera.position.set(...pose.p); controls.target.set(...pose.t); controls.update(); }
        else vista("iso");
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL("image/jpeg", 0.88);
      } catch { return null; }
      finally {
        construir({ ...ultimo.current, todo: verTodoRef.current });
        renderer.setPixelRatio(pr); renderer.setSize(tam.x, tam.y, false);
        camera.aspect = aspAnt; camera.updateProjectionMatrix();
        camera.position.copy(posAnt); controls.target.copy(tarAnt); controls.update(); dibujar();
      }
    };
    api.current = { rebuild: construir, vista, capturar, pose: poseActual };
    ajustar();
    construir({ ...ultimo.current, todo: verTodoRef.current });
    vista("iso");

    return () => {
      api.current = null;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener("change", dibujar);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("webglcontextlost", perdido);
      limpiar();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  // Cada cambio de medidas reconstruye la escena (pequeña) y dibuja una vez
  useEffect(() => {
    api.current?.rebuild({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, profundoSupCm, esquinas, isla, barra, todo: verTodo || !!todo });
  }, [forma, JSON.stringify(paredes), separacionCm, altoCm, JSON.stringify(aberturas), activa, profundoCm, profundoSupCm, JSON.stringify(esquinas), JSON.stringify(isla), JSON.stringify(barra), verTodo, todo]);

  return (
    <div className="relative" style={{ height: altura === "100%" ? "100%" : undefined }}>
      <div ref={host} className="w-full rounded-lg overflow-hidden bg-black/20 border border-white/10" style={{ height: altura }} />
      {onFijarVista && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 flex-wrap justify-end">
          <button type="button" onClick={() => { const pose = api.current?.pose(); if (pose) onFijarVista(pose); }} className="px-3 py-2 rounded bg-primary text-white text-xs font-bold border border-white/30 min-h-[40px]" title="Guarda la posición actual de la cámara y manda esa foto a la pizarra">
            📌 Enviar a la pizarra
          </button>
          {vistaPizarra && (
            <>
              <span className="px-2 py-1 rounded bg-black/60 text-[11px] text-emerald-300 font-semibold">Vista fijada ✓</span>
              <button type="button" onClick={() => onFijarVista(null)} className="px-2 py-1.5 rounded bg-black/50 text-white text-[11px] border border-white/20 min-h-[32px]">Automática</button>
            </>
          )}
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1">
        <button type="button" onClick={() => setVerTodo((v) => !v)} className={`px-2.5 py-1.5 rounded text-xs font-semibold border min-h-[32px] ${verTodo ? "bg-primary text-white border-primary" : "bg-black/50 text-white border-white/20"}`} title="Mostrar las cotas de todas las paredes">Todas las cotas</button>
        {([["iso", "3D"], ["arriba", "Arriba"], ["frente", "Frente"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => api.current?.vista(v)} className="px-2.5 py-1.5 rounded bg-black/50 text-white text-xs font-semibold border border-white/20 min-h-[32px]">{t}</button>
        ))}
      </div>
      <p className="absolute bottom-1.5 left-2 text-[10px] text-white/50 pointer-events-none">Arrastra para girar · pellizca para acercar · toca una pared para elegirla</p>
    </div>
  );
});

export default Habitacion3D;
