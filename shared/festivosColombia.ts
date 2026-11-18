// Festivos de Colombia calculados para CUALQUIER año (Ley Emiliani + Semana Santa), para no depender de listas escritas a mano.
// Los días hábiles NO cuentan sábados, domingos ni festivos.

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const add = (d: Date, n: number) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };
const aLunes = (d: Date) => { const w = d.getDay(); return w === 1 ? d : add(d, (8 - w) % 7); }; // próximo lunes (si ya es lunes, se queda)

function pascua(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia);
}

const cache = new Map<number, Set<string>>();
export function festivosColombia(year: number): Set<string> {
  const hit = cache.get(year); if (hit) return hit;
  const p = pascua(year);
  const f = (m: number, d: number) => new Date(year, m - 1, d);
  const out = new Set<string>([
    // fijos
    key(f(1, 1)), key(f(5, 1)), key(f(7, 20)), key(f(8, 7)), key(f(12, 8)), key(f(12, 25)),
    // trasladados al lunes siguiente
    key(aLunes(f(1, 6))), key(aLunes(f(3, 19))), key(aLunes(f(6, 29))), key(aLunes(f(8, 15))), key(aLunes(f(10, 12))), key(aLunes(f(11, 1))), key(aLunes(f(11, 11))),
    // Semana Santa y los que dependen de la Pascua
    key(add(p, -3)), key(add(p, -2)), key(add(p, 43)), key(add(p, 64)), key(add(p, 71)),
  ]);
  cache.set(year, out);
  return out;
}

export function esDiaHabil(d: Date): boolean {
  const w = d.getDay();
  if (w === 0 || w === 6) return false;
  return !festivosColombia(d.getFullYear()).has(key(d));
}

/** Fecha que resulta de sumar `n` días hábiles a partir de `desde` (el día de `desde` no cuenta). */
export function sumarDiasHabiles(desde: Date, n: number): Date {
  let d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  let c = 0;
  while (c < n) { d = add(d, 1); if (esDiaHabil(d)) c++; }
  return d;
}
