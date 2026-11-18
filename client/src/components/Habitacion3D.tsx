import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { geometriaParedes, ALTO_COCINA_POR_DEFECTO, type AberturaCocina, type ParedCocina } from "@shared/cocinaParedes";

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
}

export interface Habitacion3DRef {
  /** Foto del dibujo 3D (JPEG en data URL) para la pizarra y el plano del levantamiento. Devuelve null si no se puede. */
  capturar(): string | null;
}

const COLOR_PARED = 0x8d9aa0, COLOR_ACTIVA = 0x00bcd4, COLOR_PISO = 0x1f2a2e, COLOR_VIDRIO = 0x7fd4ff, COLOR_PUERTA = 0x8a5a2b;
const GROSOR = 0.08;

const Habitacion3D = forwardRef<Habitacion3DRef, Props>(function Habitacion3D({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, altura = 300 }, ref) {
  const host = useRef<HTMLDivElement>(null);
  // La escena se arma una vez; los cambios de medidas la reconstruyen (es pequeña) y se vuelve a dibujar una sola vez.
  const api = useRef<{ rebuild: (p: Props) => void; vista: (v: "arriba" | "frente" | "iso") => void; capturar: () => string | null } | null>(null);
  useImperativeHandle(ref, () => ({ capturar: () => api.current?.capturar() ?? null }), []);
  const ultimo = useRef<Props>({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla });
  ultimo.current = { forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla };

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

        // Etiqueta A/B/C encima de la mitad de la pared
        contenido.add(etiqueta(w.nombre, w.x1 + dx / 2, alto + 0.35, w.z1 + dz / 2, activo));
      });

      encuadre = { cx, cz, r: Math.max(sx, sz, altoMax * 1.4) };
      if (!movidoPorUsuario) vista("iso"); else dibujar();
    };

    function vista(v: "arriba" | "frente" | "iso") {
      const { cx, cz, r } = encuadre;
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
      camera.aspect = w / h; camera.updateProjectionMatrix(); dibujar();
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

    const capturar = () => {
      try { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/jpeg", 0.88); } catch { return null; }
    };
    api.current = { rebuild: construir, vista, capturar };
    ajustar();
    construir(ultimo.current);
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
    api.current?.rebuild({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla });
  }, [forma, JSON.stringify(paredes), separacionCm, altoCm, JSON.stringify(aberturas), activa]);

  return (
    <div className="relative">
      <div ref={host} className="w-full rounded-lg overflow-hidden bg-black/20 border border-white/10" style={{ height: altura }} />
      <div className="absolute top-2 right-2 flex gap-1">
        {([["iso", "3D"], ["arriba", "Arriba"], ["frente", "Frente"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => api.current?.vista(v)} className="px-2.5 py-1.5 rounded bg-black/50 text-white text-xs font-semibold border border-white/20 min-h-[32px]">{t}</button>
        ))}
      </div>
      <p className="absolute bottom-1.5 left-2 text-[10px] text-white/50 pointer-events-none">Arrastra para girar · pellizca para acercar · toca una pared para elegirla</p>
    </div>
  );
});

export default Habitacion3D;
