// ═════════════════════════════════════════════════════════════════════════════
// SEGUIMIENTO DE COTIZACIONES (20 nov 2026)
//
// Objetivo: que ninguna cotización se venza sin que el equipo haya preguntado, con calma, qué pasó, y ayudar a rescatarla.
// Reglas acordadas con Álvaro:
//  · Pocos mensajes y bien espaciados (nunca atosigar): máximo 5 por cotización enviada y 3 por cotización aprobada sin anticipo.
//  · Mensajes cercanos, prudentes y respetuosos (se tratan de «usted»).
//  · Los últimos mensajes son la estrategia de rescate: se extiende la validez 7 días SIN cambiar el precio (una sola vez),
//    pero nunca más allá del 15 de diciembre (en enero suben los precios).
//  · Los mensajes los ENVÍA una persona (un toque abre WhatsApp con el texto listo); el sistema solo avisa y los redacta.
//  · Aprobar la cotización y pagar el anticipo van ligados: la cotización aprobada sin proyecto se vigila hasta que se registre el pago.
// Lógica pura (sin base de datos): la usan el servidor (avisos y pantalla) y las pruebas.
// ═════════════════════════════════════════════════════════════════════════════
import { esDiaHabil, sumarDiasHabiles } from "./festivosColombia";

export type TipoSeguimiento = "seguimiento" | "anticipo";
export type PasoSeguimiento = "s1" | "s2" | "s3" | "s4" | "s5" | "a1" | "a2" | "a3";

export const PASOS_SEGUIMIENTO: PasoSeguimiento[] = ["s1", "s2", "s3", "s4", "s5"];
export const PASOS_ANTICIPO: PasoSeguimiento[] = ["a1", "a2", "a3"];
export const DIAS_MINIMOS_ENTRE_MENSAJES = 2;   // días hábiles entre un mensaje y el siguiente
export const DIAS_EXTENSION = 7;
export const DIAS_MAX_ANTICIPO = 30;   // más allá de un mes desde la aprobación ya no se avisa (sigue titilando en la lista)

export const ETIQUETA_PASO: Record<PasoSeguimiento, string> = {
  s1: "Confirmar que le llegó",
  s2: "Preguntar si pudo revisarla",
  s3: "Dejar la puerta abierta a ajustes",
  s4: "Aviso de vencimiento + ampliar validez",
  s5: "Cierre amable",
  a1: "Agradecer la aprobación y acompañar el anticipo",
  a2: "Resolver dudas del anticipo",
  a3: "Recordar el anticipo para iniciar",
};

const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const finDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sumarDias = (d: Date, n: number) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };

/** Resta `n` días hábiles (el día de `desde` no cuenta). */
export function restarDiasHabiles(desde: Date, n: number): Date {
  let d = inicioDia(desde), c = 0;
  while (c < n) { d = sumarDias(d, -1); if (esDiaHabil(d)) c++; }
  return d;
}

/** Hasta qué fecha se puede ampliar la validez (7 días, una sola vez, sin pasar del 15 de diciembre). `null` = no se puede ampliar. */
export function proponerExtension(validUntil: Date, yaAmpliada: boolean): Date | null {
  if (yaAmpliada) return null;
  const limite = new Date(validUntil.getFullYear(), 11, 15, 23, 59, 59);   // 15 de diciembre del año de la validez
  if (validUntil.getTime() >= limite.getTime()) return null;
  const candidata = sumarDias(validUntil, DIAS_EXTENSION);
  const nueva = candidata.getTime() > limite.getTime() ? limite : candidata;
  const dias = Math.round((nueva.getTime() - validUntil.getTime()) / 86400000);
  return dias >= 2 ? nueva : null;
}

export interface LogSeguimiento { step: string; at: Date; extendedUntil?: Date | null }

export interface EntradaSeguimiento {
  status: string;                 // 'sent' | 'approved' (otros no tienen seguimiento)
  sentAt: Date | null;
  createdAt: Date;
  validUntil: Date | null;
  approvedAt: Date | null;
  hayProyecto: boolean;
  archivado: boolean;
  logs: LogSeguimiento[];
}

export interface PasoPendiente {
  tipo: TipoSeguimiento;
  step: PasoSeguimiento;
  due: Date;                      // día desde el que corresponde enviarlo
  porEnviar: boolean;             // ya llegó el día
  /** Solo s4: nueva fecha de validez que se ofrece (null = no se puede ampliar) */
  extension: Date | null;
}

