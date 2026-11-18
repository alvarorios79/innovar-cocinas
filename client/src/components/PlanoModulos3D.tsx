import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { geometriaParedes, ALTO_INFERIOR_CM, ARRANQUE_SUPERIOR_CM, FONDO_INFERIOR_CM, FONDO_SUPERIOR_CM, SEPARACION_PARALELA_POR_DEFECTO } from "@shared/cocinaParedes";
import { CATALOG_BY_KEY, rowItems, isPainted, round2, type ModulePlan, type PlanRow } from "@shared/kitchenModulePlan";

// Plano de módulos de la cocina en 3D. Reemplaza al dibujo de frente 2D: se ve la cocina como la va a ver el cliente.
//  · La cámara se mueve libre (girar, acercar, desplazar) y se deja donde quede cómoda.
//  · Tocar un módulo lo selecciona; arrastrarlo lo mueve a lo largo de la pared (con el imán del plano: se pega al vecino, a la esquina o a la ventana)
//    o a otra pared. La isla y la barra son bloques sueltos: se arrastran por el piso y se giran.
// Toda la lógica de acomodo (imán, pintura, piezas, avisos) es la de siempre (shared/kitchenModulePlan): aquí solo se dibuja y se traducen los gestos.
// Liviano para la tablet: cajas simples, sin sombras, y dibuja SOLO cuando algo cambia.

export type SelModulo = { t: number; row: PlanRow; id: string } | { t: number; tall: string } | null;

export interface PoseCamara3D { p: [number, number, number]; t: [number, number, number] }
export interface PlanoModulos3DRef { capturar(vista?: "iso" | "arriba" | "frente"): string | null }

interface Props {
  plan: ModulePlan;
  config: any;                                       // kitchenConfig (forma, aberturas del levantamiento)
  sel: SelModulo;
  onSelect: (s: SelModulo) => void;
  /** Aplica un cambio al plano (el mismo `edit` del editor: copia, acomoda y guarda) */
  onEdit: (fn: (p: ModulePlan) => void) => void;
  onFalla?: () => void;
  altura?: number | string;
  moveTramo: (p: ModulePlan, fromT: number, row: PlanRow, id: string, toT: number, start: number) => boolean;
  dropMod: (p: ModulePlan, t: number, row: PlanRow, id: string, start: number) => void;
  dropTallTo: (p: ModulePlan, key: string, tramo: number, start: number) => void;
}

const GROSOR = 0.08;
const ALTO_DEF = 2.4;
const COLOR = { lower: 0x26a69a, upper: 0x7e57c2, tall: 0xffa726, vidrio: 0x7fd4ff, puerta: 0x8a5a2b, pared: 0x8d9aa0, piso: 0x1f2a2e, losa: 0xffd54f };
const colorDe = (key: string, row: PlanRow | "tall"): number => {
  if (row === "tall") return COLOR.tall;
  if (key === "moduloLavaplatos" || key === "moduloLavaplatosDoble" || key === "moduloPlatero") return 0x4fc3f7;
  if (key.startsWith("moduloEstufa") || key.startsWith("moduloExtractor")) return 0xef5350;
  if (key.startsWith("esquinero")) return row === "upper" ? 0x9575cd : 0x00897b;
  return row === "upper" ? COLOR.upper : COLOR.lower;
};
const fm = (m: number) => (Math.round(m * 100) / 100).toFixed(2).replace(".", ",");

type Wall = { t: number; x1: number; z1: number; ux: number; uz: number; nx: number; nz: number; sg: number; largo: number; alto: number };

function formaDe(layout?: string): string {
  if (layout === "L") return "L";
  if (layout === "U") return "U";
  if (layout === "paralela" || layout === "cuadrada") return "Paralela";
  return "Lineal";
}

