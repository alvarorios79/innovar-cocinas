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
  /** Profundo de los muebles (cm); sirve para dibujar las filas de muebles */
  profundoCm?: number;
  /** Isla y barra (ancho, profundo y alto en cm) */
  isla?: { ancho: number; profundo: number; alto: number } | null;
  barra?: { ancho: number; profundo: number; alto: number } | null;
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

const Habitacion3D = forwardRef<Habitacion3DRef, Props>(function Habitacion3D({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, altura = 300, profundoCm, isla, barra, vistaPizarra, onFijarVista }, ref) {
  const host = useRef<HTMLDivElement>(null);
  // La escena se arma una vez; los cambios de medidas la reconstruyen (es pequeña) y se vuelve a dibujar una sola vez.
  const api = useRef<{ rebuild: (p: Props) => void; vista: (v: "arriba" | "frente" | "iso") => void; capturar: (pose?: PoseCamara | null) => string | null; pose: () => PoseCamara } | null>(null);
  useImperativeHandle(ref, () => ({ capturar: (pose) => api.current?.capturar(pose) ?? null }), []);
  const ultimo = useRef<Props>({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, isla, barra });
  ultimo.current = { forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, isla, barra };

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
    const medida = (texto: string, x: number, y: number, z: number, color = "#ffffff", fondo = "rgba(15,26,29,0.82)") => {
      const c = document.createElement("canvas");
      const g = c.getContext("2d")!;
      g.font = "bold 30px sans-serif";
      const w = Math.ceil(g.measureText(texto).width) + 26, h = 46;
      c.width = w; c.height = h;
      const g2 = c.getContext("2d")!;
      g2.fillStyle = fondo; g2.beginPath(); g2.roundRect?.(0, 0, w, h, 10); if (!g2.roundRect) g2.rect(0, 0, w, h); g2.fill();
      g2.font = "bold 30px sans-serif"; g2.fillStyle = color; g2.textBaseline = "middle"; g2.textAlign = "center"; g2.fillText(texto, w / 2, h / 2 + 1);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      sp.position.set(x, y, z); sp.scale.set(0.27 * (w / h), 0.27, 1);
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

        // ── Medidas que se van escribiendo, dibujadas en el 3D ──
        const par = p.paredes[w.indice] || {};
        const ux = dx / largo, uz = dz / largo;            // a lo largo de la pared
        const nzx = -uz, nzz = ux;                         // perpendicular
        const mx = w.x1 + dx / 2, mz = w.z1 + dz / 2;
        const signo = ((cx - mx) * nzx + (cz - mz) * nzz) >= 0 ? 1 : -1; // hacia el interior de la cocina
        const aMundo = (lx: number, y: number, lz: number): [number, number, number] => [w.x1 + lx * ux + lz * nzx, y, w.z1 + lx * uz + lz * nzz];
        const anchoCm = Math.round(largo * 100), altoCmW = Math.round(alto * 100);
        contenido.add(medida(`${w.nombre} · ${fm(largo)} m`, ...aMundo(largo / 2, 0.12, -signo * 0.38), activo ? "#00e5ff" : "#ffffff"));
        contenido.add(medida(`↕ ${fm(alto)} m`, ...aMundo(0, alto / 2, -signo * 0.3), "#ffd54f"));
        // Filas de muebles (inferiores y superiores) con su medida
        const profBajo = ((p.profundoCm && p.profundoCm > 10 ? p.profundoCm : 60)) / 100, profAlto = 0.35;
        const inf = (Number(par.inf) || 0) / 100, sup = (Number(par.sup) || 0) / 100;
        if (inf > 0.05) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(inf, largo), 0.9, profBajo), new THREE.MeshLambertMaterial({ color: 0x26a69a, transparent: true, opacity: 0.6 }));
          m.position.set(Math.min(inf, largo) / 2, 0.45, signo * (GROSOR / 2 + profBajo / 2)); g.add(m);
          contenido.add(medida(`Inf ${fm(inf)} m`, ...aMundo(Math.min(inf, largo) / 2, 1.0, signo * (GROSOR / 2 + profBajo / 2)), "#80cbc4"));
        }
        if (sup > 0.05) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(sup, largo), 0.7, profAlto), new THREE.MeshLambertMaterial({ color: 0x7e57c2, transparent: true, opacity: 0.55 }));
          m.position.set(Math.min(sup, largo) / 2, Math.min(alto - 0.4, 1.75), signo * (GROSOR / 2 + profAlto / 2)); g.add(m);
          contenido.add(medida(`Sup ${fm(sup)} m`, ...aMundo(Math.min(sup, largo) / 2, Math.min(alto - 0.4, 1.75) + 0.5, signo * (GROSOR / 2 + profAlto / 2)), "#b39ddb"));
        }
        // Ventanas y puertas con sus medidas
        ab.forEach((a) => {
          const txt = a.tipo === "ventana" ? `${fm(a.a)}×${fm(a.h)} m · piso ${fm(a.base)} m` : `puerta ${fm(a.a)}×${fm(a.h)} m`;
          contenido.add(medida(txt, ...aMundo(a.d + a.a / 2, a.base + a.h + 0.16, signo * 0.14), a.tipo === "ventana" ? "#81d4fa" : "#ffcc80"));
        });

        // Etiqueta A/B/C encima de la mitad de la pared
        contenido.add(etiqueta(w.nombre, w.x1 + dx / 2, alto + 0.35, w.z1 + dz / 2, activo));
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
        contenido.add(medida(`Isla ${fm(p.isla.ancho / 100)}×${fm((p.isla.profundo || 0) / 100)}×${fm((p.isla.alto || 0) / 100)} m`, cx, alt + 0.2, cz, "#ffcc80"));
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
        renderer.setPixelRatio(1); renderer.setSize(1280, 800, false);
        camera.aspect = 1.6; camera.updateProjectionMatrix();
        if (pose) { camera.position.set(...pose.p); controls.target.set(...pose.t); controls.update(); }
        else vista("iso");
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL("image/jpeg", 0.88);
      } catch { return null; }
      finally {
        renderer.setPixelRatio(pr); renderer.setSize(tam.x, tam.y, false);
        camera.aspect = aspAnt; camera.updateProjectionMatrix();
        camera.position.copy(posAnt); controls.target.copy(tarAnt); controls.update(); dibujar();
      }
    };
    api.current = { rebuild: construir, vista, capturar, pose: poseActual };
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
    api.current?.rebuild({ forma, paredes, separacionCm, altoCm, aberturas, activa, onPickPared, onFalla, profundoCm, isla, barra });
  }, [forma, JSON.stringify(paredes), separacionCm, altoCm, JSON.stringify(aberturas), activa, profundoCm, JSON.stringify(isla), JSON.stringify(barra)]);

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
        {([["iso", "3D"], ["arriba", "Arriba"], ["frente", "Frente"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => api.current?.vista(v)} className="px-2.5 py-1.5 rounded bg-black/50 text-white text-xs font-semibold border border-white/20 min-h-[32px]">{t}</button>
        ))}
      </div>
      <p className="absolute bottom-1.5 left-2 text-[10px] text-white/50 pointer-events-none">Arrastra para girar · pellizca para acercar · toca una pared para elegirla</p>
    </div>
  );
});

export default Habitacion3D;