const cerrado = (logs: LogSeguimiento[]) => logs.some(l => l.step === "cierre");

/**
 * El siguiente mensaje que corresponde enviar (o el próximo programado). Reglas:
 *  · si ya llegó el día de varios pasos, solo se muestra el ÚLTIMO (no se acumula una fila de mensajes atrasados);
 *  · siempre hay al menos 2 días hábiles entre un mensaje y el siguiente;
 *  · el cierre amable (s5) solo se ofrece cuando ya se envió el aviso de vencimiento (s4);
 *  · dejan de avisarse las cotizaciones vencidas, archivadas o con seguimiento cerrado.
 */
export function siguientePaso(e: EntradaSeguimiento, hoy: Date = new Date()): PasoPendiente | null {
  if (e.archivado || cerrado(e.logs)) return null;
  const hechos = new Set(e.logs.map(l => l.step));
  const ultimo = e.logs.filter(l => l.step !== "cierre").sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.at ?? null;
  const hoyIni = inicioDia(hoy);
  const despuesDe = (base: Date | null, n: number) => (base ? sumarDiasHabiles(base, n) : null);
  const max = (a: Date, b: Date | null) => (b && b.getTime() > a.getTime() ? b : a);

  // ── Cotización aprobada que aún no tiene proyecto: se vigila el anticipo ──
  if (e.status === "approved") {
    if (e.hayProyecto) return null;
    const A = e.approvedAt ?? e.createdAt;
    if (hoy.getTime() - A.getTime() > DIAS_MAX_ANTICIPO * 86400000) return null;
    const base: Record<string, Date> = { a1: esDiaHabil(A) ? inicioDia(A) : sumarDiasHabiles(A, 1), a2: sumarDiasHabiles(A, 3), a3: sumarDiasHabiles(A, 7) };
    const pend = PASOS_ANTICIPO.filter(p => !hechos.has(p));
    if (!pend.length) return null;
    const vencidos = pend.filter(p => base[p].getTime() <= hoyIni.getTime());
    const elegido = vencidos.length ? vencidos[vencidos.length - 1] : pend[0];
    const due = max(base[elegido], despuesDe(ultimo, DIAS_MINIMOS_ENTRE_MENSAJES));
    return { tipo: "anticipo", step: elegido, due, porEnviar: due.getTime() <= hoyIni.getTime(), extension: null };
  }

  // ── Cotización enviada sin respuesta ──
  if (e.status !== "sent") return null;
  const S = e.sentAt ?? e.createdAt;
  const V = e.validUntil ?? sumarDias(S, 15);
  if (finDia(V).getTime() < hoy.getTime()) return null;   // vencida: ya no se avisa
  const yaAmpliada = e.logs.some(l => !!l.extendedUntil);
  const base: Record<string, Date> = {
    s1: sumarDiasHabiles(S, 2), s2: sumarDiasHabiles(S, 5), s3: sumarDiasHabiles(S, 8),
    s4: restarDiasHabiles(V, 2),
    s5: restarDiasHabiles(V, 2),
  };
  const pend = PASOS_SEGUIMIENTO.filter(p => !hechos.has(p) && (p !== "s5" || hechos.has("s4")));
  if (!pend.length) return null;
  // Si las fechas ya pasaron, se salta a la última que corresponde: no se acumulan mensajes atrasados
  const vencidos = pend.filter(p => base[p].getTime() <= hoyIni.getTime());
  const elegido = vencidos.length ? vencidos[vencidos.length - 1] : pend[0];
  let due = max(base[elegido], despuesDe(ultimo, DIAS_MINIMOS_ENTRE_MENSAJES));
  // Nunca después del vencimiento: como mucho, el último día hábil de validez
  if (due.getTime() > finDia(V).getTime()) due = max(inicioDia(V), despuesDe(ultimo, 1));
  const extension = elegido === "s4" ? proponerExtension(V, yaAmpliada) : null;
  return { tipo: "seguimiento", step: elegido, due, porEnviar: due.getTime() <= hoyIni.getTime(), extension };
}

// ── Mensajes (cercanos, prudentes y respetuosos; «usted») ──────────────────────────────────────────────────────────────
export interface ContextoMensaje {
  nombre: string;          // primer nombre del cliente
  vendedor: string;        // quien escribe (primer nombre)
  tipo: string;            // «cocina», «closet», «proyecto»…
  enlace: string;          // enlace público de la cotización
  vence?: string;          // fecha de vencimiento ya formateada («27 de noviembre»)
  nuevaFecha?: string;     // fecha nueva si se amplía la validez
  anticipo?: string;       // valor del anticipo ya formateado
}

