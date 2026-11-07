/**
 * Versiones de diseño (modelado 3D y renders) a partir del historial del proyecto.
 *
 * Cada vez que se envían renders/modelado al cliente o se pide una nueva aprobación, el CRM
 * registra en projectStatusHistory una nota con "Revisión #N" (ver publicGallery.ts:
 * sendRendersToClient / resetRendersApproval / sendModeladoToClient / resetModeladoApproval).
 *
 * Regla: la "liberación" de la revisión N es el primer registro que la menciona.
 * Una foto pertenece a la menor revisión N cuya liberación es posterior (o igual) a la subida
 * de la foto. Si la foto se subió después de la última liberación, es la versión siguiente
 * (ajustes aún no enviados). Sin historial → todo es versión 1.
 *
 * Sin cambios en la base de datos. Usado por el servidor (enlace del cliente) y por el CRM.
 */

export type DesignType = "modelado_3d" | "renders";

export interface DesignPhotoLike {
  id: number;
  subcategory?: string | null;
  createdAt: string | Date;
}

export interface HistoryLike {
  notes?: string | null;
  createdAt: string | Date;
}

export interface DesignVersionInfo {
  /** versión de cada foto de diseño, por id */
  byPhotoId: Record<number, number>;
  /** versión más reciente por tipo (0 si no hay fotos de ese tipo) */
  latest: Record<DesignType, number>;
  /** fecha de envío al cliente de cada versión (ISO), si se conoce */
  sentAt: Record<DesignType, Record<number, string>>;
}

const PATTERNS: Record<DesignType, RegExp> = {
  renders: /renders?[^#]*revisi[oó]n\s*#\s*(\d+)/i,
  modelado_3d: /modelado[^#]*revisi[oó]n\s*#\s*(\d+)/i,
};

function toMs(d: string | Date): number {
  if (d instanceof Date) return d.getTime();
  // Las fechas de la BD vienen como "YYYY-MM-DD HH:MM:SS(.ms)" sin zona: se comparan entre sí,
  // así que basta con interpretarlas todas igual.
  const ms = Date.parse(String(d).replace(" ", "T"));
  return Number.isNaN(ms) ? 0 : ms;
}

export function computeDesignVersions(photos: DesignPhotoLike[], history: HistoryLike[]): DesignVersionInfo {
  const info: DesignVersionInfo = {
    byPhotoId: {},
    latest: { modelado_3d: 0, renders: 0 },
    sentAt: { modelado_3d: {}, renders: {} },
  };

  for (const type of ["modelado_3d", "renders"] as DesignType[]) {
    // Liberación de cada revisión: primer registro del historial que la menciona
    const release = new Map<number, number>();
    for (const h of history || []) {
      const m = (h.notes || "").match(PATTERNS[type]);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      const t = toMs(h.createdAt);
      if (!release.has(n) || t < release.get(n)!) release.set(n, t);
    }
    const releases = Array.from(release.entries()).sort((a, b) => a[0] - b[0]);
    for (const [n, t] of releases) info.sentAt[type][n] = new Date(t).toISOString();
    const maxReleased = releases.length ? releases[releases.length - 1][0] : 0;

    for (const p of photos || []) {
      if (p.subcategory !== type) continue;
      const t = toMs(p.createdAt);
      const found = releases.find(([, rt]) => rt >= t);
      const version = found ? found[0] : (releases.length ? maxReleased + 1 : 1);
      info.byPhotoId[p.id] = version;
      if (version > info.latest[type]) info.latest[type] = version;
    }
  }
  return info;
}

/** Agrupa fotos por versión: la más reciente primero; dentro de cada versión en orden de subida. */
export function groupByVersion<T extends DesignPhotoLike>(
  photos: T[],
  info: DesignVersionInfo,
): Array<{ version: number; photos: T[] }> {
  const groups = new Map<number, T[]>();
  for (const p of photos) {
    const v = info.byPhotoId[p.id] ?? 1;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v)!.push(p);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([version, list]) => ({
      version,
      photos: list.slice().sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt) || a.id - b.id),
    }));
}
