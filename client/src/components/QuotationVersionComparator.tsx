/**
 * QuotationVersionComparator
 * Muestra diferencias entre dos versiones de una cotización:
 * - Ítems agregados (verde)
 * - Ítems eliminados (rojo)
 * - Ítems con precio modificado (amarillo)
 * - Ítems sin cambios (gris, colapsables)
 * - Diferencia de total
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GitCompare, Plus, Minus, ArrowRight, AlertTriangle, Eye, EyeOff,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type QuotationItem = {
  id: number;
  itemNumber: number;
  itemType: string;
  description: string;
  quantity: string;
  totalPrice: string | number;
};

type DiffRow =
  | { kind: "added";   item: QuotationItem }
  | { kind: "removed"; item: QuotationItem }
  | { kind: "changed"; old: QuotationItem; new: QuotationItem }
  | { kind: "same";    item: QuotationItem };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: string | number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const price = (v: string | number) => Number(v) || 0;

function computeDiff(oldItems: QuotationItem[], newItems: QuotationItem[]): DiffRow[] {
  const rows: DiffRow[] = [];

  // Índice de ítems viejos por descripción normalizada
  const oldMap = new Map<string, QuotationItem>();
  for (const item of oldItems) {
    oldMap.set(item.description.trim().toLowerCase(), item);
  }
  const newMap = new Map<string, QuotationItem>();
  for (const item of newItems) {
    newMap.set(item.description.trim().toLowerCase(), item);
  }

  // Ítems nuevos: added o changed
  for (const newItem of newItems) {
    const key = newItem.description.trim().toLowerCase();
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      rows.push({ kind: "added", item: newItem });
    } else if (price(oldItem.totalPrice) !== price(newItem.totalPrice)) {
      rows.push({ kind: "changed", old: oldItem, new: newItem });
    } else {
      rows.push({ kind: "same", item: newItem });
    }
  }

  // Ítems eliminados: en vieja pero no en nueva
  for (const oldItem of oldItems) {
    const key = oldItem.description.trim().toLowerCase();
    if (!newMap.has(key)) {
      rows.push({ kind: "removed", item: oldItem });
    }
  }

  // Ordenar: cambios primero, luego eliminados, luego añadidos, luego iguales
  const order = { changed: 0, removed: 1, added: 2, same: 3 };
  rows.sort((a, b) => order[a.kind] - order[b.kind]);

  return rows;
}

// ─── Componente principal ──────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  /** Cualquier quotationId de la cadena */
  quotationId: number;
  quotationNumber: string;
}