export function mensajeSeguimiento(paso: PasoSeguimiento, c: ContextoMensaje): string {
  const firma = `Quedamos atentos. Un abrazo,\n${c.vendedor} · Innovar Cocinas de Diseño`;
  switch (paso) {
    case "s1":
      return `Hola ${c.nombre}, buen día 😊 Soy ${c.vendedor} de Innovar Cocinas de Diseño. Quería confirmar que le llegó bien la cotización de su ${c.tipo}. Si lo desea, aquí puede verla nuevamente:\n${c.enlace}\n\nSi tiene alguna duda o quiere que revisemos algo juntos, con gusto lo hacemos.\n\n${firma}`;
    case "s2":
      return `Hola ${c.nombre}, espero que esté muy bien. Le escribo para saber si pudo revisar con calma la propuesta de su ${c.tipo}.\n\nSi le sirve, con gusto le cuento cómo sería el proceso paso a paso o le comparto fotos de proyectos que hemos entregado. Y si algún detalle no le convence (medidas, acabados o distribución), lo conversamos sin ningún compromiso.\n${c.enlace}\n\n${firma}`;
    case "s3":
      return `Hola ${c.nombre}, no quiero ser insistente, solo dejarle la puerta abierta 🙂 Si desea ajustar algo de la cotización (módulos, colores, mesón o medidas), con gusto la actualizamos.${c.vence ? ` Su cotización sigue vigente hasta el ${c.vence}.` : ""}\n${c.enlace}\n\n${firma}`;
    case "s4":
      if (c.nuevaFecha) {
        return `Hola ${c.nombre}, le cuento que su cotización vence el ${c.vence}. Sabemos que una decisión así necesita su tiempo, así que la dejamos vigente hasta el ${c.nuevaFecha} con el mismo valor, sin ningún cambio de precio, para que pueda revisarla con tranquilidad.\n${c.enlace}\n\nCualquier inquietud, aquí estamos para ayudarle.\n\n${firma}`;
      }
      return `Hola ${c.nombre}, le cuento con tiempo que su cotización vence el ${c.vence}. Como cada año, a partir de enero actualizamos nuestros precios, por eso se lo avisamos con anticipación. Si quiere resolver alguna duda antes, con gusto lo hacemos.\n${c.enlace}\n\n${firma}`;
    case "s5":
      return `Hola ${c.nombre}, le escribo una última vez para no ser reiterativos: su cotización sigue vigente hasta el ${c.vence}.\n\nSi por ahora no es el momento o decidió otra opción, nos ayudaría mucho saber el motivo, porque así podemos mejorar. Y si más adelante quiere retomarlo, con mucho gusto lo atenderemos. Gracias por habernos tenido en cuenta 🙏\n\n${c.vendedor} · Innovar Cocinas de Diseño`;
    case "a1":
      return `Hola ${c.nombre}, ¡qué alegría que haya aprobado la cotización de su ${c.tipo}! 🎉 Gracias por confiar en Innovar.\n\nPara dar inicio al proyecto, el siguiente paso es el anticipo del 60 %${c.anticipo ? ` (${c.anticipo})` : ""}. ¿Le comparto los datos para el pago? Apenas lo verifiquemos, programamos la medición final y el desarrollo de su diseño.\n\n${firma}`;
    case "a2":
      return `Hola ${c.nombre}, ¿cómo va todo? Quería saber si tiene alguna inquietud sobre el anticipo o la forma de pago; con gusto le ayudamos. En cuanto quede registrado, damos inicio a su ${c.tipo}.\n\n${firma}`;
    case "a3":
      return `Hola ${c.nombre}, queremos dar inicio a su ${c.tipo} y estamos pendientes del anticipo para poder avanzar. Si necesita conversar algo antes, con gusto lo hacemos.\n\n${firma}`;
  }
}

/** Primer nombre con mayúscula inicial («ADRIANA ABONCE» → «Adriana»). */
export function primerNombre(nombre: string | null | undefined): string {
  const p = String(nombre || "").trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "cliente";
}

export const TIPO_PRODUCTO_TEXTO: Record<string, string> = {
  cocina: "cocina", closet: "closet", puerta: "puerta", "baño": "mueble de baño", centro_tv: "centro de TV",
  mueble_cocina: "cocina", mesones: "mesón", herrajes: "proyecto", acabados_especiales: "cocina", otro: "proyecto",
};