const PlanoModulos3D = forwardRef<PlanoModulos3DRef, Props>(function PlanoModulos3D(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const [verCotas, setVerCotas] = useState(true);
  const ultimo = useRef(props);
  ultimo.current = props;
  const cotasRef = useRef(true);
  cotasRef.current = verCotas;
  const api = useRef<{ rebuild: () => void; vista: (v: "iso" | "arriba" | "frente") => void; capturar: (v?: "iso" | "arriba" | "frente") => string | null } | null>(null);
  useImperativeHandle(ref, () => ({ capturar: (v) => api.current?.capturar(v) ?? null }), []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
    } catch { ultimo.current.onFalla?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    const cv = renderer.domElement;
    cv.style.touchAction = "none"; cv.style.display = "block";

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(4, 8, 6); scene.add(sol);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const controls = new OrbitControls(camera, cv);
    controls.enableDamping = false; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 1; controls.maxDistance = 25;

    let raf = 0;
    const dibujar = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; renderer.render(scene, camera); }); };
    controls.addEventListener("change", dibujar);

    const contenido = new THREE.Group(); scene.add(contenido);
    const pickables: THREE.Object3D[] = [];
    let paredes: Wall[] = [];
    let encuadre = { cx: 0, cz: 0, r: 4, radio: 3, alto: ALTO_DEF };
    let movido = false;
    let ocultarSel = false;   // al tomar fotos no se muestra la selección
    let claro = false;        // fotos para el PDF: fondo claro y letras oscuras (se imprimen mejor)

    const limpiar = () => {
      contenido.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => { m.map?.dispose?.(); m.dispose(); });
      });
      contenido.clear(); pickables.length = 0;
    };

    const texto = (txt: string, colorIn = "#ffffff", altoM = 0.1) => {
      const color = claro ? "#1b2b34" : colorIn;
      const c = document.createElement("canvas"); const g = c.getContext("2d")!;
      g.font = "bold 28px sans-serif";
      const w = Math.ceil(g.measureText(txt).width) + 16, h = 38; c.width = w; c.height = h;
      const g2 = c.getContext("2d")!;
      g2.fillStyle = claro ? "rgba(255,255,255,0.9)" : "rgba(15,26,29,0.72)"; g2.fillRect(0, 0, w, h);
      g2.font = "bold 28px sans-serif"; g2.fillStyle = color; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText(txt, w / 2, h / 2 + 1);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      const k = claro ? 1.5 : 1; sp.scale.set(altoM * k * (w / h), altoM * k, 1); sp.renderOrder = 6;
      return sp;
    };

    // ── Paredes (de las medidas de cada tramo y la forma de la cocina) ──
    const geometria = (): Wall[] => {
      const { plan, config } = ultimo.current;
      const tr = plan.tramos.map((x, t) => ({ x, t })).filter((o) => !o.x.isIsland);
      const forma = formaDe(config?.layout);
      const lista = tr.map((o) => ({ ancho: Math.round((o.x.length || 0) * 100) }));
      const sepCm = Number(config?.fromLevantamiento?.medidas?._cocina_separacion) || SEPARACION_PARALELA_POR_DEFECTO;
      const geo = geometriaParedes(forma, lista, sepCm);
      const altoCm = Number(config?.fromLevantamiento?.medidas?._cocina_alto);
      const alto = altoCm > 100 ? altoCm / 100 : ALTO_DEF;
      const xs = geo.flatMap((g) => [g.x1, g.x2]), zs = geo.flatMap((g) => [g.z1, g.z2]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      return geo.map((g, i) => {
        const dx = g.x2 - g.x1, dz = g.z2 - g.z1, largo = Math.hypot(dx, dz) || 0.0001;
        const ux = dx / largo, uz = dz / largo, nx = -uz, nz = ux;
        const mx = g.x1 + dx / 2, mz = g.z1 + dz / 2;
        const sg = ((cx - mx) * nx + (cz - mz) * nz) >= 0 ? 1 : -1;
        return { t: tr[i]?.t ?? i, x1: g.x1, z1: g.z1, ux, uz, nx, nz, sg, largo, alto };
      });
    };
    const aMundo = (w: Wall, s: number, y: number, d: number): [number, number, number] => [w.x1 + w.ux * s + w.nx * w.sg * d, y, w.z1 + w.uz * s + w.nz * w.sg * d];

    // posición por defecto de un bloque suelto (isla/barra): al frente de las paredes, separado de ellas
    const posBloque = (t: number, idx: number, largo: number) => {
      const tr = ultimo.current.plan.tramos[t];
      if (tr.pos) return tr.pos;
      const w0 = paredes[0];
      if (!w0) return { x: 0, z: 1.8, rot: 0 };
      const mid = aMundo(w0, w0.largo / 2, 0, 1.9 + idx * 1.1);
      const ang = -Math.atan2(w0.uz, w0.ux) * 180 / Math.PI;
      void largo;
      return { x: mid[0], z: mid[2], rot: round2(ang) };
    };

    const construir = () => {
      limpiar();
      const { plan, config } = ultimo.current;
      const sel = ocultarSel ? null : ultimo.current.sel;
      paredes = geometria();
      if (!paredes.length) { dibujar(); return; }
      const alto = paredes[0].alto;
      const aber: any[] = Array.isArray(config?.fromLevantamiento?.aberturas) ? config.fromLevantamiento.aberturas : [];

      // Piso
      const xs = paredes.flatMap((w) => [w.x1, w.x1 + w.ux * w.largo]), zs = paredes.flatMap((w) => [w.z1, w.z1 + w.uz * w.largo]);
      const minX = Math.min(...xs) - 2.5, maxX = Math.max(...xs) + 2.5, minZ = Math.min(...zs) - 2.5, maxZ = Math.max(...zs) + 2.5;
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshLambertMaterial({ color: claro ? 0xdde5e8 : COLOR.piso }));
      piso.rotation.x = -Math.PI / 2; piso.position.set((minX + maxX) / 2, -0.01, (minZ + maxZ) / 2); contenido.add(piso);
      const grid = new THREE.GridHelper(Math.max(maxX - minX, maxZ - minZ), Math.round(Math.max(maxX - minX, maxZ - minZ)), claro ? 0xb7c4ca : 0x35484f, claro ? 0xc9d4d9 : 0x2a3a40);
      grid.position.set((minX + maxX) / 2, 0.001, (minZ + maxZ) / 2); contenido.add(grid);

      const sombra = (mesh: THREE.Mesh, c: number, row: PlanRow | "tall", selected: boolean) => {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: selected ? 0xffffff : 0x0b1215, transparent: true, opacity: selected ? 1 : 0.55 }));
        mesh.add(edges);
        void c; void row;
      };
      const caja = (grp: THREE.Object3D, s0: number, w: number, y0: number, h: number, dIni: number, prof: number, sg: number, c: number, op: number, data: any, selected: boolean) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, prof), new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: selected ? Math.min(1, op + 0.3) : op, emissive: selected ? 0x444444 : 0x000000 }));
        m.position.set(s0 + w / 2, y0 + h / 2, sg * (dIni + prof / 2));
        m.userData = data; sombra(m, c, data.row || "tall", selected); grp.add(m);
        if (data.pick) pickables.push(m);
        return m;
      };

      plan.tramos.forEach((tr, t) => {
        const isBloque = !!tr.isIsland;
        const W = paredes.find((w) => w.t === t);
        const grp = new THREE.Group();
        let sg = 1;
        let dIni = GROSOR / 2;
        let largoVisible = tr.length || 0;
        if (isBloque) {
          const idx = plan.tramos.filter((x, k) => x.isIsland && k < t).length;
          const pos = posBloque(t, idx, largoVisible);
          grp.position.set(pos.x, 0, pos.z); grp.rotation.y = (pos.rot * Math.PI) / 180;
          grp.userData = { bloque: t };
          dIni = 0;
        } else if (W) {
          grp.position.set(W.x1, 0, W.z1); grp.rotation.y = -Math.atan2(W.uz, W.ux); sg = W.sg;
          // pared
          const pared = new THREE.Mesh(new THREE.BoxGeometry(W.largo, alto, GROSOR), new THREE.MeshLambertMaterial({ color: COLOR.pared, transparent: true, opacity: claro ? 0.4 : 0.22 }));
          pared.position.set(W.largo / 2, alto / 2, 0); grp.add(pared);
          // piso/zócalo de la pared: línea de referencia del largo
          const base = new THREE.Mesh(new THREE.BoxGeometry(W.largo, 0.02, GROSOR + 0.02), new THREE.MeshLambertMaterial({ color: 0x00bcd4 })); base.position.set(W.largo / 2, 0.01, 0); grp.add(base);
          const et = texto(`${tr.name} · ${fm(W.largo)} m`, "#80f0ff", 0.12); et.position.set(W.largo / 2, alto + 0.18, 0); grp.add(et);
        } else return;

        const offX = isBloque ? -largoVisible / 2 : 0;
        const profInf = FONDO_INFERIOR_CM / 100, profSup = FONDO_SUPERIOR_CM / 100;
        const arranque = ARRANQUE_SUPERIOR_CM / 100, hInf = ALTO_INFERIOR_CM / 100;

        // Base de un bloque suelto (isla/barra): se toca para moverlo por el piso
        if (isBloque) {
          const losa = new THREE.Mesh(new THREE.BoxGeometry(largoVisible + 0.12, 0.03, profInf + 0.12), new THREE.MeshLambertMaterial({ color: COLOR.losa, transparent: true, opacity: 0.55 }));
          losa.position.set(0, 0.015, profInf / 2);
          losa.userData = { pick: true, kind: "losa", t };
          grp.add(losa); pickables.push(losa);
          const et = texto(`${tr.name} · ${fm(largoVisible)} m`, "#ffe082", 0.12); et.position.set(0, hInf + 0.3, profInf / 2); grp.add(et);
        }

        // Inferiores
        rowItems(plan, t, "lower", config).forEach((it) => {
          if (it.kind === "tall") return;
          const cat = CATALOG_BY_KEY[it.key]; if (!cat) return;
          const mine = !it.fromPrev;
          const selected = !!sel && "id" in sel && sel.t === t && sel.row === "lower" && it.mod?.id === sel.id;
          const m = caja(grp, offX + it.start, it.width, 0, hInf, dIni, profInf, isBloque ? 1 : sg, colorDe(it.key, "lower"), it.fromPrev ? 0.35 : 0.72,
            { pick: mine, kind: "mod", t, row: "lower", id: it.mod!.id, start: it.start, w: it.width, corner: !!cat.corner, painted: isPainted(plan, it.mod!, "lower") }, selected);
          if (mine && cotasRef.current) { const l = texto(`${cat.short} ${fm(it.width)}`, "#ffffff", 0.115); l.position.set(0, 0, (isBloque ? 1 : sg) * profInf / 2 + (isBloque ? 0.0 : 0)); l.position.set(0, hInf / 2, (isBloque ? 1 : sg) * (profInf / 2 + 0.01)); m.add(l); }
        });
        // Superiores (la ventana del plano se dibuja como vidrio)
        if (!isBloque) rowItems(plan, t, "upper", config).forEach((it) => {
          if (it.kind === "tall") return;
          const cat = CATALOG_BY_KEY[it.key]; if (!cat) return;
          if (it.key === "ventana") {
            const a = aber.find((x) => x.tipo === "ventana" && x.pared === t && Math.abs(x.desde / 100 - it.start) < 0.03);
            const base = a ? (a.antepecho || 100) / 100 : 1.0, h = a ? (a.alto || 120) / 100 : 1.2;
            const v = new THREE.Mesh(new THREE.BoxGeometry(it.width, h, 0.02), new THREE.MeshLambertMaterial({ color: COLOR.vidrio, transparent: true, opacity: 0.5 }));
            v.position.set(it.start + it.width / 2, base + h / 2, 0.0); grp.add(v);
            const l = texto(`Ventana ${fm(it.width)}`, "#b3e5fc", 0.115); l.position.set(it.start + it.width / 2, base + h / 2, sg * 0.05); grp.add(l);
            return;
          }
          const mine = !it.fromPrev;
          const selected = !!sel && "id" in sel && sel.t === t && sel.row === "upper" && it.mod?.id === sel.id;
          const m = caja(grp, it.start, it.width, arranque, Math.max(0.3, alto - arranque), GROSOR / 2, profSup, sg, colorDe(it.key, "upper"), it.fromPrev ? 0.3 : 0.6,
            { pick: mine, kind: "mod", t, row: "upper", id: it.mod!.id, start: it.start, w: it.width, corner: !!cat.corner, painted: isPainted(plan, it.mod!, "upper") }, selected);
          if (mine && cotasRef.current) { const l = texto(`${cat.short} ${fm(it.width)}`, "#ffffff", 0.115); l.position.set(0, 0, sg * (profSup / 2 + 0.01)); m.add(l); }
        });
        // Módulos de piso a techo (nichos, alacenas, torre)
        if (!isBloque) rowItems(plan, t, "lower", config).forEach((it) => {
          if (it.kind !== "tall" || !it.special) return;
          const selected = !!sel && "tall" in sel && sel.tall === it.key;
          const m = caja(grp, it.start, it.width, 0, alto, GROSOR / 2, profInf, sg, COLOR.tall, 0.7, { pick: true, kind: "tall", t, key: it.key, start: it.start, w: it.width }, selected);
          if (cotasRef.current) { const l = texto(`${it.special.label} ${fm(it.width)}`, "#fff3e0", 0.115); l.position.set(0, 0, sg * (profInf / 2 + 0.01)); m.add(l); }
        });
        // Ventanas/puertas del levantamiento que NO están en el plano (puertas y ventanas bajas): solo de contexto
        if (!isBloque) aber.filter((a) => a.pared === t).forEach((a) => {
          const ya = rowItems(plan, t, "upper", config).some((i) => i.key === "ventana" && Math.abs(i.start - a.desde / 100) < 0.03);
          if (ya) return;
          const w = a.ancho / 100, h = a.alto / 100, base = (a.antepecho || 0) / 100;
          const v = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), new THREE.MeshLambertMaterial({ color: a.tipo === "puerta" ? COLOR.puerta : COLOR.vidrio, transparent: true, opacity: a.tipo === "puerta" ? 0.55 : 0.4 }));
          v.position.set(a.desde / 100 + w / 2, base + h / 2, 0); grp.add(v);
        });
        contenido.add(grp);
      });

      // encuadre: cabe toda la cocina
      const pts: Array<[number, number]> = [];
      paredes.forEach((w) => { pts.push([w.x1, w.z1], [w.x1 + w.ux * w.largo, w.z1 + w.uz * w.largo]); });
      plan.tramos.forEach((tr, t) => { if (tr.isIsland) { const p = posBloque(t, 0, tr.length); pts.push([p.x - tr.length / 2, p.z - 0.6], [p.x + tr.length / 2, p.z + 0.6]); } });
      const mnx = Math.min(...pts.map((q) => q[0])), mxx = Math.max(...pts.map((q) => q[0])), mnz = Math.min(...pts.map((q) => q[1])), mxz = Math.max(...pts.map((q) => q[1]));
      encuadre = { cx: (mnx + mxx) / 2, cz: (mnz + mxz) / 2, r: Math.max(2.2, Math.hypot(mxx - mnx, mxz - mnz) * 0.62), radio: Math.max(1.8, Math.hypot(mxx - mnx, mxz - mnz, alto) * 0.55), alto };
      if (!movidoUsuario) vista("iso");
      dibujar();
    };

    let movidoUsuario = false;
    controls.addEventListener("start", () => { if (!arrastrando) movidoUsuario = true; });
    // La cámara se aleja lo justo para que TODA la cocina quepa, sea cual sea la forma y el tamaño de la pantalla
    const vista = (v: "iso" | "arriba" | "frente") => {
      const { cx, cz, radio, alto } = encuadre;
      const vf = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (camera.aspect || 1.5));
      const dist = (radio * 1.12) / Math.sin(Math.min(vf, hf) / 2);
      const dir = v === "arriba" ? [0, 1, 0.012] : v === "frente" ? [0, 0.42, 1] : [0.62, 0.62, 0.78];
      const len = Math.hypot(dir[0], dir[1], dir[2]);
      const ty = v === "arriba" ? 0 : alto * 0.4;
      controls.target.set(cx, ty, cz);
      camera.position.set(cx + (dir[0] / len) * dist, ty + (dir[1] / len) * dist, cz + (dir[2] / len) * dist);
      controls.update(); dibujar();
    };

    // ── Gestos: tocar = seleccionar; arrastrar = mover ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const apunta = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const enPlano = (y: number): THREE.Vector3 | null => {
      const p = new THREE.Vector3();
      return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
    };
    // pared más cercana a un punto del piso, y la posición (m) del punto a lo largo de ella
    const paredCerca = (P: THREE.Vector3) => {
      let best: { w: Wall; s: number; dist: number } | null = null;
      paredes.forEach((w) => {
        const s = (P.x - w.x1) * w.ux + (P.z - w.z1) * w.uz;
        const dn = Math.abs((P.x - w.x1) * w.nx + (P.z - w.z1) * w.nz);
        const fuera = Math.max(0, -s, s - w.largo);
        const dist = Math.hypot(fuera, dn);
        if (!best || dist < best.dist) best = { w, s, dist };
      });
      return best as { w: Wall; s: number; dist: number } | null;
    };

    let arrastrando: null | { obj: THREE.Object3D; d: any; x0: number; y0: number; grab: number; mundo0: THREE.Vector3; pos0: THREE.Vector3; planoY: number } = null;
    const alBajar = (e: PointerEvent) => {
      apunta(e);
      const hit = ray.intersectObjects(pickables, false)[0];
      movido = false;
      if (!hit) { arrastrando = null; return; }
      const d = hit.object.userData;
      const planoY = d.kind === "mod" && d.row === "upper" ? ARRANQUE_SUPERIOR_CM / 100 + 0.4 : d.kind === "losa" ? 0.03 : 0.45;
      const p0 = enPlano(planoY) || hit.point.clone();
      let grab = 0;
      if (d.kind === "mod" || d.kind === "tall") {
        const w = paredes.find((q) => q.t === d.t);
        if (w) grab = ((p0.x - w.x1) * w.ux + (p0.z - w.z1) * w.uz) - d.start;
        else { // bloque suelto: coordenada a lo largo del eje de la isla
          const g = hit.object.parent!; const loc = g.worldToLocal(p0.clone()); grab = loc.x - (d.start - (ultimo.current.plan.tramos[d.t].length || 0) / 2);
        }
      }
      controls.enabled = false;
      cv.setPointerCapture(e.pointerId);
      arrastrando = { obj: hit.object, d, x0: e.clientX, y0: e.clientY, grab, mundo0: p0, pos0: hit.object.position.clone(), planoY };
    };
    const alMover = (e: PointerEvent) => {
      if (!arrastrando) return;
      if (!movido && Math.hypot(e.clientX - arrastrando.x0, e.clientY - arrastrando.y0) < 6) return;
      movido = true;
      apunta(e);
      const P = enPlano(arrastrando.planoY); if (!P) return;
      const d = arrastrando.d;
      // vista previa: el objeto sigue el dedo (al soltar se acomoda con el imán)
      const par = arrastrando.obj.parent!;
      if (d.kind === "losa") { par.position.set(P.x - 0, 0, P.z - 0); }
      else { const loc = par.worldToLocal(P.clone()); arrastrando.obj.position.x = loc.x - arrastrando.grab + d.w / 2 + (par.userData?.bloque !== undefined ? -(ultimo.current.plan.tramos[d.t].length || 0) / 2 : 0); }
      dibujar();
    };
    const alSoltar = (e: PointerEvent) => {
      const a = arrastrando; arrastrando = null; controls.enabled = true;
      try { cv.releasePointerCapture(e.pointerId); } catch { /* */ }
      if (!a) return;
      const d = a.d;
      if (!movido) {   // toque: seleccionar
        if (d.kind === "mod") ultimo.current.onSelect({ t: d.t, row: d.row, id: d.id });
        else if (d.kind === "tall") ultimo.current.onSelect({ t: d.t, tall: d.key });
        else if (d.kind === "losa") ultimo.current.onSelect({ t: d.t, row: "lower", id: "__bloque__" });
        return;
      }
      apunta(e);
      const P = enPlano(a.planoY);
      if (!P) { construir(); return; }
      const { onEdit, moveTramo, dropMod, dropTallTo, plan } = ultimo.current;
      if (d.kind === "losa") {
        onEdit((p) => { const tr = p.tramos[d.t]; tr.pos = { x: round2(P.x), z: round2(P.z), rot: tr.pos?.rot ?? posBloque(d.t, 0, tr.length).rot }; });
        return;
      }
      const esBloque = !!plan.tramos[d.t]?.isIsland;
      if (esBloque) {   // dentro de la isla/barra: a lo largo de su eje
        const par = a.obj.parent!; const loc = par.worldToLocal(P.clone());
        const start = round2(loc.x - a.grab + (plan.tramos[d.t].length || 0) / 2);
        onEdit((p) => dropMod(p, d.t, d.row, d.id, start));
        return;
      }
      const c = paredCerca(P); if (!c) { construir(); return; }
      const start = round2(c.s - a.grab);
      if (d.kind === "tall") { onEdit((p) => dropTallTo(p, d.key, c.w.t, start)); return; }
      if (c.w.t === d.t) onEdit((p) => dropMod(p, d.t, d.row, d.id, start));
      else onEdit((p) => { if (!moveTramo(p, d.t, d.row, d.id, c.w.t, start)) dropMod(p, d.t, d.row, d.id, d.start); });
    };
    cv.addEventListener("pointerdown", alBajar, true);
    cv.addEventListener("pointermove", alMover);
    cv.addEventListener("pointerup", alSoltar);
    cv.addEventListener("pointercancel", alSoltar);

    const ajustar = () => {
      const w = el.clientWidth || 300, h = el.clientHeight || 300;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      cv.style.width = "100%"; cv.style.height = "100%";
      dibujar();
    };
    const ro = new ResizeObserver(ajustar); ro.observe(el);
    ajustar();

    api.current = {
      rebuild: construir,
      vista,
      // Foto del 3D (1200×800) para el PDF de la cotización y para el diseñador: sin selección, con las medidas puestas
      capturar: (v) => {
        const prev = { p: camera.position.clone(), t: controls.target.clone() };
        try {
          ocultarSel = true; claro = true; scene.background = new THREE.Color(0xf4f7f8); construir();
          renderer.setPixelRatio(1); renderer.setSize(1200, 800, false);
          camera.aspect = 1.5; camera.updateProjectionMatrix();
          vista(v || "iso");
          renderer.render(scene, camera);
          return cv.toDataURL("image/jpeg", 0.9);
        } catch { return null; }
        finally {
          ocultarSel = false; claro = false; scene.background = null;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          construir(); ajustar();
          camera.position.copy(prev.p); controls.target.copy(prev.t); controls.update(); dibujar();
        }
      },
    };
    construir();
    return () => {
      ro.disconnect(); cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", alBajar, true); cv.removeEventListener("pointermove", alMover); cv.removeEventListener("pointerup", alSoltar); cv.removeEventListener("pointercancel", alSoltar);
      controls.dispose(); limpiar(); renderer.dispose(); renderer.forceContextLoss?.();
      if (cv.parentElement === el) el.removeChild(cv);
      api.current = null;
    };
  }, []);

  // Reconstruir cuando cambia el plano, la selección o las cotas
  const firma = JSON.stringify([props.plan, props.sel, props.config?.layout, props.config?.island?.meters, props.config?.bar?.meters, verCotas]);
  useEffect(() => { api.current?.rebuild(); }, [firma]);

  return (
    <div className="relative rounded-lg border border-white/10 bg-black/20 overflow-hidden" style={{ height: props.altura ?? 420 }}>
      <div ref={host} className="absolute inset-0" />
      <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end">
        {([["iso", "3D"], ["arriba", "Arriba"], ["frente", "Frente"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => api.current?.vista(v)} className="px-2.5 py-1.5 rounded bg-black/60 text-white text-xs font-semibold border border-white/20 min-h-[32px]">{t}</button>
        ))}
        <button type="button" onClick={() => setVerCotas((x) => !x)} className={`px-2.5 py-1.5 rounded text-xs font-semibold border min-h-[32px] ${verCotas ? "bg-primary text-white border-primary" : "bg-black/60 text-white border-white/20"}`}>Medidas</button>
      </div>
      <p className="absolute bottom-1.5 left-2 right-2 text-[10px] text-white/50 pointer-events-none">Gira y acerca con los dedos · toca un módulo para elegirlo · arrástralo para acomodarlo (se pega solo) · la isla y la barra se mueven por el piso</p>
    </div>
  );
});

export default PlanoModulos3D;