export function QuotationVersionComparator({ open, onClose, quotationId, quotationNumber }: Props) {
  const [showSame, setShowSame] = useState(false);
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);

  // Cadena de versiones
  const { data: chainData } = trpc.quotationsVersioning.getVersionChain.useQuery(
    { quotationId },
    { enabled: open }
  );

  const versions = chainData?.versions ?? [];

  // Defaults: comparar las dos más recientes
  const sortedVersions = [...versions].sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  const defaultTo   = toId   ?? sortedVersions[0]?.id ?? null;
  const defaultFrom = fromId ?? sortedVersions[1]?.id ?? null;

  // Items de ambas versiones
  const { data: fromData, isLoading: loadingFrom } = trpc.quotations.getById.useQuery(
    { id: defaultFrom! },
    { enabled: open && !!defaultFrom }
  );
  const { data: toData, isLoading: loadingTo } = trpc.quotations.getById.useQuery(
    { id: defaultTo! },
    { enabled: open && !!defaultTo }
  );

  const loading = loadingFrom || loadingTo;
  const fromVersion = versions.find(v => v.id === defaultFrom);
  const toVersion   = versions.find(v => v.id === defaultTo);

  const diff = (!loading && fromData?.items && toData?.items)
    ? computeDiff(fromData.items as QuotationItem[], toData.items as QuotationItem[])
    : [];

  const fromTotal = price(fromData?.total ?? 0);
  const toTotal   = price(toData?.total ?? 0);
  const delta     = toTotal - fromTotal;

  const changedCount  = diff.filter(r => r.kind === "changed").length;
  const addedCount    = diff.filter(r => r.kind === "added").length;
  const removedCount  = diff.filter(r => r.kind === "removed").length;
  const sameCount     = diff.filter(r => r.kind === "same").length;

  const visibleRows = showSame ? diff : diff.filter(r => r.kind !== "same");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-indigo-500" />
            Comparar versiones — {quotationNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Selectores de versión */}
          {versions.length >= 2 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={String(defaultFrom ?? "")}
                onValueChange={(v) => setFromId(Number(v))}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Desde" />
                </SelectTrigger>
                <SelectContent>
                  {sortedVersions.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      V{v.versionNumber} {v.id === sortedVersions[0]?.id ? "(vigente)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

              <Select
                value={String(defaultTo ?? "")}
                onValueChange={(v) => setToId(Number(v))}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Hasta" />
                </SelectTrigger>
                <SelectContent>
                  {sortedVersions.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      V{v.versionNumber} {v.id === sortedVersions[0]?.id ? "(vigente)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resumen de cambios */}
          {!loading && diff.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {changedCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 border gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {changedCount} modificado{changedCount > 1 ? "s" : ""}
                </Badge>
              )}
              {addedCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border gap-1">
                  <Plus className="h-3 w-3" />
                  {addedCount} agregado{addedCount > 1 ? "s" : ""}
                </Badge>
              )}
              {removedCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 border gap-1">
                  <Minus className="h-3 w-3" />
                  {removedCount} eliminado{removedCount > 1 ? "s" : ""}
                </Badge>
              )}
              {sameCount > 0 && (
                <button
                  onClick={() => setShowSame(s => !s)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showSame ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {sameCount} sin cambio{sameCount > 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}

          {/* Tabla de diferencias */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : diff.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              {versions.length < 2
                ? "Esta cotización solo tiene una versión"
                : "Selecciona dos versiones para comparar"}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibleRows.map((row, i) => <DiffRow key={i} row={row} fromV={fromVersion} toV={toVersion} />)}
            </div>
          )}

          {/* Footer: diferencia de total */}
          {!loading && fromData && toData && (
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total V{fromVersion?.versionNumber}</span>
                <span className="font-medium">{fmt(fromTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total V{toVersion?.versionNumber} <span className="text-indigo-500">(vigente)</span></span>
                <span className="font-semibold">{fmt(toTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-1">
                <span>Diferencia</span>
                <span className={delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-500"}>
                  {delta > 0 ? "+" : ""}{fmt(delta)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fila de diferencia ────────────────────────────────────────────────────────
function DiffRow({ row, fromV, toV }: { row: DiffRow; fromV: any; toV: any }) {
  if (row.kind === "added") {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
        <Plus className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-emerald-800 truncate">{row.item.description}</p>
          <p className="text-[10px] text-emerald-600">Agregado en V{toV?.versionNumber}</p>
        </div>
        <span className="text-xs font-semibold text-emerald-700 shrink-0">{fmt(row.item.totalPrice)}</span>
      </div>
    );
  }

  if (row.kind === "removed") {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
        <Minus className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-700 line-through truncate">{row.item.description}</p>
          <p className="text-[10px] text-red-500">Eliminado en V{toV?.versionNumber}</p>
        </div>
        <span className="text-xs font-semibold text-red-500 line-through shrink-0">{fmt(row.item.totalPrice)}</span>
      </div>
    );
  }

  if (row.kind === "changed") {
    const delta = price(row.new.totalPrice) - price(row.old.totalPrice);
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-800 truncate">{row.new.description}</p>
          <p className="text-[10px] text-amber-600">
            {fmt(row.old.totalPrice)} → {fmt(row.new.totalPrice)}
            <span className={`ml-1 font-semibold ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
              ({delta > 0 ? "+" : ""}{fmt(delta)})
            </span>
          </p>
        </div>
        <span className="text-xs font-semibold text-amber-700 shrink-0">{fmt(row.new.totalPrice)}</span>
      </div>
    );
  }

  // same
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 opacity-60">
      <div className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 truncate">{row.item.description}</p>
      </div>
      <span className="text-xs text-slate-400 shrink-0">{fmt(row.item.totalPrice)}</span>
    </div>
  );
}
