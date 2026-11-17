/**
 * Arma un archivo ZIP "sin comprimir" (método store) en memoria, sin librerías.
 * Lo usa la pantalla «Texturas» para bajar una categoría o una marca completa de una sola vez
 * (las texturas son JPG: ya vienen comprimidas, no ganarían nada).
 */

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA[(c ^ datos[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255]);
const u32 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);

function unir(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) { out.set(p, pos); pos += p.length; }
  return out;
}

/** Nombres de archivo sin repetir y sin caracteres que rompan el ZIP. */
export function nombresUnicos(nombres: string[]): string[] {
  const usados = new Map<string, number>();
  return nombres.map((n) => {
    const limpio = n.replace(/[\\/:*?"<>|]+/g, "-").trim() || "archivo";
    const k = limpio.toLowerCase();
    const veces = usados.get(k) ?? 0;
    usados.set(k, veces + 1);
    if (!veces) return limpio;
    const punto = limpio.lastIndexOf(".");
    return punto > 0 ? `${limpio.slice(0, punto)} (${veces + 1})${limpio.slice(punto)}` : `${limpio} (${veces + 1})`;
  });
}

export function crearZip(archivos: { nombre: string; datos: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const crc = crc32(a.datos);
    const cab = unir(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc),
      u32(a.datos.length), u32(a.datos.length), u16(nombre.length), u16(0), nombre,
    );
    locales.push(cab, a.datos);
    centrales.push(unir(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc),
      u32(a.datos.length), u32(a.datos.length), u16(nombre.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(desplazamiento), nombre,
    ));
    desplazamiento += cab.length + a.datos.length;
  }
  const dir = unir(...centrales);
  const fin = unir(u32(0x06054b50), u16(0), u16(0), u16(archivos.length), u16(archivos.length), u32(dir.length), u32(desplazamiento), u16(0));
  return unir(...locales, dir, fin);
}
